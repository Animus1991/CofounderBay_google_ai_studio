import { describe, expect, it } from 'vitest';
import { compatibility, fromCast } from './compatibility';
import { MAX_COMPARE, compareCandidates, leaderOf } from './matchCompare';

const me = { skills: ['Product', 'Design'], lookingFor: ['TypeScript', 'Sales'], industry: 'FinTech', stage: 'Pre-seed', commitment: 'Full-time', city: 'Athens', timezone: 'Europe/Athens' };
const engineer = { fullName: 'Ada Engineer', skills: ['TypeScript', 'React'], lookingFor: ['Product'], industry: 'FinTech', stage: 'Pre-seed', commitment: 'Full-time', city: 'Athens', timezone: 'Europe/Athens' };
const seller = { fullName: 'Sam Seller', skills: ['Sales'], lookingFor: ['Design'], industry: 'HealthTech', stage: 'Seed', commitment: 'Part-time', city: 'New York', timezone: 'America/New_York' };
const blank = { fullName: 'Nobody Known' };

describe('leaderOf', () => {
  it('names the single highest score', () => expect(leaderOf([40, 90, 70])).toBe(1));
  it('has no leader on a tie for first', () => expect(leaderOf([90, 90, 20])).toBeNull());
  it('needs two scored people', () => expect(leaderOf([80, null, null])).toBeNull());
});

describe('compareCandidates', () => {
  it('uses the Matches scorer for every number', () => {
    const result = compareCandidates(me, [engineer, seller]);
    expect(result.rows[0]?.scores).toEqual([compatibility(me, fromCast(engineer)).score, compatibility(me, fromCast(seller)).score]);
    expect(result.rows.map((row) => row.key)).toEqual(['overall', 'skills', 'market', 'stage', 'commitment', 'hours']);
  });

  it('names the overall leader and what they lead on, in both languages', () => {
    const { rows, summary } = compareCandidates(me, [engineer, seller]);
    expect(rows[0]?.leader).toBe(0);
    expect(summary.en).toMatch(/^Ada has the highest overall match at \d+%/);
    expect(summary.el).toMatch(/^Ada: η υψηλότερη συνολική αντιστοίχιση, \d+%/);
  });

  it('keeps at most three people and asks for two', () => {
    expect(compareCandidates(me, [engineer, seller, blank, engineer]).columns).toHaveLength(MAX_COMPARE);
    expect(compareCandidates(me, [engineer]).summary.en).toBe('Pick at least two people to compare.');
  });

  it('does not invent a leader for a dimension without data', () => {
    const { rows } = compareCandidates(me, [blank, { ...blank, fullName: 'Also Unknown' }]);
    expect(rows.every((row) => row.leader === null)).toBe(true);
  });
});
