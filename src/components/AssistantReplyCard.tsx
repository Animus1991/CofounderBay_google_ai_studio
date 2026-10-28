import Card from './ui/Card';
import { cn } from '../lib/utils';
import { useT } from '../lib/language';
import { useStored } from '../lib/useStored';
import { ASSISTANT_PREFS_KEY, readAssistantPrefs, writeAssistantPrefs, type ReplyLength, type ReplyTone } from '../lib/assistantPrefs';

/** How the assistant answers — saved on change, read by every AI reply (and by "/style" in chat). */
export default function AssistantReplyCard({ className }: { className?: string }) {
  const t = useT();
  const prefs = useStored(readAssistantPrefs, [ASSISTANT_PREFS_KEY]);
  const lengths: { id: ReplyLength; en: string; el: string }[] = [
    { id: 'short', en: 'Short', el: 'Σύντομες' },
    { id: 'balanced', en: 'Balanced', el: 'Ισορροπημένες' },
    { id: 'detailed', en: 'Detailed', el: 'Αναλυτικές' },
  ];
  const tones: { id: ReplyTone; en: string; el: string }[] = [
    { id: 'friendly', en: 'Friendly', el: 'Φιλικός' },
    { id: 'direct', en: 'Direct', el: 'Άμεσος' },
    { id: 'formal', en: 'Formal', el: 'Επίσημος' },
  ];
  const chip = (active: boolean) => cn(
    'min-h-9 px-3 rounded-lg border text-xs font-medium transition-colors',
    active ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400',
  );
  return (
    <Card
      className={className}
      title={t('Assistant replies', 'Απαντήσεις βοηθού')}
      subtitle={t('Saved on change. The language follows the app language.', 'Αποθηκεύεται αμέσως. Η γλώσσα ακολουθεί τη γλώσσα της εφαρμογής.')}
    >
      <div className="space-y-4">
        <div role="group" aria-label={t('Length', 'Μήκος')} className="space-y-1.5">
          <p className="text-xs font-medium text-stone-600">{t('Length', 'Μήκος')}</p>
          <div className="flex flex-wrap gap-1.5">
            {lengths.map((item) => (
              <button key={item.id} type="button" aria-pressed={prefs.length === item.id} onClick={() => writeAssistantPrefs({ length: item.id })} className={chip(prefs.length === item.id)}>
                {t(item.en, item.el)}
              </button>
            ))}
          </div>
        </div>
        <div role="group" aria-label={t('Tone', 'Ύφος')} className="space-y-1.5">
          <p className="text-xs font-medium text-stone-600">{t('Tone', 'Ύφος')}</p>
          <div className="flex flex-wrap gap-1.5">
            {tones.map((item) => (
              <button key={item.id} type="button" aria-pressed={prefs.tone === item.id} onClick={() => writeAssistantPrefs({ tone: item.id })} className={chip(prefs.tone === item.id)}>
                {t(item.en, item.el)}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center justify-between gap-3 text-sm text-stone-700">
          <span>{t('Use emoji', 'Χρήση emoji')}</span>
          <input
            type="checkbox"
            checked={prefs.emoji}
            onChange={(e) => writeAssistantPrefs({ emoji: e.target.checked })}
            className="h-4 w-4 accent-stone-900"
          />
        </label>
        <p className="text-xs text-stone-500">
          {t('You can also tell the assistant: “/style short”, “/style detailed formal”, “/style emoji on”.', 'Μπορείς να το πεις και στον βοηθό: «/style short», «/style detailed formal», «/style emoji on».')}
        </p>
      </div>
    </Card>
  );
}
