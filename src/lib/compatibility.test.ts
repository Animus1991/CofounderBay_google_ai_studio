import { describe, expect, it } from 'vitest';
import { CAST, findCast } from '../data/cast';
import { compatibility, confidenceFor, fromCast, fromProfile, normalizeCommitment, normalizeStage, rankPeople, sharedWorkingHours, timeZoneGapHours } from './compatibility';

describe('compatibility', () => {
  it('scores complementary skills higher than identical skills when lookingFor is set', () => {
    const demo = fromProfile({
      skills: ['React', 'TypeScript', 'Node.js'],
      lookingFor: ['Sales', 'Growth', 'Fundraising'],
      interests: ['FinTech', 'SaaS', 'AI'],
      industry: 'FinTech',
      stage: 'Pre-seed',
      commitment: 'Full-time',
      location: 'Athens, Greece',
      timezone: 'Europe/Athens',
    });
    const jordan = findCast('jordan-taylor');
    const alex = findCast('alex-rivera');
    expect(jordan).toBeDefined();
    expect(alex).toBeDefined();
    const withGrowth = compatibility(demo, fromCast(jordan!));
    const withEngineer = compatibility(demo, fromCast(alex!));
    expect(withGrowth.score).not.toBeNull();
    expect(withEngineer.score).not.toBeNull();
    expect(withGrowth.score!).toBeGreaterThan(withEngineer.score!);
  });

  it('omits a dimension with no data instead of scoring it as a miss', () => {
    const result = compatibility(
      { skills: ['React'], lookingFor: ['Sales'] },
      { skills: ['Sales'], lookingFor: ['React'] },
    );
    const hours = result.dimensions.find((d) => d.key === 'hours');
    expect(hours?.score).toBeNull();
    expect(result.score).not.toBeNull();
  });

  it('ranks the shared cast so the same person is first on every page', () => {
    const me = fromProfile({
      skills: ['React', 'TypeScript'],
      lookingFor: ['Sales', 'Growth'],
      industry: 'FinTech',
      stage: 'Pre-seed',
      commitment: 'Full-time',
      location: 'Athens',
    });
    const ranked = rankPeople(me, CAST.filter((p) => p.role !== 'Mentor' && p.role !== 'Investor' && p.role !== 'Advisor'));
    expect(ranked[0]?.fit.score).not.toBeNull();
    expect(ranked[0]?.fit.score).toBeGreaterThanOrEqual(ranked[1]?.fit.score ?? 0);
  });

  it('measures time zones the short way round the clock', () => {
    // UTC+12 and UTC−11 are one hour apart, not 23.
    expect(timeZoneGapHours(12 * 60, -11 * 60)).toBe(1);
    expect(timeZoneGapHours(9 * 60, -7 * 60)).toBe(8);
    expect(sharedWorkingHours(1)).toBe(8);
    expect(sharedWorkingHours(10)).toBe(0);
    const fiji = compatibility({ timezone: 'Pacific/Fiji' }, { timezone: 'Pacific/Honolulu' });
    const hours = fiji.dimensions.find((d) => d.key === 'hours')!;
    // Fiji (UTC+12) and Honolulu (UTC−10) share most of a working day across the date line.
    expect(hours.score).toBeGreaterThanOrEqual(80);
  });

  it('understands every stored spelling of a stage and a commitment', () => {
    expect(normalizeStage('Pre-Seed (Traction)')).toBe('Pre-seed');
    expect(normalizeStage('Prototype / MVP')).toBe('Pre-seed');
    expect(normalizeStage('Seed Funded')).toBe('Seed');
    expect(normalizeStage('Series A+')).toBe('Series A');
    expect(normalizeStage('Early Traction')).toBe('Seed');
    expect(normalizeStage('Ιδέα')).toBe('Idea');
    expect(normalizeStage('something else')).toBeNull();
    expect(normalizeCommitment('Evenings & Weekends')).toBe('part');
    expect(normalizeCommitment('Part-Time (Transition to FT)')).toBe('part');
    expect(normalizeCommitment('Exploring')).toBe('exploring');
    expect(normalizeCommitment('Πλήρης απασχόληση')).toBe('full');
  });

  it('treats a Greek skill and an industry alias as the same thing', () => {
    const result = compatibility(
      { skills: ['React'], lookingFor: ['Πωλήσεις'], industry: 'Finance' },
      { skills: ['Sales'], lookingFor: ['React'], industry: 'FinTech' },
    );
    const skills = result.dimensions.find((d) => d.key === 'skills')!;
    const market = result.dimensions.find((d) => d.key === 'market')!;
    expect(skills.score).toBeGreaterThanOrEqual(80);
    expect(market.score).toBe(100);
  });

  it('reports how much of the weight the score stands on', () => {
    const thin = compatibility({ skills: ['React'] }, { skills: ['Sales'] });
    expect(thin.known).toBe(1);
    expect(thin.coverage).toBe(0.35);
    expect(thin.confidence).toBe('low');
    const full = compatibility(
      { skills: ['React'], lookingFor: ['Sales'], industry: 'AI', stage: 'Seed', commitment: 'Full-time', timezone: 'Europe/Athens' },
      { skills: ['Sales'], lookingFor: ['React'], industry: 'AI', stage: 'Seed', commitment: 'Full-time', timezone: 'Europe/Berlin' },
    );
    expect(full.known).toBe(5);
    expect(full.coverage).toBe(1);
    expect(full.confidence).toBe('high');
    expect(compatibility({}, {}).confidence).toBeNull();
    expect(confidenceFor(0.5)).toBe('medium');
  });
});
