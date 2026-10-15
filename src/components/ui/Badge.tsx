import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

interface BadgeProps {
 children: React.ReactNode;
 variant?: BadgeVariant;
 size?: 'sm' | 'md';
 dot?: boolean;
 className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
 default: 'bg-transparent text-stone-700 border-stone-200',
 success: 'bg-transparent text-emerald-700 border-transparent',
 warning: 'bg-transparent text-amber-700 border-transparent',
 danger: 'bg-transparent text-red-700 border-transparent',
 info: 'bg-transparent text-blue-700 border-transparent',
 outline: 'bg-transparent text-stone-600 border-stone-300',
};

const dotColors: Record<BadgeVariant, string> = {
 default: 'bg-stone-400',
 success: 'bg-emerald-500',
 warning: 'bg-amber-500',
 danger: 'bg-red-500',
 info: 'bg-blue-500',
 outline: 'bg-stone-400',
};

export default function Badge({ children, variant = 'default', size = 'sm', dot, className }: BadgeProps) {
 return (
  <span className={cn(
   "inline-flex items-center gap-1.5 font-medium border rounded-full whitespace-nowrap",
   size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
   variantClasses[variant],
   className
  )}>
   {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColors[variant])} />}
   {children}
  </span>
 );
}
