import { useMemo } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Link2, X } from 'lucide-react';
import PageShell from '../components/ui/PageShell';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import EmptyHint, { AskLink } from '../components/ui/EmptyHint';
import { useAuth } from '../App';
import { useT } from '../lib/language';
import { cn } from '../lib/utils';
import { usePeople } from '../lib/directory';
import { avatarOf, cofounderPool, findPerson, type Person } from '../lib/peopleSource';
import { CONFIDENCE_LABELS, WEIGHTS, fromProfile, rankPeople } from '../lib/compatibility';
import { mergeFitIntoViewer } from '../lib/fitCheck';
import { MAX_COMPARE, compareCandidates } from '../lib/matchCompare';
import { usePageControls } from '../lib/pageControls';
import { useUIStore } from '../stores/useUIStore';
import { absoluteUrl } from '../lib/download';
import { useToast } from '../context/ToastContext';

/**
 * Up to three candidates side by side (adapted from cofoundersbay /matches/compare).
 * The verdict comes first, then the people, then one row per dimension of the
 * same scorer Matches uses. `?ids=` holds the choice so a link or the assistant
 * can open a comparison; without it the page compares your top three.
 */
export default function MatchCompare() {
 const t = useT();
 const navigate = useNavigate();
 const { user, profile } = useAuth();
 const { people, loading } = usePeople(user?.uid);
 const [params, setParams] = useSearchParams();
 const toast = useToast();

 const viewer = useMemo(() => fromProfile(mergeFitIntoViewer(profile)), [profile]);
 const pool = useMemo(() => {
  const ids = new Set(cofounderPool().map((person) => person.id));
  return people.filter((person) => ids.has(person.id));
 }, [people]);
 const ranked = useMemo(() => rankPeople(viewer, pool).map((row) => row.person), [viewer, pool]);

 const requested = (params.get('ids') ?? '').split(',').map((id) => id.trim()).filter(Boolean);
 const chosen: Person[] = requested.length
  ? requested.map((id) => pool.find((person) => person.id === id) ?? findPerson(id)).filter((person): person is Person => Boolean(person)).slice(0, MAX_COMPARE)
  : ranked.slice(0, MAX_COMPARE);
 const { columns, rows, summary } = compareCandidates(viewer, chosen);
 const addable = ranked.filter((person) => !chosen.some((item) => item.id === person.id));

 const setChosen = (next: Person[]) => setParams(next.length ? { ids: next.map((person) => person.id).join(',') } : {}, { replace: true });
 const names = chosen.map((person) => person.fullName);
 // The link names the people, so it opens this comparison and not the reader's own top three.
 const copyLink = async () => {
  try {
   await navigator.clipboard.writeText(absoluteUrl(`/matches/compare?ids=${chosen.map((person) => person.id).join(',')}`));
   toast.success(t('Link copied', 'Ο σύνδεσμος αντιγράφηκε'));
  } catch {
   toast.error(t('The link could not be copied', 'Ο σύνδεσμος δεν αντιγράφηκε'));
  }
 };

 usePageControls(() => [
  { id: 'compare-top', en: 'Compare my top three', el: 'Σύγκριση των τριών πρώτων', run: () => setParams({}, { replace: true }) },
  ...(chosen.length ? [{ id: 'compare-copy-link', en: 'Copy a link to this comparison', el: 'Αντιγραφή συνδέσμου αυτής της σύγκρισης', run: () => { void copyLink(); } }] : []),
 ], [setParams, chosen.map((person) => person.id).join(',')]);

 return (
  <PageShell
   title={t('Compare matches', 'Σύγκριση αντιστοιχίσεων')}
   description={t(`Up to ${MAX_COMPARE} people side by side, on the same score as Matches.`, `Έως ${MAX_COMPARE} άτομα δίπλα-δίπλα, με το ίδιο σκορ με τις Αντιστοιχίσεις.`)}
   actions={
    <NavLink to="/matches" data-ui="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 transition-colors hover:border-stone-300 hover:text-stone-900">
     <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> {t('Matches', 'Αντιστοιχίσεις')}
    </NavLink>
   }
  >
   <div className="space-y-4" data-testid="match-compare">
    {/* The verdict first: what a founder came here to learn. */}
    <section className="rounded-2xl border border-stone-200 bg-white p-4" aria-live="polite">
     <p className="text-sm text-stone-900">{loading && columns.length < 2 ? t('Loading the directory…', 'Φόρτωση καταλόγου…') : t(summary.en, summary.el)}</p>
     {columns.length >= 2 && (
      <div className="mt-2">
       <AskLink prompt={`Compare ${names.join(' and ')}`}>{t('Ask the assistant what to weigh', 'Ρώτα τον βοηθό τι να ζυγίσεις')}</AskLink>
      </div>
     )}
    </section>

    {/* Who is compared: remove anyone, add from your ranked matches. */}
    <section className="flex flex-wrap items-center gap-2" aria-label={t('People compared', 'Άτομα στη σύγκριση')}>
     {chosen.map((person) => (
      <span key={person.id} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white py-0.5 pl-0.5 pr-1 text-xs font-medium text-stone-900">
       <Avatar src={avatarOf(person) || undefined} fallback={person.fullName} alt="" size="xs" />
       {person.fullName}
       <button
        type="button"
        onClick={() => setChosen(chosen.filter((item) => item.id !== person.id))}
        aria-label={t(`Remove ${person.fullName}`, `Αφαίρεση: ${person.fullName}`)}
        className="rounded-full p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-900 tap-area"
       >
        <X className="h-3 w-3" aria-hidden="true" />
       </button>
      </span>
     ))}
     {chosen.length > 0 && (
      <button
       type="button"
       onClick={() => { void copyLink(); }}
       className="inline-flex min-h-8 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2 text-xs text-stone-700 hover:bg-stone-50"
      >
       <Link2 className="h-3 w-3" aria-hidden="true" /> {t('Copy link', 'Αντιγραφή συνδέσμου')}
      </button>
     )}
     {chosen.length < MAX_COMPARE && addable.length > 0 && (
      <label className="inline-flex items-center gap-1.5 text-xs text-stone-500">
       <span className="sr-only">{t('Add a person to compare', 'Πρόσθεσε άτομο στη σύγκριση')}</span>
       <select
        value=""
        onChange={(e) => { const person = addable.find((item) => item.id === e.target.value); if (person) setChosen([...chosen, person]); }}
        className="min-h-8 rounded-xl border border-stone-200 bg-white px-2 text-xs text-stone-700"
       >
        <option value="">{t('+ Add a match', '+ Προσθήκη αντιστοίχισης')}</option>
        {addable.slice(0, 12).map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}
       </select>
      </label>
     )}
    </section>

    {columns.length === 0 ? (
     <EmptyHint
      title={t('No one to compare yet.', 'Δεν υπάρχει κανείς για σύγκριση ακόμη.')}
      detail={t('Matches ranks founders once your profile has skills and what you look for.', 'Οι Αντιστοιχίσεις κατατάσσουν ιδρυτές μόλις το προφίλ έχει δεξιότητες και τι ψάχνεις.')}
     >
      <AskLink prompt="Who is my best match?" />
     </EmptyHint>
    ) : (
     <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <table className="w-full table-fixed text-left">
       <caption className="sr-only">{t('Your matches compared, dimension by dimension', 'Οι αντιστοιχίσεις σου συγκριτικά, διάσταση προς διάσταση')}</caption>
       <colgroup>
        <col className="w-[30%] sm:w-[24%]" />
        {columns.map((column) => <col key={column.person.id} />)}
       </colgroup>
       <thead>
        <tr className="border-b border-stone-100">
         <th scope="col" className="px-3 py-3 text-xs font-medium text-stone-500">{t('Dimension', 'Διάσταση')}</th>
         {columns.map(({ person }) => (
          <th key={person.id} scope="col" className="px-2 py-3 align-bottom">
           <span className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
            <Avatar src={avatarOf(person) || undefined} fallback={person.fullName} alt="" size="sm" />
            <span className="min-w-0 truncate text-xs font-semibold text-stone-900">
             <span className="sm:hidden">{person.fullName.split(' ')[0]}</span>
             <span className="hidden sm:inline">{person.fullName}</span>
            </span>
           </span>
          </th>
         ))}
        </tr>
       </thead>
       <tbody>
        {rows.map((row) => (
         <tr key={row.key} className={cn('border-b border-stone-100 last:border-0', row.key === 'overall' && 'bg-stone-50/60')}>
          <th scope="row" className="px-3 py-2.5 text-xs font-medium text-stone-700">
           {t(row.label.en, row.label.el)}
           {row.key !== 'overall' && <span className="block text-[11px] font-normal text-stone-400">{t(`weight ${Math.round(WEIGHTS[row.key] * 100)}%`, `βάρος ${Math.round(WEIGHTS[row.key] * 100)}%`)}</span>}
          </th>
          {row.scores.map((score, index) => (
           <td key={columns[index]?.person.id ?? index} className="px-2 py-2.5 align-middle">
            {score == null ? (
             <span className="text-xs text-stone-400" title={t('One of the two profiles has no data here', 'Λείπουν στοιχεία σε ένα από τα δύο προφίλ')}>—</span>
            ) : (
             <span className="flex flex-col gap-1">
              <span className="flex flex-wrap items-center gap-1">
               <span className={cn('text-xs tabular-nums', row.leader === index ? 'font-semibold text-stone-900' : 'text-stone-600')}>{score}%</span>
               {/* Phones: the green bar and bold number carry the lead; the word did not fit an 80px column. */}
               {row.leader === index && (
                <>
                 <span className="sr-only sm:hidden">{t('Leads', 'Προβάδισμα')}</span>
                 <span className="hidden sm:inline-flex"><Badge variant="success">{t('Leads', 'Προβάδισμα')}</Badge></span>
                </>
               )}
              </span>
              <span className="h-1 w-full overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
               <span className={cn('block h-full rounded-full', row.leader === index ? 'bg-emerald-500' : 'bg-stone-400')} style={{ width: `${score}%` }} />
              </span>
             </span>
            )}
           </td>
          ))}
         </tr>
        ))}
        <tr>
         <th scope="row" className="px-3 py-2.5 text-xs font-medium text-stone-700">{t('Confidence', 'Αξιοπιστία')}</th>
         {columns.map(({ person, fit }) => (
          <td key={person.id} className="px-2 py-2.5 text-[11px] text-stone-500">
           {fit.confidence ? t(CONFIDENCE_LABELS[fit.confidence].en.split(' — ')[0] ?? '', CONFIDENCE_LABELS[fit.confidence].el.split(' — ')[0] ?? '') : '—'}
          </td>
         ))}
        </tr>
        <tr className="border-t border-stone-100">
         <td className="px-3 py-2.5"><span className="sr-only">{t('Actions', 'Ενέργειες')}</span></td>
         {columns.map(({ person }) => (
          <td key={person.id} className="px-2 py-2.5">
           <span className="flex flex-col items-start gap-1.5 sm:flex-row sm:flex-wrap">
            <button type="button" onClick={() => useUIStore.getState().setMatchBreakdownModalOpen(true, person.id)} className="text-xs font-medium text-stone-900 hover:underline tap-area">
             {t('Why?', 'Γιατί;')}
            </button>
            <button type="button" onClick={() => navigate(`/profile/${person.id}`)} className="text-xs font-medium text-stone-600 hover:text-stone-900 hover:underline tap-area">
             {t('Profile', 'Προφίλ')}
            </button>
           </span>
          </td>
         ))}
        </tr>
       </tbody>
      </table>
     </div>
    )}
    {columns.length > 0 && (
     <p className="text-xs text-stone-400">{t('A green bar marks who leads a row. Every score is the same one Matches and the score breakdown show; "—" means one profile has no data for that dimension.', 'Η πράσινη μπάρα δείχνει ποιος προηγείται σε κάθε γραμμή. Κάθε σκορ είναι το ίδιο με τις Αντιστοιχίσεις και την ανάλυση σκορ· το «—» σημαίνει ότι σε ένα προφίλ λείπουν στοιχεία γι’ αυτή τη διάσταση.')}</p>
    )}
   </div>
  </PageShell>
 );
}
