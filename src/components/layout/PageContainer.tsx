import type { ReactNode } from 'react';
import PageShell from '../ui/PageShell';

/**
 * Alias of PageShell without a title — kept so older imports still resolve.
 * New pages should use PageShell directly.
 */
export default function PageContainer({
 children,
 className,
 maxWidth = '7xl',
 noPadding = false,
}: {
 children: ReactNode;
 className?: string;
 maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
 noPadding?: boolean;
 fullHeight?: boolean;
}) {
 return (
  <PageShell maxWidth={maxWidth} noPadding={noPadding} className={className}>
   {children}
  </PageShell>
 );
}
