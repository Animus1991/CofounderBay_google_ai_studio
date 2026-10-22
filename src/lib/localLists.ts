/**
 * Lists the studio keeps in this browser, one set per account.
 *
 * Every write announces itself with a `cfb:data` event, so a page, the
 * assistant panel and the notification badge all see the same change at
 * once. The demo account uses the original unscoped keys; a signed-in
 * account gets `key@uid`, so demo data never shows up in a real account.
 */
import type { Milestone, UserProfile } from '../types';
import { findCast } from '../data/cast';
import { seedMilestones } from '../data/seeds';
import { recordLocalSave } from './saveFeedback';

const CHANGE_EVENT = 'cfb:data';
const ALL = '*';

let scope = '';
const memory = new Map<string, string>();
const volatileKeys = new Set<string>();

/** '' for the demo and signed-out state, otherwise the account id. */
export function dataScope(): string {
  return scope;
}

export function setDataScope(accountId: string | null | undefined) {
  const next = accountId && accountId !== 'demo-user' ? accountId : '';
  if (next === scope) return;
  scope = next;
  // Listeners re-read on the next tick, never while React is rendering.
  queueMicrotask(() => emit(ALL));
}

function isDemo(): boolean {
  try {
    return scope === '' && localStorage.getItem('demo_mode') === 'true';
  } catch {
    return false;
  }
}

function keyFor(key: string): string {
  return scope ? `${key}@${scope}` : key;
}

/** Physical storage key for `key` under the current account scope — keeps account data from leaking between accounts on one browser. */
export function scopedKey(key: string): string {
  return keyFor(key);
}

function emit(key: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<string>(CHANGE_EVENT, { detail: key }));
}

/** Calls `listener` with the base key that changed, or '*' for everything. */
export function onDataChange(listener: (key: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onLocal = (event: Event) => listener((event as CustomEvent<string>).detail || ALL);
  const onStorage = (event: StorageEvent) => {
    if (!event.key) return listener(ALL);
    if (event.key.startsWith('cfb.')) listener(event.key.split('@')[0] ?? ALL);
  };
  window.addEventListener(CHANGE_EVENT, onLocal);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onLocal);
    window.removeEventListener('storage', onStorage);
  };
}

/** True while the sample account is open (no real account in scope). */
export function isDemoData(): boolean {
  return isDemo();
}

type WriteObserver = (key: string, serialized: string | null) => void;
let writeObserver: WriteObserver | null = null;

/** Cloud sync listens here: every local write of the signed-in account is mirrored to Firestore. */
export function setWriteObserver(observer: WriteObserver | null) {
  writeObserver = observer;
}

/** The stored JSON for `key` in the current scope, or null. */
export function readRawValue(key: string): string | null {
  const storageKey = keyFor(key);
  if (volatileKeys.has(storageKey)) return memory.get(storageKey) ?? null;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null;
    if (raw != null) return raw;
  } catch {
    /* fall through to memory */
  }
  return memory.get(storageKey) ?? null;
}

/** Applies a value that came from the cloud. It updates every page but is not sent back. */
export function applyRemoteValue(key: string, serialized: string | null) {
  const storageKey = keyFor(key);
  let durable = true;
  if (serialized == null) {
    memory.delete(storageKey);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      durable = false;
    }
  } else {
    memory.set(storageKey, serialized);
    try {
      localStorage.setItem(storageKey, serialized);
    } catch {
      durable = false;
    }
  }
  if (durable) volatileKeys.delete(storageKey);
  else volatileKeys.add(storageKey);
  recordLocalSave(storageKey, serialized, durable);
  emit(key);
}

/** Generic read for lists that have no dedicated helper. */
export function readValue<T>(key: string, fallback: T): T {
  const value = readJson<T | null>(key, null);
  if (value == null) return fallback;
  if (Array.isArray(fallback) && !Array.isArray(value)) return fallback;
  if (fallback && typeof fallback === 'object' && !Array.isArray(fallback) && (typeof value !== 'object' || Array.isArray(value))) return fallback;
  return value;
}

/** Generic write for lists that have no dedicated helper. */
export function writeValue<T>(key: string, value: T): T {
  writeJson(key, value);
  return value;
}

function readJson<T>(key: string, fallback: T): T {
  const storageKey = keyFor(key);
  try {
    const raw = volatileKeys.has(storageKey) ? memory.get(storageKey) : (typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null) ?? memory.get(storageKey);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    const cached = memory.get(storageKey);
    if (!cached) return fallback;
    try {
      return JSON.parse(cached) as T;
    } catch {
      return fallback;
    }
  }
}

