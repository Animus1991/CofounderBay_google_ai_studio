import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

/**
 * Card facts (stage, place, skills, tags) as one muted, dot-separated line.
 * Keep pills only for state (status, score) or controls (filters).
 */
export default function FactLine({
  items,
  label,
  className,
}: {
  items: readonly ReactNode[];
  label?: string;
  className?: string;
}) {
  const shown = items.filter((item) => item !== null && item !== undefined && item !== false && item !== '' && item !== 'N/A');
  if (!shown.length) return null;
  return (
    <ul aria-label={label} className={cn('facts-dotted flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-stone-400', className)}>
      {shown.map((item, i) => (
    <li className="min-w-0 break-words [overflow-wrap:anywhere]" key={i}>{item}</li>
      ))}
    </ul>
  );
}
