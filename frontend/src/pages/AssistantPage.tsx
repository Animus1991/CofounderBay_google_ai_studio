import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Eye, Navigation, PenLine, Search, Settings2, ShieldCheck, Sparkles, Undo2 } from 'lucide-react';
import PageShell from '../components/ui/PageShell';
import ChatWidget from '../components/ChatWidget';
import { AiActionLedger } from '../components/AiActionLedger';
import { useLanguage, useT } from '../lib/language';
import { bothText } from '../lib/labels';
import { askAssistant } from '../lib/assistantBus';
import { ACTION_CATALOG, actionsByArea, type ActionDeclaration, type ActionKind } from '../ai/catalog';
import { AIService, type AIStatus } from '../services/aiService';
import { cn } from '../lib/utils';

const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const KIND_META: Record<ActionKind, { icon: typeof Eye; en: string; el: string; tone: string }> = {
  read: { icon: Eye, en: 'Reads', el: 'Διαβάζει', tone: 'text-stone-600 border-stone-200' },
  write: { icon: PenLine, en: 'Changes — asks first', el: 'Αλλάζει — ρωτά πρώτα', tone: 'text-stone-900 border-stone-400' },
  navigate: { icon: Navigation, en: 'Opens', el: 'Ανοίγει', tone: 'text-stone-600 border-stone-200' },
  preference: { icon: Settings2, en: 'Preference', el: 'Προτίμηση', tone: 'text-stone-600 border-stone-200' },
};

function KindBadge({ action }: { action: ActionDeclaration }) {
  const meta = KIND_META[action.kind];
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap', meta.tone)}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {bothText(meta.en, meta.el)}
    </span>
  );
}

function ReversalBadge({ action }: { action: ActionDeclaration }) {
  if (action.kind !== 'write' || !action.reversal) return null;
  const label = action.reversal === 'full'
    ? { en: 'Undo available', el: 'Με αναίρεση' }
    : action.reversal === 'partial'
      ? { en: 'Partly reversible', el: 'Μερικώς αναστρέψιμο' }
      : { en: 'Not reversible', el: 'Μη αναστρέψιμο' };
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-2 py-0.5 text-xs font-medium text-stone-500 whitespace-nowrap">
      <Undo2 className="h-3 w-3 shrink-0" aria-hidden="true" />
      {bothText(label.en, label.el)}
    </span>
  );
}

/**
 * The AI Studio: the assistant as a place, not only a corner panel.
 *
 * Left, the same conversation the corner panel holds (one transcript). Right,
 * everything the assistant can do, read from the action catalogue the model
 * is offered — so what this page promises and what the assistant can actually
 * run are the same list, and each entry says whether it only reads, or
 * changes something after the founder confirms, and how far Undo goes.
 */
