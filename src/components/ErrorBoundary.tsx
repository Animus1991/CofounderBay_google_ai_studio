import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { captureException } from '../lib/errorTracking';
import { bothText } from '../lib/labels';
import { isFirestoreAssertion, recoverFromFirestoreAssertion } from '../firebase';

interface Props {
 children: ReactNode;
 /** When this value changes (e.g. the route), a previous error is cleared. */
 resetKey?: string;
}

interface State {
 hasError: boolean;
 error: Error | null;
 repairing: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
 public state: State = {
  hasError: false,
  error: null,
  repairing: false,
 };

 public static getDerivedStateFromError(error: Error): Partial<State> {
  return { hasError: true, error };
 }

 public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  captureException(error, { componentStack: errorInfo.componentStack, source: 'ErrorBoundary' });
  if (isFirestoreAssertion(error) && recoverFromFirestoreAssertion(error)) {
   this.setState({ repairing: true });
  }
 }

 public componentDidUpdate(prevProps: Props) {
  if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
   this.setState({ hasError: false, error: null, repairing: false });
  }
 }

 public render() {
  if (this.state.hasError) {
   const firestore = isFirestoreAssertion(this.state.error);
   let errorMessage = bothText('An unexpected error occurred.', 'Προέκυψε μη αναμενόμενο σφάλμα.');
   let errorDetails: { error?: string; operationType?: string; path?: string } | null = null;

   if (firestore) {
    errorMessage = this.state.repairing
     ? bothText('Reconnecting to live data…', 'Επανασύνδεση με τα ζωντανά δεδομένα…')
     : bothText('Live data connection lost', 'Χάθηκε η σύνδεση με τα ζωντανά δεδομένα');
   } else {
    try {
     if (this.state.error?.message) {
      const parsed = JSON.parse(this.state.error.message);
      if (parsed.error) {
       errorMessage = bothText('Firebase Permission Error', 'Σφάλμα δικαιωμάτων Firebase');
       errorDetails = parsed;
      }
     }
    } catch {
     /* keep the generic title — never put a raw SDK dump in the heading */
    }
   }

   const detail = firestore
    ? (this.state.repairing
     ? bothText('The page will reload in a moment.', 'Η σελίδα θα φορτώσει ξανά σε λίγο.')
     : bothText('Reload the page to reconnect. Your work in this tab is unchanged.', 'Φόρτωσε ξανά τη σελίδα για επανασύνδεση. Η δουλειά σε αυτή την καρτέλα μένει όπως είναι.'))
    : errorDetails
     ? bothText(`You don't have permission to perform this ${errorDetails.operationType} operation on ${errorDetails.path}.`, `Δεν έχεις δικαίωμα για αυτή την ενέργεια ${errorDetails.operationType} στο ${errorDetails.path}.`)
     : bothText('We encountered a problem while loading this page.', 'Πρόβλημα κατά τη φόρτωση αυτής της σελίδας.');

   return (
    <div className="min-h-[60vh] flex items-center justify-center bg-stone-50 p-4">
     <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
       <AlertTriangle className="w-8 h-8 text-red-600" />
      </div>
      <h1 className="text-xl sm:text-2xl font-semibold text-stone-900 mb-2">{errorMessage}</h1>
      <p className="text-stone-600 mb-8">{detail}</p>
      {!this.state.repairing && (
       <button
        type="button"
        onClick={() => window.location.reload()}
        className="w-full flex items-center justify-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-stone-800 transition-colors"
       >
        <RefreshCw className="w-4 h-4" />
        {bothText('Try Again', 'Επανάληψη')}
       </button>
      )}
     </div>
    </div>
   );
  }

  return this.props.children;
 }
}

/** Keeps the chrome (sidebar) when a page throws; clears on navigation. */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
 const { pathname } = useLocation();
 return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}

export default ErrorBoundary;
