import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendEmailVerification } from 'firebase/auth';
import { bootstrapAccount } from '../lib/account';
import { Zap, Mail, Lock, ArrowRight, Chrome, User, FlaskConical } from 'lucide-react';
import { auth } from '../firebase';
import { useAuth } from '../App';
import { LanguageToggle, useT } from '../lib/language';

export default function SignUpPage() {
 const t = useT();
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [fullName, setFullName] = useState('');
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);
 const navigate = useNavigate();
 const { toggleDemoMode } = useAuth();

 const handleDemoMode = () => {
  toggleDemoMode(true);
  navigate('/dashboard');
 };

 const friendlyError = (code: string): string => {
  const map: Record<string, string> = {
   'auth/operation-not-allowed': t('Email/password sign-up is not enabled yet. Please use Demo Mode or try Google sign-in.', 'Η εγγραφή με email/κωδικό δεν είναι ενεργή ακόμα. Χρησιμοποίησε τη δοκιμαστική λειτουργία (Demo) ή την είσοδο με Google.'),
   'auth/email-already-in-use': t('An account with this email already exists. Try signing in.', 'Υπάρχει ήδη λογαριασμός με αυτό το email. Δοκίμασε είσοδο.'),
   'auth/weak-password': t('Password must be at least 6 characters.', 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.'),
   'auth/invalid-email': t('Please enter a valid email address.', 'Βάλε μια έγκυρη διεύθυνση email.'),
   'auth/popup-closed-by-user': t('Sign-in popup was closed. Please try again.', 'Το παράθυρο εισόδου έκλεισε. Δοκίμασε ξανά.'),
   'auth/cancelled-popup-request': t('Only one sign-in popup can be open at a time.', 'Μόνο ένα παράθυρο εισόδου μπορεί να είναι ανοιχτό κάθε φορά.'),
   'auth/network-request-failed': t('Network error. Please check your connection and try again.', 'Σφάλμα δικτύου. Έλεγξε τη σύνδεσή σου και δοκίμασε ξανά.'),
   'auth/too-many-requests': t('Too many attempts. Please wait a moment and try again.', 'Πολλές προσπάθειες. Περίμενε λίγο και δοκίμασε ξανά.'),
  };
  return map[code] || t('Something went wrong. Please try again.', 'Κάτι πήγε στραβά. Δοκίμασε ξανά.');
 };

 const handleEmailSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
   if (password.length < 8) {
    setError(t('Password must be at least 8 characters.', 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.'));
    return;
   }
  setLoading(true);
  setError('');
  try {
   toggleDemoMode(false);
   const created = await createUserWithEmailAndPassword(auth, email, password);
   await bootstrapAccount(created.user, fullName);
   // Verification mail is best effort: the account works right away, the badge appears once confirmed.
   void sendEmailVerification(created.user, { url: `${window.location.origin}/dashboard` }).catch(() => undefined);
   navigate('/onboarding');
  } catch (err: any) {
   setError(friendlyError(err.code));
  } finally {
   setLoading(false);
  }
 };

 const handleGoogleSignUp = async () => {
  setLoading(true);
  setError('');
  try {
   const provider = new GoogleAuthProvider();
   provider.addScope('profile');
   provider.addScope('email');
   toggleDemoMode(false);
   const result = await signInWithPopup(auth, provider);
   await bootstrapAccount(result.user, result.user.displayName || fullName);
   navigate('/onboarding');
  } catch (err: any) {
   console.error('Google Auth Error:', err);
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
     {t('Create your account', 'Δημιούργησε τον λογαριασμό σου')}
    </h2>
    <p className="mt-2 text-center text-sm text-stone-500">
     {t('Already have an account?', 'Έχεις ήδη λογαριασμό;')}{' '}
     <NavLink to="/login" className="font-semibold text-stone-900 hover:text-stone-700 underline underline-offset-4">
      {t('Sign in', 'Είσοδος')}
     </NavLink>
    </p>
   </div>

   <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    <div className="bg-white py-8 px-3 shadow-xl shadow-stone-200/50 sm:rounded-2xl sm:px-10 border border-stone-100">
     <form className="space-y-6" onSubmit={handleEmailSignUp}>
      <div>
       <label htmlFor="fullName" className="block text-sm font-medium text-stone-700">
        {t('Full name', 'Ονοματεπώνυμο')}
       </label>
       <div className="mt-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
         <User className="h-5 w-5 text-stone-400" />
        </div>
        <input
         id="fullName"
         name="fullName"
         type="text"
         required
         value={fullName}
         onChange={(e) => setFullName(e.target.value)}
         className="appearance-none block w-full min-h-11 pl-10 px-3 py-3 border border-stone-200 rounded-xl shadow-sm placeholder-stone-400 focus:outline-none focus:ring-stone-900 focus:border-stone-900 text-base sm:text-sm transition-all"
         placeholder={t('John Doe', 'Όνομα Επίθετο')}
        />
       </div>
      </div>

      <div>
       <label htmlFor="email" className="block text-sm font-medium text-stone-700">
        {t('Email address', 'Διεύθυνση email')}
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
        {t('Password', 'Κωδικός')}
       </label>
       <div className="mt-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
         <Lock className="h-5 w-5 text-stone-400" />
        </div>
        <input
         id="password"
         name="password"
         type="password"
         autoComplete="new-password"
         required
         value={password}
         onChange={(e) => setPassword(e.target.value)}
         className="appearance-none block w-full min-h-11 pl-10 px-3 py-3 border border-stone-200 rounded-xl shadow-sm placeholder-stone-400 focus:outline-none focus:ring-stone-900 focus:border-stone-900 text-base sm:text-sm transition-all"
         placeholder="••••••••"
        />
       </div>
       <p className="mt-2 text-xs text-stone-400">
        {t('Must be at least 8 characters long.', 'Τουλάχιστον 8 χαρακτήρες.')}
       </p>
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
        {loading ? t('Creating account...', 'Δημιουργία λογαριασμού...') : t('Create account', 'Δημιουργία λογαριασμού')}
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
        <span className="px-2 bg-white text-stone-500">{t('Or sign up with', 'Ή εγγραφή με')}</span>
       </div>
      </div>

      <div className="mt-6">
       <button
        onClick={handleGoogleSignUp}
        disabled={loading}
        className="w-full min-h-11 inline-flex justify-center items-center py-2 px-4 border border-stone-200 rounded-xl bg-white text-sm font-semibold text-stone-500 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
       >
        <Chrome className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-stone-900" />
        Google
       </button>
      </div>
     </div>

     <div className="mt-6 pt-5 border-t border-stone-100">
      <button
       onClick={handleDemoMode}
       className="w-full min-h-11 flex items-center justify-center gap-2 px-4 border border-dashed border-stone-300 rounded-xl text-sm font-medium text-stone-500 hover:bg-stone-50 hover:border-stone-400 transition-all"
      >
       <FlaskConical className="h-4 w-4 text-amber-500" />
       {t('Try Demo Mode — no account needed', 'Δοκιμαστική λειτουργία — χωρίς λογαριασμό')}
      </button>
     </div>
     <div className="mt-4">
      <p className="text-xs text-stone-400 text-center leading-relaxed">
       {t('By creating an account, you agree to our', 'Με τη δημιουργία λογαριασμού αποδέχεσαι τους')}{' '}
       <NavLink to="/legal#terms" className="underline hover:text-stone-600">{t('Terms of Service', 'Όρους χρήσης')}</NavLink> {t('and', 'και την')}{' '}
       <NavLink to="/legal#privacy" className="underline hover:text-stone-600">{t('Privacy Policy', 'Πολιτική απορρήτου')}</NavLink>.
      </p>
     </div>
    </div>
   </div>
  </div>
 );
}
