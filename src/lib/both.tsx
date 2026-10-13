import type { ReactNode } from 'react';

type BothProps = {
  en: ReactNode;
  el: ReactNode;
};

/** English, then Greek, in the parent's font size. */
export function Both({ en, el }: BothProps) {
  return (
    <>
      {en}
      <span aria-hidden="true"> · </span>
      <span lang="el">{el}</span>
    </>
  );
}
