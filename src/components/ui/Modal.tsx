import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from './Button';

interface ModalProps {
 open: boolean;
 onClose: () => void;
 title?: string;
 description?: string;
 children?: React.ReactNode;
 size?: 'sm' | 'md' | 'lg' | 'xl';
 showClose?: boolean;
}

const sizeClasses = {
 sm: 'max-w-sm',
 md: 'max-w-md',
 lg: 'max-w-lg',
 xl: 'max-w-xl',
};

export default function Modal({ open, onClose, title, description, children, size = 'md', showClose = true }: ModalProps) {
 const overlayRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
  const handler = (e: KeyboardEvent) => {
   if (e.key === 'Escape' && open) onClose();
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
 }, [open, onClose]);

 useEffect(() => {
  if (open) {
   document.body.style.overflow = 'hidden';
  } else {
   document.body.style.overflow = '';
  }
  return () => { document.body.style.overflow = ''; };
 }, [open]);

 return (
  <AnimatePresence>
   {open && (
    <>
     <motion.div
      ref={overlayRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[150]"
     />
     <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
       "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] bg-white rounded-2xl shadow-2xl border border-stone-100 z-[151] overflow-hidden",
       sizeClasses[size]
      )}
     >
      {(title || showClose) && (
       <div className="flex items-start justify-between p-6 pb-0">
        <div>
         {title && <h2 className="text-lg font-semibold text-stone-900">{title}</h2>}
         {description && <p className="text-sm text-stone-500 mt-1">{description}</p>}
        </div>
        {showClose && (
         <button onClick={onClose} className="p-2 -m-2 hover:bg-stone-100 rounded-xl transition-colors text-stone-400 hover:text-stone-900">
          <X className="w-5 h-5" />
         </button>
        )}
       </div>
      )}
      <div className="p-6">
       {children}
      </div>
     </motion.div>
    </>
   )}
  </AnimatePresence>
 );
}

// Convenience: Confirm Dialog
interface ConfirmDialogProps {
 open: boolean;
 onClose: () => void;
 onConfirm: () => void;
 title: string;
 description?: string;
 confirmLabel?: string;
 cancelLabel?: string;
 variant?: 'danger' | 'default';
 loading?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'default', loading }: ConfirmDialogProps) {
 return (
  <Modal open={open} onClose={onClose} title={title} description={description} size="sm" showClose={false}>
   <div className="flex items-center justify-end gap-3 mt-4">
    <Button variant="ghost" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
    <Button 
     variant={variant === 'danger' ? 'primary' : 'primary'} 
     onClick={onConfirm}
     disabled={loading}
     className={cn(variant === 'danger' && 'bg-red-600 hover:bg-red-700 shadow-red-600/20')}
    >
     {loading ? 'Processing...' : confirmLabel}
    </Button>
   </div>
  </Modal>
 );
}
