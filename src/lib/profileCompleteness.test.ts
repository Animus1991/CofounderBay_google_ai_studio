import { describe, expect, it } from 'vitest';
import { PROFILE_FIELDS, profileCompleteness } from './profileCompleteness';

const full = {
  fullName: 'Demo User',
  bio: 'Building climate software.',
  role: 'Founder',
  industry: 'CleanTech',
  skills: ['React'],
  lookingFor: ['Sales'],
  stage: 'Pre-seed',
  commitment: 'Full-time',
  location: 'Athens',
  linkedinUrl: 'https://linkedin.com/in/demo',
};

describe('profile completeness', () => {
  it('weights sum to 100', () => {
    expect(PROFILE_FIELDS.reduce((sum, field) => sum + field.weight, 0)).toBe(100);
  });

  it('counts a LinkedIn URL as a social link (the dashboard used to miss it)', () => {
    expect(profileCompleteness(full)).toMatchObject({ score: 100, missing: [], filled: 10, total: 10 });
    expect(profileCompleteness({ ...full, linkedinUrl: '', socialLinks: { github: 'https://github.com/demo' } }).score).toBe(100);
  });

  it('lists what is missing, most valuable first', () => {
    const result = profileCompleteness({ fullName: 'A', location: 'Athens', socialLinks: {} });
    expect(result.score).toBe(20);
    expect(result.missing[0]?.weight).toBe(15);
    expect(result.missing.map((field) => field.key)).toContain('links');
  });

  it('treats blank strings and empty lists as missing', () => {
    expect(profileCompleteness({ fullName: '  ', skills: [''], roles: [] }).score).toBe(0);
    expect(profileCompleteness(null)).toMatchObject({ score: 0, filled: 0 });
  });
});
