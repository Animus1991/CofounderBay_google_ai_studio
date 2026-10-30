/**
 * Who is calling the API — one rule for every route that keeps data per person
 * (the AI proxy, due-diligence links, email, the weekly digest).
 *
 * - `Authorization: Bearer <Firebase ID token>` → verified (server/firebaseAuth)
 *   → the member, `uid:<uid>`. A bad or expired token is always refused (401),
 *   never silently downgraded to anonymous.
 * - No token → refused when sign-in is required (production by default), else
 *   the device: `device:<X-Client-Id>` when the header is a well-formed device
 *   id (the sample account and local development), otherwise `ip:<address>`.
 *
 * The other agent's backend trusted a `clientId` sent in the body, so anyone
 * who learned an id could read or revoke that person's links. Here the owner of
 * a record is only ever the verified caller.
 */
import type { Request, Response } from 'express';
import { TokenError, type VerifiedToken } from './firebaseAuth';

export type Caller = { key: string; uid?: string; member: boolean };

export type IdentityOptions = {
  requireAuth: boolean;
  verifyToken: (token: string) => Promise<VerifiedToken>;
  log?: (message: string, detail?: unknown) => void;
  /** What the person is told when sign-in is required ("Sign in to use the AI assistant."). */
  signInMessage?: string;
};

const DEVICE_ID = /^dev-[a-z0-9-]{6,64}$/;

export function deviceIdFrom(req: Request): string | null {
  const raw = req.headers['x-client-id'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && DEVICE_ID.test(value) ? value : null;
}

/** Returns the caller, or null when the response has already been sent (401/503). */
export function makeIdentify(opts: IdentityOptions) {
  const log = opts.log ?? ((message: string, detail?: unknown) => console.error(message, detail ?? ''));
  return async function identify(req: Request, res: Response): Promise<Caller | null> {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const anonymous = (): Caller => {
      const device = deviceIdFrom(req);
      return { key: device ? `device:${device}` : `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`, member: false };
    };
    if (token) {
      try {
        const verified = await opts.verifyToken(token);
        return { key: `uid:${verified.uid}`, uid: verified.uid, member: true };
      } catch (error) {
        const reason = error instanceof TokenError ? error.reason : 'verification failed';
        if (/certificates unavailable|project id not configured/.test(reason)) {
          // Google's certificates could not be fetched: not the member's fault.
          if (opts.requireAuth) {
            res.status(503).json({ error: 'Sign-in could not be checked right now. Try again shortly.', code: 'auth-unavailable' });
            return null;
          }
          log('Sign-in check unavailable, serving the request as anonymous', reason);
          return anonymous();
        }
        res.status(401).json({ error: 'Your sign-in has expired. Sign in again.', code: 'invalid-token' });
        return null;
      }
    }
    if (opts.requireAuth) {
      res.status(401).json({ error: opts.signInMessage ?? 'Sign in to continue.', code: 'sign-in-required' });
      return null;
    }
    return anonymous();
  };
}

/** A fixed-window budget per key; answers 429 with Retry-After when it is spent. */
export function makeBudget(now: () => number = Date.now) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return function withinBudget(key: string, limit: number, windowMs: number, res: Response): boolean {
    const time = now();
    if (buckets.size > 5000) {
      for (const [name, bucket] of buckets) if (bucket.resetAt < time) buckets.delete(name);
    }
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt < time) {
      buckets.set(key, { count: 1, resetAt: time + windowMs });
      return true;
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      const retryAfterMs = bucket.resetAt - time;
      res.setHeader('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
      res.status(429).json({ error: 'Too many requests — try again shortly.', code: 'rate-limited', retryAfterMs });
      return false;
    }
    return true;
  };
}
