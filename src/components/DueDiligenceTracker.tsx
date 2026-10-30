import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Link2, Loader2, MessageSquare, Plus, RefreshCw, Trash2, Eye } from 'lucide-react';
import { useT, getLang } from '../lib/language';
import { useStored } from '../lib/useStored';
import { askAssistant } from '../lib/assistantBus';
import { keys, readRound, readRoomFiles } from '../lib/localLists';
import { useToast } from '../context/ToastContext';
import {
  DD_CATEGORIES,
  DD_SHARES_EVENT,
  DD_STATUS_LABEL,
  addDDItem,
  createDDShare,
  ddFoundInRoom,
  ddProgress,
  listDDShares,
  readDD,
  refreshDDShare,
  removeDDItem,
  revokeDDShare,
  setDDNote,
  setDDStatus,
  shareUrl,
  type DDCategory,
  type DDShare,
  type DDShareFile,
  type DDStatus,
} from '../lib/dueDiligence';
import { cn } from '../lib/utils';
import { apiErrorText, needsSignIn } from '../lib/studioApi';

const NEXT: Record<DDStatus, DDStatus> = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
const TONE: Record<DDStatus, string> = {
  todo: 'border-stone-200 bg-white text-stone-500',
  in_progress: 'border-amber-200 bg-amber-50 text-amber-700',
  done: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};
const field = 'min-h-9 rounded-lg border border-stone-200 bg-white px-2.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200';

