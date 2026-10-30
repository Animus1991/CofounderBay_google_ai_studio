import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import Counter from './Counter';
import { useId, type KeyboardEvent } from 'react';
import { useT } from '../../lib/language';

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
 label?: string;
}

export default function Tabs({ tabs, activeTab, onChange, variant = 'pills', size = 'md', className, label }: TabsProps) {
 const t = useT();
 const groupId = useId();
 // These controls filter/switch existing content; not every consumer has a
 // tabpanel, so expose an honestly labelled single-choice button group.
 const groupProps = { role: 'group', 'data-ui': 'view-options', 'aria-label': label ?? t('View options', 'Επιλογές προβολής') };
 const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (index < 0 || !buttons.length) return;
  event.preventDefault();
  const target = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
   : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
  buttons[target]?.focus();
 };
 if (variant === 'segment') {
  return (
   <div {...groupProps} onKeyDown={onKeyDown} className={cn("scroll-tabs bg-stone-100 rounded-xl p-1", className)}>
    {tabs.map(tab => (
     <button
      key={tab.id}
      type="button"
      data-ui="view-option"
      aria-pressed={tab.id === activeTab}
      onClick={() => onChange(tab.id)}
      className={cn(
       "relative px-4 py-2 rounded-lg text-sm font-medium transition-all",
       tab.id === activeTab
        ? "bg-white text-stone-900 shadow-sm"
        : "text-stone-500 hover:text-stone-700"
      )}
     >
      <span className="relative z-10 flex min-w-0 items-center justify-center gap-2">
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
   <div {...groupProps} onKeyDown={onKeyDown} className={cn("scroll-tabs border-b border-stone-200", className)}>
    {tabs.map(tab => (
     <button
      key={tab.id}
      type="button"
      data-ui="view-option"
      aria-pressed={tab.id === activeTab}
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
        layoutId={`${groupId}-tab-underline`}
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
  <div {...groupProps} onKeyDown={onKeyDown} className={cn("flex flex-wrap gap-2", className)}>
   {tabs.map(tab => (
    <button
     key={tab.id}
     type="button"
     data-ui="view-option"
     aria-pressed={tab.id === activeTab}
     onClick={() => onChange(tab.id)}
     className={cn(
      "min-h-11 min-w-0 max-w-full border px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500",
      size === 'sm' ? 'px-3 py-1.5 text-xs' : '',
      tab.id === activeTab
       ? "bg-stone-100 text-stone-900 border-stone-300"
       : "bg-transparent text-stone-600 border-transparent hover:bg-white hover:border-stone-200 hover:text-stone-900"
     )}
    >
     {tab.icon && <tab.icon className="w-4 h-4" />}
     {tab.label}
     {tab.count !== undefined && (
      <Counter value={tab.count} tone={tab.attention && tab.count > 0 ? 'attention' : 'neutral'} />
     )}
    </button>
   ))}
  </div>
 );
}
