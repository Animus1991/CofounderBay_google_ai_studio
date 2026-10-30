// @vitest-environment node
/**
 * storage.rules against the Storage emulator — `npm run test:emulator`.
 * Skipped without the emulator.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { getMetadata, listAll, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage';

describe.skipIf(!process.env.FIREBASE_STORAGE_EMULATOR_HOST)('storage.rules', () => {
  let env: RulesTestEnvironment;

  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: 'demo-cofounderbay', storage: { rules: readFileSync('storage.rules', 'utf8') } });
  });
  afterAll(async () => {
    await env?.cleanup();
  });
  beforeEach(async () => {
    await env.clearStorage();
  });

  const as = (uid: string) => env.authenticatedContext(uid).storage() as unknown as FirebaseStorage;
  const guest = () => env.unauthenticatedContext().storage() as unknown as FirebaseStorage;
  const bytes = (size = 3) => new Uint8Array(size);

  it('a member uploads only into their own folders', async () => {
    await assertSucceeds(uploadBytes(ref(as('alice'), 'dataroom/alice/deck.pdf'), bytes()));
    await assertFails(uploadBytes(ref(as('alice'), 'dataroom/bob/deck.pdf'), bytes()));
    await assertFails(uploadBytes(ref(as('alice'), 'secrets/alice/key.txt'), bytes()));
    await assertFails(uploadBytes(ref(guest(), 'dataroom/alice/deck.pdf'), bytes()));
  });

  it('files are capped at 15 MB', async () => {
    await assertFails(uploadBytes(ref(as('alice'), 'decks/alice/huge.pdf'), bytes(15 * 1024 * 1024)));
  });

  it('a signed-in member opens a file by its path, but cannot list someone else’s folder', async () => {
    await assertSucceeds(uploadBytes(ref(as('alice'), 'dataroom/alice/cap-table.xlsx'), bytes()));
    await assertSucceeds(getMetadata(ref(as('bob'), 'dataroom/alice/cap-table.xlsx')));
    await assertFails(getMetadata(ref(guest(), 'dataroom/alice/cap-table.xlsx')));
    await assertFails(listAll(ref(as('bob'), 'dataroom/alice')));
  });
});
