/**
 * Centralized, typed, validated environment configuration.
 *
 * This is the single source of truth for all runtime configuration. Reading
 * `import.meta.env` directly anywhere else in the codebase is discouraged.
 *
 * Only variables prefixed with `VITE_` reach the browser. Server secrets
 * (GEMINI_API_KEY, STRIPE keys, …) are read by `server.ts` alone and never
 * end up in the client bundle.
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
  // Node (tests, server-side imports) exposes the same names on process.env.
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
  /** Optional client key for local development only. Production goes through the server proxy. */
  geminiApiKey: string;
  /** Model name the client asks for; the server may override it with GEMINI_MODEL. */
  geminiModel: string;
  /** When true, AI calls go through `/api/ai/generate`. True unless a dev key is set and the proxy is turned off. */
  aiUseProxy: boolean;
  /** Optional explicit API base URL; empty means same-origin. */
  apiBaseUrl: string;
  /** Optional local Ollama endpoint, used only when set explicitly outside production. */
  ollamaBaseUrl: string;
  ollamaEnabled: boolean;
  /** Who runs the platform, shown on the legal pages and in emails. */
  legal: {
    entity: string;
    address: string;
    vatId: string;
    supportEmail: string;
    privacyEmail: string;
    country: string;
  };
  /** Optional Stripe Payment Links and customer portal for paid plans. */
  billing: {
    proMonthlyUrl: string;
    proAnnualUrl: string;
    teamUrl: string;
    portalUrl: string;
    salesEmail: string;
  };
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

const isProduction = mode === 'production' || readBool(['PROD']);
const clientKey = readString(['VITE_GEMINI_API_KEY']);
const ollamaUrl = readString(['VITE_OLLAMA_BASE_URL']);
const supportEmail = readString(['VITE_SUPPORT_EMAIL'], 'support@cofounderbay.com');

export const appEnv: AppEnv = {
  mode,
  isProduction,
  isDevelopment: mode === 'development',
  isTest: mode === 'test',
  appUrl: readString(['VITE_APP_URL'], typeof window !== 'undefined' ? window.location.origin : ''),
  appName: readString(['VITE_APP_NAME'], 'CoFounderBay'),
  geminiApiKey: isProduction ? '' : clientKey,
  geminiModel: readString(['VITE_GEMINI_MODEL'], 'gemini-flash-latest'),
  aiUseProxy: isProduction || !clientKey ? true : readBool(['VITE_AI_USE_PROXY'], false),
  apiBaseUrl: readString(['VITE_API_BASE_URL'], ''),
  ollamaBaseUrl: ollamaUrl || 'http://localhost:11434',
  ollamaEnabled: Boolean(ollamaUrl) && !isProduction,
  legal: {
    entity: readString(['VITE_LEGAL_ENTITY'], 'CoFounderBay'),
    address: readString(['VITE_LEGAL_ADDRESS'], ''),
    vatId: readString(['VITE_LEGAL_VAT_ID'], ''),
    supportEmail,
    privacyEmail: readString(['VITE_PRIVACY_EMAIL'], supportEmail),
    country: readString(['VITE_LEGAL_COUNTRY'], 'Greece'),
  },
  billing: {
    proMonthlyUrl: readString(['VITE_STRIPE_LINK_PRO_MONTHLY']),
    proAnnualUrl: readString(['VITE_STRIPE_LINK_PRO_ANNUAL']),
    teamUrl: readString(['VITE_STRIPE_LINK_TEAM']),
    portalUrl: readString(['VITE_STRIPE_PORTAL_URL']),
    salesEmail: readString(['VITE_SALES_EMAIL'], supportEmail),
  },
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

/** True when a paid plan can actually be bought (a Stripe link is configured). */
export function checkoutConfigured(): boolean {
  return Boolean(appEnv.billing.proMonthlyUrl || appEnv.billing.proAnnualUrl);
}

/**
 * Validates configuration and returns a list of human-readable warnings.
 * Never throws — production apps should degrade gracefully, not crash on boot.
 */
export function validateEnv(): string[] {
  const warnings: string[] = [];

  if (!appEnv.aiUseProxy && !appEnv.geminiApiKey) {
    warnings.push('No AI key and the proxy is off — AI answers will not be available.');
  }
  if (appEnv.isProduction && clientKey) {
    warnings.push('SECURITY: VITE_GEMINI_API_KEY is set for a production build. It is ignored; configure GEMINI_API_KEY on the server instead.');
  }
  if (appEnv.isProduction && appEnv.enableErrorTracking && !appEnv.sentryDsn) {
    warnings.push('Error tracking enabled but VITE_SENTRY_DSN is missing.');
  }
  if (appEnv.isProduction && appEnv.enableAnalytics && !appEnv.analyticsWriteKey) {
    warnings.push('Analytics enabled but VITE_ANALYTICS_WRITE_KEY is missing.');
  }
  if (appEnv.isProduction && !appEnv.legal.address) {
    warnings.push('VITE_LEGAL_ADDRESS is empty — the privacy policy and terms should name the operator and its address.');
  }

  return warnings;
}

export default appEnv;
