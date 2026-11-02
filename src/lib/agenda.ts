/**
 * One "what's on" answer for the assistant and the Calendar page: sessions
 * with a parseable ISO time, milestones by targetDate, investor follow-ups by
 * next date and tasks by due — all the lists the app already keeps.
 */
import { effectiveStatus, followUps, readMilestones, readSessions, readTasks } from './localLists';

export type AgendaItem = {
  /** 'YYYY-MM-DDTHH:MM' local when timed, else 'YYYY-MM-DD'. */
  at: string;
  allDay: boolean;
  kind: 'session' | 'milestone' | 'followup' | 'task';
  title: string;
  href: string;
};

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const ISO_TIME = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/;

export function agendaFor(range: 'today' | 'tomorrow' | 'week', now: Date = new Date()): AgendaItem[] {
  const offset = range === 'tomorrow' ? 1 : 0;
  const days = range === 'week' ? 7 : 1;
  const wanted = new Set<string>();
  for (let i = 0; i < days; i += 1) wanted.add(dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset + i)));

  const items: AgendaItem[] = [];
  for (const session of readSessions()) {
    const m = ISO_TIME.exec(session.time ?? '');
    if (!m || !wanted.has(`${m[1]}-${m[2]}-${m[3]}`)) continue;
    items.push({ at: `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`, allDay: false, kind: 'session', title: session.title, href: '/calendar' });
  }
  for (const m of readMilestones()) {
    const day = (m.targetDate ?? '').slice(0, 10);
    if (!wanted.has(day) || effectiveStatus(m) === 'Completed') continue;
    items.push({ at: day, allDay: true, kind: 'milestone', title: m.title, href: '/milestones' });
  }
  const fu = followUps(undefined, now);
  for (const item of [...fu.overdue, ...fu.soon, ...fu.later]) {
    const day = (item.nextDate ?? '').slice(0, 10);
    if (!wanted.has(day)) continue;
    items.push({ at: day, allDay: true, kind: 'followup', title: `${item.name ?? item.investorId}: ${item.nextStep ?? ''}`.trim(), href: '/fundraising?tab=crm' });
  }
  for (const task of readTasks()) {
    const day = task.due ?? '';
    if (!wanted.has(day) || task.status === 'Done') continue;
    items.push({ at: day, allDay: true, kind: 'task', title: task.title, href: '/workspace' });
  }
  items.sort((a, b) => a.at.localeCompare(b.at));
  return items;
}

/**
 * A schedule soonest first (the Dashboard's "Upcoming"). Entries whose time is
 * a date sort by it; free-text times ("Next Tuesday") keep their order after them.
 */
export function byWhen<T extends { time: string }>(list: readonly T[]): T[] {
  const at = (time: string) => (/^\d{4}-\d{2}-\d{2}/.test(time) || time.endsWith('Z') ? Date.parse(time) : NaN);
  return list
    .map((item, index) => ({ item, index, when: at(item.time) }))
    .sort((a, b) => {
      const undatedA = Number.isNaN(a.when), undatedB = Number.isNaN(b.when);
      if (undatedA || undatedB) return undatedA === undatedB ? a.index - b.index : undatedA ? 1 : -1;
      return a.when - b.when;
    })
    .map(({ item }) => item);
}
