import type { ReactNode } from 'react';
import { useLanguage } from './language';

type BothProps = {
  en: ReactNode;
  el: ReactNode;
};

/** The active language only. */
export function Both({ en, el }: BothProps) {
  const { mode } = useLanguage();
  if (mode === 'el') return <span lang="el">{el}</span>;
  return <>{en}</>;
}
