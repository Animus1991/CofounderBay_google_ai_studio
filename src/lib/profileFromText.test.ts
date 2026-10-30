import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/aiService', () => ({
  AIService: {
    status: vi.fn().mockResolvedValue({ configured: true, model: 'gemini', source: 'proxy' }),
    coolingDown: false,
    extractJson: vi.fn().mockResolvedValue({ headline: 'Climate fintech builder', skills: ['React', 42, 'Sales'], industry: 'Space', location: 'Athens, Greece', stage: 'Series C' }),
  },
}));

import { extractProfile, extractProfileWithModel } from './profileFromText';

describe('profile from a free description', () => {
  it('reads skills, industry, city, years, stage and commitment in English', () => {
    const draft = extractProfile("I'm a full-stack engineer with 6 years in payments. Based in Athens. React, TypeScript and Node.js; some B2B sales. We have an MVP and I work full-time on it.");
    expect(draft.headline).toBe('Full-stack engineer with 6 years in payments');
    expect(draft.skills).toEqual(expect.arrayContaining(['React', 'TypeScript', 'Node.js', 'Sales']));
    expect(draft.industry).toBe('Finance');
    expect(draft.location).toBe('Athens, Greece');
    expect(draft.experience).toBe('6 years in payments');
    expect(draft.stage).toBe('MVP');
    expect(draft.commitment).toBe('Full-time');
  });

  it('reads Greek', () => {
    const draft = extractProfile('Είμαι μηχανικός λογισμικού στη Θεσσαλονίκη, με 8 χρόνια σε τεχνολογίες νερού. Ψάχνω συνιδρυτή για πωλήσεις. Έχουμε πρωτότυπο.');
    expect(draft.location).toBe('Thessaloniki, Greece');
    expect(draft.industry).toBe('Climate');
    expect(draft.skills).toContain('Sales');
    expect(draft.stage).toBe('MVP');
  });

  it('never invents: an unclear text leaves fields empty', () => {
    const draft = extractProfile('Looking to meet interesting people.');
    expect(draft.skills).toEqual([]);
    expect(draft.industry).toBeUndefined();
    expect(draft.location).toBeUndefined();
    expect(draft.stage).toBeUndefined();
  });

  it('keeps only model values that pass the checks, and falls back field by field', async () => {
    const { draft, by } = await extractProfileWithModel('Climate fintech builder in Athens. React and sales. Full-time.', 'en');
    expect(by).toBe('model');
    expect(draft.headline).toBe('Climate fintech builder');
    expect(draft.skills).toEqual(['React', 'Sales']);
    expect(draft.industry).toBe('Finance'); // "Space" is not an option: the offline reading stands
    expect(draft.stage).toBeUndefined(); // "Series C" is not a stage here
    expect(draft.commitment).toBe('Full-time');
  });
});
