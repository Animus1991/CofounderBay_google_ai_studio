import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { useT } from '../../lib/language';
import { cn } from '../../lib/utils';

/** Compact empty copy that still points the user at the studio assistant. */
export default function EmptyHint({
  title,
  detail,
  className,
  children,
}: {
  title: string;
  detail?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn('text-sm text-stone-500 bg-white border border-stone-200/60 rounded-2xl p-4 space-y-2', className)}>
      <p className="text-stone-700 font-medium">{title}</p>
      {detail ? <p className="text-xs text-stone-400 leading-relaxed">{detail}</p> : null}
      {children ? <div className="flex flex-wrap items-center gap-3">{children}</div> : null}
    </div>
  );
}

/** Shared “clear the filters” control used by list empty states. */
export function ClearFiltersButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children?: ReactNode;
}) {
  const t = useT();
  return (
    <button type="button" onClick={onClick} className="text-xs font-medium text-stone-900 hover:underline">
      {children ?? t('Clear filters', 'Καθάρισε τα φίλτρα')}
    </button>
  );
}

export function AskLink({
  prompt,
  children,
}: {
  prompt: string;
  children?: ReactNode;
}) {
  const t = useT();
  const label = children ?? t('Ask assistant', 'Ρώτα τον βοηθό');
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs font-medium text-stone-900 hover:underline"
      onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt } }))}
    >
      <Sparkles className="w-3 h-3 text-stone-400" aria-hidden="true" />
      {label}
    </button>
  );
}
