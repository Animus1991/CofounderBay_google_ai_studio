// @vitest-environment node
import express from 'express';
import type { AddressInfo } from 'node:net';
import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { TokenError } from './firebaseAuth';
import { makeIdentify } from './identity';
import { memoryStore } from './store';
import { emailService, type EmailMessage } from './email';
import { registerOutreachRoutes } from './outreach';
import { buildDigest, dueNow } from './digest';

let server: Server | null = null;

async function start({ requireAuth = true, provider = null as null | ((message: EmailMessage) => Promise<string>), now = () => new Date('2026-11-02T06:30:00Z') } = {}) {
  const app = express();
  const sent: EmailMessage[] = [];
  const routes = registerOutreachRoutes(app, {
    identify: makeIdentify({
      requireAuth,
      verifyToken: async (token) => {
        if (token === 'alice') return { uid: 'alice', claims: {} };
        if (token === 'bob') return { uid: 'bob', claims: {} };
        throw new TokenError('bad signature');
      },
      log: () => {},
    }),
    store: memoryStore(),
    email: emailService(provider ? { name: 'test', send: async (message) => { sent.push(message); return provider(message); } } : null),
    cronSecret: 'cron-secret',
    now,
    log: () => {},
  });
  server = createServer(app);
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
  const call = (method: string, path: string, { token, body, headers }: { token?: string; body?: unknown; headers?: Record<string, string> } = {}) =>
    fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  return { call, sent, routes };
}

afterEach(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = null;
});

const items = [
  { category: 'corporate', title: 'Cap table', status: 'done' },
  { category: 'legal', title: 'IP assignment', status: 'in_progress', note: 'Waiting on one signature' },
];

describe('due-diligence share links', () => {
  it('needs sign-in when sign-in is required, and never trusts a client id', async () => {
    const { call } = await start();
    const response = await call('POST', '/api/dd/shares', { body: { clientId: 'alice', items } });
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe('sign-in-required');
  });

  it('creates, lists, opens (counting views) and revokes — only for the owner', async () => {
    const { call } = await start();
    const created = await (await call('POST', '/api/dd/shares', { token: 'alice', body: { investorName: 'Sequoia', ventureName: 'EcoFlow', items } })).json();
    expect(created).toMatchObject({ investorName: 'Sequoia', done: 1, total: 2, views: 0 });
    expect(created.token).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(created.owner).toBeUndefined();

    const opened = await (await call('GET', `/api/dd/public/${created.token}`)).json();
    expect(opened.items).toHaveLength(2);
    expect(opened.views).toBe(1);
    expect(opened.owner).toBeUndefined();

    expect(await (await call('GET', '/api/dd/shares', { token: 'bob' })).json()).toEqual([]);
    expect((await call('DELETE', `/api/dd/shares/${created.token}`, { token: 'bob' })).status).toBe(404);
    expect((await call('PUT', `/api/dd/shares/${created.token}`, { token: 'bob', body: { items: [] } })).status).toBe(404);

    const listed = await (await call('GET', '/api/dd/shares', { token: 'alice' })).json();
    expect(listed[0]).toMatchObject({ token: created.token, views: 1 });

    expect((await call('DELETE', `/api/dd/shares/${created.token}`, { token: 'alice' })).status).toBe(200);
    expect((await call('GET', `/api/dd/public/${created.token}`)).status).toBe(404);
  });

  it('refuses bad statuses and non-https files', async () => {
    const { call } = await start();
    expect((await call('POST', '/api/dd/shares', { token: 'alice', body: { items: [{ category: 'x', title: 'y', status: 'maybe' }] } })).status).toBe(422);
    const files = [{ name: 'deck.pdf', url: 'javascript:alert(1)' }];
    expect((await call('POST', '/api/dd/shares', { token: 'alice', body: { items, files } })).status).toBe(422);
  });

  it('lets a local device keep its own links when sign-in is not required', async () => {
    const { call } = await start({ requireAuth: false });
    const device = { 'X-Client-Id': 'dev-abc123-xyz' };
    const created = await (await call('POST', '/api/dd/shares', { headers: device, body: { items } })).json();
    expect((await (await call('GET', '/api/dd/shares', { headers: device })).json())).toHaveLength(1);
    expect((await (await call('GET', '/api/dd/shares', { headers: { 'X-Client-Id': 'dev-other1-xyz' } })).json())).toHaveLength(0);
    expect((await call('DELETE', `/api/dd/shares/${created.token}`, { headers: device })).status).toBe(200);
  });
});

describe('email', () => {
  it('logs as queued without a provider, and keeps owners apart', async () => {
    const { call } = await start();
    expect(await (await call('GET', '/api/email/status')).json()).toEqual({ provider: null, configured: false });
    const entry = await (await call('POST', '/api/email/send', { token: 'alice', body: { to: 'partner@fund.com', subject: 'Hi\r\nBcc: x@y.com', body: 'Hello', investorId: 'inv_1' } })).json();
    expect(entry).toMatchObject({ status: 'queued', to: 'partner@fund.com', investorId: 'inv_1' });
    expect(entry.subject).toBe('Hi Bcc: x@y.com');
    expect((await (await call('GET', '/api/email/log', { token: 'alice' })).json())).toHaveLength(1);
    expect((await (await call('GET', '/api/email/log', { token: 'bob' })).json())).toHaveLength(0);
  });

  it('refuses a second recipient hidden in the address', async () => {
    const { call } = await start();
    const response = await call('POST', '/api/email/send', { token: 'alice', body: { to: 'a@b.com, c@d.com', subject: 'x', body: 'y' } });
    expect(response.status).toBe(422);
  });

  it('reports sent and failed from the provider without throwing', async () => {
    const ok = await start({ provider: async () => 'msg-1' });
    expect((await (await ok.call('POST', '/api/email/send', { token: 'alice', body: { to: 'a@b.com', subject: 'x', body: 'y' } })).json()).status).toBe('sent');
    expect(ok.sent).toHaveLength(1);
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = null;
    const failing = await start({ provider: async () => { throw new Error('smtp down'); } });
    expect((await (await failing.call('POST', '/api/email/send', { token: 'alice', body: { to: 'a@b.com', subject: 'x', body: 'y' } })).json()).status).toBe('failed');
  });
});

