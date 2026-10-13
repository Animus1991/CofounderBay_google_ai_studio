import type { ReactNode } from 'react';
import { useLanguage } from './language';

type BothProps = {
  en: ReactNode;
  el: ReactNode;
};

/** English, Greek, or both, in the parent's font size. */
export function Both({ en, el }: BothProps) {
  const { mode } = useLanguage();
  if (mode === 'en') return <>{en}</>;
  if (mode === 'el') return <span lang="el">{el}</span>;
  return (
    <>
      {en}
      <span aria-hidden="true"> · </span>
      <span lang="el">{el}</span>
    </>
  );
}
