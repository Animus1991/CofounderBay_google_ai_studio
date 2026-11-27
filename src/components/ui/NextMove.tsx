import type { ElementType, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { useT } from '../../lib/language';
import { cn } from '../../lib/utils';
import { askAssistant } from '../../lib/assistantBus';

export type NextMoveTone = 'next' | 'waiting';

/**
 * Calm, decompressed next-step card: icon, clear single-glance message
 * (with optional concise context), Ask assistant shortcut, and one primary action button.
 *
 * `embedded` renders it as one row of a list (the dashboard's "Today" panel):
 * no card of its own, and the "waiting" state uses a clean typographic status kicker
 * with a semantic indicator dot rather than a heavy bordered pill.
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
        'flex flex-col gap-2.5 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-5',
        embedded
          ? 'text-stone-900'
          : cn(
            'studio-nudge rounded-lg border',
            next
              ? 'border-stone-200/80 bg-white text-stone-900'
              : 'border-amber-200/70 bg-amber-50/50 text-stone-900',
          ),
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
            next ? 'bg-stone-100/80 text-stone-700' : 'bg-amber-50 text-amber-700',
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          {(label || why) && (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
              {label && (
                <span className={cn('inline-flex items-center gap-1.5 font-medium', next ? 'text-stone-500' : 'text-amber-700')}>
                  <span
                    aria-hidden="true"
                    className={cn('h-1.5 w-1.5 shrink-0 rounded-full', next ? 'bg-stone-400' : 'bg-amber-500')}
                  />
                  {label}
                </span>
              )}
              {label && why && (
                <span aria-hidden="true" className="text-stone-300">·</span>
              )}
              {why && (
                <span className="text-stone-500">{why}</span>
              )}
            </div>
          )}
          <p className="text-sm font-medium leading-snug text-stone-900">{title}</p>
        </div>
      </div>
      <div className="flex w-full shrink-0 items-center gap-1.5 pl-11 sm:w-auto sm:pl-0">
        <button
          type="button"
          onClick={onAction}
          className={cn(
            'inline-flex min-h-7 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            primary
              ? 'bg-stone-900 text-white hover:bg-stone-800'
              : 'bg-stone-100/90 text-stone-900 hover:bg-stone-200/80',
          )}
        >
          <span>{action}</span>
          <ArrowRight className="h-3 w-3 shrink-0 opacity-80" />
        </button>
        {askPrompt ? (
          <button
            type="button"
            onClick={() => askAssistant(askPrompt)}
            className="inline-flex min-h-7 items-center justify-center rounded-md px-2 py-1 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 shrink-0"
          >
            {t('Ask', 'Ρώτα')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
