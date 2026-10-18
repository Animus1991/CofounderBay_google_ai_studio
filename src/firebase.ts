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
