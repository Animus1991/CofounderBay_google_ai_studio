import { describe, expect, it } from 'vitest';
import { applyQualifiers, parseQualifiers } from './searchQualifiers';

describe('parseQualifiers', () => {
  it('strips English keys and quoted values', () => {
    const parsed = parseQualifiers('growth role:Founder location:"Athens, GR" skill:TypeScript leftover');
    expect(parsed.text).toBe('growth leftover');
    expect(parsed.filters).toEqual({
      role: 'Founder',
      location: 'Athens, GR',
      skill: 'TypeScript',
    });
  });

  it('accepts Greek keys on the same five fields', () => {
    const parsed = parseQualifiers('ρόλος:Mentor τόπος:"Θεσσαλονίκη" δεξιότητα:Sales κλάδος:Fintech στάδιο:Seed');
    expect(parsed.text).toBe('');
    expect(parsed.filters).toEqual({
      role: 'Mentor',
      location: 'Θεσσαλονίκη',
      skill: 'Sales',
      industry: 'Fintech',
      stage: 'Seed',
    });
  });
});

describe('applyQualifiers', () => {
  const people = [
    { role: 'Founder', location: 'Athens, Greece', skills: ['TypeScript', 'React'], industry: 'SaaS', stage: 'Seed' },
    { role: 'Mentor', location: 'Berlin', skills: ['Sales'], industry: 'Fintech', stage: 'Growth' },
  ];

  it('keeps people whose fields contain the values', () => {
    const parsed = parseQualifiers('role:Founder skill:react');
    const hits = applyQualifiers(people, parsed.filters, (person) => person);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.location).toContain('Athens');
  });
});
