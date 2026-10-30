import { useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, Send } from 'lucide-react';
import Modal from './ui/Modal';
import { useT } from '../lib/language';
import { useToast } from '../context/ToastContext';
import { keys, logActivity, readRound, updatePipelineInvestor } from '../lib/localLists';
import { useStored } from '../lib/useStored';
import { EMAIL_RE, sendEmail, splitDraft, type EmailStatus } from '../lib/outreach';
import { useEmailStatus } from '../lib/outreachQueries';
import { apiErrorText } from '../lib/studioApi';

const field = 'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200';

/** Review → send (or log, until a provider is connected) one investor email; the CRM card records it. */
export function SendEmailModal({ open, onClose, draft, investorId }: { open: boolean; onClose: () => void; draft: string; investorId?: string }) {
  const t = useT();
  const toast = useToast();
  const pipeline = useStored(() => readRound().pipeline ?? [], [keys.round]);
  const initial = useMemo(() => splitDraft(draft), [draft]);
  const [who, setWho] = useState(investorId ?? '');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const statusQuery = useEmailStatus(open);
  const status: EmailStatus | null = statusQuery.data ?? (statusQuery.isError ? { provider: null, configured: false } : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSubject(initial.subject);
    setBody(initial.body);
    setError('');
    const match = investorId ?? pipeline.find((p) => draft.includes(p.name) || draft.includes(`Hi ${p.name.split(/\s+/)[0]}`))?.investorId ?? '';
    setWho(match);
    setTo(pipeline.find((p) => p.investorId === match)?.email ?? '');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const investor = pipeline.find((p) => p.investorId === who);
  const valid = EMAIL_RE.test(to.trim()) && subject.trim() && body.trim();

  const submit = async () => {
    if (!valid) { setError(t('Add a valid address, a subject and a message.', 'Πρόσθεσε έγκυρη διεύθυνση, θέμα και μήνυμα.')); return; }
    setBusy(true);
    try {
      const entry = await sendEmail({ to: to.trim(), subject: subject.trim(), body: body.trim(), investorId: investor?.investorId, investorName: investor?.name });
      if (investor) {
        updatePipelineInvestor(investor.investorId, { email: to.trim(), lastEmail: { at: entry.at, subject: entry.subject, status: entry.status } });
        logActivity({ kind: 'message', title: `Email ${entry.status === 'sent' ? 'sent' : 'logged'}: ${investor.name}`, titleEl: `Email ${entry.status === 'sent' ? 'στάλθηκε' : 'καταγράφηκε'}: ${investor.name}`, href: '/fundraising?tab=crm' });
      }
      if (entry.status === 'sent') toast.success(t('Email sent', 'Το email στάλθηκε'), to.trim());
      else if (entry.status === 'queued') toast.info(t('Logged — not sent', 'Καταγράφηκε — δεν στάλθηκε'), t('Connect an email provider to send from the app.', 'Σύνδεσε πάροχο email για αποστολή από την εφαρμογή.'));
      else toast.error(t('The provider rejected it', 'Ο πάροχος το απέρριψε'), entry.detail ?? '');
      onClose();
    } catch (err) {
      setError(apiErrorText(err, t));
    } finally {
      setBusy(false);
    }
  };

  const mailto = `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <Modal open={open} onClose={onClose} title={t('Send email', 'Αποστολή email')} size="md">
      <div className="space-y-3" data-testid="send-email-modal">
        <div className="grid gap-2 sm:grid-cols-2">
          <select data-testid="send-email-investor" className={field} value={who} onChange={(e) => { setWho(e.target.value); setTo(pipeline.find((p) => p.investorId === e.target.value)?.email ?? to); }} aria-label={t('Investor', 'Επενδυτής')}>
            <option value="">{t('No CRM investor', 'Χωρίς επενδυτή CRM')}</option>
            {pipeline.map((p) => <option key={p.investorId} value={p.investorId}>{p.name}</option>)}
          </select>
          <input data-testid="send-email-to" type="email" className={field} placeholder={t('name@fund.com', 'name@fund.com')} value={to} onChange={(e) => setTo(e.target.value)} aria-label={t('To', 'Προς')} />
        </div>
        <input data-testid="send-email-subject" className={field} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('Subject', 'Θέμα')} aria-label={t('Subject', 'Θέμα')} />
        <textarea data-testid="send-email-body" rows={10} className={`${field} resize-y leading-relaxed`} value={body} onChange={(e) => setBody(e.target.value)} aria-label={t('Message', 'Μήνυμα')} />
        {status && !status.configured && (
          <p className="text-xs text-amber-700" data-testid="send-email-no-provider">{t('No email provider yet — it will be logged, not sent.', 'Δεν υπάρχει πάροχος email ακόμη — θα καταγραφεί, δεν θα σταλεί.')}</p>
        )}
        {error && <p className="text-xs text-red-600" data-testid="send-email-error">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <a href={mailto} data-testid="send-email-mailto" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-200 px-3 text-xs font-medium text-stone-700 hover:border-stone-400">
            <Mail className="h-3.5 w-3.5" />{t('Open in mail app', 'Άνοιγμα στο mail')}
          </a>
          <button type="button" data-testid="send-email-submit" disabled={busy} onClick={() => { void submit(); }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {status?.configured ? t('Send', 'Αποστολή') : t('Log email', 'Καταγραφή')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
