/**
 * The people every page ranks, lists and opens.
 *
 * A real account sees the members of the platform (fed by `directory.ts` from
 * Firestore). The sample account, signed-out pages and tests see the demo cast.
 * This module has no Firebase import so pure logic (assistant, next step, tests)
 * can use it.
 */
import { CAST, avatarFor, castId, placeOf, type CastMember } from '../data/cast';
import { cityAndZone } from './compatibility';
import { dataScope } from './localLists';
import { canonicalIndustry, canonicalStage } from './taxonomy';

export type Person = {
  id: string;
  fullName: string;
  headline: string;
  headlineEl?: string;
  bio: string;
  bioEl?: string;
  /** Primary role, e.g. "Founder" or "Mentor". */
  role: string;
  roles: string[];
  industry: string;
  interests: string[];
  skills: string[];
  lookingFor: string[];
  stage: string;
  commitment: string;
  location: string;
  city: string;
  country: string;
  timezone: string;
  avatarUrl: string;
  company: string;
  website: string;
  linkedinUrl: string;
  githubUrl: string;
  availability: string;
  openTo: string[];
  expertise: string[];
  verified: boolean;
  lastActiveAt: number | null;
  createdAt: number | null;
  /** From the demo cast, never a real member. */
  sample: boolean;
  visibility: string;
  discoverable: boolean;
  messagesFrom: string;
  checkSize: string;
  achievements: string[];
  rating: number;
  reviews: number;
  email: string;
  connectionIds: string[];
};

export function personFromCast(person: CastMember): Person {
  return {
    id: person.id,
    fullName: person.fullName,
    headline: person.headline,
    headlineEl: person.headlineEl,
    bio: person.bio,
    bioEl: person.bioEl,
    role: person.role,
    roles: [person.role],
    industry: person.industry,
    interests: person.interests,
    skills: person.skills,
    lookingFor: person.lookingFor,
    stage: person.stage,
    commitment: person.commitment,
    location: placeOf(person),
    city: person.city,
    country: person.country,
    timezone: person.timezone,
    avatarUrl: avatarFor(person.id, 200),
    company: person.company || '',
    website: '',
    linkedinUrl: '',
    githubUrl: '',
    availability: person.availability || '',
    openTo: person.role === 'Mentor' || person.role === 'Advisor' ? ['mentoring', 'advisor'] : ['cofounder'],
    expertise: person.expertise || [],
    verified: true,
    lastActiveAt: null,
    createdAt: null,
    sample: true,
    visibility: 'Public',
    discoverable: true,
    messagesFrom: 'anyone',
    checkSize: person.checkSize || '',
    achievements: person.achievements || [],
    rating: person.rating || 0,
    reviews: person.reviews || 0,
    email: '',
    connectionIds: [],
  };
}

const SAMPLE: Person[] = CAST.map(personFromCast);

function strings(value: unknown, max = 30): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item : item && typeof item === 'object' && 'name' in item ? String((item as { name: unknown }).name) : ''))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

