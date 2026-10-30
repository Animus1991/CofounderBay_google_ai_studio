/**
 * The AI action ledger: every proposal the assistant makes and what the founder
 * did with it (applied / cancelled / undone / failed), kept server-side so the
 * AI Studio can show an auditable history across sessions.
 */
import { appEnv } from '../config/env';
import { dataScope } from './localLists';

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

export const LEDGER_EVENT = 'cfb:ai-ledger';
const DEVICE_KEY = 'cfb.deviceId';

function deviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const created = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_KEY, created);
    return created;
  } catch {
    return 'dev-ephemeral';
  }
}

/** Signed-in accounts use their id (same history on every device); the sample account is per device. */
export function ledgerClientId(): string {
  return dataScope() || `${deviceId()}@demo`;
}

export function recordAiAction(entry: Omit<LedgerEntry, 'id' | 'at'>): void {
  const body = JSON.stringify({ ...entry, clientId: ledgerClientId(), summary: entry.summary.slice(0, 600) });
  void fetch(`${appEnv.apiBaseUrl}/api/ai/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    .then(() => window.dispatchEvent(new Event(LEDGER_EVENT)))
    .catch(() => undefined);
}

export async function fetchAiActions(limit = 12): Promise<LedgerPage> {
  const response = await fetch(`${appEnv.apiBaseUrl}/api/ai/actions?clientId=${encodeURIComponent(ledgerClientId())}&limit=${limit}`);
  if (!response.ok) throw new Error(`ledger ${response.status}`);
  return (await response.json()) as LedgerPage;
}
