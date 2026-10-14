import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Zap, Mail, Lock, ArrowRight, Github, Chrome } from 'lucide-react';
import { auth } from '../firebase';
import { cn } from '../lib/utils';
import { Both } from '../lib/both';

export default function LoginPage() {
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);
 const navigate = useNavigate();
 const location = useLocation();

 const from = location.state?.from?.pathname || '/dashboard';

 const friendlyError = (code: string): string => {
  const map: Record<string, string> = {
   'auth/operation-not-allowed': 'Email/password sign-in is not enabled. Please use Demo Mode or Google sign-in.',
   'auth/user-not-found': 'No account found with this email. Did you mean to sign up?',
   'auth/wrong-password': 'Incorrect password. Please try again.',
   'auth/invalid-credential': 'Invalid email or password.',
   'auth/invalid-email': 'Please enter a valid email address.',
   'auth/user-disabled': 'This account has been disabled. Contact support.',
   'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
   'auth/network-request-failed': 'Network error. Please check your connection.',
   'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  };
  return map[code] || 'Something went wrong. Please try again.';
 };

 const handleEmailLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  try {
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
   await signInWithPopup(auth, provider);
   navigate(from, { replace: true });
  } catch (err: any) {
   console.error('Google Auth Error:', err);
   // Better error handling for Google Auth issues
   if (err.code === 'auth/unauthorized-domain' || err.code === 'auth/operation-not-allowed') {
    setError('Google sign-in is not available here. Η σύνδεση με Google δεν είναι διαθέσιμη εδώ.');
   } else if (err.code === 'auth/popup-closed-by-user') {
    setError('Sign-in popup was closed. Please try again.');
   } else if (err.code === 'auth/popup-blocked') {
    setError('Popup was blocked. Please allow popups for this site.');
   } else {
    setError(friendlyError(err.code));
   }
  } finally {
   setLoading(false);
  }
 };

 return (
  <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
   <div className="sm:mx-auto sm:w-full sm:max-w-md">
    <NavLink to="/" className="flex justify-center items-center gap-2 mb-6 group">
     <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center transition-transform">
      <Zap className="w-6 h-6 text-white" />
     </div>
     <span className="text-lg font-medium text-stone-900 tracking-tight">CoFounderBay</span>
    </NavLink>
    <h2 className="text-center text-lg font-medium tracking-tight text-stone-900">
     <Both en="Welcome back" el="Καλώς ήρθατε ξανά" />
    </h2>
    <p className="mt-2 text-center text-sm text-stone-500">
     <Both en="Don't have an account?" el="Δεν έχετε λογαριασμό;" />{' '}
     <NavLink to="/signup" className="font-semibold text-stone-900 hover:text-stone-700 underline underline-offset-4">
      <Both en="Sign up for free" el="Εγγραφή δωρεάν" />
     </NavLink>
    </p>
   </div>

   <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    <div className="bg-white py-8 px-4 shadow-xl shadow-stone-200/50 sm:rounded-2xl sm:px-10 border border-stone-100">
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
         className="appearance-none block w-full pl-10 px-3 py-3 border border-stone-200 rounded-xl shadow-sm placeholder-stone-400 focus:outline-none focus:ring-stone-900 focus:border-stone-900 sm:text-sm transition-all"
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
         className="appearance-none block w-full pl-10 px-3 py-3 border border-stone-200 rounded-xl shadow-sm placeholder-stone-400 focus:outline-none focus:ring-stone-900 focus:border-stone-900 sm:text-sm transition-all"
         placeholder="••••••••"
        />
       </div>
      </div>

      <div className="flex items-center justify-between">
       <div className="flex items-center">
        <input
         id="remember-me"
         name="remember-me"
         type="checkbox"
         className="h-4 w-4 text-stone-900 focus:ring-stone-900 border-stone-300 rounded"
        />
        <label htmlFor="remember-me" className="ml-2 block text-sm text-stone-600">
         <Both en="Remember me" el="Να με θυμάται" />
        </label>
       </div>

       <div className="text-sm">
        <a href="#" className="font-medium text-stone-600 hover:text-stone-900 transition-colors">
         <Both en="Forgot your password?" el="Ξεχάσατε τον κωδικό;" />
        </a>
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
        className="w-full flex justify-center py-2 sm:py-2.5 px-4 sm:px-6 rounded-xl shadow-sm text-xs sm:text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-50 transition-all group"
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
        <span className="px-2 bg-white text-stone-500"><Both en="Or continue with" el="Ή συνεχίστε με" /></span>
       </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
       <button
        onClick={handleGoogleLogin}
        className="w-full inline-flex justify-center py-2 sm:py-2.5 px-4 sm:px-6 border border-stone-200 rounded-xl bg-white text-xs sm:text-sm font-semibold text-stone-500 hover:bg-stone-50 transition-all"
       >
        <Chrome className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-stone-900" />
        Google
       </button>
       <button
        className="w-full inline-flex justify-center py-2 sm:py-2.5 px-4 sm:px-6 border border-stone-200 rounded-xl bg-white text-xs sm:text-sm font-semibold text-stone-500 hover:bg-stone-50 transition-all"
       >
        <Github className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-stone-900" />
        GitHub
       </button>
      </div>

      {/* Demo Mode */}
      <div className="mt-6 pt-6 border-t border-stone-200">
       <button
        onClick={() => {
         // Set demo mode flag
         localStorage.setItem('demo_mode', 'true');
         navigate('/dashboard', { replace: true });
         window.location.reload();
        }}
        className="w-full inline-flex justify-center py-2 sm:py-2.5 px-4 sm:px-6 border border-stone-200 rounded-xl bg-white text-xs sm:text-sm font-semibold text-stone-900 hover:border-stone-900 transition-all"
       >
        <Zap className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-stone-900" />
        <Both en="Try Demo Mode" el="Δοκιμή δείγματος" />
       </button>
       <p className="mt-2 text-center text-xs text-stone-400">
        <Both en="Skip login and explore with sample data" el="Χωρίς είσοδο, με δεδομένα δείγματος" />
       </p>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
