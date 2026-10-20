/**
 * Professional 404 page — replaces the previous silent redirect so users with a
 * broken/mistyped link understand what happened and can recover gracefully.
 */
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass, Home, Search } from 'lucide-react';
import { useAuth } from '../App';
import { useT } from '../lib/language';

export default function NotFound() {
  const t = useT();
  const navigate = useNavigate();
  const { user, isDemoMode } = useAuth();
  const isAuthenticated = Boolean(user) || isDemoMode;

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6">
      <div className="max-w-md w-full text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400 mb-4">
          {t('Error 404', 'Σφάλμα 404')}
        </p>
        <h1 className="text-5xl font-bold tracking-tighter text-stone-900 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-stone-900 mb-2">{t('This page does not exist', 'Αυτή η σελίδα δεν υπάρχει')}</h2>
        <p className="text-sm text-stone-500 leading-relaxed mb-8">
          {t('The link may be broken, the page may have moved, or it never existed. Let\'s get you back on track.', 'Ο σύνδεσμος μπορεί να είναι κατεστραμμένος, η σελίδα μπορεί να έχει μετακινηθεί, ή να μην υπήρξε ποτέ. Ας σε επιστρέψουμε στη σωστή πορεία.')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium tracking-wider rounded-lg bg-white border border-stone-200 text-stone-900 hover:bg-stone-50 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            {t('Go back', 'Πίσω')}
          </button>
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium tracking-wider rounded-lg bg-stone-900 text-white hover:bg-stone-800 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
          >
            <Home className="w-3.5 h-3.5" aria-hidden="true" />
            {isAuthenticated ? t('Dashboard', 'Πίνακας') : t('Home', 'Αρχική')}
          </Link>
        </div>

        {isAuthenticated && (
          <div className="mt-10 pt-8 border-t border-stone-200/60">
            <p className="text-micro mb-4">{t('Popular destinations', 'Δημοφιλείς προορισμοί')}</p>
            <div className="flex items-center justify-center gap-6 text-xs font-medium text-stone-500">
              <Link
                to="/matches"
                className="inline-flex items-center gap-1.5 hover:text-stone-900 transition-colors"
              >
                <Search className="w-3.5 h-3.5" aria-hidden="true" />
                {t('Matches', 'Αντιστοιχίσεις')}
              </Link>
              <Link
                to="/discovery"
                className="inline-flex items-center gap-1.5 hover:text-stone-900 transition-colors"
              >
                <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                {t('Discovery', 'Εξερεύνηση')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
