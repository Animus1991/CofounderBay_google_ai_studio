import React, { useState, useEffect } from 'react';
import { useProtectedDraft } from '../lib/useProtectedDraft';
import {
 useNavigate } from 'react-router-dom';
import { motion,
 AnimatePresence } from 'motion/react';
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
 LineChart,
 ShieldCheck,
 Globe,
 X
} from "lucide-react";
import { doc, setDoc, serverTimestamp, getDocFromServer, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../App';
import { cn } from '../lib/utils';
import { useT } from '../lib/language';
import { labelOf } from '../lib/labels';
import DescribeYourself from '../components/onboarding/DescribeYourself';
import type { ProfileDraft } from '../lib/profileFromText';
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

const STEP_EL: Record<string, string> = {
 'Your Role': 'Ο ρόλος σου',
 Expertise: 'Εξειδίκευση',
 Goals: 'Στόχοι',
 Complete: 'Ολοκλήρωση',
};

const INDUSTRY_EL: Record<string, string> = {
 Technology: 'Τεχνολογία',
 Finance: 'Οικονομικά',
 Health: 'Υγεία',
 Climate: 'Κλίμα',
 Education: 'Εκπαίδευση',
 Consumer: 'Καταναλωτικά',
};

const LOOKING_EL: Record<string, string> = {
 'Co-founder': 'Συνιδρυτής',
 Investor: 'Επενδυτής',
 Mentor: 'Μέντορας',
 Sales: 'Πωλήσεις',
 Growth: 'Ανάπτυξη',
 'Technical help': 'Τεχνική βοήθεια',
};

export default function OnboardingWizard() {
 const t = useT();
 const { user, profile, isDemoMode } = useAuth();
 const [loading, setLoading] = useState(false);
 const [errors, setErrors] = useState<Record<string, string>>({});
 const navigate = useNavigate();

 useEffect(() => {
  if (profile?.onboardingCompleted && !isDemoMode) {
   navigate('/dashboard', { replace: true });
  }
 }, [profile, isDemoMode, navigate]);

 // What has been typed and the step reached stay on this device until the profile is created,
 // so a reload or a closed tab does not cost the founder their answers (lib/useProtectedDraft).
 const draftOwner = user?.uid ?? 'sample';
 const stepDraft = useProtectedDraft('onboarding-step', draftOwner, 0);
 const currentStep = stepDraft.value;
 const setCurrentStep = stepDraft.setValue;
 const formDraft = useProtectedDraft('onboarding', draftOwner, {
  role: UserRole.FOUNDER,
  fullName: '',
  headline: '',
  bio: '',
  stage: FounderStage.IDEA,
  commitment: CommitmentLevel.PART_TIME,
  skillsRaw: '',
  experience: '',
  skills: [] as string[],
  interests: [] as string[],
  industry: '',
  lookingFor: [] as string[],
  location: '',
  linkedinUrl: '',
 });
 const formData = formDraft.value;
 const setFormData = formDraft.setValue;
 const clearDrafts = () => { formDraft.reset(); stepDraft.reset(0); };

 useEffect(() => {
  if (!user) return;
  const name = user.displayName || user.email?.split('@')[0] || '';
  if (!name) return;
  setFormData((prev) => (prev.fullName ? prev : { ...prev, fullName: name }));
 }, [user, setFormData]);

 const updateFormData = (data: Partial<typeof formData>) => {
  setFormData(prev => ({ ...prev, ...data }));
 };

 // "Describe yourself": fills only empty boxes, keeps a copy for Undo.
 const [beforeFill, setBeforeFill] = useState<typeof formData | null>(null);
 const fillFromDescription = (draft: ProfileDraft): number => {
  const next = { ...formData };
  let count = 0;
  const fill = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K] | undefined) => {
   if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return;
   const current = next[key];
   const empty = typeof current === 'string' ? !current.trim() : Array.isArray(current) ? current.length === 0 : false;
   if (!empty) return;
   next[key] = value;
   count += 1;
  };
  fill('headline', draft.headline);
  fill('skillsRaw', draft.skills.join(', '));
  fill('experience', draft.experience);
  fill('industry', draft.industry);
  fill('location', draft.location);
  fill('bio', draft.bio);
  // Stage and commitment are choices with a default; a stated one replaces the default.
  if (draft.stage) { next.stage = draft.stage === 'Revenue' ? FounderStage.EARLY_TRACTION : draft.stage === 'MVP' ? FounderStage.MVP : FounderStage.IDEA; count += 1; }
  if (draft.commitment) { next.commitment = draft.commitment === 'Full-time' ? CommitmentLevel.FULL_TIME : CommitmentLevel.PART_TIME; count += 1; }
  if (count > 0) {
   setBeforeFill(formData);
   setFormData(next);
  }
  return count;
 };

 const validateStep = () => {
  const newErrors: Record<string, string> = {};

  if (isDemoMode) return true; // Skip validation in demo mode

  if (currentStep === 0) {
   if (!formData.role) newErrors.role = t('Please select a role', 'Διάλεξε έναν ρόλο');
  } else if (currentStep === 1) {
   if (!formData.headline.trim()) newErrors.headline = t('Headline is required', 'Ο τίτλος είναι υποχρεωτικός');
   if (!formData.bio.trim()) newErrors.bio = t('Bio is required', 'Το βιογραφικό είναι υποχρεωτικό');
   if (!formData.location.trim()) newErrors.location = t('Location is required', 'Η τοποθεσία είναι υποχρεωτική');
  } else if (currentStep === 2) {
   if (!formData.stage) newErrors.stage = t('Please select a stage', 'Διάλεξε ένα στάδιο');
   if (!formData.commitment) newErrors.commitment = t('Please select a commitment level', 'Διάλεξε επίπεδο δέσμευσης');
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
 }, [user, setFormData, setCurrentStep]);

 const saveProgress = async (step: number, data: typeof formData) => {
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

 const handleExit = () => {
  const historyIdx = typeof window !== 'undefined' ? (window.history.state as { idx?: number } | null)?.idx : undefined;
  if (typeof historyIdx === 'number' ? historyIdx > 0 : window.history.length > 1) {
   navigate(-1);
  } else {
   navigate(isDemoMode || user ? '/dashboard' : '/');
  }
 };

 const handleBack = () => {
  if (currentStep > 0) {
   const prevStep = currentStep - 1;
   setCurrentStep(prevStep);
   saveProgress(prevStep, formData);
  } else {
   handleExit();
  }
 };

 const handleSubmit = async () => {
  if (isDemoMode || !user) {
    clearDrafts();
    navigate('/dashboard');
    return;
   }
  setLoading(true);
  try {
   const userRef = doc(db, 'users', user.uid);
   const profileRef = doc(db, 'profiles', user.uid);

   // Check if user already exists to avoid overwriting createdAt
   const userSnap = await getDocFromServer(userRef);
   const exists = userSnap.exists();

   const userUpdateData: Record<string, unknown> = {
    id: user.uid,
    email: user.email,
    fullName: formData.fullName.trim() || user.displayName || (user.email?.split('@')[0]) || 'Founder',
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

   const profileUpdateData: Record<string, unknown> = {
    userId: user.uid,
    fullName: formData.fullName.trim() || user.displayName || (user.email?.split('@')[0]) || 'Founder',
    role: formData.role,
    stage: formData.stage,
    commitment: formData.commitment,
    profileCompletionScore: 80,
    visibility: 'Public',
    updatedAt: serverTimestamp(),
   };

   if (!exists) {
    profileUpdateData.createdAt = serverTimestamp();
   }

   if (formData.industry) profileUpdateData.industry = formData.industry;
   if (formData.lookingFor.length) profileUpdateData.lookingFor = formData.lookingFor;
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

   clearDrafts();
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
       <h1 className="text-xl sm:text-2xl font-semibold text-stone-900">{t('What brings you to CoFounderBay?', 'Τι σε φέρνει στο CoFounderBay;')}</h1>
       <p className="text-stone-500">{t('Select the role that best describes your current focus.', 'Διάλεξε τον ρόλο που περιγράφει καλύτερα την τρέχουσα εστίασή σου.')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
       {[
        { id: UserRole.FOUNDER, label: labelOf(UserRole.FOUNDER), desc: t('Building or looking to build a startup', 'Χτίζεις ή θέλεις να χτίσεις μια startup'), icon: Rocket },
        { id: UserRole.MENTOR, label: labelOf(UserRole.MENTOR), desc: t('Sharing expertise and guiding others', 'Μοιράζεσαι εμπειρία και καθοδηγείς άλλους'), icon: ShieldCheck },
        { id: UserRole.INVESTOR, label: labelOf(UserRole.INVESTOR), desc: t('Looking for promising opportunities', 'Ψάχνεις υποσχόμενες ευκαιρίες'), icon: LineChart },
        { id: UserRole.CO_FOUNDER_CANDIDATE, label: t('Collaborator', 'Συνεργάτης'), desc: t('Looking to join a founding team', 'Θέλεις να μπεις σε ιδρυτική ομάδα'), icon: Code },
       ].map((role) => (
        <button
         key={role.id}
         type="button"
         aria-pressed={formData.role === role.id}
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
         <h3 className="font-semibold text-base">{role.label}</h3>
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
       <h1 className="text-xl sm:text-2xl font-semibold text-stone-900">{t('Tell us about your expertise', 'Πες μας για την εξειδίκευσή σου')}</h1>
       <p className="text-stone-500">{t('This helps us match you with the right opportunities.', 'Έτσι σε αντιστοιχίζουμε με τις σωστές ευκαιρίες.')}</p>
      </div>
      <DescribeYourself
       onApply={fillFromDescription}
       onUndo={() => { if (beforeFill) setFormData(beforeFill); setBeforeFill(null); }}
       industryLabel={(industry) => t(industry, INDUSTRY_EL[industry] || industry)}
      />
      <div className="space-y-4">
       <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{t('Full name', 'Ονοματεπώνυμο')}</label>
        <input
         type="text"
         value={formData.fullName}
         onChange={(e) => updateFormData({ fullName: e.target.value })}
         placeholder={t('How your name should appear', 'Πώς θέλεις να φαίνεται το όνομά σου')}
         className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none transition-all focus:ring-stone-900 focus:border-stone-900"
        />
       </div>
       <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{t('Professional Headline', 'Επαγγελματικός τίτλος')}</label>
        <input
         type="text"
         value={formData.headline}
         onChange={(e) => updateFormData({ headline: e.target.value })}
         placeholder={t('e.g. Full-stack Engineer | 5 years in Fintech', 'π.χ. Full-stack μηχανικός | 5 χρόνια σε Fintech')}
         className={cn(
          "w-full px-4 py-3 rounded-xl border outline-none transition-all",
          errors.headline ? "border-red-500 focus:ring-red-500" : "border-stone-200 focus:ring-stone-900 focus:border-stone-900"
         )}
        />
        {errors.headline && <p className="text-xs text-red-500 mt-1">{errors.headline}</p>}
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
         <label className="block text-sm font-medium text-stone-700 mb-1">{t('Skills', 'Δεξιότητες')}</label>
         <textarea
          rows={2}
          value={formData.skillsRaw}
          onChange={(e) => updateFormData({ skillsRaw: e.target.value })}
          placeholder={t('e.g. React, Node.js, Product Management', 'π.χ. React, Node.js, Product Management')}
          className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none transition-all resize-none focus:ring-stone-900 focus:border-stone-900"
         />
        </div>
        <div>
         <label className="block text-sm font-medium text-stone-700 mb-1">{t('Experience', 'Εμπειρία')}</label>
         <textarea
          rows={2}
          value={formData.experience}
          onChange={(e) => updateFormData({ experience: e.target.value })}
          placeholder={t('Briefly describe your relevant past experience...', 'Περιέγραψε σύντομα τη σχετική εμπειρία σου…')}
          className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none transition-all resize-none focus:ring-stone-900 focus:border-stone-900"
         />
        </div>
       </div>

       <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">{t('Industry', 'Κλάδος')}</label>
        <div className="flex flex-wrap gap-2">
         {['Technology', 'Finance', 'Health', 'Climate', 'Education', 'Consumer'].map((item) => (
          <button
           key={item}
           type="button"
           aria-pressed={formData.industry === item}
           onClick={() => updateFormData({ industry: item })}
           className={cn(
            'min-h-11 rounded-full border px-3 text-sm',
            formData.industry === item ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400',
           )}
          >
           {t(item, INDUSTRY_EL[item] || item)}
          </button>
         ))}
        </div>
       </div>
       <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{t('About Me (Bio)', 'Σχετικά με εμένα')}</label>
        <textarea
         rows={4}
         value={formData.bio}
         onChange={(e) => updateFormData({ bio: e.target.value })}
         placeholder={t('Share a bit about your background, your long-term vision, and exactly what you are looking for in a co-founder...', 'Μοιράσου λίγα για το υπόβαθρό σου, το μακροπρόθεσμο όραμα και τι ακριβώς ψάχνεις σε συνιδρυτή…')}
         className={cn(
          "w-full px-4 py-3 rounded-xl border outline-none transition-all resize-none",
          errors.bio ? "border-red-500 focus:ring-red-500" : "border-stone-200 focus:ring-stone-900 focus:border-stone-900"
         )}
        />
        <p className="text-xs text-stone-500 mt-1">{t('A short bio is enough. Looking-for comes on the next step.', 'Ένα σύντομο βιογραφικό αρκεί. Το «ψάχνω για» έρχεται στο επόμενο βήμα.')}</p>
        {errors.bio && <p className="text-xs text-red-500 mt-1">{errors.bio}</p>}
       </div>
       <div className="grid grid-cols-2 gap-4">
        <div>
         <label className="block text-sm font-medium text-stone-700 mb-1">{t('Location', 'Τοποθεσία')}</label>
         <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
           type="text"
           value={formData.location}
           onChange={(e) => updateFormData({ location: e.target.value })}
           placeholder={t('City, Country', 'Πόλη, χώρα')}
           className={cn(
            "w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all",
            errors.location ? "border-red-500 focus:ring-red-500" : "border-stone-200 focus:ring-stone-900 focus:border-stone-900"
           )}
          />
         </div>
         {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
        </div>
        <div>
         <label className="block text-sm font-medium text-stone-700 mb-1">{t('LinkedIn URL', 'URL LinkedIn')}</label>
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
       <h1 className="text-xl sm:text-2xl font-semibold text-stone-900">{t('What are your startup goals?', 'Ποιοι είναι οι στόχοι της startup σου;')}</h1>
       <p className="text-stone-500">{t('Define your current stage and commitment level.', 'Όρισε το τρέχον στάδιο και το επίπεδο δέσμευσης.')}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
       <div className="space-y-4">
        <label className="block text-sm font-medium text-stone-900 tracking-wider">{t('Current Stage', 'Τρέχον στάδιο')}</label>
        <div className="space-y-2">
         {[
          { id: FounderStage.IDEA, label: t('Idea Stage', 'Στάδιο ιδέας'), desc: t('Just a concept', 'Μόνο μια ιδέα') },
          { id: FounderStage.MVP, label: t('MVP Stage', 'Στάδιο MVP'), desc: t('Building or built a prototype', 'Φτιάχνεις ή έχεις πρωτότυπο') },
          { id: FounderStage.SCALING, label: t('Scaling', 'Κλιμάκωση'), desc: t('Have users and growing', 'Έχεις χρήστες και μεγαλώνεις') },
         ].map((stage) => (
          <button
           key={stage.id}
           type="button"
           aria-pressed={formData.stage === stage.id}
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
        <label className="block text-sm font-medium text-stone-900 tracking-wider">{t('Commitment', 'Δέσμευση')}</label>
        <div className="space-y-2">
         {[
          { id: CommitmentLevel.FULL_TIME, label: labelOf(CommitmentLevel.FULL_TIME), desc: t('100% dedicated', 'Αφοσίωση 100%') },
          { id: CommitmentLevel.PART_TIME, label: labelOf(CommitmentLevel.PART_TIME), desc: t('Working alongside other things', 'Παράλληλα με άλλα') },
          { id: CommitmentLevel.EXPLORING, label: labelOf(CommitmentLevel.EXPLORING), desc: t('Casual exploration', 'Χαλαρή διερεύνηση') },
         ].map((lvl) => (
          <button
           key={lvl.id}
           type="button"
           aria-pressed={formData.commitment === lvl.id}
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
      <div>
       <label className="block text-sm font-medium text-stone-900 tracking-wider mb-2">{t('Looking for', 'Ψάχνω για')}</label>
       <div className="flex flex-wrap gap-2">
        {['Co-founder', 'Investor', 'Mentor', 'Sales', 'Growth', 'Technical help'].map((item) => {
         const on = formData.lookingFor.includes(item);
         return (
          <button
           key={item}
           type="button"
           aria-pressed={on}
           onClick={() => updateFormData({ lookingFor: on ? formData.lookingFor.filter((value) => value !== item) : [...formData.lookingFor, item] })}
           className={cn(
            'min-h-11 rounded-full border px-3 text-sm',
            on ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400',
           )}
          >
           {t(item, LOOKING_EL[item] || item)}
          </button>
         );
        })}
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
       <h1 className="text-xl sm:text-2xl font-semibold text-stone-900">{t("You're all set!", 'Όλα έτοιμα!')}</h1>
       <p className="text-stone-500 max-w-sm mx-auto">
        {t("Your profile is ready. We'll now show you compatible co-founders and mentors based on your preferences.", 'Το προφίλ σου είναι έτοιμο. Θα σου δείξουμε συμβατούς συνιδρυτές και μέντορες με βάση τις προτιμήσεις σου.')}
       </p>
      </div>
      <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 text-left max-w-md mx-auto">
       <h4 className="font-medium text-stone-900 mb-4">{t('Profile Summary', 'Σύνοψη προφίλ')}</h4>
       <div className="space-y-3 text-sm">
        <div className="flex justify-between">
         <span className="text-stone-500">{t('Role:', 'Ρόλος:')}</span>
         <span className="font-medium text-stone-900 capitalize">{labelOf(formData.role)}</span>
        </div>
        <div className="flex justify-between">
         <span className="text-stone-500">{t('Stage:', 'Στάδιο:')}</span>
         <span className="font-medium text-stone-900 capitalize">{labelOf(formData.stage)}</span>
        </div>
        <div className="flex justify-between">
         <span className="text-stone-500">{t('Commitment:', 'Δέσμευση:')}</span>
         <span className="font-medium text-stone-900 capitalize">{labelOf(formData.commitment)}</span>
        </div>
        <div className="flex justify-between">
         <span className="text-stone-500">{t('Location:', 'Τοποθεσία:')}</span>
         <span className="font-medium text-stone-900">{formData.location || t('Not specified', 'Δεν έχει οριστεί')}</span>
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
    <div className="mb-8 sm:mb-12">
     <div className="flex justify-between mb-4">
      {STEPS.map((step, idx) => {
       const canJump = idx <= currentStep;
       return (
        <button
         key={step.id}
         type="button"
         disabled={!canJump}
         onClick={() => canJump && setCurrentStep(idx)}
         className={cn(
          "flex flex-col items-center gap-2 transition-opacity",
          canJump ? "cursor-pointer hover:opacity-80" : "cursor-default"
         )}
        >
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
         {t(step.title, STEP_EL[step.title] || step.title)}
        </span>
        </button>
       );
      })}
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
    <div className="bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-100 p-6 sm:p-12 min-h-[500px] flex flex-col relative">
     <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-stone-100">
      <button 
       type="button"
       onClick={handleBack}
       className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-xl text-xs sm:text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
      >
       <ArrowLeft className="w-4 h-4" />
       {currentStep > 0 ? t('Previous step', 'Προηγούμενο βήμα') : t('Back to previous page', 'Επιστροφή')}
      </button>
      <div className="flex items-center gap-2">
       <button
        type="button"
        onClick={handleExit}
        className="min-h-9 px-3 rounded-xl text-xs sm:text-sm font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
       >
        {t('Skip for now', 'Παράλειψη')}
       </button>
       <button
        type="button"
        onClick={handleExit}
        aria-label={t('Close', 'Κλείσιμο')}
        title={t('Close', 'Κλείσιμο')}
        className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-stone-200 bg-white text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
       >
        <X className="w-4 h-4" />
       </button>
      </div>
     </div>
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
     <div className="mt-10 flex items-center justify-between pt-6 border-t border-stone-100">
      <button
       type="button"
       onClick={handleBack}
       disabled={loading}
       className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-all"
      >
       <ArrowLeft className="w-5 h-5" />
       {currentStep > 0 ? t('Back', 'Πίσω') : t('Exit', 'Έξοδος')}
      </button>
      <button
       type="button"
       onClick={handleNext}
       disabled={loading || (currentStep === 0 && !formData.role)}
       className="flex items-center gap-2 px-6 sm:px-8 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all shadow-sm disabled:opacity-50 group"
      >
       {loading ? t('Saving...', 'Αποθήκευση...') : currentStep === STEPS.length - 1 ? t('Get Started', 'Ξεκίνα') : t('Continue', 'Συνέχεια')}
       <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>
     </div>
    </div>
   </div>
  </div>
 );
}
