/**
 * White-label tenants: resolving the tenant for a host name, and changing a
 * tenant's branding and landing copy.
 *
 * Before this module the client asked `GET /api/tenants/resolve`, which did
 * not exist (Express matched it as the slug "resolve" and answered 404), so a
 * white-label host never got its branding; and `POST /api/tenants/:id/branding`
 * merged any JSON from anyone — signed in or not — into the tenant, including
 * keys the app never reads and colours or URLs it would then inject into every
 * page of that tenant.
 *
 * Now:
 *  - `GET /api/tenants/resolve?hostname=&preview_slug=` matches a preview slug,
 *    then a custom domain, then a sub-domain whose first label is the slug.
 *    The platform's own tenant is not "resolved" (404), so the client keeps
 *    its default.
 *  - Writes go through the same caller rule as the rest of the API
 *    (server/identity). On a server that requires sign-in, only the uids in
 *    TENANT_ADMIN_UIDS may change a tenant; with none configured, writes are
 *    refused rather than open to every member.
 *  - Patches are validated field by field: known keys only, colours as hex,
 *    links as https URLs, bounded text without control characters. A bad
 *    patch answers 422 with the reason and changes nothing.
 */
import express, { type Express, type Request, type Response } from 'express';
import type { Caller } from './identity';
import type { Store } from './store';

export type TenantRecord = {
  id: string;
  slug: string;
  customDomains?: string[];
  branding?: Record<string, unknown>;
  content?: Record<string, unknown>;
  updatedAt?: string;
  [field: string]: unknown;
};

type FieldRule = { kind: 'color' | 'url' | 'text' | 'enum' | 'boolean'; max?: number; values?: readonly string[] };

export const BRANDING_FIELDS: Record<string, FieldRule> = {
  logo: { kind: 'url' },
  logoUrl: { kind: 'url' },
  favicon: { kind: 'url' },
  heroImageUrl: { kind: 'url' },
  primaryColor: { kind: 'color' },
  secondaryColor: { kind: 'color' },
  accentColor: { kind: 'color' },
  fontFamily: { kind: 'text', max: 80 },
  backgroundStyle: { kind: 'enum', values: ['solid', 'mesh', 'gradient', 'image'] },
};

export const CONTENT_FIELDS: Record<string, FieldRule> = {
  heroTitle: { kind: 'text', max: 160 },
  heroSubtitle: { kind: 'text', max: 320 },
  ctaLabel: { kind: 'text', max: 40 },
  onboardingIntroText: { kind: 'text', max: 500 },
  dashboardWelcomeText: { kind: 'text', max: 500 },
  communityNamingConvention: { kind: 'text', max: 60 },
  emailSignature: { kind: 'text', max: 200 },
  footerText: { kind: 'text', max: 300 },
  isBrandingActive: { kind: 'boolean' },
};

const READ_ONLY = new Set(['tenantId']);
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const FONT = /^[\p{L}\p{N} ,'"-]+$/u;

export type PatchResult = { ok: true; patch: Record<string, unknown> } | { ok: false; errors: string[] };

/** Checks a branding or content patch against its field rules. Empty strings clear an optional field. */
export function validatePatch(body: unknown, rules: Record<string, FieldRule>): PatchResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, errors: ['The body must be a JSON object.'] };
  const entries = Object.entries(body as Record<string, unknown>);
  if (entries.filter(([key]) => !READ_ONLY.has(key)).length === 0) return { ok: false, errors: ['Nothing to change.'] };
  const errors: string[] = [];
  const patch: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    // Server-owned keys the admin form sends back unchanged are skipped, not refused.
    if (READ_ONLY.has(key)) continue;
    const rule = Object.prototype.hasOwnProperty.call(rules, key) ? rules[key] : undefined;
    if (!rule) {
      errors.push(`Unknown field "${key.slice(0, 40)}".`);
      continue;
    }
    if (rule.kind === 'boolean') {
      if (typeof value !== 'boolean') errors.push(`${key} must be true or false.`);
      else patch[key] = value;
      continue;
    }
    if (typeof value !== 'string') {
      errors.push(`${key} must be text.`);
      continue;
    }
    const text = value.trim();
    if (CONTROL.test(text)) {
      errors.push(`${key} contains control characters.`);
      continue;
    }
    if (text === '') {
      patch[key] = '';
      continue;
    }
    if (rule.kind === 'color' && !HEX.test(text)) errors.push(`${key} must be a hex colour such as #1c1917.`);
    else if (rule.kind === 'url' && !isHttpsUrl(text)) errors.push(`${key} must be an https:// link.`);
    else if (rule.kind === 'enum' && !(rule.values ?? []).includes(text)) errors.push(`${key} must be one of ${(rule.values ?? []).join(', ')}.`);
    else if (rule.kind === 'text' && text.length > (rule.max ?? 500)) errors.push(`${key} is longer than ${rule.max ?? 500} characters.`);
    else if (key === 'fontFamily' && !FONT.test(text)) errors.push('fontFamily may contain letters, numbers, spaces, commas, quotes and hyphens only.');
    else patch[key] = text;
  }
  return errors.length ? { ok: false, errors } : { ok: true, patch };
}

function isHttpsUrl(value: string): boolean {
  if (value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}

const cleanHost = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '').slice(0, 253) : '';

/**
 * The white-label tenant for a request: a preview slug first, then an exact
 * custom domain, then a sub-domain whose first label is the slug
 * (techstars.example.com → "techstars"). Null for the platform's own tenant.
 */
