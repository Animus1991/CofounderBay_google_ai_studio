/**
 * The weekly investor digest: a plain-text summary of the round, the pipeline
 * (moves this week, overdue and upcoming follow-ups) and due diligence, built
 * from the snapshot the app sends when the digest is on. Ported from the other
 * agent's FastAPI backend; the schedule uses Intl instead of zoneinfo.
 */
export type DigestInvestor = { name: string; stage: string; checkSize?: string; nextStep?: string; nextDate?: string; history?: { at: string; stage: string }[] };
export type DigestSnapshot = {
  venture?: string;
  pipeline?: DigestInvestor[];
  dd?: { done?: number; total?: number; inProgress?: number; open?: string[] };
  round?: { target?: number; committed?: number; instrument?: string; targetLabel?: string };
};
export type DigestSettings = { enabled: boolean; day: number; hour: number; timezone: string; email: string | null; lang: 'en' | 'el'; lastSentWeek?: string };
export type Digest = { subject: string; text: string; stats: { tracked: number; active: number; moves: number; overdue: number; upcoming: number } };

export const DEFAULT_DIGEST_SETTINGS: DigestSettings = { enabled: false, day: 1, hour: 8, timezone: 'Europe/Athens', email: null, lang: 'en' };

export function validTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Local calendar parts of an instant in a time zone. */
function localParts(at: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short' })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(String(parts.weekday));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hour: Number(parts.hour) % 24, weekday };
}

function isoWeek(year: number, month: number, day: number): string {
  // ISO 8601: the week belongs to the year of its Thursday.
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** This week's key when the digest is due now in the person's own time zone (day 0 = Sunday), else null. */
export function dueNow(settings: Pick<DigestSettings, 'day' | 'hour' | 'timezone'>, now: Date): string | null {
  const local = localParts(now, validTimeZone(settings.timezone) ? settings.timezone : 'Europe/Athens');
  if (local.weekday !== settings.day || local.hour !== settings.hour) return null;
  return isoWeek(local.year, local.month, local.day);
}

const ymd = (date: Date) => date.toISOString().slice(0, 10);

export function buildDigest(snapshot: DigestSnapshot, lang: 'en' | 'el', now: Date): Digest {
  const el = lang === 'el';
  const L = (en: string, gr: string) => (el ? gr : en);
  const today = ymd(now);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const weekAhead = ymd(new Date(now.getTime() + 7 * 86_400_000));
  const pipeline = snapshot.pipeline ?? [];
  const active = pipeline.filter((item) => item.stage !== 'Passed' && item.stage !== 'Closed');
  const moves = pipeline.flatMap((item) => (item.history ?? []).slice(1).filter((step) => (step.at ?? '') >= weekAgo).map((step) => ({ name: item.name, stage: step.stage })));
  const byDate = (a: DigestInvestor, b: DigestInvestor) => (a.nextDate ?? '').localeCompare(b.nextDate ?? '');
  const overdue = active.filter((item) => item.nextDate && item.nextDate < today).sort(byDate);
  const upcoming = active.filter((item) => item.nextDate && item.nextDate >= today && item.nextDate <= weekAhead).sort(byDate);
  const venture = snapshot.venture || L('your startup', 'η εταιρεία σου');
  const stages = new Map<string, number>();
  for (const item of pipeline) stages.set(item.stage, (stages.get(item.stage) ?? 0) + 1);
  const none = (en: string, gr: string) => [`• ${L(en, gr)}`];
  const line = (item: DigestInvestor) => `• ${item.name}: ${item.nextStep || '—'} (${item.nextDate})`;

  const lines = [L(`Weekly investor digest — ${venture}`, `Εβδομαδιαία σύνοψη επενδυτών — ${venture}`), ''];
  const round = snapshot.round ?? {};
  if (round.target) {
    const pct = Math.round((100 * (round.committed ?? 0)) / round.target);
    const target = round.targetLabel || String(round.target);
    lines.push(L(`Round: ${pct}% committed of ${target} (${round.instrument ?? ''}).`, `Γύρος: ${pct}% δεσμευμένο από ${target} (${round.instrument ?? ''}).`));
  }
  lines.push(
    L(`Pipeline: ${pipeline.length} tracked, ${active.length} active — `, `Ροή: ${pipeline.length} σε παρακολούθηση, ${active.length} ενεργοί — `)
      + [...stages].map(([stage, count]) => `${stage} ${count}`).join(', '),
  );
  lines.push('', L('Moves this week', 'Μετακινήσεις της εβδομάδας'), ...(moves.length ? moves.map((move) => `• ${move.name} → ${move.stage}`) : none('None', 'Καμία')));
  lines.push('', L('Overdue follow-ups', 'Εκπρόθεσμα follow-ups'), ...(overdue.length ? overdue.map(line) : none('None', 'Κανένα')));
  lines.push('', L('Due in the next 7 days', 'Λήγουν τις επόμενες 7 ημέρες'), ...(upcoming.length ? upcoming.map(line) : none('None', 'Κανένα')));
  const dd = snapshot.dd ?? {};
  if (dd.total) {
    lines.push('', L(`Due diligence: ${dd.done ?? 0}/${dd.total} ready, ${dd.inProgress ?? 0} in progress.`, `Δέουσα επιμέλεια: ${dd.done ?? 0}/${dd.total} έτοιμα, ${dd.inProgress ?? 0} σε εξέλιξη.`));
    lines.push(...(dd.open ?? []).slice(0, 5).map((title) => `• ${title}`));
  }
  const subject = L(
    `${venture}: ${overdue.length} overdue, ${moves.length} move${moves.length === 1 ? '' : 's'} this week`,
    `${venture}: ${overdue.length} εκπρόθεσμα, ${moves.length} μετακινήσεις`,
  );
  return { subject, text: lines.join('\n'), stats: { tracked: pipeline.length, active: active.length, moves: moves.length, overdue: overdue.length, upcoming: upcoming.length } };
}
