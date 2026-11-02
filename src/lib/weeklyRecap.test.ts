import { describe, expect, it } from 'vitest';
import { activityStreak, weeklyRecap } from './weeklyRecap';
import type { ActivityItem } from './localLists';

const now = new Date(2026, 10, 2, 12, 0).getTime();
const day = 86_400_000;
const item = (id: string, kind: ActivityItem['kind'], daysAgo: number, extra: Partial<ActivityItem> = {}): ActivityItem => ({
  id,
  kind,
  title: `Did ${id}`,
  at: new Date(now - daysAgo * day).toISOString(),
  read: true,
  ...extra,
});

describe('weekly recap', () => {
  it('counts this week against last week, by area and by active day', () => {
    const recap = weeklyRecap(
      [
        item('a', 'task', 0.1),
        item('b', 'milestone', 0.2),
        item('c', 'connection', 2),
        item('d', 'round', 6.5, { byAssistant: true }),
        item('e', 'task', 8),
        item('f', 'post', 13),
        item('g', 'task', 20),
      ],
      now,
    );
    expect(recap.total).toBe(4);
    expect(recap.previous).toBe(2);
    expect(recap.change).toBe(2);
    expect(recap.activeDays).toBe(3);
    // Oldest first, today last: 6.5 days ago (Oct 27), 2 days ago (Oct 31), today (Nov 2).
    expect(recap.days).toEqual([true, false, false, false, true, false, true]);
    expect(recap.areas).toEqual([
      { area: 'build', count: 2 },
      { area: 'people', count: 1 },
      { area: 'fundraising', count: 1 },
    ]);
    expect(recap.byAssistant).toBe(1);
    expect(recap.highlights.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not count undone steps as progress, nor unreadable dates', () => {
    const recap = weeklyRecap([item('a', 'task', 1, { title: 'Undid Added task X' }), item('b', 'task', 1, { at: 'not a date' }), item('c', 'task', 1)], now);
    expect(recap.total).toBe(1);
  });

  it('is empty with no activity', () => {
    expect(weeklyRecap([], now)).toMatchObject({ total: 0, previous: 0, change: 0, activeDays: 0, streak: 0, areas: [], highlights: [] });
  });

  it('counts a streak of consecutive days, still open today', () => {
    expect(activityStreak([item('a', 'task', 0), item('b', 'task', 1), item('c', 'task', 2), item('d', 'task', 4)], now)).toBe(3);
    // Nothing yet today: the run up to yesterday still stands until today ends.
    expect(activityStreak([item('b', 'task', 1), item('c', 'task', 2)], now)).toBe(2);
    // A gap of a whole day breaks it.
    expect(activityStreak([item('c', 'task', 2), item('d', 'task', 3)], now)).toBe(0);
    // Undone steps are not progress.
    expect(activityStreak([item('a', 'task', 0, { title: 'Undid: Added task X' })], now)).toBe(0);
  });
});
