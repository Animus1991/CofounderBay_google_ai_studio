/** Client for the provider-agnostic email API, the weekly digest and share-open alerts. */
import { appEnv } from '../config/env';
import { ledgerClientId } from './aiLedger';
import { keys, logActivity, readRound, readValue, writeValue, isDemoData } from './localLists';
import { ddProgress, listDDShares, readDD } from './dueDiligence';
import { DEMO_VENTURE } from '../data/demoVenture';

export type EmailStatus = { provider: string | null; configured: boolean; available: string[] };
export type EmailLogEntry = {
  id: string; to: string; subject: string; kind: 'investor' | 'digest'; status: 'sent' | 'queued' | 'failed';
  detail?: string; at: string; investorId?: string | null; investorName?: string | null;
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${appEnv.apiBaseUrl}/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(typeof detail?.detail === 'string' ? detail.detail : `request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export const EMAIL_RE = /^[^@\s]{1,64}@[^@\s]{1,190}\.[A-Za-z]{2,24}$/;

export const emailStatus = () => call<EmailStatus>('/email/status');

export function sendEmail(input: { to: string; subject: string; body: string; investorId?: string; investorName?: string }) {
  return call<EmailLogEntry>('/email/send', { method: 'POST', body: JSON.stringify({ clientId: ledgerClientId(), ...input }) });
}

export const emailLog = (investorId?: string) =>
  call<EmailLogEntry[]>(`/email/log?clientId=${encodeURIComponent(ledgerClientId())}${investorId ? `&investorId=${encodeURIComponent(investorId)}` : ''}`);

/** "Subject: …\n\nBody" (the assistant's draft format) → parts. */
export function splitDraft(text: string): { subject: string; body: string } {
  const match = text.match(/^Subject:\s*(.+)\n+([\s\S]*)$/i);
  return match ? { subject: match[1]!.trim(), body: match[2]!.trim() } : { subject: '', body: text.trim() };
}

// ── Weekly digest ───────────────────────────────────────────────────────────
export type DigestSettings = { enabled: boolean; day: number; hour: number; timezone: string; email: string | null; lang: 'en' | 'el'; lastSentWeek?: string };
export type DigestPreview = { subject: string; text: string; stats: Record<string, number>; status?: string; at?: string };
export type DigestRun = { at: string; subject: string; status: string; trigger: string; stats: Record<string, number> };

export const DEFAULT_DIGEST: DigestSettings = {
  enabled: false, day: 1, hour: 8, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Athens', email: null, lang: 'en',
};

export const getDigestSettings = () => call<DigestSettings>(`/digest/settings?clientId=${encodeURIComponent(ledgerClientId())}`);

export async function saveDigestSettings(settings: DigestSettings): Promise<DigestSettings> {
  const saved = await call<DigestSettings>('/digest/settings', { method: 'PUT', body: JSON.stringify({ clientId: ledgerClientId(), ...settings }) });
  writeValue(keys.digest, { enabled: saved.enabled });
  if (saved.enabled) await syncDigestSnapshot();
  return saved;
}

/** Sends the server the pipeline / due-diligence summary the digest is built from (only when the digest is on, or on preview). */
export async function syncDigestSnapshot(): Promise<void> {
  const round = readRound();
  const items = readDD();
  const dd = ddProgress(items);
  const local = readValue<{ company?: string }>(keys.profileLocal, {});
  const target = round.targetAmount;
  await call('/digest/snapshot', {
    method: 'PUT',
    body: JSON.stringify({
      clientId: ledgerClientId(),
      venture: local.company || (isDemoData() ? DEMO_VENTURE.name : ''),
      pipeline: (round.pipeline ?? []).map((p) => ({
        name: p.name, stage: p.stage, checkSize: p.checkSize, nextStep: p.nextStep, nextDate: p.nextDate,
        history: (p.history ?? []).slice(-50).map((h) => ({ at: h.at, stage: h.stage })),
      })),
      dd: { ...dd, open: items.filter((i) => i.status !== 'done').map((i) => i.en) },
      round: { target, committed: round.committedAmount, instrument: round.instrument, targetLabel: target >= 1e6 ? `$${(target / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `$${Math.round(target / 1000)}k` },
    }),
  });
}

export async function previewDigest(): Promise<DigestPreview> {
  await syncDigestSnapshot();
  return call<DigestPreview>(`/digest/preview?clientId=${encodeURIComponent(ledgerClientId())}`);
}

export async function sendDigestNow(): Promise<DigestPreview> {
  await syncDigestSnapshot();
  return call<DigestPreview>('/digest/send-now', { method: 'POST', body: JSON.stringify({ clientId: ledgerClientId() }) });
}

export const digestHistory = () => call<DigestRun[]>(`/digest/history?clientId=${encodeURIComponent(ledgerClientId())}`);

export const digestEnabledLocally = () => readValue<{ enabled?: boolean }>(keys.digest, {}).enabled === true;

// ── Share-open alerts ───────────────────────────────────────────────────────
/** Compares link view counts with what the founder last saw; each new open becomes an activity (→ notifications). */
export async function checkShareOpens(): Promise<{ name: string; views: number }[]> {
  const shares = await listDDShares();
  const seen = readValue<Record<string, number>>(keys.ddSeen, {});
  const fresh: { name: string; views: number }[] = [];
  const next: Record<string, number> = {};
  for (const share of shares) {
    next[share.token] = share.views;
    const before = seen[share.token];
    if (before !== undefined && share.views > before) {
      const name = share.investorName || 'Someone';
      fresh.push({ name, views: share.views - before });
      logActivity({
        kind: 'round',
        title: `${name} opened your due-diligence link${share.views - before > 1 ? ` (${share.views - before}×)` : ''}`,
        titleEl: `${name}: άνοιξε τον σύνδεσμο δέουσας επιμέλειας${share.views - before > 1 ? ` (${share.views - before}×)` : ''}`,
        href: '/fundraising?tab=dd',
      });
    }
  }
  writeValue(keys.ddSeen, next);
  return fresh;
}
