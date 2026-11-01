import { beforeEach, describe, expect, it } from 'vitest';
import { agendaFor } from './agenda';
import { addSession, upsertMilestone, writeTasks, type StudioTask } from './localLists';

const NOW = new Date(2026, 0, 15, 9, 0, 0); // Thu 15 Jan 2026
const day = (offset: number) => {
  const d = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const task = (over: Partial<StudioTask>): StudioTask => ({
  id: over.id ?? 't1', title: over.title ?? 'Task', priority: 'Medium', status: 'Todo',
  deadline: 'New', timeTracked: 0, estimatedTime: 60, tags: [], ...over,
});

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('demo_mode', 'true');
});

describe('agendaFor', () => {
  it('collects timed sessions and skips free-text times', () => {
    addSession({ id: 's1', title: 'Call', type: 'Meeting', time: `${day(0)}T11:00:00`, duration: '30m', location: '', participants: [], priority: 'Medium' });
    addSession({ id: 's2', title: 'TBD thing', type: 'Event', time: 'TBD', duration: '30m', location: '', participants: [], priority: 'Medium' });
    const items = agendaFor('today', NOW).filter((i) => i.kind === 'session');
    expect(items.map((i) => i.title)).toContain('Call');
    expect(items.map((i) => i.title)).not.toContain('TBD thing');
  });

  it('tomorrow shifts the window by one day', () => {
    addSession({ id: 's1', title: 'Next day', type: 'Meeting', time: `${day(1)}T09:00:00`, duration: '30m', location: '', participants: [], priority: 'Medium' });
    const items = agendaFor('tomorrow', NOW).filter((i) => i.kind === 'session');
    expect(items.map((i) => i.title)).toContain('Next day');
    expect(agendaFor('today', NOW).map((i) => i.title)).not.toContain('Next day');
  });

  it('includes milestones and tasks due in range, sorted all-day first', () => {
    upsertMilestone({ id: 'm1', title: 'Deck done', status: 'In Progress', progress: 40, targetDate: day(0), description: '', category: 'Product', priority: 'High' } as never);
    writeTasks([task({ id: 't1', title: 'Ship it', due: day(0) }), task({ id: 't2', title: 'Finished', due: day(0), status: 'Done' })]);
    addSession({ id: 's9', title: 'Standup', type: 'Meeting', time: `${day(0)}T08:30:00`, duration: '30m', location: '', participants: [], priority: 'Medium' });
    const items = agendaFor('today', NOW);
    const titles = items.map((i) => i.title);
    expect(titles).toContain('Deck done');
    expect(titles).toContain('Ship it');
    expect(titles).not.toContain('Finished');
    const firstTimed = items.findIndex((i) => !i.allDay);
    const lastAllDay = items.map((i, idx) => (i.allDay ? idx : -1)).filter((i) => i >= 0).pop() ?? -1;
    expect(firstTimed).toBeGreaterThan(lastAllDay);
  });
});
