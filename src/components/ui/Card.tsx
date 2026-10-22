import { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface CardProps {
 children: ReactNode;
 className?: string;
 /** Layout and spacing of the actual children, not the surrounding card shell. */
 contentClassName?: string;
 title?: string;
 subtitle?: string;
 footer?: ReactNode;
 noPadding?: boolean;
 hoverable?: boolean;
 onClick?: () => void;
}

/** True when the caller already pads the card, so the inner shell does not add a second inset. */
function callerSetsPadding(className?: string) {
 return /(?:^|\s)(?:[\w-]+:)*p[trblxy]?-/.test(className ?? '');
}

export default function Card({ 
 children, 
 className, 
 contentClassName,
 title, 
 subtitle, 
 footer, 
 noPadding,
 hoverable = false,
 onClick
}: CardProps) {
 const paddedByCaller = noPadding || callerSetsPadding(className);
 return (
  <div 
   data-ui="card"
   onClick={onClick}
   className={cn(
    "card-minimal min-w-0 flex flex-col transition-all duration-300",
    hoverable && "hover:border-stone-300 cursor-pointer",
    onClick && "active:scale-[0.99] active:duration-100",
    className
   )}
  >
   {(title || subtitle) && (
    <div className={cn("border-b border-stone-200/60", paddedByCaller ? "pb-3" : "px-4 py-3 sm:px-5 sm:py-4")}>
     {title && <h3 className="text-sm font-medium text-stone-900 tracking-tight">{title}</h3>}
     {subtitle && <p className="text-xs text-stone-400 font-medium tracking-wider mt-0.5">{subtitle}</p>}
    </div>
   )}
   <div data-ui="card-content" className={cn(
    "min-w-0 w-full flex-1",
    !paddedByCaller && "p-4 sm:p-5",
    paddedByCaller && !noPadding && (title || subtitle) && "pt-3",
    paddedByCaller && !noPadding && footer && "pb-3",
    contentClassName
   )}>
    {children}
   </div>
   {footer && (
    <div className={cn("bg-stone-50/50 border-t border-stone-200/60 rounded-b-xl", paddedByCaller ? "pt-4" : "px-4 py-3 sm:px-5 sm:py-4")}>
     {footer}
    </div>
   )}
  </div>
 );
}
