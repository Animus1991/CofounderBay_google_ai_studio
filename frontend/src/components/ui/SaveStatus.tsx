import { scopedKey } from '../../lib/localLists';
import { retryListSync } from '../../lib/cloudSync';
import { useSavePhase } from '../../lib/saveFeedback';
import { useT } from '../../lib/language';

export default function SaveStatus({ listKey }: { listKey: string }) {
 const t = useT();
 const phase = useSavePhase(scopedKey(listKey));
 if (phase === 'idle') return null;
 const copy = {
  local: t('Saved on this device', 'Αποθηκεύτηκε στη συσκευή'),
  syncing: t('Saved on this device · syncing…', 'Αποθηκεύτηκε στη συσκευή · συγχρονίζεται…'),
  synced: t('Saved to your account', 'Αποθηκεύτηκε στον λογαριασμό'),
  offline: t('Saved on this device · offline', 'Αποθηκεύτηκε στη συσκευή · εκτός σύνδεσης'),
  error: t('Saved on this device · account sync failed', 'Αποθηκεύτηκε στη συσκευή · ο συγχρονισμός απέτυχε'),
  temporary: t('Not saved to this device. Keep this page open; browser storage is unavailable.', 'Δεν αποθηκεύτηκε στη συσκευή. Κράτησε τη σελίδα ανοιχτή· ο αποθηκευτικός χώρος δεν είναι διαθέσιμος.'),
 }[phase];
 return (
  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
   <span role="status" aria-live="polite" className={phase === 'error' || phase === 'temporary' ? 'text-amber-700' : ''}>{copy}</span>
   {phase === 'error' && <button type="button" className="underline underline-offset-2 text-stone-700" onClick={() => void retryListSync(listKey)}>{t('Retry sync', 'Νέος συγχρονισμός')}</button>}
  </div>
 );
}
