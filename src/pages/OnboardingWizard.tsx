import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
 User, 
 Briefcase, 
 Target, 
 Sparkles, 
 ArrowRight, 
 ArrowLeft, 
 Check,
 Rocket,
 Code,
 Palette,
 Megaphone,
 LineChart,
 ShieldCheck,
 Globe
} from 'lucide-react';
import { doc, setDoc, serverTimestamp, getDocFromServer, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../App';
import { cn } from '../lib/utils';
import { UserRole, FounderStage, CommitmentLevel, ProfileStatus, VerificationStatus, AccountStatus } from '../types';

enum OperationType {
 CREATE = 'create',
 UPDATE = 'update',
 DELETE = 'delete',
 LIST = 'list',
 GET = 'get',
 WRITE = 'write',
}

interface FirestoreErrorInfo {
 error: string;
 operationType: OperationType;
 path: string | null;
 authInfo: {
  userId: string | undefined;
  email: string | null | undefined;
  emailVerified: boolean | undefined;
  isAnonymous: boolean | undefined;
  tenantId: string | null | undefined;
  providerInfo: {
   providerId: string;
   displayName: string | null;
   email: string | null;
   photoUrl: string | null;
  }[];
 }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
 const errInfo: FirestoreErrorInfo = {
  error: error instanceof Error ? error.message : String(error),
  authInfo: {
   userId: auth.currentUser?.uid,
   email: auth.currentUser?.email,
   emailVerified: auth.currentUser?.emailVerified,
   isAnonymous: auth.currentUser?.isAnonymous,
   tenantId: auth.currentUser?.tenantId,
   providerInfo: auth.currentUser?.providerData.map(provider => ({
    providerId: provider.providerId,
    displayName: provider.displayName,
    email: provider.email,
    photoUrl: provider.photoURL
   })) || []
  },
  operationType,
  path
 }
 console.error('Firestore Error: ', JSON.stringify(errInfo));
 throw new Error(JSON.stringify(errInfo));
}

const STEPS = [
 { id: 'role', title: 'Your Role', icon: User },
 { id: 'expertise', title: 'Expertise', icon: Briefcase },
 { id: 'goals', title: 'Goals', icon: Target },
 { id: 'final', title: 'Complete', icon: Sparkles },
];

export default function OnboardingWizard() {
 const { user, profile, isDemoMode } = useAuth();
 const [currentStep, setCurrentStep] = useState(0);
 const [loading, setLoading] = useState(false);
 const [errors, setErrors] = useState<Record<string, string>>({});
 const navigate = useNavigate();

 useEffect(() => {
  if (profile?.onboardingCompleted && !isDemoMode) {
   navigate('/dashboard', { replace: true });
  }
 }, [profile, isDemoMode, navigate]);

 const [formData, setFormData] = useState({
  role: UserRole.FOUNDER,
  headline: '',
  bio: '',
  stage: FounderStage.IDEA,
  commitment: CommitmentLevel.PART_TIME,
  skillsRaw: '',
  experience: '',
  skills: [] as string[],
  interests: [] as string[],
  location: '',
  linkedinUrl: '',
 });

 const updateFormData = (data: Partial<typeof formData>) => {
  setFormData(prev => ({ ...prev, ...data }));
 };

 const validateStep = () => {
  const newErrors: Record<string, string> = {};

  if (isDemoMode) return true; // Skip validation in demo mode

  if (currentStep === 0) {
   if (!formData.role) newErrors.role = 'Please select a role';
  } else if (currentStep === 1) {
   if (!formData.headline.trim()) newErrors.headline = 'Headline is required';
   if (!formData.bio.trim()) newErrors.bio = 'Bio is required';
   if (!formData.location.trim()) newErrors.location = 'Location is required';
  } else if (currentStep === 2) {
   if (!formData.stage) newErrors.stage = 'Please select a stage';
   if (!formData.commitment) newErrors.commitment = 'Please select a commitment level';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
 };

 // Load existing progress if it exists
 useEffect(() => {
  const loadProgress = async () => {
   if (!user) return;

   try {
    const onboardingRef = doc(db, 'onboarding', user.uid);
    const onboardingDoc = await getDocFromServer(onboardingRef);

    if (onboardingDoc.exists()) {
     const progress = onboardingDoc.data();
     if (progress.data) {
      setFormData(prev => ({ ...prev, ...progress.data }));
     }
     if (progress.step !== undefined) {
      setCurrentStep(progress.step);
     }
    }
   } catch (error) {
    // Silently fail progress loading, it's not critical
    console.warn('Failed to load onboarding progress:', error);
   }
  };

  loadProgress();
 }, [user]);

 const saveProgress = async (step: number, data: any) => {
  if (!user) return;

  try {
   const onboardingRef = doc(db, 'onboarding', user.uid);
   await setDoc(onboardingRef, {
    userId: user.uid,
    step,
    data,
    updatedAt: serverTimestamp(),
   }, { merge: true });
  } catch (error) {
   console.error('Failed to save onboarding progress:', error);
   // We don't block the user if progress saving fails, but we log it
  }
 };

 const handleNext = async () => {
  if (!validateStep()) return;

  const nextStep = currentStep + 1;
  if (currentStep < STEPS.length - 1) {
   setCurrentStep(nextStep);
   await saveProgress(nextStep, formData);
  } else {
   handleSubmit();
  }
 };

 const handleBack = () => {
  if (currentStep > 0) {
   const prevStep = currentStep - 1;
   setCurrentStep(prevStep);
   saveProgress(prevStep, formData);
  }
 };

 const handleSubmit = async () => {
  if (!user) return;
  setLoading(true);
  try {
   const userRef = doc(db, 'users', user.uid);
   const profileRef = doc(db, 'profiles', user.uid);

   // Check if user already exists to avoid overwriting createdAt
   const userSnap = await getDocFromServer(userRef);
   const exists = userSnap.exists();

   const userUpdateData: any = {
    id: user.uid,
    email: user.email,
    fullName: user.displayName || (user.email?.split('@')[0]) || 'User',
    roles: [formData.role],
    profileStatus: ProfileStatus.PUBLISHED,
    verificationStatus: VerificationStatus.UNVERIFIED,
    profileCompletionScore: 20,
    accountStatus: AccountStatus.ACTIVE,
    onboardingCompleted: true,
    updatedAt: serverTimestamp(),
   };

   if (!exists) {
    userUpdateData.createdAt = serverTimestamp();
   }

   // Perform User Write
   try {
    await setDoc(userRef, userUpdateData, { merge: true });
   } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'users');
    return;
   }

   const profileUpdateData: any = {
    userId: user.uid,
    stage: formData.stage,
    commitment: formData.commitment,
    profileCompletionScore: 80,
    visibility: 'Public',
    updatedAt: serverTimestamp(),
   };

   if (!exists) {
    profileUpdateData.createdAt = serverTimestamp();
   }

   if (formData.headline.trim()) profileUpdateData.headline = formData.headline.trim();
   if (formData.bio.trim()) profileUpdateData.bio = formData.bio.trim();
   if (formData.location.trim()) profileUpdateData.location = formData.location.trim();
   if (formData.experience.trim()) profileUpdateData.experience = formData.experience.trim();
   if (formData.skillsRaw.trim()) {
    profileUpdateData.skillsRaw = formData.skillsRaw.trim();
    profileUpdateData.skills = formData.skillsRaw.split(',').map(s => s.trim()).filter(Boolean);
   }

   // Handle LinkedIn URL - ensure it has a protocol
   if (formData.linkedinUrl.trim()) {
    let url = formData.linkedinUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
     url = `https://${url}`;
    }
    profileUpdateData.linkedinUrl = url;
   }

   // Perform Profile Write
   try {
    await setDoc(profileRef, profileUpdateData, { merge: true });
   } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'profiles');
    return;
   }

   // Clean up onboarding progress
   try {
    const onboardingRef = doc(db, 'onboarding', user.uid);
    await deleteDoc(onboardingRef);
   } catch (error) {
    console.warn('Failed to delete onboarding progress:', error);
   }

   navigate('/dashboard');
  } catch (error) {
   console.error('Submission error:', error);
  } finally {
   setLoading(false);
  }
 };

 const renderStep = () => {
  switch (STEPS[currentStep]?.id) {
   case 'role':
    return (
     <div className="space-y-6">
      <div className="text-center space-y-2">
       <h2 className="text-lg font-medium text-stone-900">What brings you to CoFounderBay?</h2>
       <p className="text-stone-500">Select the role that best describes your current focus.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
       {[
        { id: UserRole.FOUNDER, label: 'Founder', desc: 'Building or looking to build a startup', icon: Rocket },
        { id: UserRole.MENTOR, label: 'Mentor', desc: 'Sharing expertise and guiding others', icon: ShieldCheck },
        { id: UserRole.INVESTOR, label: 'Investor', desc: 'Looking for promising opportunities', icon: LineChart },
        { id: UserRole.CO_FOUNDER_CANDIDATE, label: 'Collaborator', desc: 'Looking to join a founding team', icon: Code },
       ].map((role) => (
        <button
         key={role.id}
         onClick={() => updateFormData({ role: role.id })}
         className={cn(
          "p-6 text-left rounded-2xl border-2 transition-all group",
          formData.role === role.id 
           ? "border-stone-900 bg-stone-900 text-white shadow-lg" 
           : "border-stone-100 bg-white hover:border-stone-200 hover:shadow-md"
         )}
        >
         <role.icon className={cn(
          "w-8 h-8 mb-4",
          formData.role === role.id ? "text-white" : "text-stone-400 group-hover:text-stone-900"
         )} />
         <h3 className="font-medium text-lg">{role.label}</h3>
         <p className={cn(
          "text-sm mt-1",
          formData.role === role.id ? "text-stone-300" : "text-stone-500"
         )}>{role.desc}</p>
        </button>
       ))}
      </div>
     </div>
    );

   case 'expertise':
    return (
     <div className="space-y-6">
      <div className="text-center space-y-2">
       <h2 className="text-lg font-medium text-stone-900">Tell us about your expertise</h2>
       <p className="text-stone-500">This helps us match you with the right opportunities.</p>
      </div>
      <div className="space-y-4">
       <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Professional Headline</label>
        <input
         type="text"
         value={formData.headline}
         onChange={(e) => updateFormData({ headline: e.target.value })}
         placeholder="e.g. Full-stack Engineer | 5 years in Fintech"
         className={cn(
          "w-full px-4 py-3 rounded-xl border outline-none transition-all",
          errors.headline ? "border-red-500 focus:ring-red-500" : "border-stone-200 focus:ring-stone-900 focus:border-stone-900"
         )}
        />
        {errors.headline && <p className="text-xs text-red-500 mt-1">{errors.headline}</p>}
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
         <label className="block text-sm font-medium text-stone-700 mb-1">Skills</label>
         <textarea
          rows={2}
          value={formData.skillsRaw}
          onChange={(e) => updateFormData({ skillsRaw: e.target.value })}
          placeholder="e.g. React, Node.js, Product Management"
          className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none transition-all resize-none focus:ring-stone-900 focus:border-stone-900"
         />
        </div>
        <div>
         <label className="block text-sm font-medium text-stone-700 mb-1">Experience</label>
         <textarea
          rows={2}
          value={formData.experience}
          onChange={(e) => updateFormData({ experience: e.target.value })}
          placeholder="Briefly describe your relevant past experience..."
          className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none transition-all resize-none focus:ring-stone-900 focus:border-stone-900"
         />
        </div>
       </div>

       <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">About Me (Bio)</label>
        <textarea
         rows={4}
         value={formData.bio}
         onChange={(e) => updateFormData({ bio: e.target.value })}
         placeholder="Share a bit about your background, your long-term vision, and exactly what you are looking for in a co-founder..."
         className={cn(
          "w-full px-4 py-3 rounded-xl border outline-none transition-all resize-none",
          errors.bio ? "border-red-500 focus:ring-red-500" : "border-stone-200 focus:ring-stone-900 focus:border-stone-900"
         )}
        />
        <p className="text-xs text-stone-500 mt-1">Tip: Include your vision and what you're looking for to enhance profile completeness.</p>
        {errors.bio && <p className="text-xs text-red-500 mt-1">{errors.bio}</p>}
       </div>
       <div className="grid grid-cols-2 gap-4">
        <div>
         <label className="block text-sm font-medium text-stone-700 mb-1">Location</label>
         <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
           type="text"
           value={formData.location}
           onChange={(e) => updateFormData({ location: e.target.value })}
           placeholder="City, Country"
           className={cn(
            "w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all",
            errors.location ? "border-red-500 focus:ring-red-500" : "border-stone-200 focus:ring-stone-900 focus:border-stone-900"
           )}
          />
         </div>
         {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
        </div>
        <div>
         <label className="block text-sm font-medium text-stone-700 mb-1">LinkedIn URL</label>
         <input
          type="url"
          value={formData.linkedinUrl}
          onChange={(e) => updateFormData({ linkedinUrl: e.target.value })}
          placeholder="https://linkedin.com/in/..."
          className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 focus:border-stone-900 outline-none transition-all"
         />
        </div>
       </div>
      </div>
     </div>
    );

   case 'goals':
    return (
     <div className="space-y-6">
      <div className="text-center space-y-2">
       <h2 className="text-lg font-medium text-stone-900">What are your startup goals?</h2>
       <p className="text-stone-500">Define your current stage and commitment level.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
       <div className="space-y-4">
        <label className="block text-sm font-medium text-stone-900 tracking-wider">Current Stage</label>
        <div className="space-y-2">
         {[
          { id: FounderStage.IDEA, label: 'Idea Stage', desc: 'Just a concept' },
          { id: FounderStage.MVP, label: 'MVP Stage', desc: 'Building or built a prototype' },
          { id: FounderStage.SCALING, label: 'Scaling', desc: 'Have users and growing' },
         ].map((stage) => (
          <button
           key={stage.id}
           onClick={() => updateFormData({ stage: stage.id })}
           className={cn(
            "w-full p-4 text-left rounded-xl border transition-all",
            formData.stage === stage.id 
             ? "border-stone-900 bg-stone-50 ring-1 ring-stone-900" 
             : "border-stone-100 hover:border-stone-200"
           )}
          >
           <div className="font-medium text-stone-900">{stage.label}</div>
           <div className="text-xs text-stone-500">{stage.desc}</div>
          </button>
         ))}
        </div>
       </div>
       <div className="space-y-4">
        <label className="block text-sm font-medium text-stone-900 tracking-wider">Commitment</label>
        <div className="space-y-2">
         {[
          { id: CommitmentLevel.FULL_TIME, label: 'Full-time', desc: '100% dedicated' },
          { id: CommitmentLevel.PART_TIME, label: 'Part-time', desc: 'Working alongside other things' },
          { id: CommitmentLevel.EXPLORING, label: 'Exploring', desc: 'Casual exploration' },
         ].map((lvl) => (
          <button
           key={lvl.id}
           onClick={() => updateFormData({ commitment: lvl.id })}
           className={cn(
            "w-full p-4 text-left rounded-xl border transition-all",
            formData.commitment === lvl.id 
             ? "border-stone-900 bg-stone-50 ring-1 ring-stone-900" 
             : "border-stone-100 hover:border-stone-200"
           )}
          >
           <div className="font-medium text-stone-900">{lvl.label}</div>
           <div className="text-xs text-stone-500">{lvl.desc}</div>
          </button>
         ))}
        </div>
       </div>
      </div>
     </div>
    );

   case 'final':
    return (
     <div className="text-center space-y-8 py-8">
      <div className="w-12 h-12 bg-stone-100 text-stone-700 rounded-xl flex items-center justify-center mx-auto">
       <Check className="w-5 h-5" />
      </div>
      <div className="space-y-2">
       <h2 className="text-lg font-medium text-stone-900">You're all set!</h2>
       <p className="text-stone-500 max-w-sm mx-auto">
        Your profile is ready. We'll now show you compatible co-founders and mentors based on your preferences.
       </p>
      </div>
      <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 text-left max-w-md mx-auto">
       <h4 className="font-medium text-stone-900 mb-4">Profile Summary</h4>
       <div className="space-y-3 text-sm">
        <div className="flex justify-between">
         <span className="text-stone-500">Role:</span>
         <span className="font-medium text-stone-900 capitalize">{formData.role}</span>
        </div>
        <div className="flex justify-between">
         <span className="text-stone-500">Stage:</span>
         <span className="font-medium text-stone-900 capitalize">{formData.stage}</span>
        </div>
        <div className="flex justify-between">
         <span className="text-stone-500">Commitment:</span>
         <span className="font-medium text-stone-900 capitalize">{formData.commitment}</span>
        </div>
        <div className="flex justify-between">
         <span className="text-stone-500">Location:</span>
         <span className="font-medium text-stone-900">{formData.location || 'Not specified'}</span>
        </div>
       </div>

       <div className="mt-6 p-4 bg-amber-50 text-amber-900 rounded-xl border border-amber-100 flex items-start gap-3">
        <Sparkles className="w-5 h-5 mt-0.5 shrink-0" />
        <div className="text-sm">
         <p className="font-medium">Boost your profile score!</p>
         <p className="mt-1 opacity-90">After finishing, visit your profile to add your social links (LinkedIn, GitHub). Verified identities get 3x more matches.</p>
        </div>
       </div>
      </div>
     </div>
    );

   default:
    return null;
  }
 };

 return (
  <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-2 sm:p-6 lg:p-8">
   <div className="w-full max-w-3xl">
    {/* Progress Bar */}
    <div className="mb-12">
     <div className="flex justify-between mb-4">
      {STEPS.map((step, idx) => (
       <div key={step.id} className="flex flex-col items-center gap-2">
        <div className={cn(
         "w-10 h-10 rounded-full flex items-center justify-center transition-all border-2",
         idx <= currentStep 
          ? "bg-stone-900 border-stone-900 text-white" 
          : "bg-white border-stone-200 text-stone-400"
        )}>
         {idx < currentStep ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
        </div>
        <span className={cn(
         "text-xs font-medium tracking-wider",
         idx <= currentStep ? "text-stone-900" : "text-stone-400"
        )}>
         {step.title}
        </span>
       </div>
      ))}
     </div>
     <div className="h-1 bg-stone-200 rounded-full overflow-hidden">
      <motion.div 
       className="h-full bg-stone-900"
       initial={{ width: 0 }}
       animate={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
       transition={{ duration: 0.5 }}
      />
     </div>
    </div>

    {/* Content */}
    <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/50 border border-stone-100 p-8 sm:p-12 min-h-[500px] flex flex-col relative">
     {isDemoMode && (
      <button 
       onClick={() => navigate('/dashboard')}
       className="absolute top-6 right-8 text-sm font-medium text-stone-400 hover:text-stone-900 transition-colors"
      >
       Skip Onboarding (Demo)
      </button>
     )}
     <AnimatePresence mode="wait">
      <motion.div
       key={currentStep}
       initial={{ opacity: 0, x: 20 }}
       animate={{ opacity: 1, x: 0 }}
       exit={{ opacity: 0, x: -20 }}
       transition={{ duration: 0.3 }}
       className="flex-1"
      >
       {renderStep()}
      </motion.div>
     </AnimatePresence>

     {/* Navigation */}
     <div className="mt-12 flex items-center justify-between pt-8 border-t border-stone-100">
      <button
       onClick={handleBack}
       disabled={currentStep === 0 || loading}
       className={cn(
        "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
        currentStep === 0 ? "opacity-0 pointer-events-none" : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
       )}
      >
       <ArrowLeft className="w-5 h-5" />
       Back
      </button>
      <button
       onClick={handleNext}
       disabled={loading || (currentStep === 0 && !formData.role)}
       className="flex items-center gap-2 px-8 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all shadow-sm disabled:opacity-50 group"
      >
       {loading ? 'Saving...' : currentStep === STEPS.length - 1 ? 'Get Started' : 'Continue'}
       <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>
     </div>
    </div>
   </div>
  </div>
 );
}
