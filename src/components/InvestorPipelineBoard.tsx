import { useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarClock, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { useT, getLang } from '../lib/language';
import { useStored } from '../lib/useStored';
import { askAssistant } from '../lib/assistantBus';
import {
  PIPELINE_STAGES,
  keys,
  readRound,
  removePipelineInvestor,
  setPipelineStage,
  updatePipelineInvestor,
  upsertPipelineInvestor,
  type RoundInvestor,
} from '../lib/localLists';
import { stageLabel } from '../services/investorOps';
import { cn } from '../lib/utils';

const field = 'min-h-9 rounded-lg border border-stone-200 bg-white px-2.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200';
const today = () => new Date().toISOString().slice(0, 10);

/** The investor CRM: one column per stage, the same round.pipeline the assistant reads and writes. */
export function InvestorPipelineBoard() {
  const t = useT();
  const lang = getLang() === 'el' ? 'el' : 'en';
  const pipeline = useStored(() => readRound().pipeline ?? [], [keys.round]);
  const [draft, setDraft] = useState({ name: '', stage: 'Identified', checkSize: '', nextStep: '', nextDate: '' });
  const [error, setError] = useState('');

  const add = () => {
    const name = draft.name.trim();
    if (!name) { setError(t('Add a name first.', 'Πρόσθεσε πρώτα ένα όνομα.')); return; }
    if (pipeline.some((item) => item.name.toLowerCase() === name.toLowerCase())) { setError(t('Already in your pipeline.', 'Υπάρχει ήδη στον αγωγό.')); return; }
    const investorId = `inv-${Date.now().toString(36)}`;
    upsertPipelineInvestor({ investorId, name, stage: draft.stage });
    updatePipelineInvestor(investorId, { checkSize: draft.checkSize.trim() || undefined, nextStep: draft.nextStep.trim() || undefined, nextDate: draft.nextDate || undefined });
    setDraft({ name: '', stage: 'Identified', checkSize: '', nextStep: '', nextDate: '' });
    setError('');
  };

  const active = pipeline.filter((item) => item.stage !== 'Passed' && item.stage !== 'Closed');
  const overdue = active.filter((item) => item.nextDate && item.nextDate < today()).length;

  return (
    <div className="space-y-4" data-testid="investor-crm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-stone-900">{t('Investor CRM', 'CRM επενδυτών')}</h2>
          <p className="text-xs text-stone-500" data-testid="investor-crm-summary">
            {t(`${pipeline.length} tracked · ${active.length} active · ${overdue} overdue next step${overdue === 1 ? '' : 's'}`, `${pipeline.length} σε παρακολούθηση · ${active.length} ενεργοί · ${overdue} εκπρόθεσμα βήματα`)}
          </p>
        </div>
        <button
          type="button"
          data-testid="investor-crm-ask"
          onClick={() => askAssistant('Show my pipeline')}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-stone-200 px-3 text-xs font-medium text-stone-700 transition-colors hover:border-stone-400 hover:text-stone-900"
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          {t('Ask the assistant about my pipeline', 'Ρώτα τον βοηθό για τον αγωγό')}
        </button>
      </div>

      <form
        data-testid="investor-crm-add-form"
        onSubmit={(event) => { event.preventDefault(); add(); }}
        className="grid grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-6"
      >
        <input data-testid="investor-crm-add-name" className={cn(field, 'lg:col-span-2')} placeholder={t('Investor or fund', 'Επενδυτής ή fund')} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <select data-testid="investor-crm-add-stage" className={field} value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value })} aria-label={t('Stage', 'Στάδιο')}>
          {PIPELINE_STAGES.map((stage) => <option key={stage} value={stage}>{stageLabel(stage, lang)}</option>)}
        </select>
        <input data-testid="investor-crm-add-check" className={field} placeholder={t('Check size, e.g. $250k', 'Ποσό, π.χ. $250k')} value={draft.checkSize} onChange={(e) => setDraft({ ...draft, checkSize: e.target.value })} />
        <input data-testid="investor-crm-add-next" className={field} placeholder={t('Next step', 'Επόμενο βήμα')} value={draft.nextStep} onChange={(e) => setDraft({ ...draft, nextStep: e.target.value })} />
        <div className="flex gap-2">
          <input data-testid="investor-crm-add-date" type="date" className={cn(field, 'min-w-0 flex-1')} value={draft.nextDate} onChange={(e) => setDraft({ ...draft, nextDate: e.target.value })} aria-label={t('Next step date', 'Ημερομηνία βήματος')} />
          <button type="submit" data-testid="investor-crm-add-submit" className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-stone-800">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />{t('Add', 'Προσθήκη')}
          </button>
        </div>
        {error && <p className="text-xs text-red-600 sm:col-span-2 lg:col-span-6" data-testid="investor-crm-add-error">{error}</p>}
      </form>

      <div className="grid grid-flow-col auto-cols-[minmax(10.5rem,1fr)] gap-2 overflow-x-auto pb-2" data-testid="investor-crm-board">
        {PIPELINE_STAGES.map((stage) => {
          const cards = pipeline.filter((item) => item.stage === stage);
          return (
            <section key={stage} className="min-w-0 rounded-xl border border-stone-200 bg-stone-50/60 p-2" data-testid={`investor-crm-column-${stage.toLowerCase().replace(/\s+/g, '-')}`}>
              <header className="flex items-center justify-between px-1 pb-2">
                <h3 className="text-xs font-semibold text-stone-700">{stageLabel(stage, lang)}</h3>
                <span className="text-[11px] text-stone-400">{cards.length}</span>
              </header>
              <div className="space-y-2">
                {cards.length === 0 && <p className="px-1 py-3 text-[11px] text-stone-400">{t('No one here yet', 'Κανείς εδώ ακόμα')}</p>}
                {cards.map((item) => <InvestorCard key={item.investorId} item={item} lang={lang} />)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function InvestorCard({ item, lang }: { item: RoundInvestor; lang: 'en' | 'el' }) {
  const t = useT();
  const index = PIPELINE_STAGES.indexOf(item.stage as (typeof PIPELINE_STAGES)[number]);
  const late = item.nextDate && item.nextDate < today() && item.stage !== 'Passed' && item.stage !== 'Closed';
  const move = (delta: number) => {
    const next = PIPELINE_STAGES[index + delta];
    if (next) setPipelineStage(item.investorId, next);
  };
  const testId = item.investorId.replace(/[^a-z0-9_-]/gi, '');
  return (
    <article className="space-y-1.5 rounded-lg border border-stone-200 bg-white p-2.5" data-testid={`investor-card-${testId}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-stone-900">{item.name}</p>
        {item.checkSize && <span className="shrink-0 text-[11px] text-stone-500">{item.checkSize}</span>}
      </div>
      {item.notes && <p className="text-[11px] leading-snug text-stone-500">{item.notes}</p>}
      <textarea
        key={item.nextStep ?? ''}
        rows={2}
        data-testid={`investor-card-next-${testId}`}
        title={item.nextStep ?? ''}
        className="w-full resize-none rounded-md border border-transparent bg-stone-50 px-2 py-1 text-[11px] leading-snug text-stone-800 hover:border-stone-200 focus:border-stone-300 focus:outline-none"
        defaultValue={item.nextStep ?? ''}
        placeholder={t('Next step…', 'Επόμενο βήμα…')}
        onBlur={(e) => { if (e.target.value.trim() !== (item.nextStep ?? '')) updatePipelineInvestor(item.investorId, { nextStep: e.target.value.trim() }); }}
      />
      {item.nextDate && (
        <p className={cn('inline-flex items-center gap-1 text-[11px]', late ? 'font-semibold text-red-600' : 'text-stone-500')} data-testid={`investor-card-date-${testId}`}>
          <CalendarClock className="h-3 w-3" aria-hidden="true" />
          {late ? t(`Overdue · ${item.nextDate}`, `Εκπρόθεσμο · ${item.nextDate}`) : item.nextDate}
        </p>
      )}
      {item.lastEmail && (
        <p className={cn('text-[11px]', item.lastEmail.status === 'failed' ? 'text-red-600' : 'text-stone-500')} data-testid={`investor-card-last-email-${testId}`}>
          {t('Email', 'Email')} {item.lastEmail.status === 'sent' ? t('sent', 'στάλθηκε') : item.lastEmail.status === 'queued' ? t('logged', 'καταγράφηκε') : t('failed', 'απέτυχε')} · {item.lastEmail.at.slice(0, 10)}
        </p>
      )}
      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-1">
          <button type="button" aria-label={t('Previous stage', 'Προηγούμενο στάδιο')} data-testid={`investor-card-back-${testId}`} disabled={index <= 0} onClick={() => move(-1)} className="rounded-md border border-stone-200 p-1 text-stone-500 transition-colors hover:text-stone-900 disabled:opacity-30">
            <ArrowLeft className="h-3 w-3" />
          </button>
          <button type="button" aria-label={t('Next stage', 'Επόμενο στάδιο')} data-testid={`investor-card-forward-${testId}`} disabled={index >= PIPELINE_STAGES.length - 1} onClick={() => move(1)} className="rounded-md border border-stone-200 p-1 text-stone-500 transition-colors hover:text-stone-900 disabled:opacity-30">
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="flex gap-1">
          <button type="button" data-testid={`investor-card-ask-${testId}`} onClick={() => askAssistant(`Draft a follow-up email to ${item.name}`)} className="rounded-md px-1.5 py-1 text-[11px] font-medium text-stone-500 transition-colors hover:text-stone-900">
            {t('Draft email', 'Email')}
          </button>
          <button type="button" aria-label={t('Remove', 'Αφαίρεση')} data-testid={`investor-card-remove-${testId}`} onClick={() => removePipelineInvestor(item.investorId)} className="rounded-md p-1 text-stone-400 transition-colors hover:text-red-600">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      {item.history && item.history.length > 1 && (
        <p className="text-[10px] text-stone-400">{item.history.map((h) => stageLabel(h.stage, lang)).join(' → ')}</p>
      )}
    </article>
  );
}
