import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import Counter from './Counter';

interface Tab {
 id: string;
 label: string;
 icon?: React.ElementType;
 count?: number;
 /** The count waits on you (unread, to answer). */
 attention?: boolean;
}

interface TabsProps {
 tabs: Tab[];
 activeTab: string;
 onChange: (id: string) => void;
 variant?: 'pills' | 'underline' | 'segment';
 size?: 'sm' | 'md';
 className?: string;
}

export default function Tabs({ tabs, activeTab, onChange, variant = 'pills', size = 'md', className }: TabsProps) {
 if (variant === 'segment') {
  return (
   <div className={cn("scroll-tabs bg-stone-100 rounded-xl p-1", className)}>
    {tabs.map(tab => (
     <button
      key={tab.id}
      onClick={() => onChange(tab.id)}
      className={cn(
       "relative px-4 py-2 rounded-lg text-sm font-medium transition-all",
       tab.id === activeTab
        ? "bg-white text-stone-900 shadow-sm"
        : "text-stone-500 hover:text-stone-700"
      )}
     >
      <span className="relative z-10 flex items-center gap-2">
       {tab.icon && <tab.icon className="w-4 h-4" />}
       {tab.label}
       {tab.count !== undefined && <Counter value={tab.count} tone={tab.attention && tab.count > 0 ? 'attention' : 'neutral'} />}
      </span>
     </button>
    ))}
   </div>
  );
 }

 if (variant === 'underline') {
  return (
   <div className={cn("scroll-tabs border-b border-stone-200", className)}>
    {tabs.map(tab => (
     <button
      key={tab.id}
      onClick={() => onChange(tab.id)}
      className={cn(
       "relative px-4 pb-3 text-sm font-medium transition-colors flex items-center gap-2",
       size === 'sm' ? 'px-3 pb-2 text-xs' : '',
       tab.id === activeTab ? "text-stone-900" : "text-stone-500 hover:text-stone-700"
      )}
     >
      {tab.icon && <tab.icon className="w-4 h-4" />}
      {tab.label}
      {tab.count !== undefined && <Counter value={tab.count} tone={tab.attention && tab.count > 0 ? 'attention' : 'neutral'} />}
      {tab.id === activeTab && (
       <motion.div
        layoutId="tab-underline"
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900 rounded-full"
       />
      )}
     </button>
    ))}
   </div>
  );
 }

 // Pills (default)
 return (
  <div className={cn("flex flex-wrap gap-2", className)}>
   {tabs.map(tab => (
    <button
     key={tab.id}
     onClick={() => onChange(tab.id)}
     className={cn(
      "min-h-11 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
      size === 'sm' ? 'px-3 py-1.5 text-xs' : '',
      tab.id === activeTab
       ? "bg-stone-900 text-white shadow-lg shadow-stone-900/10"
       : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900"
     )}
    >
     {tab.icon && <tab.icon className="w-4 h-4" />}
     {tab.label}
     {tab.count !== undefined && (
      <Counter value={tab.count} tone={tab.id === activeTab ? 'inverse' : tab.attention && tab.count > 0 ? 'attention' : 'neutral'} />
     )}
    </button>
   ))}
  </div>
 );
}
