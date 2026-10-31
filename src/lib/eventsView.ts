/**
 * How the Events list is narrowed, ordered and grouped — kept apart from the
 * page so it can be tested.
 *
 * Quick filters are one tap and one choice at a time (All · This week ·
 * Online · a city), the way event apps let you pick "NYC" or "Virtual" without
 * opening a filter panel. Cities come from the events themselves, so a chip
 * never leads to an empty list. Upcoming events read soonest first and are
 * grouped by day; past events read newest first.
 */
export type EventLike = { id: string; startsAt?: number | null; isOnline: boolean; location: string };

export type QuickFilter = 'all' | 'week' | 'online' | `city:${string}`;

/** "Tech Hub, London" → "London"; online events have no city. */
export function eventCity(location: string, isOnline: boolean): string | null {
  if (isOnline) return null;
  const parts = location.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1]! : null;
}

/** Cities with at least one event, most events first (then by name), at most `max`. */
export function cityOptions(events: readonly EventLike[], max = 6): string[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    const city = eventCity(event.location, event.isOnline);
    if (city) counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, max).map(([city]) => city);
}

const WEEK = 7 * 86_400_000;

export function applyQuickFilter<T extends EventLike>(events: readonly T[], filter: QuickFilter, now: number): T[] {
  if (filter === 'all') return [...events];
  if (filter === 'online') return events.filter((event) => event.isOnline);
  if (filter === 'week') return events.filter((event) => event.startsAt != null && event.startsAt >= now - 86_400_000 && event.startsAt < now + WEEK);
  const city = filter.slice('city:'.length);
  return events.filter((event) => eventCity(event.location, event.isOnline) === city);
}

/** Soonest first (or newest first for past events); events without a date go last. */
export function sortEvents<T extends EventLike>(events: readonly T[], direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...events].sort((a, b) => {
    if (a.startsAt == null && b.startsAt == null) return 0;
    if (a.startsAt == null) return 1;
    if (b.startsAt == null) return -1;
    return direction === 'asc' ? a.startsAt - b.startsAt : b.startsAt - a.startsAt;
  });
}

/** Local calendar day key, e.g. "2026-11-07"; "tba" without a date. */
export function dayKey(startsAt: number | null | undefined): string {
  if (startsAt == null) return 'tba';
  const date = new Date(startsAt);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Consecutive events of the same local day, in the order given. */
export function groupByDay<T extends EventLike>(events: readonly T[]): { key: string; startsAt: number | null; items: T[] }[] {
  const groups: { key: string; startsAt: number | null; items: T[] }[] = [];
  for (const event of events) {
    const key = dayKey(event.startsAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(event);
    else groups.push({ key, startsAt: event.startsAt ?? null, items: [event] });
  }
  return groups;
}

/** The next event that has not started yet, or null. */
export function nextUpcoming<T extends EventLike>(events: readonly T[], now: number): T | null {
  return sortEvents(events.filter((event) => event.startsAt != null && event.startsAt >= now))[0] ?? null;
}
