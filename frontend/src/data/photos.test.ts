import { describe, expect, it } from 'vitest';
import { CAST, avatarFor } from './cast';
import { coverFor, MEN_IDS, photoThemeOf, portraitFor, WOMEN_IDS } from './photos';

const idOf = (url: string) => url.match(/photo-([0-9a-f-]+)\?/)?.[1] ?? '';

describe('portraits', () => {
 it('gives every cast member a non-empty, distinct face', () => {
  const urls = CAST.map((member) => avatarFor(member.id));
  urls.forEach((url) => expect(url).toContain('images.unsplash.com/photo-'));
  expect(new Set(urls).size).toBe(CAST.length);
 });

 it('returns initials for names without a gender and for non-person names', () => {
  expect(portraitFor('org-1', 'Aegean Venture Lab')).toBe('');
  expect(portraitFor('p-chris', 'Chris M.')).toBe('');
 });

 it('picks a women-pool face for a Greek female name, deterministically', () => {
  const a = portraitFor('p-kat', 'Κατερίνα Νικολάου');
  expect(WOMEN_IDS).toContain(idOf(a));
  expect(MEN_IDS).toContain(idOf(portraitFor('p-kostas', 'Κώστας Παπαδόπουλος')));
  expect(a).toBe(portraitFor('p-kat', 'Κατερίνα Νικολάου'));
 });

 it('never gives a non-cast person a face a cast member already owns', () => {
  const castIds = new Set(CAST.map((member) => idOf(avatarFor(member.id))));
  const candidates = ['Κατερίνα Νικολάου', 'Κώστας Παπαδόπουλος', 'Maria Test', 'Nikos Demos', 'Sofia Georgiou', 'Petros Kalos'];
  candidates.forEach((name, n) => {
   const url = portraitFor(`other-${n}`, name);
   if (url) expect(castIds.has(idOf(url))).toBe(false);
  });
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
