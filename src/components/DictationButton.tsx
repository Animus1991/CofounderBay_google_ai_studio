/**
 * Dictation into the assistant box (lib/dictation). The words go into the box,
 * never straight to the assistant, so they can be read and corrected before
 * sending. While it listens the button says so in words, not only by colour.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage, useT } from '../lib/language';
import { dictationAvailable, recognitionConstructor, type RecognitionLike } from '../lib/dictation';

export default function DictationButton({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  const { mode } = useLanguage();
  const t = useT();
  const [available, setAvailable] = useState(false);
  const [listening, setListening] = useState(false);
  const [failed, setFailed] = useState(false);
  const recognition = useRef<RecognitionLike | null>(null);
  const base = useRef('');

  useEffect(() => setAvailable(dictationAvailable()), []);
  useEffect(() => () => recognition.current?.abort(), []);

  const stop = useCallback(() => recognition.current?.stop(), []);
  const start = useCallback(() => {
    const Recognition = recognitionConstructor();
    if (!Recognition) return;
    const instance = new Recognition();
    instance.lang = mode === 'el' ? 'el-GR' : 'en-US';
    instance.interimResults = true;
    instance.continuous = false;
    base.current = value.trim() ? `${value.trim()} ` : '';
    instance.onresult = (event) => {
      let heard = '';
      for (let index = 0; index < event.results.length; index += 1) {
        heard += event.results[index]?.[0]?.transcript ?? '';
      }
      onChange(`${base.current}${heard}`.replace(/\s+/g, ' ').trimStart());
    };
    instance.onend = () => {
      setListening(false);
      recognition.current = null;
    };
    instance.onerror = (event) => {
      // "no-speech" and "aborted" are a silence or a stop, not a fault.
      if (event.error && event.error !== 'no-speech' && event.error !== 'aborted') setFailed(true);
    };
    recognition.current = instance;
    setFailed(false);
    setListening(true);
    try {
      instance.start();
    } catch {
      setListening(false);
      setFailed(true);
    }
  }, [mode, onChange, value]);

  if (!available) return null;
  const label = listening
    ? t('Stop dictation', 'Διακοπή υπαγόρευσης')
    : failed
      ? t('Dictation did not work. Try again', 'Η υπαγόρευση δεν λειτούργησε. Δοκίμασε ξανά')
      : t('Dictate the question', 'Υπαγόρευση της ερώτησης');

  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5', className)}>
      {listening && (
        <span role="status" className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" aria-hidden="true" />
          {t('Listening…', 'Ακούω…')}
        </span>
      )}
      <button
        type="button"
        aria-pressed={listening}
        aria-label={label}
        title={label}
        onClick={listening ? stop : start}
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors',
          listening ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
          failed && !listening && 'text-red-700',
        )}
      >
        {listening ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
      </button>
    </span>
  );
}
