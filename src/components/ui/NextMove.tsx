import type { ElementType, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { useT } from '../../lib/language';
import { cn } from '../../lib/utils';
import { askAssistant } from '../../lib/assistantBus';
import Badge from './Badge';

export type NextMoveTone = 'next' | 'waiting';

/**
 * Calm, decompressed next-step card: icon, clear single-glance message
 * (with optional concise context), Ask assistant shortcut, and one primary action button.
 *
 * `embedded` renders it as one row of a list (the dashboard's "Today" panel):
 * no card of its own, and the "waiting" state is a warning label instead of a
 * tinted card (GitHub's Primer logic: attention is a label, not a painted box).
 */
export default function NextMove({
  tone = 'next',
  icon: Icon,
  label,
  title,
  why,
  action,
  onAction,
  askPrompt,
  embedded = false,
  primary = true,
}: {
  tone?: NextMoveTone;
  icon: ElementType;
  label?: string;
  title: ReactNode;
  why?: ReactNode;
  action: string;
  onAction: () => void;
  askPrompt?: string;
  embedded?: boolean;
  /** One primary (filled) button per list: the most urgent row; the others are outlined. */
  primary?: boolean;
}) {
  const t = useT();
  const next = tone === 'next';
  return (
    <div
      data-tone={tone}
      className={cn(
        'flex flex-col gap-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-5',
        embedded
          ? 'px-4 py-3.5 text-stone-900'
          : cn(
            'studio-nudge rounded-2xl border',
            next
              ? 'border-stone-200/80 bg-white text-stone-900 shadow-[0_1px_3px_rgba(0,0,0,0.02)]'
              : 'border-amber-200/70 bg-amber-50/50 text-stone-900',
          ),
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            next ? 'bg-stone-100 text-stone-700' : 'border border-amber-200/60 bg-white text-amber-700',
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {embedded && label ? (
              <Badge variant={next ? 'default' : 'warning'}>{label}</Badge>
            ) : !next && label ? (
              <span className="text-xs font-medium text-amber-700">
                {label}
                <span aria-hidden="true" className="ml-1.5 text-amber-400">·</span>
              </span>
            ) : null}
            <p className="text-sm font-semibold leading-relaxed text-stone-900">{title}</p>
            {why ? (
              <p className="text-xs leading-relaxed text-stone-500">
                <span aria-hidden="true" className="mr-1.5 text-stone-300">·</span>
                {why}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex w-full shrink-0 items-center gap-3 sm:w-auto">
        {askPrompt ? (
          <button
            type="button"
            onClick={() => askAssistant(askPrompt)}
            className="text-xs font-medium text-stone-600 hover:text-stone-900 hover:underline shrink-0"
          >
            {t('Ask', 'Ρώτα')}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onAction}
          className={cn(
            'inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-medium transition-colors sm:flex-none sm:w-auto sm:text-sm',
            primary ? 'bg-stone-900 text-white hover:bg-stone-800' : 'border border-stone-200 bg-white text-stone-900 hover:border-stone-400',
          )}
        >
          <span>{action}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-80" />
        </button>
      </div>
    </div>
  );
}
