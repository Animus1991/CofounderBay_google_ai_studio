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

 Calendar as CalendarIcon,

 Activity,

 Eye,

 Clock,

 Flame,

 Heart,

 BookOpen,

 Handshake,

 CheckCircle2,

 Trophy

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
import { listKeys, readIds, saveRequest, toggleId } from '../lib/localLists';
import { lookupPerson } from '../lib/people';

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



// ── Activity feed mock data ──────────────────────────────────────────────────
const PROFILE_ACTIVITY = [
 { id: 'a1', type: 'endorsement', text: 'Received endorsement for Machine Learning', time: '2h ago', icon: Award, color: 'text-amber-500', bg: 'bg-amber-50' },
 { id: 'a2', type: 'connection', text: 'Connected with Elena Papadopoulos', time: '5h ago', icon: Handshake, color: 'text-emerald-500', bg: 'bg-emerald-50' },
 { id: 'a3', type: 'milestone', text: 'Reached 50+ connections milestone', time: '1d ago', icon: Trophy, color: 'text-purple-500', bg: 'bg-purple-50' },
 { id: 'a4', type: 'project', text: 'Updated venture "TechFlow AI"', time: '2d ago', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-50' },
 { id: 'a5', type: 'skill', text: 'Added React & TypeScript skills', time: '3d ago', icon: Zap, color: 'text-violet-500', bg: 'bg-violet-50' },
 { id: 'a6', type: 'view', text: 'Profile viewed 38 times this week', time: '4d ago', icon: Eye, color: 'text-stone-500', bg: 'bg-stone-50' },
];

// ── Achievements / Badges ────────────────────────────────────────────────────
const ACHIEVEMENTS = [
 { id: 'b1', name: 'Early Adopter', desc: 'Joined in the first 1,000 users', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100', earned: true },
 { id: 'b2', name: 'Connector', desc: '25+ accepted connections', icon: Handshake, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', earned: true },
 { id: 'b3', name: 'Thought Leader', desc: '10+ endorsements received', icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', earned: true },
 { id: 'b4', name: 'Mentor Star', desc: 'Complete 5 mentoring sessions', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', earned: false },
 { id: 'b5', name: 'Pitch Pro', desc: 'Win a pitch competition', icon: Trophy, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100', earned: false },
 { id: 'b6', name: 'Full Profile', desc: '100% profile completion', icon: CheckCircle2, color: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-100', earned: false },
];

// ── Mutual connections / People also viewed ──────────────────────────────────
const MUTUAL_CONNECTIONS = [
 { id: 'm1', name: 'Sarah Chen', headline: 'AI Research Engineer', mutual: 4 },
 { id: 'm2', name: 'Nikos Papadakis', headline: 'Full-stack Developer', mutual: 3 },
 { id: 'm3', name: 'Marcus Chen', headline: 'Growth Marketing Lead', mutual: 2 },
];

const ALSO_VIEWED = [
 { id: 'av1', name: 'Elena Papadopoulos', headline: 'Product Design Lead', matchScore: 87 },
 { id: 'av2', name: 'Jordan Lee', headline: 'FinTech Founder', matchScore: 82 },
 { id: 'av3', name: 'Emma Wilson', headline: 'SaaS Operations', matchScore: 79 },
];

// ── Mock endorsements fallback (used when Firestore returns empty) ───────────
const MOCK_ENDORSEMENTS: Endorsement[] = [
 { id: 'me1', endorserId: 'user-sarah', skillId: 'Machine Learning', comment: 'Exceptional understanding of ML pipelines and model deployment.', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
 { id: 'me2', endorserId: 'user-nikos', skillId: 'Product Strategy', comment: 'Brilliant product thinking. Always sees the bigger picture.', createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
 { id: 'me3', endorserId: 'user-elena', skillId: 'React', comment: 'Clean, maintainable components every time.', createdAt: new Date(Date.now() - 8 * 86400000).toISOString() },
 { id: 'me4', endorserId: 'user-marcus', skillId: 'Growth Hacking', comment: 'Data-driven growth strategies that actually work.', createdAt: new Date(Date.now() - 12 * 86400000).toISOString() },
 { id: 'me5', endorserId: 'user-jordan', skillId: 'Node.js', comment: 'Strong backend architecture skills.', createdAt: new Date(Date.now() - 15 * 86400000).toISOString() },
];

// ── Mock readiness fallback ──────────────────────────────────────────────────
const MOCK_READINESS: ReadinessScore = {
 id: 'mock-readiness',
 workspaceId: 'default',
 score: 72,
 dimensionScores: {
  problemClarity: 75,
  solutionClarity: 68,
  marketUnderstanding: 70,
  teamCompleteness: 65,
  artifactCompleteness: 85,
  executionReadiness: 60,
  validation: 72,
  integration: 78,
 },
 updatedAt: new Date().toISOString(),
};

function fallbackProfile(profileId: string, ownName?: string | null): UserProfile {
 const person = lookupPerson(profileId);
 return {
  id: profileId,
  uid: profileId,
  fullName: person?.fullName || ownName || 'Founder',
  email: '',
  roles: [],
  profileStatus: 'Published',
  verificationStatus: 'Unverified',
  profileCompletionScore: 40,
  accountStatus: 'Active',
  onboardingCompleted: true,
  createdAt: '',
  updatedAt: '',
  headline: person?.headline || 'Founder',
  bio: person?.bio || '',
  location: person?.location || '',
  stage: '',
  role: person?.role || 'Founder',
  commitment: '',
  industry: person?.industry || '',
 } as UserProfile;
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

 const [following, setFollowing] = useState(() => !!id && readIds(listKeys.follow).includes(id));

 const profileId = id || currentUser?.uid;

 // ── Derived display data (always show sections, fallback to mock) ──
 const displayEndorsements = endorsements.length > 0 ? endorsements : MOCK_ENDORSEMENTS;
 const displayReadiness = readiness || MOCK_READINESS;



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

   setError('');

   let resolved = false;

   try {

    const docRef = doc(db, 'profiles', profileId);

    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {

     const data = docSnap.data();

     setProfile({

      ...data,

      uid: data.userId || profileId,

      fullName: data.fullName || data.displayName || lookupPerson(profileId)?.fullName || (isOwnProfile ? currentUser?.displayName : '') || 'Founder',

     } as UserProfile);

     resolved = true;

    }

   } catch (err) {

    console.error('Error fetching profile:', err);

   }

   if (!resolved) setProfile(fallbackProfile(profileId, isOwnProfile ? currentUser?.displayName : null));

   try {

    const endorsementsQuery = query(

     collection(db, 'endorsements'),

     where('recipientId', '==', profileId),

     orderBy('createdAt', 'desc')

    );

    const endorsementsSnap = await getDocs(endorsementsQuery);

    setEndorsements(endorsementsSnap.docs.map(doc => ({

     id: doc.id,

     ...doc.data()

    } as Endorsement)));

   } catch (err) {

    console.error('Error fetching endorsements:', err);

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

 }, [profileId, isOwnProfile, currentUser?.displayName]);



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

    <div className="bg-white p-5 rounded-2xl shadow-xl text-center space-y-4 max-w-md">

     <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">

      <X className="w-8 h-8" />

     </div>

     <h2 className="text-lg font-medium text-stone-900">Profile Error</h2>

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

   className="mt-4 p-5 bg-stone-900 text-white rounded-2xl flex items-center gap-4 group/prompt shadow-sm cursor-pointer overflow-hidden relative"

   onClick={() => setIsEditing(true)}

  >

   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/prompt:scale-150 transition-transform">

    <Sparkles className="w-12 h-12" />

   </div>

   <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">

    <Sparkles className="w-5 h-5 text-amber-400" />

   </div>

   <div className="flex-1">

    <p className="text-xs font-medium text-stone-400 tracking-wide mb-0.5">Next Best Action</p>

    <p className="text-sm font-medium text-white">{text}</p>

   </div>

   <ArrowRight className="w-5 h-5 text-white/50 group-hover/prompt:translate-x-1 transition-transform" />

  </motion.div>

 );



 return (

  <div className="w-full mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">

   <button type="button" onClick={() => navigate(-1)} className="lg:hidden inline-flex items-center gap-1.5 min-h-11 text-sm font-medium text-stone-600">

    <ArrowLeft className="w-4 h-4" />

    Back

   </button>

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

    <div className="h-24 sm:h-32 bg-stone-900 rounded-xl overflow-hidden relative">

     {isOwnProfile && (

      <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all">

       <Edit3 className="w-5 h-5" />

      </button>

     )}

    </div>



    {/* Profile Info Card */}

    <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-100 p-4 sm:p-8 lg:p-10 -mt-10 sm:-mt-16 relative z-10">

     <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-start">

      <div className="relative">

       <img 

        src={`https://picsum.photos/seed/${profile.uid}/200/200`} 

        alt={currentUser?.displayName || 'User'} 

        className="w-20 h-20 sm:w-28 lg:w-36 rounded-2xl object-cover border-4 border-white shadow-sm"

        referrerPolicy="no-referrer"

       />

       <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-2 rounded-full border-4 border-white shadow-lg">

        <ShieldCheck className="w-5 h-5" />

       </div>

      </div>



      <div className="flex-1 space-y-4">

       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>

         <h1 className="text-lg font-medium text-stone-900 tracking-tight">

          {isOwnProfile ? (currentUser?.displayName || 'Founder') : (profile.fullName || 'Founder')}

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

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">

         {isOwnProfile ? (

          isEditing ? (

           <button 

            onClick={() => handleSave(editForm)}

            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-stone-900 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-stone-800 transition-all shadow-md"

           >

            <Check className="w-5 h-5" />

            Save Changes

           </button>

          ) : (

           <button 

            onClick={() => setIsEditing(true)}

            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-stone-900 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-stone-800 transition-all shadow-md"

           >

            <Edit3 className="w-5 h-5" />

            Edit Profile

           </button>

          )

         ) : (

          <>

           <button type="button" onClick={() => id && saveRequest({ id, fullName: profile?.fullName || 'Founder', role: profile?.role || 'FOUNDER', industry: profile?.industry || '', location: profile?.location || '', note: '', status: 'Pending' })} className="flex flex-1 sm:flex-none items-center justify-center gap-2 min-h-11 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-all">

            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />

            Connect

           </button>

           <button type="button" onClick={() => id && navigate(`/messages?user=${id}`)} className="min-h-11 min-w-11 inline-flex items-center justify-center bg-stone-50 text-stone-900 rounded-xl hover:bg-stone-100 transition-all border border-stone-100">

            <MessageSquare className="w-5 h-5" />

           </button>

           <button type="button" onClick={() => id && setFollowing(toggleId(listKeys.follow, id).includes(id))} className="min-h-11 min-w-11 inline-flex items-center justify-center bg-stone-50 text-stone-900 rounded-xl hover:bg-stone-100 transition-all border border-stone-100">

            <Star className={cn('w-5 h-5', following && 'fill-current')} />

           </button>

          </>

         )}

         <button type="button" onClick={() => { void navigator.clipboard?.writeText(window.location.href); }} className="min-h-11 min-w-11 inline-flex items-center justify-center bg-stone-50 text-stone-900 rounded-xl hover:bg-stone-100 transition-all border border-stone-100">

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



   <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">

    {/* Left Column */}

    <div className="lg:col-span-2 space-y-8">

     {/* About Section */}

     <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-4">

      <h3 className="text-sm font-semibold text-stone-900 tracking-wider">About Me</h3>

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

     <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-6">

      <div className="flex items-center justify-between">

       <h3 className="text-sm font-semibold text-stone-900 tracking-wider">Experience & Projects</h3>

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


     {/* Activity Feed */}
     <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
       <h3 className="text-sm font-semibold text-stone-900 tracking-wider flex items-center gap-2">
        <Activity className="w-4 h-4 text-stone-400" />
        Recent Activity
       </h3>
       <span className="text-xs text-stone-400 font-medium">Last 7 days</span>
      </div>
      <div className="space-y-1">
       {PROFILE_ACTIVITY.map((item, idx) => (
        <motion.div
         key={item.id}
         initial={{ opacity: 0, x: -10 }}
         animate={{ opacity: 1, x: 0 }}
         transition={{ delay: idx * 0.05 }}
         className="flex items-start gap-3 p-3 rounded-xl hover:bg-stone-50/80 transition-colors group"
        >
         <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border", item.bg, item.color, item.bg.replace('bg-', 'border-').replace('50', '100'))}>
          <item.icon className="w-4 h-4" />
         </div>
         <div className="flex-1 min-w-0">
          <p className="text-sm text-stone-700 leading-snug">{item.text}</p>
          <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
           <Clock className="w-3 h-3" />
           {item.time}
          </p>
         </div>
        </motion.div>
       ))}
      </div>
      <button className="w-full text-center text-xs font-medium text-stone-400 hover:text-stone-900 py-2 rounded-xl hover:bg-stone-50 transition-all">
       View all activity
      </button>
     </div>

    </div>



    {/* Right Column */}

    <div className="space-y-8">

     {/* Skills Section */}

     <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-6">

      <div className="flex items-center justify-between">

       <h3 className="text-sm font-semibold text-stone-900 tracking-wider">Skills & Endorsements</h3>

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

        const skillEndorsements = displayEndorsements.filter(e => e.skillId === skillName);

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



      {/* Recent Endorsements Feed — Enhanced */}

       <div className="pt-6 border-t border-stone-50 space-y-4">

        <div className="flex items-center justify-between">
         <h4 className="text-sm font-medium text-stone-400 tracking-wide flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          Recent Endorsements
         </h4>
         <span className="text-xs text-stone-400 font-medium bg-stone-50 px-2 py-0.5 rounded-lg border border-stone-100">
          {displayEndorsements.length} total
         </span>
        </div>

        <div className="space-y-3">

         {displayEndorsements.slice(0, 5).map((endorsement, idx) => (

          <motion.div
           key={endorsement.id}
           initial={{ opacity: 0, y: 8 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: idx * 0.06 }}
           className="flex gap-3 p-3.5 bg-stone-50/50 rounded-xl border border-stone-100 hover:bg-white hover:border-stone-200 hover:shadow-sm transition-all group"
          >

           <div className="w-10 h-10 rounded-xl bg-white border border-stone-100 overflow-hidden shrink-0 group-hover:border-stone-200 transition-colors">

            <img src={`https://picsum.photos/seed/${endorsement.endorserId}/100/100`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />

           </div>

           <div className="flex-1 min-w-0 space-y-1">

            <div className="flex items-center justify-between">
             <p className="text-sm text-stone-900">
              <span className="font-medium">Someone</span> endorsed for{' '}
              <span className="font-semibold text-stone-900 bg-amber-50 px-1.5 py-0.5 rounded-md text-xs border border-amber-100">{endorsement.skillId}</span>
             </p>
            </div>

            {endorsement.comment && (

             <p className="text-xs text-stone-500 italic leading-relaxed">"{endorsement.comment}"</p>

            )}

            <p className="text-[10px] text-stone-400 flex items-center gap-1">
             <Clock className="w-3 h-3" />
             {endorsement.createdAt ? new Date(endorsement.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
            </p>

           </div>

           <div className="shrink-0 flex items-start">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-100">
             <ThumbsUp className="w-3.5 h-3.5 text-amber-500" />
            </div>
           </div>

          </motion.div>

         ))}

        </div>

        {displayEndorsements.length > 5 && (
         <button className="w-full text-center text-xs font-medium text-stone-400 hover:text-stone-900 py-2 rounded-xl hover:bg-stone-50 transition-all">
          View all {displayEndorsements.length} endorsements
         </button>
        )}

       </div>

     </div>



     {/* Readiness Score Section */}

      <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-6">

       <div className="flex items-center justify-between">

        <h3 className="text-sm font-semibold text-stone-900 tracking-wider">Startup Readiness</h3>

        <TrendingUp className="w-5 h-5 text-stone-400" />

       </div>



       <div className="flex items-center gap-6">

        <div className="w-24 h-24 shrink-0">

         <ResponsiveContainer width="100%" height="100%">

          <PieChart>

           <Pie

            data={[

             { name: 'Score', value: displayReadiness.score },

             { name: 'Remaining', value: 100 - displayReadiness.score }

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

          <span className="text-xs font-medium text-stone-900">{displayReadiness.score}</span>

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

         { label: 'Artifacts', value: displayReadiness.dimensionScores.artifactCompleteness, color: 'blue' },

         { label: 'Team', value: displayReadiness.dimensionScores.teamCompleteness, color: 'green' },

         { label: 'Market', value: displayReadiness.dimensionScores.marketUnderstanding, color: 'amber' },

         { label: 'Product', value: displayReadiness.dimensionScores.solutionClarity, color: 'purple' },

        ].map((dim) => (

         <div key={dim.label} className="p-3 bg-stone-50 rounded-xl border border-stone-100">

          <div className="text-xs font-medium text-stone-400 tracking-wide mb-1">{dim.label}</div>

          <div className="text-sm font-medium text-stone-900">{dim.value}/100</div>

         </div>

        ))}

       </div>

      </div>



     {/* Social Links */}

     <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-6">

      <h3 className="text-sm font-semibold text-stone-900 tracking-wider">Connect</h3>

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



     {/* Profile Stats — Enhanced */}
     <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100 space-y-4">
      <h3 className="text-sm font-semibold text-stone-900 tracking-wider flex items-center gap-2">
       <TrendingUp className="w-4 h-4 text-stone-400" />
       Profile Analytics
      </h3>
      <div className="grid grid-cols-2 gap-3">
       {[
        { label: 'Views', value: '1.2k', delta: '+18%', up: true },
        { label: 'Matches', value: '48', delta: '+6', up: true },
        { label: 'Endorsements', value: String(displayEndorsements.length), delta: '+3', up: true },
        { label: 'Connections', value: '67', delta: '+9', up: true },
       ].map(stat => (
        <div key={stat.label} className="bg-white p-3.5 rounded-xl border border-stone-100 text-center space-y-1">
         <div className="text-lg font-semibold text-stone-900">{stat.value}</div>
         <div className="text-xs text-stone-500 font-medium tracking-wider">{stat.label}</div>
         <div className={cn("text-[10px] font-semibold", stat.up ? "text-emerald-600" : "text-red-500")}>
          {stat.delta} this week
         </div>
        </div>
       ))}
      </div>
      <div className="pt-2 border-t border-stone-200/60">
       <div className="flex items-center justify-between text-xs text-stone-400">
        <span>Profile rank</span>
        <span className="font-semibold text-stone-900">Top 15%</span>
       </div>
       <div className="w-full h-1.5 bg-stone-200 rounded-full mt-2 overflow-hidden">
        <motion.div
         initial={{ width: 0 }}
         animate={{ width: '85%' }}
         transition={{ duration: 1.5, ease: 'easeOut' }}
         className="h-full bg-stone-900 rounded-full"
        />
       </div>
      </div>
     </div>


     {/* Achievements / Badges */}
     <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
       <h3 className="text-sm font-semibold text-stone-900 tracking-wider flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-500" />
        Achievements
       </h3>
       <span className="text-xs text-stone-400 font-medium">
        {ACHIEVEMENTS.filter(a => a.earned).length}/{ACHIEVEMENTS.length} earned
       </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
       {ACHIEVEMENTS.map(badge => (
        <motion.div
         key={badge.id}
         whileHover={{ scale: badge.earned ? 1.05 : 1 }}
         className={cn(
          "relative flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all",
          badge.earned
           ? `${badge.bg} ${badge.border} shadow-sm`
           : "bg-stone-50/50 border-stone-100 opacity-40 grayscale"
         )}
        >
         <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", badge.earned ? badge.bg : "bg-stone-100")}>
          <badge.icon className={cn("w-4 h-4", badge.earned ? badge.color : "text-stone-400")} />
         </div>
         <div>
          <p className={cn("text-[11px] font-semibold leading-tight", badge.earned ? "text-stone-900" : "text-stone-400")}>{badge.name}</p>
          <p className="text-[9px] text-stone-400 mt-0.5 leading-tight">{badge.desc}</p>
         </div>
         {badge.earned && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
           <Check className="w-2.5 h-2.5 text-white" />
          </div>
         )}
        </motion.div>
       ))}
      </div>
     </div>


     {/* Open To / Availability */}
     {isOwnProfile && (
      <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-4">
       <h3 className="text-sm font-semibold text-stone-900 tracking-wider flex items-center gap-2">
        <Heart className="w-4 h-4 text-rose-400" />
        Open To
       </h3>
       <div className="space-y-2">
        {[
         { label: 'Co-founder matching', active: true },
         { label: 'Mentorship sessions', active: true },
         { label: 'Advisory roles', active: false },
         { label: 'Investment opportunities', active: false },
         { label: 'Speaking invitations', active: true },
        ].map(item => (
         <div key={item.label} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-50 transition-colors">
          <span className="text-sm text-stone-700">{item.label}</span>
          <div className={cn(
           "w-8 h-5 rounded-full flex items-center transition-all cursor-pointer",
           item.active ? "bg-emerald-500 justify-end" : "bg-stone-200 justify-start"
          )}>
           <div className="w-3.5 h-3.5 bg-white rounded-full mx-0.5 shadow-sm" />
          </div>
         </div>
        ))}
       </div>
       <p className="text-[10px] text-stone-400 pt-1 border-t border-stone-100">
        These preferences are visible to other users and affect your match suggestions.
       </p>
      </div>
     )}


     {/* AI Match Insight */}
      <div className="bg-stone-900 p-5 rounded-xl space-y-4">
       <div>
        <div className="flex items-center gap-3 mb-3">
         <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
          <Sparkles className="w-4 h-4 text-amber-400" />
         </div>
         <div>
          <h3 className="text-sm font-semibold text-white tracking-wider">{isOwnProfile ? 'AI Profile Insight' : 'AI Match Analysis'}</h3>
          <p className="text-[10px] text-stone-500">Powered by CoFounderBay AI</p>
         </div>
        </div>
        <div className="space-y-3">
         <div className="flex items-center justify-between text-xs">
          <span className="text-stone-400">{isOwnProfile ? 'Profile strength' : 'Overall compatibility'}</span>
          <span className="text-white font-semibold">84%</span>
         </div>
         <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
           initial={{ width: 0 }}
           animate={{ width: '84%' }}
           transition={{ duration: 1.5 }}
           className="h-full bg-white rounded-full"
          />
         </div>
         <div className="grid grid-cols-3 gap-2 pt-2">
          {[
           { label: 'Skills', pct: 92 },
           { label: 'Values', pct: 78 },
           { label: 'Goals', pct: 81 },
          ].map(d => (
           <div key={d.label} className="text-center p-2 bg-white/5 rounded-lg border border-white/5">
            <p className="text-white font-semibold text-sm">{d.pct}%</p>
            <p className="text-[10px] text-stone-500">{d.label}</p>
           </div>
          ))}
         </div>
         <p className="text-xs text-stone-400 leading-relaxed italic pt-1">
          {isOwnProfile
           ? '"Strong technical profile with excellent product thinking. Consider adding more market validation artifacts to boost your readiness score."'
           : '"Complementary skill sets in product management and engineering. Strong alignment on mission-driven ventures and startup pace."'
          }
         </p>
        </div>
       </div>
      </div>


     {/* Connections / Mutual Connections */}
      <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-4">
       <h3 className="text-sm font-semibold text-stone-900 tracking-wider flex items-center gap-2">
        <Handshake className="w-4 h-4 text-stone-400" />
        {isOwnProfile ? 'Top Connections' : 'Mutual Connections'}
       </h3>
       <div className="space-y-2">
        {MUTUAL_CONNECTIONS.map(conn => (
         <div key={conn.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer group">
          <img
           src={`https://picsum.photos/seed/${conn.id}/80/80`}
           alt={conn.name}
           className="w-10 h-10 rounded-xl object-cover border border-stone-100"
           referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0">
           <p className="text-sm font-medium text-stone-900 group-hover:text-stone-700 truncate">{conn.name}</p>
           <p className="text-xs text-stone-400 truncate">{conn.headline}</p>
          </div>
          <span className="text-[10px] text-stone-400 font-medium bg-stone-50 px-2 py-1 rounded-lg border border-stone-100 shrink-0">
           {conn.mutual} mutual
          </span>
         </div>
        ))}
       </div>
      </div>


     {/* People Also Viewed */}
     <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-stone-900 tracking-wider flex items-center gap-2">
       <Eye className="w-4 h-4 text-stone-400" />
       People Also Viewed
      </h3>
      <div className="space-y-2">
       {ALSO_VIEWED.map(person => (
        <div key={person.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer group">
         <img
          src={`https://picsum.photos/seed/${person.id}/80/80`}
          alt={person.name}
          className="w-10 h-10 rounded-xl object-cover border border-stone-100"
          referrerPolicy="no-referrer"
         />
         <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-900 group-hover:text-stone-700 truncate">{person.name}</p>
          <p className="text-xs text-stone-400 truncate">{person.headline}</p>
         </div>
         <div className="flex items-center gap-1 shrink-0">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="text-xs font-semibold text-stone-700">{person.matchScore}%</span>
         </div>
        </div>
       ))}
      </div>
      <button className="w-full text-center text-xs font-medium text-stone-400 hover:text-stone-900 py-2 rounded-xl hover:bg-stone-50 transition-all">
       View more suggestions
      </button>
     </div>

    </div>

   </div>

  </div>

 );

}

