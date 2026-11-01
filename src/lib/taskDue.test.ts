import { describe, expect, it } from 'vitest';
import { daysFromToday } from '../data/demoClock';
import { taskDueLabel, type StudioTask } from './localLists';

const NOW = new Date(2026, 0, 15, 9, 0, 0);
const en = (s: string) => s;
const task = (over: Partial<StudioTask>): StudioTask => ({
  id: 't1', title: 'T', priority: 'Medium', status: 'Todo', deadline: 'x', timeTracked: 0, estimatedTime: 60, tags: [], ...over,
});

describe('taskDueLabel', () => {
  it('derives labels from due', () => {
    expect(taskDueLabel(task({ due: daysFromToday(0, NOW) }), en, NOW)).toBe('Today');
    expect(taskDueLabel(task({ due: daysFromToday(1, NOW) }), en, NOW)).toBe('Tomorrow');
    expect(taskDueLabel(task({ due: daysFromToday(4, NOW) }), en, NOW)).toBe('4d left');
    expect(taskDueLabel(task({ due: daysFromToday(-2, NOW) }), en, NOW)).toBe('2d overdue');
  });
  it('Done status wins; legacy deadline survives without due', () => {
    expect(taskDueLabel(task({ status: 'Done', due: daysFromToday(5, NOW), deadline: 'Done' }), en, NOW)).toBe('Done');
    expect(taskDueLabel(task({ deadline: 'New' }), en, NOW)).toBe('New');
    expect(taskDueLabel(task({ deadline: '3d left' }), en, NOW)).toBe('3d left');
  });
});