/** Due-diligence checklist + read-only share links for investors. */
export function DueDiligenceTracker({ roomFileNames, ventureName }: { roomFileNames: string[]; ventureName: string }) {
  const t = useT();
  const lang = getLang() === 'el' ? 'el' : 'en';
  const items = useStored(readDD, [keys.dueDiligence]);
  const progress = ddProgress(items);
  const found = ddFoundInRoom(roomFileNames, items);
  const [draft, setDraft] = useState<{ title: string; category: DDCategory }>({ title: '', category: 'corporate' });

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3" data-testid="dd-tracker">
      <div className="space-y-4 xl:col-span-2">
        <div className="space-y-2 rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-stone-900">{t('Due diligence', 'Δέουσα επιμέλεια')}</h2>
              <p className="text-xs text-stone-500" data-testid="dd-progress">
                {t(`${progress.done}/${progress.total} ready · ${progress.inProgress} in progress`, `${progress.done}/${progress.total} έτοιμα · ${progress.inProgress} σε εξέλιξη`)}
              </p>
            </div>
            <button type="button" data-testid="dd-ask" onClick={() => askAssistant('What is still open in due diligence?')} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-stone-200 px-3 text-xs font-medium text-stone-700 transition-colors hover:border-stone-400 hover:text-stone-900">
              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />{t('Ask the assistant', 'Ρώτα τον βοηθό')}
            </button>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${progress.pct}%` }} />
          </div>
          {found.length > 0 && (
            <p className="text-xs text-stone-600" data-testid="dd-found-in-room">
              {t(`${found.length} item(s) look covered by files in your data room — review and mark them ready.`, `${found.length} στοιχεία φαίνεται να καλύπτονται από αρχεία του data room — έλεγξέ τα και σημείωσέ τα έτοιμα.`)}
            </p>
          )}
        </div>

        {DD_CATEGORIES.map((category) => {
          const rows = items.filter((item) => item.category === category.id);
          if (!rows.length) return null;
          return (
            <section key={category.id} className="rounded-xl border border-stone-200 bg-white" data-testid={`dd-category-${category.id}`}>
              <header className="flex items-center justify-between border-b border-stone-100 px-4 py-2.5">
                <h3 className="text-xs font-semibold text-stone-700">{lang === 'el' ? category.el : category.en}</h3>
                <span className="text-[11px] text-stone-400">{rows.filter((r) => r.status === 'done').length}/{rows.length}</span>
              </header>
              <ul className="divide-y divide-stone-100">
                {rows.map((item) => (
                  <li key={item.id} className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center" data-testid={`dd-item-${item.id}`}>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-xs font-medium', item.status === 'done' ? 'text-stone-500' : 'text-stone-900')}>
                        {lang === 'el' ? item.el : item.en}
                        {found.includes(item.id) && <span className="ml-1.5 text-[10px] font-semibold text-blue-700">{t('file found', 'βρέθηκε αρχείο')}</span>}
                      </p>
                      <input
                        data-testid={`dd-note-${item.id}`}
                        className="mt-1 w-full rounded-md border border-transparent bg-stone-50 px-2 py-1 text-[11px] text-stone-700 hover:border-stone-200 focus:border-stone-300 focus:outline-none"
                        defaultValue={item.note ?? ''}
                        placeholder={t('Note (owner, link, what is missing)…', 'Σημείωση (υπεύθυνος, σύνδεσμος, τι λείπει)…')}
                        onBlur={(e) => { if (e.target.value.trim() !== (item.note ?? '')) setDDNote(item.id, e.target.value); }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        data-testid={`dd-status-${item.id}`}
                        onClick={() => setDDStatus(item.id, NEXT[item.status])}
                        title={t('Click to change status', 'Κλικ για αλλαγή κατάστασης')}
                        className={cn('inline-flex min-h-8 min-w-[6.5rem] items-center justify-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold transition-colors', TONE[item.status])}
                      >
                        {item.status === 'done' && <Check className="h-3 w-3" />}
                        {lang === 'el' ? DD_STATUS_LABEL[item.status].el : DD_STATUS_LABEL[item.status].en}
                      </button>
                      {item.custom && (
                        <button type="button" aria-label={t('Remove', 'Αφαίρεση')} data-testid={`dd-remove-${item.id}`} onClick={() => removeDDItem(item.id)} className="rounded-md p-1.5 text-stone-400 transition-colors hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <form
          data-testid="dd-add-form"
          onSubmit={(e) => { e.preventDefault(); if (draft.title.trim()) { addDDItem(draft.title, draft.category); setDraft({ ...draft, title: '' }); } }}
          className="flex flex-col gap-2 rounded-xl border border-dashed border-stone-300 p-3 sm:flex-row"
        >
          <input data-testid="dd-add-title" className={cn(field, 'flex-1')} placeholder={t('Add a request an investor asked for…', 'Πρόσθεσε κάτι που ζήτησε ένας επενδυτής…')} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <select data-testid="dd-add-category" className={field} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as DDCategory })} aria-label={t('Category', 'Κατηγορία')}>
            {DD_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{lang === 'el' ? c.el : c.en}</option>)}
          </select>
          <button type="submit" data-testid="dd-add-submit" className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white hover:bg-stone-800">
            <Plus className="h-3.5 w-3.5" />{t('Add', 'Προσθήκη')}
          </button>
        </form>
      </div>

      <DDSharePanel ventureName={ventureName} />
    </div>
  );
}

function DDSharePanel({ ventureName }: { ventureName: string }) {
  const t = useT();
  const toast = useToast();
  const investors = useStored(() => (readRound().pipeline ?? []).filter((p) => p.stage !== 'Passed').map((p) => p.name), [keys.round]);
  const [shares, setShares] = useState<DDShare[] | null>(null);
  const [failed, setFailed] = useState<'' | 'sign-in' | 'down'>('');
  const [confirming, setConfirming] = useState('');
  const [who, setWho] = useState('');
  const [notes, setNotes] = useState(false);
  const roomFiles = useStored(readRoomFiles, [keys.room]);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState('');

  const load = useCallback(() => {
    listDDShares().then((list) => { setShares(list); setFailed(''); }).catch((err) => setFailed(needsSignIn(err) ? 'sign-in' : 'down'));
  }, []);
  useEffect(() => {
    load();
    window.addEventListener(DD_SHARES_EVENT, load);
    return () => window.removeEventListener(DD_SHARES_EVENT, load);
  }, [load]);

  const copy = (token: string) => {
    void navigator.clipboard?.writeText(shareUrl(token)).catch(() => undefined);
    setCopied(token);
    window.setTimeout(() => setCopied(''), 1500);
  };
  const create = async () => {
    setBusy('create');
    try {
      const files: DDShareFile[] = roomFiles.filter((f) => picked.includes(f.name) && f.url).map((f) => ({ name: f.name, size: f.size, url: f.url! }));
      const share = await createDDShare(who.trim(), ventureName, notes, files);
      setPicked([]);
      copy(share.token);
      setWho('');
      toast.success(t('Share link created and copied', 'Ο σύνδεσμος δημιουργήθηκε και αντιγράφηκε'), t('Paste it into your email to the investor.', 'Επικόλλησέ τον στο email προς τον επενδυτή.'));
    } catch (err) {
      toast.error(t('Could not create the link', 'Δεν δημιουργήθηκε ο σύνδεσμος'), apiErrorText(err, t));
    } finally { setBusy(''); }
  };
  const act = async (token: string, kind: 'refresh' | 'revoke') => {
    setBusy(token);
    setConfirming('');
    try {
      if (kind === 'refresh') {
        await refreshDDShare(token, ventureName, notes);
        toast.success(t('Link updated', 'Ο σύνδεσμος ενημερώθηκε'), t('The investor now sees your current checklist.', 'Ο επενδυτής βλέπει πλέον την τρέχουσα λίστα σου.'));
      } else {
        await revokeDDShare(token);
        toast.success(t('Link revoked', 'Ο σύνδεσμος ανακλήθηκε'), t('Anyone opening it now sees that it is no longer available.', 'Όποιος τον ανοίξει βλέπει πλέον ότι δεν είναι διαθέσιμος.'));
      }
    } catch (err) {
      toast.error(t('That did not go through', 'Δεν ολοκληρώθηκε'), apiErrorText(err, t));
    } finally { setBusy(''); }
  };

  return (
    <aside className="h-fit space-y-3 rounded-xl border border-stone-200 bg-white p-4" data-testid="dd-share-panel">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-stone-500" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-stone-900">{t('Share with investors', 'Κοινοποίηση σε επενδυτές')}</h3>
      </div>
      <p className="text-xs text-stone-500">{t('A read-only page with your checklist status — the investor needs no account. Files go only if you attach them; update or revoke the link any time, and see when it is opened.', 'Σελίδα μόνο για ανάγνωση με την κατάσταση της λίστας — ο επενδυτής δεν χρειάζεται λογαριασμό. Αρχεία πάνε μόνο αν τα επισυνάψεις· ενημέρωσε ή ανακάλεσε τον σύνδεσμο όποτε θες και δες πότε ανοίγει.')}</p>
      <input data-testid="dd-share-investor" list="dd-share-investors" className={cn(field, 'w-full')} placeholder={t('Investor (optional)', 'Επενδυτής (προαιρετικά)')} value={who} onChange={(e) => setWho(e.target.value)} />
      <datalist id="dd-share-investors">{investors.map((name) => <option key={name} value={name} />)}</datalist>
      <label className="flex items-center gap-2 text-xs text-stone-600">
        <input type="checkbox" data-testid="dd-share-notes" checked={notes} onChange={(e) => setNotes(e.target.checked)} />
        {t('Include my notes', 'Να συμπεριληφθούν οι σημειώσεις μου')}
      </label>
      {roomFiles.length > 0 && (
        <details className="rounded-lg border border-stone-100 px-2.5 py-2" data-testid="dd-share-files">
          <summary className="cursor-pointer text-xs font-medium text-stone-700">{t(`Attach data-room files${picked.length ? ` (${picked.length})` : ''}`, `Επισύναψη αρχείων data room${picked.length ? ` (${picked.length})` : ''}`)}</summary>
          <ul className="mt-2 space-y-1">
            {roomFiles.map((f) => (
              <li key={f.name}>
                <label className={cn('flex items-center gap-2 text-xs', f.url ? 'text-stone-700' : 'text-stone-400')} title={f.url ? undefined : t('Sample file — upload a real one to share it', 'Δείγμα — ανέβασε πραγματικό αρχείο για κοινοποίηση')}>
                  <input type="checkbox" data-testid={`dd-share-file-${f.name.replace(/[^a-z0-9]/gi, '-')}`} disabled={!f.url} checked={picked.includes(f.name)} onChange={(e) => setPicked(e.target.checked ? [...picked, f.name].slice(0, 10) : picked.filter((n) => n !== f.name))} />
                  <span className="truncate">{f.name}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-stone-400">{f.url ? f.size : t('sample', 'δείγμα')}</span>
                </label>
              </li>
            ))}
          </ul>
        </details>
      )}
      <button type="button" data-testid="dd-share-create" disabled={busy === 'create'} onClick={() => { void create(); }} className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50">
        {busy === 'create' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
        {t('Create share link', 'Δημιουργία συνδέσμου')}
      </button>

      <div className="space-y-2 border-t border-stone-100 pt-3" data-testid="dd-share-list">
        {failed === 'sign-in' && <p className="text-xs text-stone-500" data-testid="dd-share-sign-in">{t('Sign in to create share links — they belong to your account.', 'Συνδέσου για να δημιουργείς συνδέσμους — ανήκουν στον λογαριασμό σου.')}</p>}
        {failed === 'down' && <p className="text-xs text-red-600">{t('Share links are unavailable right now — your checklist is saved.', 'Οι σύνδεσμοι δεν είναι διαθέσιμοι τώρα — η λίστα σου είναι αποθηκευμένη.')}</p>}
        {shares?.length === 0 && <p className="text-xs text-stone-400">{t('No active links yet.', 'Κανένας ενεργός σύνδεσμος ακόμα.')}</p>}
        {shares?.map((share) => (
          <div key={share.token} className="space-y-1 rounded-lg border border-stone-100 p-2.5" data-testid={`dd-share-${share.token}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-semibold text-stone-900">{share.investorName || t('General link', 'Γενικός σύνδεσμος')}</p>
              <span className="inline-flex items-center gap-1 text-[11px] text-stone-500" data-testid={`dd-share-views-${share.token}`}><Eye className="h-3 w-3" />{share.views}</span>
            </div>
            <p className="text-[11px] text-stone-400">
              {t(`Snapshot ${share.done}/${share.total} ready`, `Στιγμιότυπο ${share.done}/${share.total} έτοιμα`)}
              {share.files?.length ? ` · ${t(`${share.files.length} file${share.files.length === 1 ? '' : 's'}`, `${share.files.length} αρχεία`)}` : ''}
              {share.lastViewedAt ? ` · ${t('last opened', 'άνοιξε')} ${new Date(share.lastViewedAt).toLocaleDateString()}` : ` · ${t('not opened yet', 'δεν έχει ανοιχτεί')}`}
            </p>
            <div className="flex gap-1">
              <button type="button" data-testid={`dd-share-copy-${share.token}`} onClick={() => copy(share.token)} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-stone-600 hover:text-stone-900">
                {copied === share.token ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{t('Copy', 'Αντιγραφή')}
              </button>
              <button type="button" data-testid={`dd-share-refresh-${share.token}`} disabled={busy === share.token} onClick={() => { void act(share.token, 'refresh'); }} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-stone-600 hover:text-stone-900">
                <RefreshCw className="h-3 w-3" />{t('Update', 'Ενημέρωση')}
              </button>
              <a href={`/dd/${share.token}`} target="_blank" rel="noreferrer" data-testid={`dd-share-open-${share.token}`} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-stone-600 hover:text-stone-900">
                <Eye className="h-3 w-3" />{t('Preview', 'Προβολή')}
              </a>
              {confirming === share.token ? (
                <button type="button" data-testid={`dd-share-revoke-confirm-${share.token}`} disabled={busy === share.token} onClick={() => { void act(share.token, 'revoke'); }} onBlur={() => setConfirming('')} className="ml-auto inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-1 text-[11px] font-semibold text-red-700">
                  {t('Revoke for good?', 'Οριστική ανάκληση;')}
                </button>
              ) : (
                <button type="button" data-testid={`dd-share-revoke-${share.token}`} disabled={busy === share.token} onClick={() => setConfirming(share.token)} className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-stone-400 hover:text-red-600">
                  {t('Revoke', 'Ανάκληση')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
