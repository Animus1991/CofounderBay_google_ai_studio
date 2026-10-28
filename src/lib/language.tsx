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

export function setGlobalLang(next: LangMode) {
  current = next;
  try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<LangMode>('SET_LANGUAGE', { detail: next }));
  }
}

type LanguageValue = { mode: LangMode; cycle: () => void; setMode: (mode: LangMode) => void };

const LanguageContext = createContext<LanguageValue>({ mode: 'en', cycle: () => {}, setMode: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<LangMode>(current);
  current = mode;

  useEffect(() => {
    document.documentElement.lang = mode;
  }, [mode]);

  useEffect(() => {
    const onSetLang = (e: Event) => {
      const next = (e as CustomEvent<LangMode>).detail;
      if (next === 'en' || next === 'el') setMode(next);
    };
    window.addEventListener('SET_LANGUAGE', onSetLang);
    return () => window.removeEventListener('SET_LANGUAGE', onSetLang);
  }, []);

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
      data-ui="button"
      onClick={cycle}
      title={hint[mode]}
      aria-label={hint[mode]}
      className={`inline-flex min-h-11 items-center justify-center gap-1 sm:gap-1.5 rounded-lg border border-stone-200 bg-white px-2 sm:px-2.5 text-xs sm:text-sm font-medium text-stone-900 shrink-0 ${className}`}
    >
      <Languages className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
