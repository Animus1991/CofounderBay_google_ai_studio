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
import { useT } from '../lib/language';
import { labelOf } from '../lib/labels';
import { formatDate } from '../lib/dates';
import { listKeys, readIds, saveRequest, toggleId } from '../lib/localLists';
import { lookupPerson } from '../lib/people';
import { useAuth } from '../App';
import { avatarFor, findCast } from '../data/cast';
import FactLine from '../components/ui/FactLine';
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
 { id: 'a1', type: 'endorsement', text: 'Received endorsement for Machine Learning', textEl: 'Νέα σύσταση για Machine Learning', time: '2h ago', timeEl: 'πριν από 2 ώρες', icon: Award, color: 'text-amber-500', bg: 'bg-amber-50' },
 { id: 'a2', type: 'connection', text: 'Connected with Elena Rodriguez', textEl: 'Σύνδεση με Elena Rodriguez', time: '5h ago', timeEl: 'πριν από 5 ώρες', icon: Handshake, color: 'text-emerald-500', bg: 'bg-emerald-50' },
 { id: 'a3', type: 'milestone', text: 'Reached 50+ connections milestone', textEl: 'Ορόσημο: 50+ συνδέσεις', time: '1d ago', timeEl: 'πριν από 1 ημέρα', icon: Trophy, color: 'text-purple-500', bg: 'bg-purple-50' },
 { id: 'a4', type: 'project', text: 'Updated venture "TechFlow AI"', textEl: 'Ενημέρωση εγχειρήματος «TechFlow AI»', time: '2d ago', timeEl: 'πριν από 2 ημέρες', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-50' },
 { id: 'a5', type: 'skill', text: 'Added React & TypeScript skills', textEl: 'Προσθήκη δεξιοτήτων React και TypeScript', time: '3d ago', timeEl: 'πριν από 3 ημέρες', icon: Zap, color: 'text-violet-500', bg: 'bg-violet-50' },
 { id: 'a6', type: 'view', text: 'Profile viewed 38 times this week', textEl: '38 προβολές προφίλ αυτή την εβδομάδα', time: '4d ago', timeEl: 'πριν από 4 ημέρες', icon: Eye, color: 'text-stone-500', bg: 'bg-stone-50' },
];
// ── Achievements / Badges ────────────────────────────────────────────────────
const ACHIEVEMENTS = [
 { id: 'b1', name: 'Early Adopter', nameEl: 'Μέλος από την αρχή', desc: 'Joined in the first 1,000 users', descEl: 'Ένα από τα πρώτα 1.000 μέλη', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100', earned: true },
 { id: 'b2', name: 'Connector', nameEl: 'Συνδετικός κρίκος', desc: '25+ accepted connections', descEl: '25+ αποδεκτές συνδέσεις', icon: Handshake, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', earned: true },
 { id: 'b3', name: 'Thought Leader', nameEl: 'Σημείο αναφοράς', desc: '10+ endorsements received', descEl: '10+ συστάσεις από άλλα μέλη', icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', earned: true },
 { id: 'b4', name: 'Mentor Star', nameEl: 'Αστέρι καθοδήγησης', desc: 'Complete 5 mentoring sessions', descEl: 'Ολοκλήρωσε 5 συνεδρίες καθοδήγησης', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', earned: false },
 { id: 'b5', name: 'Pitch Pro', nameEl: 'Νικητήριο pitch', desc: 'Win a pitch competition', descEl: 'Κέρδισε έναν διαγωνισμό pitch', icon: Trophy, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100', earned: false },
 { id: 'b6', name: 'Full Profile', nameEl: 'Πλήρες προφίλ', desc: '100% profile completion', descEl: 'Προφίλ ολοκληρωμένο 100%', icon: CheckCircle2, color: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-100', earned: false },
];
// ── Mutual connections / People also viewed ──────────────────────────────────
const MUTUAL_CONNECTIONS = [
 { id: 'sarah-chen', name: 'Sarah Chen', headline: 'Product lead building cash-flow tools for freelancers', mutual: 4 },
 { id: 'marcus-thorne', name: 'Marcus Thorne', headline: 'Growth operator, ex-HubSpot', mutual: 3 },
 { id: 'jordan-taylor', name: 'Jordan Taylor', headline: 'Growth marketer, ex-Stripe', mutual: 2 },
];
const ALSO_VIEWED = [
 { id: 'elena-rodriguez', name: 'Elena Rodriguez', headline: 'Product designer with a climate focus', matchScore: 87 },
 { id: 'priya-sharma', name: 'Priya Sharma', headline: 'ML engineer turned founder', matchScore: 82 },
 { id: 'emma-kim', name: 'Emma Kim', headline: 'Data scientist working on clinical triage', matchScore: 79 },
];
// ── Mock endorsements fallback (used when Firestore returns empty) ───────────
const MOCK_ENDORSEMENTS: Endorsement[] = [
 { id: 'me1', endorserId: 'sarah-chen', skillId: 'Machine Learning', comment: 'Exceptional understanding of ML pipelines and model deployment.', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
 { id: 'me2', endorserId: 'alex-rivera', skillId: 'Product Strategy', comment: 'Brilliant product thinking. Always sees the bigger picture.', createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
 { id: 'me3', endorserId: 'elena-rodriguez', skillId: 'React', comment: 'Clean, maintainable components every time.', createdAt: new Date(Date.now() - 8 * 86400000).toISOString() },
 { id: 'me4', endorserId: 'marcus-thorne', skillId: 'Growth Hacking', comment: 'Data-driven growth strategies that actually work.', createdAt: new Date(Date.now() - 12 * 86400000).toISOString() },
 { id: 'me5', endorserId: 'jordan-taylor', skillId: 'Node.js', comment: 'Strong backend architecture skills.', createdAt: new Date(Date.now() - 15 * 86400000).toISOString() },
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
const AVAILABILITY_EL: Record<string, string> = {
 Immediate: 'Άμεσα',
 '1 week notice': 'Σε 1 εβδομάδα',
 '2 weeks notice': 'Σε 2 εβδομάδες',
 '1 month notice': 'Σε 1 μήνα',
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
  stage: person?.stage || '',
  role: person?.role || 'Founder',
  commitment: person?.commitment || '',
  industry: person?.industry || '',
  skills: person?.skills || [],
  lookingFor: person?.lookingFor || [],
  interests: person?.industry ? [person.industry] : [],
 } as UserProfile;
}
export default function ProfilePage() {
 const t = useT();
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
 const [showMatchNote, setShowMatchNote] = useState(false);

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
     <h2 className="text-lg font-medium text-stone-900">{t('Profile Error', 'Σφάλμα προφίλ')}</h2>
     <p className="text-stone-500">{error || t('Profile not found', 'Το προφίλ δεν βρέθηκε')}</p>
     <button 
      onClick={() => navigate('/dashboard')}
      className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all"
     >
      {t('Back to Dashboard', 'Επιστροφή στον πίνακα')}
     </button>
    </div>
   </div>
  );
 }

 const matchGaps = [
  { ok: !!(profile.skills && profile.skills.length), key: t('Skills', 'Δεξιότητες'), why: t('The scorer uses skills to see what you cover.', 'Η βαθμολόγηση χρησιμοποιεί τις δεξιότητες για να δει τι καλύπτεις.') },
  { ok: !!(profile.lookingFor && profile.lookingFor.length), key: t('Looking for', 'Τι αναζητάς'), why: t('Matches rank people who cover what you still lack.', 'Οι αντιστοιχίσεις κατατάσσουν ψηλότερα τα άτομα που καλύπτουν ό,τι σου λείπει ακόμη.') },
  { ok: !!profile.industry, key: t('Industry', 'Κλάδος'), why: t('Same industry is a market dimension.', 'Ο ίδιος κλάδος μετράει ως διάσταση αγοράς.') },
  { ok: !!profile.stage, key: t('Stage', 'Στάδιο'), why: t('Stage distance is 15% of the match score.', 'Η απόσταση σταδίου είναι το 15% του σκορ αντιστοίχισης.') },
  { ok: !!profile.commitment, key: t('Commitment', 'Δέσμευση'), why: t('Full-time vs part-time is scored, not guessed.', 'Η πλήρης ή μερική απασχόληση βαθμολογείται, δεν μαντεύεται.') },
  { ok: !!profile.location, key: t('Location', 'Τοποθεσία'), why: t('Working hours come from city and time zone.', 'Οι ώρες εργασίας προκύπτουν από την πόλη και τη ζώνη ώρας.') },
 ].filter((item) => !item.ok);
 const showMatchStatus = isOwnProfile && (matchGaps.length > 0 || (profile.profileCompletionScore ?? 100) < 80);
 const matchNote = matchGaps.length
  ? matchGaps.slice(0, 3).map((item) => `${item.key}: ${item.why}`).join(' ')
  : t('Skills, looking-for, industry, stage and commitment are filled — the same fields Matches scores.', 'Τα πεδία δεξιότητες, τι αναζητάς, κλάδος, στάδιο και δέσμευση είναι συμπληρωμένα — τα ίδια που βαθμολογούν οι αντιστοιχίσεις.');

 return (
  <div className="w-full px-2 sm:px-6 lg:px-8 pb-24 pt-4 sm:pt-8 space-y-6">
   <button type="button" onClick={() => navigate(-1)} className="lg:hidden inline-flex items-center gap-1.5 min-h-11 text-sm font-medium text-stone-600">
    <ArrowLeft className="w-4 h-4" />
    {t('Back', 'Πίσω')}
   </button>
   {/* Profile Header */}
   <div className="relative lg:pr-36">
    <div className="h-24 sm:h-32 bg-stone-900 rounded-xl overflow-hidden relative" />

    {/* Profile Info Card */}
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-100 p-4 sm:p-8 lg:p-10 -mt-10 sm:-mt-16 relative z-10">
     <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-start">
      <div className="relative">
       <img 
        src={currentUser?.photoURL || avatarFor(profile.uid, 200)} 
        alt={isOwnProfile ? (currentUser?.displayName || t('User', 'Μέλος')) : labelOf(profile.fullName || 'Founder')} 
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
          {isOwnProfile ? (currentUser?.displayName || t('Founder', 'Ιδρυτής')) : labelOf(profile.fullName || 'Founder')}
         </h1>
         {isEditing ? (
          <input 
           type="text" 
           value={editForm.headline || ''}
           onChange={(e) => setEditForm(prev => ({ ...prev, headline: e.target.value }))}
           className="w-full px-4 py-2 mt-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-base"
           placeholder={t('Headline', 'Τίτλος')}
          />
         ) : (
          <p className="text-lg font-medium text-stone-500 mt-1">{labelOf(profile.headline)}</p>
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
            {t('Save Changes', 'Αποθήκευση αλλαγών')}
           </button>
          ) : (
           <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-stone-900 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-stone-800 transition-all shadow-md"
           >
            <Edit3 className="w-5 h-5" />
            {t('Edit Profile', 'Επεξεργασία προφίλ')}
           </button>
          )
         ) : (
          <>
           <button type="button" onClick={() => id && saveRequest({ id, fullName: profile?.fullName || 'Founder', role: profile?.role || 'FOUNDER', industry: profile?.industry || '', location: profile?.location || '', note: '', status: 'Pending' })} className="flex flex-1 sm:flex-none items-center justify-center gap-2 min-h-11 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-all">
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            {t('Connect', 'Σύνδεση')}
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

       <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-stone-500">
        {isEditing ? (
         <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4" />
          <input 
           type="text" 
           value={editForm.location || ''}
           onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
           className="px-3 py-1 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900"
           placeholder={t('Location', 'Τοποθεσία')}
          />
         </div>
        ) : (
         <FactLine
          className="text-sm text-stone-500"
          items={[
           profile.location || t('Remote', 'Εξ αποστάσεως'),
           labelOf(profile.stage),
           labelOf(profile.commitment),
           profile.availability ? t(profile.availability, AVAILABILITY_EL[profile.availability] ?? profile.availability) : '',
          ]}
          label={t('Profile facts', 'Στοιχεία προφίλ')}
         />
        )}
        <div className="flex items-center gap-1.5">
         <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
         {t('80% Match Score', 'Σκορ αντιστοίχισης 80%')}
        </div>
        {showMatchStatus && (
         <div
          className="relative"
          onMouseEnter={() => setShowMatchNote(true)}
          onMouseLeave={() => setShowMatchNote(false)}
          onFocus={() => setShowMatchNote(true)}
          onBlur={(event) => {
           if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setShowMatchNote(false);
          }}
         >
          <span tabIndex={0} className="cursor-default underline decoration-stone-300 underline-offset-4" aria-describedby="match-fields-note">
           {t(`${profile.profileCompletionScore ?? 0}% complete`, `${profile.profileCompletionScore ?? 0}% ολοκληρωμένο`)}
          </span>
          <div
           id="match-fields-note"
           role="tooltip"
           className={cn(
            'absolute left-0 top-full z-30 w-[min(22rem,calc(100vw-1.5rem))] pt-1 text-left font-normal',
            showMatchNote ? 'visible' : 'invisible',
           )}
          >
           <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
            <p className="text-sm leading-relaxed text-stone-500">
             <span className="font-medium text-stone-700">{t(`Matching reads these fields (${profile.profileCompletionScore ?? 0}% complete).`, `Η αντιστοίχιση βασίζεται σε αυτά τα πεδία (ολοκλήρωση ${profile.profileCompletionScore ?? 0}%).`)}</span>{' '}
             {matchNote}
            </p>
            <button
             type="button"
             className="mt-1 min-h-11 text-sm text-stone-500 hover:text-stone-800"
             onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'What does my founding team still lack?' } }))}
            >
             {t('Ask what the team still lacks', 'Ρώτα τι λείπει ακόμη από την ομάδα')}
            </button>
           </div>
          </div>
         </div>
        )}
       </div>
      </div>
     </div>
    </div>
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 items-start">
    {/* Story: identity */}
    <div className="min-w-0 space-y-6">
     {/* About Section */}
     <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-stone-900 tracking-wider">{t('About Me', 'Σχετικά με μένα')}</h3>
      {isEditing ? (
       <div className="space-y-4">
        <textarea 
         value={editForm.bio || ''}
         onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
         rows={4}
         className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900 text-base"
         placeholder={t('Tell us about yourself...', 'Πες μας για σένα…')}
        />
        <p className="text-xs text-stone-500 mt-2">{t('Add more details about your professional experience and values highly increases match accuracy.', 'Περισσότερες λεπτομέρειες για την επαγγελματική σου εμπειρία και τις αξίες σου αυξάνουν πολύ την ακρίβεια της αντιστοίχισης.')}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-stone-100">
         <div>
          <label className="block text-sm font-medium text-stone-500 mb-1">{t('LinkedIn URL', 'Σύνδεσμος LinkedIn')}</label>
          <input 
           type="url" 
           value={editForm.linkedinUrl || ''}
           onChange={(e) => setEditForm(prev => ({ ...prev, linkedinUrl: e.target.value }))}
           className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900"
           placeholder="https://linkedin.com/in/..."
          />
         </div>
         <div>
          <label className="block text-sm font-medium text-stone-500 mb-1">{t('GitHub URL', 'Σύνδεσμος GitHub')}</label>
          <input 
           type="url" 
           value={editForm.githubUrl || ''}
           onChange={(e) => setEditForm(prev => ({ ...prev, githubUrl: e.target.value }))}
           className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900"
           placeholder="https://github.com/..."
          />
         </div>
         <div>
          <label className="block text-sm font-medium text-stone-500 mb-1">{t('Portfolio URL', 'Σύνδεσμος portfolio')}</label>
          <input 
           type="url" 
           value={editForm.portfolioUrl || ''}
           onChange={(e) => setEditForm(prev => ({ ...prev, portfolioUrl: e.target.value }))}
           className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900"
           placeholder="https://yourportfolio.com"
          />
         </div>
         <div>
          <label className="block text-sm font-medium text-stone-500 mb-1">{t('Availability', 'Διαθεσιμότητα')}</label>
          <select
           value={editForm.availability || 'Immediate'}
           onChange={(e) => setEditForm(prev => ({ ...prev, availability: e.target.value }))}
           className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900 cursor-pointer"
          >
           <option value="Immediate">{t('Immediate', AVAILABILITY_EL['Immediate'])}</option>
           <option value="1 week notice">{t('1 week notice', AVAILABILITY_EL['1 week notice'])}</option>
           <option value="2 weeks notice">{t('2 weeks notice', AVAILABILITY_EL['2 weeks notice'])}</option>
           <option value="1 month notice">{t('1 month notice', AVAILABILITY_EL['1 month notice'])}</option>
          </select>
         </div>
        </div>
       </div>
      ) : (
       <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">
        {profile.bio || t('No bio provided yet.', 'Δεν έχει προστεθεί ακόμη βιογραφικό.')}
       </p>
      )}
     </div>

     {/* Experience / Projects */}
     <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-6">
      <h3 className="text-sm font-semibold text-stone-900 tracking-wider">{t('Experience & Projects', 'Εμπειρία και έργα')}</h3>
      <div className="space-y-8">
       {[
        { title: 'Founder & CEO', company: 'TechFlow AI', period: '2021 - Present', periodEl: '2021 - Σήμερα', desc: 'Building the future of automated logistics using computer vision.' },
        { title: 'Senior Product Manager', company: 'Google', period: '2018 - 2021', periodEl: '2018 - 2021', desc: 'Led the development of core search features for mobile users.' },
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
           <span>{t(exp.period, exp.periodEl)}</span>
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
        {t('Recent Activity', 'Πρόσφατη δραστηριότητα')}
       </h3>
       <span className="text-xs text-stone-400 font-medium">{t('Last 7 days', 'Τελευταίες 7 ημέρες')}</span>
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
          <p className="text-sm text-stone-700 leading-snug">{t(item.text, item.textEl)}</p>
          <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
           <Clock className="w-3 h-3" />
           {t(item.time, item.timeEl)}
          </p>
         </div>
        </motion.div>
       ))}
      </div>
     </div>
    </div>

    {/* Proof: skills and availability */}
    <div className="min-w-0 space-y-6">
{/* Skills Section */}
     <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-6">
      <h3 className="text-sm font-semibold text-stone-900 tracking-wider">{t('Skills & Endorsements', 'Δεξιότητες και συστάσεις')}</h3>

      <div className="flex flex-wrap gap-2">
       {Array.isArray(profile.skills) && profile.skills.length === 0 && (
        <p className="text-sm text-stone-500">{t('No skills yet.', 'Δεν υπάρχουν ακόμη δεξιότητες.')}</p>
       )}
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
            <div className="flex items-center gap-0.5 mt-0.5" title={t(`Proficiency: ${skillProficiency}/5`, `Επίπεδο: ${skillProficiency}/5`)}>
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
            title={hasEndorsed ? t("Endorsed", "Έκανες σύσταση") : t("Endorse skill", "Σύσταση δεξιότητας")}
           >
            {hasEndorsed ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
           </button>
          )}
         </div>
        );
       })}
      </div>


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
          <h4 className="font-medium text-stone-900">{t('Endorse for', 'Σύσταση για')} {selectedSkillForEndorsement}</h4>
          <button onClick={() => setSelectedSkillForEndorsement('')} className="text-stone-400 hover:text-stone-900">
           <X className="w-5 h-5" />
          </button>
         </div>
         <textarea 
          placeholder={t('Add a brief comment (optional)...', 'Πρόσθεσε ένα σύντομο σχόλιο (προαιρετικά)…')}
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
          {isEndorsing ? t('Endorsing...', 'Αποστολή…') : t('Confirm Endorsement', 'Επιβεβαίωση σύστασης')}
         </Button>
        </motion.div>
       )}
      </AnimatePresence>

      {/* Recent Endorsements Feed — Enhanced */}
       <div className="pt-6 border-t border-stone-50 space-y-4">
        <div className="flex items-center justify-between">
         <h4 className="text-sm font-medium text-stone-400 tracking-wide flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          {t('Recent Endorsements', 'Πρόσφατες συστάσεις')}
         </h4>
         <span className="text-xs text-stone-400 font-medium bg-stone-50 px-2 py-0.5 rounded-lg border border-stone-100">
          {displayEndorsements.length} {t('total', 'συνολικά')}
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
            <img src={avatarFor(endorsement.endorserId)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
           </div>
           <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between">
             <p className="text-sm text-stone-900">
              <span className="font-medium">{findCast(endorsement.endorserId)?.fullName || t('Someone', 'Κάποιο μέλος')}</span> {t('endorsed for', 'έκανε σύσταση για')}{' '}
              <span className="font-semibold text-stone-900 bg-amber-50 px-1.5 py-0.5 rounded-md text-xs border border-amber-100">{endorsement.skillId}</span>
             </p>
            </div>
            {endorsement.comment && (
             <p className="text-xs text-stone-500 italic leading-relaxed">"{endorsement.comment}"</p>
            )}
            <p className="text-[10px] text-stone-400 flex items-center gap-1">
             <Clock className="w-3 h-3" />
             {endorsement.createdAt ? formatDate(endorsement.createdAt) : t('Recently', 'Πρόσφατα')}
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
       </div>
     </div>
{/* Achievements / Badges */}
     <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
       <h3 className="text-sm font-semibold text-stone-900 tracking-wider flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-500" />
        {t('Achievements', 'Επιτεύγματα')}
       </h3>
       <span className="text-xs text-stone-400 font-medium">
        {ACHIEVEMENTS.filter(a => a.earned).length}/{ACHIEVEMENTS.length} {t('earned', 'κερδισμένα')}
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
          <p className={cn("text-[11px] font-semibold leading-tight", badge.earned ? "text-stone-900" : "text-stone-400")}>{t(badge.name, badge.nameEl)}</p>
          <p className="text-[9px] text-stone-400 mt-0.5 leading-tight">{t(badge.desc, badge.descEl)}</p>
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
        {t('Open To', 'Ενδιαφέρομαι για')}
       </h3>
       <div className="space-y-2">
        {[
         { label: 'Co-founder matching', labelEl: 'Αντιστοίχιση συνιδρυτών', active: true },
         { label: 'Mentorship sessions', labelEl: 'Συνεδρίες καθοδήγησης', active: true },
         { label: 'Advisory roles', labelEl: 'Συμβουλευτικοί ρόλοι', active: false },
         { label: 'Investment opportunities', labelEl: 'Επενδυτικές ευκαιρίες', active: false },
         { label: 'Speaking invitations', labelEl: 'Προσκλήσεις για ομιλίες', active: true },
        ].map(item => (
         <div key={item.label} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-50 transition-colors">
          <span className="text-sm text-stone-700">{t(item.label, item.labelEl)}</span>
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
        {t('These preferences are visible to other users and affect your match suggestions.', 'Αυτές οι προτιμήσεις φαίνονται σε άλλα μέλη και επηρεάζουν τις προτάσεις αντιστοίχισης.')}
       </p>
      </div>
     )}
{/* Social Links */}
     <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-6">
      <h3 className="text-sm font-semibold text-stone-900 tracking-wider">{t('Connect', 'Σύνδεση')}</h3>
      <div className="space-y-4">
       {profile.linkedinUrl && (
        <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all font-medium">
         <Linkedin className="w-5 h-5" />
         {t('LinkedIn Profile', 'Προφίλ LinkedIn')}
        </a>
       )}
       {profile.githubUrl && (
        <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all font-medium">
         <Github className="w-5 h-5" />
         {t('GitHub Portfolio', 'Προφίλ GitHub')}
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
         {t('Personal Website', 'Προσωπικός ιστότοπος')}
        </a>
       )}
       {!profile.linkedinUrl && !profile.githubUrl && !profile.twitterUrl && !profile.portfolioUrl && (
        <p className="text-stone-500 text-sm">{t('No social links added yet.', 'Δεν έχουν προστεθεί ακόμη σύνδεσμοι κοινωνικών δικτύων.')}</p>
       )}
      </div>
     </div>
    </div>

    {/* Signals: AI, readiness, network */}
    <div className="min-w-0 space-y-6 lg:col-span-2 xl:col-span-1">
     <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4 sm:gap-6">
{/* AI Match Insight */}
      <div className="bg-stone-900 p-5 rounded-xl space-y-4">
       <div>
        <div className="flex items-center gap-3 mb-3">
         <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
          <Sparkles className="w-4 h-4 text-amber-400" />
         </div>
         <div>
          <h3 className="text-sm font-semibold text-white tracking-wider">{isOwnProfile ? t('AI Profile Insight', 'Ανάλυση προφίλ με AI') : t('AI Match Analysis', 'Ανάλυση αντιστοίχισης με AI')}</h3>
          <p className="text-[10px] text-stone-500">{t('Powered by CoFounderBay AI', 'Με την υποστήριξη του CoFounderBay AI')}</p>
         </div>
        </div>
        <div className="space-y-3">
         <div className="flex items-center justify-between text-xs">
          <span className="text-stone-400">{isOwnProfile ? t('Profile strength', 'Δύναμη προφίλ') : t('Overall compatibility', 'Συνολική συμβατότητα')}</span>
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
           { label: 'Skills', labelEl: 'Δεξιότητες', pct: 92 },
           { label: 'Values', labelEl: 'Αξίες', pct: 78 },
           { label: 'Goals', labelEl: 'Στόχοι', pct: 81 },
          ].map(d => (
           <div key={d.label} className="text-center p-2 bg-white/5 rounded-lg border border-white/5">
            <p className="text-white font-semibold text-sm">{d.pct}%</p>
            <p className="text-[10px] text-stone-500">{t(d.label, d.labelEl)}</p>
           </div>
          ))}
         </div>
         <p className="text-xs text-stone-400 leading-relaxed italic pt-1">
          {isOwnProfile
           ? t('"Strong technical profile with excellent product thinking. Consider adding more market validation artifacts to boost your readiness score."', '«Ισχυρό τεχνικό προφίλ με εξαιρετική σκέψη προϊόντος. Πρόσθεσε περισσότερα στοιχεία επικύρωσης αγοράς για να ανεβάσεις το readiness score σου.»')
           : t('"Complementary skill sets in product management and engineering. Strong alignment on mission-driven ventures and startup pace."', '«Συμπληρωματικές δεξιότητες σε διαχείριση προϊόντος και μηχανική. Ισχυρή ευθυγράμμιση σε εγχειρήματα με αποστολή και σε ρυθμό startup.»')
          }
         </p>
        </div>
       </div>
      </div>
{/* Readiness Score Section */}
      <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-6">
       <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-900 tracking-wider">{t('Startup Readiness', 'Ετοιμότητα startup')}</h3>
        <TrendingUp className="w-5 h-5 text-stone-400" />
       </div>

       <div className="flex items-center gap-6">
        <div className="relative w-24 h-24 shrink-0">
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
         <p className="text-sm font-medium text-stone-900">{t('Ecosystem Standing', 'Θέση στο οικοσύστημα')}</p>
         <p className="text-xs text-stone-500 leading-relaxed">
          {t('Based on your artifacts, team momentum, and mentor feedback loops.', 'Με βάση το υλικό σου, τη δυναμική της ομάδας και την ανατροφοδότηση από μέντορες.')}
         </p>
        </div>
       </div>

       <div className="grid grid-cols-2 gap-3">
        {[
         { label: 'Artifacts', labelEl: 'Υλικό', value: displayReadiness.dimensionScores.artifactCompleteness, color: 'blue' },
         { label: 'Team', labelEl: 'Ομάδα', value: displayReadiness.dimensionScores.teamCompleteness, color: 'green' },
         { label: 'Market', labelEl: 'Αγορά', value: displayReadiness.dimensionScores.marketUnderstanding, color: 'amber' },
         { label: 'Product', labelEl: 'Προϊόν', value: displayReadiness.dimensionScores.solutionClarity, color: 'purple' },
        ].map((dim) => (
         <div key={dim.label} className="p-3 bg-stone-50 rounded-xl border border-stone-100">
          <div className="text-xs font-medium text-stone-400 tracking-wide mb-1">{t(dim.label, dim.labelEl)}</div>
          <div className="text-sm font-medium text-stone-900">{dim.value}/100</div>
         </div>
        ))}
       </div>
      </div>
{/* Profile Stats — Enhanced */}
     <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100 space-y-4">
      <h3 className="text-sm font-semibold text-stone-900 tracking-wider flex items-center gap-2">
       <TrendingUp className="w-4 h-4 text-stone-400" />
       {t('Profile Analytics', 'Στατιστικά προφίλ')}
      </h3>
      <div className="grid grid-cols-2 gap-3">
       {[
        { label: 'Views', labelEl: 'Προβολές', value: '1.2k', delta: '+18%', up: true },
        { label: 'Matches', labelEl: 'Αντιστοιχίσεις', value: '48', delta: '+6', up: true },
        { label: 'Endorsements', labelEl: 'Συστάσεις', value: String(displayEndorsements.length), delta: '+3', up: true },
        { label: 'Connections', labelEl: 'Συνδέσεις', value: '67', delta: '+9', up: true },
       ].map(stat => (
        <div key={stat.label} className="bg-white p-3.5 rounded-xl border border-stone-100 text-center space-y-1">
         <div className="text-lg font-semibold text-stone-900">{stat.value}</div>
         <div className="text-xs text-stone-500 font-medium tracking-wider">{t(stat.label, stat.labelEl)}</div>
         <div className={cn("text-[10px] font-semibold", stat.up ? "text-emerald-600" : "text-red-500")}>
          {stat.delta} {t('this week', 'αυτή την εβδομάδα')}
         </div>
        </div>
       ))}
      </div>
      <div className="pt-2 border-t border-stone-200/60">
       <div className="flex items-center justify-between text-xs text-stone-400">
        <span>{t('Profile rank', 'Κατάταξη προφίλ')}</span>
        <span className="font-semibold text-stone-900">{t('Top 15%', 'Στο κορυφαίο 15%')}</span>
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
{/* Connections / Mutual Connections */}
      <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-4">
       <h3 className="text-sm font-semibold text-stone-900 tracking-wider flex items-center gap-2">
        <Handshake className="w-4 h-4 text-stone-400" />
        {isOwnProfile ? t('Top Connections', 'Κορυφαίες συνδέσεις') : t('Mutual Connections', 'Κοινές συνδέσεις')}
       </h3>
       <div className="space-y-2">
        {MUTUAL_CONNECTIONS.map(conn => (
         <div key={conn.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer group">
          <img
           src={avatarFor(conn.id, 80)}
           alt={conn.name}
           className="w-10 h-10 rounded-xl object-cover border border-stone-100"
           referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0">
           <p className="text-sm font-medium text-stone-900 group-hover:text-stone-700 truncate">{conn.name}</p>
           <p className="text-xs text-stone-400 truncate">{conn.headline}</p>
          </div>
          <span className="text-[10px] text-stone-400 font-medium bg-stone-50 px-2 py-1 rounded-lg border border-stone-100 shrink-0">
           {conn.mutual} {t('mutual', 'κοινές')}
          </span>
         </div>
        ))}
       </div>
      </div>
{/* People Also Viewed */}
     <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-stone-900 tracking-wider flex items-center gap-2">
       <Eye className="w-4 h-4 text-stone-400" />
       {t('People Also Viewed', 'Τα μέλη είδαν επίσης')}
      </h3>
      <div className="space-y-2">
       {ALSO_VIEWED.map(person => (
        <div key={person.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer group">
         <img
          src={avatarFor(person.id, 80)}
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
      <button type="button" onClick={() => navigate('/matches')} className="w-full text-center text-xs font-medium text-stone-400 hover:text-stone-900 py-2 rounded-xl hover:bg-stone-50 transition-all">
       {t('View more suggestions', 'Περισσότερες προτάσεις')}
      </button>
     </div>
     </div>
    </div>
   </div>
  </div>
 );
}
