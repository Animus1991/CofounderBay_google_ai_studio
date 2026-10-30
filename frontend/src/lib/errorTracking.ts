/**
 * Provider-agnostic error tracking.
 *
 * Ships with a safe no-op + console implementation. To enable a real provider
 * (Sentry, Bugsnag, etc.) implement `ErrorTrackingProvider` and pass it to
 * `initErrorTracking()` during app bootstrap — no other code needs to change.
 */
import { appEnv } from '../config/env';
import { createLogger, setLoggerSink, type LogContext, type LogLevel } from './logger';

const log = createLogger('error-tracking');

export interface ErrorUser {
  id?: string;
  email?: string;
  role?: string;
}

export interface ErrorTrackingProvider {
  captureException: (error: unknown, context?: LogContext) => void;
  captureMessage: (message: string, level: LogLevel, context?: LogContext) => void;
  setUser: (user: ErrorUser | null) => void;
  addBreadcrumb: (message: string, context?: LogContext) => void;
}

/** Default provider: structured console output only. */
const consoleProvider: ErrorTrackingProvider = {
  captureException: (error, context) => {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`captured exception: ${message}`, { ...context, stack: error instanceof Error ? error.stack : undefined });
  },
  captureMessage: (message, level, context) => {
    if (level === 'error') log.error(message, context);
    else if (level === 'warn') log.warn(message, context);
    else log.info(message, context);
  },
  setUser: (user) => log.debug('user context set', { user }),
  addBreadcrumb: (message, context) => log.debug(`breadcrumb: ${message}`, context),
};

let provider: ErrorTrackingProvider = consoleProvider;
let initialized = false;

/**
 * Initialize error tracking. Call once during bootstrap.
 * Pass a custom provider to integrate Sentry et al.
 */
export function initErrorTracking(customProvider?: ErrorTrackingProvider): void {
  if (initialized) return;
  initialized = true;

  if (customProvider && appEnv.enableErrorTracking) {
    provider = customProvider;
    log.info('error tracking initialized', { provider: 'custom' });
  } else {
    log.debug('error tracking running in console mode');
  }

  // Route logger warn/error through the active provider. The console provider
  // itself logs errors — without a guard the sink would recurse into itself.
  let inSink = false;
  setLoggerSink((level, message, context) => {
    if (level !== 'error' || inSink) return;
    inSink = true;
    try {
      provider.captureMessage(message, 'error', context);
    } finally {
      inSink = false;
    }
  });

  // Global safety nets.
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      provider.captureException(event.error ?? event.message, { source: 'window.onerror' });
    });
    window.addEventListener('unhandledrejection', (event) => {
      provider.captureException(event.reason, { source: 'unhandledrejection' });
    });
  }
}

export function captureException(error: unknown, context?: LogContext): void {
  provider.captureException(error, context);
}

export function captureMessage(message: string, level: LogLevel = 'info', context?: LogContext): void {
  provider.captureMessage(message, level, context);
}

export function setErrorUser(user: ErrorUser | null): void {
  provider.setUser(user);
}

export function addBreadcrumb(message: string, context?: LogContext): void {
  provider.addBreadcrumb(message, context);
}
