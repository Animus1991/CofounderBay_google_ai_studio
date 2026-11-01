import { describe, expect, it } from 'vitest';
import { applyQuickFilter, cityOptions, eventCity, groupByDay, nextUpcoming, sortEvents } from './eventsView';

const day = 86_400_000;
const now = new Date(2026, 10, 1, 9, 0).getTime();
const events = [
  { id: 'a', startsAt: now + 7 * day, isOnline: false, location: 'Tech Hub, London' },
  { id: 'b', startsAt: now + 2 * day, isOnline: true, location: 'Zoom / Online' },
  { id: 'c', startsAt: now + 2 * day + 3_600_000, isOnline: false, location: 'Innovation Center, NY' },
  { id: 'd', startsAt: null, isOnline: false, location: 'London' },
  { id: 'e', startsAt: now - 3 * day, isOnline: false, location: 'Athens' },
];

describe('events view', () => {
  it('reads the city from the end of the location; online events have none', () => {
    expect(eventCity('Tech Hub, London', false)).toBe('London');
    expect(eventCity('Zoom / Online', true)).toBeNull();
    expect(cityOptions(events)).toEqual(['London', 'Athens', 'NY']);
  });

  it('filters by one quick chip at a time', () => {
    expect(applyQuickFilter(events, 'online', now).map((e) => e.id)).toEqual(['b']);
    expect(applyQuickFilter(events, 'city:London', now).map((e) => e.id)).toEqual(['a', 'd']);
    expect(applyQuickFilter(events, 'week', now).map((e) => e.id).sort()).toEqual(['b', 'c']);
    expect(applyQuickFilter(events, 'all', now)).toHaveLength(5);
  });

  it('orders soonest first, undated last, and groups by local day', () => {
    const sorted = sortEvents(events);
    expect(sorted.map((e) => e.id)).toEqual(['e', 'b', 'c', 'a', 'd']);
    expect(sortEvents(events, 'desc')[0]?.id).toBe('a');
    const groups = groupByDay(sorted.slice(1));
    expect(groups.map((g) => g.items.map((e) => e.id))).toEqual([['b', 'c'], ['a'], ['d']]);
    expect(groups[2]?.key).toBe('tba');
  });

  it('features the next event that has not started', () => {
    expect(nextUpcoming(events, now)?.id).toBe('b');
    expect(nextUpcoming([events[4]!], now)).toBeNull();
  });
});
