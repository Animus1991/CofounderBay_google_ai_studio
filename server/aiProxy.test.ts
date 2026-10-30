// @vitest-environment node
import express from 'express';
import type { AddressInfo } from 'node:net';
import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { TokenError } from './firebaseAuth';
import { readAiEnv, registerAiRoutes, type AiProxyOptions, type ModelCall } from './aiProxy';

let server: Server | null = null;

async function start(overrides: Partial<AiProxyOptions> = {}) {
  const calls: ModelCall[] = [];
  const app = express();
  registerAiRoutes(app, {
    apiKey: () => 'test-key',
    defaultModel: 'gemini-flash-latest',
    allowedModels: new Set(['gemini-flash-latest', 'gemini-pro-latest']),
    maxOutputTokens: 2048,
    memberLimitPerMinute: 5,
    anonymousLimitPerMinute: 2,
    requireAuth: false,
    verifyToken: async (value) => {
      if (value === 'good-token') return { uid: 'u1', claims: {} };
      if (value === 'certs-down') throw new TokenError('certificates unavailable (503)');
      throw new TokenError('bad signature');
    },
    generate: async (call) => {
      calls.push(call);
      return { text: 'hello', functionCalls: [{ name: 'add_milestone', args: { title: 'Beta' } }] };
    },
    async *generateStream(call) {
      calls.push(call);
      yield { text: 'Hel' };
      yield { text: 'lo' };
      yield { functionCalls: [{ name: 'navigate', args: { page: 'fundraising' } }] };
    },
    log: () => {},
    ...overrides,
  });
  server = createServer(app);
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
  const post = (path: string, body: unknown, token?: string) =>
    fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
  return { base, post, calls };
}

afterEach(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = null;
});

const body = { model: 'gemini-flash-latest', contents: 'hi' };

describe('AI proxy access', () => {
  it('refuses anonymous calls when sign-in is required', async () => {
    const { post, calls } = await start({ requireAuth: true });
    const response = await post('/api/ai/generate', body);
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe('sign-in-required');
    expect(calls).toHaveLength(0);
  });

  it('serves a verified member when sign-in is required', async () => {
    const { post } = await start({ requireAuth: true });
    const response = await post('/api/ai/generate', body, 'good-token');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ text: 'hello', functionCalls: [{ name: 'add_milestone' }] });
  });

  it('never downgrades a bad token to anonymous, even in development', async () => {
    const { post, calls } = await start({ requireAuth: false });
    const response = await post('/api/ai/generate', body, 'forged');
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe('invalid-token');
    expect(calls).toHaveLength(0);
  });

  it('answers 503 when Google certificates are unreachable and sign-in is required', async () => {
    const strict = await start({ requireAuth: true });
    expect((await strict.post('/api/ai/generate', body, 'certs-down')).status).toBe(503);
  });

  it('falls back to the anonymous budget when certificates are unreachable in development', async () => {
    const { post } = await start({ requireAuth: false });
    expect((await post('/api/ai/generate', body, 'certs-down')).status).toBe(200);
  });

  it('gives anonymous callers a smaller budget than members, with Retry-After', async () => {
    const { post } = await start();
    expect((await post('/api/ai/generate', body)).status).toBe(200);
    expect((await post('/api/ai/generate', body)).status).toBe(200);
    const limited = await post('/api/ai/generate', body);
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    // The member has their own bucket.
    expect((await post('/api/ai/generate', body, 'good-token')).status).toBe(200);
  });

  it('forwards only allowed models and config, within the output ceiling', async () => {
    const { post, calls } = await start();
    await post('/api/ai/generate', {
      model: 'gemini-ultra-expensive',
      contents: 'hi',
      config: { temperature: 0.2, maxOutputTokens: 999_999, apiKey: 'steal', safetySettings: [] },
    });
    expect(calls[0]).toEqual({ model: 'gemini-flash-latest', contents: 'hi', config: { temperature: 0.2, maxOutputTokens: 2048 } });
  });

  it('reports not-configured without calling the model', async () => {
    const { post, calls } = await start({ apiKey: () => undefined });
    const response = await post('/api/ai/generate', body);
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe('not-configured');
    expect(calls).toHaveLength(0);
  });

  it('tells the client whether sign-in is required', async () => {
    const { base } = await start({ requireAuth: true });
    expect(await (await fetch(`${base}/api/ai/status`)).json()).toEqual({ configured: true, model: 'gemini-flash-latest', requiresSignIn: true });
  });
});

describe('AI proxy streaming', () => {
  it('streams text as Server-Sent Events and ends with the function calls', async () => {
    const { post } = await start();
    const response = await post('/api/ai/stream', body, 'good-token');
    expect(response.headers.get('content-type')).toMatch(/text\/event-stream/);
    const events = (await response.text())
      .split('\n\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line.replace(/^data: /, '')));
    expect(events).toEqual([
      { text: 'Hel' },
      { text: 'lo' },
      { done: true, functionCalls: [{ name: 'navigate', args: { page: 'fundraising' } }], model: 'gemini-flash-latest' },
    ]);
  });

  it('applies the same access rules to the stream', async () => {
    const { post } = await start({ requireAuth: true });
    expect((await post('/api/ai/stream', body)).status).toBe(401);
  });

  it('reports an upstream failure inside the stream', async () => {
    const { post } = await start({
      // eslint-disable-next-line require-yield -- a stream that fails before its first chunk
      async *generateStream() {
        throw new Error('boom');
      },
    });
    const text = await (await post('/api/ai/stream', body, 'good-token')).text();
    expect(text).toContain('Upstream AI provider error');
  });
});

describe('AI proxy settings', () => {
  it('requires sign-in in production unless explicitly turned off', () => {
    expect(readAiEnv({ NODE_ENV: 'production' }).requireAuth).toBe(true);
    expect(readAiEnv({ NODE_ENV: 'production', AI_REQUIRE_AUTH: 'false' }).requireAuth).toBe(false);
    expect(readAiEnv({ NODE_ENV: 'development' }).requireAuth).toBe(false);
    expect(readAiEnv({ NODE_ENV: 'development', AI_REQUIRE_AUTH: 'true' }).requireAuth).toBe(true);
  });

  it('gives anonymous callers a third of the member budget by default', () => {
    expect(readAiEnv({ AI_RATE_LIMIT_PER_MINUTE: '30' }).anonymousLimitPerMinute).toBe(10);
    expect(readAiEnv({ AI_ANON_RATE_LIMIT_PER_MINUTE: '4' }).anonymousLimitPerMinute).toBe(4);
  });
});

