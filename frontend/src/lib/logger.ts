/**
 * Structured, environment-aware logger.
 *
 * In development it pretty-prints to the console. In production it suppresses
 * `debug`/`info` noise and routes `warn`/`error` to the error-tracking sink.
 * Replace the sink wiring in `errorTracking.ts` to ship logs to a backend.
 */
import { appEnv } from '../config/env';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const MIN_LEVEL: LogLevel = appEnv.isProduction ? 'warn' : 'debug';

export interface LogContext {
  [key: string]: unknown;
}

type ErrorSink = (level: LogLevel, message: string, context?: LogContext) => void;

let errorSink: ErrorSink | null = null;

/** Allows `errorTracking.ts` to receive warn/error logs without a circular import. */
export function setLoggerSink(sink: ErrorSink | null): void {
  errorSink = sink;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[MIN_LEVEL];
}

function emit(level: LogLevel, scope: string, message: string, context?: LogContext): void {
  if (!shouldLog(level)) return;

  const prefix = `%c[${scope}]`;
  const style =
    level === 'error'
      ? 'color:#dc2626;font-weight:600'
      : level === 'warn'
        ? 'color:#d97706;font-weight:600'
        : 'color:#78716c';

  const args: unknown[] = context ? [message, context] : [message];

  // eslint-disable-next-line no-console
  const fn = level === 'debug' ? console.debug : console[level];
  if (appEnv.isProduction) {
    fn(`[${scope}] ${message}`, context ?? '');
  } else {
    fn(prefix, style, ...args);
  }

  if ((level === 'warn' || level === 'error') && errorSink) {
    try {
      errorSink(level, `[${scope}] ${message}`, context);
    } catch {
      /* never let the sink break logging */
    }
  }
}

export interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  child: (childScope: string) => Logger;
}

/** Create a scoped logger, e.g. `createLogger('auth')`. */
export function createLogger(scope = 'app'): Logger {
  return {
    debug: (message, context) => emit('debug', scope, message, context),
    info: (message, context) => emit('info', scope, message, context),
    warn: (message, context) => emit('warn', scope, message, context),
    error: (message, context) => emit('error', scope, message, context),
    child: (childScope: string) => createLogger(`${scope}:${childScope}`),
  };
}

export const logger = createLogger('app');

export default logger;
