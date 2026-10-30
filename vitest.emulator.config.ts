import { defineConfig } from 'vitest/config';

// Without the emulators every test here would skip and the run would "pass".
for (const name of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST']) {
  if (!process.env[name]) throw new Error(`${name} is not set — run this through \`npm run test:emulator\`, which starts the emulators.`);
}

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
    reporters: ['default', 'json'],
    outputFile: { json: 'emulator-results.json' },
    hookTimeout: 30_000,
  },
});
