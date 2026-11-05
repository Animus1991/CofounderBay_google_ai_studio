import { describe, expect, it } from 'vitest';
import { demoPipeline, nextStepIn } from './demoCatalog';

describe('sample next steps in the reader’s language', () => {
  it('shows an untouched sample step in either language, whichever it was stored in', () => {
    expect(nextStepIn('Follow up on the intro', 'el')).toBe('Κάνε follow-up στη γνωριμία');
    expect(nextStepIn('Κάνε follow-up στη γνωριμία', 'en')).toBe('Follow up on the intro');
    expect(nextStepIn('Follow up on the intro', 'en')).toBe('Follow up on the intro');
  });

  it('never rewrites what the founder typed', () => {
    expect(nextStepIn('Send Maria the deck', 'el')).toBe('Send Maria the deck');
    expect(nextStepIn(undefined, 'en')).toBe('');
  });

  it('every stored sample row maps both ways', () => {
    for (const row of demoPipeline('en')) {
      const greek = nextStepIn(row.nextStep, 'el');
      expect(greek).not.toBe(row.nextStep);
      expect(nextStepIn(greek, 'en')).toBe(row.nextStep);
    }
  });
});
