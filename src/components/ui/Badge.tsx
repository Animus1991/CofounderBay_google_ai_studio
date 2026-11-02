import { cn } from '../../lib/utils';
import { TONE_CLASSES, type Tone } from '../../lib/statusTone';

/** A tone from lib/statusTone, plus 'default' (= neutral) and 'outline' (no fill). */
export type BadgeVariant = Tone | 'default' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
  title?: string;
}

const variantClass = (variant: BadgeVariant) =>
  variant === 'outline' ? 'bg-transparent text-stone-600 border-stone-300' : TONE_CLASSES[variant === 'default' ? 'neutral' : variant].label;

const dotClass = (variant: BadgeVariant) => TONE_CLASSES[variant === 'default' || variant === 'outline' ? 'neutral' : variant].dot;

/**
 * Status label with GitHub's Primer "Label" logic: subtle background, the
 * family's muted border, its foreground text (docs/COLOR_SYSTEM.md). Pick the
 * variant from what the status means — `statusTone(status)` — so the same
 * status has the same colour on every page. Type sizes are the existing ones.
 */
export default function Badge({ children, variant = 'default', size = 'sm', dot, className, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border rounded-full whitespace-nowrap shrink-0',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        variantClass(variant),
        className,
      )}
    >
      {dot && <span aria-hidden="true" className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotClass(variant))} />}
      {children}
    </span>
  );
}
