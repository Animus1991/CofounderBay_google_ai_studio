import { describe, expect, it } from 'vitest';
import { parseRoundQuery } from './roundQuery';
import { fold } from '../services/assistantText';

const parse = (text: string) => parseRoundQuery(fold(text));

describe('round query', () => {
  it('reads new money, pre-money and the pool in English', () => {
    expect(parse('Model raising 2M at 8M pre-money')).toEqual({ investment: 2_000_000, preMoney: 8_000_000, poolPct: null, fromPost: false });
    expect(parse('What if we raise $1.5M at a $10M pre with a 15% pool?')).toEqual({ investment: 1_500_000, preMoney: 10_000_000, poolPct: 15, fromPost: false });
    expect(parse('model a seed round of 750k at a valuation of 4m, option pool 12%')).toEqual({ investment: 750_000, preMoney: 4_000_000, poolPct: 12, fromPost: false });
    expect(parse('Model raising $2000000 at $8000000 pre-money with a 15% pool')).toMatchObject({ investment: 2_000_000, preMoney: 8_000_000, poolPct: 15 });
  });

  it('turns a post-money figure into pre-money', () => {
    expect(parse('raise 2m at 10m post')).toEqual({ investment: 2_000_000, preMoney: 8_000_000, poolPct: null, fromPost: true });
  });

  it('reads Greek, with a decimal comma and Greek units', () => {
    expect(parse('Μοντελοποίησε γύρο 2M σε 8M pre-money, pool 10%')).toEqual({ investment: 2_000_000, preMoney: 8_000_000, poolPct: 10, fromPost: false });
    expect(parse('Αν αντλήσουμε 1,5 εκατ. με αποτίμηση 6 εκατ.')).toMatchObject({ investment: 1_500_000, preMoney: 6_000_000 });
  });

  it('leaves SAFE caps, round edits and non-round text to their own routes', () => {
    expect(parse('Set the round cap to 10M')).toBeNull();
    expect(parse('raise 500k on a SAFE at a 10M cap')).toBeNull();
    expect(parse('set the target to 1M and committed to 400k')).toBeNull();
    expect(parse('move the 10am meeting to Friday')).toBeNull();
    // A post-money below the new money is not a round.
    expect(parse('raise 5m at 4m post')).toBeNull();
  });
});
