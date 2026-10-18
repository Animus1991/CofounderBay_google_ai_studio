import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type TimelineEntry = { id: string; title: ReactNode; meta?: ReactNode; current?: boolean };

/** GitHub's timeline: a hairline down the left, a mark per event, the current state first. */
export default function Timeline({ items, className }: { items: TimelineEntry[]; className?: string }) {
  return (
    <ol className={cn('relative ml-1 border-l border-stone-200', className)}>
      {items.map((item) => (
        <li key={item.id} className="relative pb-3 pl-4 last:pb-0">
          <span
            aria-hidden="true"
            className={cn(
              'absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white',
              item.current ? 'bg-stone-900' : 'bg-stone-300',
            )}
          />
          <p className="text-sm leading-snug text-stone-900">{item.title}</p>
          {item.meta ? <p className="mt-0.5 text-xs leading-snug text-stone-500">{item.meta}</p> : null}
        </li>
      ))}
    </ol>
  );
}
