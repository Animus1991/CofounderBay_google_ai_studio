import { useState } from 'react';
import { ConfirmDialog } from './Modal';
import { useT } from '../../lib/language';

export default function DraftNotice({ dirty, durable, restored, onDiscard }: {
 dirty: boolean; durable: boolean; restored: boolean; onDiscard: () => void;
}) {
 const t = useT();
 const [confirming, setConfirming] = useState(false);
 if (!dirty) return null;
 return (
  <>
   <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
    <span role="status" aria-live="polite" className={!durable ? 'text-amber-700' : ''}>
     {!durable
      ? t('Draft is only in memory. Keep this page open; browser storage is unavailable.', 'Το πρόχειρο υπάρχει μόνο προσωρινά. Κράτησε τη σελίδα ανοιχτή· η αποθήκευση στη συσκευή δεν είναι διαθέσιμη.')
      : restored
       ? t('Draft restored from this device · not submitted', 'Επαναφέρθηκε πρόχειρο από τη συσκευή · δεν έχει υποβληθεί')
       : t('Draft kept on this device · not submitted', 'Το πρόχειρο διατηρείται στη συσκευή · δεν έχει υποβληθεί')}
    </span>
    <button type="button" className="underline underline-offset-2 text-stone-600" onClick={() => setConfirming(true)}>{t('Discard draft', 'Διαγραφή πρόχειρου')}</button>
   </div>
   <ConfirmDialog open={confirming} onClose={() => setConfirming(false)} onConfirm={() => { setConfirming(false); onDiscard(); }}
    title={t('Discard these changes?', 'Να διαγραφούν αυτές οι αλλαγές;')}
    description={t('The unsubmitted draft will be removed. Previously saved data will not change.', 'Θα διαγραφεί το μη υποβληθέν πρόχειρο. Τα ήδη αποθηκευμένα δεδομένα δεν θα αλλάξουν.')}
    confirmLabel={t('Discard draft', 'Διαγραφή πρόχειρου')} variant="danger" />
  </>
 );
}
