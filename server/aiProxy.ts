/**
 * The AI proxy: Gemini behind the server, so the key never ships to browsers.
 *
 * Who may call it
 * - A request with `Authorization: Bearer <Firebase ID token>` is verified
 *   (server/firebaseAuth.ts). A bad or expired token is refused (401) — it is
 *   never silently downgraded.
 * - A request without a token is refused when sign-in is required
 *   (AI_REQUIRE_AUTH, on by default in production) and otherwise served under a
 *   per-IP budget, so local development and the sample account keep working.
 *
 * What it forwards
 * - Only the configured model or an allow-listed one, only known config keys,
 *   and never more than the output-token ceiling.
 * - Text and function calls, so the assistant's tool use works through it.
 * - `POST /api/ai/stream` sends the same answer as Server-Sent Events, so a long
 *   answer appears as it is written instead of after a blank wait.
 *
 * Everything that talks to Google (token certificates, the model) is injected,
 * which is what lets `aiProxy.test.ts` cover the policy offline.
 */
import express, { type Express, type Request, type Response } from 'express';
import { TokenError, type VerifiedToken } from './firebaseAuth';

export type ModelCall = { model: string; contents: unknown; config: Record<string, unknown> };
export type ModelFunctionCall = { name: string; args: Record<string, unknown> };
export type ModelResult = { text: string; functionCalls: ModelFunctionCall[] };
export type ModelChunk = { text?: string; functionCalls?: ModelFunctionCall[] };

export type AiProxyOptions = {
  apiKey: () => string | undefined;
  defaultModel: string;
  allowedModels: Set<string>;
  maxOutputTokens: number;
  memberLimitPerMinute: number;
  anonymousLimitPerMinute: number;
  requireAuth: boolean;
  verifyToken: (token: string) => Promise<VerifiedToken>;
  generate: (call: ModelCall) => Promise<ModelResult>;
  generateStream: (call: ModelCall) => AsyncIterable<ModelChunk>;
  now?: () => number;
  log?: (message: string, detail?: unknown) => void;
};

export const FORWARDED_CONFIG_KEYS = new Set([
  'systemInstruction',
  'responseMimeType',
  'responseSchema',
  'temperature',
  'topP',
  'tools',
  'toolConfig',
  'maxOutputTokens',
]);

type Caller = { key: string; limit: number; uid?: string };

export function readAiEnv(env: NodeJS.ProcessEnv) {
  const defaultModel = env.GEMINI_MODEL || 'gemini-flash-latest';
  const memberLimit = parseInt(env.AI_RATE_LIMIT_PER_MINUTE || '30', 10);
  const flag = (env.AI_REQUIRE_AUTH || '').trim().toLowerCase();
  return {
    defaultModel,
    allowedModels: new Set([defaultModel, ...(env.AI_MODEL_ALLOWLIST || '').split(',')].map((m) => m.trim()).filter(Boolean)),
    maxOutputTokens: parseInt(env.AI_MAX_OUTPUT_TOKENS || '2048', 10),
    memberLimitPerMinute: memberLimit,
    anonymousLimitPerMinute: parseInt(env.AI_ANON_RATE_LIMIT_PER_MINUTE || String(Math.max(1, Math.floor(memberLimit / 3))), 10),
    requireAuth: flag ? flag === 'true' || flag === '1' : env.NODE_ENV === 'production',
  };
}

