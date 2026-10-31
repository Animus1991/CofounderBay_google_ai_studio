// @vitest-environment node
import express from 'express';
import type { AddressInfo } from 'node:net';
import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { TokenError } from './firebaseAuth';
import { makeIdentify } from './identity';
import { BRANDING_FIELDS, CONTENT_FIELDS, loadTenantOverrides, readTenantAdmins, registerTenantRoutes, resolveTenant, validatePatch, type TenantRecord } from './tenants';
import { memoryStore } from './store';

const tenants = (): TenantRecord[] => [
  { id: 't1', slug: 'default', branding: { primaryColor: '#1c1917' }, content: {} },
  { id: 't2', slug: 'techstars', customDomains: ['founders.techstars.com'], branding: { primaryColor: '#000000' }, content: { heroTitle: 'Hi' } },
];

describe('tenant resolution', () => {
  it('matches a preview slug, a custom domain, then a sub-domain — never the platform tenant', () => {
    const list = tenants();
    expect(resolveTenant(list, { previewSlug: 'TechStars' })?.id).toBe('t2');
    expect(resolveTenant(list, { hostname: 'founders.techstars.com' })?.id).toBe('t2');
    expect(resolveTenant(list, { hostname: 'Founders.Techstars.com.:443' })?.id).toBe('t2');
    expect(resolveTenant(list, { hostname: 'techstars.cofounderbay.app' })?.id).toBe('t2');
    expect(resolveTenant(list, { hostname: 'default.cofounderbay.app' })).toBeNull();
    expect(resolveTenant(list, { hostname: 'www.cofounderbay.app' })).toBeNull();
    expect(resolveTenant(list, { hostname: 'cofounderbay.app' })).toBeNull();
    expect(resolveTenant(list, { previewSlug: 'unknown' })).toBeNull();
  });
});

describe('tenant patches', () => {
  it('accepts known fields with valid values', () => {
    const result = validatePatch({ primaryColor: '#00ffcc', logoUrl: 'https://example.com/logo.svg', backgroundStyle: 'mesh', fontFamily: 'Inter, sans-serif' }, BRANDING_FIELDS);
    expect(result).toEqual({ ok: true, patch: { primaryColor: '#00ffcc', logoUrl: 'https://example.com/logo.svg', backgroundStyle: 'mesh', fontFamily: 'Inter, sans-serif' } });
    expect(validatePatch({ isBrandingActive: false, heroTitle: '  Build  ' }, CONTENT_FIELDS)).toEqual({ ok: true, patch: { isBrandingActive: false, heroTitle: 'Build' } });
    // The admin form sends the stored record back, server-owned tenantId included.
    expect(validatePatch({ tenantId: 't2', heroTitle: 'Hi' }, CONTENT_FIELDS)).toEqual({ ok: true, patch: { heroTitle: 'Hi' } });
    expect(validatePatch({ tenantId: 't2' }, CONTENT_FIELDS).ok).toBe(false);
  });

  it('refuses unknown keys, bad colours, non-https links, long text and control characters', () => {
    const result = validatePatch(
      { evil: 1, primaryColor: 'red; background:url(x)', logoUrl: 'javascript:alert(1)', heroImageUrl: 'http://insecure.example', fontFamily: 'x;}body{', backgroundStyle: 'video' },
      BRANDING_FIELDS,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveLength(6);
    expect(validatePatch({ heroTitle: 'x'.repeat(161) }, CONTENT_FIELDS).ok).toBe(false);
    expect(validatePatch({ heroTitle: 'a\u0007b' }, CONTENT_FIELDS).ok).toBe(false);
    expect(validatePatch({}, CONTENT_FIELDS).ok).toBe(false);
    expect(validatePatch([], CONTENT_FIELDS).ok).toBe(false);
    expect(validatePatch({ __proto__: { polluted: true } } as unknown as Record<string, unknown>, CONTENT_FIELDS).ok).toBe(false);
  });

  it('reads the admin list from the environment', () => {
    expect(readTenantAdmins({ TENANT_ADMIN_UIDS: ' a, b ,,' })).toEqual(['a', 'b']);
    expect(readTenantAdmins({})).toEqual([]);
  });
});

let server: Server | null = null;

async function start({ requireAuth = true, adminUids = ['alice'], store }: { requireAuth?: boolean; adminUids?: string[]; store?: ReturnType<typeof memoryStore> } = {}) {
  const app = express();
  app.use(express.json());
  const list = tenants();
  registerTenantRoutes(app, {
    tenants: list,
    requireAuth,
    adminUids,
    store,
    log: () => {},
    identify: makeIdentify({
      requireAuth,
      verifyToken: async (token) => {
        if (token === 'alice' || token === 'bob') return { uid: token, claims: {} };
        throw new TokenError('bad signature');
      },
      log: () => {},
    }),
  });
  server = createServer(app);
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
  const call = (method: string, path: string, { token, body }: { token?: string; body?: unknown } = {}) =>
    fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  return { call, list };
}

afterEach(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = null;
});

