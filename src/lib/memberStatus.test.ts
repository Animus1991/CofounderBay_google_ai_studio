import { describe, expect, it } from 'vitest';
import { cardStatus, teamIntent } from './memberStatus';

const base = { role: 'Founder', roles: [] as string[], openTo: [] as string[], lastActiveAt: null as number | null };

describe('teamIntent', () => {
  it('takes the direction from what the person said, not from the role alone', () => {
    expect(teamIntent(base)).toBe('seeking');
    expect(teamIntent({ ...base, role: 'Co-Founder Candidate', openTo: ['cofounder'] })).toBe('seeking');
    expect(teamIntent({ ...base, role: 'Co-Founder Candidate', openTo: ['joinTeam'] })).toBe('joining');
    expect(teamIntent({ ...base, role: 'Engineer', openTo: ['joinTeam', 'cofounder'] })).toBe('seeking');
  });
  it('says nothing when the fields say nothing', () => {
    expect(teamIntent({ ...base, role: 'Mentor', openTo: ['mentoring'] })).toBeNull();
  });
});

describe('cardStatus', () => {
  it('adds presence only when the person was active in the last five minutes', () => {
    const now = 1_000_000_000;
    expect(cardStatus({ ...base, lastActiveAt: now - 60_000 }, now).map((s) => s.en)).toEqual(['Seeking a co-founder', 'Online now']);
    expect(cardStatus({ ...base, lastActiveAt: now - 3_600_000 }, now).map((s) => s.el)).toEqual(['Ψάχνει συνιδρυτή']);
  });
});
