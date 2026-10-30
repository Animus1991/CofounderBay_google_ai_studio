// @vitest-environment node
import express from 'express';
import type { AddressInfo } from 'node:net';
import { createServer } from 'node:http';
import { describe, expect, it } from 'vitest';
import { corsMiddleware, originPolicy } from './cors';

describe('origin policy', () => {
  it('allows local origins in development when nothing is configured', () => {
    const allow = originPolicy({ NODE_ENV: 'development' });
    expect(allow('http://localhost:3010')).toBe(true);
    expect(allow('http://127.0.0.1:5180')).toBe(true);
    expect(allow('https://evil.example')).toBe(false);
    expect(allow(undefined)).toBe(false);
  });

  it('allows only APP_URL in production when nothing is configured', () => {
    const allow = originPolicy({ NODE_ENV: 'production', APP_URL: 'https://cofounderbay.app/' });
    expect(allow('https://cofounderbay.app')).toBe(true);
    expect(allow('http://localhost:3010')).toBe(false);
    expect(originPolicy({ NODE_ENV: 'production', APP_URL: 'MY_APP_URL' })('https://cofounderbay.app')).toBe(false);
  });

  it('uses CORS_ORIGINS when set, and "*" only when asked for', () => {
    const listed = originPolicy({ NODE_ENV: 'development', CORS_ORIGINS: 'https://a.example, https://b.example/' });
    expect(listed('https://b.example')).toBe(true);
    expect(listed('http://localhost:3010')).toBe(false);
    expect(originPolicy({ CORS_ORIGINS: '*' })('https://anything.example')).toBe(true);
  });
});

describe('CORS middleware', () => {
  it('echoes allowed origins and blocks other preflights', async () => {
    const app = express();
    app.use(corsMiddleware(originPolicy({ NODE_ENV: 'production', CORS_ORIGINS: 'https://app.example' })));
    app.post('/api/x', (_req, res) => res.json({ ok: true }));
    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const allowed = await fetch(`${base}/api/x`, { method: 'OPTIONS', headers: { Origin: 'https://app.example' } });
      expect(allowed.status).toBe(204);
      expect(allowed.headers.get('access-control-allow-origin')).toBe('https://app.example');
      const blocked = await fetch(`${base}/api/x`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } });
      expect(blocked.status).toBe(403);
      expect(blocked.headers.get('access-control-allow-origin')).toBeNull();
      const sameOrigin = await fetch(`${base}/api/x`, { method: 'POST' });
      expect(sameOrigin.status).toBe(200);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
