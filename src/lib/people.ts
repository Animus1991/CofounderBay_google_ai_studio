/** People the studio shows on cards. Opening a profile uses the cast, then anything remembered from a click. */
import { CAST, castId, findCast, placeOf, type CastMember } from '../data/cast';
import { dataScope, keys } from './localLists';

export type PersonCard = {
  id: string;
  fullName: string;
  headline: string;
  headlineEl?: string;
  location: string;
  role: string;
  industry: string;
  bio: string;
  bioEl?: string;
  skills?: string[];
  lookingFor?: string[];
  stage?: string;
  commitment?: string;
};

const KEY = keys.openedPeople;

/** One remembered-people map per account, so a signed-in account never sees the demo's or another account's names. */
function storeKey(): string {
  const scope = dataScope();
  return scope ? `${KEY}@${scope}` : KEY;
}

export function cardFromCast(person: CastMember): PersonCard {
  return {
    id: person.id,
    fullName: person.fullName,
    headline: person.headline,
    headlineEl: person.headlineEl,
    location: placeOf(person),
    role: person.role,
    industry: person.industry,
    bio: person.bio,
    bioEl: person.bioEl,
    skills: person.skills,
    lookingFor: person.lookingFor,
    stage: person.stage,
    commitment: person.commitment,
  };
}

export const DIRECTORY: PersonCard[] = CAST.map(cardFromCast);

export function rememberPerson(person: Partial<PersonCard> & { id: string; fullName: string }) {
  if (findCast(person.id)) return;
  const card: PersonCard = {
    id: person.id,
    fullName: person.fullName,
    headline: person.headline || person.role || 'Founder',
    location: person.location || '',
    role: person.role || 'Founder',
    industry: person.industry || '',
    bio: person.bio || '',
  };
  try {
    const raw = localStorage.getItem(storeKey());
    const all = raw ? JSON.parse(raw) as Record<string, PersonCard> : {};
    all[card.id] = card;
    localStorage.setItem(storeKey(), JSON.stringify(all));
  } catch {
    /* the profile still opens from the directory */
  }
}

export function lookupPerson(id: string): PersonCard | undefined {
  const cast = CAST.find((person) => person.id === castId(id));
  if (cast) return cardFromCast(cast);
  try {
    const raw = localStorage.getItem(storeKey());
    const all = raw ? JSON.parse(raw) as Record<string, PersonCard> : {};
    if (all[id]?.fullName) return all[id];
  } catch {
    /* nothing remembered */
  }
  return undefined;
}
