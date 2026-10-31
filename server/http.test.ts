// @vitest-environment node
import express from 'express';
import type { AddressInfo } from 'node:net';
import { createServer } from 'node:http';
import { describe, expect, it } from 'vitest';
import { listenHost, MAX_MESSAGE_LENGTH, readSocketMessage, securityHeaders } from './http';

describe('socket messages', () => {
  it('keeps a well-formed message and drops malformed ones', () => {
    expect(readSocketMessage({ conversationId: 'c1', senderId: 'demo-user', body: '  hi  ' })).toEqual({ conversationId: 'c1', senderId: 'demo-user', body: 'hi' });
    expect(readSocketMessage({ conversationId: 'c1', senderId: 'u1', body: '', file: { name: 'deck.pdf', size: 9 } })).toEqual({ conversationId: 'c1', senderId: 'u1', body: '', file: { name: 'deck.pdf' } });
    expect(readSocketMessage(null)).toBeNull();
    expect(readSocketMessage('text')).toBeNull();
    expect(readSocketMessage({ conversationId: '../../etc', senderId: 'u1', body: 'x' })).toBeNull();
    expect(readSocketMessage({ conversationId: 'c1', senderId: { $ne: 1 }, body: 'x' })).toBeNull();
    expect(readSocketMessage({ conversationId: 'c1', senderId: 'u1', body: '   ' })).toBeNull();
    expect(readSocketMessage({ conversationId: 'c1', senderId: 'u1', body: 'x'.repeat(MAX_MESSAGE_LENGTH + 50) })?.body).toHaveLength(MAX_MESSAGE_LENGTH);
  });
});

describe('listen host', () => {
  it('binds every interface in production and loopback in development, unless HOST says otherwise', () => {
    expect(listenHost({ NODE_ENV: 'production' })).toBe('0.0.0.0');
    expect(listenHost({})).toBe('localhost');
    expect(listenHost({ NODE_ENV: 'production', HOST: '127.0.0.1' })).toBe('127.0.0.1');
  });
});

describe('security headers', () => {
  it('sends the baseline headers, HSTS only in production, framing only when configured', async () => {
    const app = express();
    app.use(securityHeaders({ production: true, frameAncestors: "'self' https://aistudio.google.com" }));
    app.get('/x', (_req, res) => res.send('ok'));
    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/x`);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(response.headers.get('strict-transport-security')).toMatch(/max-age=/);
    expect(response.headers.get('content-security-policy')).toBe("frame-ancestors 'self' https://aistudio.google.com");
    expect(response.headers.get('permissions-policy')).toContain('microphone=(self)');
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
