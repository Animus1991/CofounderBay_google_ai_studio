import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
 User, 
 MapPin, 
 Briefcase, 
 Target, 
 Globe, 
 Linkedin, 
 Github, 
 Twitter, 
 Edit3, 
 Check, 
 X, 
 Plus, 
 Star, 
 MessageSquare, 
 UserPlus,
 ShieldCheck,
 Zap,
 ArrowLeft,
 ArrowRight,
 Sparkles,
 Share2,
 MoreVertical,
 ThumbsUp,
 Award,
 TrendingUp,
 PieChart as PieChartIcon,
 Calendar as CalendarIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
 PieChart, 
 Pie, 
 Cell, 
 ResponsiveContainer 
} from 'recharts';
import Button from '../components/ui/Button';
import { doc, getDoc, updateDoc, serverTimestamp, collection, addDoc, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { cn } from '../lib/utils';
import { useAuth } from '../App';
import { UserProfile, UserSkill, Endorsement, ReadinessScore } from '../types';

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

export default function ProfilePage() {
 const { id } = useParams();
 const { user: currentUser } = useAuth();
 const navigate = useNavigate();
 const [profile, setProfile] = useState<UserProfile | null>(null);
 const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
 const [readiness, setReadiness] = useState<ReadinessScore | null>(null);
 const [isEditing, setIsEditing] = useState(false);
 const [isEndorsing, setIsEndorsing] = useState(false);
 const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
 const [selectedSkillForEndorsement, setSelectedSkillForEndorsement] = useState('');
 const [endorsementComment, setEndorsementComment] = useState('');
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');

 const isOwnProfile = !id || id === currentUser?.uid;
 const profileId = id || currentUser?.uid;

 useEffect(() => {
  if (isEditing && profile) {
   setEditForm(profile);
  }
 }, [isEditing, profile]);

 // Calculate profile completion for prompts (Diderot Effect: Action A -> Suggest Action B)
 const getNextStepPrompts = () => {
  if (!profile || !isOwnProfile) return [];
  const prompts = [];
  const hasSkills = profile.skills && profile.skills.length > 0;
  const hasSocial = profile.linkedinUrl || profile.githubUrl || profile.twitterUrl || profile.portfolioUrl;
  
  // Header Section Prompts
  if (!profile.headline) {
   prompts.push({ id: 'headline', text: 'Add a compelling headline to stand out.', section: 'header' });
  } else if (!hasSkills) {
   prompts.push({ id: 'suggest-skills', text: 'Add your key skills to improve your match score.', section: 'header' });
  }

  // Skills Section Prompts
  if (!hasSkills) {
   prompts.push({ id: 'skills', text: 'Add your key skills to improve your match score.', section: 'skills' });
  } else if (!profile.bio) {
   prompts.push({ id: 'suggest-bio', text: 'A detailed bio helps others understand your vision and values.', section: 'skills' });
  }

  // About Section Prompts
  if (!profile.bio) {
   prompts.push({ id: 'bio', text: 'A detailed bio helps others understand your vision and values.', section: 'about' });
  } else if (!hasSocial) {
   prompts.push({ id: 'suggest-social', text: 'Connect your social profiles to verify your professional identity.', section: 'about' });
  }

  // Social Section Prompts
  if (!hasSocial) {
   prompts.push({ id: 'social', text: 'Connect your social profiles to verify your professional identity.', section: 'social' });
  } else {
   prompts.push({ id: 'suggest-matching', text: 'Set your matching preferences to find the perfect co-founder.', section: 'social' });
  }

  return prompts;
 };

 const nextStepPrompts = getNextStepPrompts();
 const getPromptForSection = (section: string) => {
  return nextStepPrompts.filter(item => item.section === section);
 };

 useEffect(() => {
  const fetchProfileAndEndorsements = async () => {
   if (!profileId) return;
   setLoading(true);
   try {
    const docRef = doc(db, 'profiles', profileId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
     const data = docSnap.data();
     setProfile({
      ...data,
      uid: data.userId || profileId
     } as UserProfile);
    } else if (isOwnProfile) {
     navigate('/onboarding');
    } else {
     setError('Profile not found');
    }

    // Fetch endorsements
    const endorsementsQuery = query(
     collection(db, 'endorsements'),
     where('recipientId', '==', profileId),
     orderBy('createdAt', 'desc')
    );
    const endorsementsSnap = await getDocs(endorsementsQuery);
    const fetchedEndorsements = endorsementsSnap.docs.map(doc => ({
     id: doc.id,
     ...doc.data()
    } as Endorsement));
    setEndorsements(fetchedEndorsements);
   } catch (err: any) {
    console.error('Error fetching profile/endorsements:', err);
    // Don't fail the whole page if endorsements fail
    if (!profile) {
     handleFirestoreError(err, OperationType.GET, `profiles/${profileId}`);
    }
   } finally {
    setLoading(false);
   }
  };

  fetchProfileAndEndorsements();

  // Real-time readiness score
  let unsubscribeReadiness: (() => void) | undefined;
  if (profileId) {
   unsubscribeReadiness = onSnapshot(doc(db, 'readinessScores', profileId), (doc) => {
    if (doc.exists()) {
     setReadiness(doc.data() as ReadinessScore);
    }
   }, (error) => {
    console.error('Error listening to readiness score:', error);
   });
  }

  return () => {
   if (unsubscribeReadiness) unsubscribeReadiness();
  };
 }, [profileId, isOwnProfile, navigate]);

 const handleEndorse = async () => {
  if (!currentUser || !profileId || !selectedSkillForEndorsement) return;
  setIsEndorsing(true);
  try {
   const newEndorsement = {
    endorserId: currentUser.uid,
    recipientId: profileId,
    skillId: selectedSkillForEndorsement,
    comment: endorsementComment,
    createdAt: new Date().toISOString()
   };
   const docRef = await addDoc(collection(db, 'endorsements'), newEndorsement);
   setEndorsements(prev => [{ id: docRef.id, ...newEndorsement }, ...prev]);
   setSelectedSkillForEndorsement('');
   setEndorsementComment('');
   // Trigger a habit loop notification or similar here in the future
  } catch (err: any) {
   handleFirestoreError(err, OperationType.CREATE, 'endorsements');
  } finally {
   setIsEndorsing(false);
  }
 };

 const handleSave = async (data: Partial<UserProfile>) => {
  if (!profileId) return;
  try {
   const docRef = doc(db, 'profiles', profileId);
   
   // Filter out empty strings for URLs to avoid validation errors
   const updateData: any = {
    ...data,
    updatedAt: serverTimestamp(),
   };

   if (data.linkedinUrl === "") updateData.linkedinUrl = "";
   if (data.githubUrl === "") updateData.githubUrl = "";
   if (data.portfolioUrl === "") updateData.portfolioUrl = "";

   await updateDoc(docRef, updateData);
   setProfile(prev => prev ? { ...prev, ...data } : null);
   setIsEditing(false);
  } catch (err: any) {
   handleFirestoreError(err, OperationType.UPDATE, `profiles/${profileId}`);
  }
 };

 if (loading) {
  return (
   <div className="min-h-screen flex items-center justify-center bg-stone-50">
    <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
   </div>
  );
 }

 if (error || !profile) {
  return (
   <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-4">
    <div className="bg-white p-8 rounded-3xl shadow-xl text-center space-y-4 max-w-md">
     <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
      <X className="w-8 h-8" />
     </div>
     <h2 className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900">Profile Error</h2>
     <p className="text-stone-500">{error || 'Profile not found'}</p>
     <button 
      onClick={() => navigate('/dashboard')}
      className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all"
     >
      Back to Dashboard
     </button>
    </div>
   </div>
  );
 }

 const InlinePrompt = ({ text }: { text: string }) => (
  <motion.div 
   initial={{ opacity: 0, y: 10 }}
   animate={{ opacity: 1, y: 0 }}
   whileHover={{ scale: 1.02 }}
   className="mt-4 p-5 bg-stone-900 text-white rounded-2xl flex items-center gap-4 group/prompt shadow-lg shadow-stone-900/20 cursor-pointer overflow-hidden relative"
   onClick={() => setIsEditing(true)}
  >
   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/prompt:scale-150 transition-transform">
    <Sparkles className="w-12 h-12" />
   </div>
   <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
    <Sparkles className="w-5 h-5 text-amber-400" />
   </div>
   <div className="flex-1">
    <p className="text-xs font-medium text-stone-400 uppercase tracking-widest mb-0.5">Next Best Action</p>
    <p className="text-sm font-medium text-white">{text}</p>
   </div>
   <ArrowRight className="w-5 h-5 text-white/50 group-hover/prompt:translate-x-1 transition-transform" />
  </motion.div>
 );

 return (
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
   {/* Profile Header */}
   <div className="relative">
    {isOwnProfile && profile.profileCompletionScore !== undefined && profile.profileCompletionScore < 80 && (
     <div className="mb-6 bg-amber-50 rounded-3xl border border-amber-200 p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center shadow-sm">
      <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
       <Sparkles className="w-6 h-6" />
      </div>
      <div className="flex-1">
       <h3 className="text-lg font-semibold text-amber-900 tracking-tight">Boost Your Profile Score ({profile.profileCompletionScore}% Complete)</h3>
       <p className="text-sm text-amber-700 leading-relaxed mt-1">
        Founders with detailed profiles receive 4x more match requests. Add your skills, bio, and social links to improve your visibility.
       </p>
      </div>
      <button 
       onClick={() => setIsEditing(true)}
       className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-all shadow-md shrink-0"
      >
       Complete Profile
      </button>
     </div>
    )}
    {/* Banner */}
    <div className="h-48 sm:h-64 bg-stone-900 rounded-3xl overflow-hidden relative shadow-xl shadow-stone-900/10">
     <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-stone-950 opacity-50" />
     <div className="absolute inset-0 flex items-center justify-center opacity-10">
      <Zap className="w-64 h-64 text-white" />
     </div>
     {isOwnProfile && (
      <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all">
       <Edit3 className="w-5 h-5" />
      </button>
     )}
    </div>

    {/* Profile Info Card */}
    <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/50 border border-stone-100 p-6 sm:p-10 -mt-20 relative z-10 mx-4 sm:mx-10">
     <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-end">
      <div className="relative">
       <img 
        src={`https://picsum.photos/seed/${profile.uid}/200/200`} 
        alt={currentUser?.displayName || 'User'} 
        className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl object-cover border-4 border-white shadow-2xl"
        referrerPolicy="no-referrer"
       />
       <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-2 rounded-full border-4 border-white shadow-lg">
        <ShieldCheck className="w-5 h-5" />
       </div>
      </div>

      <div className="flex-1 space-y-4">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
         <h1 className="text-lg sm:text-xl md:text-2xl font-medium text-stone-900 tracking-tight">
          {currentUser?.displayName || 'Founder'}
         </h1>
         {isEditing ? (
          <input 
           type="text" 
           value={editForm.headline || ''}
           onChange={(e) => setEditForm(prev => ({ ...prev, headline: e.target.value }))}
           className="w-full px-4 py-2 mt-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-base"
           placeholder="Headline"
          />
         ) : (
          <p className="text-lg font-medium text-stone-500 mt-1">{profile.headline}</p>
         )}
        </div>
        <div className="flex items-center gap-3">
         {isOwnProfile ? (
          isEditing ? (
           <button 
            onClick={() => handleSave(editForm)}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-stone-900 text-white rounded-[2rem] text-xs sm:text-sm font-semibold hover:bg-stone-800 transition-all shadow-md"
           >
            <Check className="w-5 h-5" />
            Save Changes
           </button>
          ) : (
           <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-stone-900 text-white rounded-[2rem] text-xs sm:text-sm font-semibold hover:bg-stone-800 transition-all shadow-md"
           >
            <Edit3 className="w-5 h-5" />
            Edit Profile
           </button>
          )
         ) : (
          <>
           <button className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-stone-900 text-white rounded-[2rem] text-xs sm:text-sm font-semibold hover:bg-stone-800 transition-all shadow-md">
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            Connect
           </button>
           <button className="p-3 bg-stone-50 text-stone-900 rounded-xl hover:bg-stone-100 transition-all border border-stone-100">
            <MessageSquare className="w-5 h-5" />
           </button>
          </>
         )}
         <button className="p-3 bg-stone-50 text-stone-900 rounded-xl hover:bg-stone-100 transition-all border border-stone-100">
          <Share2 className="w-5 h-5" />
         </button>
        </div>
       </div>

       <div className="flex flex-wrap gap-4 text-sm font-medium text-stone-500">
        <div className="flex items-center gap-1.5">
         <MapPin className="w-4 h-4" />
         {isEditing ? (
          <input 
           type="text" 
           value={editForm.location || ''}
           onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
           className="px-3 py-1 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900"
           placeholder="Location"
          />
         ) : (
          profile.location || 'Remote'
         )}
        </div>
        <div className="flex items-center gap-1.5">
         <Briefcase className="w-4 h-4" />
         {profile.stage} stage
        </div>
        <div className="flex items-center gap-1.5">
         <Target className="w-4 h-4" />
         {profile.commitment}
        </div>
        {profile.availability && (
         <div className="flex items-center gap-1.5">
          <CalendarIcon className="w-4 h-4" />
          {profile.availability}
         </div>
        )}
        <div className="flex items-center gap-1.5">
         <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
         80% Match Score
        </div>
       </div>
       
       {/* Header Prompts */}
       {getPromptForSection('header').map(prompt => (
        <InlinePrompt key={prompt.id} text={prompt.text} />
       ))}
      </div>
     </div>
    </div>
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    {/* Left Column */}
    <div className="lg:col-span-2 space-y-8">
     {/* About Section */}
     <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm space-y-4">
      <h3 className="text-lg sm:text-xl md:text-2xl font-medium text-stone-900">About Me</h3>
      {isEditing ? (
       <div className="space-y-4">
        <textarea 
         value={editForm.bio || ''}
         onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
         rows={4}
         className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900 text-base"
         placeholder="Tell us about yourself..."
        />
        <p className="text-xs text-stone-500 mt-2">Add more details about your professional experience and values highly increases match accuracy.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-stone-100">
         <div>
          <label className="block text-sm font-medium text-stone-500 mb-1">LinkedIn URL</label>
          <input 
           type="url" 
           value={editForm.linkedinUrl || ''}
           onChange={(e) => setEditForm(prev => ({ ...prev, linkedinUrl: e.target.value }))}
           className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900"
           placeholder="https://linkedin.com/in/..."
          />
         </div>
         <div>
          <label className="block text-sm font-medium text-stone-500 mb-1">GitHub URL</label>
          <input 
           type="url" 
           value={editForm.githubUrl || ''}
           onChange={(e) => setEditForm(prev => ({ ...prev, githubUrl: e.target.value }))}
           className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900"
           placeholder="https://github.com/..."
          />
         </div>
         <div>
          <label className="block text-sm font-medium text-stone-500 mb-1">Portfolio URL</label>
          <input 
           type="url" 
           value={editForm.portfolioUrl || ''}
           onChange={(e) => setEditForm(prev => ({ ...prev, portfolioUrl: e.target.value }))}
           className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900"
           placeholder="https://yourportfolio.com"
          />
         </div>
         <div>
          <label className="block text-sm font-medium text-stone-500 mb-1">Availability</label>
          <select
           value={editForm.availability || 'Immediate'}
           onChange={(e) => setEditForm(prev => ({ ...prev, availability: e.target.value }))}
           className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900 cursor-pointer"
          >
           <option value="Immediate">Immediate</option>
           <option value="1 week notice">1 week notice</option>
           <option value="2 weeks notice">2 weeks notice</option>
           <option value="1 month notice">1 month notice</option>
          </select>
         </div>
        </div>
       </div>
      ) : (
       <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">
        {profile.bio || 'No bio provided yet.'}
       </p>
      )}
      {getPromptForSection('about').map(prompt => (
       <InlinePrompt key={prompt.id} text={prompt.text} />
      ))}
     </div>

     {/* Experience / Projects */}
     <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
       <h3 className="text-lg sm:text-xl md:text-2xl font-medium text-stone-900">Experience & Projects</h3>
       {isOwnProfile && (
        <button className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-all">
         <Plus className="w-5 h-5" />
        </button>
       )}
      </div>
      <div className="space-y-8">
       {[
        { title: 'Founder & CEO', company: 'TechFlow AI', period: '2021 - Present', desc: 'Building the future of automated logistics using computer vision.' },
        { title: 'Senior Product Manager', company: 'Google', period: '2018 - 2021', desc: 'Led the development of core search features for mobile users.' },
       ].map((exp, idx) => (
        <div key={idx} className="flex gap-6 group">
         <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-900 font-medium group-hover:bg-stone-900 group-hover:text-white transition-all">
           {exp.company[0]}
          </div>
          <div className="w-0.5 flex-1 bg-stone-100 my-2" />
         </div>
         <div className="pb-4">
          <h4 className="font-medium text-stone-900">{exp.title}</h4>
          <div className="flex items-center gap-2 text-sm text-stone-500 mt-1">
           <span className="font-medium">{exp.company}</span>
           <span>•</span>
           <span>{exp.period}</span>
          </div>
          <p className="text-sm text-stone-600 mt-3 leading-relaxed">{exp.desc}</p>
         </div>
        </div>
       ))}
      </div>
     </div>
    </div>

    {/* Right Column */}
    <div className="space-y-8">
     {/* Skills Section */}
     <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
       <h3 className="text-lg sm:text-xl md:text-2xl font-medium text-stone-900">Skills & Endorsements</h3>
       {isOwnProfile && (
        <button className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-all">
         <Plus className="w-5 h-5" />
        </button>
       )}
      </div>
      
      <div className="flex flex-wrap gap-2">
       {(profile.skills || ['Product Strategy', 'Machine Learning', 'React', 'Node.js', 'Venture Capital', 'Growth Hacking']).map(skill => {
        const skillName = typeof skill === 'string' ? skill : (skill as any).name;
        const skillProficiency = typeof skill === 'object' && (skill as any).proficiency ? (skill as any).proficiency : 0;
        const skillEndorsements = endorsements.filter(e => e.skillId === skillName);
        const hasEndorsed = skillEndorsements.some(e => e.endorserId === currentUser?.uid);
        
        return (
         <div key={skillName} className="group/skill relative flex items-center bg-stone-50 border border-stone-100 rounded-xl overflow-hidden hover:border-stone-300 transition-all">
          <div className="px-4 py-2 flex flex-col justify-center">
           <span className="text-stone-900 text-sm font-medium">{skillName}</span>
           {skillProficiency > 0 && (
            <div className="flex items-center gap-0.5 mt-0.5" title={`Proficiency: ${skillProficiency}/5`}>
             {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={cn("w-2.5 h-2.5", i < skillProficiency ? "text-amber-400 fill-amber-400" : "text-stone-300")} />
             ))}
            </div>
           )}
          </div>
          
          {skillEndorsements.length > 0 && (
           <div className="px-2 py-1 bg-stone-100 text-stone-600 text-xs font-medium border-l border-stone-200 flex items-center gap-1">
            <Award className="w-3 h-3" />
            {skillEndorsements.length}
           </div>
          )}

          {!isOwnProfile && (
           <button 
            onClick={() => !hasEndorsed && setSelectedSkillForEndorsement(skillName)}
            disabled={hasEndorsed}
            className={cn(
             "px-3 py-2 border-l border-stone-100 transition-all flex items-center justify-center",
             hasEndorsed ? "bg-emerald-50 text-emerald-600 cursor-default" : "bg-white text-stone-400 hover:bg-stone-900 hover:text-white"
            )}
            title={hasEndorsed ? "Endorsed" : "Endorse skill"}
           >
            {hasEndorsed ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
           </button>
          )}
         </div>
        );
       })}
      </div>

      {getPromptForSection('skills').map(prompt => (
       <InlinePrompt key={prompt.id} text={prompt.text} />
      ))}

      {/* Endorsement Form (Modal-like) */}
      <AnimatePresence>
       {selectedSkillForEndorsement && (
        <motion.div 
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         exit={{ opacity: 0, scale: 0.95 }}
         className="p-6 bg-stone-50 rounded-2xl border border-stone-200 space-y-4"
        >
         <div className="flex items-center justify-between">
          <h4 className="font-medium text-stone-900">Endorse for {selectedSkillForEndorsement}</h4>
          <button onClick={() => setSelectedSkillForEndorsement('')} className="text-stone-400 hover:text-stone-900">
           <X className="w-5 h-5" />
          </button>
         </div>
         <textarea 
          placeholder="Add a brief comment (optional)..."
          value={endorsementComment}
          onChange={(e) => setEndorsementComment(e.target.value)}
          className="w-full p-4 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-900 outline-none transition-all"
          rows={3}
         />
         <Button 
          onClick={handleEndorse} 
          disabled={isEndorsing}
          className="w-full h-10 rounded-xl bg-stone-900 text-white font-medium text-sm"
         >
          {isEndorsing ? 'Endorsing...' : 'Confirm Endorsement'}
         </Button>
        </motion.div>
       )}
      </AnimatePresence>

      {/* Recent Endorsements Feed */}
      {endorsements.length > 0 && (
       <div className="pt-6 border-t border-stone-50 space-y-4">
        <h4 className="text-sm font-medium text-stone-400 uppercase tracking-widest">Recent Endorsements</h4>
        <div className="space-y-4">
         {endorsements.slice(0, 3).map((endorsement) => (
          <div key={endorsement.id} className="flex gap-4 p-4 bg-stone-50/50 rounded-2xl border border-stone-100">
           <div className="w-10 h-10 rounded-xl bg-white border border-stone-100 overflow-hidden shrink-0">
            <img src={`https://picsum.photos/seed/${endorsement.endorserId}/100/100`} alt="" />
           </div>
           <div className="space-y-1">
            <p className="text-sm text-stone-900">
             <span className="font-medium">Someone</span> endorsed for <span className="font-medium text-stone-900">{endorsement.skillId}</span>
            </p>
            {endorsement.comment && (
             <p className="text-xs text-stone-500 italic">"{endorsement.comment}"</p>
            )}
           </div>
          </div>
         ))}
        </div>
       </div>
      )}
     </div>

     {/* Readiness Score Section */}
     {readiness && (
      <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm space-y-6">
       <div className="flex items-center justify-between">
        <h3 className="text-lg sm:text-xl md:text-2xl font-medium text-stone-900">Startup Readiness</h3>
        <TrendingUp className="w-5 h-5 text-stone-400" />
       </div>

       <div className="flex items-center gap-6">
        <div className="w-24 h-24 shrink-0">
         <ResponsiveContainer width="100%" height="100%">
          <PieChart>
           <Pie
            data={[
             { name: 'Score', value: readiness.score },
             { name: 'Remaining', value: 100 - readiness.score }
            ]}
            cx="50%"
            cy="50%"
            innerRadius={30}
            outerRadius={40}
            paddingAngle={5}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
           >
            <Cell fill="#1c1917" />
            <Cell fill="#f5f5f4" />
           </Pie>
          </PieChart>
         </ResponsiveContainer>
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs font-medium text-stone-900">{readiness.score}</span>
         </div>
        </div>
        <div className="flex-1 space-y-1">
         <p className="text-sm font-medium text-stone-900">Ecosystem Standing</p>
         <p className="text-xs text-stone-500 leading-relaxed">
          Based on your artifacts, team momentum, and mentor feedback loops.
         </p>
        </div>
       </div>

       <div className="grid grid-cols-2 gap-3">
        {[
         { label: 'Artifacts', value: readiness.dimensionScores.artifactCompleteness, color: 'blue' },
         { label: 'Team', value: readiness.dimensionScores.teamCompleteness, color: 'green' },
         { label: 'Market', value: readiness.dimensionScores.marketUnderstanding, color: 'amber' },
         { label: 'Product', value: readiness.dimensionScores.solutionClarity, color: 'purple' },
        ].map((dim) => (
         <div key={dim.label} className="p-3 bg-stone-50 rounded-xl border border-stone-100">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-widest mb-1">{dim.label}</div>
          <div className="text-sm font-medium text-stone-900">{dim.value}/100</div>
         </div>
        ))}
       </div>
      </div>
     )}

     {/* Social Links */}
     <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm space-y-6">
      <h3 className="text-lg sm:text-xl md:text-2xl font-medium text-stone-900">Connect</h3>
      <div className="space-y-4">
       {profile.linkedinUrl && (
        <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all font-medium">
         <Linkedin className="w-5 h-5" />
         LinkedIn Profile
        </a>
       )}
       {profile.githubUrl && (
        <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all font-medium">
         <Github className="w-5 h-5" />
         GitHub Portfolio
        </a>
       )}
       {profile.twitterUrl && (
        <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all font-medium">
         <Twitter className="w-5 h-5" />
         Twitter / X
        </a>
       )}
       {profile.portfolioUrl && (
        <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all font-medium">
         <Globe className="w-5 h-5" />
         Personal Website
        </a>
       )}
       {!profile.linkedinUrl && !profile.githubUrl && !profile.twitterUrl && !profile.portfolioUrl && (
        <p className="text-stone-500 text-sm">No social links added yet.</p>
       )}
      </div>
      {getPromptForSection('social').map(prompt => (
       <InlinePrompt key={prompt.id} text={prompt.text} />
      ))}
     </div>

     {/* Profile Stats */}
     <div className="bg-stone-50 p-8 rounded-3xl border border-stone-100 space-y-6">
      <h3 className="text-lg font-medium text-stone-900">Profile Stats</h3>
      <div className="grid grid-cols-2 gap-4">
       <div className="bg-white p-4 rounded-2xl border border-stone-100 text-center">
        <div className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900">1.2k</div>
        <div className="text-xs text-stone-500 font-medium uppercase tracking-wider">Views</div>
       </div>
       <div className="bg-white p-4 rounded-2xl border border-stone-100 text-center">
        <div className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900">48</div>
        <div className="text-xs text-stone-500 font-medium uppercase tracking-wider">Matches</div>
       </div>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
