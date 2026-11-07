import { describe, expect, it } from 'vitest';
import { draftInvestorUpdate } from './investorUpdate';
import type { Milestone } from '../types';
import type { Round } from './localLists';

const round = (over: Partial<Round> = {}): Round => ({
  name: 'Seed',
  instrument: 'SAFE',
  targetAmount: 0,
  committedAmount: 0,
  valuationCap: 0,
  discountPct: 0,
  cashOnHand: 0,
  monthlyBurn: 0,
  closeDate: '',
  updatedAt: '2026-11-07',
  ...over,
});
const milestone = (title: string, status: string, targetDate = '2026-12-01') => ({ id: title, title, status, targetDate }) as unknown as Milestone;
const NOW = new Date(2026, 10, 7);

describe('the investor update draft', () => {
  it('states the round from the stored numbers', () => {
    const text = draftInvestorUpdate({ venture: 'Harbor', round: round({ targetAmount: 750000, committedAmount: 350000, cashOnHand: 120000, monthlyBurn: 10000 }), milestones: [], lang: 'en', now: NOW });
    expect(text).toContain('Committed: €350,000 of €750,000');
    expect(text).toContain('about 12 months');
  });

  it('leaves out what has no data, rather than inventing it', () => {
    const text = draftInvestorUpdate({ venture: 'Harbor', round: round(), milestones: [], lang: 'en', now: NOW });
    expect(text).not.toMatch(/Committed|Runway|Target close|What we finished|What is next/);
    expect(text).not.toContain('€');
  });

  it('splits what is done from what is next, soonest first', () => {
    const text = draftInvestorUpdate({
      venture: 'Harbor',
      round: round(),
      milestones: [milestone('Later', 'Planned', '2027-03-01'), milestone('Sooner', 'In Progress', '2026-12-01'), milestone('Shipped', 'Completed')],
      lang: 'en',
      now: NOW,
    });
    expect(text.indexOf('Shipped')).toBeLessThan(text.indexOf('What is next'));
    expect(text.indexOf('Sooner')).toBeLessThan(text.indexOf('Later'));
  });

  it('writes in Greek when asked', () => {
    const text = draftInvestorUpdate({ venture: 'Harbor', round: round({ targetAmount: 100, committedAmount: 50 }), milestones: [], lang: 'el', now: NOW });
    expect(text).toContain('Ενημέρωση επενδυτών');
    expect(text).toContain('Δεσμεύσεις');
  });
});
