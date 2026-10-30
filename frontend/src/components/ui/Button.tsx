import React, { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
 variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
 size?: "sm" | "md" | "lg" | "icon";
 children: ReactNode;
 loading?: boolean;
 className?: string;
 disabled?: boolean;
 type?: "button" | "submit" | "reset";
 title?: string;
 "aria-label"?: string;
}

export default function Button({ 
 variant = "primary", 
 size = "md", 
 children, 
 className, 
 loading,
 disabled,
 type = "button",
 onClick,
 ...props 
}: ButtonProps) {
 const variants = {
  primary: "bg-stone-900 text-white hover:bg-stone-800 shadow-sm",
  secondary: "bg-stone-100 text-stone-900 hover:bg-stone-200/80",
  outline: "bg-white border border-stone-200 text-stone-900 hover:bg-stone-50 hover:border-stone-300 shadow-sm",
  ghost: "text-stone-500 hover:bg-stone-100/50 hover:text-stone-900",
  danger: "bg-white border border-stone-200 text-red-600 hover:bg-red-50 hover:border-red-100",
 };

 const sizes = {
  sm: "min-h-[1.6975rem] px-3 py-[0.2425rem] text-sm leading-snug font-medium rounded-lg",
  md: "min-h-[1.9364rem] px-4 py-[0.2425rem] text-sm leading-snug font-medium rounded-lg",
  lg: "min-h-[2.1825rem] px-5 py-[0.3638rem] text-sm leading-snug font-medium rounded-xl",
  icon: "min-h-[1.94rem] min-w-[1.94rem] p-[0.3638rem] rounded-lg",
 };

 return (
  <button
   type={type}
   onClick={onClick}
   data-ui="button"
   data-variant={variant}
   data-size={size}
   aria-busy={loading || undefined}
   className={cn(
    "inline-flex max-w-full items-center justify-center gap-2 whitespace-normal break-words text-center transition-all duration-200 [&>svg]:shrink-0",
    "active:scale-[0.97] active:duration-75",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-400 focus-visible:ring-offset-1",
    "disabled:opacity-50 disabled:pointer-events-none disabled:scale-100",
    variants[variant],
    sizes[size],
    className
   )}
   disabled={loading || disabled}
   {...props}
  >
   {loading ? (
    <span aria-hidden="true" className="w-4 h-4 shrink-0 border-2 border-current border-t-transparent rounded-full animate-spin" />
   ) : null}
   {children}
  </button>
 );
}
