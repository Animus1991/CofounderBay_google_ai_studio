import { useId, useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

/** Collapsible secondary section. Content stays mounted (only hidden) so forms, timers and state survive closing. */
export default function Disclosure({ title, hint, defaultOpen = false, children, className }: {
 title: string;
 hint?: string;
 defaultOpen?: boolean;
 children: ReactNode;
 className?: string;
}) {
 const [open, setOpen] = useState(defaultOpen);
 const id = useId();
 const labelId = `${id}-label`;
 const hintId = `${id}-hint`;
 return (
  <div className={cn('pt-2 border-t border-stone-100', className)}>
   <button
    type="button"
    aria-expanded={open}
    aria-controls={id}
    aria-labelledby={labelId}
    aria-describedby={hint ? hintId : undefined}
    onClick={() => setOpen((v) => !v)}
    className="flex w-full items-start gap-1.5 py-1 text-left text-sm font-semibold text-stone-700 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-400 rounded"
   >
    <ChevronRight aria-hidden="true" className={cn('mt-0.5 w-3.5 h-3.5 shrink-0 transition-transform', open && 'rotate-90')} />
    <span className="min-w-0">
     <span id={labelId}>{title}</span>
     {hint && <span id={hintId} className="block text-xs font-normal text-stone-500">{hint}</span>}
    </span>
   </button>
   <div id={id} role="region" aria-labelledby={labelId} hidden={!open} className="pt-2 space-y-4">{children}</div>
  </div>
 );
}