export function resolveTenant<T extends TenantRecord>(tenants: readonly T[], query: { hostname?: unknown; previewSlug?: unknown }, platformTenantId = 't1'): T | null {
  const whiteLabel = tenants.filter((tenant) => tenant.id !== platformTenantId);
  const slug = typeof query.previewSlug === 'string' ? query.previewSlug.trim().toLowerCase() : '';
  if (slug) return whiteLabel.find((tenant) => tenant.slug.toLowerCase() === slug) ?? null;
  const host = cleanHost(query.hostname);
  if (!host) return null;
  const byDomain = whiteLabel.find((tenant) => (tenant.customDomains ?? []).some((domain) => cleanHost(domain) === host));
  if (byDomain) return byDomain;
  const labels = host.split('.');
  if (labels.length < 3) return null;
  const first = labels[0];
  if (!first || first === 'www') return null;
  return whiteLabel.find((tenant) => tenant.slug.toLowerCase() === first) ?? null;
}

export type TenantRouteOptions = {
  tenants: TenantRecord[];
  identify: (req: Request, res: Response) => Promise<Caller | null>;
  /** True when the server requires sign-in (production by default). */
  requireAuth: boolean;
  /** Firebase uids allowed to change tenants when sign-in is required. */
  adminUids: readonly string[];
  /** Where branding and copy changes are kept across restarts; in memory only without it. */
  store?: Store;
  now?: () => Date;
  log?: (message: string, detail?: unknown) => void;
};

const TENANT_COLLECTION = 'tenant_overrides';

/** Applies the branding and copy saved in the store on top of the built-in tenants. */
export async function loadTenantOverrides(tenants: TenantRecord[], store: Store): Promise<number> {
  let applied = 0;
  for (const tenant of tenants) {
    const saved = await store.get<{ branding?: Record<string, unknown>; content?: Record<string, unknown>; updatedAt?: string }>(TENANT_COLLECTION, tenant.id);
    if (!saved) continue;
    if (saved.branding) tenant.branding = { ...(tenant.branding ?? {}), ...saved.branding };
    if (saved.content) tenant.content = { ...(tenant.content ?? {}), ...saved.content };
    if (saved.updatedAt) tenant.updatedAt = saved.updatedAt;
    applied += 1;
  }
  return applied;
}

/** Parses TENANT_ADMIN_UIDS ("uid1, uid2"). */
export function readTenantAdmins(env: Record<string, string | undefined>): string[] {
  return (env.TENANT_ADMIN_UIDS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function registerTenantRoutes(app: Express, opts: TenantRouteOptions): { ready: Promise<void> } {
  const now = opts.now ?? (() => new Date());
  const log = opts.log ?? ((message: string, detail?: unknown) => console.warn(message, detail ?? ''));
  const small = express.json({ limit: '32kb' });
  // Saved branding is applied before the first request is answered.
  const ready = opts.store
    ? loadTenantOverrides(opts.tenants, opts.store).then(() => undefined, (error) => log('Saved tenant branding could not be loaded', error))
    : Promise.resolve();

  app.use('/api/tenants', (_req, _res, next) => {
    void ready.then(() => next());
  });

  app.get('/api/tenants', (_req, res) => res.json(opts.tenants));

  // Declared before "/:slug" so "resolve" is never read as a slug.
  app.get('/api/tenants/resolve', (req, res) => {
    const tenant = resolveTenant(opts.tenants, { hostname: req.query.hostname, previewSlug: req.query.preview_slug });
    if (!tenant) return res.status(404).json({ error: 'No white-label tenant for this host.', code: 'not-found' });
    return res.json(tenant);
  });

  app.get('/api/tenants/:slug', (req, res) => {
    const tenant = opts.tenants.find((item) => item.slug === req.params.slug);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found', code: 'not-found' });
    return res.json(tenant);
  });

  const write = (part: 'branding' | 'content', rules: Record<string, FieldRule>) =>
    async (req: Request, res: Response) => {
      const caller = await opts.identify(req, res);
      if (!caller) return;
      if (opts.requireAuth && !(caller.uid && opts.adminUids.includes(caller.uid))) {
        res.status(403).json({
          error: opts.adminUids.length ? 'Only a tenant administrator can change this.' : 'Tenant changes are turned off on this server (no TENANT_ADMIN_UIDS configured).',
          code: 'forbidden',
        });
        return;
      }
      const tenant = opts.tenants.find((item) => item.id === req.params.id);
      if (!tenant) {
        res.status(404).json({ error: 'Tenant not found', code: 'not-found' });
        return;
      }
      const checked = validatePatch(req.body, rules);
      if (!checked.ok) {
        res.status(422).json({ error: checked.errors.join(' '), code: 'invalid', errors: checked.errors });
        return;
      }
      const next = { ...(tenant[part] ?? {}), ...checked.patch };
      const updatedAt = now().toISOString();
      if (opts.store) {
        try {
          const saved = (await opts.store.get<Record<string, unknown>>(TENANT_COLLECTION, tenant.id)) ?? {};
          await opts.store.put(TENANT_COLLECTION, tenant.id, { ...saved, [part]: next, updatedAt });
        } catch (error) {
          log('Tenant change could not be saved', error);
          res.status(503).json({ error: 'The change could not be saved right now. Try again shortly.', code: 'store-unavailable' });
          return;
        }
      }
      tenant[part] = next;
      tenant.updatedAt = updatedAt;
      res.json(tenant[part]);
    };

  app.post('/api/tenants/:id/branding', small, write('branding', BRANDING_FIELDS));
  app.post('/api/tenants/:id/content', small, write('content', CONTENT_FIELDS));
  return { ready };
}
