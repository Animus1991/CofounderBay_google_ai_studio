import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
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
 */
function createDb(): Firestore {
  const canPersist = typeof window !== 'undefined' && typeof indexedDB !== 'undefined' && !appEnv.isTest;
  if (canPersist) {
    try {
      return initializeFirestore(
        app,
        { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) },
        firebaseConfig.firestoreDatabaseId,
      );
    } catch (error) {
      log.warn('persistent cache unavailable, using memory cache', { error: String(error) });
    }
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

function isFirestoreAssertion(message: string): boolean {
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

if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined' && !appEnv.isTest) {
  const repair = (message: string) => {
    if (!isFirestoreAssertion(message)) return;
    if (sessionStorage.getItem(CACHE_REPAIR_FLAG)) {
      log.error('firestore cache repair already attempted this session', {});
      return;
    }
    sessionStorage.setItem(CACHE_REPAIR_FLAG, '1');
    log.warn('corrupted firestore cache — clearing and reloading', {});
    void clearFirestoreIdb().finally(() => window.location.reload());
  };
  window.addEventListener('error', (event) => repair(event.message ?? ''));
  window.addEventListener('unhandledrejection', (event) => repair(String(event.reason)));
}

/** Cloud Storage is loaded only when someone uploads a file. */
export async function getStorageInstance() {
  const { getStorage } = await import('firebase/storage');
  return getStorage(app);
}

// Test Connection (dev-only diagnostic — silent in production)
async function testConnection() {
  if (appEnv.isProduction || appEnv.isTest) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    log.info('connection successful');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      log.error('configuration error: the client is offline — check your config');
    }
    // Other errors are ignored as this is just a diagnostic probe.
  }
}

testConnection();