describe('tenant routes', () => {
  it('resolves a host instead of reading "resolve" as a slug', async () => {
    const { call } = await start();
    const found = await call('GET', '/api/tenants/resolve?hostname=techstars.cofounderbay.app');
    expect(found.status).toBe(200);
    expect((await found.json()).id).toBe('t2');
    expect((await call('GET', '/api/tenants/resolve?hostname=localhost')).status).toBe(404);
    expect((await call('GET', '/api/tenants/techstars')).status).toBe(200);
  });

  it('lets only a configured administrator change a tenant when sign-in is required', async () => {
    const { call, list } = await start();
    expect((await call('POST', '/api/tenants/t2/branding', { body: { primaryColor: '#ff0000' } })).status).toBe(401);
    expect((await call('POST', '/api/tenants/t2/branding', { token: 'bob', body: { primaryColor: '#ff0000' } })).status).toBe(403);
    const ok = await call('POST', '/api/tenants/t2/branding', { token: 'alice', body: { primaryColor: '#ff0000' } });
    expect(ok.status).toBe(200);
    expect(list[1]?.branding?.primaryColor).toBe('#ff0000');
    const bad = await call('POST', '/api/tenants/t2/content', { token: 'alice', body: { heroTitle: 'ok', script: '<script>' } });
    expect(bad.status).toBe(422);
    expect(list[1]?.content?.heroTitle).toBe('Hi');
    expect((await call('POST', '/api/tenants/nope/content', { token: 'alice', body: { heroTitle: 'x' } })).status).toBe(404);
  });

  it('refuses every write when no administrator is configured on a sign-in server', async () => {
    const { call } = await start({ adminUids: [] });
    const response = await call('POST', '/api/tenants/t2/content', { token: 'alice', body: { heroTitle: 'x' } });
    expect(response.status).toBe(403);
    expect((await response.json()).error).toMatch(/TENANT_ADMIN_UIDS/);
  });

  it('allows validated writes on a development server without sign-in', async () => {
    const { call } = await start({ requireAuth: false, adminUids: [] });
    expect((await call('POST', '/api/tenants/t2/content', { body: { heroTitle: 'Dev copy' } })).status).toBe(200);
    expect((await call('POST', '/api/tenants/t2/branding', { body: { primaryColor: 'blue' } })).status).toBe(422);
  });

  it('keeps branding across a restart when a store is given', async () => {
    const store = memoryStore();
    const first = await start({ store });
    expect((await first.call('POST', '/api/tenants/t2/branding', { token: 'alice', body: { primaryColor: '#123456' } })).status).toBe(200);
    expect((await first.call('POST', '/api/tenants/t2/content', { token: 'alice', body: { heroTitle: 'Saved copy' } })).status).toBe(200);
    // A fresh process: built-in tenants, then the saved overrides on top.
    const restarted = tenants();
    expect(await loadTenantOverrides(restarted, store)).toBe(1);
    expect(restarted[1]?.branding?.primaryColor).toBe('#123456');
    expect(restarted[1]?.content?.heroTitle).toBe('Saved copy');
    expect(restarted[1]?.branding).toMatchObject({ primaryColor: '#123456' });
  });
});
