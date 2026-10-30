/**
 * An investor's next step and when it is due, editable in place.
 *
 * The pipeline only had a stage and a free note, so "send Sequoia the cost
 * model by Friday" lived in the founder's head (or in the note, where nothing
 * could tell it was late). Now each row carries a next step and a due day: an
 * overdue one is marked, the dashboard brief and the overdue alert count it,
 * and the assistant reads and sets the same two fields.
 */
import { useState } from 'react';
import { CalendarClock, Check, Pencil, X } from 'lucide-react';
import { daysUntil, setPipelineFollowUp, type RoundInvestor } from '../../lib/localLists';
import { useLanguage, useT } from '../../lib/language';
import { cn } from '../../lib/utils';

function dueLabel(day: string, lang: 'en' | 'el', t: (en: string, el?: string) => string) {
  const inDays = daysUntil(day);
  const date = new Date(`${day}T12:00:00`).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { day: 'numeric', month: 'short' });
  if (inDays < 0) return { text: t(`Overdue · ${date}`, `Εκπρόθεσμο · ${date}`), tone: 'overdue' as const };
  if (inDays === 0) return { text: t('Due today', 'Για σήμερα'), tone: 'soon' as const };
  if (inDays === 1) return { text: t('Due tomorrow', 'Για αύριο'), tone: 'soon' as const };
  if (inDays <= 7) return { text: t(`Due ${date}`, `Έως ${date}`), tone: 'soon' as const };
  return { text: t(`Due ${date}`, `Έως ${date}`), tone: 'later' as const };
}

export function FollowUpChip({ day }: { day: string }) {
  const t = useT();
  const { mode } = useLanguage();
  const label = dueLabel(day, mode === 'el' ? 'el' : 'en', t);
  return (
    <span
      data-testid="followup-due"
      data-tone={label.tone}
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        label.tone === 'overdue' && 'bg-red-50 text-red-700',
        label.tone === 'soon' && 'bg-amber-50 text-amber-800',
        label.tone === 'later' && 'bg-stone-100 text-stone-600',
      )}
    >
      <CalendarClock className="h-3 w-3" aria-hidden="true" />
      {label.text}
    </span>
  );
}

export function FollowUpEditor({ investor, onSaved }: { investor: RoundInvestor; onSaved?: (message: string) => void }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState(investor.nextStep ?? '');
  const [day, setDay] = useState(investor.nextDate ?? '');
  const closed = investor.stage === 'Closed' || investor.stage === 'Passed';

  const open = () => {
    setStep(investor.nextStep ?? '');
    setDay(investor.nextDate ?? '');
    setEditing(true);
  };

  const save = () => {
    setPipelineFollowUp(investor.investorId, { nextStep: step, nextDate: day });
    setEditing(false);
    onSaved?.(step.trim() ? t(`Next step with ${investor.name} saved`, `Αποθηκεύτηκε το επόμενο βήμα με ${investor.name}`) : t('Next step cleared', 'Το επόμενο βήμα αφαιρέθηκε'));
  };

  if (editing) {
    return (
      <form
        className="mt-1 flex flex-col gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <label className="sr-only" htmlFor={`next-step-${investor.investorId}`}>{t('Next step', 'Επόμενο βήμα')}</label>
        <input
          id={`next-step-${investor.investorId}`}
          data-testid="followup-step-input"
          value={step}
          autoFocus
          maxLength={140}
          onChange={(event) => setStep(event.target.value)}
          placeholder={t('e.g. Send the cost model', 'π.χ. Στείλε το μοντέλο κόστους')}
          className="min-h-9 w-full rounded-lg border border-stone-200 bg-white px-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200"
        />
        <div className="flex items-center gap-1.5">
          <label className="sr-only" htmlFor={`next-date-${investor.investorId}`}>{t('Due', 'Προθεσμία')}</label>
          <input
            id={`next-date-${investor.investorId}`}
            data-testid="followup-date-input"
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
            className="min-h-9 rounded-lg border border-stone-200 bg-white px-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200"
          />
          <button type="submit" aria-label={t('Save next step', 'Αποθήκευση επόμενου βήματος')} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-stone-900 text-white">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label={t('Cancel', 'Ακύρωση')} onClick={() => setEditing(false)} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-500">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    );
  }

  if (!investor.nextStep) {
    if (closed) return null;
    return (
      <button type="button" onClick={open} className="mt-1 inline-flex min-h-8 items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-900">
        <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
        {t('Set a next step', 'Όρισε επόμενο βήμα')}
      </button>
    );
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5" data-testid="followup">
      <span className="text-sm text-stone-800">{investor.nextStep}</span>
      {investor.nextDate && !closed && <FollowUpChip day={investor.nextDate} />}
      <button type="button" onClick={open} aria-label={t(`Edit the next step with ${investor.name}`, `Επεξεργασία επόμενου βήματος με ${investor.name}`)} className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-900">
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
