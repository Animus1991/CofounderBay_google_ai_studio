import React, { ReactNode, ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

interface ButtonProps {
 variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
 size?: "sm" | "md" | "lg" | "icon";
 children: ReactNode;
 loading?: boolean;
 className?: string;
 onClick?: any;
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
  outline: "bg-white border border-stone-200 text-stone-900 hover:bg-stone-50 shadow-sm",
  ghost: "text-stone-500 hover:bg-stone-100/50 hover:text-stone-900",
  danger: "bg-red-50 text-red-600 hover:bg-red-100/80",
 };

 const sizes = {
  sm: "min-h-11 px-3 py-2 text-sm font-medium rounded-lg",
  md: "min-h-11 px-4 py-2 text-sm font-medium rounded-lg",
  lg: "min-h-11 px-5 py-2.5 text-sm font-medium rounded-xl",
  icon: "min-h-11 min-w-11 p-2 rounded-lg",
 };

 return (
  <button
   type={type}
   onClick={onClick}
   className={cn(
    "inline-flex items-center justify-center gap-2 transition-all duration-200",
    "active:scale-[0.97] active:duration-75",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2",
    "disabled:opacity-50 disabled:pointer-events-none disabled:scale-100",
    variants[variant],
    sizes[size],
    className
   )}
   disabled={loading || disabled}
   {...props}
  >
   {loading ? (
    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
   ) : null}
   {children}
  </button>
 );
}
