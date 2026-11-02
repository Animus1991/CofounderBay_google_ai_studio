/**
 * "Your week" — what the founder moved forward in the last seven days, against
 * the seven before, from the same activity feed Notifications reads.
 *
 * Seeing progress is what brings people back: a weekly recap turns scattered
 * actions into one visible step forward (the goal-gradient effect — effort
 * rises as people see themselves closer to a goal), and the comparison with
 * last week makes the trend, not just the count, visible. The recap reads
 * only what actually happened (lib/localLists activity) — nothing is
 * estimated — and groups it into the five areas the studio is organised by.
 */
import type { ActivityItem, ActivityKind } from './localLists';

export type RecapArea = 'build' | 'people' | 'fundraising' | 'community' | 'profile';

export const RECAP_AREAS: Record<RecapArea, { en: string; el: string; kinds: readonly ActivityKind[] }> = {
  build: { en: 'Building', el: 'Κατασκευή', kinds: ['milestone', 'task', 'tool', 'file'] },
  people: { en: 'People', el: 'Άνθρωποι', kinds: ['connection', 'request', 'message', 'session'] },
  fundraising: { en: 'Fundraising', el: 'Χρηματοδότηση', kinds: ['round', 'application'] },
  community: { en: 'Community', el: 'Κοινότητα', kinds: ['community', 'event', 'post', 'perk'] },
  profile: { en: 'Profile', el: 'Προφίλ', kinds: ['profile', 'settings'] },
};

/** Ties keep the studio's order (Building, People, Fundraising, Community, Profile). */
const AREA_ORDER = Object.keys(RECAP_AREAS) as RecapArea[];

const AREA_OF = new Map<ActivityKind, RecapArea>(
  (Object.entries(RECAP_AREAS) as [RecapArea, (typeof RECAP_AREAS)[RecapArea]][]).flatMap(([area, spec]) => spec.kinds.map((kind) => [kind, area] as const)),
);

export type WeeklyRecap = {
  /** Actions this week: today and the six calendar days before it. */
  total: number;
  /** Actions in the seven calendar days before that. */
  previous: number;
  /** total − previous. */
  change: number;
  /** Days (of this week's seven) with at least one action. */
  activeDays: number;
  /** One entry per day of this week, oldest first, today last: was anything done? */
  days: boolean[];
  /** Consecutive days with an action, up to today (or up to yesterday while today is still open). */
  streak: number;
  /** Actions per area this week, areas with none left out, most first. */
  areas: { area: RecapArea; count: number }[];
  /** How many of this week's actions the assistant made (and the founder confirmed). */
  byAssistant: number;
  /** The newest few, for "what you did". */
  highlights: ActivityItem[];
};

function localDay(time: number): string {
  const date = new Date(time);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Local midnight `offset` days from the day of `now` (calendar arithmetic, so DST days stay whole). */
function dayStart(now: number, offset: number): number {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.getTime();
}

/** Undone writes are logged too ("Undid: …"); they cancel a step, so they are not progress. */
const isUndo = (item: ActivityItem) => /^undid\b|^undo\b/i.test(item.title);

/**
 * Consecutive local days with at least one action. Today still counts as open:
 * a streak that ran to yesterday is not broken until today ends — the honest
 * version of the "keep your streak" nudge, read from what was actually done.
 */
export function activityStreak(activity: readonly ActivityItem[], now: number = Date.now()): number {
  const active = new Set(
    activity
      .filter((item) => !isUndo(item))
      .map((item) => Date.parse(item.at))
      .filter((time) => Number.isFinite(time) && time <= now)
      .map(localDay),
  );
  let offset = active.has(localDay(now)) ? 0 : -1;
  let streak = 0;
  while (active.has(localDay(dayStart(now, offset)))) {
    streak += 1;
    offset -= 1;
  }
  return streak;
}

export function weeklyRecap(activity: readonly ActivityItem[], now: number = Date.now(), highlightCount = 3): WeeklyRecap {
  const weekStart = dayStart(now, -6);
  const previousStart = dayStart(now, -13);
  const counted = activity.filter((item) => !isUndo(item));
  const at = (item: ActivityItem) => Date.parse(item.at);
  const thisWeek = counted.filter((item) => {
    const time = at(item);
    return Number.isFinite(time) && time >= weekStart && time <= now;
  });
  const previous = counted.filter((item) => {
    const time = at(item);
    return Number.isFinite(time) && time >= previousStart && time < weekStart;
  }).length;

  const perArea = new Map<RecapArea, number>();
  for (const item of thisWeek) {
    const area = AREA_OF.get(item.kind);
    if (area) perArea.set(area, (perArea.get(area) ?? 0) + 1);
  }
  const activeSet = new Set(thisWeek.map((item) => localDay(at(item))));
  const days = Array.from({ length: 7 }, (_, index) => activeSet.has(localDay(dayStart(now, index - 6))));

  return {
    total: thisWeek.length,
    previous,
    change: thisWeek.length - previous,
    activeDays: activeSet.size,
    days,
    streak: activityStreak(counted, now),
    areas: [...perArea.entries()].map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count || AREA_ORDER.indexOf(a.area) - AREA_ORDER.indexOf(b.area)),
    byAssistant: thisWeek.filter((item) => item.byAssistant).length,
    highlights: [...thisWeek].sort((a, b) => at(b) - at(a)).slice(0, highlightCount),
  };
}
