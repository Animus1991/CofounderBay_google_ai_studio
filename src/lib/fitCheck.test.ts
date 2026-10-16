import { describe, expect, it } from 'vitest';
import { scoreFit } from './fitCheck';

describe('scoreFit', () => {
  it('names a builder seeking GTM from the matching fields', () => {
    const result = scoreFit({
      roleCover: 'builder',
      stage: 'Pre-seed',
      commitment: 'Full-time',
      lookingFor: ['Sales', 'Growth', 'Partnerships'],
      hours: 'overlap',
    }, 'gtm');
    expect(result.archetype.en).toMatch(/go-to-market/i);
    expect(result.why.en).toMatch(/looking-for/);
    expect(result.why.en).toMatch(/Pre-seed/);
  });
});
