import { describe, expect, it } from 'vitest';
import { explainMatch } from './matchReason';

describe('explainMatch', () => {
  it('scores a shared React skill and Fintech industry at 67', () => {
    // Viewer also lists Node, so the overlap is 2 of 3: (1 skill + 1 industry) / 3.
    const result = explainMatch(
      [{ name: 'React' }, 'Node'],
      { name: 'Fintech' },
      [' react '],
      'fintech',
    );
    expect(result.pct).toBe(67);
    expect(result.reasonPhrase).toBe('Same skills, Same industry');
  });

  it('returns null when neither side has a skill or an industry', () => {
    const result = explainMatch(undefined, null, [], undefined);
    expect(result.pct).toBeNull();
    expect(result.reasonPhrase).toBeNull();
  });

  it('returns 0 and no phrase when skills and industries differ', () => {
    const result = explainMatch(['React'], 'Fintech', ['Python'], 'Health');
    expect(result.pct).toBe(0);
    expect(result.reasonPhrase).toBeNull();
  });
});
