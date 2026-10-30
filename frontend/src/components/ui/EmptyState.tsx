import React from 'react';
import { Inbox } from 'lucide-react';
import EmptyHint from './EmptyHint';
import Button from './Button';

interface EmptyStateProps {
 icon?: React.ElementType;
 title: string;
 description?: string;
 actionLabel?: string;
 onAction?: () => void;
 className?: string;
}

/** Centered empty — same copy system as EmptyHint, with an optional primary action. */
export default function EmptyState({ icon: Icon = Inbox, title, description, actionLabel, onAction, className }: EmptyStateProps) {
 return (
  <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className || ''}`}>
   <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-5">
    <Icon className="w-7 h-7 text-stone-400" />
   </div>
   <EmptyHint title={title} detail={description} className="border-0 bg-transparent shadow-none max-w-sm mx-auto">
    {actionLabel && onAction ? (
     <Button variant="primary" onClick={onAction}>{actionLabel}</Button>
    ) : null}
   </EmptyHint>
  </div>
 );
}
