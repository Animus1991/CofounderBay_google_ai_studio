import { cn } from '../../lib/utils';

export type CounterTone = 'neutral' | 'attention' | 'inverse';

/** One count beside a tab or heading, as GitHub's Counter. `attention` marks what waits on you. */
export default function Counter({ value, tone = 'neutral', className }: { value: number; tone?: CounterTone; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-medium leading-none tabular-nums',
        tone === 'attention' && 'bg-stone-900 text-white',
        tone === 'inverse' && 'bg-white/20 text-white',
        tone === 'neutral' && 'bg-stone-900/[0.07] text-stone-600',
        className,
      )}
    >
      {value}
    </span>
  );
}
