import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldCheck, Mail, ArrowRight, Globe, Lock, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { authService } from "../services/authService";
import { TenantSSOConfig } from "../types";

export default function Login() {
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [step, setStep] = useState<'email' | 'password' | 'sso'>('email');
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [ssoConfig, setSsoConfig] = useState<TenantSSOConfig | null>(null);
 const [tenantId, setTenantId] = useState<string | null>(null);
 
 const navigate = useNavigate();
 const location = useLocation();
 const from = (location.state as any)?.from?.pathname || "/dashboard";

 const handleEmailSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!email) return;
  
  setLoading(true);
  setError(null);
  
  try {
   const { tenantId: discoveredTenantId, config } = await authService.discoverSSO(email);
   
   if (discoveredTenantId && config?.isEnabled) {
    setTenantId(discoveredTenantId);
    setSsoConfig(config);
    if (config.ssoMandatory) {
     setStep('sso');
    } else {
     setStep('password'); // Optional SSO
    }
   } else {
    setStep('password'); // Standard login
   }
  } catch (err) {
   setError("Failed to verify email. Please try again.");
  } finally {
   setLoading(false);
  }
 };

 const handlePasswordSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  // Mock login
  setTimeout(() => {
   setLoading(false);
   navigate(from, { replace: true });
  }, 1000);
 };

 const handleSSOLogin = async () => {
  if (!tenantId) return;
  setLoading(true);
  try {
   const authUrl = await authService.initiateSSO(tenantId);
   // In a real app: window.location.href = authUrl;
   // For MVP: mock success
   setTimeout(() => {
    setLoading(false);
    navigate(from, { replace: true });
   }, 1500);
  } catch (err) {
   setError("SSO login failed. Please contact your administrator.");
   setLoading(false);
  }
 };

 return (
  <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
   <div className="w-full max-w-md space-y-8">
    <div className="text-center space-y-2">
     <div className="inline-flex items-center justify-center w-16 h-16 bg-stone-900 text-white rounded-2xl shadow-xl mb-4">
      <ShieldCheck className="w-8 h-8" />
     </div>
     <h1 className="text-xl font-medium tracking-tight">Welcome to CoFounderBay</h1>
     <p className="text-stone-500">The modern startup ecosystem platform</p>
    </div>

    <Card className="p-8 shadow-2xl border-stone-200">
     <AnimatePresence mode="wait">
      {step === 'email' && (
       <motion.form 
        key="email-step"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        onSubmit={handleEmailSubmit} 
        className="space-y-6"
       >
        <div className="space-y-2">
         <label className="text-xs font-medium text-stone-400 uppercase tracking-widest">Email Address</label>
         <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300" />
          <input 
           type="email" 
           required
           value={email}
           onChange={(e) => setEmail(e.target.value)}
           placeholder="name@organization.com"
           className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all outline-none"
          />
         </div>
        </div>
        <Button type="submit" className="w-full h-10" loading={loading}>
         Continue <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
       </motion.form>
      )}

      {step === 'password' && (
       <motion.form 
        key="password-step"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        onSubmit={handlePasswordSubmit} 
        className="space-y-6"
       >
        <div className="flex items-center justify-between">
         <button 
          type="button"
          onClick={() => setStep('email')}
          className="text-xs font-medium text-stone-400 hover:text-stone-900 transition-colors"
         >
          ← {email}
         </button>
        </div>
        
        <div className="space-y-2">
         <label className="text-xs font-medium text-stone-400 uppercase tracking-widest">Password</label>
         <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300" />
          <input 
           type="password" 
           required
           value={password}
           onChange={(e) => setPassword(e.target.value)}
           placeholder="••••••••"
           className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all outline-none"
          />
         </div>
        </div>

        <Button type="submit" className="w-full h-10" loading={loading}>
         Sign In
        </Button>

        {ssoConfig && (
         <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
           <div className="w-full border-t border-stone-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
           <span className="bg-white px-2 text-stone-400 font-medium">Or</span>
          </div>
         </div>
        )}

        {ssoConfig && (
         <Button 
          type="button" 
          variant="outline" 
          className="w-full h-10 gap-3"
          onClick={handleSSOLogin}
         >
          <Globe className="w-5 h-5" />
          {ssoConfig.loginButtonLabel}
         </Button>
        )}
       </motion.form>
      )}

      {step === 'sso' && (
       <motion.div 
        key="sso-step"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6 text-center"
       >
        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 mb-6">
         <p className="text-sm text-stone-600">
          Your organization requires Single Sign-On for access to CoFounderBay.
         </p>
        </div>

        <Button 
         type="button" 
         className="w-full h-11 gap-3 text-lg"
         onClick={handleSSOLogin}
         loading={loading}
        >
         <Globe className="w-6 h-6" />
         {ssoConfig?.loginButtonLabel || 'Continue with SSO'}
        </Button>

        <button 
         type="button"
         onClick={() => setStep('email')}
         className="text-xs font-medium text-stone-400 hover:text-stone-900 transition-colors"
        >
         Use a different email address
        </button>
       </motion.div>
      )}
     </AnimatePresence>

     {error && (
      <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600">
       <AlertCircle className="w-5 h-5 shrink-0" />
       <p className="text-xs font-medium">{error}</p>
      </div>
     )}
    </Card>

    <p className="text-center text-xs text-stone-400">
     By continuing, you agree to CoFounderBay's <br />
     <a href="#" className="underline hover:text-stone-600">Terms of Service</a> and <a href="#" className="underline hover:text-stone-600">Privacy Policy</a>.
    </p>
   </div>
  </div>
 );
}
