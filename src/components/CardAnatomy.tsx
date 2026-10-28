import { ReactNode } from 'react';

/**
 * The head of a card, set the way the Endorsements, Connections and
 * Opportunities cards set it: a mark (a person's circle, an organisation's
 * rounded square), and beside it the title with the line under it. A state
 * or a time sits at the right of the head and never wraps under it.
 */
export function CardHead({
  mark,
  title,
  subtitle,
  meta,
  aside,
  asideStays = false,
  asideClassName = '',
  titleAs: Title = 'h3',
  titleClassName = '',
  className = '',
}: {
  mark?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  aside?: ReactNode;
  asideStays?: boolean;
  asideClassName?: string;
  titleAs?: 'h2' | 'h3' | 'h4' | 'p';
  titleClassName?: string;
  className?: string;
}) {
  const cols = mark
    ? asideStays && aside
      ? 'grid-cols-[auto_minmax(50%,1fr)_auto]'
      : 'grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(50%,1fr)_auto]'
    : asideStays && aside
      ? 'grid-cols-[minmax(50%,1fr)_auto]'
      : 'grid-cols-[minmax(0,1fr)] sm:grid-cols-[minmax(50%,1fr)_auto]';

  const asidePlace = asideStays
    ? (mark ? 'col-start-3' : 'col-start-2') + ' row-start-1'
    : (mark ? 'col-start-2 sm:col-start-3' : 'col-start-1 sm:col-start-2') + ' row-start-2 mt-1 sm:row-start-1 sm:mt-0 sm:pt-0.5';

  return (
    <div className={`grid grid-cols-1 items-start gap-x-3 ${cols} ${className}`}>
      {mark ? (
        <div className={`col-start-1 row-start-1 shrink-0 ${aside && !asideStays ? 'row-span-2 sm:row-span-1' : ''}`}>
          {mark}
        </div>
      ) : null}
      <div className={`min-w-0 row-start-1 ${mark ? 'col-start-2' : 'col-start-1'}`}>
        <Title className={`card-title break-words text-foreground ${titleClassName}`}>
          {title}
        </Title>
        {subtitle ? <div className="card-subtitle mt-0.5 break-words">{subtitle}</div> : null}
        {meta ? <div className="mt-0.5 text-xs text-muted-foreground">{meta}</div> : null}
      </div>
      {aside ? (
        <div
          className={`flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground sm:justify-end ${asidePlace} ${
            asideStays ? 'justify-end pt-0.5' : ''
          } ${asideClassName}`}
        >
          {aside}
        </div>
      ) : null}
    </div>
  );
}

export function CardFoot({
  meta,
  children,
  className = '',
}: {
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  if (!meta && !children) return null;
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border pt-3 ${className}`}
    >
      {meta ? <div className="min-w-0 text-xs text-muted-foreground">{meta}</div> : null}
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
