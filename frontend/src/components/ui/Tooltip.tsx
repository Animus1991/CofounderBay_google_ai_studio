import { useState, useRef, useEffect, useId, Children, cloneElement, isValidElement, type ReactElement } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface TooltipProps {
 content: string;
 children: React.ReactNode;
 side?: 'top' | 'bottom' | 'left' | 'right';
 delay?: number;
 className?: string;
}

const positionClasses = {
 top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
 bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
 left: 'right-full top-1/2 -translate-y-1/2 mr-2',
 right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export default function Tooltip({ content, children, side = 'top', delay = 300, className }: TooltipProps) {
 const [show, setShow] = useState(false);
 const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
 const id = useId();
 useEffect(() => () => clearTimeout(timeoutRef.current), []);

 const handleEnter = () => {
  clearTimeout(timeoutRef.current);
  timeoutRef.current = setTimeout(() => setShow(true), delay);
 };
 const handleLeave = () => {
  clearTimeout(timeoutRef.current);
  setShow(false);
 };

 const child = Children.count(children) === 1 && isValidElement(children)
  ? children as ReactElement<{ 'aria-describedby'?: string }> : null;
 const describedBy = [child?.props['aria-describedby'], show ? id : undefined].filter(Boolean).join(' ') || undefined;

 return (
  <div
   className={cn("relative inline-flex", className)}
   onMouseEnter={handleEnter}
   onMouseLeave={handleLeave}
   onFocus={() => { clearTimeout(timeoutRef.current); setShow(true); }}
   onBlur={handleLeave}
   onKeyDown={(event) => { if (event.key === 'Escape' && show) { event.stopPropagation(); handleLeave(); } }}
  >
   {child ? cloneElement(child, { 'aria-describedby': describedBy }) : children}
   <AnimatePresence>
    {show && (
     <motion.div
      id={id}
      role="tooltip"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.12 }}
      className={cn(
       "absolute z-[100] px-2.5 py-1.5 text-xs font-medium text-white bg-stone-900 rounded-lg shadow-lg whitespace-nowrap pointer-events-none",
       positionClasses[side]
      )}
     >
      {content}
     </motion.div>
    )}
   </AnimatePresence>
  </div>
 );
}