describe('weekly digest', () => {
  const snapshot = {
    venture: 'EcoFlow',
    pipeline: [
      { name: 'Sequoia', stage: 'Due Diligence', nextStep: 'Share the data room', nextDate: '2026-11-03', history: [{ at: '2026-10-01T00:00:00Z', stage: 'Contacted' }, { at: '2026-10-30T00:00:00Z', stage: 'Due Diligence' }] },
      { name: 'a16z', stage: 'Contacted', nextStep: 'Follow up', nextDate: '2026-10-30' },
      { name: 'Bessemer', stage: 'Passed', nextDate: '2026-01-01' },
    ],
    dd: { done: 5, total: 12, inProgress: 3, open: ['Cap table'] },
    round: { target: 1_500_000, committed: 450_000, instrument: 'SAFE', targetLabel: '$1.5M' },
  };

  it('builds the digest from the snapshot, leaving closed and passed investors out of follow-ups', () => {
    const digest = buildDigest(snapshot, 'en', new Date('2026-11-02T06:30:00Z'));
    expect(digest.stats).toEqual({ tracked: 3, active: 2, moves: 1, overdue: 1, upcoming: 1 });
    expect(digest.text).toContain('Round: 30% committed of $1.5M (SAFE).');
    expect(digest.text).toContain('• a16z: Follow up (2026-10-30)');
    expect(digest.text).not.toContain('Bessemer:');
    expect(digest.subject).toBe('EcoFlow: 1 overdue, 1 move this week');
    expect(buildDigest(snapshot, 'el', new Date('2026-11-02T06:30:00Z')).text).toContain('Εκπρόθεσμα follow-ups');
  });

  it('is due at the chosen local day and hour, once per ISO week', () => {
    // Monday 2 November 2026, 08:30 in Athens (UTC+2).
    expect(dueNow({ day: 1, hour: 8, timezone: 'Europe/Athens' }, new Date('2026-11-02T06:30:00Z'))).toBe('2026-W45');
    expect(dueNow({ day: 1, hour: 9, timezone: 'Europe/Athens' }, new Date('2026-11-02T06:30:00Z'))).toBeNull();
    expect(dueNow({ day: 0, hour: 23, timezone: 'America/New_York' }, new Date('2026-11-02T04:10:00Z'))).toBe('2026-W44');
  });

  it('needs an address to turn on, previews, sends now and keeps history', async () => {
    const { call } = await start();
    expect((await call('PUT', '/api/digest/settings', { token: 'alice', body: { enabled: true, day: 1, hour: 8, timezone: 'Europe/Athens' } })).status).toBe(422);
    expect((await call('PUT', '/api/digest/settings', { token: 'alice', body: { enabled: true, day: 1, hour: 8, timezone: 'Mars/Olympus', email: 'me@x.com' } })).status).toBe(422);
    const saved = await (await call('PUT', '/api/digest/settings', { token: 'alice', body: { enabled: true, day: 1, hour: 8, timezone: 'Europe/Athens', email: 'me@x.com', lang: 'en' } })).json();
    expect(saved).toMatchObject({ enabled: true, email: 'me@x.com' });
    expect((await call('GET', '/api/digest/preview', { token: 'alice' })).status).toBe(422);
    await call('PUT', '/api/digest/snapshot', { token: 'alice', body: snapshot });
    expect((await (await call('GET', '/api/digest/preview', { token: 'alice' })).json()).stats.overdue).toBe(1);
    expect((await (await call('POST', '/api/digest/send-now', { token: 'alice', body: {} })).json()).status).toBe('queued');
    expect((await (await call('GET', '/api/digest/history', { token: 'alice' })).json())[0]).toMatchObject({ trigger: 'manual', status: 'queued' });
  });

  it('sends due digests from the cron endpoint, once a week, behind its secret', async () => {
    const { call, routes } = await start({ provider: async () => 'id' });
    await call('PUT', '/api/digest/settings', { token: 'alice', body: { enabled: true, day: 1, hour: 8, timezone: 'Europe/Athens', email: 'me@x.com' } });
    await call('PUT', '/api/digest/snapshot', { token: 'alice', body: snapshot });
    expect((await call('POST', '/api/cron/digest', { headers: { Authorization: 'Bearer wrong' }, body: {} })).status).toBe(401);
    expect((await call('POST', '/api/cron/digest', { headers: { Authorization: 'Bearer cron-secret' }, body: {} })).status).toBe(202);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(await routes.runDigests('again')).toBe(0);
    const history = await (await call('GET', '/api/digest/history', { token: 'alice' })).json();
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe('sent');
  });
});