function text(value: unknown, max = 5000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function millis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === 'object' && value && 'toMillis' in value && typeof (value as { toMillis: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === 'object' && value && 'seconds' in value) {
    return Number((value as { seconds: number }).seconds) * 1000;
  }
  return null;
}

export function toMillis(value: unknown): number | null {
  return millis(value);
}

/** A Firestore `profiles/{id}` document in the shape every page uses. */
export function personFromProfile(id: string, data: Record<string, unknown>): Person {
  const location = text(data.location, 120);
  const place = cityAndZone(location);
  const roles = strings(data.roles).length ? strings(data.roles) : text(data.role) ? [text(data.role)] : ['Founder'];
  const socials = (data.socialLinks && typeof data.socialLinks === 'object' ? data.socialLinks : {}) as Record<string, unknown>;
  return {
    id,
    fullName: text(data.fullName, 100) || text(data.displayName, 100) || 'Member',
    headline: text(data.headline, 200),
    bio: text(data.bio, 2000),
    role: text(data.role) || roles[0] || 'Founder',
    roles,
    industry: canonicalIndustry(text(data.industry, 60)),
    interests: strings(data.interests),
    skills: strings(data.skills),
    lookingFor: strings(data.lookingFor),
    stage: canonicalStage(text(data.stage, 40)),
    commitment: text(data.commitment, 40),
    location,
    city: text(data.city, 80) || place.city || '',
    country: text(data.country, 80),
    timezone: text(data.timezone, 60) || place.timezone || '',
    avatarUrl: text(data.avatarUrl, 300_000) || text(data.profilePhoto, 2000) || text(data.photoURL, 2000),
    company: text(data.company, 120),
    website: text(data.website, 300) || text(socials.website, 300) || text(data.portfolioUrl, 300),
    linkedinUrl: text(data.linkedinUrl, 300) || text(socials.linkedin, 300),
    githubUrl: text(data.githubUrl, 300) || text(socials.github, 300),
    availability: text(data.availability, 40),
    openTo: strings(data.openTo),
    expertise: strings(data.expertise),
    verified: data.verificationStatus === 'Verified',
    lastActiveAt: millis(data.lastActiveAt),
    createdAt: millis(data.createdAt),
    sample: false,
    visibility: text(data.visibility, 20) || text(data.profileVisibility, 20) || 'Public',
    discoverable: data.discoverable !== false,
    messagesFrom: text(data.messagesFrom, 20) || 'anyone',
    checkSize: text(data.checkSize, 60),
    achievements: strings(data.achievements),
    rating: typeof data.rating === 'number' ? data.rating : 0,
    reviews: typeof data.reviews === 'number' ? data.reviews : 0,
    email: data.showEmail === true ? text(data.email, 200) : '',
    connectionIds: strings(data.connectionIds, 2000),
  };
}

// ── The live directory ────────────────────────────────────────────────────

let realPeople: Person[] = [];
let realLoaded = false;
const byId = new Map<string, Person>();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

/** Called by directory.ts with the members it loaded from Firestore. */
export function setRealPeople(list: Person[], loaded = true) {
  realPeople = list;
  realLoaded = loaded;
  list.forEach((person) => byId.set(person.id, person));
  notify();
}

/** Remembers one member that was opened directly (for example a hidden profile). */
export function rememberRealPerson(person: Person) {
  byId.set(person.id, person);
  notify();
}

export function clearRealPeople() {
  realPeople = [];
  realLoaded = false;
  byId.clear();
  notify();
}

export function onPeopleChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** True when a real account is open, so pages show members instead of the cast. */
export function usingRealPeople(): boolean {
  return Boolean(dataScope());
}

export function directoryLoaded(): boolean {
  return usingRealPeople() ? realLoaded : true;
}

/** Everyone who can be listed (discoverable and not hidden). Excludes nobody else; callers remove self. */
export function directoryPeople(): Person[] {
  if (!usingRealPeople()) return SAMPLE;
  return realPeople.filter((person) => person.visibility !== 'Private' && person.discoverable);
}

/** Looks a person up by id (or a demo-era id), then by name. */
export function findPerson(idOrName: string | null | undefined): Person | undefined {
  if (!idOrName) return undefined;
  if (!usingRealPeople()) {
    const id = castId(idOrName);
    const byCastId = SAMPLE.find((person) => person.id === id);
    if (byCastId) return byCastId;
  } else {
    const hit = byId.get(idOrName);
    if (hit) return hit;
  }
  const pool = usingRealPeople() ? [...byId.values()] : SAMPLE;
  const needle = idOrName.trim().toLowerCase();
  if (!needle) return undefined;
  return (
    pool.find((person) => person.fullName.toLowerCase() === needle) ??
    pool.find((person) => person.fullName.toLowerCase().split(' ')[0] === needle) ??
    (needle.length >= 4 ? pool.find((person) => person.fullName.toLowerCase().includes(needle)) : undefined)
  );
}

export function peopleWithRole(...roles: string[]): Person[] {
  const wanted = roles.map((role) => role.toLowerCase());
  return directoryPeople().filter((person) => person.roles.some((role) => wanted.includes(role.toLowerCase())) || wanted.includes(person.role.toLowerCase()));
}

/** Founders and candidates: the people co-founder matching ranks. */
export function cofounderPool(): Person[] {
  return directoryPeople().filter((person) => {
    const roles = [person.role, ...person.roles].map((role) => role.toLowerCase());
    const isBuilder = roles.some((role) => role === 'founder' || role === 'co-founder candidate');
    const openToTeam = person.openTo.includes('cofounder') || person.openTo.includes('joinTeam');
    return isBuilder || openToTeam;
  });
}

export function mentorPool(): Person[] {
  return directoryPeople().filter((person) => {
    const roles = [person.role, ...person.roles].map((role) => role.toLowerCase());
    return roles.includes('mentor') || roles.includes('advisor') || person.openTo.includes('mentoring');
  });
}

export function investorPool(): Person[] {
  return directoryPeople().filter((person) => [person.role, ...person.roles].some((role) => role.toLowerCase() === 'investor'));
}

/** The photo to show, or '' so the avatar falls back to initials. Real members never get a stock photo. */
export function avatarOf(person: Pick<Person, 'avatarUrl' | 'sample' | 'id'> | null | undefined): string {
  if (!person) return '';
  if (person.avatarUrl) return person.avatarUrl;
  return person.sample ? avatarFor(person.id, 200) : '';
}

/** Recently active: seen in the last 5 minutes. */
export function isOnline(person: Pick<Person, 'lastActiveAt'> | null | undefined, now = Date.now()): boolean {
  if (!person?.lastActiveAt) return false;
  return now - person.lastActiveAt < 5 * 60_000;
}
