import { describe, expect, it } from 'vitest';
import { perkDollarTotal } from './perks';

describe('perkDollarTotal', () => {
  it('sums dollar values into a $Xk+ figure', () => {
    expect(perkDollarTotal([
      { value: '$100,000 in credits' },
      { value: '$20,000' },
      { value: '$200,000 bonus' },
      { value: '$500' },
    ])).toBe('$320k+');
  });
});
