/**
 * Firebase ID-token verification without firebase-admin.
 *
 * The AI proxy used to accept any caller: a bearer token was only used as a
 * rate-limit key, never checked, so anyone who could reach the server could
 * spend the Gemini key. Firebase ID tokens are RS256 JWTs signed by Google's
 * `securetoken` service account; verifying one needs the public certificates
 * Google publishes, the project id, and the standard claim checks below
 * (https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library).
 *
 * Kept dependency-free (node:crypto) and injectable (certificate fetcher and
 * clock) so it is fully unit-tested offline.
 */
import { createPublicKey, createVerify, X509Certificate, type KeyObject } from 'node:crypto';

export const SECURETOKEN_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

/** kid → PEM certificate, plus when the set expires (from Cache-Control max-age). */
export type CertSet = { certs: Record<string, string>; expiresAt: number };
export type CertFetcher = () => Promise<CertSet>;

export type VerifiedToken = { uid: string; email?: string; claims: Record<string, unknown> };

export class TokenError extends Error {
  constructor(public reason: string) {
    super(reason);
  }
}

/** Fetches Google's certificates and honours their cache lifetime. */
export function googleCertFetcher(fetchImpl: typeof fetch = fetch, url = SECURETOKEN_CERTS_URL): CertFetcher {
  return async () => {
    const response = await fetchImpl(url);
    if (!response.ok) throw new TokenError(`certificates unavailable (${response.status})`);
    const certs = (await response.json()) as Record<string, string>;
    const maxAge = /max-age=(\d+)/.exec(response.headers.get('cache-control') || '')?.[1];
    return { certs, expiresAt: Date.now() + (maxAge ? Number(maxAge) * 1000 : 60 * 60 * 1000) };
  };
}

/** Wraps a fetcher with an in-memory cache so certificates are fetched about once an hour. */
export function cachedCerts(fetcher: CertFetcher, now: () => number = Date.now): CertFetcher {
  let cached: CertSet | null = null;
  let pending: Promise<CertSet> | null = null;
  return async () => {
    if (cached && cached.expiresAt > now()) return cached;
    if (!pending) {
      pending = fetcher()
        .then((set) => {
          cached = set;
          return set;
        })
        .finally(() => {
          pending = null;
        });
    }
    return pending;
  };
}

function decodeSegment(segment: string): Record<string, unknown> {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    throw new TokenError('malformed token');
  }
}

/** Clock skew tolerated on `iat` / `auth_time`, in seconds. */
const SKEW_SECONDS = 300;

/** Google publishes X.509 certificates; tests may pass a bare public key. */
function publicKeyOf(pem: string): KeyObject {
  return pem.includes('BEGIN CERTIFICATE') ? new X509Certificate(pem).publicKey : createPublicKey(pem);
}

export async function verifyFirebaseIdToken(
  token: string,
  opts: { projectId: string; certs: CertFetcher; now?: () => number },
): Promise<VerifiedToken> {
  if (!opts.projectId) throw new TokenError('project id not configured');
  const parts = token.split('.');
  if (parts.length !== 3) throw new TokenError('malformed token');
  const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];
  const header = decodeSegment(headerPart);
  const payload = decodeSegment(payloadPart);

  if (header.alg !== 'RS256') throw new TokenError('unexpected algorithm');
  if (typeof header.kid !== 'string') throw new TokenError('missing key id');

  const nowSeconds = Math.floor((opts.now ?? Date.now)() / 1000);
  const exp = Number(payload.exp);
  const iat = Number(payload.iat);
  const authTime = Number(payload.auth_time);
  if (!Number.isFinite(exp) || exp <= nowSeconds) throw new TokenError('token expired');
  if (!Number.isFinite(iat) || iat > nowSeconds + SKEW_SECONDS) throw new TokenError('issued in the future');
  if (Number.isFinite(authTime) && authTime > nowSeconds + SKEW_SECONDS) throw new TokenError('authenticated in the future');
  if (payload.aud !== opts.projectId) throw new TokenError('wrong audience');
  if (payload.iss !== `https://securetoken.google.com/${opts.projectId}`) throw new TokenError('wrong issuer');
  if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) throw new TokenError('missing subject');

  const { certs } = await opts.certs();
  const pem = certs[header.kid];
  if (!pem) throw new TokenError('unknown key id');

  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${headerPart}.${payloadPart}`);
  verifier.end();
  let valid = false;
  try {
    valid = verifier.verify(publicKeyOf(pem), Buffer.from(signaturePart, 'base64url'));
  } catch {
    valid = false;
  }
  if (!valid) throw new TokenError('bad signature');

  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    claims: payload,
  };
}
