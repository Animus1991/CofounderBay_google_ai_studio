import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';

type SectionAction = { label: ReactNode; to: string };

type SectionHeaderProps = {
  title: ReactNode;
  /** What the section shows, one short line ("last 7 days"); optional. */
  detail?: ReactNode;
  /** "All →" links: where the full list lives. One or two. */
  actions?: SectionAction[];
  className?: string;
};

/**
 * One header for every dashboard section: the name on the left in the studio's
 * small-caps style, "All →" on the right. Sections used to mix four styles
 * (some with "View all →", some with a "See map" that opened a page without a
 * map, most with nothing), so the eye could not scan them the same way.
 * Sizes are the existing ones; no icons, by design.
 */
export default function SectionHeader({ title, detail, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-3 flex items-baseline justify-between gap-3', className)}>
      <p className="min-w-0 text-xs font-semibold text-stone-400 tracking-wider">
        {title}
        {detail ? <span className="ml-1.5 font-normal tracking-normal text-stone-400">· {detail}</span> : null}
      </p>
      {actions && actions.length > 0 && (
        <div className="flex shrink-0 items-center gap-3">
          {actions.map((action) => (
            <NavLink key={action.to} to={action.to} className="text-xs text-stone-500 transition-colors hover:text-stone-900">
              {action.label} <span aria-hidden="true">→</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
