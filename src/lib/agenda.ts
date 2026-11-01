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
  // All-day items first within a day.
  items.sort((a, b) => a.at.slice(0, 10) === b.at.slice(0, 10) ? Number(a.allDay === false) - Number(b.allDay === false) : 0);
  return items;
}
