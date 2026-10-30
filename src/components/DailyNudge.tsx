import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Lightbulb } from 'lucide-react';
import { useT, getLang } from '../lib/language';
import { keys, localDay, readValue, writeValue } from '../lib/localLists';
import { useStored } from '../lib/useStored';
import { askAssistant } from '../lib/assistantBus';
import { AIService } from '../services/aiService';
import { studioAudit, type AuditRow } from '../services/assistantOps';
import { useAuth } from '../App';
import { viewerFromAuth } from '../lib/viewer';

type Nudge = { date: string; area: string; why: string; lang: 'en' | 'el'; by: 'ai' | 'studio'; done?: boolean };

/** Every list the studio check reads — a change to any of them re-runs it. */
const AUDIT_KEYS = [keys.canvas, keys.builderInputs, keys.pitch, keys.legalChecklist, keys.needs, keys.milestones, keys.round, keys.startup] as const;

function readNudge(): Nudge | null {
  const value = readValue<Nudge | null>(keys.nudge, null);
  return value && value.date === localDay() ? value : null;
}

/** Rotates through the three weakest areas by day, so a skipped step is not the same one forever. */
function studioPick(gaps: AuditRow[]): AuditRow | undefined {
  const pool = gaps.slice(0, 3);
  if (pool.length === 0) return undefined;
  const day = Math.floor(Date.now() / 86_400_000);
  return pool[day % pool.length];
}

/**
 * Today's step: one area a day from the studio check (services/assistantOps →
 * studioAudit), picked by the AI model when it is reachable, otherwise the
 * weakest area. "Do it with the assistant" hands the fix to the chat; "Done"
 * hides it until tomorrow. Investor follow-ups are not repeated here — the
 * "Waiting on you" card above already puts the most overdue one first.
 */
export function DailyNudge() {
  const t = useT();
  const lang = getLang() === 'el' ? 'el' : 'en';
  const { profile: authProfile } = useAuth();
  const profile = useMemo(() => viewerFromAuth(authProfile), [authProfile]);
  const stored = useStored(readNudge, [keys.nudge]);
  const audit = useStored(() => studioAudit(profile), AUDIT_KEYS);
  const [picking, setPicking] = useState(false);
  const requested = useRef('');

  useEffect(() => {
    if (stored && stored.lang === lang) return;
    const today = localDay();
    if (requested.current === `${today}-${lang}`) return;
    requested.current = `${today}-${lang}`;
    const fallback = studioPick(audit.gaps);
    if (!fallback) return;
    const remember = (row: AuditRow, why: string, by: Nudge['by']) =>
      writeValue(keys.nudge, { date: today, area: row.name[0], why: why.slice(0, 220), lang, by } satisfies Nudge);
    if (AIService.coolingDown) {
      remember(fallback, '', 'studio');
      return;
    }
    setPicking(true);
    const rows = audit.gaps.map((row, index) => `${index}. ${row.en} (fix: "${row.fix?.en ?? ''}")`).join('\n');
    AIService.json<{ index: number; why: string }>(
      `Studio check (weakest first):\n${rows}\nPick the ONE area that most moves this founder forward today. Write "why" in ${lang === 'el' ? 'Greek' : 'English'}, max 22 words, using only these facts.`,
      'You pick the daily next step for a founder studio. Return JSON {"index": number, "why": string}. Never invent numbers.',
    )
      .then((out) => remember(audit.gaps[Number(out.index)] ?? fallback, String(out.why || ''), 'ai'))
      .catch(() => remember(fallback, '', 'studio'))
      .finally(() => setPicking(false));
  }, [stored, lang, audit]);

  const row = audit.gaps.find((gap) => gap.name[0] === stored?.area) ?? studioPick(audit.gaps);
  if (!row) return null;
  const done = stored?.done === true;
  const why = stored?.why || t(
    `${row.en} — one of the weakest areas in your studio check (${audit.score}% overall).`,
    `${row.el} — από τις πιο αδύναμες περιοχές στον έλεγχο του studio (${audit.score}% συνολικά).`,
  );

  return (
    <section data-testid="daily-nudge" className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-medium text-stone-500">
            {t("Today's step", 'Το βήμα της ημέρας')} · {row.name[lang === 'el' ? 1 : 0]}
            {stored?.by === 'ai' && (
              <span className="ml-1.5 font-medium normal-case tracking-normal text-stone-500">
                {t('picked by AI', 'επιλογή AI')}
              </span>
            )}
          </p>
          <p className="text-sm text-stone-800" data-testid="daily-nudge-why">{picking && !stored ? t('Choosing today’s step…', 'Επιλέγω το σημερινό βήμα…') : why}</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {done ? (
          <span className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-emerald-700" data-testid="daily-nudge-done-label">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />{t('Done for today', 'Έγινε για σήμερα')}
          </span>
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
              onClick={() => writeValue(keys.nudge, { ...(stored ?? { date: localDay(), area: row.name[0], why: '', lang, by: 'studio' as const }), done: true })}
              className="inline-flex min-h-9 items-center rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition-colors hover:border-stone-400 hover:text-stone-900"
            >
              {t('Done', 'Έγινε')}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
