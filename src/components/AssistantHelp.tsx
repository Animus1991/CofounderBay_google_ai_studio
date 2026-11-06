import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, HelpCircle, Search, X } from 'lucide-react';
import { helpEntries } from '../lib/assistantHelp';
import { bothText } from '../lib/labels';
import { useT } from '../lib/language';
import { cn } from '../lib/utils';

const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const PREVIEW_COUNT = 6;

/**
 * The help card of the AI Studio: every question a reader asks about the
 * assistant or about where a page lives, answered from the same registry the
 * menus read. Collapsed rows keep the rail short; a search opens what it
 * finds.
 */
export default function AssistantHelp() {
  const t = useT();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const all = useMemo(helpEntries, []);
  const needle = fold(query.trim());
  const matches = useMemo(
    () => (needle ? all.filter((entry) => fold(`${entry.q.en} ${entry.q.el} ${entry.a.en} ${entry.a.el}`).includes(needle)) : all),
    [all, needle],
  );
  const shown = needle || showAll ? matches : matches.slice(0, PREVIEW_COUNT);
  const hidden = matches.length - shown.length;

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3" data-testid="assistant-help">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
        <HelpCircle className="h-4 w-4 text-stone-400" aria-hidden="true" />
        {t('Help', 'Βοήθεια')}
      </h2>
      <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3">
        <Search className="h-3.5 w-3.5 text-stone-400 shrink-0" aria-hidden="true" />
        <span className="sr-only">{t('Search help', 'Αναζήτηση στη βοήθεια')}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('Ask how something works…', 'Ρώτα πώς δουλεύει κάτι…')}
          className="min-h-10 w-full bg-transparent text-sm outline-none"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label={t('Clear the search', 'Καθαρισμός αναζήτησης')} className="shrink-0 text-stone-400 hover:text-stone-700">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </label>
      {needle && (
        <p role="status" className="text-xs text-stone-500">
          {t(`${matches.length} ${matches.length === 1 ? 'answer' : 'answers'} found`, `${matches.length} ${matches.length === 1 ? 'απάντηση' : 'απαντήσεις'} βρέθηκαν`)}
        </p>
      )}
      {matches.length === 0 ? (
        <p className="text-sm text-stone-500">{t('No help entry matches — ask the assistant in your own words.', 'Καμία εγγραφή δεν ταιριάζει — ρώτα τον βοηθό με δικά σου λόγια.')}</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-100">
          {shown.map((entry) => {
            const expanded = open === entry.id;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : entry.id)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-stone-50"
                >
                  <span className="text-sm font-medium text-stone-900">{bothText(entry.q.en, entry.q.el)}</span>
                  <ChevronDown aria-hidden="true" className={cn('h-4 w-4 shrink-0 text-stone-400 transition-transform', expanded && 'rotate-180')} />
                </button>
                {expanded && (
                  <div className="px-3 pb-3">
                    <p className="text-sm text-stone-600">{bothText(entry.a.en, entry.a.el)}</p>
                    {entry.href && (
                      <Link to={entry.href} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-stone-900 underline decoration-stone-300 underline-offset-2 hover:decoration-stone-900">
                        {t('Open the page', 'Άνοιγμα σελίδας')}
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {hidden > 0 && (
        <button type="button" onClick={() => setShowAll(true)} className="text-xs font-medium text-stone-500 hover:text-stone-900">
          {t(`Show all ${matches.length} answers`, `Εμφάνιση και των ${matches.length} απαντήσεων`)} →
        </button>
      )}
    </section>
  );
}
