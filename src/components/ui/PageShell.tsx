import React from 'react';
import { cn } from '../../lib/utils';

interface PageShellProps {
 title?: string;
 description?: string;
 actions?: React.ReactNode;
 children: React.ReactNode;
 maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
 noPadding?: boolean;
 className?: string;
}

const maxWidthClass = {
 sm: 'max-w-sm',
 md: 'max-w-md',
 lg: 'max-w-lg',
 xl: 'max-w-xl',
 '2xl': 'max-w-2xl',
 '7xl': 'max-w-7xl',
 full: 'max-w-full',
};

export default function PageShell({
 title,
 description,
 actions,
 children,
 maxWidth = 'full',
 noPadding = false,
 className,
}: PageShellProps) {
 return (
  <div className={cn(
   'min-h-full w-full',
   !noPadding && 'px-4 sm:px-6 lg:px-8 py-6',
   className
  )}>
   <div className={cn('mx-auto w-full', maxWidthClass[maxWidth])}>
    {(title || actions) && (
     <div className="flex items-start justify-between gap-4 mb-6">
      <div>
       {title && (
        <h1 className="text-[14.5px] sm:text-base font-semibold text-stone-900 tracking-tight">{title}</h1>
       )}
       {description && (
        <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">{description}</p>
       )}
      </div>
      {actions && (
       <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
     </div>
    )}
    {children}
   </div>
  </div>
 );
}

// Section heading used within pages
export function SectionHeading({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
 return (
  <div className="flex items-center justify-between mb-3">
   <h2 className="text-xs font-semibold text-stone-400 tracking-wider">{children}</h2>
   {action && <div>{action}</div>}
  </div>
 );
}

// Stat card used in dashboards
interface StatCardProps {
 label: string;
 value: string | number;
 sub?: string;
 icon?: React.ElementType;
 trend?: 'up' | 'down' | 'neutral';
 trendValue?: string;
}

export function StatCard({ label, value, sub, icon: Icon, trend, trendValue }: StatCardProps) {
 return (
  <div className="bg-white rounded-2xl border border-stone-100 p-5">
   <div className="flex items-start justify-between">
    <p className="text-xs font-medium text-stone-400 tracking-wider">{label}</p>
    {Icon && <Icon className="w-4 h-4 text-stone-300" />}
   </div>
   <p className="text-lg font-semibold text-stone-900 mt-2 tracking-tight tabular-nums">{value}</p>
   <div className="flex items-center gap-2 mt-1">
    {sub && <p className="text-xs text-stone-400">{sub}</p>}
    {trendValue && (
     <span className={cn(
      'text-xs font-medium',
      trend === 'up' && 'text-emerald-600',
      trend === 'down' && 'text-red-500',
      trend === 'neutral' && 'text-stone-400',
     )}>
      {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
     </span>
    )}
   </div>
  </div>
 );
}