function writeJson(key: string, value: unknown) {
  const storageKey = keyFor(key);
  const serialized = JSON.stringify(value);
  memory.set(storageKey, serialized);
  let durable = true;
  try {
    localStorage.setItem(storageKey, serialized);
  } catch {
    durable = false;
  }
  if (durable) volatileKeys.delete(storageKey);
  else volatileKeys.add(storageKey);
  recordLocalSave(storageKey, serialized, durable);
  emit(key);
  if (scope && writeObserver) writeObserver(key, serialized);
}

/** Captures the current value of `keys` and returns a function that puts it back. */
export function snapshot(keys: string[]): () => void {
  const saved = keys.map((key) => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(keyFor(key));
    } catch {
      raw = null;
    }
    return [key, raw] as const;
  });
  return () => {
    for (const [key, raw] of saved) {
      try {
        if (raw == null) localStorage.removeItem(keyFor(key));
        else localStorage.setItem(keyFor(key), raw);
      } catch {
        /* ignore */
      }
      emit(key);
    }
  };
}

export const keys = {
  saved: 'cfb.savedProfiles',
  registered: 'cfb.registeredEvents',
  bookmarked: 'cfb.bookmarkedEvents',
  discovery: 'cfb.discoveryFilters',
  matchFilters: 'cfb.matchFilters',
  watch: 'cfb.investorWatch',
  follow: 'cfb.follows',
  requests: 'cfb.connectionRequests',
  tracked: 'cfb.trackedApplications',
  sessions: 'cfb.sessions',
  room: 'cfb.dataRoom',
  notificationPrefs: 'cfb.notificationPrefs',
  mentors: 'cfb.savedMentors',
  milestones: 'cfb.milestones',
  round: 'cfb.round',
  communities: 'cfb.joinedCommunities',
  perks: 'cfb.claimedPerks',
  activity: 'cfb.activity',
  chat: 'cfb.chat',
  assistant: 'cfb.assistant',
  assistantFeedback: 'cfb.assistantFeedback',
  tasks: 'cfb.workspaceTasks',
  invites: 'cfb.founderInvites',
  needs: 'cfb.needCards',
  openTo: 'cfb.openTo',
  inbox: 'cfb.inbox',
  plan: 'cfb.plan',
  aiChats: 'cfb.aiChats',
  bookmarks: 'cfb.bookmarks',
  hiddenPeople: 'cfb.hiddenPeople',
  pinnedTools: 'cfb.pinnedTools',
  recentTools: 'cfb.recentTools',
  startup: 'cfb.startup',
  builder: 'cfb.builderAnswers',
  pitch: 'cfb.pitchDeck',
  diagnostic: 'cfb.diagnostic',
  canvas: 'cfb.leanCanvas',
  focus: 'cfb.focusStats',
  investors: 'cfb.investorCrm',
  dueDiligence: 'cfb.dueDiligence',
  capTable: 'cfb.capTable',
  compliance: 'cfb.compliance',
  savedPrograms: 'cfb.savedPrograms',
  savedPerks: 'cfb.savedPerks',
  readiness: 'cfb.readinessHistory',
  prefs: 'cfb.prefs',
  venture: 'cfb.ventureChecklist',
  assets: 'cfb.projectAssets',
  fitCheck: 'cfb.fitCheck',
  pinnedChats: 'cfb.pinnedChats',
  savedSearches: 'cfb.savedSearches',
  demoNotes: 'cfb.demoNotifications',
  hiddenNotes: 'cfb.hiddenNotifications',
  builderInputs: 'cfb.builderInputs',
  legalChecklist: 'cfb.legalChecklist',
  blockedPeople: 'cfb.blockedPeople',
  openedPeople: 'cfb.openedPeople',
  calendarBriefing: 'cfb.calendarBriefing',
  accountForm: 'cfb.accountForm',
  accountSwitches: 'cfb.accountSwitches',
  paymentCards: 'cfb.paymentCards',
  profileLocal: 'cfb.profileLocal',
} as const;

/** Removes every list of the current account, then lets pages re-seed. */
export function resetAllLists() {
  for (const key of Object.values(keys)) {
    const storageKey = keyFor(key);
    const had = memory.has(storageKey) || (() => {
      try {
        return localStorage.getItem(storageKey) != null;
      } catch {
        return false;
      }
    })();
    memory.delete(storageKey);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    if (had && scope && writeObserver) writeObserver(key, null);
  }
  emit(ALL);
}

// ── Saved profiles ─────────────────────────────────────────────────────────

export type SavedProfile = {
  id: string;
  fullName: string;
  role: string;
  industry: string;
  location: string;
  note: string;
};

