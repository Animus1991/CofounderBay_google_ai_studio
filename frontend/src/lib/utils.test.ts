import { describe, it, expect } from 'vitest';
import { cn, formatRelativeTime } from './utils';

describe('cn (className merge)', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, null, undefined, 'c')).toBe('a c');
  });

  it('dedupes conflicting tailwind utilities (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('supports conditional object syntax', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });
});

describe('formatRelativeTime', () => {
  it('uses GitHub-style compact relative clocks', () => {
    const now = Date.parse('2026-10-16T18:00:00.000Z');
    expect(formatRelativeTime('2026-10-16T17:58:00.000Z', now)).toBe('2 min ago');
    expect(formatRelativeTime('2026-10-16T16:00:00.000Z', now)).toBe('2 hours ago');
    expect(formatRelativeTime('2026-10-15T18:00:00.000Z', now)).toBe('1 day ago');
  });
});
