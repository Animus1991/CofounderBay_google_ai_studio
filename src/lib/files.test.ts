import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageState = { mode: 'hang' as 'hang' | 'ok' | 'fail' };
const storage = { maxUploadRetryTime: 600_000, maxOperationRetryTime: 120_000 };

vi.mock('../firebase', () => ({
  getStorageInstance: async () => storage,
}));

vi.mock('firebase/storage', () => ({
  ref: (_storage: unknown, path: string) => ({ path }),
  uploadBytes: () => {
    if (storageState.mode === 'ok') return Promise.resolve({});
    if (storageState.mode === 'fail') return Promise.reject(new Error('storage/unauthorized'));
    // A bucket without CORS: the SDK keeps retrying and never settles.
    return new Promise(() => undefined);
  },
  getDownloadURL: (target: { path: string }) => Promise.resolve(`https://storage.example/${target.path}`),
  deleteObject: () => Promise.resolve(),
}));

import { uploadFile, UploadError, MAX_INLINE_BYTES } from './files';

const small = () => new File(['hello'], 'deck.txt', { type: 'text/plain' });
const large = () => new File([new Uint8Array(MAX_INLINE_BYTES + 1)], 'big.pdf', { type: 'application/pdf' });

beforeEach(() => {
  storageState.mode = 'hang';
});

describe('uploadFile', () => {
  it('stores in the cloud when Storage works', async () => {
    storageState.mode = 'ok';
    const uploaded = await uploadFile(small(), { folder: 'dataroom', uid: 'u1' });
    expect(uploaded.storage).toBe('cloud');
    expect(uploaded.url).toMatch(/^https:\/\/storage\.example\/dataroom\/u1\//);
  });

  it('does not hang when Storage never answers: small files fall back inline', async () => {
    const started = Date.now();
    const uploaded = await uploadFile(small(), { folder: 'dataroom', uid: 'u1', timeoutMs: 50 });
    expect(Date.now() - started).toBeLessThan(2000);
    expect(uploaded.storage).toBe('inline');
    expect(uploaded.url.startsWith('data:text/plain')).toBe(true);
  });

  it('reports a clear error for a large file when Storage never answers', async () => {
    await expect(uploadFile(large(), { folder: 'dataroom', uid: 'u1', timeoutMs: 50 })).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('keeps the sample account inline without touching Storage', async () => {
    storageState.mode = 'ok';
    const uploaded = await uploadFile(small(), { folder: 'dataroom', uid: 'demo', cloud: false });
    expect(uploaded.storage).toBe('inline');
  });

  it('refuses files over the upload limit before any network call', async () => {
    const huge = new File([new Uint8Array(16 * 1024 * 1024)], 'huge.bin');
    await expect(uploadFile(huge, { folder: 'dataroom', uid: 'u1' })).rejects.toBeInstanceOf(UploadError);
  });
});
