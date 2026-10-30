import { defineConfig } from 'vitest/config';

/**
 * Tests that need the Firebase emulators: the security rules and the
 * Firestore outreach store. Run through `npm run test:emulator`, which starts
 * the emulators (Java 21) and points these tests at them.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts', 'server/firestoreStore.test.ts'],
    // One emulator, shared state: files run one after another.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
