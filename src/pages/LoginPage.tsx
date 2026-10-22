import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { bootstrapAccount } from '../lib/account';
import { Zap, Mail, Lock, ArrowRight, Chrome } from 'lucide-react';
import { auth } from '../firebase';
import { Both } from '../lib/both';
import { LanguageToggle, useT } from '../lib/language';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../App';

export default function LoginPage() {
 const t = useT();
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [rememberMe, setRememberMe] = useState(true);
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);
 const navigate = useNavigate();
 const location = useLocation();
 const { info: toastInfo } = useToast();
 const { toggleDemoMode } = useAuth();

 const from = location.state?.from?.pathname || '/dashboard';

 const friendlyError = (code: string): string => {
  const map: Record<string, string> = {
   'auth/operation-not-allowed': t('Email/password sign-in is not enabled. Please use Demo Mode or Google sign-in.', 'Η είσοδος με email/κωδικό δεν είναι ενεργή. Χρησιμοποίησε τη δοκιμαστική λειτουργία (Demo) ή την είσοδο με Google.'),
   'auth/user-not-found': t('No account found with this email. Did you mean to sign up?', 'Δεν βρέθηκε λογαριασμός με αυτό το email. Ήθελες εγγραφή;'),
   'auth/wrong-password': t('Incorrect password. Please try again.', 'Λάθος κωδικός. Δοκίμασε ξανά.'),
   'auth/invalid-credential': t('Invalid email or password.', 'Λάθος email ή κωδικός.'),
   'auth/invalid-email': t('Please enter a valid email address.', 'Βάλε μια έγκυρη διεύθυνση email.'),
   'auth/user-disabled': t('This account has been disabled. Contact support.', 'Αυτός ο λογαριασμός έχει απενεργοποιηθεί. Επικοινώνησε με την υποστήριξη.'),
   'auth/popup-closed-by-user': t('Sign-in popup was closed. Please try again.', 'Το παράθυρο εισόδου έκλεισε. Δοκίμασε ξανά.'),
   'auth/network-request-failed': t('Network error. Please check your connection.', 'Σφάλμα δικτύου. Έλεγξε τη σύνδεσή σου.'),
   'auth/too-many-requests': t('Too many attempts. Please wait a moment and try again.', 'Πολλές προσπάθειες. Περίμενε λίγο και δοκίμασε ξανά.'),
  };
  return map[code] || t('Something went wrong. Please try again.', 'Κάτι πήγε στραβά. Δοκίμασε ξανά.');
 };

 const handleEmailLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  try {
   toggleDemoMode(false);
   await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
   await signInWithEmailAndPassword(auth, email, password);
   navigate(from, { replace: true });
  } catch (err: any) {
   setError(friendlyError(err.code));
  } finally {
   setLoading(false);
  }
 };

 const handleGoogleLogin = async () => {
  setLoading(true);
  setError('');
  try {
   const provider = new GoogleAuthProvider();
   // Add scopes for better user info
   provider.addScope('profile');
   provider.addScope('email');
   toggleDemoMode(false);
   const result = await signInWithPopup(auth, provider);
   await bootstrapAccount(result.user, result.user.displayName || undefined);
   navigate(from, { replace: true });
  } catch (err: any) {
   console.error('Google Auth Error:', err);
   // Better error handling for Google Auth issues
   if (err.code === 'auth/unauthorized-domain' || err.code === 'auth/operation-not-allowed') {
    setError(t('Google sign-in is not available here.', 'Η σύνδεση με Google δεν είναι διαθέσιμη εδώ.'));
   } else if (err.code === 'auth/popup-closed-by-user') {
    setError(t('Sign-in popup was closed. Please try again.', 'Το παράθυρο εισόδου έκλεισε. Δοκίμασε ξανά.'));
   } else if (err.code === 'auth/popup-blocked') {
    setError(t('Popup was blocked. Please allow popups for this site.', 'Το αναδυόμενο παράθυρο αποκλείστηκε. Επίτρεψε τα αναδυόμενα για αυτό τον ιστότοπο.'));
   } else {
    setError(friendlyError(err.code));
   }
  } finally {
   setLoading(false);
  }
 };

 return (
  <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-16 sm:px-6 lg:px-8 relative">
   <div className="absolute top-4 right-4">
    <LanguageToggle />
   </div>
   <div className="sm:mx-auto sm:w-full sm:max-w-md">
    <NavLink to="/" className="flex justify-center items-center gap-2 mb-6 group">
     <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center transition-transform">
      <Zap className="w-6 h-6 text-white" />
     </div>
     <span className="text-lg font-medium text-stone-900 tracking-tight">CoFounderBay</span>
    </NavLink>
    <h2 className="text-center text-xl sm:text-2xl font-semibold tracking-tight text-stone-900">
     <Both en="Welcome back" el="Καλώς ήρθες ξανά" />
    </h2>
    <p className="mt-2 text-center text-sm text-stone-500">
     <Both en="After sign-in: dashboard, matches, and the studio assistant on the same lists." el="Μετά την είσοδο: πίνακας, αντιστοιχίσεις, και ο βοηθός στις ίδιες λίστες." />
    </p>
    <p className="mt-2 text-center text-sm text-stone-500">
     <Both en="Don't have an account?" el="Δεν έχεις λογαριασμό;" />{' '}
     <NavLink to="/signup" className="font-semibold text-stone-900 hover:text-stone-700 underline underline-offset-4">
      <Both en="Sign up for free" el="Εγγραφή δωρεάν" />
     </NavLink>
     {' · '}
     <NavLink to="/quiz" className="font-semibold text-stone-900 hover:text-stone-700 underline underline-offset-4">
      <Both en="60s fit check" el="Fit check 60 δευτ." />
     </NavLink>
    </p>
   </div>

   <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    <div className="bg-white py-8 px-3 shadow-xl shadow-stone-200/50 sm:rounded-2xl sm:px-10 border border-stone-100">
     <section aria-label={t('Demo access', 'Δοκιμαστική είσοδος')} className="mb-6 border-b border-stone-200 pb-6">
      <button
       type="button"
       disabled={loading}
       onClick={() => {
        toggleDemoMode(true);
        navigate('/dashboard', { replace: true });
       }}
       className="w-full min-h-11 inline-flex justify-center items-center gap-2 py-2 px-4 border border-stone-900 rounded-xl bg-stone-900 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
       <Zap className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" aria-hidden="true" />
       <Both en="Enter Demo — no account needed" el="Είσοδος Demo — χωρίς λογαριασμό" />
      </button>
      <p className="mt-2 text-center text-xs text-stone-500">
       <Both en="Explore with sample data. No email, password or Google account required." el="Δοκίμασε την εφαρμογή με δοκιμαστικά δεδομένα. Δεν χρειάζεται email, κωδικός ή λογαριασμός Google." />
      </p>
     </section>
     <form className="space-y-6" onSubmit={handleEmailLogin}>
      <div>
       <label htmlFor="email" className="block text-sm font-medium text-stone-700">
        <Both en="Email address" el="Διεύθυνση email" />
       </label>
       <div className="mt-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
         <Mail className="h-5 w-5 text-stone-400" />
        </div>
        <input
         id="email"
         name="email"
         type="email"
         autoComplete="email"
         required
         value={email}
         onChange={(e) => setEmail(e.target.value)}
         className="appearance-none block w-full min-h-11 pl-10 px-3 py-3 border border-stone-200 rounded-xl shadow-sm placeholder-stone-400 focus:outline-none focus:ring-stone-900 focus:border-stone-900 text-base sm:text-sm transition-all"
         placeholder="name@company.com"
        />
       </div>
      </div>

      <div>
       <label htmlFor="password" className="block text-sm font-medium text-stone-700">
        <Both en="Password" el="Κωδικός" />
       </label>
       <div className="mt-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
         <Lock className="h-5 w-5 text-stone-400" />
        </div>
        <input
         id="password"
         name="password"
         type="password"
         autoComplete="current-password"
         required
         value={password}
         onChange={(e) => setPassword(e.target.value)}
         className="appearance-none block w-full min-h-11 pl-10 px-3 py-3 border border-stone-200 rounded-xl shadow-sm placeholder-stone-400 focus:outline-none focus:ring-stone-900 focus:border-stone-900 text-base sm:text-sm transition-all"
         placeholder="••••••••"
        />
       </div>
      </div>

      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
       <label htmlFor="remember-me" className="inline-flex min-h-11 items-center gap-2 text-sm text-stone-600">
        <input
         id="remember-me"
         name="remember-me"
         type="checkbox"
         checked={rememberMe}
         onChange={(e) => setRememberMe(e.target.checked)}
         className="h-5 w-5 text-stone-900 focus:ring-stone-900 border-stone-300 rounded"
        />
        <Both en="Remember me" el="Να με θυμάσαι" />
       </label>

       <div className="text-sm">
        <button
         type="button"
         className="inline-flex min-h-11 items-center font-medium text-stone-600 hover:text-stone-900 transition-colors"
         onClick={async () => {
          if (!email) {
           setError(t('Enter your email first, then try again.', 'Βάλε πρώτα το email σου.'));
           return;
          }
          try {
           await sendPasswordResetEmail(auth, email);
           toastInfo(t('Reset email sent.', 'Στάλθηκε email επαναφοράς.'), t('Check that inbox, then sign in.', 'Έλεγξε τα εισερχόμενα και μετά κάνε είσοδο.'));
          } catch (err: any) {
           setError(friendlyError(err.code));
          }
         }}
        >
         <Both en="Forgot your password?" el="Ξέχασες τον κωδικό;" />
        </button>
       </div>
      </div>

      {error && (
       <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-100">
        {error}
       </div>
      )}

      <div>
       <button
        type="submit"
        disabled={loading}
        className="w-full min-h-11 flex justify-center items-center py-2 px-4 rounded-xl text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-50 transition-all group"
       >
        {loading ? <Both en="Logging in..." el="Σύνδεση..." /> : <Both en="Sign in" el="Είσοδος" />}
        <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
       </button>
      </div>
     </form>

     <div className="mt-6">
      <div className="relative">
       <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-stone-200" />
       </div>
       <div className="relative flex justify-center text-sm">
        <span className="px-2 bg-white text-stone-500"><Both en="Or continue with" el="Ή συνέχισε με" /></span>
       </div>
      </div>

      <div className="mt-6">
       <button
        onClick={handleGoogleLogin}
         disabled={loading}
        className="w-full min-h-11 inline-flex justify-center items-center py-2 px-4 border border-stone-200 rounded-xl bg-white text-sm font-semibold text-stone-500 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
       >
        <Chrome className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-stone-900" />
        Google
       </button>
      </div>

     </div>
    </div>
   </div>
  </div>
 );
}
