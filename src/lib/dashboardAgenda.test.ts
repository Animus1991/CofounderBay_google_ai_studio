import { beforeEach, describe, expect, it } from 'vitest';
import { agendaDayLabel, dashboardAgenda, type AgendaEvent } from './dashboardAgenda';
import { addSession, keys, upsertMilestone, writeMilestones, writeTasks, writeValue, type StudioTask } from './localLists';

const NOW = new Date(2026, 10, 6, 9, 0, 0); // Fri 6 Nov 2026, 09:00
const day = (offset: number) => {
  const d = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const task = (over: Partial<StudioTask>): StudioTask => ({
  id: over.id ?? 't1', title: over.title ?? 'Task', priority: 'Medium', status: 'Todo',
  deadline: 'New', timeTracked: 0, estimatedTime: 60, tags: [], ...over,
});

const event = (over: Partial<AgendaEvent>): AgendaEvent => ({
  id: over.id ?? 'e1', title: over.title ?? 'Event', time: over.time ?? `${day(1)}T18:00:00`,
  type: over.type ?? 'MEETUP', attendees: over.attendees ?? 0, ...over,
});

beforeEach(() => {
  localStorage.clear();
  // The lists also live in an in-memory mirror, so each one is reset through its own writer.
  writeValue(keys.sessions, []);
  writeMilestones([]);
  writeTasks([]);
});

describe('dashboardAgenda', () => {
  it('one agenda: sessions, milestones, tasks and platform events in one chronological list', () => {
    addSession({ id: 's1', title: 'Investor call', type: 'Meeting', time: `${day(1)}T10:00:00`, duration: '30m', location: '', participants: [], priority: 'High' });
    upsertMilestone({ id: 'm1', title: 'Deck v2', status: 'In Progress', progress: 40, targetDate: day(2), description: '', category: 'Product', priority: 'High' } as never);
    writeTasks([task({ id: 't1', title: 'Send deck', due: day(0) })]);
    const { rows } = dashboardAgenda([event({ id: 'e1', title: 'Pitch night', time: `${day(1)}T19:00:00` })], NOW);
    const kinds = rows.map((row) => row.kind);
    expect(rows.map((row) => row.title)).toEqual(['Send deck', 'Investor call', 'Pitch night', 'Deck v2']);
    expect(new Set(kinds)).toEqual(new Set(['task', 'session', 'event', 'milestone']));
    // Badges name what each row is.
    expect(rows.find((row) => row.kind === 'session')?.badge).toBe('Session');
    expect(rows.find((row) => row.kind === 'event')?.badge).toBe('MEETUP');
  });

  it('routes each kind to its own page and skips finished work', () => {
    writeTasks([task({ id: 'done', title: 'Shipped', due: day(0), status: 'Done' }), task({ id: 'open', title: 'Open task', due: day(0) })]);
    upsertMilestone({ id: 'm1', title: 'Launch', status: 'In Progress', progress: 10, targetDate: day(0), description: '', category: 'Product', priority: 'High' } as never);
    const { rows } = dashboardAgenda([], NOW);
    expect(rows.map((row) => row.title)).not.toContain('Shipped');
    const hrefFor = (kind: string) => rows.find((row) => row.kind === kind)?.href;
    expect(hrefFor('task')).toBe('/workspace');
    expect(hrefFor('milestone')).toBe('/milestones');
    const ev = dashboardAgenda([event({}), event({ id: 'e2', title: 'Deadline', type: 'MILESTONE' })], NOW).rows;
    expect(ev.find((row) => row.badge === 'MEETUP')?.href).toBe('/events');
    expect(ev.find((row) => row.badge === 'MILESTONE')?.href).toBe('/milestones');
  });

  it('lists a platform event once when the same thing is already a personal entry that day', () => {
    addSession({ id: 's1', title: 'Pitch night', type: 'Meeting', time: `${day(1)}T19:00:00`, duration: '60m', location: '', participants: [], priority: 'Medium' });
    const { rows } = dashboardAgenda([event({ id: 'e1', title: 'Pitch Night!', time: `${day(1)}T19:30:00` })], NOW);
    expect(rows.filter((row) => /pitch night/i.test(row.title))).toHaveLength(1);
  });

  it('keeps undated events after the dated ones, in their own order', () => {
    addSession({ id: 's1', title: 'Call', type: 'Meeting', time: `${day(0)}T12:00:00`, duration: '30m', location: '', participants: [], priority: 'Medium' });
    const { rows } = dashboardAgenda([
      event({ id: 'e1', title: 'Soon', time: 'Next Tuesday' }),
      event({ id: 'e2', title: 'Later', time: 'TBD' }),
    ], NOW);
    expect(rows[0]?.title).toBe('Call');
    expect(rows.slice(1).map((row) => row.title)).toEqual(['Soon', 'Later']);
  });

  it('caps the list and reports how many more there are', () => {
    writeTasks([0, 1, 2, 3].map((offset) => task({ id: `t${offset}`, title: `Task ${offset}`, due: day(offset) })));
    const { rows, extra } = dashboardAgenda([
      event({ id: 'e1', time: `${day(1)}T20:00:00` }),
      event({ id: 'e2', time: `${day(3)}T20:00:00` }),
    ], NOW, 3);
    expect(rows).toHaveLength(3);
    expect(extra).toBe(3);
  });
});

describe('agendaDayLabel', () => {
  it('marks all-day rows with the day alone and timed rows with the clock', () => {
    const noon = new Date(NOW); noon.setHours(12, 0, 0, 0);
    const tomorrow = noon.getTime() + 86_400_000;
    expect(agendaDayLabel(noon.getTime(), true)).toMatch(/today|σήμερα/i);
    expect(agendaDayLabel(tomorrow, true)).toMatch(/tomorrow|αύριο/i);
    expect(agendaDayLabel(noon.getTime() + 5 * 86_400_000, true)).toContain('Nov');
    expect(agendaDayLabel(noon.getTime(), false)).toContain('12:00');
  });
});
