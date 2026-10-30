/** Client for the provider-agnostic email API, the weekly digest and share-open alerts. */
import { studioApi } from './studioApi';
import { queryClient, queryKeys } from './queryClient';
import { keys, logActivity, readRound, readValue, writeValue } from './localLists';
import { ddProgress, listDDShares, readDD } from './dueDiligence';
import { ventureName } from './entities';

export type EmailStatus = { provider: string | null; configured: boolean };
export type EmailLogEntry = {
  id: string; to: string; subject: string; kind: 'investor' | 'digest'; status: 'sent' | 'queued' | 'failed';
  detail?: string; at: string; investorId?: string | null; investorName?: string | null;
};

export const EMAIL_RE = /^[^@\s]{1,64}@[^@\s]{1,190}\.[A-Za-z]{2,24}$/;

export const emailStatus = () => studioApi<EmailStatus>('/email/status');

export async function sendEmail(input: { to: string; subject: string; body: string; investorId?: string; investorName?: string }) {
  const entry = await studioApi<EmailLogEntry>('/email/send', { method: 'POST', body: input });
  void queryClient.invalidateQueries({ queryKey: queryKeys.emailLogs });
  return entry;
}

export const emailLog = (investorId?: string) =>
  studioApi<EmailLogEntry[]>(`/email/log${investorId ? `?investorId=${encodeURIComponent(investorId)}` : ''}`);

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

export const getDigestSettings = () => studioApi<DigestSettings>('/digest/settings');

export async function saveDigestSettings(settings: DigestSettings): Promise<DigestSettings> {
  const saved = await studioApi<DigestSettings>('/digest/settings', { method: 'PUT', body: settings });
  queryClient.setQueryData(queryKeys.digestSettings, saved);
  writeValue(keys.digest, { enabled: saved.enabled });
  if (saved.enabled) await syncDigestSnapshot();
  return saved;
}

/** Sends the server the pipeline / due-diligence summary the digest is built from (only when the digest is on, or on preview). */
export async function syncDigestSnapshot(): Promise<void> {
  const round = readRound();
  const items = readDD();
  const dd = ddProgress(items);
  const target = round.targetAmount;
  await studioApi('/digest/snapshot', {
    method: 'PUT',
    body: {
      venture: ventureName(),
      pipeline: (round.pipeline ?? []).map((p) => ({
        name: p.name, stage: p.stage, checkSize: p.checkSize, nextStep: p.nextStep, nextDate: p.nextDate,
        history: (p.history ?? []).slice(-20).map((h) => ({ at: h.at, stage: h.stage })),
      })),
      dd: { ...dd, open: items.filter((i) => i.status !== 'done').map((i) => i.en) },
      round: { target, committed: round.committedAmount, instrument: round.instrument, targetLabel: target >= 1e6 ? `$${(target / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `$${Math.round(target / 1000)}k` },
    },
  });
}

export async function previewDigest(): Promise<DigestPreview> {
  await syncDigestSnapshot();
  return studioApi<DigestPreview>('/digest/preview');
}

export async function sendDigestNow(): Promise<DigestPreview> {
  await syncDigestSnapshot();
  const sent = await studioApi<DigestPreview>('/digest/send-now', { method: 'POST', body: {} });
  void queryClient.invalidateQueries({ queryKey: queryKeys.digestHistory });
  void queryClient.invalidateQueries({ queryKey: queryKeys.emailLogs });
  return sent;
}

export const digestHistory = () => studioApi<DigestRun[]>('/digest/history');

export const digestEnabledLocally = () => readValue<{ enabled?: boolean }>(keys.digest, {}).enabled === true;

// ── Share-open alerts ───────────────────────────────────────────────────────
/** Compares link view counts with what the founder last saw; each new open becomes an activity (→ notifications). */
export async function checkShareOpens(): Promise<{ name: string; views: number }[]> {
  // Through the shared cache, so the due-diligence panel shows the same counts without polling itself.
  const shares = await queryClient.fetchQuery({ queryKey: queryKeys.ddShares, queryFn: listDDShares, staleTime: 0 });
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