function demoSaved(): SavedProfile[] {
  const notes: Record<string, string> = {
    'mia-kovacs': 'Potential co-founder for the B2B move',
    'david-park': 'Strong hardware background',
    'leila-hassan': 'Regulatory expertise, FDA',
  };
  return Object.entries(notes).flatMap(([id, note]) => {
    const person = findCast(id);
    return person
      ? [{ id, fullName: person.fullName, role: person.role, industry: person.industry, location: person.city, note }]
      : [];
  });
}

export function readSaved(): SavedProfile[] {
  const stored = readJson<SavedProfile[] | null>(keys.saved, null);
  if (!stored) return isDemo() ? demoSaved() : [];
  return Array.isArray(stored) ? stored : [];
}

export function saveProfile(profile: SavedProfile): SavedProfile[] {
  const next = readSaved().filter((item) => item.id !== profile.id);
  next.unshift(profile);
  writeJson(keys.saved, next);
  return next;
}

export function removeSaved(id: string): SavedProfile[] {
  const next = readSaved().filter((item) => item.id !== id);
  writeJson(keys.saved, next);
  return next;
}

// ── Id sets: registered and bookmarked events, watches, follows, mentors, communities, perks ──

export function readIds(key: string): string[] {
  const stored = readJson<string[] | null>(key, null);
  return Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : [];
}

export function toggleId(key: string, id: string): string[] {
  const current = readIds(key);
  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
  writeJson(key, next);
  return next;
}

export function setId(key: string, id: string, on: boolean): string[] {
  const current = readIds(key);
  const has = current.includes(id);
  if (has === on) return current;
  const next = on ? [...current, id] : current.filter((item) => item !== id);
  writeJson(key, next);
  return next;
}

export const eventListKeys = {
  registered: keys.registered,
  bookmarked: keys.bookmarked,
};

export const listKeys = {
  watch: keys.watch,
  follow: keys.follow,
  mentors: keys.mentors,
  communities: keys.communities,
  perks: keys.perks,
};

// ── Discovery and match filters ────────────────────────────────────────────

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
  const stored = readJson<Partial<DiscoveryFilters> | null>(keys.discovery, null);
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
  writeJson(keys.discovery, filters);
}

export type SavedSearch = DiscoveryFilters & { id: string; label: string; at: string };

export function readSavedSearches(): SavedSearch[] {
  const stored = readJson<SavedSearch[] | null>(keys.savedSearches, null);
  return Array.isArray(stored) ? stored : [];
}

