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

  primary: "bg-primary text-primary-foreground hover:bg-[color-mix(in_hsl,hsl(var(--primary))_78%,hsl(var(--primary-mid)))] shadow-none",

  secondary: "bg-secondary text-secondary-foreground hover:bg-foreground/5",

  outline: "bg-card border border-border text-foreground hover:bg-secondary shadow-none",

  ghost: "text-foreground/70 hover:bg-secondary hover:text-foreground",

  danger: "bg-red-50 text-red-700 hover:bg-red-100",

 };



 const sizes = {

  sm: "px-3 py-1.5 text-xs font-medium rounded-lg",

  md: "px-4 py-2 text-sm font-medium rounded-lg",

  lg: "px-5 py-2.5 text-sm font-medium rounded-xl",

  icon: "p-2 rounded-lg",

 };



 return (

  <button

   type={type}

   onClick={onClick}

   className={cn(

    "inline-flex items-center justify-center gap-2 transition-all duration-200",

    "active:scale-[0.97] active:duration-75",

    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",

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

