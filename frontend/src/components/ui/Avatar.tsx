import { useState } from 'react';
import { cn } from '../../lib/utils';

interface AvatarProps {
 src?: string;
 alt?: string;
 fallback?: string;
 name?: string;
 size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
 status?: 'online' | 'offline' | 'away' | 'busy';
 className?: string;
}

const sizeClasses = {
 xs: 'w-6 h-6 text-[10px]',
 sm: 'w-8 h-8 text-xs',
 md: 'w-10 h-10 text-sm',
 lg: 'w-12 h-12 text-base',
 xl: 'w-16 h-16 text-lg',
};

const statusColors = {
 online: 'bg-emerald-500',
 offline: 'bg-stone-300',
 away: 'bg-amber-500',
 busy: 'bg-red-500',
};

const statusSize = {
 xs: 'w-1.5 h-1.5 border',
 sm: 'w-2 h-2 border',
 md: 'w-2.5 h-2.5 border-2',
 lg: 'w-3 h-3 border-2',
 xl: 'w-3.5 h-3.5 border-2',
};

export default function Avatar({ src, alt, fallback, name, size = 'md', status, className }: AvatarProps) {
 const [failed, setFailed] = useState(false);
 const label = fallback || name || alt || '';
 const initials = label
  ? label.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  : '?';
 const showImage = Boolean(src) && !failed;

 return (
  <div className={cn("relative inline-flex shrink-0", className)}>
   {showImage ? (
    <img
     src={src}
     alt={alt || fallback || name || 'Avatar'}
     className={cn("rounded-full object-cover border border-stone-200", sizeClasses[size])}
     referrerPolicy="no-referrer"
     onError={() => setFailed(true)}
    />
   ) : (
    <div className={cn(
     "rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center font-semibold text-stone-600",
     sizeClasses[size]
    )}>
     {initials}
    </div>
   )}
   {status && (
    <span className={cn(
     "absolute bottom-0 right-0 rounded-full border-white",
     statusColors[status],
     statusSize[size]
    )} />
   )}
  </div>
 );
}

export function AvatarGroup({ avatars, max = 4, size = 'sm' }: { avatars: { src?: string; alt?: string; fallback?: string }[]; max?: number; size?: AvatarProps['size'] }) {
 const visible = avatars.slice(0, max);
 const remaining = avatars.length - max;

 return (
  <div className="flex -space-x-2">
   {visible.map((a, i) => (
    <Avatar key={i} {...a} size={size} className="ring-2 ring-white" />
   ))}
   {remaining > 0 && (
    <div className={cn(
     "rounded-full bg-stone-100 border-2 border-white flex items-center justify-center font-semibold text-stone-500",
     sizeClasses[size]
    )}>
     +{remaining}
    </div>
   )}
  </div>
 );
}
