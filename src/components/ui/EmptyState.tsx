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
   <div className="w-14 h-14 bg-primary/40 rounded-2xl flex items-center justify-center mb-5">
    <Icon className="w-6 h-6 text-primary-foreground" />
   </div>
   <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
   {description && <p className="text-sm text-muted-foreground max-w-prose mb-6">{description}</p>}
   {actionLabel && onAction && (
    <Button variant="primary" onClick={onAction}>
     {actionLabel}
    </Button>
   )}
  </div>
 );
}