export function addSavedSearch(filters: DiscoveryFilters, label: string): SavedSearch {
  const item: SavedSearch = {
    ...filters,
    id: `search-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label,
    at: new Date().toISOString(),
  };
  writeJson(keys.savedSearches, [item, ...readSavedSearches()].slice(0, 12));
  return item;
}

export function removeSavedSearch(id: string): SavedSearch[] {
  const next = readSavedSearches().filter((item) => item.id !== id);
  writeJson(keys.savedSearches, next);
  return next;
}

export type MatchFilters = {
  q: string;
  role: string;
  stage: string;
  commitment: string;
  location: string;
  skill: string;
  industry: string;
};

export const emptyMatchFilters = (): MatchFilters => ({ q: '', role: '', stage: '', commitment: '', location: '', skill: '', industry: '' });

export function readMatchFilters(): MatchFilters {
  const stored = readJson<Partial<MatchFilters> | null>(keys.matchFilters, null);
  const base = emptyMatchFilters();
  if (!stored) return base;
  for (const field of Object.keys(base) as (keyof MatchFilters)[]) {
    const value = stored[field];
    if (typeof value === 'string') base[field] = value;
  }
  return base;
}

export function writeMatchFilters(filters: MatchFilters) {
  writeJson(keys.matchFilters, filters);
}

// ── Connection requests ────────────────────────────────────────────────────

export type ConnectionRequest = SavedProfile & { status: 'pending' | 'accepted' | 'declined'; sentAt?: string; message?: string };

export function readRequests(): ConnectionRequest[] {
  const stored = readJson<ConnectionRequest[] | null>(keys.requests, null);
  return Array.isArray(stored) ? stored : [];
}

export function saveRequest(person: ConnectionRequest): ConnectionRequest[] {
  const next = [{ sentAt: new Date().toISOString(), ...person }, ...readRequests().filter((item) => item.id !== person.id)];
  writeJson(keys.requests, next);
  return next;
}

export function removeRequest(id: string): ConnectionRequest[] {
  const next = readRequests().filter((item) => item.id !== id);
  writeJson(keys.requests, next);
  return next;
}

// ── Tracked applications (programs, accelerators, grants) ──────────────────

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
  const stored = readJson<TrackedApplication[] | null>(keys.tracked, null);
  return Array.isArray(stored) ? stored : [];
}

export function writeTracked(items: TrackedApplication[]) {
  writeJson(keys.tracked, items);
}

export function trackApplication(program: string, type: string, deadline = '—'): TrackedApplication[] {
  const existing = readTracked();
  if (existing.some((item) => item.program.toLowerCase() === program.toLowerCase())) return existing;
  const item: TrackedApplication = {
    id: Date.now(),
    program,
    type,
    status: 'draft',
    deadline,
    decision: '—',
    match: 0,
    note: '',
  };
  const next = [item, ...existing];
  writeTracked(next);
  return next;
}

export function untrackApplication(program: string): TrackedApplication[] {
  const next = readTracked().filter((item) => item.program.toLowerCase() !== program.toLowerCase());
  writeTracked(next);
  return next;
}

// ── Workspace tasks (same list the Venture Builder board and the assistant use) ──

export type StudioTask = {
  id: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Todo' | 'In Progress' | 'Review' | 'Done';
  deadline: string;
  timeTracked: number;
  estimatedTime: number;
  tags: string[];
};

const seedTasks = (): StudioTask[] => [
  { id: '1', title: 'Refine User Personas', priority: 'High', status: 'Todo', deadline: '2d left', timeTracked: 120, estimatedTime: 180, tags: ['Product', 'Research'] },
  { id: '2', title: 'Landing Page Copywriting', priority: 'Medium', status: 'In Progress', deadline: 'Today', timeTracked: 90, estimatedTime: 120, tags: ['Marketing'] },
  { id: '3', title: 'Competitor Analysis', priority: 'Low', status: 'Review', deadline: 'Tomorrow', timeTracked: 240, estimatedTime: 300, tags: ['Strategy'] },
  { id: '4', title: 'Setup Analytics Pipeline', priority: 'High', status: 'Todo', deadline: '5d left', timeTracked: 0, estimatedTime: 480, tags: ['Tech', 'Data'] },
  { id: '5', title: 'Pitch Deck Revision', priority: 'High', status: 'In Progress', deadline: '3d left', timeTracked: 180, estimatedTime: 240, tags: ['Fundraising'] },
  { id: '6', title: 'Customer Interviews', priority: 'Medium', status: 'Done', deadline: 'Done', timeTracked: 360, estimatedTime: 360, tags: ['Research', 'Product'] },
];

export function readTasks(): StudioTask[] {
  const stored = readJson<StudioTask[] | null>(keys.tasks, null);
  if (!stored) return isDemo() ? seedTasks() : [];
  return Array.isArray(stored) ? stored : (isDemo() ? seedTasks() : []);
}

export function writeTasks(items: StudioTask[]): StudioTask[] {
  writeJson(keys.tasks, items);
  return items;
}

export type FounderInvite = {
  id: string;
  note: string;
  href: string;
  at: string;
};

export function readInvites(): FounderInvite[] {
  const stored = readJson<FounderInvite[] | null>(keys.invites, null);
  return Array.isArray(stored) ? stored : [];
}

export function writeInvites(items: FounderInvite[]): FounderInvite[] {
  writeJson(keys.invites, items);
  return items;
}

export function seedFounderInvites(count = 3): FounderInvite[] {
  const href = typeof window !== 'undefined' ? `${window.location.origin}/quiz` : '/quiz';
  const seeded: FounderInvite[] = Array.from({ length: count }, (_, index) => ({
    id: `inv-${Date.now()}-${index}`,
    note: `Invite ${index + 1} of ${count}`,
    href,
    at: new Date().toISOString(),
  }));
  writeInvites([...seeded, ...readInvites()].slice(0, 12));
  return seeded;
}

export function addStudioTask(title: string): StudioTask {
  const task: StudioTask = {
    id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: title.trim() || 'New task',
    priority: 'Medium',
    status: 'Todo',
    deadline: 'New',
    timeTracked: 0,
    estimatedTime: 60,
    tags: [],
  };
  writeTasks([task, ...readTasks().filter((item) => item.id !== task.id)]);
  return task;
}

export function removeStudioTask(id: string): StudioTask[] {
  return writeTasks(readTasks().filter((item) => item.id !== id));
}

// ── Calendar sessions ──────────────────────────────────────────────────────

export type StudioSession = {
  id: string;
  title: string;
  type: 'Meeting' | 'Deadline' | 'Event' | 'Mentorship';
  /** ISO date-time when known; older entries may hold free text such as "TBD". */
  time: string;
  description?: string;
  duration: string;
  location: string;
  participants: string[];
  priority: 'High' | 'Medium' | 'Low';
};

export function readSessions(): StudioSession[] {
  const stored = readJson<StudioSession[] | null>(keys.sessions, null);
  return Array.isArray(stored) ? stored : [];
}

export function addSession(item: StudioSession): StudioSession[] {
  const next = [item, ...readSessions().filter((session) => session.id !== item.id)];
  writeJson(keys.sessions, next);
  return next;
}

export function removeSession(id: string): StudioSession[] {
  const next = readSessions().filter((session) => session.id !== id);
  writeJson(keys.sessions, next);
  return next;
}

// ── Data room files ────────────────────────────────────────────────────────

export type RoomFile = { name: string; size: string; views: number; updated: string; folder?: string };

export function readRoomFiles(): RoomFile[] {
  const stored = readJson<RoomFile[] | null>(keys.room, null);
  return Array.isArray(stored) ? stored : [];
}

export function addRoomFile(file: RoomFile): RoomFile[] {
  const next = [file, ...readRoomFiles().filter((item) => item.name !== file.name)];
  writeJson(keys.room, next);
  return next;
}

// ── Notification preferences ───────────────────────────────────────────────

export type NotificationPrefs = {
  matches: boolean;
  messages: boolean;
  community: boolean;
  news: boolean;
  events: boolean;
  mentors: boolean;
  fundraising: boolean;
  mentions: boolean;
};

const defaultNotes = (): NotificationPrefs => ({
  matches: true,
  messages: true,
  community: false,
  news: false,
  events: true,
  mentors: true,
  fundraising: false,
  mentions: true,
});

export function readNotificationPrefs(): NotificationPrefs {
  const stored = readJson<Partial<NotificationPrefs> | null>(keys.notificationPrefs, null);
  return { ...defaultNotes(), ...(stored ?? {}) };
}

export function writeNotificationPrefs(prefs: NotificationPrefs) {
  writeJson(keys.notificationPrefs, prefs);
}

// ── Milestones ─────────────────────────────────────────────────────────────

export function readMilestones(): Milestone[] {
  const stored = readJson<Milestone[] | null>(keys.milestones, null);
  if (!stored) return isDemo() ? seedMilestones() : [];
  return Array.isArray(stored) ? stored : [];
}

export function writeMilestones(items: Milestone[]) {
  writeJson(keys.milestones, items);
}

export function upsertMilestone(item: Milestone): Milestone[] {
  const current = readMilestones();
  const index = current.findIndex((m) => m.id === item.id);
  const next = index === -1 ? [item, ...current] : current.map((m) => (m.id === item.id ? item : m));
  writeMilestones(next);
  return next;
}

export function removeMilestone(id: string): Milestone[] {
  const next = readMilestones().filter((m) => m.id !== id);
  writeMilestones(next);
  return next;
}

/** Overdue is derived from the date, so it never goes stale in storage. */
export function effectiveStatus(item: Pick<Milestone, 'status' | 'targetDate'>, today = new Date()): Milestone['status'] {
  if (item.status === 'Completed') return 'Completed';
  const due = new Date(item.targetDate);
  if (!Number.isNaN(due.getTime())) {
    const endOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate(), 23, 59, 59);
    if (endOfDue < today) return 'Overdue';
  }
  return item.status === 'Overdue' ? 'In Progress' : item.status;
}

/** Progress follows the checklist when there is one. */
export function milestoneProgress(item: Pick<Milestone, 'progress' | 'tasks' | 'status'>): number {
  if (item.status === 'Completed') return 100;
  const tasks = item.tasks ?? [];
  if (tasks.length === 0) return Math.max(0, Math.min(100, Math.round(item.progress || 0)));
  return Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100);
}

// ── Fundraising round ──────────────────────────────────────────────────────

export type Round = {
  name: string;
  instrument: 'SAFE' | 'Priced';
  targetAmount: number;
  committedAmount: number;
  /** Post-money valuation cap for a SAFE, or post-money valuation for a priced round. */
  valuationCap: number;
  discountPct: number;
  cashOnHand: number;
  monthlyBurn: number;
  closeDate: string;
  updatedAt: string;
  /** The investor pipeline the account is actually working — persisted, never seeded for real accounts. */
  pipeline?: RoundInvestor[];
};

export type RoundInvestor = {
  investorId: string;
  name: string;
  stage: string;
  notes: string;
  updatedAt: string;
};

export const PIPELINE_STAGES = ['Identified', 'Contacted', 'Meeting', 'Due Diligence', 'Term Sheet', 'Closed', 'Passed'] as const;

export function defaultRound(): Round {
  const close = new Date();
  close.setMonth(close.getMonth() + 3);
  const demo = isDemo();
  return {
    name: 'Pre-seed',
    instrument: 'SAFE',
    targetAmount: demo ? 1_500_000 : 0,
    committedAmount: demo ? 450_000 : 0,
    valuationCap: demo ? 12_000_000 : 0,
    discountPct: demo ? 20 : 0,
    cashOnHand: demo ? 180_000 : 0,
    monthlyBurn: demo ? 22_000 : 0,
    closeDate: close.toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
  };
}

export function readRound(): Round {
  const stored = readJson<Partial<Round> | null>(keys.round, null);
  return { ...defaultRound(), ...(stored ?? {}) };
}

export function writeRound(patch: Partial<Round>): Round {
  const next = { ...readRound(), ...patch, updatedAt: new Date().toISOString() };
  writeJson(keys.round, next);
  return next;
}

/** Adds an investor to the round pipeline, or updates the entry when the id is already tracked. */
export function upsertPipelineInvestor(entry: { investorId: string; name: string; stage?: string; notes?: string }): Round {
  const round = readRound();
  const rest = (round.pipeline ?? []).filter((item) => item.investorId !== entry.investorId);
  const existing = round.pipeline?.find((item) => item.investorId === entry.investorId);
  const next: RoundInvestor[] = [
    {
      investorId: entry.investorId,
      name: entry.name,
      stage: entry.stage || existing?.stage || 'Identified',
      notes: entry.notes ?? existing?.notes ?? '',
      updatedAt: new Date().toISOString(),
    },
    ...rest,
  ];
  return writeRound({ pipeline: next });
}

export function setPipelineStage(investorId: string, stage: string, notes?: string): Round {
  const round = readRound();
  const next = (round.pipeline ?? []).map((item) =>
    item.investorId === investorId ? { ...item, stage, notes: notes ?? item.notes, updatedAt: new Date().toISOString() } : item,
  );
  return writeRound({ pipeline: next });
}

export function removePipelineInvestor(investorId: string): Round {
  const round = readRound();
  return writeRound({ pipeline: (round.pipeline ?? []).filter((item) => item.investorId !== investorId) });
}

// ── Activity: what changed, by you or by the assistant ─────────────────────

export type ActivityKind =
  | 'milestone'
  | 'session'
  | 'request'
  | 'message'
  | 'event'
  | 'community'
  | 'perk'
  | 'round'
  | 'application'
  | 'profile'
  | 'settings'
  | 'connection'
  | 'post'
  | 'tool'
  | 'task'
  | 'file';

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  titleEl?: string;
  href?: string;
  at: string;
  read: boolean;
  byAssistant?: boolean;
};

export function readActivity(): ActivityItem[] {
  const stored = readJson<ActivityItem[] | null>(keys.activity, null);
  return Array.isArray(stored) ? stored : [];
}

export function unreadActivityCount(): number {
  return readActivity().filter((item) => !item.read).length;
}

export function logActivity(item: Omit<ActivityItem, 'id' | 'at' | 'read'> & { read?: boolean }): ActivityItem[] {
  const entry: ActivityItem = { id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), read: false, ...item };
  const next = [entry, ...readActivity()].slice(0, 200);
  writeJson(keys.activity, next);
  return next;
}

export function markActivityRead(ids: string[] | 'all'): ActivityItem[] {
  const next = readActivity().map((item) => (ids === 'all' || ids.includes(item.id) ? { ...item, read: true } : item));
  writeJson(keys.activity, next);
  return next;
}

export function markActivityUnread(ids: string[]): ActivityItem[] {
  const next = readActivity().map((item) => (ids.includes(item.id) ? { ...item, read: false } : item));
  writeJson(keys.activity, next);
  return next;
}

export function clearActivity(): ActivityItem[] {
  writeJson(keys.activity, []);
  return [];
}

// ── Messages written in this browser ───────────────────────────────────────

export type StoredMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  body: string;
  createdAt: string;
  readStatus: boolean;
  isAI?: boolean;
};

export type StoredConversation = {
  id: string;
  personId: string;
  createdAt: string;
};

export type ChatStore = { conversations: StoredConversation[]; messages: StoredMessage[] };

export function readChat(): ChatStore {
  const stored = readJson<Partial<ChatStore> | null>(keys.chat, null);
  return {
    conversations: Array.isArray(stored?.conversations) ? stored.conversations : [],
    messages: Array.isArray(stored?.messages) ? stored.messages : [],
  };
}

export function appendChatMessage(message: StoredMessage): ChatStore {
  const current = readChat();
  if (current.messages.some((item) => item.id === message.id)) return current;
  const next = { ...current, messages: [...current.messages, message].slice(-500) };
  writeJson(keys.chat, next);
  return next;
}

export function ensureChatConversation(personId: string): StoredConversation {
  const current = readChat();
  const existing = current.conversations.find((item) => item.personId === personId);
  if (existing) return existing;
  const conversation: StoredConversation = { id: `conv-${personId}`, personId, createdAt: new Date().toISOString() };
  writeJson(keys.chat, { ...current, conversations: [...current.conversations, conversation] });
  return conversation;
}

// ── Studio assistant transcript ────────────────────────────────────────────

/** A list a tool read, shown under the answer. */
export type TurnSource = {
  kind: string;
  en: string;
  el: string;
  href?: string;
};

export type AssistantTurn = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  href?: string;
  tool?: string;
  at: string;
  sources?: TurnSource[];
  links?: { href: string; en: string; el: string }[];
  followUps?: { en: string; el: string }[];
};

export function readAssistant(): AssistantTurn[] {
  const stored = readJson<AssistantTurn[] | null>(keys.assistant, null);
  return Array.isArray(stored) ? stored : [];
}

export function appendAssistant(turn: Omit<AssistantTurn, 'id' | 'at'> & { id?: string; at?: string }): AssistantTurn[] {
  const entry: AssistantTurn = {
    id: turn.id || `asst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: turn.at || new Date().toISOString(),
    role: turn.role,
    text: turn.text,
    href: turn.href,
    tool: turn.tool,
    sources: turn.sources,
    links: turn.links,
    followUps: turn.followUps,
  };
  const next = [...readAssistant(), entry].slice(-80);
  writeJson(keys.assistant, next);
  return next;
}

