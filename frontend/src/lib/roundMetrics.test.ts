import { describe, expect, it } from 'vitest';
import { roundMetrics } from './roundMetrics';
import { defaultRound, Round } from './localLists';

const empty: Round = {
  name: 'Pre-seed',
  instrument: 'SAFE',
  targetAmount: 0,
  committedAmount: 0,
  valuationCap: 0,
  discountPct: 0,
  cashOnHand: 0,
  monthlyBurn: 0,
  closeDate: 'not-a-date',
  updatedAt: '',
  pipeline: [],
};

describe('roundMetrics', () => {
  it('zero round → nulls and em-dash-able values', () => {
    const m = roundMetrics(empty);
    expect(m.pct).toBe(0);
    expect(m.remaining).toBe(0);
    expect(m.runwayMonths).toBeNull();
    expect(m.activeLeads).toBe(0);
    expect(m.meetings).toBe(0);
    expect(m.closeRate).toBeNull();
    expect(m.daysToClose).toBeNull();
  });

  it('demo round → runway 8, pct 30', () => {
    localStorage.setItem('demo_mode', 'true');
    try {
      const m = roundMetrics(defaultRound());
      expect(m.runwayMonths).toBe(8);
      expect(m.pct).toBe(30);
      expect(m.remaining).toBe(1_050_000);
    } finally {
      localStorage.removeItem('demo_mode');
    }
  });

  it('pipeline of 5 with 1 Closed 1 Passed → activeLeads 3, closeRate 0.5', () => {
    const investor = (stage: string) => ({ investorId: stage, name: stage, stage, notes: '', updatedAt: '' });
    const m = roundMetrics({
      ...empty,
      pipeline: ['Identified', 'Meeting', 'Due Diligence', 'Closed', 'Passed'].map(investor),
    });
    expect(m.activeLeads).toBe(3);
    expect(m.meetings).toBe(2);
    expect(m.closed).toBe(1);
    expect(m.decided).toBe(2);
    expect(m.closeRate).toBe(0.5);
  });
});
