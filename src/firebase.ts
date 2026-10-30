import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import bundledConfig from '../firebase-applet-config.json';
import { appEnv } from './config/env';
import { createLogger } from './lib/logger';

const log = createLogger('firebase');

/**
 * Resolve Firebase config with the following precedence:
 *   1. Environment variables (VITE_FIREBASE_*) — preferred for production/CI
 *   2. Bundled `firebase-applet-config.json` — fallback for AI Studio / local dev
 *
 * The Firebase web API key is a public client identifier (not a secret); access
 * control is enforced by Firestore Security Rules. Using env vars still lets you
 * point different environments (staging/prod) at different Firebase projects.
 */
function resolveFirebaseConfig() {
  const env = appEnv.firebase;
  return {
    projectId: env.projectId || bundledConfig.projectId,
    appId: env.appId || bundledConfig.appId,
    apiKey: env.apiKey || bundledConfig.apiKey,
    authDomain: env.authDomain || bundledConfig.authDomain,
    firestoreDatabaseId: env.firestoreDatabaseId || bundledConfig.firestoreDatabaseId,
    storageBucket: env.storageBucket || bundledConfig.storageBucket,
    messagingSenderId: env.messagingSenderId || bundledConfig.messagingSenderId,
    measurementId: env.measurementId || bundledConfig.measurementId,
  };
}

export const firebaseConfig = resolveFirebaseConfig();

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);

/**
 * Firestore with an on-device cache, so pages open instantly from the last
 * known data and keep working through a flaky connection. Browsers without
 * IndexedDB (some private modes, tests) fall back to the in-memory cache.
 *
 * Do not issue a one-shot getDoc/getDocFromServer as the first operation on a
 * cold client: Firebase JS 12.x can then assert (ca9, target id -1) while the
 * watch target is torn down, which bricks every later listener (b815).
 */
function createDb(): Firestore {
  // Clear any previously corrupted IndexedDB persistence databases in the background
  // so browsers that hit Firebase 12.x ca9/b815 multi-tab assertion errors self-heal.
  if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined' && !appEnv.isTest) {
    void clearFirestoreIdb().catch(() => undefined);
  }
  return getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = createDb();

/**
 * The persistent IndexedDB cache can become corrupted (e.g. after an SDK or
 * database-id change), which crashes every listener with an "INTERNAL
 * ASSERTION FAILED" error (e.g. IDs ca9/b815). There is no in-SDK repair, so
 * we delete the Firestore databases once and reload — Auth persistence lives
 * elsewhere and is untouched.
 */
const CACHE_REPAIR_FLAG = 'cfb.firestoreCacheRepair';

export function isFirestoreAssertion(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.includes('FIRESTORE') && message.includes('INTERNAL ASSERTION FAILED');
}

async function clearFirestoreIdb(): Promise<void> {
  const dbs = (await indexedDB.databases?.()) ?? [];
  await Promise.all(
    dbs
      .map(({ name }) => name)
      .filter((name): name is string => typeof name === 'string' && name.startsWith('firestore'))
      .map(
        (name) =>
          new Promise<void>((resolve) => {
            const req = indexedDB.deleteDatabase(name);
            req.onsuccess = req.onerror = req.onblocked = () => resolve();
          }),
      ),
  );
}

/**
 * First assertion this tab: clear IndexedDB and reload. A second assertion
 * in the same tab is left for the UI — the Firestore client is already dead
 * for this page lifetime (ca9 poisons the AsyncQueue, then every listen is b815).
 * Returns true when a reload was scheduled.
 */
export function recoverFromFirestoreAssertion(error?: unknown): boolean {
  if (typeof window === 'undefined' || appEnv.isTest) return false;
  if (error !== undefined && !isFirestoreAssertion(error)) return false;
  if (sessionStorage.getItem(CACHE_REPAIR_FLAG)) return false;
  sessionStorage.setItem(CACHE_REPAIR_FLAG, '1');
  log.warn('firestore client assertion — clearing cache and reloading', {});
  void clearFirestoreIdb().finally(() => window.location.reload());
  return true;
}

if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined' && !appEnv.isTest) {
  window.addEventListener('error', (event) => recoverFromFirestoreAssertion(event.message ?? event.error));
  window.addEventListener('unhandledrejection', (event) => recoverFromFirestoreAssertion(event.reason));
}

/** Cloud Storage is loaded only when someone uploads a file. */
/**
 * Cloud Storage, with retries capped.
 *
 * The SDK retries a failed upload for up to ten minutes by default. When
 * Storage is not enabled on the project (or the bucket has no CORS rule), every
 * attempt fails the preflight, so an upload sat on "Uploading…" for minutes and
 * never reached the inline fallback in lib/files.ts. Fifteen seconds is enough
 * for a real transient error and short enough to fall back.
 */
export const STORAGE_RETRY_MS = 15_000;

export async function getStorageInstance() {
  const { getStorage } = await import('firebase/storage');
  const storage = getStorage(app);
  storage.maxUploadRetryTime = STORAGE_RETRY_MS;
  storage.maxOperationRetryTime = STORAGE_RETRY_MS;
  return storage;
}