export function updateAssistantTurn(id: string, patch: Partial<Pick<AssistantTurn, 'text' | 'href' | 'links' | 'followUps' | 'sources' | 'tool'>>): AssistantTurn[] {
  const next = readAssistant().map((item) => (item.id === id ? { ...item, ...patch } : item));
  writeJson(keys.assistant, next);
  return next;
}

export function clearAssistant(): AssistantTurn[] {
  writeJson(keys.assistant, []);
  return [];
}

export function writeAssistant(turns: AssistantTurn[]): AssistantTurn[] {
  const next = turns.slice(-80);
  writeJson(keys.assistant, next);
  return next;
}

export type AssistantFeedback = { turnId: string; value: 'up' | 'down'; at: string };

export function readAssistantFeedback(): AssistantFeedback[] {
  const stored = readJson<AssistantFeedback[] | null>(keys.assistantFeedback, null);
  return Array.isArray(stored) ? stored : [];
}

export function writeAssistantFeedback(turnId: string, value: 'up' | 'down'): AssistantFeedback[] {
  const entry: AssistantFeedback = { turnId, value, at: new Date().toISOString() };
  const next = [...readAssistantFeedback().filter((item) => item.turnId !== turnId), entry].slice(-100);
  writeJson(keys.assistantFeedback, next);
  return next;
}

