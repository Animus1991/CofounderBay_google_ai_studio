// @vitest-environment node
import { generateKeyPairSync, createSign } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { cachedCerts, TokenError, verifyFirebaseIdToken, type CertFetcher } from './firebaseAuth';

const PROJECT = 'demo-project';
const NOW = 1_800_000_000_000;
const signer = generateKeyPairSync('rsa', { modulusLength: 2048 });
const stranger = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicPem = signer.publicKey.export({ type: 'spki', format: 'pem' }).toString();

const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

function token(
  claims: Record<string, unknown> = {},
  header: Record<string, unknown> = {},
  key = signer.privateKey,
): string {
  const seconds = Math.floor(NOW / 1000);
  const head = b64({ alg: 'RS256', kid: 'k1', typ: 'JWT', ...header });
  const body = b64({
    aud: PROJECT,
    iss: `https://securetoken.google.com/${PROJECT}`,
    sub: 'user-123',
    email: 'founder@example.com',
    iat: seconds - 60,
    auth_time: seconds - 60,
    exp: seconds + 3600,
    ...claims,
  });
  const sign = createSign('RSA-SHA256');
  sign.update(`${head}.${body}`);
  return `${head}.${body}.${sign.sign(key).toString('base64url')}`;
}

const certs: CertFetcher = async () => ({ certs: { k1: publicPem }, expiresAt: NOW + 3_600_000 });
const verify = (value: string) => verifyFirebaseIdToken(value, { projectId: PROJECT, certs, now: () => NOW });
const reason = async (value: string) => {
  try {
    await verify(value);
    return 'accepted';
  } catch (error) {
    return error instanceof TokenError ? error.reason : String(error);
  }
};

describe('Firebase ID token verification', () => {
  it('accepts a correctly signed, current token for this project', async () => {
    await expect(verify(token())).resolves.toMatchObject({ uid: 'user-123', email: 'founder@example.com' });
  });

  it('refuses expired, future, foreign and unsigned tokens', async () => {
    const seconds = Math.floor(NOW / 1000);
    expect(await reason(token({ exp: seconds - 1 }))).toBe('token expired');
    expect(await reason(token({ iat: seconds + 3600 }))).toBe('issued in the future');
    expect(await reason(token({ aud: 'someone-else' }))).toBe('wrong audience');
    expect(await reason(token({ iss: 'https://evil.example' }))).toBe('wrong issuer');
    expect(await reason(token({ sub: '' }))).toBe('missing subject');
    expect(await reason(token({}, { alg: 'none' }))).toBe('unexpected algorithm');
    expect(await reason(token({}, { kid: 'rotated-away' }))).toBe('unknown key id');
    expect(await reason(token({}, {}, stranger.privateKey))).toBe('bad signature');
    expect(await reason('not.a-token')).toBe('malformed token');
  });

  it('refuses a token whose payload was changed after signing', async () => {
    const [head, , signature] = token().split('.');
    const forged = `${head}.${b64({ aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, sub: 'admin', iat: 1, exp: 9_999_999_999 })}.${signature}`;
    expect(await reason(forged)).toBe('bad signature');
  });

  it('fetches certificates once and reuses them until they expire', async () => {
    let clock = NOW;
    const fetcher = vi.fn(async () => ({ certs: { k1: publicPem }, expiresAt: clock + 1000 }));
    const cached = cachedCerts(fetcher, () => clock);
    await Promise.all([cached(), cached(), cached()]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    clock += 2000;
    await cached();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
