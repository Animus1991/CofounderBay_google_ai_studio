import { describe, expect, it } from 'vitest';
import { parseShareholderQuery } from './shareholderQuery';

describe('shareholder query', () => {
  it('reads a person and a share count in English and Greek, keeping the name as written', () => {
    expect(parseShareholderQuery('Add Maria Papadopoulou as a shareholder with 500k shares')).toEqual({ name: 'Maria Papadopoulou', shares: 500_000 });
    expect(parseShareholderQuery('add a shareholder named Nikos with 250,000 shares')).toEqual({ name: 'Nikos', shares: 250_000 });
    expect(parseShareholderQuery('Add Early Angel to the cap table with 1.2M shares')).toEqual({ name: 'Early Angel', shares: 1_200_000 });
    expect(parseShareholderQuery('Πρόσθεσε μέτοχο τη Μαρία με 500 χιλ. μετοχές')).toEqual({ name: 'Μαρία', shares: 500_000 });
  });

  it('reads an option pool', () => {
    expect(parseShareholderQuery('Add an option pool of 1M shares')).toEqual({ name: 'Option pool', shares: 1_000_000, kind: 'pool' });
  });

  it('leaves other sentences alone', () => {
    expect(parseShareholderQuery('Add a task to review the shareholder agreement')).toBeNull();
    expect(parseShareholderQuery('Model raising 2M at 8M pre-money')).toBeNull();
    expect(parseShareholderQuery('Share the data room with Sequoia')).toBeNull();
  });
});
