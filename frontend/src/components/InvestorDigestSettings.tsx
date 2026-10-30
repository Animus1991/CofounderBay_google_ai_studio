import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Eye, Loader2, Send } from 'lucide-react';
import Card from './ui/Card';
import { useT } from '../lib/language';
import { useToast } from '../context/ToastContext';
import {
  DEFAULT_DIGEST, EMAIL_RE, digestHistory, emailStatus, getDigestSettings, previewDigest, saveDigestSettings, sendDigestNow,
  type DigestPreview, type DigestRun, type DigestSettings,
} from '../lib/outreach';

const DAYS: [string, string][] = [['Sunday', 'Κυριακή'], ['Monday', 'Δευτέρα'], ['Tuesday', 'Τρίτη'], ['Wednesday', 'Τετάρτη'], ['Thursday', 'Πέμπτη'], ['Friday', 'Παρασκευή'], ['Saturday', 'Σάββατο']];
const field = 'min-h-9 rounded-lg border border-stone-200 bg-white px-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200';

/** Settings → Notifications: when the weekly investor digest goes out, to whom, plus preview / send now / history. */
export function InvestorDigestSettings() {
  const t = useT();
  const toast = useToast();
  const [settings, setSettings] = useState<DigestSettings>(DEFAULT_DIGEST);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<DigestPreview | null>(null);
  const [history, setHistory] = useState<DigestRun[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);

  const reload = useCallback(() => { digestHistory().then(setHistory).catch(() => undefined); }, []);
  useEffect(() => {
    getDigestSettings().then((s) => setSettings({ ...DEFAULT_DIGEST, ...s, email: s.email ?? '' })).catch(() => undefined).finally(() => setLoaded(true));
    emailStatus().then((s) => setConfigured(s.configured)).catch(() => setConfigured(false));
    reload();
  }, [reload]);

  const save = async (next: DigestSettings) => {
    setError('');
    if (next.enabled && !EMAIL_RE.test(next.email ?? '')) { setError(t('Add a valid email address first.', 'Πρόσθεσε πρώτα έγκυρο email.')); return; }
    setBusy('save');
    try {
      const saved = await saveDigestSettings({ ...next, email: next.email || null });
      setSettings({ ...DEFAULT_DIGEST, ...saved, email: saved.email ?? '' });
      toast.success(t('Digest schedule saved', 'Το πρόγραμμα αποθηκεύτηκε'));
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); } finally { setBusy(''); }
  };
  const run = async (kind: 'preview' | 'send') => {
    setBusy(kind); setError('');
    try {
      const out = kind === 'preview' ? await previewDigest() : await sendDigestNow();
      setPreview(out);
      if (kind === 'send') {
        toast[out.status === 'sent' ? 'success' : 'info'](out.status === 'sent' ? t('Digest sent', 'Η σύνοψη στάλθηκε') : t('Digest logged — not sent', 'Καταγράφηκε — δεν στάλθηκε'));
        reload();
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); } finally { setBusy(''); }
  };

  return (
    <div className="xl:col-span-3" data-testid="investor-digest-settings">
    <Card className="p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-900">{t('Weekly investor digest', 'Εβδομαδιαία σύνοψη επενδυτών')}</h3>
          <p className="text-xs text-stone-500">{t('Pipeline moves, follow-ups and due diligence.', 'Μετακινήσεις, follow-up και δέουσα επιμέλεια.')}</p>
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-medium text-stone-700">
          <input type="checkbox" data-testid="digest-enabled" disabled={!loaded || busy === 'save'} checked={settings.enabled} onChange={(e) => { void save({ ...settings, enabled: e.target.checked }); }} />
          {settings.enabled ? t('On', 'Ενεργό') : t('Off', 'Ανενεργό')}
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <select data-testid="digest-day" className={field} value={settings.day} onChange={(e) => setSettings({ ...settings, day: Number(e.target.value) })} aria-label={t('Day', 'Ημέρα')}>
          {DAYS.map(([en, el], i) => <option key={en} value={i}>{t(en, el)}</option>)}
        </select>
        <select data-testid="digest-hour" className={field} value={settings.hour} onChange={(e) => setSettings({ ...settings, hour: Number(e.target.value) })} aria-label={t('Hour', 'Ώρα')}>
          {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>)}
        </select>
        <input data-testid="digest-email" type="email" className={`${field} sm:col-span-2`} placeholder="you@startup.com" value={settings.email ?? ''} onChange={(e) => setSettings({ ...settings, email: e.target.value })} aria-label={t('Send to', 'Αποστολή σε')} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-stone-500"><CalendarClock className="h-3.5 w-3.5" />{settings.timezone}</span>
        <select data-testid="digest-lang" className={`${field} min-h-8 text-xs`} value={settings.lang} onChange={(e) => setSettings({ ...settings, lang: e.target.value as 'en' | 'el' })} aria-label={t('Language', 'Γλώσσα')}>
          <option value="en">English</option><option value="el">Ελληνικά</option>
        </select>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" data-testid="digest-save" disabled={busy !== ''} onClick={() => { void save(settings); }} className="inline-flex min-h-8 items-center rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50">
            {busy === 'save' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('Save schedule', 'Αποθήκευση')}
          </button>
          <button type="button" data-testid="digest-preview" disabled={busy !== ''} onClick={() => { void run('preview'); }} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-stone-200 px-3 text-xs font-medium text-stone-700 hover:border-stone-400 disabled:opacity-50">
            <Eye className="h-3.5 w-3.5" />{t('Preview', 'Προεπισκόπηση')}
          </button>
          <button type="button" data-testid="digest-send-now" disabled={busy !== '' || !EMAIL_RE.test(settings.email ?? '')} onClick={() => { void run('send'); }} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-stone-200 px-3 text-xs font-medium text-stone-700 hover:border-stone-400 disabled:opacity-50">
            <Send className="h-3.5 w-3.5" />{t('Send now', 'Αποστολή τώρα')}
          </button>
        </div>
      </div>
      {configured === false && <p className="text-xs text-amber-700" data-testid="digest-no-provider">{t('No email provider yet — digests are logged here, not emailed.', 'Δεν υπάρχει πάροχος email — οι συνόψεις καταγράφονται εδώ, δεν στέλνονται.')}</p>}
      {error && <p className="text-xs text-red-600" data-testid="digest-error">{error}</p>}
      {preview && (
        <div className="rounded-lg border border-stone-100 bg-stone-50 p-3" data-testid="digest-preview-text">
          <p className="text-xs font-semibold text-stone-900">{preview.subject}</p>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-stone-700">{preview.text}</pre>
        </div>
      )}
      {history.length > 0 && (
        <ul className="space-y-1 border-t border-stone-100 pt-3" data-testid="digest-history">
          {history.slice(0, 5).map((run) => (
            <li key={run.at} className="flex justify-between gap-2 text-xs text-stone-500">
              <span className="truncate">{new Date(run.at).toLocaleString()} · {run.subject}</span>
              <span className={run.status === 'sent' ? 'text-emerald-700' : run.status === 'failed' ? 'text-red-600' : 'text-stone-400'}>{run.status}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
    </div>
  );
}
