import type { ElementType, ReactNode } from 'react';
import { useT } from '../../lib/language';
import { cn } from '../../lib/utils';

export type NextMoveTone = 'next' | 'waiting';

/**
 * GitHub's flash in one anatomy on every home: the glyph of the page it opens, a label,
 * the thing itself and why, one button on the right (full width on a phone).
 * `next` is what comes up; `waiting` is what waits on you.
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
}: {
  tone?: NextMoveTone;
  icon: ElementType;
  label: string;
  title: ReactNode;
  why?: ReactNode;
  action: string;
  onAction: () => void;
  askPrompt?: string;
}) {
  const t = useT();
  const next = tone === 'next';
  return (
    <div
      className={cn(
        'studio-nudge flex flex-col gap-3 rounded-2xl sm:flex-row sm:items-center',
        next ? 'bg-stone-900 text-white' : 'border border-amber-100 bg-amber-50 text-stone-900',
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', next ? 'bg-white/10' : 'border border-amber-100 bg-white')}>
          <Icon className={cn('h-4 w-4', next ? 'text-white' : 'text-amber-700')} />
        </div>
        <div className="min-w-0">
          <p className={cn('text-xs font-medium', next ? 'text-white/60' : 'text-amber-700')}>{label}</p>
          <p className={cn('text-xs font-medium leading-snug sm:text-sm', next ? 'text-white' : 'text-stone-900')}>{title}</p>
          {why ? <p className={cn('mt-0.5 text-xs leading-snug', next ? 'text-white/60' : 'text-stone-600')}>{why}</p> : null}
        </div>
      </div>
      <div className="flex w-full shrink-0 items-center gap-3 sm:w-auto">
        {askPrompt ? (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: askPrompt } }))}
            className={cn('text-xs font-medium hover:underline', next ? 'text-white/80 hover:text-white' : 'text-stone-700 hover:text-stone-900')}
          >
            {t('Ask', 'Ρώτα')}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onAction}
          className={cn(
            'min-h-11 flex-1 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-colors sm:flex-none',
            next ? 'bg-white text-stone-900 hover:bg-stone-100' : 'bg-stone-900 text-white hover:bg-stone-800',
          )}
        >
          {action}
        </button>
      </div>
    </div>
  );
}
