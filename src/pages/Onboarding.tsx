import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, CheckCircle2, ChevronRight, ChevronLeft, Users, GraduationCap, Briefcase, Target, Heart, Globe } from 'lucide-react';
import Button from '../components/ui/Button';
import { User, UserRole, ProfileStatus } from '../types';
import { useNavigate } from 'react-router-dom';

interface OnboardingProps {
 user: User;
 onComplete: (updatedUser: User) => void;
}

export default function Onboarding({ user, onComplete }: OnboardingProps) {
 const [step, setStep] = useState(1);
 const [formData, setFormData] = useState({
  roles: [] as UserRole[],
  headline: '',
  bio: '',
  skills: [] as string[],
  values: [] as string[],
  startupStage: [] as string[],
  commitment: 'Full-time',
  location: '',
 });

 const navigate = useNavigate();

 const totalSteps = 5;

 const nextStep = () => {
  if (step < totalSteps) setStep(step + 1);
  else handleFinish();
 };

 const prevStep = () => {
  if (step > 1) setStep(step - 1);
 };

 const handleFinish = () => {
  // In a real app, we would save to API here
  const updatedUser: User = {
   ...user,
   profileCompletionScore: 100,
   profileStatus: ProfileStatus.PUBLISHED,
  };
  onComplete(updatedUser);
  navigate('/dashboard');
 };

 const toggleRole = (role: UserRole) => {
  setFormData(prev => ({
   ...prev,
   roles: prev.roles.includes(role) 
    ? prev.roles.filter(r => r !== role)
    : [...prev.roles, role]
  }));
 };

 const renderStep = () => {
  switch (step) {
   case 1:
    return (
     <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
     >
      <div className="space-y-1">
       <h2 className="text-xl sm:text-2xl xl:text-3xl font-medium tracking-tight">What is your primary role?</h2>
       <p className="text-stone-500 text-sm">Select all that apply to your current startup journey.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
       {(['Founder', 'Co-Founder Candidate', 'Mentor', 'Advisor'] as UserRole[]).map((role) => (
        <button
         key={role}
         onClick={() => toggleRole(role)}
         className={`p-4 rounded-xl border-2 text-left transition-all ${
          formData.roles.includes(role)
           ? 'border-stone-900 bg-stone-900 text-white shadow-md'
           : 'border-stone-100 bg-white text-stone-600 hover:border-stone-200'
         }`}
        >
         <div className="flex items-center justify-between mb-3">
          {role === 'Founder' && <Target className="w-5 h-5" />}
          {role === 'Co-Founder Candidate' && <Users className="w-5 h-5" />}
          {role === 'Mentor' && <GraduationCap className="w-5 h-5" />}
          {role === 'Advisor' && <Briefcase className="w-5 h-5" />}
          {formData.roles.includes(role) && <CheckCircle2 className="w-4 h-4 text-white" />}
         </div>
         <h3 className="font-medium text-base">{role}</h3>
         <p className={`text-xs mt-0.5 ${formData.roles.includes(role) ? 'text-stone-400' : 'text-stone-400'}`}>
          {role === 'Founder' && "You have a venture and need a team."}
          {role === 'Co-Founder Candidate' && "You're looking to join a venture."}
          {role === 'Mentor' && "You want to guide early-stage founders."}
          {role === 'Advisor' && "You offer specialized strategic help."}
         </p>
        </button>
       ))}
      </div>
     </motion.div>
    );
   case 2:
    return (
     <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
     >
      <div className="space-y-1">
       <h2 className="text-xl sm:text-2xl xl:text-3xl font-medium tracking-tight">Tell us about yourself</h2>
       <p className="text-stone-500 text-sm">Your headline and bio help others understand your vision.</p>
      </div>
      <div className="space-y-3">
       <div className="space-y-1.5">
        <label className="text-xs font-medium text-stone-700 uppercase tracking-wider">Professional Headline</label>
        <input
         type="text"
         value={formData.headline}
         onChange={e => setFormData({ ...formData, headline: e.target.value })}
         placeholder="e.g. Serial Entrepreneur | Ex-Google Product Lead"
         className="w-full bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900/10"
        />
       </div>
       <div className="space-y-1.5">
        <label className="text-xs font-medium text-stone-700 uppercase tracking-wider">Short Bio</label>
        <textarea
         rows={3}
         value={formData.bio}
         onChange={e => setFormData({ ...formData, bio: e.target.value })}
         placeholder="Describe your background, what you're building, and what you're looking for..."
         className="w-full bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900/10"
        />
       </div>
       <div className="space-y-1.5">
        <label className="text-xs font-medium text-stone-700 uppercase tracking-wider">Location</label>
        <div className="relative">
         <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
         <input
          type="text"
          value={formData.location}
          onChange={e => setFormData({ ...formData, location: e.target.value })}
          placeholder="City, Country"
          className="w-full bg-stone-50 border border-stone-200 rounded-lg py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900/10"
         />
        </div>
       </div>
      </div>
     </motion.div>
    );
   case 3:
    return (
     <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
     >
      <div className="space-y-2">
       <h2 className="text-xl font-medium tracking-tight">Skills & Expertise</h2>
       <p className="text-stone-500">What are your core strengths? Select at least 3.</p>
      </div>
      <div className="flex flex-wrap gap-2">
       {['Product Management', 'Full-stack Dev', 'Growth Marketing', 'Venture Capital', 'UI/UX Design', 'Sales', 'AI/ML', 'Operations', 'Legal', 'Finance'].map(skill => (
        <button
         key={skill}
         onClick={() => setFormData(prev => ({
          ...prev,
          skills: prev.skills.includes(skill) ? prev.skills.filter(s => s !== skill) : [...prev.skills, skill]
         }))}
         className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
          formData.skills.includes(skill)
           ? 'bg-stone-900 border-stone-900 text-white'
           : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'
         }`}
        >
         {skill}
        </button>
       ))}
      </div>
     </motion.div>
    );
   case 4:
    return (
     <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
     >
      <div className="space-y-2">
       <h2 className="text-xl font-medium tracking-tight">Values & Work Style</h2>
       <p className="text-stone-500">Matching values is the best way to reduce team risk.</p>
      </div>
      <div className="space-y-6">
       <div className="space-y-3">
        <label className="text-sm font-medium text-stone-700">Mission Orientation</label>
        <div className="grid grid-cols-3 gap-3">
         {['Profit First', 'Balanced', 'Impact First'].map(val => (
          <button
           key={val}
           onClick={() => setFormData({ ...formData, values: [val] })}
           className={`py-3 rounded-xl border text-sm font-medium transition-all ${
            formData.values.includes(val)
             ? 'border-stone-900 bg-stone-900 text-white'
             : 'border-stone-100 bg-stone-50 text-stone-500 hover:border-stone-200'
           }`}
          >
           {val}
          </button>
         ))}
        </div>
       </div>
       <div className="space-y-3">
        <label className="text-sm font-medium text-stone-700">Risk Tolerance</label>
        <div className="grid grid-cols-3 gap-3">
         {['Low', 'Medium', 'High'].map(val => (
          <button
           key={val}
           className="py-3 rounded-xl border border-stone-100 bg-stone-50 text-stone-500 hover:border-stone-200 text-sm font-medium"
          >
           {val}
          </button>
         ))}
        </div>
       </div>
      </div>
     </motion.div>
    );
   case 5:
    return (
     <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
     >
      <div className="space-y-2">
       <h2 className="text-xl font-medium tracking-tight">Ready to launch?</h2>
       <p className="text-stone-500">Review your profile and start matching with the ecosystem.</p>
      </div>
      <div className="bg-stone-50 p-8 rounded-2xl border border-stone-200 space-y-4">
       <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-stone-200 rounded-full"></div>
        <div>
         <h3 className="text-xl font-medium">{user.fullName}</h3>
         <p className="text-stone-500">{formData.headline || 'No headline set'}</p>
        </div>
       </div>
       <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-200">
        <div>
         <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">Roles</p>
         <p className="text-sm font-medium">{formData.roles.join(', ') || 'None selected'}</p>
        </div>
        <div>
         <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">Location</p>
         <p className="text-sm font-medium">{formData.location || 'Not set'}</p>
        </div>
       </div>
      </div>
      <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl flex items-start gap-3">
       <CheckCircle2 className="w-5 h-5 mt-0.5" />
       <p className="text-sm leading-relaxed">
        Your profile is looking great! Completing these steps increases your match accuracy by 85%.
       </p>
      </div>
     </motion.div>
    );
   default:
    return null;
  }
 };

 return (
  <div className="min-h-screen bg-white flex flex-col">
   {/* Header */}
   <header className="h-20 border-b border-stone-100 flex items-center justify-between px-8 md:px-16">
    <div className="flex items-center gap-3">
     <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
      <Zap className="w-5 h-5 text-white fill-current" />
     </div>
     <span className="text-xl font-medium tracking-tight">CoFounderBay</span>
    </div>
    <div className="flex items-center gap-4">
     <span className="text-sm text-stone-400 font-medium">Step {step} of {totalSteps}</span>
     <div className="w-32 h-2 bg-stone-100 rounded-full overflow-hidden">
      <motion.div 
       className="h-full bg-stone-900"
       initial={{ width: 0 }}
       animate={{ width: `${(step / totalSteps) * 100}%` }}
      />
     </div>
    </div>
   </header>

   {/* Content */}
   <main className="flex-1 flex items-center justify-center p-8">
    <div className="w-full max-w-2xl">
     <AnimatePresence mode="wait">
      {renderStep()}
     </AnimatePresence>

     {/* Navigation */}
     <div className="flex items-center justify-between mt-12 pt-8 border-t border-stone-100">
      <Button 
       variant="ghost" 
       onClick={prevStep}
       disabled={step === 1}
       className={step === 1 ? 'opacity-0' : ''}
      >
       <ChevronLeft className="w-4 h-4" />
       Back
      </Button>
      <Button 
       onClick={nextStep}
       className="px-8"
      >
       {step === totalSteps ? 'Complete Profile' : 'Continue'}
       <ChevronRight className="w-4 h-4" />
      </Button>
     </div>
    </div>
   </main>
  </div>
 );
}
