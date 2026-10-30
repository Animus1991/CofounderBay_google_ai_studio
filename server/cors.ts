/**
 * Cross-origin policy for the API and the socket server.
 *
 * Every response used to carry `Access-Control-Allow-Origin: *`, so any web
 * page a member visited could call the API (and the AI proxy) from their
 * browser. Now only listed origins are echoed back; same-origin requests (the
 * app itself, which is served from this server) need no header at all.
 *
 * CORS_ORIGINS: comma-separated origins, or "*" to allow all (not advised).
 * Unset: in development any http://localhost or 127.0.0.1 port is allowed; in
 * production only APP_URL (when it is a real URL).
 */
import type { NextFunction, Request, Response } from 'express';

export type OriginPolicy = (origin: string | undefined) => boolean;

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

export function originPolicy(env: { CORS_ORIGINS?: string; APP_URL?: string; NODE_ENV?: string }): OriginPolicy {
  const listed = (env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (listed.includes('*')) return () => true;
  const appUrl = (env.APP_URL || '').trim().replace(/\/$/, '');
  const allowed = new Set(listed.length ? listed : /^https?:\/\//.test(appUrl) ? [appUrl] : []);
  const development = env.NODE_ENV !== 'production';
  return (origin) => {
    if (!origin) return false;
    const normalised = origin.replace(/\/$/, '');
    if (allowed.has(normalised)) return true;
    return development && listed.length === 0 && LOCAL_ORIGIN.test(normalised);
  };
}

export function corsMiddleware(allow: OriginPolicy) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin && allow(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Id');
    }
    if (req.method === 'OPTIONS') {
      // A preflight from an origin that is not allowed gets no allow headers, so the browser blocks it.
      res.sendStatus(origin && !allow(origin) ? 403 : 204);
      return;
    }
    next();
  };
}
