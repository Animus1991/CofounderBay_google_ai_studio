import { describe, expect, it } from 'vitest';
import { parseTime } from './assistantTime';
import { fold } from './assistantText';

describe('parseTime', () => {
  const t = (s: string) => parseTime(fold(s));

  it('parses EN suffixes', () => {
    expect(t('meet at 3pm')).toMatchObject({ hours: 15, minutes: 0 });
    expect(t('meet at 3:30pm')).toMatchObject({ hours: 15, minutes: 30 });
    expect(t('meet at 10am')).toMatchObject({ hours: 10, minutes: 0 });
    expect(t('meet at 3 pm')).toMatchObject({ hours: 15, minutes: 0 });
  });

  it('parses 24h notation', () => {
    expect(t('meet at 15:00')).toMatchObject({ hours: 15, minutes: 0 });
    expect(t('meet at 15.30')).toMatchObject({ hours: 15, minutes: 30 });
  });

  it('parses bare hours with business reading', () => {
    expect(t('meet at 3')).toMatchObject({ hours: 15, minutes: 0 });
    expect(t('meet at 10')).toMatchObject({ hours: 10, minutes: 0 });
  });

  it('parses EL forms', () => {
    expect(t('στις 3')).toMatchObject({ hours: 15, minutes: 0 });
    expect(t('στις 15:30')).toMatchObject({ hours: 15, minutes: 30 });
    expect(t('3μμ')).toMatchObject({ hours: 15, minutes: 0 });
    expect(t('3 μ.μ.')).toMatchObject({ hours: 15, minutes: 0 });
    expect(t('10πμ')).toMatchObject({ hours: 10, minutes: 0 });
    expect(t('10 π.μ.')).toMatchObject({ hours: 10, minutes: 0 });
  });

  it('rejects dates and amounts', () => {
    expect(t('on 14/11')).toBeNull();
    expect(t('on 2026-11-05')).toBeNull();
    expect(t('raise $500k')).toBeNull();
    expect(t('in 3 days')).toBeNull();
    expect(t('meeting with no time')).toBeNull();
  });
});
