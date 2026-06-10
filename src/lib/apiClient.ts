/**
 * Centralized, typed HTTP client.
 *
 * Replaces scattered `fetch()` calls with a single layer that provides:
 *  - base URL resolution (same-origin by default, overridable via env)
 *  - request timeouts (AbortController)
 *  - automatic retry with exponential backoff for safe/idempotent methods
 *  - normalized `ApiError` with status + parsed body
 *  - structured logging + breadcrumbs for observability
 */
import { appEnv } from '../config/env';
import { createLogger } from './logger';
import { addBreadcrumb } from './errorTracking';

const log = createLogger('api');

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly body: unknown;

  constructor(message: string, status: number, code = 'api_error', body: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }

  /** True for transient failures that are safe to retry. */
  get isRetryable(): boolean {
    return this.status === 0 || this.status === 408 || this.status === 429 || this.status >= 500;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  /** Parsed JSON body — serialized automatically. */
  json?: unknown;
  /** Raw body (FormData, Blob, string). Takes precedence over `json`. */
  body?: BodyInit;
  /** Query params appended to the URL. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Per-request timeout in ms (default 15000). */
  timeoutMs?: number;
  /** Max retry attempts for retryable failures (default depends on method). */
  retries?: number;
  /** Skip JSON parsing and return the raw Response. */
  raw?: boolean;
}

const DEFAULT_TIMEOUT = 15_000;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function resolveUrl(path: string, query?: RequestOptions['query']): string {
  const base = appEnv.apiBaseUrl?.replace(/\/$/, '') ?? '';
  const url = /^https?:\/\//.test(path) ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }
  if (contentType.includes('text/')) {
    return response.text().catch(() => null);
  }
  return null;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { json, body, query, timeoutMs = DEFAULT_TIMEOUT, retries, raw, headers, ...rest } = options;

  const maxRetries = retries ?? (SAFE_METHODS.has(method) ? 2 : 0);
  const url = resolveUrl(path, query);

  const finalHeaders = new Headers(headers);
  let finalBody: BodyInit | undefined = body;
  if (json !== undefined && body === undefined) {
    finalBody = JSON.stringify(json);
    if (!finalHeaders.has('Content-Type')) finalHeaders.set('Content-Type', 'application/json');
  }
  if (!finalHeaders.has('Accept')) finalHeaders.set('Accept', 'application/json');

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = performance.now();

    try {
      const response = await fetch(url, {
        ...rest,
        method,
        headers: finalHeaders,
        body: finalBody,
        credentials: rest.credentials ?? 'include',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const durationMs = Math.round(performance.now() - startedAt);
      addBreadcrumb(`${method} ${path} → ${response.status}`, { durationMs });

      if (!response.ok) {
        const errorBody = await parseBody(response);
        const message =
          (errorBody && typeof errorBody === 'object' && 'error' in errorBody
            ? String((errorBody as { error: unknown }).error)
            : null) ?? `${method} ${path} failed with ${response.status}`;
        const apiError = new ApiError(message, response.status, 'http_error', errorBody);

        if (apiError.isRetryable && attempt < maxRetries) {
          lastError = apiError;
          attempt += 1;
          await sleep(2 ** attempt * 150);
          continue;
        }
        log.warn(`request failed: ${method} ${path}`, { status: response.status });
        throw apiError;
      }

      if (raw) return response as unknown as T;
      const data = await parseBody(response);
      return data as T;
    } catch (error) {
      clearTimeout(timeout);

      // Abort / network errors are status 0 and retryable.
      const isAbort = error instanceof DOMException && error.name === 'AbortError';
      const networkError = new ApiError(
        isAbort ? `${method} ${path} timed out after ${timeoutMs}ms` : `Network error on ${method} ${path}`,
        0,
        isAbort ? 'timeout' : 'network_error',
      );

      if (error instanceof ApiError) {
        if (error.isRetryable && attempt < maxRetries) {
          lastError = error;
          attempt += 1;
          await sleep(2 ** attempt * 150);
          continue;
        }
        throw error;
      }

      if (attempt < maxRetries) {
        lastError = networkError;
        attempt += 1;
        await sleep(2 ** attempt * 150);
        continue;
      }
      log.error(`request error: ${method} ${path}`, { code: networkError.code });
      throw networkError;
    }
  }

  throw lastError ?? new ApiError(`${method} ${path} failed`, 0);
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, options?: RequestOptions) => request<T>('POST', path, options),
  put: <T>(path: string, options?: RequestOptions) => request<T>('PUT', path, options),
  patch: <T>(path: string, options?: RequestOptions) => request<T>('PATCH', path, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
};

export default apiClient;