/** Search bodies the Messages page already stores. */
export function searchChat(query: string): StoredMessage[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return readChat().messages.filter((item) => (item.body || '').toLowerCase().includes(needle)).slice(0, 8);
}

// ── Need cards: what exists, the outcome, who is missing ───────────────────

export type NeedField = 'exists' | 'outcome' | 'missing' | 'offer';

export type NeedHistory = {
  version: number;
  replacedAt: string;
  changed: NeedField[];
};

export type NeedCard = {
  id: string;
  exists: string;
  outcome: string;
  missing: string;
  offer?: string;
  status: 'open' | 'closed';
  at: string;
  createdAt?: string;
  version?: number;
  history?: NeedHistory[];
};

const NEED_FIELDS: NeedField[] = ['exists', 'outcome', 'missing', 'offer'];

function hydrateNeed(card: NeedCard): NeedCard {
  return {
    ...card,
    createdAt: card.createdAt ?? card.at,
    version: card.version ?? 1,
    history: card.history ?? [],
  };
}

export function readNeeds(): NeedCard[] {
  const stored = readJson<NeedCard[] | null>(keys.needs, null);
  return Array.isArray(stored) ? stored.map(hydrateNeed) : [];
}

export function writeNeeds(list: NeedCard[]): NeedCard[] {
  writeJson(keys.needs, list.slice(0, 40));
  return list;
}

