import { useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../../firebase';
import { useT } from '../../lib/language';
import { useToast } from '../../context/ToastContext';

/** Whether the account's email is confirmed, and a way to ask for the link again. */
export default function EmailVerificationRow() {
 const t = useT();
 const toast = useToast();
 const [sending, setSending] = useState(false);
 const user = auth.currentUser;
 if (!user?.email) return null;
 if (user.emailVerified) {
  return <p className="text-sm text-emerald-700 sm:col-span-2" data-testid="email-verified">{t('Your email is confirmed.', 'Το email σου είναι επιβεβαιωμένο.')}</p>;
 }
 const resend = async () => {
  setSending(true);
  try {
   await sendEmailVerification(user, { url: `${window.location.origin}/dashboard` });
   toast.success(t('Link sent', 'Ο σύνδεσμος στάλθηκε'), t(`Check ${user.email}.`, `Δες το ${user.email}.`));
  } catch {
   toast.error(t('The link could not be sent', 'Ο σύνδεσμος δεν στάλθηκε'), t('Try again in a few minutes.', 'Δοκίμασε ξανά σε λίγα λεπτά.'));
  } finally {
   setSending(false);
  }
 };
 return (
  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600 sm:col-span-2" data-testid="email-unverified">
   {t('Your email is not confirmed yet.', 'Το email σου δεν έχει επιβεβαιωθεί ακόμη.')}
   <button type="button" disabled={sending} onClick={() => { void resend(); }} className="font-medium text-stone-900 underline disabled:opacity-50">
    {t('Send the link again', 'Στείλε ξανά τον σύνδεσμο')}
   </button>
  </p>
 );
}
