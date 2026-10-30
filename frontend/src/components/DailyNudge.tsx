import { useEffect, useMemo, useRef, useState } from 'react';
import { AlarmClock, Check, Lightbulb, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { overdueInvestors } from '../services/investorOps';
import { useT, getLang } from '../lib/language';
import { keys, readValue, writeValue } from '../lib/localLists';
import { useStored } from '../lib/useStored';
import { askAssistant } from '../lib/assistantBus';
import { AIService } from '../services/aiService';
import { studioAudit, type AuditRow } from '../services/assistantOps';
import { useAuth } from '../App';
import { viewerFromAuth } from './ChatWidget';

type Nudge = { date: string; area: string; why: string; lang: 'en' | 'el'; by: 'ai' | 'studio'; done?: boolean };

const today = () => new Date().toISOString().slice(0, 10);

function readNudge(): Nudge | null {
  const value = readValue<Nudge | null>(keys.nudge, null);
  return value && value.date === today() ? value : null;
}

/** Rotates through the three weakest areas by day, so a skipped nudge is not the same one forever. */
function studioPick(gaps: AuditRow[]): AuditRow | undefined {
  const pool = gaps.slice(0, 3);
  if (pool.length === 0) return undefined;
  const day = Math.floor(Date.now() / 86_400_000);
  return pool[day % pool.length];
}

/** One step a day, picked by the AI model from the studio check (falls back to the weakest area). */
export function DailyNudge() {
  const t = useT();
  const lang = getLang() === 'el' ? 'el' : 'en';
  const { profile: authProfile } = useAuth();
  const profile = useMemo(() => viewerFromAuth(authProfile), [authProfile]);
  const stored = useStored(readNudge, [keys.nudge]);
  const overdue = useStored(overdueInvestors, [keys.round]);
  const audit = useMemo(() => studioAudit(profile), [profile, stored]);
  const [picking, setPicking] = useState(false);
  const requested = useRef('');

  useEffect(() => {
    if (stored && stored.lang === lang) return;
    if (requested.current === `${today()}-${lang}`) return;
    requested.current = `${today()}-${lang}`;
    const fallback = studioPick(audit.gaps);
    if (!fallback) return;
    setPicking(true);
    const rows = audit.gaps.map((row, index) => `${index}. ${row.en} (fix: "${row.fix?.en ?? ''}")`).join('\n');
    AIService.json<{ index: number; why: string }>(
      `Studio check (weakest first):\n${rows}\nPick the ONE area that most moves this founder forward today. Write "why" in ${lang === 'el' ? 'Greek' : 'English'}, max 22 words, using only these facts.`,
      'You pick the daily next step for a founder studio. Return JSON {"index": number, "why": string}. Never invent numbers.',
    )
      .then((out) => {
        const row = audit.gaps[Number(out.index)] ?? fallback;
        writeValue(keys.nudge, { date: today(), area: row.name[0], why: String(out.why || '').slice(0, 220), lang, by: 'ai' } satisfies Nudge);
      })
      .catch(() => {
        writeValue(keys.nudge, { date: today(), area: fallback.name[0], why: '', lang, by: 'studio' } satisfies Nudge);
      })
      .finally(() => setPicking(false));
  }, [stored, lang, audit]);

  const row = audit.gaps.find((gap) => gap.name[0] === stored?.area) ?? studioPick(audit.gaps);
  if (!row) return overdue.length ? <InvestorAlert overdue={overdue} /> : null;
  const done = stored?.done === true;
  const why = stored?.why || t(`${row.en} — the weakest area in your studio check (${audit.score}% overall).`, `${row.el} — η πιο αδύναμη περιοχή στον έλεγχο studio (${audit.score}% συνολικά).`);

  return (
    <div className="space-y-2">
    {overdue.length > 0 && <InvestorAlert overdue={overdue} />}
    <section data-testid="daily-nudge" className="flex flex-col gap-3 rounded-xl border border-amber-200/70 bg-amber-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <div className="min-w-0 space-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            {t("Today's step", 'Το βήμα της ημέρας')} · {row.name[lang === 'el' ? 1 : 0]}
            {stored?.by === 'ai' && <span className="ml-1.5 inline-flex items-center gap-0.5 font-medium normal-case tracking-normal text-stone-500"><Sparkles className="h-3 w-3" />{t('picked by AI', 'επιλογή AI')}</span>}
          </p>
          <p className="text-sm text-stone-800" data-testid="daily-nudge-why">{picking && !stored ? t('Choosing today’s step…', 'Επιλέγω το σημερινό βήμα…') : why}</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {done ? (
          <span className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-emerald-700" data-testid="daily-nudge-done-label"><Check className="h-3.5 w-3.5" />{t('Done for today', 'Έγινε για σήμερα')}</span>
        ) : (
          <>
            <button
              type="button"
              data-testid="daily-nudge-do"
              onClick={() => row.fix && askAssistant(lang === 'el' ? row.fix.el : row.fix.en)}
              className="inline-flex min-h-9 items-center rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-stone-800"
            >
              {t('Do it with the assistant', 'Κάν’ το με τον βοηθό')}
            </button>
            <button
              type="button"
              data-testid="daily-nudge-dismiss"
              onClick={() => writeValue(keys.nudge, { ...(stored ?? { date: today(), area: row.name[0], why: '', lang, by: 'studio' }), done: true })}
              className="inline-flex min-h-9 items-center rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition-colors hover:border-stone-400 hover:text-stone-900"
            >
              {t('Done', 'Έγινε')}
            </button>
          </>
        )}
      </div>
    </section>
    </div>
  );
}

/** Overdue investor follow-ups outrank the daily step: a missed reply can cost the round. */
function InvestorAlert({ overdue }: { overdue: ReturnType<typeof overdueInvestors> }) {
  const t = useT();
  const first = [...overdue].sort((a, b) => (a.nextDate ?? '').localeCompare(b.nextDate ?? ''))[0]!;
  const more = overdue.length - 1;
  return (
    <section data-testid="daily-nudge-investor-alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <AlarmClock className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
        <div className="min-w-0 space-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700">
            {t(`Overdue investor follow-up${overdue.length > 1 ? `s · ${overdue.length}` : ''}`, `Εκπρόθεσμα follow-up επενδυτών${overdue.length > 1 ? ` · ${overdue.length}` : ''}`)}
          </p>
          <p className="text-sm text-stone-800" data-testid="daily-nudge-investor-text">
            {first.name}: {first.nextStep || t('next step', 'επόμενο βήμα')} — {t('due', 'προθεσμία')} {first.nextDate}
            {more > 0 && <span className="text-stone-500"> · {t(`+${more} more`, `+${more} ακόμα`)}</span>}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          data-testid="daily-nudge-investor-email"
          onClick={() => askAssistant(`Draft a follow-up email to ${first.name}`)}
          className="inline-flex min-h-9 items-center rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-stone-800"
        >
          {t('Draft the email', 'Γράψε το email')}
        </button>
        <Link to="/fundraising?tab=crm" data-testid="daily-nudge-investor-crm" className="inline-flex min-h-9 items-center rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition-colors hover:border-stone-400 hover:text-stone-900">
          {t('Open CRM', 'Άνοιγμα CRM')}
        </Link>
      </div>
    </section>
  );
}