export function registerAiRoutes(app: Express, opts: AiProxyOptions) {
  const now = opts.now ?? Date.now;
  const log = opts.log ?? ((message: string, detail?: unknown) => console.error(message, detail ?? ''));
  const buckets = new Map<string, { count: number; resetAt: number }>();

  /** Who is calling, or null when the response has already been sent. */
  async function identify(req: Request, res: Response): Promise<Caller | null> {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (token) {
      try {
        const verified = await opts.verifyToken(token);
        return { key: `uid:${verified.uid}`, limit: opts.memberLimitPerMinute, uid: verified.uid };
      } catch (error) {
        const reason = error instanceof TokenError ? error.reason : 'verification failed';
        if (/certificates unavailable|project id not configured/.test(reason)) {
          // Google's certificates could not be fetched: not the member's fault.
          if (opts.requireAuth) {
            res.status(503).json({ error: 'Sign-in could not be checked right now. Try again shortly.', code: 'auth-unavailable' });
            return null;
          }
          log('AI proxy: token check unavailable, serving under the anonymous budget', reason);
          return { key: `ip:${ip}`, limit: opts.anonymousLimitPerMinute };
        }
        res.status(401).json({ error: 'Your sign-in has expired. Sign in again to use the assistant.', code: 'invalid-token' });
        return null;
      }
    }
    if (opts.requireAuth) {
      res.status(401).json({ error: 'Sign in to use the AI assistant.', code: 'sign-in-required' });
      return null;
    }
    return { key: `ip:${ip}`, limit: opts.anonymousLimitPerMinute };
  }

  /** True when the caller is within budget; otherwise answers 429. */
  function withinBudget(caller: Caller, res: Response): boolean {
    const time = now();
    if (buckets.size > 5000) {
      for (const [key, bucket] of buckets) if (bucket.resetAt < time) buckets.delete(key);
    }
    const bucket = buckets.get(caller.key);
    if (!bucket || bucket.resetAt < time) {
      buckets.set(caller.key, { count: 1, resetAt: time + 60_000 });
      return true;
    }
    bucket.count += 1;
    if (bucket.count > caller.limit) {
      const retryAfterMs = bucket.resetAt - time;
      res.setHeader('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
      res.status(429).json({ error: 'Rate limit exceeded', retryAfterMs });
      return false;
    }
    return true;
  }

  /** Validated model call, or null when the response has already been sent. */
  function buildCall(req: Request, res: Response): ModelCall | null {
    if (!opts.apiKey()) {
      res.status(503).json({ error: 'AI proxy not configured — set GEMINI_API_KEY on the server environment', code: 'not-configured' });
      return null;
    }
    const { model: requestedModel, contents, config } = (req.body ?? {}) as Record<string, unknown>;
    if (contents === undefined) {
      res.status(400).json({ error: '`contents` is required' });
      return null;
    }
    const model = typeof requestedModel === 'string' && opts.allowedModels.has(requestedModel) ? requestedModel : opts.defaultModel;
    const safeConfig: Record<string, unknown> = {};
    if (config && typeof config === 'object') {
      for (const [key, value] of Object.entries(config as Record<string, unknown>)) {
        if (FORWARDED_CONFIG_KEYS.has(key)) safeConfig[key] = value;
      }
    }
    const asked = Number(safeConfig.maxOutputTokens);
    safeConfig.maxOutputTokens = Number.isFinite(asked) && asked > 0 ? Math.min(asked, opts.maxOutputTokens) : opts.maxOutputTokens;
    return { model, contents, config: safeConfig };
  }

  app.get('/api/ai/status', (_req, res) => {
    const configured = Boolean(opts.apiKey());
    res.json({ configured, model: configured ? opts.defaultModel : null, requiresSignIn: opts.requireAuth });
  });

  app.post('/api/ai/generate', express.json({ limit: '8mb' }), async (req, res) => {
    const caller = await identify(req, res);
    if (!caller || !withinBudget(caller, res)) return;
    const call = buildCall(req, res);
    if (!call) return;
    try {
      const result = await opts.generate(call);
      res.json({ text: result.text, functionCalls: result.functionCalls, model: call.model });
    } catch (error) {
      log('AI proxy upstream error:', error);
      res.status(502).json({ error: 'Upstream AI provider error' });
    }
  });

  app.post('/api/ai/stream', express.json({ limit: '8mb' }), async (req, res) => {
    const caller = await identify(req, res);
    if (!caller || !withinBudget(caller, res)) return;
    const call = buildCall(req, res);
    if (!call) return;
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    let closed = false;
    req.on('close', () => {
      closed = true;
    });
    const send = (payload: Record<string, unknown>) => {
      if (!closed) res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };
    const functionCalls: ModelFunctionCall[] = [];
    try {
      for await (const chunk of opts.generateStream(call)) {
        if (closed) break;
        if (chunk.text) send({ text: chunk.text });
        if (chunk.functionCalls?.length) functionCalls.push(...chunk.functionCalls);
      }
      send({ done: true, functionCalls, model: call.model });
    } catch (error) {
      log('AI proxy upstream stream error:', error);
      send({ error: 'Upstream AI provider error' });
    }
    res.end();
  });
}

/** The real Gemini calls, used by server.ts. */
export function geminiModel(apiKey: () => string | undefined) {
  const client = async () => {
    const { GoogleGenAI } = await import('@google/genai');
    return new GoogleGenAI({ apiKey: apiKey() });
  };
  const calls = (raw: { name?: string; args?: Record<string, unknown> }[] | undefined): ModelFunctionCall[] =>
    (raw ?? []).filter((call) => call.name).map((call) => ({ name: String(call.name), args: call.args ?? {} }));
  const textOf = (response: { text?: string }) => {
    try {
      return response.text ?? '';
    } catch {
      return '';
    }
  };
  return {
    async generate(call: ModelCall): Promise<ModelResult> {
      const ai = await client();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the SDK's request type is wider than our validated call
      const response = await ai.models.generateContent(call as any);
      return { text: textOf(response), functionCalls: calls(response.functionCalls) };
    },
    async *generateStream(call: ModelCall): AsyncIterable<ModelChunk> {
      const ai = await client();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- as above
      const stream = await ai.models.generateContentStream(call as any);
      for await (const chunk of stream) {
        yield { text: textOf(chunk), functionCalls: calls(chunk.functionCalls) };
      }
    },
  };
}
