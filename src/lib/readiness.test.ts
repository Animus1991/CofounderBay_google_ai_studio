import { afterEach, describe, expect, it } from 'vitest';
import { computeReadiness, currentReadiness, demoReadiness, financeEvidence, pitchEvidence, readinessStatus, READINESS_DIMENSIONS, teamEvidence } from './readiness';
import { DEMO_VENTURE } from '../data/demoVenture';
import { keys, writeRound } from './localLists';
import { startupRecord } from './entities';

afterEach(() => {
  localStorage.clear();
});

describe('readiness index', () => {
  it('has five dimensions whose weights sum to 1, the team weighted highest', () => {
    expect(READINESS_DIMENSIONS).toHaveLength(5);
    expect(READINESS_DIMENSIONS.reduce((sum, dim) => sum + dim.weight, 0)).toBeCloseTo(1, 10);
    const top = [...READINESS_DIMENSIONS].sort((a, b) => b.weight - a.weight)[0];
    expect(top?.key).toBe('Team Composition');
  });

  it('leaves out what is unknown instead of counting it as zero', () => {
    const empty = computeReadiness({});
    expect(empty.score).toBe(0);
    expect(empty.known).toBe(0);
    expect(empty.weakest).toBeNull();
    const one = computeReadiness({ assessed: { 'Market Validation': 80 } });
    expect(one.score).toBe(80);
    expect(one.known).toBe(1);
    expect(one.coverage).toBe(0.2);
  });

  it('reads evidence from skills, the deck and the round', () => {
    expect(teamEvidence(['React', 'Sales'])).toEqual({ score: 50, covered: 2 });
    expect(teamEvidence([])).toBeNull();
    expect(pitchEvidence({ problem: 'x'.repeat(200), solution: 'short' })?.score).toBe(Math.round((1.5 / 8) * 100));
    expect(pitchEvidence({})).toBeNull();
    expect(financeEvidence({ targetAmount: 1, cashOnHand: 1, monthlyBurn: 0, valuationCap: 0 })).toEqual({ score: 50, filled: 2 });
    expect(financeEvidence({ targetAmount: 0, cashOnHand: 0, monthlyBurn: 0, valuationCap: 0 })).toBeNull();
  });

  it('averages the diagnostic with the evidence when both exist', () => {
    const result = computeReadiness({ assessed: { 'Team Composition': 100 }, skills: ['React', 'Sales'] });
    const team = result.dimensions.find((dim) => dim.key === 'Team Composition')!;
    expect(team.score).toBe(75);
    expect(team.basis).toBe('both');
    expect(team.evidence?.en).toContain('2 of 4');
  });

  it('names the weakest dimension as the next thing to work on', () => {
    const result = computeReadiness({ assessed: { 'Team Composition': 90, 'Financial Planning': 20, 'Pitch Readiness': 60 } });
    expect(result.weakest?.key).toBe('Financial Planning');
  });

  it('keeps the sample venture at its published index', () => {
    expect(demoReadiness().score).toBe(DEMO_VENTURE.readinessScore);
    expect(demoReadiness().known).toBe(5);
  });

  it('maps scores onto the same statuses everywhere', () => {
    expect(readinessStatus(null)).toBe('Planned');
    expect(readinessStatus(39)).toBe('Critical');
    expect(readinessStatus(40)).toBe('In-Progress');
    expect(readinessStatus(70)).toBe('Strong');
  });

  it('reads the stored diagnostic, deck and round for a real account', () => {
    startupRecord.write({ dimensions: { 'Product/Tech': 100 } });
    writeRound({ targetAmount: 1_000_000, cashOnHand: 200_000, monthlyBurn: 20_000, valuationCap: 8_000_000 });
    localStorage.setItem(keys.pitch, JSON.stringify({}));
    const result = currentReadiness(['Python', 'Marketing', 'Figma', 'Finance']);
    expect(result.dimensions.find((dim) => dim.key === 'Team Composition')?.score).toBe(100);
    expect(result.dimensions.find((dim) => dim.key === 'Financial Planning')?.score).toBe(100);
    expect(result.dimensions.find((dim) => dim.key === 'Product/Tech')?.score).toBe(100);
    expect(result.score).toBe(100);
  });
});
