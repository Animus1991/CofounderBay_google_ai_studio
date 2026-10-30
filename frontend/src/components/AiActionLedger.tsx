import { useEffect, useState } from 'react';
import { CheckCircle2, CircleSlash, History, RotateCcw, TriangleAlert } from 'lucide-react';
import { useT } from '../lib/language';
import { fetchAiActions, LEDGER_EVENT, type LedgerPage, type LedgerStatus } from '../lib/aiLedger';

const STATUS_META: Record<LedgerStatus, { icon: typeof History; en: string; el: string; tone: string }> = {
  applied: { icon: CheckCircle2, en: 'Applied', el: 'Εφαρμόστηκε', tone: 'text-emerald-700' },
  undone: { icon: RotateCcw, en: 'Undone', el: 'Αναιρέθηκε', tone: 'text-stone-500' },
  cancelled: { icon: CircleSlash, en: 'Cancelled', el: 'Ακυρώθηκε', tone: 'text-stone-400' },
  failed: { icon: TriangleAlert, en: 'Failed', el: 'Απέτυχε', tone: 'text-red-600' },
};

const when = (iso: string) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/** What the assistant changed for you, and what you turned down — read from the server ledger. */
export function AiActionLedger() {
  const t = useT();
  const [page, setPage] = useState<LedgerPage | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => fetchAiActions().then((next) => { if (alive) { setPage(next); setError(false); } }).catch(() => { if (alive) setError(true); });
    void load();
    window.addEventListener(LEDGER_EVENT, load);
    return () => { alive = false; window.removeEventListener(LEDGER_EVENT, load); };
  }, []);

  const counts = page?.counts ?? {};
  return (
    <section data-testid="ai-action-ledger" className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-900">{t('Action history', 'Ιστορικό ενεργειών')}</h2>
        <History className="h-4 w-4 text-stone-300" aria-hidden="true" />
      </div>
      <p className="text-xs text-stone-500">
        {t('Every change the assistant proposed and what you decided — kept even after you close the chat.', 'Κάθε αλλαγή που πρότεινε ο βοηθός και τι αποφάσισες — μένει και αφού κλείσεις τη συνομιλία.')}
      </p>
      <div className="flex flex-wrap gap-1.5" data-testid="ai-ledger-counts">
        {(Object.keys(STATUS_META) as LedgerStatus[]).map((status) => (
          <span key={status} className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-2 py-0.5 text-xs text-stone-600">
            {t(STATUS_META[status].en, STATUS_META[status].el)} <span className="font-semibold text-stone-900">{counts[status] ?? 0}</span>
          </span>
        ))}
      </div>
      {error && <p className="text-xs text-stone-500" data-testid="ai-ledger-error">{t('History is unavailable right now — your changes are still saved on each page.', 'Το ιστορικό δεν είναι διαθέσιμο τώρα — οι αλλαγές σου είναι αποθηκευμένες σε κάθε σελίδα.')}</p>}
      {page && page.items.length === 0 && (
        <p className="text-xs text-stone-500" data-testid="ai-ledger-empty">{t('Nothing yet. Ask for a change — e.g. “Mark EIN done” — and confirm it.', 'Τίποτα ακόμα. Ζήτα μια αλλαγή — π.χ. «Σημείωσε το EIN ως ολοκληρωμένο» — και επιβεβαίωσέ τη.')}</p>
      )}
      {page && page.items.length > 0 && (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-100" data-testid="ai-ledger-list">
          {page.items.map((item) => {
            const meta = STATUS_META[item.status];
            const Icon = meta.icon;
            return (
              <li key={item.id} className="flex gap-2 px-3 py-2" data-testid={`ai-ledger-item-${item.status}`}>
                <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${meta.tone}`} aria-hidden="true" />
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs text-stone-800 break-words">{item.summary}</p>
                  <p className="text-[11px] text-stone-400">
                    {t(meta.en, meta.el)} · {item.source === 'model' ? t('AI model', 'Μοντέλο AI') : t('Studio action', 'Ενέργεια studio')} · {when(item.at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
