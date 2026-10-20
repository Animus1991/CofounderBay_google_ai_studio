import { describe, expect, it } from 'vitest';
import { CAST, avatarFor } from './cast';
import { coverFor, photoThemeOf, portraitFor } from './photos';

describe('portraits', () => {
 it('returns no stock photo for any cast member — initials render instead', () => {
  CAST.forEach((member) => expect(avatarFor(member.id)).toBe(''));
  expect(portraitFor('sarah-chen', 'Sarah Chen')).toBe('');
  expect(portraitFor('p-kat', 'Κατερίνα Νικολάου')).toBe('');
 });
});

describe('coverFor', () => {
 it('themes covers by title words', () => {
  expect(photoThemeOf('Pitch Night')).toBe('stage');
  expect(photoThemeOf('Founders Coffee')).toBe('coffee');
  expect(photoThemeOf('Climate & Energy Program')).toBe('energy');
 });

 it('reads "shipping AI features" as AI, not logistics', () => {
  expect(photoThemeOf('Shipping AI features')).toBe('ai');
 });

 it('is deterministic for the same seed and falls back to office', () => {
  const a = coverFor('event-7', ['Quarterly sync'], 800, 400);
  expect(a).toBe(coverFor('event-7', ['Quarterly sync'], 800, 400));
  expect(photoThemeOf('xyzzy plugh')).toBeNull();
  expect(coverFor('xyzzy plugh', [])).toContain('images.unsplash.com/photo-');
 });
});
