import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Languages } from 'lucide-react';

export type LangMode = 'en' | 'el';

const KEY = 'cfb.lang';

function readMode(): LangMode {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'el') return 'el';
  } catch {
    /* English is the fallback */
  }
  return 'en';
}

let current: LangMode = readMode();

export function getLang(): LangMode {
  return current;
}

type LanguageValue = { mode: LangMode; cycle: () => void; setMode: (mode: LangMode) => void };

const LanguageContext = createContext<LanguageValue>({ mode: 'en', cycle: () => {}, setMode: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<LangMode>(current);
  current = mode;

  useEffect(() => {
    document.documentElement.lang = mode;
  }, [mode]);

  const apply = (next: LangMode) => {
    current = next;
    try { localStorage.setItem(KEY, next); } catch { /* the choice still applies this visit */ }
    return next;
  };

  const cycle = () => {
    setMode((prev) => apply(prev === 'en' ? 'el' : 'en'));
  };

  const choose = (next: LangMode) => {
    setMode(apply(next));
  };

  return <LanguageContext.Provider value={{ mode, cycle, setMode: choose }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/** `t(en, el)` in the active language. The calling component re-renders when the language changes. */
export function useT() {
  const { mode } = useLanguage();
  return useCallback((en: string, el?: string) => (mode === 'el' ? el || en : en), [mode]);
}

const hint: Record<LangMode, string> = {
  en: 'English. Click for Greek.',
  el: 'Ελληνικά. Κλικ για αγγλικά.',
};

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { mode, cycle } = useLanguage();
  const label = mode === 'en' ? 'EN' : 'EL';
  return (
    <button
      type="button"
      onClick={cycle}
      title={hint[mode]}
      aria-label={hint[mode]}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-stone-900 ${className}`}
    >
      <Languages className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
