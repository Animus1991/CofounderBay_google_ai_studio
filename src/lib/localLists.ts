/** Lists the studio already had slots for. They persist in this browser. */

export type SavedProfile = {
  id: string;
  fullName: string;
  role: string;
  industry: string;
  location: string;
  note: string;
};

const SAVED_KEY = 'cfb.savedProfiles';
const REGISTERED_KEY = 'cfb.registeredEvents';
const BOOKMARKED_KEY = 'cfb.bookmarkedEvents';

const SEED: SavedProfile[] = [
  { id: 's1', fullName: 'Mia Kovacs', role: 'FOUNDER', industry: 'EdTech', location: 'Vienna', note: 'Potential co-founder for B2B pivot' },
  { id: 's2', fullName: 'Jordan Park', role: 'MENTOR', industry: 'Deep Tech', location: 'Seoul', note: 'Strong hardware background' },
  { id: 's3', fullName: 'Leila Hassan', role: 'ADVISOR', industry: 'HealthTech', location: 'Dubai', note: 'Regulatory expertise, FDA' },
];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function readSaved(): SavedProfile[] {
  const stored = readJson<SavedProfile[] | null>(SAVED_KEY, null);
  if (!stored) {
    localStorage.setItem(SAVED_KEY, JSON.stringify(SEED));
    return SEED;
  }
  return Array.isArray(stored) ? stored : SEED;
}

export function saveProfile(profile: SavedProfile): SavedProfile[] {
  const next = readSaved().filter((item) => item.id !== profile.id);
  next.unshift(profile);
  localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  return next;
}

export function removeSaved(id: string): SavedProfile[] {
  const next = readSaved().filter((item) => item.id !== id);
  localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  return next;
}

export function readIds(key: string): string[] {
  const stored = readJson<string[] | null>(key, null);
  return Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : [];
}

export function toggleId(key: string, id: string): string[] {
  const current = readIds(key);
  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}

export const eventListKeys = {
  registered: REGISTERED_KEY,
  bookmarked: BOOKMARKED_KEY,
};
