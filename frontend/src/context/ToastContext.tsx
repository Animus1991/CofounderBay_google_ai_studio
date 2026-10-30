import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
 id: string;
 type: ToastType;
 title: string;
 description?: string;
 duration?: number;
 /** Optional inline action — e.g. Undo for a just-removed record. */
 action?: { label: string; run: () => void };
}

interface ToastContextType {
 toast: (opts: Omit<Toast, 'id'>) => void;
 success: (title: string, description?: string) => void;
 error: (title: string, description?: string) => void;
 info: (title: string, description?: string) => void;
 warning: (title: string, description?: string) => void;
 dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType>({
 toast: () => {},
 success: () => {},
 error: () => {},
 info: () => {},
 warning: () => {},
 dismiss: () => {},
});

export const useToast = () => useContext(ToastContext);

const icons: Record<ToastType, React.ReactNode> = {
 success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
 error: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />,
 info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
 warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
};

const borderColors: Record<ToastType, string> = {
 success: 'border-l-emerald-500',
 error: 'border-l-red-500',
 info: 'border-l-blue-500',
 warning: 'border-l-amber-500',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
 const [toasts, setToasts] = useState<Toast[]>([]);
 const counterRef = useRef(0);

 const dismiss = useCallback((id: string) => {
  setToasts(prev => prev.filter(t => t.id !== id));
 }, []);

 const addToast = useCallback((opts: Omit<Toast, 'id'>) => {
  const id = `toast-${++counterRef.current}`;
  const duration = opts.duration ?? 4000;
  setToasts(prev => [...prev.slice(-4), { ...opts, id }]);
  if (duration > 0) {
   setTimeout(() => dismiss(id), duration);
  }
 }, [dismiss]);

 const success = useCallback((title: string, description?: string) => addToast({ type: 'success', title, description }), [addToast]);
 const error = useCallback((title: string, description?: string) => addToast({ type: 'error', title, description, duration: 6000 }), [addToast]);
 const info = useCallback((title: string, description?: string) => addToast({ type: 'info', title, description }), [addToast]);
 const warning = useCallback((title: string, description?: string) => addToast({ type: 'warning', title, description, duration: 5000 }), [addToast]);

 return (
  <ToastContext.Provider value={{ toast: addToast, success, error, info, warning, dismiss }}>
   {children}
   {/* Toast Container */}
   <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
    <AnimatePresence mode="popLayout">
     {toasts.map(t => (
      <motion.div
       key={t.id}
       layout
       initial={{ opacity: 0, y: 20, scale: 0.95 }}
       animate={{ opacity: 1, y: 0, scale: 1 }}
       exit={{ opacity: 0, x: 80, scale: 0.95 }}
       transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
       className={cn(
        "pointer-events-auto bg-white rounded-xl shadow-sm shadow-stone-900/10 border border-stone-100 border-l-4 p-4 flex items-start gap-3",
        borderColors[t.type]
       )}
      >
       {icons[t.type]}
       <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-900">{t.title}</p>
        {t.description && <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{t.description}</p>}
        {t.action && (
         <button
          type="button"
          onClick={() => { t.action!.run(); dismiss(t.id); }}
          className="mt-1.5 text-xs font-semibold text-stone-900 underline underline-offset-2 hover:text-stone-600"
         >
          {t.action.label}
         </button>
        )}
       </div>
       <button 
        onClick={() => dismiss(t.id)} 
        className="p-1 hover:bg-stone-100 rounded-lg transition-colors text-stone-400 hover:text-stone-900 shrink-0"
       >
        <X className="w-3.5 h-3.5" />
       </button>
      </motion.div>
     ))}
    </AnimatePresence>
   </div>
  </ToastContext.Provider>
 );
}
