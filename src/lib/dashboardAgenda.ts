/**
 * The dashboard's "Upcoming": one agenda, not three.
 *
 * The page used to show sessions in "This week · session", platform events in
 * "Upcoming", and nothing of the milestones, follow-ups and tasks the
 * assistant already reads through `agendaFor('week')` — so asking "what is on
 * this week?" answered a different list than the one on screen. This merges
 * the personal agenda with dated platform events into one chronological list:
 * same items the assistant names, each with a badge saying what it is.
 */
import { agendaFor } from './agenda';
import { formatDate, formatWhen } from './dates';

export type AgendaEvent = {
  id: string;
  title: string;
  titleEl?: string;
  time: string;
  type: string;
  attendees: number;
};

export type DashAgendaRow = {
  id: string;
  /** 'event' is a platform/community entry; the rest come from the founder's own lists. */
  kind: 'session' | 'milestone' | 'followup' | 'task' | 'event';
  title: string;
  titleEl?: string;
  /** epoch ms when dated; undated rows keep their order after the dated ones. */
  when: number | null;
  allDay: boolean;
  href: string;
  /** The badge word the row shows (event type like MEETUP, or the item kind). */
  badge: string;
  attendees?: number;
  /** Free-text time for undated event rows ("Next Tuesday"), shown as written. */
  rawTime?: string;
};

const AGENDA_BADGE: Record<DashAgendaRow['kind'], string> = {
  session: 'Session',
  milestone: 'Milestone',
  followup: 'Follow-up',
  task: 'Task',
  event: 'Event',
};

const DAY_MS = 86_400_000;

/** 'YYYY-MM-DD' for dedup keys — an event and a task with the same title on the same day list once. */
function dayOf(when: number | null): string | null {
  if (when == null) return null;
  const d = new Date(when);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const norm = (title: string) => title.trim().toLowerCase().replace(/[^a-z0-9\u0370-\u03ff]+/g, ' ').trim().replace(/\s+/g, ' ');

/** How the row stamps its time: all-day rows read "Today" / "Fri 13 Nov", timed ones keep the clock. */
export function agendaDayLabel(when: number, allDay: boolean): string {
  if (!allDay) return formatWhen(when);
  const dayIndex = (value: number) => Math.floor(new Date(new Date(value).setHours(0, 0, 0, 0)).getTime() / DAY_MS);
  const diff = dayIndex(when) - dayIndex(Date.now());
  // formatWhen opens with "Today"/"Tomorrow"/"Σήμερα"/"Αύριο" before the comma: the day word alone.
  if (diff === 0 || diff === 1) return formatWhen(when).split(',')[0] ?? formatWhen(when);
  return formatDate(when, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function dashboardAgenda(events: AgendaEvent[], now: Date = new Date(), limit = 7): { rows: DashAgendaRow[]; extra: number } {
  const rows: DashAgendaRow[] = agendaFor('week', now).map((item, index) => {
    // All-day dates ('YYYY-MM-DD') parse as local noon, so a negative timezone cannot shift the day back.
    const stamp = Date.parse(item.allDay ? `${item.at.slice(0, 10)}T12:00:00` : item.at);
    return {
      id: `ag-${index}-${item.title}`,
      kind: item.kind,
      title: item.title,
      when: Number.isNaN(stamp) ? null : stamp,
      allDay: item.allDay,
      href: item.href,
      badge: AGENDA_BADGE[item.kind],
    };
  });

  const taken = new Set(rows.map((row) => `${dayOf(row.when) ?? ''}·${norm(row.title)}`));
  for (const ev of events) {
    const stamp = /^\d{4}-\d{2}-\d{2}/.test(ev.time) || ev.time.endsWith('Z') ? Date.parse(ev.time) : NaN;
    const when = Number.isNaN(stamp) ? null : stamp;
    const key = `${dayOf(when) ?? 'undated'}·${norm(ev.title)}`;
    if (taken.has(key)) continue;
    taken.add(key);
    rows.push({
      id: `ev-${ev.id}`,
      kind: 'event',
      title: ev.title,
      titleEl: ev.titleEl,
      when,
      allDay: false,
      href: ev.type === 'MILESTONE' ? '/milestones' : '/events',
      badge: ev.type || 'Event',
      attendees: ev.attendees,
      rawTime: when == null ? ev.time : undefined,
    });
  }

  rows.sort((a, b) => {
    if (a.when == null || b.when == null) return a.when == null ? (b.when == null ? 0 : 1) : -1;
    const dayA = dayOf(a.when)!;
    const dayB = dayOf(b.when)!;
    // Day first; inside a day the all-day entries lead, then the clock decides.
    if (dayA !== dayB) return dayA < dayB ? -1 : 1;
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return a.when - b.when;
  });

  return { rows: rows.slice(0, limit), extra: Math.max(0, rows.length - limit) };
}
