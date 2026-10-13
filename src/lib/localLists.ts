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
const FILTER_KEY = 'cfb.discoveryFilters';
const WATCH_KEY = 'cfb.investorWatch';
const FOLLOW_KEY = 'cfb.follows';
const REQUEST_KEY = 'cfb.connectionRequests';
const TRACKED_KEY = 'cfb.trackedApplications';
const SESSION_KEY = 'cfb.sessions';
const ROOM_KEY = 'cfb.dataRoom';
const NOTE_KEY = 'cfb.notificationPrefs';
const MENTOR_KEY = 'cfb.savedMentors';

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

export const listKeys = {
  watch: WATCH_KEY,
  follow: FOLLOW_KEY,
  mentors: MENTOR_KEY,
};

export type DiscoveryFilters = {
  q: string;
  skills: string[];
  industries: string[];
  stages: string[];
  locations: string[];
};

const emptyFilters = (): DiscoveryFilters => ({ q: '', skills: [], industries: [], stages: [], locations: [] });

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

export function readDiscoveryFilters(): DiscoveryFilters {
  const stored = readJson<Partial<DiscoveryFilters> | null>(FILTER_KEY, null);
  if (!stored) return emptyFilters();
  return {
    q: typeof stored.q === 'string' ? stored.q : '',
    skills: asStrings(stored.skills),
    industries: asStrings(stored.industries),
    stages: asStrings(stored.stages),
    locations: asStrings(stored.locations),
  };
}

export function writeDiscoveryFilters(filters: DiscoveryFilters) {
  localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
}

export type ConnectionRequest = SavedProfile & { status: string };

export function readRequests(): ConnectionRequest[] {
  const stored = readJson<ConnectionRequest[] | null>(REQUEST_KEY, null);
  return Array.isArray(stored) ? stored : [];
}

export function saveRequest(person: ConnectionRequest): ConnectionRequest[] {
  const next = [person, ...readRequests().filter((item) => item.id !== person.id)];
  localStorage.setItem(REQUEST_KEY, JSON.stringify(next));
  return next;
}

export type TrackedApplication = {
  id: number;
  program: string;
  type: string;
  status: string;
  deadline: string;
  decision: string;
  match: number;
  note: string;
};

export function readTracked(): TrackedApplication[] {
  const stored = readJson<TrackedApplication[] | null>(TRACKED_KEY, null);
  return Array.isArray(stored) ? stored : [];
}

export function writeTracked(items: TrackedApplication[]) {
  localStorage.setItem(TRACKED_KEY, JSON.stringify(items));
}

export function trackApplication(program: string, type: string): TrackedApplication[] {
  const item: TrackedApplication = {
    id: Date.now(),
    program,
    type,
    status: 'draft',
    deadline: '—',
    decision: '—',
    match: 0,
    note: '',
  };
  const next = [item, ...readTracked()];
  writeTracked(next);
  return next;
}

export type StudioSession = {
  id: string;
  title: string;
  type: 'Meeting' | 'Deadline' | 'Event' | 'Mentorship';
  time: string;
  duration: string;
  location: string;
  participants: string[];
  priority: 'High' | 'Medium' | 'Low';
};

export function readSessions(): StudioSession[] {
  const stored = readJson<StudioSession[] | null>(SESSION_KEY, null);
  return Array.isArray(stored) ? stored : [];
}

export function addSession(item: StudioSession): StudioSession[] {
  const next = [item, ...readSessions().filter((session) => session.id !== item.id)];
  localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  return next;
}

export type RoomFile = { name: string; size: string; views: number; updated: string };

export function readRoomFiles(): RoomFile[] {
  const stored = readJson<RoomFile[] | null>(ROOM_KEY, null);
  return Array.isArray(stored) ? stored : [];
}

export function addRoomFile(file: RoomFile): RoomFile[] {
  const next = [file, ...readRoomFiles().filter((item) => item.name !== file.name)];
  localStorage.setItem(ROOM_KEY, JSON.stringify(next));
  return next;
}

export type NotificationPrefs = { matches: boolean; messages: boolean; community: boolean; news: boolean };

const defaultNotes = (): NotificationPrefs => ({ matches: true, messages: true, community: false, news: false });

export function readNotificationPrefs(): NotificationPrefs {
  const stored = readJson<Partial<NotificationPrefs> | null>(NOTE_KEY, null);
  return { ...defaultNotes(), ...(stored ?? {}) };
}

export function writeNotificationPrefs(prefs: NotificationPrefs) {
  localStorage.setItem(NOTE_KEY, JSON.stringify(prefs));
}
