import { describe, expect, it } from 'vitest';
import { firstMessage } from './firstMessage';

describe('firstMessage', () => {
  it('builds an English draft only from supplied match data', () => {
    const text = firstMessage({
      theirFirstName: 'Sarah',
      viewerFirstName: 'Alex',
      score: 72,
      coveredSkills: ['Sales', 'Growth', 'Extra'],
      sameStage: 'Idea',
      talk: 'a repeatable sales motion',
    }, 'en');
    expect(text).toContain('matched us at 72%');
    expect(text).toContain('Sales and Growth');
    expect(text).toContain('Idea stage');
    expect(text).toContain('Alex');
  });

  it('uses formal, gender-neutral Greek', () => {
    const text = firstMessage({
      theirFirstName: 'Σάρα',
      score: 72,
      coveredSkills: ['Πωλήσεις'],
      sameIndustry: 'FinTech',
    }, 'el');
    expect(text).toContain('Γεια σας');
    expect(text).toContain('Φέρνετε Πωλήσεις');
    expect(text).toContain('Θα σας βόλευε');
  });

  it('has an honest minimal version without placeholder values', () => {
    const text = firstMessage({ theirFirstName: 'Sam', score: null, coveredSkills: [] }, 'en');
    expect(text).toContain('put us side by side');
    expect(text).not.toMatch(/undefined|null/i);
  });

  it('never exceeds 600 characters', () => {
    const long = 'x'.repeat(1000);
    const text = firstMessage({
      theirFirstName: long,
      viewerFirstName: long,
      score: 99,
      coveredSkills: [long, long],
      sameStage: long,
      sameIndustry: long,
      talk: long,
    }, 'en');
    expect(text.length).toBeLessThanOrEqual(600);
  });
});
