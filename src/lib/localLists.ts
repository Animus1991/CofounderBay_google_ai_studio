/**
 * Lists the studio keeps in this browser, one set per account.
 *
 * Every write announces itself with a `cfb:data` event, so a page, the
 * assistant panel and the notification badge all see the same change at
 * once. The demo account uses the original unscoped keys; a signed-in
 * account gets `key@uid`, so demo data never shows up in a real account.
 */
import type { Milestone } from '../types';
import { findCast } from '../data/cast';
import { seedMilestones } from '../data/seeds';

const CHANGE_EVENT = 'cfb:data';
const ALL = '*';

let scope = '';
const memory = new Map<string, string>();

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

function readJson<T>(key: string, fallback: T): T {
  const storageKey = keyFor(key);
  try {
    const raw = (typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null) ?? memory.get(storageKey);
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
  try {
    localStorage.setItem(storageKey, serialized);
  } catch {
    /* storage full or blocked: the in-memory view still updates */
  }
  emit(key);
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
} as const;

/** Removes every list of the current account, then lets pages re-seed. */
export function resetAllLists() {
  for (const key of Object.values(keys)) {
    const storageKey = keyFor(key);
    memory.delete(storageKey);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
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

export type MatchFilters = {
  q: string;
  role: string;
  stage: string;
  commitment: string;
  location: string;
  skill: string;
};

export const emptyMatchFilters = (): MatchFilters => ({ q: '', role: '', stage: '', commitment: '', location: '', skill: '' });

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

export type ConnectionRequest = SavedProfile & { status: string; sentAt?: string; message?: string };

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

// ── Calendar sessions ──────────────────────────────────────────────────────

export type StudioSession = {
  id: string;
  title: string;
  type: 'Meeting' | 'Deadline' | 'Event' | 'Mentorship';
  /** ISO date-time when known; older entries may hold free text such as "TBD". */
  time: string;
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

export type RoomFile = { name: string; size: string; views: number; updated: string };

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
};

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
  | 'settings';

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

export type AssistantTurn = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  href?: string;
  at: string;
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
  };
  const next = [...readAssistant(), entry].slice(-80);
  writeJson(keys.assistant, next);
  return next;
}

export function clearAssistant(): AssistantTurn[] {
  writeJson(keys.assistant, []);
  return [];
}
