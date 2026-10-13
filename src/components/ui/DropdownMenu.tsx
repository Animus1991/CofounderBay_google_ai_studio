import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface DropdownItem {
 id: string;
 label: string;
 icon?: React.ElementType;
 onClick: () => void;
 danger?: boolean;
 divider?: boolean;
}

interface DropdownMenuProps {
 trigger: React.ReactNode;
 items: DropdownItem[];
 align?: 'left' | 'right';
 className?: string;
}

export default function DropdownMenu({ trigger, items, align = 'right', className }: DropdownMenuProps) {
 const [open, setOpen] = useState(false);
 const ref = useRef<HTMLDivElement>(null);

 useEffect(() => {
  const handler = (e: MouseEvent) => {
   if (ref.current && !ref.current.contains(e.target as Node)) {
    setOpen(false);
   }
  };
  if (open) document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
 }, [open]);

 return (
  <div ref={ref} className={cn("relative inline-flex", className)}>
   <div onClick={() => setOpen(!open)} className="cursor-pointer">
    {trigger}
   </div>
   <AnimatePresence>
    {open && (
     <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 4 }}
      transition={{ duration: 0.15 }}
      className={cn(
       "absolute top-full mt-2 min-w-[180px] max-w-[calc(100vw-1.5rem)] bg-white rounded-xl shadow-sm border border-stone-100 py-1.5 z-50",
       align === 'right' ? 'right-0' : 'left-0'
      )}
     >
      {items.map((item) => (
       item.divider ? (
        <div key={item.id} className="h-px bg-stone-100 my-1.5" />
       ) : (
        <button
         key={item.id}
         onClick={() => { item.onClick(); setOpen(false); }}
         className={cn(
          "w-full flex items-center gap-3 min-h-11 px-4 py-2.5 text-sm font-medium transition-colors text-left",
          item.danger
           ? "text-red-500 hover:bg-red-50"
           : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
         )}
        >
         {item.icon && <item.icon className="w-4 h-4" />}
         {item.label}
        </button>
       )
      ))}
     </motion.div>
    )}
   </AnimatePresence>
  </div>
 );
}
