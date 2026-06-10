/**
 * Application bootstrap — runs once, before React renders.
 *
 * Centralizes one-time side effects (observability init, env validation) so the
 * entry point (`main.tsx`) stays declarative and the order is explicit.
 */
import { appEnv, validateEnv } from '../config/env';
import { createLogger } from './logger';
import { initErrorTracking } from './errorTracking';
import { initAnalytics } from './analytics';

const log = createLogger('bootstrap');

let booted = false;

export function bootstrap(): void {
  if (booted) return;
  booted = true;

  // Observability first so subsequent warnings are captured.
  initErrorTracking();
  initAnalytics();

  // Surface configuration issues early without crashing the app.
  const warnings = validateEnv();
  for (const warning of warnings) log.warn(warning);

  log.info('application bootstrapped', {
    mode: appEnv.mode,
    appName: appEnv.appName,
  });
}

export default bootstrap;
