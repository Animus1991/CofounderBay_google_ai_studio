import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Zap, Mail, Lock, ArrowRight, Github, Chrome, User, FlaskConical } from 'lucide-react';
import { auth } from '../firebase';
import { useAuth } from '../App';
import { cn } from '../lib/utils';
import { bothText } from '../lib/labels';
import { LanguageToggle } from '../lib/language';

export default function SignUpPage() {
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
   'auth/operation-not-allowed': 'Email/password sign-up is not enabled yet. Please use Demo Mode or try Google sign-in.',
   'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
   'auth/weak-password': 'Password must be at least 6 characters.',
   'auth/invalid-email': 'Please enter a valid email address.',
   'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
   'auth/cancelled-popup-request': 'Only one sign-in popup can be open at a time.',
   'auth/network-request-failed': 'Network error. Please check your connection and try again.',
   'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  };
  return map[code] || 'Something went wrong. Please try again.';
 };

 const handleEmailSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  try {
   await createUserWithEmailAndPassword(auth, email, password);
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
   await signInWithPopup(auth, provider);
   navigate('/onboarding');
  } catch (err: any) {
   console.error('Google Auth Error:', err);
   if (err.code === 'auth/unauthorized-domain' || err.code === 'auth/operation-not-allowed') {
    setError(bothText('Google sign-in is not available here.', 'Η σύνδεση με Google δεν είναι διαθέσιμη εδώ.'));
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
    <h2 className="text-center text-lg font-medium tracking-tight text-stone-900">
     Create your account
    </h2>
    <p className="mt-2 text-center text-sm text-stone-500">
     Already have an account?{' '}
     <NavLink to="/login" className="font-semibold text-stone-900 hover:text-stone-700 underline underline-offset-4">
      Sign in
     </NavLink>
    </p>
   </div>

   <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    <div className="bg-white py-8 px-4 shadow-xl shadow-stone-200/50 sm:rounded-2xl sm:px-10 border border-stone-100">
     <form className="space-y-6" onSubmit={handleEmailSignUp}>
      <div>
       <label htmlFor="fullName" className="block text-sm font-medium text-stone-700">
        Full name
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
         placeholder="John Doe"
        />
       </div>
      </div>

      <div>
       <label htmlFor="email" className="block text-sm font-medium text-stone-700">
        Email address
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
        Password
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
        Must be at least 8 characters long.
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
        {loading ? 'Creating account...' : 'Create account'}
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
        <span className="px-2 bg-white text-stone-500">Or sign up with</span>
       </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
       <button
        onClick={handleGoogleSignUp}
        className="w-full min-h-11 inline-flex justify-center items-center py-2 px-4 border border-stone-200 rounded-xl bg-white text-sm font-semibold text-stone-500 hover:bg-stone-50 transition-all"
       >
        <Chrome className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-stone-900" />
        Google
       </button>
       <button
        className="w-full min-h-11 inline-flex justify-center items-center py-2 px-4 border border-stone-200 rounded-xl bg-white text-sm font-semibold text-stone-500 hover:bg-stone-50 transition-all"
       >
        <Github className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-stone-900" />
        GitHub
       </button>
      </div>
     </div>

     <div className="mt-6 pt-5 border-t border-stone-100">
      <button
       onClick={handleDemoMode}
       className="w-full min-h-11 flex items-center justify-center gap-2 px-4 border border-dashed border-stone-300 rounded-xl text-sm font-medium text-stone-500 hover:bg-stone-50 hover:border-stone-400 transition-all"
      >
       <FlaskConical className="h-4 w-4 text-amber-500" />
       Try Demo Mode — no account needed
      </button>
     </div>
     <div className="mt-4">
      <p className="text-xs text-stone-400 text-center leading-relaxed">
       By creating an account, you agree to our{' '}
       <a href="#" className="underline hover:text-stone-600">Terms of Service</a> and{' '}
       <a href="#" className="underline hover:text-stone-600">Privacy Policy</a>.
      </p>
     </div>
    </div>
   </div>
  </div>
 );
}
