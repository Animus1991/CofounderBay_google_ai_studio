import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
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

const firebaseConfig = resolveFirebaseConfig();

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test Connection (dev-only diagnostic — silent in production)
async function testConnection() {
  if (appEnv.isProduction) return;
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
