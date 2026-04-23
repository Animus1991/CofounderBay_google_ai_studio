import React from "react";
import { cn } from "../../lib/utils";

interface PageContainerProps {
 children: React.ReactNode;
 className?: string;
 maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full" | "7xl";
 noPadding?: boolean;
 fullHeight?: boolean;
}

const PageContainer: React.FC<PageContainerProps> = ({ 
 children, 
 className,
 maxWidth = "7xl",
 noPadding = false,
 fullHeight = false
}) => {
 const maxWidthClasses = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
 };

 return (
  <div className={cn(
   "w-full mx-auto px-4 sm:px-6 lg:px-8",
   !noPadding && "py-6 md:py-10",
   fullHeight && "h-full flex flex-col",
   maxWidthClasses[maxWidth],
   className
  )}>
   {children}
  </div>
 );
};

export default PageContainer;
