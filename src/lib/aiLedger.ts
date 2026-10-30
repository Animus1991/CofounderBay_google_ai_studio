/**
 * The AI action ledger: every change the assistant proposed and what the
 * founder did with it (applied / cancelled / undone / failed).
 *
 * It is an account list like any other (keys.aiLedger), so it is scoped to the
 * account, synced to the cloud for signed-in members (lib/cloudSync, under the
 * same Firestore rules as everything else) and kept per device for the sample
 * account. The other agent kept it on its server under an unauthenticated
 * client id, which let anyone who knew the id read someone's history.
 */
import { keys, readValue, writeValue } from './localLists';

export type LedgerStatus = 'applied' | 'undone' | 'cancelled' | 'failed';
export type LedgerEntry = {
  id: string;
  tool: string;
  summary: string;
  status: LedgerStatus;
  reversal?: 'full' | 'partial' | 'none' | null;
  source: 'router' | 'model';
  path?: string | null;
  at: string;
};
export type LedgerPage = { items: LedgerEntry[]; counts: Partial<Record<LedgerStatus, number>> };

const MAX_ENTRIES = 200;

export function readAiActions(): LedgerEntry[] {
  const stored = readValue<LedgerEntry[]>(keys.aiLedger, []);
  return Array.isArray(stored) ? stored : [];
}

export function recordAiAction(entry: Omit<LedgerEntry, 'id' | 'at'>): LedgerEntry {
  const record: LedgerEntry = {
    ...entry,
    summary: entry.summary.slice(0, 600),
    id: `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
  };
  writeValue(keys.aiLedger, [record, ...readAiActions()].slice(0, MAX_ENTRIES));
  return record;
}

/** The newest entries and how many there are of each outcome. */
export function aiActionsPage(limit = 12, entries = readAiActions()): LedgerPage {
  const counts: Partial<Record<LedgerStatus, number>> = {};
  for (const entry of entries) counts[entry.status] = (counts[entry.status] ?? 0) + 1;
  return { items: entries.slice(0, limit), counts };
}