export function upsertNeed(card: NeedCard): NeedCard[] {
  const previous = readNeeds().find((item) => item.id === card.id);
  const now = card.at || new Date().toISOString();
  const incoming = hydrateNeed({
    ...card,
    at: now,
    createdAt: previous?.createdAt ?? card.createdAt ?? now,
    version: previous?.version ?? card.version ?? 1,
    history: previous?.history ?? card.history ?? [],
  });
  const nextCard = previous ? versionedNeed(previous, incoming, now) : incoming;
  return writeNeeds([nextCard, ...readNeeds().filter((item) => item.id !== card.id)]);
}

function versionedNeed(previous: NeedCard, incoming: NeedCard, at: string): NeedCard {
  const changed = NEED_FIELDS.filter((field) => (incoming[field] ?? '') !== (previous[field] ?? ''));
  if (changed.length === 0) {
    return { ...previous, ...incoming, version: previous.version ?? 1, history: previous.history ?? [], createdAt: previous.createdAt ?? previous.at };
  }
  const version = (previous.version ?? 1) + 1;
  return {
    ...previous,
    ...incoming,
    version,
    createdAt: previous.createdAt ?? previous.at,
    at,
    history: [{ version: previous.version ?? 1, replacedAt: at, changed }, ...(previous.history ?? [])].slice(0, 12),
  };
}

