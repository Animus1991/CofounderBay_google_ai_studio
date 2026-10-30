// @vitest-environment node
/**
 * The Firestore store against the emulator (CI job "Firestore rules · store",
 * `npm run test:emulator`). Skipped when FIRESTORE_EMULATOR_HOST is not set.
 */
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { firestoreStore, firestoreTarget, safeId } from './firestoreStore';
import { storeContract } from './store.contract';

describe('Firestore ids and target', () => {
  it('escapes what Firestore does not allow in an id', () => {
    expect(safeId('uid:abc')).toBe('uid:abc');
    expect(safeId('ip:10.0.0.1')).toBe('ip:10.0.0.1');
    expect(safeId('a/b')).toBe('a%2Fb');
    expect(safeId('50%')).toBe('50%25');
    expect(safeId('..')).toBe('%..');
    expect(safeId('__name__')).toBe('%__name__');
  });

  it('shares the app’s named database unless told otherwise', () => {
    expect(firestoreTarget({}).databaseId).toBe('ai-studio-7fa72b81-736d-4c07-887f-5e90569ecb11');
    expect(firestoreTarget({}).prefix).toBe('outreach_');
    expect(firestoreTarget({ OUTREACH_FIRESTORE_DATABASE: 'outreach', OUTREACH_FIRESTORE_PREFIX: '' })).toMatchObject({ databaseId: 'outreach', prefix: '' });
    expect(firestoreTarget({ OUTREACH_FIRESTORE_PROJECT: 'p1', FIREBASE_PROJECT_ID: 'p2' }).projectId).toBe('p1');
  });
});

const emulator = process.env.FIRESTORE_EMULATOR_HOST;

describe.skipIf(!emulator)('Firestore emulator', () => {
  it('is reachable', () => expect(emulator).toBeTruthy());
});

if (emulator) {
  storeContract('firestore', async () => {
    const { Firestore } = await import('@google-cloud/firestore');
    const db = new Firestore({ projectId: 'demo-cofounderbay', ignoreUndefinedProperties: true });
    // A fresh prefix per test keeps the emulator's collections apart.
    return { store: firestoreStore(db, `t${randomUUID().slice(0, 8)}_`), close: () => db.terminate() };
  });
}
