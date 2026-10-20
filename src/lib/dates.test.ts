import { describe, expect, it } from 'vitest';
import { greetingFor } from './dates';

describe('greetingFor', () => {
  it('greets morning from 05 to 11', () => {
    expect(greetingFor(9)).toEqual({ en: 'Good morning', el: 'Καλημέρα' });
    expect(greetingFor(5).en).toBe('Good morning');
    expect(greetingFor(11).en).toBe('Good morning');
  });

  it('greets afternoon from 12 to 17', () => {
    expect(greetingFor(14)).toEqual({ en: 'Good afternoon', el: 'Καλό απόγευμα' });
    expect(greetingFor(17).en).toBe('Good afternoon');
  });

  it('greets evening from 18 through 04', () => {
    expect(greetingFor(20)).toEqual({ en: 'Good evening', el: 'Καλησπέρα' });
    expect(greetingFor(2).en).toBe('Good evening');
  });
});
