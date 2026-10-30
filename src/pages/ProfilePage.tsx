import React, { useState, useEffect } from 'react';
import {
 useParams,
 useNavigate } from 'react-router-dom';
import { 
 MapPin,
 Briefcase,
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
 ThumbsUp,
 Award,
 TrendingUp,
 Calendar as CalendarIcon,
 Activity,
 Eye,
 Clock,
 Flame,
 Heart,
 BookOpen,
 Handshake,
 CheckCircle2,
 Trophy,
 BarChart2
} from "lucide-react";
import { motion, AnimatePresence } from 'motion/react';
import { 
 PieChart, 
 Pie, 
 Cell, 
 ResponsiveContainer 
} from 'recharts';
import Button from '../components/ui/Button';
import { doc, getDoc, collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { cn } from '../lib/utils';
import { useLanguage, useT } from '../lib/language';
import { labelOf } from '../lib/labels';
import { formatDate } from '../lib/dates';
import { keys, listKeys, logActivity, readActivity, readIds, readOpenTo, readSessions, saveRequest, toggleId, writeProfileLocal, type OpenToKind } from '../lib/localLists';
import RelTime from '../components/ui/RelTime';
import { useStored } from '../lib/useStored';
import { applyOpenTo } from '../lib/openTo';
import { persistProfilePatch } from '../lib/account';
import { lookupPerson } from '../lib/people';
import { useAuth, DEMO_USER_ID } from '../App';
import { avatarFor, findCast } from '../data/cast';
import { demoWeeklyViews } from '../data/demoStats';
import FactLine from '../components/ui/FactLine';
import Avatar from '../components/ui/Avatar';
import { useToast } from '../context/ToastContext';
import { usePeople } from '../lib/directory';
import { avatarOf, findPerson } from '../lib/peopleSource';
import { compatibility, fromCast, fromProfile } from '../lib/compatibility';
import { mergeFitIntoViewer } from '../lib/fitCheck';
import { shareLink } from '../lib/download';
import { usePageControls } from '../lib/pageControls';
import { safeWebUrl } from '../lib/webUrl';
import { useUIStore } from '../stores/useUIStore';
import {
 connectionStateWith,
 endorseSkill,
 otherSide,
 profileViews,
 recordProfileView,
 respondToConnection,
 sendConnectionRequest,
 useConnections,
 withdrawConnection,
 type ProfileView,
} from '../lib/social';
import { UserProfile, Endorsement, ReadinessScore } from '../types';
import { askAssistant } from '../lib/assistantBus';

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
 { id: 'a3', type: 'milestone', text: 'Reached 50+ connections milestone', textEl: 'Ορόσημο: 50+ συνδέσεις', time: '1d ago', timeEl: 'πριν από 1 ημέρα', icon: Trophy, color: 'text-violet-500', bg: 'bg-violet-50' },
 { id: 'a4', type: 'project', text: 'Updated venture "TechFlow AI"', textEl: 'Ενημέρωση εγχειρήματος «TechFlow AI»', time: '2d ago', timeEl: 'πριν από 2 ημέρες', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-50' },
 { id: 'a5', type: 'skill', text: 'Added React & TypeScript skills', textEl: 'Προσθήκη δεξιοτήτων React και TypeScript', time: '3d ago', timeEl: 'πριν από 3 ημέρες', icon: Zap, color: 'text-violet-500', bg: 'bg-violet-50' },
 { id: 'a6', type: 'view', text: 'Profile viewed 38 times this week', textEl: '38 προβολές προφίλ αυτή την εβδομάδα', time: '4d ago', timeEl: 'πριν από 4 ημέρες', icon: Eye, color: 'text-stone-500', bg: 'bg-stone-50' },
];
// ── Achievements / Badges ────────────────────────────────────────────────────
const ACHIEVEMENTS = [
 { id: 'b1', name: 'Early Adopter', nameEl: 'Μέλος από την αρχή', desc: 'Joined in the first 1,000 users', descEl: 'Ένα από τα πρώτα 1.000 μέλη', icon: Flame, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', earned: true },
 { id: 'b2', name: 'Connector', nameEl: 'Συνδετικός κρίκος', desc: '25+ accepted connections', descEl: '25+ αποδεκτές συνδέσεις', icon: Handshake, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', earned: true },
 { id: 'b3', name: 'Thought Leader', nameEl: 'Σημείο αναφοράς', desc: '10+ endorsements received', descEl: '10+ συστάσεις από άλλα μέλη', icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', earned: true },
 { id: 'b4', name: 'Mentor Star', nameEl: 'Αστέρι καθοδήγησης', desc: 'Complete 5 mentoring sessions', descEl: 'Ολοκλήρωσε 5 συνεδρίες καθοδήγησης', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', earned: false },
 { id: 'b5', name: 'Pitch Pro', nameEl: 'Νικητήριο pitch', desc: 'Win a pitch competition', descEl: 'Κέρδισε έναν διαγωνισμό pitch', icon: Trophy, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100', earned: false },
 { id: 'b6', name: 'Full Profile', nameEl: 'Πλήρες προφίλ', desc: '100% profile completion', descEl: 'Προφίλ ολοκληρωμένο 100%', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', earned: false },
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
 const live = findPerson(profileId);
 const person = live
  ? { fullName: live.fullName, headline: live.headline, headlineEl: live.headlineEl, bio: live.bio, bioEl: live.bioEl, location: live.location, stage: live.stage, role: live.role, commitment: live.commitment, industry: live.industry, skills: live.skills, lookingFor: live.lookingFor }
  : lookupPerson(profileId);
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
  headlineEl: person?.headlineEl,
  bio: person?.bio || '',
  bioEl: person?.bioEl,
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
 const { mode: lang } = useLanguage();
 const { id } = useParams();
 const { user: currentUser, profile: ownProfile, isDemoMode } = useAuth();
 const navigate = useNavigate();
 const toast = useToast();
 const connections = useConnections();
 const { people: directory } = usePeople(currentUser?.uid);
 const [views, setViews] = useState<ProfileView[]>([]);
 const [connecting, setConnecting] = useState(false);
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
 // The demo account's own page shows the profile useAuth already carries —
 // the same data, without a Firestore read the demo backend would refuse.
 const demoOwn = isDemoMode && (!id || id === DEMO_USER_ID);
 const followIds = useStored(() => readIds(listKeys.follow), [keys.follow]);
 const following = !!id && followIds.includes(id);
 const profileId = id || currentUser?.uid;
 const real = !isDemoMode && Boolean(currentUser?.uid);
 // Live connection state with the person on this page (real accounts only).
 const connection = !isOwnProfile && id ? connectionStateWith(id) : { state: 'none' as const };
 void connections.items; // re-render when the connection list changes

 // Count a visit (once per day per viewer) and, on your own page, load who looked.
 useEffect(() => {
  if (!real || !profileId) return undefined;
  if (!isOwnProfile) {
   void recordProfileView(profileId);
   return undefined;
  }
  let cancelled = false;
  void profileViews(profileId, 30).then((list) => { if (!cancelled) setViews(list); });
  return () => { cancelled = true; };
 }, [real, profileId, isOwnProfile]);

 const handleConnect = async () => {
  if (!id || !profile) return;
  if (!real) {
   saveRequest({ id, fullName: profile.fullName || 'Founder', role: profile.role || 'Founder', industry: profile.industry || '', location: profile.location || '', note: profile.headline || '', status: 'pending' });
   toast.success(t('Request sent', 'Το αίτημα στάλθηκε'), t('In the demo, requests stay on this device.', 'Στη δοκιμαστική λειτουργία, τα αιτήματα μένουν σε αυτή τη συσκευή.'));
   return;
  }
  setConnecting(true);
  try {
   if (connection.state === 'incoming' && connection.record) {
    await respondToConnection(connection.record, true);
    toast.success(t('Connected', 'Η σύνδεση ολοκληρώθηκε'), t(`You and ${profile.fullName} can message each other now.`, `Μπορείς πλέον να ανταλλάσσεις μηνύματα με ${profile.fullName}.`));
   } else if (connection.state === 'outgoing' && connection.record) {
    await withdrawConnection(connection.record);
    toast.info(t('Request withdrawn', 'Το αίτημα ανακλήθηκε'));
   } else {
    const person = findPerson(id);
    const result = await sendConnectionRequest({ id, fullName: profile.fullName || person?.fullName || 'Member', headline: profile.headline, avatarUrl: person ? avatarOf(person) : '' }, 'Co-Founder');
    if (result === 'accepted') toast.success(t('Connected', 'Η σύνδεση ολοκληρώθηκε'), t('They had already asked — you are now connected.', 'Είχαν ήδη ζητήσει σύνδεση — η σύνδεση ολοκληρώθηκε.'));
    else toast.success(t('Request sent', 'Το αίτημα στάλθηκε'), t('You will be notified when they answer.', 'Θα ειδοποιηθείς όταν απαντήσουν.'));
    logActivity({ kind: 'request', title: `Requested ${profile.fullName}`, titleEl: `Αίτημα προς ${profile.fullName}`, href: `/profile/${id}` });
   }
  } catch (error) {
   const code = error instanceof Error ? error.message : '';
   toast.error(
    t('Could not send the request', 'Το αίτημα δεν στάλθηκε'),
    code === 'declined' ? t('This member declined an earlier request.', 'Αυτό το μέλος απέρριψε προηγούμενο αίτημα.') : t('Please try again.', 'Δοκίμασε ξανά.'),
   );
  } finally {
   setConnecting(false);
  }
 };

 const connectLabel =
  connection.state === 'connected' ? t('Connected', 'Συνδεδεμένοι')
   : connection.state === 'outgoing' ? t('Request sent · Withdraw', 'Αίτημα σταλμένο · Ανάκληση')
   : connection.state === 'incoming' ? t('Accept request', 'Αποδοχή αιτήματος')
   : connection.state === 'declined' ? t('Request declined', 'Το αίτημα απορρίφθηκε')
   : t('Connect', 'Σύνδεση');

 const openTo = useStored(readOpenTo, [keys.openTo]);
 // Same write path as Settings → Privacy and the studio assistant: the list,
 // the switch snapshot and the remote privacy fields move together.
 const toggleOpenTo = (kind: OpenToKind) => {
  const next = openTo.includes(kind) ? openTo.filter((item) => item !== kind) : [...openTo, kind];
  applyOpenTo(next, { uid: real && currentUser ? currentUser.uid : null, demo: !real });
 };

 const shareProfile = async () => {
  const result = await shareLink({ title: profile?.fullName || 'CoFounderBay', url: window.location.href });
  if (result === 'copied') toast.success(t('Link copied', 'Ο σύνδεσμος αντιγράφηκε'));
  else if (result === 'failed') toast.error(t('Could not share', 'Η κοινοποίηση απέτυχε'));
 };

 usePageControls(() => [
  ...(isOwnProfile
    ? [
        { id: 'edit-profile', en: 'Edit profile', el: 'Επεξεργασία προφίλ', run: () => setIsEditing(true) },
        { id: 'open-deal-room', en: 'Open Deal Room', el: 'Άνοιγμα Deal Room', run: () => useUIStore.getState().setDealRoomModalOpen(true, 'sv-my-venture') },
      ]
    : [
        { id: 'open-6axis', en: '6-Axis Score Breakdown', el: 'Ανάλυση 6 Αξόνων', run: () => useUIStore.getState().setMatchBreakdownModalOpen(true, id || profile?.uid || 'fp-1') },
        { id: 'message-member', en: 'Send a message', el: 'Αποστολή μηνύματος', run: () => { if (id) navigate(`/messages?user=${id}`); } },
        { id: 'connect-member', en: 'Connect', el: 'Σύνδεση', run: () => { void handleConnect(); } },
      ]),
  { id: 'share-profile', en: 'Share profile', el: 'Κοινοποίηση προφίλ', run: () => { void shareProfile(); } },
 ], [isOwnProfile, id, profile?.uid]);

 // ── Derived display data (always show sections, fallback to mock) ──
 const displayEndorsements = endorsements.length > 0 ? endorsements : (isDemoMode ? MOCK_ENDORSEMENTS : []);
 const displayReadiness = readiness || (isDemoMode ? MOCK_READINESS : null);
 const insightScore = Math.round(([
  profile?.fullName, profile?.headline, profile?.bio, profile?.location, profile?.role,
  profile?.stage, profile?.industry, profile?.linkedinUrl,
  (profile?.skills || []).length, (profile?.lookingFor || []).length,
 ].filter(Boolean).length / 10) * 100);

 const localActivity = useStored(readActivity, [keys.activity]);
 const sessions = useStored(readSessions, [keys.sessions]);

 type ActivityRow = { id: string; text: string; textEl: string; time: string; timeEl: string; at?: string; href?: string; icon: React.ElementType; color: string; bg: string };
 const activityItems = React.useMemo<ActivityRow[]>(() => {
  if (isDemoMode) return PROFILE_ACTIVITY;
  const since = Date.now() - 7 * 86_400_000;
  const rows: ActivityRow[] = [];
  const kindStyle = (kind: string): { icon: React.ElementType; color: string; bg: string } => {
   if (kind === 'request' || kind === 'profile') return { icon: Handshake, color: 'text-emerald-500', bg: 'bg-emerald-50' };
   if (kind === 'milestone') return { icon: Trophy, color: 'text-violet-500', bg: 'bg-violet-50' };
   if (kind === 'message') return { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-50' };
   if (kind === 'event' || kind === 'community') return { icon: CalendarIcon, color: 'text-amber-500', bg: 'bg-amber-50' };
   return { icon: Zap, color: 'text-violet-500', bg: 'bg-violet-50' };
  };
  if (isOwnProfile) {
   localActivity.filter((item) => Date.parse(item.at) >= since).slice(0, 8).forEach((item) => {
    rows.push({ id: item.id, text: item.title, textEl: item.titleEl || item.title, time: '', timeEl: '', at: item.at, href: item.href, ...kindStyle(item.kind) });
   });
  }
  endorsements.filter((item) => item.createdAt && Date.parse(item.createdAt) >= since).slice(0, 5).forEach((item) => {
   const who = findPerson(item.endorserId)?.fullName || (item as Endorsement & { endorserName?: string }).endorserName || t('A member', 'Ένα μέλος');
   rows.push({ id: `end-${item.id}`, text: `${who} endorsed ${isOwnProfile ? 'you' : 'this profile'} for ${item.skillId}`, textEl: `${who} έκανε σύσταση ${isOwnProfile ? 'σε εσένα' : 'σε αυτό το προφίλ'} για ${labelOf(item.skillId)}`, time: '', timeEl: '', at: item.createdAt, href: `/profile/${item.endorserId}`, icon: Award, color: 'text-amber-500', bg: 'bg-amber-50' });
  });
  return rows.sort((a, b) => Date.parse(b.at || '') - Date.parse(a.at || '')).slice(0, 8);
 }, [isDemoMode, isOwnProfile, localActivity, endorsements, t]);

 const achievements = React.useMemo(() => {
  if (isDemoMode) return ACHIEVEMENTS.map((badge) => ({ ...badge, progress: '' }));
  const connectedCount = isOwnProfile ? connections.accepted.length : ((profile as unknown as { connectionIds?: string[] } | null)?.connectionIds ?? []).length;
  const endorsementCount = endorsements.length;
  const mentoringSessions = sessions.filter((session) => session.type === 'Mentorship').length;
  const completion = profile?.profileCompletionScore ?? insightScore;
  const joined = profile?.createdAt ? Date.parse(profile.createdAt) : NaN;
  const earlyMember = !Number.isNaN(joined) && joined < Date.UTC(2027, 0, 1);
  const progress = (have: number, need: number) => t(`${Math.min(have, need)}/${need} so far`, `${Math.min(have, need)}/${need} μέχρι τώρα`);
  return [
   { ...ACHIEVEMENTS[0]!, name: 'Early member', nameEl: 'Μέλος από νωρίς', desc: 'Joined in the first year', descEl: 'Εγγραφή τον πρώτο χρόνο', earned: earlyMember, progress: '' },
   { ...ACHIEVEMENTS[1]!, earned: connectedCount >= 25, progress: progress(connectedCount, 25) },
   { ...ACHIEVEMENTS[2]!, earned: endorsementCount >= 10, progress: progress(endorsementCount, 10) },
   { ...ACHIEVEMENTS[3]!, earned: mentoringSessions >= 5, progress: isOwnProfile ? progress(mentoringSessions, 5) : '' },
   { ...ACHIEVEMENTS[4]!, earned: false, progress: t('Awarded by event organisers', 'Απονέμεται από διοργανωτές εκδηλώσεων') },
   { ...ACHIEVEMENTS[5]!, earned: completion >= 100, progress: t(`${completion}% complete`, `${completion}% ολοκληρωμένο`) },
  ];
 }, [isDemoMode, isOwnProfile, connections.accepted.length, profile, endorsements.length, sessions, insightScore, t]);

 // How well this person fits the signed-in viewer (same scorer as Matches).
 const fitWithViewer = React.useMemo(() => {
  if (!profile || isOwnProfile) return null;
  return compatibility(fromProfile(mergeFitIntoViewer(ownProfile)), fromProfile(profile as unknown as Parameters<typeof fromProfile>[0]));
 }, [profile, isOwnProfile, ownProfile]);

 // Members closest to this profile, scored with the same engine Matches uses.
 const similarPeople = React.useMemo(() => {
  if (!profile) return [];
  const base = fromProfile(profile as unknown as Parameters<typeof fromProfile>[0]);
  return directory
   .filter((person) => person.id !== profileId)
   .map((person) => ({ person, score: compatibility(base, fromCast({ skills: person.skills, lookingFor: person.lookingFor, interests: person.interests, industry: person.industry, stage: person.stage, commitment: person.commitment, city: person.city, timezone: person.timezone })).score ?? 0 }))
   .sort((a, b) => b.score - a.score)
   .slice(0, 3);
 }, [profile, directory, profileId]);

 // Own page: your accepted connections. Someone else's page: connections you share.
 const connectionCards = React.useMemo(() => {
  if (!real || !currentUser) return [];
  const mine = connections.accepted.map((record) => otherSide(record, currentUser.uid));
  if (isOwnProfile) return mine.slice(0, 5).map((other) => ({ ...other, mutual: null as number | null }));
  const theirs = new Set((profile as unknown as { connectionIds?: string[] } | null)?.connectionIds ?? []);
  return mine.filter((other) => theirs.has(other.id)).slice(0, 5).map((other) => ({ ...other, mutual: null as number | null }));
 }, [real, currentUser, connections.accepted, isOwnProfile, profile]);
 useEffect(() => {
  if (isEditing && profile) {
   setEditForm(profile);
  }
 }, [isEditing, profile]);

 useEffect(() => {
  if (isDemoMode) {
   // Demo data lives in memory/cast — never Firestore, so the page loads
   // clean on an unauthenticated backend.
   setProfile(demoOwn && ownProfile ? (ownProfile as UserProfile) : fallbackProfile(profileId ?? '', demoOwn ? currentUser?.displayName : null));
   setEndorsements([]);
   setReadiness(null);
   setLoading(false);
   return;
  }
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
 }, [profileId, isOwnProfile, currentUser?.displayName, isDemoMode, demoOwn, ownProfile]);

 const handleEndorse = async () => {
  if (!currentUser || !profileId || !selectedSkillForEndorsement) return;
  setIsEndorsing(true);
  try {
   if (real) {
    const record = await endorseSkill({ id: profileId, fullName: profile?.fullName || 'Member' }, selectedSkillForEndorsement, endorsementComment);
    setEndorsements((prev) => [{ id: record.id, endorserId: record.endorserId, recipientId: record.recipientId, skillId: record.skillId, comment: record.comment, createdAt: new Date(record.createdAt).toISOString() } as Endorsement, ...prev.filter((item) => item.id !== record.id)]);
   } else {
    // Demo keeps the endorsement local — no Firestore write to a
    // backend the sample account cannot reach.
    const newEndorsement: Endorsement = {
     id: `local-${Date.now()}`,
     authorId: currentUser.uid,
     endorserId: currentUser.uid,
     recipientId: profileId,
     skillId: selectedSkillForEndorsement,
     comment: endorsementComment,
     createdAt: new Date().toISOString()
    } as Endorsement;
    setEndorsements(prev => [newEndorsement, ...prev]);
   }
   setSelectedSkillForEndorsement('');
   setEndorsementComment('');
   toast.success(t('Endorsement sent', 'Η σύσταση στάλθηκε'), t(`${profile?.fullName || 'They'} will be notified.`, `Θα σταλεί ειδοποίηση σε ${profile?.fullName || 'το μέλος'}.`));
  } catch (err: unknown) {
   if (err instanceof Error && err.message === 'self') {
    toast.info(t('You cannot endorse yourself', 'Δεν μπορείς να συστήσεις τον εαυτό σου'));
   } else {
    toast.error(t('Endorsement failed', 'Η σύσταση απέτυχε'), t('Please try again.', 'Δοκίμασε ξανά.'));
    console.error('Endorsement failed:', err);
   }
  } finally {
   setIsEndorsing(false);
  }
 };

 const handleSave = async (data: Partial<UserProfile>) => {
  if (!profileId) return;
  // Reject non-http(s) link values instead of storing a scriptable scheme.
  const clean = { ...data };
  let rejected = false;
  for (const key of ['linkedinUrl', 'githubUrl', 'twitterUrl', 'portfolioUrl'] as const) {
   const value = clean[key];
   if (typeof value === 'string' && value.trim() && !safeWebUrl(value)) {
    delete clean[key];
    rejected = true;
   }
  }
  if (rejected) {
   toast.error(t('Links must start with http:// or https://', 'Οι σύνδεσμοι πρέπει να ξεκινούν με http:// ή https://'));
  }
  if (!real) {
   // Demo edits persist in this browser — nothing hits Firestore.
   writeProfileLocal(clean);
   setProfile(prev => prev ? { ...prev, ...clean } : null);
   setIsEditing(false);
   return;
  }
  try {
   await persistProfilePatch(profileId, clean);
   setProfile(prev => prev ? { ...prev, ...clean } : null);
   setIsEditing(false);
  } catch (err: unknown) {
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
     <h2 className="text-xl font-semibold text-stone-900">{t('Profile Error', 'Σφάλμα προφίλ')}</h2>
     <p className="text-stone-500">{error || t('Profile not found', 'Το προφίλ δεν βρέθηκε')}</p>
     <button 
      onClick={() => navigate('/dashboard')}
      className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all"
     >
      {t('Back to Dashboard', 'Επιστροφή στον πίνακα ελέγχου')}
     </button>
    </div>
   </div>
  );
 }

 const linkedinSafe = safeWebUrl(profile.linkedinUrl);
 const githubSafe = safeWebUrl(profile.githubUrl);
 const twitterSafe = safeWebUrl(profile.twitterUrl);
 const portfolioSafe = safeWebUrl(profile.portfolioUrl);

 const matchGaps = [
  { ok: !!(profile.skills && profile.skills.length), key: t('Skills', 'Δεξιότητες'), why: t('The scorer uses skills to see what you cover.', 'Η βαθμολόγηση χρησιμοποιεί τις δεξιότητες για να δει τι καλύπτεις.') },
  { ok: !!(profile.lookingFor && profile.lookingFor.length), key: t('Looking for', 'Τι αναζητάς'), why: t('Matches rank people who cover what you still lack.', 'Οι αντιστοιχίσεις κατατάσσουν υψηλότερα τα άτομα που καλύπτουν ό,τι σου λείπει ακόμη.') },
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
   <div className="relative">
    <div className="h-24 sm:h-32 bg-stone-200 rounded-xl overflow-hidden relative" />

    {/* Profile Info Card */}
    <div className="bg-white rounded-2xl border border-stone-100 p-4 sm:p-8 lg:p-10 -mt-10 sm:-mt-16 relative z-10">
     <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-start">
      <div className="relative">
       {(() => {
        const record = profile as unknown as { avatarUrl?: string; profilePhoto?: string; profile?: { profilePhoto?: string } };
        const person = findPerson(profile.uid);
        const src = record.avatarUrl || record.profilePhoto || record.profile?.profilePhoto || (isOwnProfile ? currentUser?.photoURL || '' : '') || (person ? avatarOf(person) : '') || (isDemoMode || findCast(profile.uid) ? avatarFor(profile.uid, 200) : '');
        const name = isOwnProfile ? (profile.fullName || currentUser?.displayName || t('Member', 'Μέλος')) : (profile.fullName || t('Member', 'Μέλος'));
        return <Avatar src={src || undefined} fallback={name} alt={name} size="xl" className="[&>*]:w-20 [&>*]:h-20 sm:[&>*]:w-28 sm:[&>*]:h-28 lg:[&>*]:w-36 lg:[&>*]:h-36 [&>*]:rounded-2xl [&>*]:border-4 [&>*]:border-white [&>*]:shadow-sm [&>*]:text-2xl" />;
       })()}
       {profile.verificationStatus === 'Verified' && (
        <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-2 rounded-full border-4 border-white shadow-lg" title={t('Verified member', 'Επαληθευμένο μέλος')} aria-label={t('Verified member', 'Επαληθευμένο μέλος')}>
         <ShieldCheck className="w-5 h-5" />
        </div>
       )}
      </div>

      <div className="flex-1 space-y-4">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
         <h1 className="text-xl font-semibold text-stone-900 tracking-tight">
          {isOwnProfile ? (currentUser?.displayName || t('Founder', 'Ιδρυτής')) : labelOf(profile.fullName || 'Founder')}
         </h1>
         {isEditing ? (
          <input 
           type="text" 
           aria-label={t('Headline', 'Τίτλος')}
           value={editForm.headline || ''}
           onChange={(e) => setEditForm(prev => ({ ...prev, headline: e.target.value }))}
           className="w-full px-4 py-2 mt-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-base"
           placeholder={t('Headline', 'Τίτλος')}
          />
         ) : (
          <p className="text-base font-medium text-stone-500 mt-1">{profile.headlineEl ? t(profile.headline, profile.headlineEl) : labelOf(profile.headline)}</p>
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
           <button
            type="button"
            onClick={() => void handleConnect()}
            disabled={connecting || connection.state === 'connected' || connection.state === 'declined'}
            aria-live="polite"
            className={cn(
             'flex flex-1 sm:flex-none items-center justify-center gap-2 min-h-11 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:cursor-default',
             connection.state === 'connected' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              : connection.state === 'outgoing' ? 'bg-white text-stone-700 border border-stone-200 hover:border-stone-900'
              : connection.state === 'declined' ? 'bg-stone-100 text-stone-400'
              : 'bg-stone-900 text-white hover:bg-stone-800',
            )}
           >
            {connection.state === 'connected' ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />}
            {connectLabel}
           </button>
           <button type="button" onClick={() => id && navigate(`/messages?user=${id}`)} aria-label={t('Send a message', 'Αποστολή μηνύματος')} title={t('Send a message', 'Αποστολή μηνύματος')} className="min-h-11 inline-flex items-center justify-center gap-2 px-3 sm:px-0 sm:min-w-11 bg-stone-50 text-stone-900 rounded-xl hover:bg-stone-100 transition-all border border-stone-100">
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm font-medium sm:hidden">{t('Message', 'Μήνυμα')}</span>
           </button>
           <button type="button" onClick={() => id && toggleId(listKeys.follow, id)} aria-pressed={following} aria-label={following ? t('Unfollow', 'Κατάργηση παρακολούθησης') : t('Follow', 'Παρακολούθηση')} title={following ? t('Unfollow', 'Κατάργηση παρακολούθησης') : t('Follow', 'Παρακολούθηση')} className="min-h-11 min-w-11 inline-flex items-center justify-center bg-stone-50 text-stone-900 rounded-xl hover:bg-stone-100 transition-all border border-stone-100">
            <Star className={cn('w-5 h-5', following && 'fill-current')} />
           </button>
          </>
         )}
         <button type="button" onClick={() => void shareProfile()} aria-label={t('Share profile', 'Κοινοποίηση προφίλ')} title={t('Share profile', 'Κοινοποίηση προφίλ')} className="min-h-11 min-w-11 inline-flex items-center justify-center bg-stone-50 text-stone-900 rounded-xl hover:bg-stone-100 transition-all border border-stone-100">
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
           aria-label={t('Location', 'Τοποθεσία')}
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
        {!isOwnProfile && fitWithViewer?.score != null && (
         <button
          type="button"
          onClick={() => useUIStore.getState().setMatchBreakdownModalOpen(true, id || profile.uid || 'fp-1')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-50 hover:bg-stone-900 hover:text-white border border-stone-200 hover:border-stone-900 text-stone-900 text-xs font-semibold transition-colors"
          title={fitWithViewer.headline ? (lang === 'el' ? fitWithViewer.headline.el : fitWithViewer.headline.en) : t('Open 6-Axis Compatibility Breakdown', 'Άνοιγμα Ανάλυσης 6 Αξόνων')}
         >
          <BarChart2 className="w-3.5 h-3.5 text-amber-500" />
          {t(`${fitWithViewer.score}% compatibility · 6-Axis`, `${fitWithViewer.score}% συμβατότητα · 6 Άξονες`)}
         </button>
        )}
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
             onClick={() => askAssistant('What does my founding team still lack?')}
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
          aria-label={t('About me', 'Σχετικά με μένα')}
         value={editForm.bio || ''}
         onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
         rows={4}
         className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900 text-base"
         placeholder={t('Tell us about yourself...', 'Πες μας για σένα…')}
        />
        <p className="text-xs text-stone-500 mt-2">{t('Add more details about your professional experience and values highly increases match accuracy.', 'Περισσότερες λεπτομέρειες για την επαγγελματική σου εμπειρία και τις αξίες σου αυξάνουν πολύ την ακρίβεια της αντιστοίχισης.')}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-stone-100">
         <div>
          <label htmlFor="profile-linkedin" className="block text-sm font-medium text-stone-500 mb-1">{t('LinkedIn URL', 'Σύνδεσμος LinkedIn')}</label>
          <input 
           id="profile-linkedin"
           type="url" 
           value={editForm.linkedinUrl || ''}
           onChange={(e) => setEditForm(prev => ({ ...prev, linkedinUrl: e.target.value }))}
           className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900"
           placeholder="https://linkedin.com/in/..."
          />
         </div>
         <div>
          <label htmlFor="profile-github" className="block text-sm font-medium text-stone-500 mb-1">{t('GitHub URL', 'Σύνδεσμος GitHub')}</label>
          <input 
           id="profile-github"
           type="url" 
           value={editForm.githubUrl || ''}
           onChange={(e) => setEditForm(prev => ({ ...prev, githubUrl: e.target.value }))}
           className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900"
           placeholder="https://github.com/..."
          />
         </div>
         <div>
          <label htmlFor="profile-portfolio" className="block text-sm font-medium text-stone-500 mb-1">{t('Portfolio URL', 'Σύνδεσμος portfolio')}</label>
          <input 
           id="profile-portfolio"
           type="url" 
           value={editForm.portfolioUrl || ''}
           onChange={(e) => setEditForm(prev => ({ ...prev, portfolioUrl: e.target.value }))}
           className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900"
           placeholder="https://yourportfolio.com"
          />
         </div>
         <div>
          <label htmlFor="profile-availability" className="block text-sm font-medium text-stone-500 mb-1">{t('Availability', 'Διαθεσιμότητα')}</label>
          <select
           id="profile-availability"
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
       <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">
        {profile.bio ? t(profile.bio, profile.bioEl || profile.bio) : t('No bio provided yet.', 'Δεν έχει προστεθεί ακόμη βιογραφικό.')}
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
       {activityItems.length === 0 && (
        <p className="text-sm text-stone-500 p-3">
         {isOwnProfile ? t('Nothing in the last 7 days. Save a match, send a request or finish a milestone and it shows up here.', 'Τίποτα τις τελευταίες 7 ημέρες. Αποθήκευσε μια αντιστοίχιση, στείλε αίτημα ή ολοκλήρωσε ένα ορόσημο και θα εμφανιστεί εδώ.') : t('No public activity in the last 7 days.', 'Καμία δημόσια δραστηριότητα τις τελευταίες 7 ημέρες.')}
        </p>
       )}
       {activityItems.map((item, idx) => (
        <motion.div
         key={item.id}
         initial={{ opacity: 0, x: -10 }}
         animate={{ opacity: 1, x: 0 }}
         transition={{ delay: Math.min(idx, 8) * 0.05 }}
         className="flex items-start gap-3 p-3 rounded-xl hover:bg-stone-50/80 transition-colors group"
        >
         <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border", item.bg, item.color, item.bg.replace('bg-', 'border-').replace('50', '100'))}>
          <item.icon className="w-4 h-4" />
         </div>
         <div className="flex-1 min-w-0">
          {item.href ? (
           <button type="button" onClick={() => navigate(item.href!)} className="text-left text-sm text-stone-700 leading-snug hover:underline">{t(item.text, item.textEl)}</button>
          ) : (
           <p className="text-sm text-stone-700 leading-snug">{t(item.text, item.textEl)}</p>
          )}
          <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
           <Clock className="w-3 h-3" />
           {item.at ? <RelTime iso={item.at} /> : t(item.time, item.timeEl)}
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
        const skillName = typeof skill === 'string' ? skill : (skill as { name?: string }).name ?? '';
        const skillProficiency = typeof skill === 'object' && skill !== null ? Number((skill as { proficiency?: number }).proficiency ?? 0) : 0;
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
          <button type="button" aria-label={t('Cancel endorsement', 'Ακύρωση σύστασης')} onClick={() => setSelectedSkillForEndorsement('')} className="text-stone-400 hover:text-stone-900">
           <X className="w-5 h-5" />
          </button>
         </div>
         <textarea 
          aria-label={t('Endorsement comment (optional)', 'Σχόλιο σύστασης (προαιρετικό)')}
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
           {(() => {
            const endorser = findPerson(endorsement.endorserId);
            const record = endorsement as Endorsement & { endorserName?: string; endorserAvatar?: string };
            return <Avatar src={(endorser ? avatarOf(endorser) : '') || record.endorserAvatar || undefined} fallback={endorser?.fullName || record.endorserName || '?'} size="md" className="[&>*]:rounded-xl" />;
           })()}
           <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between">
             <p className="text-sm text-stone-900">
              <span className="font-medium">{findPerson(endorsement.endorserId)?.fullName || (endorsement as Endorsement & { endorserName?: string }).endorserName || t('A member', 'Ένα μέλος')}</span> {t('endorsed for', 'έκανε σύσταση για')}{' '}
              <span className="font-semibold text-stone-900 bg-amber-50 px-1.5 py-0.5 rounded-md text-xs border border-amber-100">{endorsement.skillId}</span>
             </p>
            </div>
            {endorsement.comment && (
             <p className="text-xs text-stone-500 italic leading-relaxed">"{endorsement.comment}"</p>
            )}
            <p className="text-xs text-stone-400 flex items-center gap-1">
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
        {achievements.filter(a => a.earned).length}/{achievements.length} {t('earned', 'κερδισμένα')}
       </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
       {achievements.map(badge => (
        <motion.div
         key={badge.id}
         whileHover={{ scale: badge.earned ? 1.05 : 1 }}
         title={badge.earned ? undefined : badge.progress}
         className={cn(
          "relative flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all",
          badge.earned
           ? `${badge.bg} ${badge.border} shadow-sm`
           : "bg-stone-50/50 border-dashed border-stone-200"
         )}
        >
         {/* Locked badges stay readable: only the icon is dimmed, the text keeps AA contrast. */}
         <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", badge.earned ? badge.bg : "bg-stone-100 opacity-60 grayscale")}>
          <badge.icon className={cn("w-4 h-4", badge.earned ? badge.color : "text-stone-400")} />
         </div>
         <div>
          <p className={cn("text-xs font-semibold leading-tight", badge.earned ? "text-stone-900" : "text-stone-600")}>{t(badge.name, badge.nameEl)}</p>
          <p className="text-xs text-stone-500 mt-0.5 leading-tight">{badge.earned || !badge.progress ? t(badge.desc, badge.descEl) : badge.progress}</p>
          {!badge.earned && <p className="text-[11px] font-medium text-stone-500 mt-1">{t('Locked', 'Κλειδωμένο')}</p>}
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
        <Heart className="w-4 h-4 text-red-400" />
        {t('Open To', 'Ενδιαφέρομαι για')}
       </h3>
       <div className="space-y-2">
        {([
         { kind: 'cofounder', label: 'Co-founder matching', labelEl: 'Αντιστοίχιση συνιδρυτών' },
         { kind: 'mentoring', label: 'Mentoring sessions', labelEl: 'Συνεδρίες καθοδήγησης' },
         { kind: 'advisor', label: 'Advisory roles', labelEl: 'Συμβουλευτικοί ρόλοι' },
         { kind: 'investor', label: 'Investor conversations', labelEl: 'Συζητήσεις με επενδυτές' },
         { kind: 'speaking', label: 'Speaking invitations', labelEl: 'Προσκλήσεις για ομιλίες' },
        ] as { kind: OpenToKind; label: string; labelEl: string }[]).map(item => {
         const active = openTo.includes(item.kind);
         return (
          <div key={item.kind} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-50 transition-colors">
           <span className="text-sm text-stone-700">{t(item.label, item.labelEl)}</span>
           <button
            type="button"
            role="switch"
            aria-checked={active}
            aria-label={t(item.label, item.labelEl)}
            onClick={() => toggleOpenTo(item.kind)}
            className={cn("w-8 h-5 rounded-full flex items-center transition-all", active ? "bg-emerald-500 justify-end" : "bg-stone-200 justify-start")}
           >
            <span className="w-3.5 h-3.5 bg-white rounded-full mx-0.5 shadow-sm" />
           </button>
          </div>
         );
        })}
       </div>
       <p className="text-xs text-stone-400 pt-1 border-t border-stone-100">
        {t('Other members see these on your profile; Matches and Mentors use them to place you in the right lists.', 'Τα άλλα μέλη τα βλέπουν στο προφίλ σου· οι Αντιστοιχίσεις και οι Μέντορες τα χρησιμοποιούν για να σε βάλουν στις σωστές λίστες.')}
       </p>
      </div>
     )}
{/* Social Links */}
     <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-6">
      <h3 className="text-sm font-semibold text-stone-900 tracking-wider">{t('Connect', 'Σύνδεση')}</h3>
      <div className="space-y-4">
       {linkedinSafe && (
        <a href={linkedinSafe} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all font-medium">
         <Linkedin className="w-5 h-5" />
         {t('LinkedIn Profile', 'Προφίλ LinkedIn')}
        </a>
       )}
       {githubSafe && (
        <a href={githubSafe} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all font-medium">
         <Github className="w-5 h-5" />
         {t('GitHub Portfolio', 'Προφίλ GitHub')}
        </a>
       )}
       {twitterSafe && (
        <a href={twitterSafe} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all font-medium">
         <Twitter className="w-5 h-5" />
         Twitter / X
        </a>
       )}
       {portfolioSafe && (
        <a href={portfolioSafe} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all font-medium">
         <Globe className="w-5 h-5" />
         {t('Personal Website', 'Προσωπικός ιστότοπος')}
        </a>
       )}
       {!linkedinSafe && !githubSafe && !twitterSafe && !portfolioSafe && (
        <p className="text-stone-500 text-sm">{t('No social links added yet.', 'Δεν έχουν προστεθεί ακόμη σύνδεσμοι κοινωνικών δικτύων.')}</p>
       )}
      </div>
     </div>
    </div>

    {/* Signals: AI, readiness, network */}
    <div className="min-w-0 space-y-6 lg:col-span-2 xl:col-span-1">
     <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4 sm:gap-6">
{/* AI Match Insight */}
      <div className="bg-stone-50 border border-stone-200 p-5 rounded-xl space-y-4">
       <div>
        <div className="flex items-center gap-3 mb-3">
         <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center backdrop-blur-sm border border-stone-200">
          <Sparkles className="w-4 h-4 text-amber-600" />
         </div>
         <div>
          <h3 className="text-sm font-semibold text-stone-900 tracking-wider">{isOwnProfile ? t('AI Profile Insight', 'Ανάλυση προφίλ με AI') : t('AI Match Analysis', 'Ανάλυση αντιστοίχισης με AI')}</h3>
          <p className="text-xs text-stone-600">{t('Powered by CoFounderBay AI', 'Με την υποστήριξη του CoFounderBay AI')}</p>
         </div>
        </div>
        <div className="space-y-3">
         <div className="flex items-center justify-between text-xs">
          <span className="text-stone-600">{isOwnProfile ? t('Profile strength', 'Δύναμη προφίλ') : t('Overall compatibility', 'Συνολική συμβατότητα')}</span>
          <span className="text-stone-900 font-semibold">{insightScore}%</span>
         </div>
         <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
          <motion.div
           initial={{ width: 0 }}
           animate={{ width: `${insightScore}%` }}
           transition={{ duration: 1.5 }}
           className="h-full bg-stone-700 rounded-full"
          />
         </div>
         {isDemoMode ? (
         <>
         <div className="grid grid-cols-3 gap-2 pt-2">
          {[
           { label: 'Skills', labelEl: 'Δεξιότητες', pct: 92 },
           { label: 'Values', labelEl: 'Αξίες', pct: 78 },
           { label: 'Goals', labelEl: 'Στόχοι', pct: 81 },
          ].map(d => (
           <div key={d.label} className="text-center p-2 bg-white rounded-lg border border-stone-200">
            <p className="text-stone-900 font-semibold text-sm">{d.pct}%</p>
            <p className="text-xs text-stone-600">{t(d.label, d.labelEl)}</p>
           </div>
          ))}
         </div>
         <p className="text-xs text-stone-600 leading-relaxed italic pt-1">
          {isOwnProfile
           ? t('"Strong technical profile with excellent product thinking. Consider adding more market validation artifacts to boost your readiness score."', '«Ισχυρό τεχνικό προφίλ με εξαιρετική σκέψη προϊόντος. Πρόσθεσε περισσότερα στοιχεία επικύρωσης αγοράς για να ανεβάσεις το readiness score σου.»')
           : t('"Complementary skill sets in product management and engineering. Strong alignment on mission-driven ventures and startup pace."', '«Συμπληρωματικές δεξιότητες σε διαχείριση προϊόντος και μηχανική. Ισχυρή ευθυγράμμιση σε εγχειρήματα με αποστολή και σε ρυθμό startup.»')
          }
         </p>
         </>
         ) : (
          <p className="text-xs text-stone-600 leading-relaxed pt-1">
           {t('This number is how complete this profile is, from the fields on the page. Match scores appear when both of you have enough in common.', 'Αυτός ο αριθμός είναι πόσο συμπληρωμένο είναι το προφίλ, από τα πεδία της σελίδας. Τα σκορ αντιστοίχισης εμφανίζονται μόλις υπάρχουν αρκετά κοινά.')}
          </p>
         )}
        </div>
       </div>
      </div>
{/* Readiness Score Section */}
      {displayReadiness && <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-6">
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
      </div>}
{/* Profile Stats — Enhanced */}
     <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100 space-y-4">
      <h3 className="text-sm font-semibold text-stone-900 tracking-wider flex items-center gap-2">
       <TrendingUp className="w-4 h-4 text-stone-400" />
       {t('Profile Analytics', 'Στατιστικά προφίλ')}
      </h3>
      <div className="grid grid-cols-2 gap-3">
       {(() => {
        const weekAgo = Date.now() - 7 * 86_400_000;
        const viewsWeek = views.filter((view) => view.at >= weekAgo).length;
        const strongMatches = similarPeople.filter((item) => item.score >= 60).length;
        const connectedCount = connections.accepted.length;
        const connectedWeek = connections.accepted.filter((record) => (record.respondedAt || record.updatedAt) >= weekAgo).length;
        const endorsedWeek = displayEndorsements.filter((item) => item.createdAt && Date.parse(item.createdAt) >= weekAgo).length;
        const rows = [
          { label: 'Views', labelEl: 'Προβολές', value: String(isDemoMode ? demoWeeklyViews() : views.length), sub: isDemoMode ? t('Last 7 days', 'Τελευταίες 7 ημέρες') : isOwnProfile ? (viewsWeek ? `+${viewsWeek} ${t('this week', 'αυτή την εβδομάδα')}` : t('Last 30 days', 'Τελευταίες 30 ημέρες')) : t('Visible to the owner', 'Ορατό μόνο στον κάτοχο') },
          { label: 'Strong matches', labelEl: 'Δυνατές αντιστοιχίσεις', value: String(strongMatches), sub: t('Members scoring 60%+', 'Μέλη με σκορ 60%+') },
          { label: 'Endorsements', labelEl: 'Συστάσεις', value: String(displayEndorsements.length), sub: endorsedWeek ? `+${endorsedWeek} ${t('this week', 'αυτή την εβδομάδα')}` : t('All time', 'Συνολικά') },
          { label: 'Connections', labelEl: 'Συνδέσεις', value: isOwnProfile ? String(connectedCount) : String(((profile as unknown as { connectionIds?: string[] }).connectionIds ?? []).length), sub: isOwnProfile && connectedWeek ? `+${connectedWeek} ${t('this week', 'αυτή την εβδομάδα')}` : t('Accepted requests', 'Αποδεκτά αιτήματα') },
         ];
        return rows.map((stat) => (
         <div key={stat.label} className="bg-white p-3.5 rounded-xl border border-stone-100 text-center space-y-1">
          <div className="text-lg font-semibold text-stone-900 tabular-nums">{stat.value}</div>
          <div className="text-xs text-stone-500 font-medium tracking-wider">{t(stat.label, stat.labelEl)}</div>
          <div className="text-xs font-semibold text-stone-400">{stat.sub}</div>
         </div>
        ));
       })()}
      </div>
      {isDemoMode && (
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
      )}
     </div>
{/* Connections / Mutual Connections */}
      <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-4">
       <h3 className="text-sm font-semibold text-stone-900 tracking-wider flex items-center gap-2">
        <Handshake className="w-4 h-4 text-stone-400" />
        {isOwnProfile ? t('Your connections', 'Οι συνδέσεις σου') : t('Connections you share', 'Κοινές συνδέσεις')}
       </h3>
       <div className="space-y-2">
        {!isDemoMode && connectionCards.length === 0 && (
         <p className="text-sm text-stone-500">
          {isOwnProfile
           ? t('Accepted connection requests appear here.', 'Τα αποδεκτά αιτήματα σύνδεσης εμφανίζονται εδώ.')
           : t('You do not share any connections yet.', 'Δεν έχεις κοινές συνδέσεις ακόμη.')}
         </p>
        )}
        {(isDemoMode ? MUTUAL_CONNECTIONS.map((conn) => ({ id: conn.id, name: conn.name, headline: conn.headline, avatar: avatarFor(conn.id, 80), mutual: conn.mutual as number | null })) : connectionCards).map((conn) => (
         <button type="button" key={conn.id} onClick={() => navigate(`/profile/${conn.id}`)} className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl hover:bg-stone-50 transition-colors group">
          <Avatar src={(findPerson(conn.id) ? avatarOf(findPerson(conn.id)) : '') || conn.avatar || undefined} fallback={conn.name} size="md" className="[&>*]:rounded-xl" />
          <div className="flex-1 min-w-0">
           <p className="text-sm font-medium text-stone-900 group-hover:text-stone-700 truncate">{conn.name}</p>
           <p className="text-xs text-stone-400 truncate">{conn.headline}</p>
          </div>
          {conn.mutual != null && (
           <span className="text-xs text-stone-400 font-medium bg-stone-50 px-2 py-1 rounded-lg border border-stone-100 shrink-0">
            {conn.mutual} {t('mutual', 'κοινές')}
           </span>
          )}
         </button>
        ))}
        {isOwnProfile && !isDemoMode && connectionCards.length > 0 && (
         <button type="button" onClick={() => navigate('/network')} className="w-full text-center text-xs font-medium text-stone-400 hover:text-stone-900 py-2 rounded-xl hover:bg-stone-50 transition-all">
          {t('All connections', 'Όλες οι συνδέσεις')}
         </button>
        )}
       </div>
      </div>
{/* People Also Viewed */}
     <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-stone-900 tracking-wider flex items-center gap-2">
       <Eye className="w-4 h-4 text-stone-400" />
       {isOwnProfile ? t('Members who fit you', 'Μέλη που σου ταιριάζουν') : t('Similar members', 'Παρόμοια μέλη')}
      </h3>
      <div className="space-y-2">
       {!isDemoMode && similarPeople.length === 0 && <p className="text-sm text-stone-500">{t('Suggestions appear as more members join.', 'Οι προτάσεις εμφανίζονται όσο εγγράφονται περισσότερα μέλη.')}</p>}
       {(isDemoMode
        ? ALSO_VIEWED.map((person) => ({ id: person.id, name: person.name, headline: person.headline, avatar: avatarFor(person.id, 80), score: person.matchScore }))
        : similarPeople.map(({ person, score }) => ({ id: person.id, name: person.fullName, headline: person.headline || labelOf(person.role), avatar: avatarOf(person), score }))
       ).map((person) => (
        <button type="button" key={person.id} onClick={() => navigate(`/profile/${person.id}`)} className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl hover:bg-stone-50 transition-colors group">
         <Avatar src={person.avatar || undefined} fallback={person.name} size="md" className="[&>*]:rounded-xl" />
         <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-900 group-hover:text-stone-700 truncate">{person.name}</p>
          <p className="text-xs text-stone-400 truncate">{person.headline}</p>
         </div>
         <div className="flex items-center gap-1 shrink-0" title={t('Compatibility', 'Συμβατότητα')}>
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="text-xs font-semibold text-stone-700 tabular-nums">{person.score}%</span>
         </div>
        </button>
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
