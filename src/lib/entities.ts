/**
 * Entities: the account's records as typed objects — one key, one fallback,
 * one reader — shared by pages, the assistant and what the server is sent.
 * A page reads one with `useEntity()`, everything else with `.read()`; nobody
 * spells the storage key, so two screens cannot disagree about one record.
 *
 * Lists without an entity yet still go through `keys` and the helpers in
 * lib/localLists; `src/test/dataLayer.test.ts` fails on a raw "cfb." key
 * anywhere outside the storage layer.
 */
import { useStored } from './useStored';
import { isDemoData, keys, readProfileLocal, readValue, writeValue } from './localLists';
import { DEMO_VENTURE } from '../data/demoVenture';

export type Entity<T> = {
  readonly key: string;
  read(): T;
  write(next: T): T;
  update(change: (current: T) => T): T;
};

export function entity<T>(key: string, fallback: () => T, normalize: (raw: unknown) => T): Entity<T> {
  const read = () => {
    const raw = readValue<unknown>(key, null);
    return raw === null || raw === undefined ? fallback() : normalize(raw);
  };
  return {
    key,
    read,
    write: (next) => writeValue(key, next),
    update: (change) => writeValue(key, change(read())),
  };
}

/** The entity's current value, re-read whenever it changes (this page, another page, the assistant, another tab). */
export function useEntity<T>(item: Entity<T>): T {
  return useStored(item.read, [item.key]);
}

const strings = (raw: unknown): string[] => (Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : []);
const record = (raw: unknown): Record<string, unknown> => (raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {});
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

// ── The venture ─────────────────────────────────────────────────────────────
/** The founder's venture as Founder Tools edits it (name, one-liner, stage, readiness …). */
export type StartupRecord = {
  id?: string;
  name?: string;
  oneLiner?: string;
  description?: string;
  industry?: string[];
  stage?: string;
  readinessScore?: number;
  dimensions?: Record<string, number>;
  createdAt?: string;
  updatedAt?: string;
  [field: string]: unknown;
};

export const startupRecord = entity<StartupRecord>(keys.startup, () => ({}), (raw) => record(raw) as StartupRecord);

/**
 * The venture's name, the same everywhere — Founder Tools, Fundraising and its
 * due-diligence links, the weekly digest, templates and the assistant: the name
 * set in Founder Tools, else the profile's company, else the sample venture's
 * in the sample account. Empty when none is known; callers choose the wording.
 */
export function ventureName(profileCompany?: string | null): string {
  return text(startupRecord.read().name) || text(profileCompany) || text(readProfileLocal().company) || (isDemoData() ? DEMO_VENTURE.name : '');
}

/** The venture's one-liner and readiness score, with the sample venture's in the sample account. */
export function ventureSummary(): { oneLiner: string; readinessScore: number } {
  const saved = startupRecord.read();
  const demo = isDemoData();
  return {
    oneLiner: text(saved.oneLiner) || (demo ? DEMO_VENTURE.oneLiner : ''),
    readinessScore: typeof saved.readinessScore === 'number' ? saved.readinessScore : demo ? DEMO_VENTURE.readinessScore : 0,
  };
}

/** For React: the venture name, following both the venture record and the local profile. */
export function useVentureName(profileCompany?: string | null): string {
  return useStored(() => ventureName(profileCompany), [keys.startup, keys.profileLocal, `${profileCompany ?? ''}`]);
}

// ── Small id lists ──────────────────────────────────────────────────────────
export const savedPerks = entity<string[]>(keys.savedPerks, () => [], strings);
export const pinnedTools = entity<string[]>(keys.pinnedTools, () => [], strings);
export const recentTools = entity<string[]>(keys.recentTools, () => [], strings);

/** Adds the id if missing, removes it if present. */
export const toggleId = (list: Entity<string[]>, id: string) =>
  list.update((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));

/** Puts the id first, keeping the newest `max`. */
export const pushRecent = (list: Entity<string[]>, id: string, max = 5) =>
  list.update((ids) => [id, ...ids.filter((item) => item !== id)].slice(0, max));