export function editNeed(id: string, patch: Partial<Pick<NeedCard, NeedField>>): NeedCard | undefined {
  const current = readNeeds().find((item) => item.id === id);
  if (!current) return undefined;
  const next = upsertNeed({ ...current, ...patch, at: new Date().toISOString() });
  return next.find((item) => item.id === id);
}

export function closeNeed(id: string): NeedCard[] {
  return setNeedStatus(id, 'closed');
}

export function setNeedStatus(id: string, status: NeedCard['status']): NeedCard[] {
  const now = new Date().toISOString();
  return writeNeeds(readNeeds().map((item) => (item.id === id ? { ...item, status, at: now } : item)));
}

export type OpenToKind = 'cofounder' | 'investor' | 'advisor' | 'mentoring' | 'speaking';

export const OPEN_TO_KINDS: OpenToKind[] = ['cofounder', 'mentoring', 'advisor', 'investor', 'speaking'];

function isOpenToKind(item: unknown): item is OpenToKind {
  return typeof item === 'string' && (OPEN_TO_KINDS as string[]).includes(item);
}

export function readOpenTo(): OpenToKind[] {
  const stored = readJson<OpenToKind[] | null>(keys.openTo, null);
  if (Array.isArray(stored) && stored.length) {
    return stored.filter(isOpenToKind);
  }
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(scopedKey('cfb.accountSwitches')) : null;
    if (!raw) return ['cofounder', 'advisor'];
    const parsed = JSON.parse(raw) as { openToCofounder?: boolean; openToInvestors?: boolean; openToAdvisors?: boolean };
    const out: OpenToKind[] = [];
    if (parsed.openToCofounder !== false) out.push('cofounder');
    if (parsed.openToInvestors) out.push('investor');
    if (parsed.openToAdvisors) out.push('advisor');
    return out.length ? out : ['cofounder'];
  } catch {
    return ['cofounder', 'advisor'];
  }
}

export function writeOpenTo(kinds: OpenToKind[]): OpenToKind[] {
  const next = [...new Set(kinds.filter(isOpenToKind))];
  writeJson(keys.openTo, next);
  return next;
}

export type InboxStore = {
  conversations: unknown[];
  messages: unknown[];
};

export function readInbox(): InboxStore {
  const stored = readJson<Partial<InboxStore> | null>(keys.inbox, null);
  return {
    conversations: Array.isArray(stored?.conversations) ? stored.conversations : [],
    messages: Array.isArray(stored?.messages) ? stored.messages : [],
  };
}

export function writeInbox(store: InboxStore): InboxStore {
  writeJson(keys.inbox, store);
  return store;
}

export type PlanId = 'starter' | 'pro' | 'studio';

export function readPlan(): PlanId {
  const stored = readJson<PlanId | null>(keys.plan, null);
  return stored === 'pro' || stored === 'studio' || stored === 'starter' ? stored : 'starter';
}

export function writePlan(plan: PlanId): PlanId {
  writeJson(keys.plan, plan);
  return plan;
}

// ── Local profile overrides ────────────────────────────────────────────────
// The demo account has no Firestore profile, so its edits land here under the
// demo scope. Real accounts keep their profile in Firestore and this key stays
// empty (it is excluded from list sync — the profile doc is the sync target).

export function readProfileLocal(): Partial<UserProfile> {
  const stored = readJson<Partial<UserProfile> | null>(keys.profileLocal, null);
  return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
}

export function writeProfileLocal(patch: Partial<UserProfile>): Partial<UserProfile> {
  const next = { ...readProfileLocal(), ...patch };
  writeJson(keys.profileLocal, next);
  return next;
}

export function clearProfileLocal(): Partial<UserProfile> {
  writeJson(keys.profileLocal, {});
  return {};
}
