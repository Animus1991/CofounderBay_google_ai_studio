/**
 * Scan-at-a-glance status for a person card, read from fields the directory
 * already keeps (role, roles, openTo, lastActiveAt) — never inferred.
 *
 * Everyone Matches ranks is open to co-founding, so a "Looking for co-founder"
 * label on every card would say nothing. What differs is the direction: some
 * are recruiting a co-founder, others want to join a founding team. That is the
 * first thing a founder needs to know about a match. Direction comes only from
 * what the person said (openTo): a "Co-Founder Candidate" role alone does not
 * say which way — Marcus is a candidate who is recruiting a technical partner.
 */
import type { Tone } from './statusTone';
import { isOnline, type Person } from './peopleSource';

export type Bilingual = { en: string; el: string };
export type TeamIntent = 'seeking' | 'joining';

export const TEAM_INTENT: Record<TeamIntent, Bilingual & { tone: Tone }> = {
  seeking: { en: 'Seeking a co-founder', el: 'Ψάχνει συνιδρυτή', tone: 'success' },
  joining: { en: 'Wants to join a team', el: 'Θέλει να μπει σε ομάδα', tone: 'info' },
};

export const ONLINE_NOW: Bilingual = { en: 'Online now', el: 'Online τώρα' };

const lower = (values: readonly (string | null | undefined)[]) => values.filter(Boolean).map((value) => String(value).toLowerCase());

export function teamIntent(person: Pick<Person, 'role' | 'roles' | 'openTo'>): TeamIntent | null {
  const roles = lower([person.role, ...(person.roles ?? [])]);
  const openTo = person.openTo ?? [];
  if (openTo.includes('joinTeam') && !openTo.includes('cofounder')) return 'joining';
  if (openTo.includes('cofounder') || roles.includes('founder') || roles.includes('co-founder candidate')) return 'seeking';
  return null;
}

/** The labels a card shows, in order: direction first, then presence. */
export function cardStatus(person: Pick<Person, 'role' | 'roles' | 'openTo' | 'lastActiveAt'>, now = Date.now()): (Bilingual & { tone: Tone })[] {
  const out: (Bilingual & { tone: Tone })[] = [];
  const intent = teamIntent(person);
  if (intent) out.push(TEAM_INTENT[intent]);
  if (isOnline(person, now)) out.push({ ...ONLINE_NOW, tone: 'success' });
  return out;
}
