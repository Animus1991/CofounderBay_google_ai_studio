/**
 * Centralized, typed, validated environment configuration.
 *
 * This is the single source of truth for all runtime configuration. Reading
 * `import.meta.env` directly anywhere else in the codebase is discouraged.
 *
 * Vite exposes variables prefixed with `VITE_` on `import.meta.env`. We also
 * support a few legacy aliases (e.g. `GEMINI_API_KEY` injected via
 * `vite.config.ts` `define`) so existing deployments keep working.
 */

type ViteEnv = Record<string, string | boolean | undefined>;

function rawEnv(): ViteEnv {
  // `import.meta.env` is statically replaced by Vite at build time.
  try {
    return (import.meta as unknown as { env?: ViteEnv }).env ?? {};
  } catch {
    return {};
  }
}

const env = rawEnv();

/** Read a string env var, checking a list of keys in priority order. */
function readString(keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  // Allow `process.env` fallback (defined via vite.config `define`).
  if (typeof process !== 'undefined' && process.env) {
    for (const key of keys) {
      const value = process.env[key];
      if (typeof value === 'string' && value.trim() !== '') return value.trim();
    }
  }
  return fallback;
}

function readBool(keys: string[], fallback = false): boolean {
  const value = readString(keys);
  if (value === '') return fallback;
  return value === 'true' || value === '1' || value === 'yes';
}

export type AppMode = 'development' | 'production' | 'test';

export interface FirebaseConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId: string;
}

export interface AppEnv {
  mode: AppMode;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  appUrl: string;
  appName: string;
  /** Gemini API key. SECURITY: in production this should be proxied server-side. */
  geminiApiKey: string;
  /**
   * When true, AI calls go through the server-side proxy (`/api/ai/generate`)
   * so the Gemini key never ships in the client bundle. Defaults to true in
   * production builds.
   */
  aiUseProxy: boolean;
  /** Optional explicit API base URL; empty means same-origin. */
  apiBaseUrl: string;
  /** Optional local Ollama endpoint for the free/local AI strategy. */
  ollamaBaseUrl: string;
  /** Feature flags & observability */
  analyticsWriteKey: string;
  sentryDsn: string;
  enableAnalytics: boolean;
  enableErrorTracking: boolean;
  /** Firebase config resolved from env (falls back to bundled JSON in firebase.ts). */
  firebase: Partial<FirebaseConfig>;
}

const mode: AppMode = (() => {
  const m = readString(['MODE', 'NODE_ENV'], 'development');
  if (m === 'production' || m === 'test') return m;
  return 'development';
})();

export const appEnv: AppEnv = {
  mode,
  isProduction: mode === 'production' || readBool(['PROD']),
  isDevelopment: mode === 'development' || readBool(['DEV'], true),
  isTest: mode === 'test',
  appUrl: readString(['VITE_APP_URL', 'APP_URL'], typeof window !== 'undefined' ? window.location.origin : ''),
  appName: readString(['VITE_APP_NAME'], 'CoFounderBay'),
  geminiApiKey: readString(['VITE_GEMINI_API_KEY', 'GEMINI_API_KEY']),
  aiUseProxy: readBool(['VITE_AI_USE_PROXY'], mode === 'production'),
  apiBaseUrl: readString(['VITE_API_BASE_URL'], ''),
  ollamaBaseUrl: readString(['VITE_OLLAMA_BASE_URL'], 'http://localhost:11434'),
  analyticsWriteKey: readString(['VITE_ANALYTICS_WRITE_KEY']),
  sentryDsn: readString(['VITE_SENTRY_DSN']),
  enableAnalytics: readBool(['VITE_ENABLE_ANALYTICS'], false),
  enableErrorTracking: readBool(['VITE_ENABLE_ERROR_TRACKING'], false),
  firebase: {
    projectId: readString(['VITE_FIREBASE_PROJECT_ID']),
    appId: readString(['VITE_FIREBASE_APP_ID']),
    apiKey: readString(['VITE_FIREBASE_API_KEY']),
    authDomain: readString(['VITE_FIREBASE_AUTH_DOMAIN']),
    firestoreDatabaseId: readString(['VITE_FIREBASE_FIRESTORE_DB_ID']),
    storageBucket: readString(['VITE_FIREBASE_STORAGE_BUCKET']),
    messagingSenderId: readString(['VITE_FIREBASE_MESSAGING_SENDER_ID']),
    measurementId: readString(['VITE_FIREBASE_MEASUREMENT_ID']),
  },
};

/**
 * Validates configuration and returns a list of human-readable warnings.
 * Never throws — production apps should degrade gracefully, not crash on boot.
 */
export function validateEnv(): string[] {
  const warnings: string[] = [];

  if (!appEnv.geminiApiKey && !appEnv.aiUseProxy) {
    warnings.push('GEMINI_API_KEY is missing — AI features will fall back to local Ollama or mock responses.');
  }
  if (appEnv.isProduction && appEnv.geminiApiKey && !appEnv.aiUseProxy) {
    warnings.push('SECURITY: a Gemini API key is bundled client-side in production. Set VITE_AI_USE_PROXY=true and configure GEMINI_API_KEY on the server.');
  }
  if (appEnv.isProduction && appEnv.enableErrorTracking && !appEnv.sentryDsn) {
    warnings.push('Error tracking enabled but VITE_SENTRY_DSN is missing.');
  }
  if (appEnv.isProduction && appEnv.enableAnalytics && !appEnv.analyticsWriteKey) {
    warnings.push('Analytics enabled but VITE_ANALYTICS_WRITE_KEY is missing.');
  }

  return warnings;
}

export default appEnv;
