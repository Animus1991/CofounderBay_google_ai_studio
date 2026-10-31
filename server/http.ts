/**
 * Small HTTP and socket hardening shared by server.ts.
 *
 *  - securityHeaders: the baseline response headers every production web app
 *    sends (no MIME sniffing, a strict referrer policy, HSTS on https hosts,
 *    a permissions policy that only keeps the microphone — voice notes in
 *    Messages — for this origin). Framing is left to FRAME_ANCESTORS because
 *    Google AI Studio previews the app inside its own frame.
 *  - readSocketMessage: the shape a chat message must have before the server
 *    stores and broadcasts it; anything else is dropped.
 *  - listenHost: containers must bind every interface (0.0.0.0) — a server
 *    bound to "localhost" inside Cloud Run or Docker cannot be reached.
 */
import type { NextFunction, Request, Response } from 'express';

export function securityHeaders(opts: { production: boolean; frameAncestors?: string }) {
  const frameAncestors = (opts.frameAncestors ?? process.env.FRAME_ANCESTORS ?? '').trim();
  return function applySecurityHeaders(_req: Request, res: Response, next: NextFunction) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=(), usb=(), microphone=(self)');
    // Firebase sign-in opens a popup and reads its result.
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    if (frameAncestors) res.setHeader('Content-Security-Policy', `frame-ancestors ${frameAncestors}`);
    if (opts.production) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    next();
  };
}

export type SocketMessage = {
  conversationId: string;
  senderId: string;
  body: string;
  file?: { name: string };
};

const ID = /^[A-Za-z0-9_.:-]{1,128}$/;
export const MAX_MESSAGE_LENGTH = 4000;

/** A valid chat message, or null. Bodies are trimmed and capped at MAX_MESSAGE_LENGTH; a file is kept by name only. */
export function readSocketMessage(data: unknown): SocketMessage | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const raw = data as Record<string, unknown>;
  if (typeof raw.conversationId !== 'string' || !ID.test(raw.conversationId)) return null;
  if (typeof raw.senderId !== 'string' || !ID.test(raw.senderId)) return null;
  const body = typeof raw.body === 'string' ? raw.body.trim().slice(0, MAX_MESSAGE_LENGTH) : '';
  const fileName = raw.file && typeof raw.file === 'object' && typeof (raw.file as { name?: unknown }).name === 'string'
    ? ((raw.file as { name: string }).name.trim().slice(0, 200))
    : '';
  if (!body && !fileName) return null;
  return { conversationId: raw.conversationId, senderId: raw.senderId, body, ...(fileName ? { file: { name: fileName } } : {}) };
}

/** HOST when set; otherwise every interface in production and loopback in development. */
export function listenHost(env: Record<string, string | undefined>): string {
  if (env.HOST && env.HOST.trim()) return env.HOST.trim();
  return env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
}
