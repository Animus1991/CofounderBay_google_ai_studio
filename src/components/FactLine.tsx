import React, { ReactNode } from 'react';

interface FactLineProps {
  items: readonly (ReactNode | string | number | null | undefined | false)[];
  label?: string;
  className?: string;
}

export function FactLine({ items, label, className = '' }: FactLineProps) {
  const shown = items.filter((item) => item !== null && item !== undefined && item !== false && item !== '');
  if (!shown.length) return null;

  return (
    <ul
      aria-label={label}
      className={`facts-dotted flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground ${className}`}
    >
      {shown.map((item, i) => (
        <li key={i} className="inline-flex items-center">
          {item}
        </li>
      ))}
    </ul>
  );
}
