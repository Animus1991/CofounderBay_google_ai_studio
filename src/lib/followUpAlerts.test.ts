import { beforeEach, describe, expect, it } from 'vitest';
import { readActivity, resetAllLists, setDataScope, setPipelineFollowUp } from './localLists';
import { overdueInvestors } from '../services/investorOps';
import { takeNewOverdue } from './followUpAlerts';

beforeEach(() => {
  setDataScope(null);
  resetAllLists();
  try { localStorage.setItem('demo_mode', 'true'); } catch { /* non-DOM env */ }
});

describe('overdue follow-up alert', () => {
  it('alerts each overdue follow-up once; Notifications shows it live instead of as a logged entry', () => {
    const first = takeNewOverdue();
    expect(first.map((item) => item.name)).toEqual(['Andreessen Horowitz']);
    expect(readActivity().some((entry) => /Overdue/.test(entry.title))).toBe(false);
    expect(overdueInvestors().map((item) => item.name)).toEqual(['Andreessen Horowitz']);
    expect(takeNewOverdue()).toEqual([]);
  });

  it('alerts again when the date is moved and missed again', () => {
    takeNewOverdue();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    const day = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    setPipelineFollowUp('inv_3', { nextDate: day });
    expect(takeNewOverdue().map((item) => item.investorId)).toEqual(['inv_3']);
  });
});
