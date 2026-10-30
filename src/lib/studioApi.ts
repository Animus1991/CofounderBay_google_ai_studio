/**
 * Calls to the app's own outreach API (server/outreach): due-diligence links,
 * email and the weekly digest — through the shared HTTP client (lib/apiClient:
 * timeouts, retries for safe methods, breadcrumbs).
 *
 * Every call says who is asking the way the server checks it (server/identity):
 * the Firebase ID token when someone is signed in, plus a per-device id that
 * only counts as an owner for the sample account in local development.
 * Production servers refuse calls without sign-in (`needsSignIn`).
 */
import apiClient, { ApiError } from './apiClient';
import { auth } from '../firebase';

const DEVICE_KEY = 'cfb.deviceId';

/** A stable id for this browser — an anonymous owner in development only, never an account. */
export function deviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing && /^dev-[a-z0-9-]{6,64}$/.test(existing)) return existing;
    const created = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_KEY, created);
    return created;
  } catch {
    return 'dev-ephemeral-device';
  }
}

async function identityHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'X-Client-Id': deviceId() };
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    /* no session: the server decides whether an anonymous call is allowed */
  }
  return headers;
}

export async function studioApi<T>(path: string, init: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown } = {}): Promise<T> {
  const method = init.method ?? 'GET';
  const options = { headers: await identityHeaders(), ...(init.body === undefined ? {} : { json: init.body }) };
  const url = `/api${path}`;
  if (method === 'POST') return apiClient.post<T>(url, options);
  if (method === 'PUT') return apiClient.put<T>(url, options);
  if (method === 'DELETE') return apiClient.delete<T>(url, options);
  return apiClient.get<T>(url, options);
}

/** The server's own error code ("sign-in-required", "rate-limited", "invalid"…), when it sent one. */
export function apiCode(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  const body = error.body as { code?: unknown } | null;
  return body && typeof body.code === 'string' ? body.code : null;
}

export const needsSignIn = (error: unknown) => error instanceof ApiError && error.status === 401;

/** A short, honest sentence for a failed call, in the person's language. */
export function apiErrorText(error: unknown, t: (en: string, el: string) => string): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return t('Sign in to use this — it needs your account.', 'Συνδέσου για να το χρησιμοποιήσεις — χρειάζεται τον λογαριασμό σου.');
    if (error.status === 429) return t('Too many requests — try again in a minute.', 'Πολλά αιτήματα — δοκίμασε ξανά σε ένα λεπτό.');
    if (error.status === 404) return t('That link no longer exists.', 'Αυτός ο σύνδεσμος δεν υπάρχει πια.');
    if (error.status === 422) return error.message;
  }
  return t('The server could not be reached — nothing changed.', 'Ο server δεν απάντησε — τίποτα δεν άλλαξε.');
}
