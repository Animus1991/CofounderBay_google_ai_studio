import { cn } from '../../lib/utils';

interface SkeletonProps {
 className?: string;
 variant?: 'text' | 'circular' | 'rectangular';
 width?: string | number;
 height?: string | number;
}

export default function Skeleton({ className, variant = 'text', width, height }: SkeletonProps) {
 return (
  <div
   className={cn(
    "animate-pulse bg-stone-200/60 rounded",
    variant === 'circular' && 'rounded-full',
    variant === 'text' && 'rounded h-4 w-full',
    variant === 'rectangular' && 'rounded-xl',
    className
   )}
   style={{ width, height }}
  />
 );
}

export function SkeletonCard() {
 return (
  <div className="bg-white rounded-2xl border border-stone-100 p-6 space-y-4">
   <div className="flex items-center gap-3">
    <Skeleton variant="circular" className="w-10 h-10" />
    <div className="space-y-2 flex-1">
     <Skeleton className="h-4 w-1/3" />
     <Skeleton className="h-3 w-1/2" />
    </div>
   </div>
   <Skeleton className="h-3 w-full" />
   <Skeleton className="h-3 w-4/5" />
   <div className="flex gap-2 pt-2">
    <Skeleton className="h-8 w-20 rounded-lg" />
    <Skeleton className="h-8 w-20 rounded-lg" />
   </div>
  </div>
 );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
 return (
  <div className="space-y-3">
   {Array.from({ length: count }).map((_, i) => (
    <div key={i} className="flex items-center gap-3 p-3">
     <Skeleton variant="circular" className="w-8 h-8" />
     <div className="flex-1 space-y-2">
      <Skeleton className="h-3.5 w-2/5" />
      <Skeleton className="h-3 w-3/5" />
     </div>
    </div>
   ))}
  </div>
 );
}

export function SkeletonDashboard() {
 return (
  <div className="space-y-6 p-6">
   {/* Stats Row */}
   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {[1, 2, 3, 4].map(i => (
     <div key={i} className="bg-white rounded-2xl border border-stone-100 p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
     </div>
    ))}
   </div>
   {/* Content */}
   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2 space-y-4">
     <SkeletonCard />
     <SkeletonCard />
    </div>
    <div className="space-y-4">
     <SkeletonCard />
     <SkeletonList count={3} />
    </div>
   </div>
  </div>
 );
}
