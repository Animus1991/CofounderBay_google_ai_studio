import { describe, expect, it } from 'vitest';
import { CAST, findCast } from '../data/cast';
import { compatibility, fromCast, fromProfile, rankPeople } from './compatibility';

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
});
