/**
 * Local, privacy-friendly usage memory: which pages this account actually visits.
 * It is what the assistant's UX coach reads before suggesting layout shortcuts —
 * stored under the same account-scoped local keys as every other list, never sent
 * anywhere. Capped at the 60 most recent paths so it cannot grow unbounded.
 */
import { keys, readValue, writeValue } from './localLists';

export const USAGE_KEY = keys.usage;
const MAX_PATHS = 60;

export type PageUse = { count: number; last: string };
export type UsageStats = { pages: Record<string, PageUse>; total: number };

export function readUsage(): UsageStats {
  const stats = readValue<UsageStats>(USAGE_KEY, { pages: {}, total: 0 });
  return { pages: stats.pages ?? {}, total: stats.total ?? 0 };
}

export function trackVisit(path: string): void {
  if (!path || path === '/login' || path === '/signup' || path.startsWith('/admin')) return;
  const stats = readUsage();
  const entry = stats.pages[path] ?? { count: 0, last: '' };
  stats.pages[path] = { count: entry.count + 1, last: new Date().toISOString() };
  stats.total += 1;
  const paths = Object.keys(stats.pages);
  if (paths.length > MAX_PATHS) {
    const [oldest] = paths.sort((a, b) => (stats.pages[a]?.last ?? '').localeCompare(stats.pages[b]?.last ?? ''));
    if (oldest) delete stats.pages[oldest];
  }
  writeValue(USAGE_KEY, stats);
}

/** The pages this account opens most, most-used first. */
export function topPages(limit = 5): { path: string; count: number }[] {
  return Object.entries(readUsage().pages)
    .map(([path, u]) => ({ path, count: u.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Member navigation paths this account has never opened. */
export function unvisited(navPaths: string[]): string[] {
  const { pages } = readUsage();
  return navPaths.filter((p) => !pages[p]);
}
