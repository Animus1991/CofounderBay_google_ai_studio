/**
 * Provider-agnostic product analytics.
 *
 * Ships with a privacy-friendly no-op (+ dev console) implementation. Plug in
 * PostHog, Segment, Amplitude, etc. by implementing `AnalyticsProvider` and
 * calling `initAnalytics()` at bootstrap. Event names are centralized in
 * `AnalyticsEvent` to prevent typos and keep dashboards consistent.
 */
import { appEnv } from '../config/env';
import { createLogger } from './logger';

const log = createLogger('analytics');

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

/** Canonical event taxonomy. Extend here, never with inline string literals. */
export const AnalyticsEvent = {
  // Auth
  SignUpStarted: 'sign_up_started',
  SignUpCompleted: 'sign_up_completed',
  LoggedIn: 'logged_in',
  LoggedOut: 'logged_out',
  // Onboarding
  OnboardingStepCompleted: 'onboarding_step_completed',
  OnboardingCompleted: 'onboarding_completed',
  // Core product
  ProfileUpdated: 'profile_updated',
  MatchViewed: 'match_viewed',
  ConnectionRequested: 'connection_requested',
  MessageSent: 'message_sent',
  MilestoneCreated: 'milestone_created',
  AiChatStarted: 'ai_chat_started',
  // Monetization
  PricingViewed: 'pricing_viewed',
  CheckoutStarted: 'checkout_started',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent] | (string & {});

export interface AnalyticsProvider {
  identify: (userId: string, traits?: AnalyticsProps) => void;
  track: (event: AnalyticsEventName, props?: AnalyticsProps) => void;
  page: (name: string, props?: AnalyticsProps) => void;
  reset: () => void;
}

const noopProvider: AnalyticsProvider = {
  identify: (userId, traits) => log.debug('identify', { userId, ...traits }),
  track: (event, props) => log.debug(`track: ${event}`, props),
  page: (name, props) => log.debug(`page: ${name}`, props),
  reset: () => log.debug('reset'),
};

let provider: AnalyticsProvider = noopProvider;
let initialized = false;

export function initAnalytics(customProvider?: AnalyticsProvider): void {
  if (initialized) return;
  initialized = true;

  if (customProvider && appEnv.enableAnalytics) {
    provider = customProvider;
    log.info('analytics initialized', { provider: 'custom' });
  } else {
    log.debug('analytics running in no-op mode');
  }
}

export function identify(userId: string, traits?: AnalyticsProps): void {
  provider.identify(userId, traits);
}

export function track(event: AnalyticsEventName, props?: AnalyticsProps): void {
  provider.track(event, props);
}

export function trackPage(name: string, props?: AnalyticsProps): void {
  provider.page(name, props);
}

export function resetAnalytics(): void {
  provider.reset();
}

export const analytics = { identify, track, trackPage, reset: resetAnalytics };
export default analytics;