export default function AssistantPage() {
  useLanguage();
  const t = useT();
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let alive = true;
    void AIService.status().then((value) => { if (alive) setStatus(value); });
    return () => { alive = false; };
  }, []);

  const groups = useMemo(() => {
    const needle = fold(filter.trim());
    return actionsByArea()
      .map((group) => ({
        ...group,
        actions: needle
          ? group.actions.filter((action) => [action.label.en, action.label.el, action.example.en, action.example.el, action.description].some((text) => fold(text).includes(needle)))
          : group.actions,
      }))
      .filter((group) => group.actions.length > 0);
  }, [filter]);

  const writes = ACTION_CATALOG.filter((action) => action.kind === 'write').length;
  const reads = ACTION_CATALOG.filter((action) => action.kind === 'read').length;

  return (
    <PageShell
      title={t('AI Studio', 'AI Studio')}
      description={t('Ask in your own words. Every change waits for your Confirm.', 'Ρώτα με δικά σου λόγια. Κάθε αλλαγή περιμένει την επιβεβαίωσή σου.')}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] lg:items-start">
        <div className="min-w-0 lg:sticky lg:top-4 h-[min(46rem,calc(100dvh-11rem))]">
          <ChatWidget variant="page" />
        </div>

        <aside className="min-w-0 space-y-4" aria-label={t('What the assistant can do', 'Τι μπορεί να κάνει ο βοηθός')}>
          <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
            <h2 className="text-sm font-semibold text-stone-900">{t('How it decides', 'Πώς αποφασίζει')}</h2>
            <ol className="space-y-2 text-sm text-stone-600">
              <li className="flex gap-2"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-700">1</span>{t('Studio actions answer first, from live data.', 'Πρώτα απαντούν οι ενέργειες του studio, με ζωντανά δεδομένα.')}</li>
              <li className="flex gap-2"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-700">2</span>{t('Anything else goes to the AI model.', 'Ό,τι άλλο πάει στο μοντέλο AI.')}</li>
              <li className="flex gap-2"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-700">3</span>{t('Nothing changes without your Confirm; no guessing.', 'Τίποτα δεν αλλάζει χωρίς επιβεβαίωση· χωρίς εικασίες.')}</li>
            </ol>
            <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3 text-xs text-stone-500">
              <ShieldCheck className="h-3.5 w-3.5 text-stone-400" aria-hidden="true" />
              {status === null
                ? t('Checking the AI model…', 'Έλεγχος μοντέλου AI…')
                : status.configured
                  ? t(`AI model connected${status.model ? ` (${status.model})` : ''}`, `Μοντέλο AI συνδεδεμένο${status.model ? ` (${status.model})` : ''}`)
                  : t('AI model offline — studio actions still work.', 'Μοντέλο AI εκτός — οι ενέργειες του studio λειτουργούν.')}
            </div>
            <button
              type="button"
              data-testid="assistant-run-studio-check"
              onClick={() => askAssistant('/audit')}
              className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-stone-800"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {t('Run a studio check', 'Έλεγχος studio')}
            </button>
            <p className="text-xs text-stone-500">
              {t(`${ACTION_CATALOG.length} actions · ${reads} read · ${writes} change data`, `${ACTION_CATALOG.length} ενέργειες · ${reads} ανάγνωσης · ${writes} αλλαγής`)}
            </p>
          </section>

          <AiActionLedger />

          <section id="capabilities" className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-stone-900">{t('What I can do', 'Τι μπορώ να κάνω')}</h2>
              <Sparkles className="h-4 w-4 text-stone-300" aria-hidden="true" />
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3">
              <Search className="h-3.5 w-3.5 text-stone-400 shrink-0" aria-hidden="true" />
              <span className="sr-only">{t('Filter actions', 'Φιλτράρισμα ενεργειών')}</span>
              <input
                type="search"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder={t('Filter, e.g. round, mentor, canvas', 'Φίλτρο, π.χ. γύρος, μέντορας, canvas')}
                className="min-h-10 w-full bg-transparent text-sm outline-none"
              />
            </label>
            {groups.length === 0 && (
              <p className="text-sm text-stone-500">{t('No action matches that filter. Ask anyway — the AI model may still help.', 'Καμία ενέργεια δεν ταιριάζει. Ρώτα πάντως — το μοντέλο AI ίσως βοηθήσει.')}</p>
            )}
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.area} className="space-y-1.5">
                  <h3 className="text-xs font-semibold text-stone-500">{bothText(group.label.en, group.label.el)}</h3>
                  <ul className="divide-y divide-stone-100 rounded-xl border border-stone-100">
                    {group.actions.map((action) => (
                      <li key={action.id}>
                        <button
                          type="button"
                          onClick={() => askAssistant(bothText(action.example.en, action.example.el))}
                          className="group flex w-full flex-col gap-1.5 px-3 py-2.5 text-left hover:bg-stone-50"
                          title={t('Send this example to the assistant', 'Αποστολή του παραδείγματος στον βοηθό')}
                        >
                          <span className="flex w-full items-start justify-between gap-2">
                            <span className="text-sm font-medium text-stone-900">{bothText(action.label.en, action.label.el)}</span>
                            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-300 group-hover:text-stone-900" aria-hidden="true" />
                          </span>
                          <span className="text-xs text-stone-500 break-words">“{bothText(action.example.en, action.example.el)}”</span>
                          <span className="flex flex-wrap gap-1.5">
                            <KindBadge action={action} />
                            <ReversalBadge action={action} />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </PageShell>
  );
}
