/**
 * Per-account layout personalization: pages the user pinned to the sidebar and
 * the page they want to land on. Writable from the star on each page header, from
 * Settings, and from the assistant ("/pin matches", "/home matches") — one source
 * of truth for all three.
 */
import { readValue, writeValue } from './localLists';

export const UX_PREFS_KEY = 'cfb.uxPrefs';

export type UxPrefs = {
  /** Sidebar "Pinned" group, in pin order. */
  favorites: string[];
  /** Where "/" sends a signed-in member (null = the normal landing page). */
  homePath: string | null;
};

export const DEFAULT_UX_PREFS: UxPrefs = { favorites: [], homePath: null };

export function readUxPrefs(): UxPrefs {
  const raw = readValue<Partial<UxPrefs>>(UX_PREFS_KEY, {});
  return {
    favorites: Array.isArray(raw.favorites) ? raw.favorites.filter((p): p is string => typeof p === 'string' && p.startsWith('/')) : [],
    homePath: typeof raw.homePath === 'string' && raw.homePath.startsWith('/') ? raw.homePath : null,
  };
}

export function writeUxPrefs(patch: Partial<UxPrefs>): UxPrefs {
  const next = { ...readUxPrefs(), ...patch };
  writeValue(UX_PREFS_KEY, next);
  return next;
}

export function isFavorite(path: string): boolean {
  return readUxPrefs().favorites.includes(path);
}

export function toggleFavorite(path: string): boolean {
  const prefs = readUxPrefs();
  const on = !prefs.favorites.includes(path);
  writeUxPrefs({
    favorites: on ? [...prefs.favorites, path] : prefs.favorites.filter((p) => p !== path),
  });
  return on;
}

export function pinFavorite(path: string): void {
  if (!isFavorite(path)) toggleFavorite(path);
}
