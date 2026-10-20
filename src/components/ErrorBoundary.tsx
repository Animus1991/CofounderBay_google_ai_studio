import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { captureException } from '../lib/errorTracking';
import { bothText } from '../lib/labels';

interface Props {
 children: ReactNode;
}

interface State {
 hasError: boolean;
 error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
 public state: State = {
  hasError: false,
  error: null,
 };

 public static getDerivedStateFromError(error: Error): State {
  return { hasError: true, error };
 }

 public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  captureException(error, { componentStack: errorInfo.componentStack, source: 'ErrorBoundary' });
 }

 public render() {
  if (this.state.hasError) {
   let errorMessage = bothText('An unexpected error occurred.', 'Προέκυψε μη αναμενόμενο σφάλμα.');
   let errorDetails = null;

   try {
    if (this.state.error?.message) {
     const parsed = JSON.parse(this.state.error.message);
     if (parsed.error) {
      errorMessage = bothText('Firebase Permission Error', 'Σφάλμα δικαιωμάτων Firebase');
      errorDetails = parsed;
     }
    }
   } catch (e) {
    errorMessage = this.state.error?.message || errorMessage;
   }

   return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
     <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-stone-200 p-8 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
       <AlertTriangle className="w-8 h-8 text-red-600" />
      </div>
      <h1 className="text-xl sm:text-2xl font-semibold text-stone-900 mb-2">{errorMessage}</h1>
      <p className="text-stone-600 mb-8">
       {errorDetails 
        ? bothText(`You don't have permission to perform this ${errorDetails.operationType} operation on ${errorDetails.path}.`, `Δεν έχεις δικαίωμα για αυτή την ενέργεια ${errorDetails.operationType} στο ${errorDetails.path}.`)
        : bothText('We encountered a problem while loading this page.', 'Πρόβλημα κατά τη φόρτωση αυτής της σελίδας.')}
      </p>
      <button
       onClick={() => window.location.reload()}
       className="w-full flex items-center justify-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-stone-800 transition-colors"
      >
       <RefreshCw className="w-4 h-4" />
       {bothText('Try Again', 'Επανάληψη')}
      </button>
      {errorDetails && (
       <div className="mt-8 pt-6 border-t border-stone-100 text-left">
        <p className="text-xs font-mono text-stone-400 break-all">
         {JSON.stringify(errorDetails, null, 2)}
        </p>
       </div>
      )}
     </div>
    </div>
   );
  }

  return this.props.children;
 }
}

export default ErrorBoundary;
