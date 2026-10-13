import { createContext, useContext, useState, type ReactNode } from 'react';
import { Languages } from 'lucide-react';

export type LangMode = 'both' | 'en' | 'el';

const KEY = 'cfb.lang';

function readMode(): LangMode {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'en' || stored === 'el' || stored === 'both') return stored;
  } catch {
    /* keep both languages */
  }
  return 'both';
}

let current: LangMode = readMode();

export function getLang(): LangMode {
  return current;
}

const nextMode = (mode: LangMode): LangMode => (mode === 'both' ? 'en' : mode === 'en' ? 'el' : 'both');

type LanguageValue = { mode: LangMode; cycle: () => void };

const LanguageContext = createContext<LanguageValue>({ mode: 'both', cycle: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<LangMode>(current);
  current = mode;

  const cycle = () => {
    setMode((prev) => {
      const next = nextMode(prev);
      current = next;
      try { localStorage.setItem(KEY, next); } catch { /* the choice still applies this visit */ }
      return next;
    });
  };

  return <LanguageContext.Provider value={{ mode, cycle }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

const hint: Record<LangMode, string> = {
  both: 'Both languages. Click for English only. · Και οι δύο γλώσσες. Κλικ για μόνο αγγλικά.',
  en: 'English only. Click for Greek only.',
  el: 'Μόνο ελληνικά. Κλικ για και τις δύο γλώσσες.',
};

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { mode, cycle } = useLanguage();
  const label = mode === 'both' ? 'EN · EL' : mode === 'en' ? 'EN' : 'EL';
  return (
    <button
      type="button"
      onClick={cycle}
      title={hint[mode]}
      aria-label={hint[mode]}
      className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-stone-900 ${className}`}
    >
      <Languages className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
