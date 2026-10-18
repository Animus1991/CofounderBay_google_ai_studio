import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from './Button';
import { useT } from '../../lib/language';

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
 const t = useT();
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
       "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-h-[min(92dvh,100%)] overflow-y-auto bg-white rounded-2xl shadow-sm border border-stone-100 z-[151]",
       sizeClasses[size]
      )}
     >
      {(title || showClose) && (
       <div className="flex items-start justify-between gap-3 p-4 sm:p-6 pb-0">
        <div className="min-w-0">
         {title && <h2 className="text-lg font-semibold text-stone-900">{title}</h2>}
         {description && <p className="text-sm text-stone-500 mt-1">{description}</p>}
        </div>
        {showClose && (
         <button type="button" onClick={onClose} aria-label={t('Close', 'Κλείσιμο')} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center hover:bg-stone-100 rounded-xl transition-colors text-stone-400 hover:text-stone-900">
          <X className="w-5 h-5" />
         </button>
        )}
       </div>
      )}
      <div className="p-4 sm:p-6">
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

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel, cancelLabel, variant = 'default', loading }: ConfirmDialogProps) {
 const t = useT();
 return (
  <Modal open={open} onClose={onClose} title={title} description={description} size="sm" showClose={false}>
   <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 mt-4">
    <Button variant="ghost" onClick={onClose} disabled={loading} className="w-full sm:w-auto">{cancelLabel ?? t('Cancel', 'Άκυρο')}</Button>
    <Button 
     variant={variant === 'danger' ? 'primary' : 'primary'} 
     onClick={onConfirm}
     disabled={loading}
     className={cn("w-full sm:w-auto", variant === 'danger' && 'bg-red-600 hover:bg-red-700 shadow-red-600/20')}
    >
     {loading ? t('Processing...', 'Επεξεργασία…') : (confirmLabel ?? t('Confirm', 'Επιβεβαίωση'))}
    </Button>
   </div>
  </Modal>
 );
}
