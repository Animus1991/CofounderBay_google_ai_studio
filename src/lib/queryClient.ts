/**
 * Shared TanStack Query client with production-grade defaults.
 *
 * Centralizes caching, retry and refetch policy so every query/mutation in the
 * app behaves consistently. Retry logic is `ApiError`-aware: only transient
 * failures are retried, and 4xx client errors fail fast.
 */
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './apiClient';

const MAX_RETRIES = 2;

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  if (error instanceof ApiError) return error.isRetryable;
  // Unknown (likely network) errors — retry a couple of times.
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 min — most ecosystem data is not second-by-second.
      gcTime: 5 * 60_000, // 5 min cache retention.
      refetchOnWindowFocus: false,
      retry: shouldRetry,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Stable, hierarchical query keys for server data. Invalidate a prefix
 * (`queryKeys.outreach`) to refresh everything under it.
 */
export const queryKeys = {
  outreach: ['outreach'] as const,
  ddShares: ['outreach', 'dd-shares'] as const,
  emailStatus: ['outreach', 'email-status'] as const,
  emailLogs: ['outreach', 'email-log'] as const,
  emailLog: (investorId?: string) => ['outreach', 'email-log', investorId ?? 'all'] as const,
  digestSettings: ['outreach', 'digest-settings'] as const,
  digestHistory: ['outreach', 'digest-history'] as const,
} as const;

export default queryClient;
