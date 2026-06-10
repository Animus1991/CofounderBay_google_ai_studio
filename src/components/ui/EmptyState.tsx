import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

interface EmptyStateProps {
 icon?: React.ElementType;
 title: string;
 description?: string;
 actionLabel?: string;
 onAction?: () => void;
 className?: string;
}

export default function EmptyState({ icon: Icon = Inbox, title, description, actionLabel, onAction, className }: EmptyStateProps) {
 return (
  <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className || ''}`}>
   <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-5">
    <Icon className="w-7 h-7 text-stone-400" />
   </div>
   <h3 className="text-base font-semibold text-stone-900 mb-1">{title}</h3>
   {description && <p className="text-sm text-stone-500 max-w-sm mb-6">{description}</p>}
   {actionLabel && onAction && (
    <Button variant="primary" onClick={onAction}>
     {actionLabel}
    </Button>
   )}
  </div>
 );
}
