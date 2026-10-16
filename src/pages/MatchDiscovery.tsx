import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
 Search, 
 Filter, 
 MapPin, 
 Briefcase, 
 Target, 
 Star, 
 UserPlus, 
 MessageSquare, 
 ChevronDown,
 Zap,
 CheckCircle2,
 X,
 SlidersHorizontal,
 ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, getDocs, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';
import { logActivity, readMatchFilters, readSaved, removeSaved, saveProfile, saveRequest, writeMatchFilters } from '../lib/localLists';
import { CAST, avatarFor, placeOf } from '../data/cast';
import { compatibility, fromCast, fromProfile } from '../lib/compatibility';
import { useStored } from '../lib/useStored';
import { useAuth } from '../App';
import { rememberPerson } from '../lib/people';
import PageShell from '../components/ui/PageShell';
import Avatar from '../components/ui/Avatar';
import FactLine from '../components/ui/FactLine';
import EmptyHint, { AskLink } from '../components/ui/EmptyHint';
import { useToast } from '../context/ToastContext';

function directoryProfiles(): UserProfile[] {
 return CAST.filter((person) => person.role === 'Founder' || person.role === 'Co-Founder Candidate').map((person) => ({
  uid: person.id,
  fullName: person.fullName,
  headline: person.headline,
  bio: person.bio,
  location: placeOf(person),
  stage: person.stage,
  role: person.role,
  commitment: person.commitment,
  industry: person.industry,
  skills: person.skills,
  lookingFor: person.lookingFor,
  interests: person.interests,
  timezone: person.timezone,
 } as unknown as UserProfile));
}

const DIRECTORY = directoryProfiles();

const STAGES = ['Idea', 'Pre-seed', 'Seed', 'Series A', 'Growth'];
const ROLES = ['Technical Founder', 'Product Founder', 'Business Founder', 'Growth Founder', 'Design Founder'];
const COMMITMENTS = ['Full-time', 'Part-time', 'Side Project', 'Advisory'];

export default function MatchDiscovery() {
 const { user: currentUser, profile: viewerProfile, isDemoMode } = useAuth();
 const navigate = useNavigate();
 const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
 const [profiles, setProfiles] = useState<UserProfile[]>(DIRECTORY);
 const [loading, setLoading] = useState(true);
 const [connecting, setConnecting] = useState<string | null>(null);
 const storedFilters = useStored(readMatchFilters, ['cfb.matchFilters']);
 const [searchQuery, setSearchQuery] = useState(() => storedFilters.q);
 const [showFilters, setShowFilters] = useState(false);
 const savedIds = useStored(() => readSaved().map((item) => item.id), ['cfb.savedProfiles']);
 const [filters, setFilters] = useState({
  stage: storedFilters.stage,
  role: storedFilters.role,
  commitment: storedFilters.commitment,
  location: storedFilters.location
 });

 const persistFilters = (next: { q?: string; stage?: string; role?: string; commitment?: string; location?: string }) => {
  writeMatchFilters({
   q: next.q ?? searchQuery,
   role: next.role ?? filters.role,
   stage: next.stage ?? filters.stage,
   commitment: next.commitment ?? filters.commitment,
   location: next.location ?? filters.location,
   skill: storedFilters.skill,
  });
 };

 const handleConnect = async (e: React.MouseEvent, profile: UserProfile) => {
  e.stopPropagation();
  if (!currentUser) return;
  setConnecting(profile.uid);
  try {
   saveRequest({
    id: profile.uid,
    fullName: profile.fullName,
    role: profile.role,
    industry: profile.industry || '',
    location: profile.location || '',
    note: profile.headline || '',
    status: 'pending',
   });
   logActivity({ kind: 'request', title: `Requested ${profile.fullName}`, titleEl: `Αίτημα προς ${profile.fullName}`, href: `/profile/${profile.uid}` });
   toastSuccess('Request sent!', 'Your connection request has been sent.');
  } catch (error) {
   toastError('Failed to send request', 'Please try again.');
  } finally {
   setConnecting(null);
  }
 };

 const handleSave = (e: React.MouseEvent, profile: UserProfile) => {
  e.stopPropagation();
  const id = profile.uid;
  if (savedIds.includes(id)) removeSaved(id);
  else saveProfile({
   id,
   fullName: profile.fullName,
   role: profile.role,
   industry: profile.industry || '',
   location: profile.location || '',
   note: profile.headline || '',
  });
 };

 const handleMessage = (e: React.MouseEvent, targetUid: string) => {
  e.stopPropagation();
  navigate(`/messages?user=${targetUid}`);
 };

 const loadMore = () => {
  toastInfo('Loading more', 'Fetching additional profiles...');
 };

 useEffect(() => {
  const fetchProfiles = async () => {
   setProfiles(DIRECTORY);
   setLoading(!isDemoMode);
   if (isDemoMode) {
    setLoading(false);
    return;
   }
   try {
    const q = query(
     collection(db, 'profiles'),
     limit(20)
    );
    const querySnapshot = await getDocs(q);
    const fetchedProfiles = querySnapshot.docs
     .map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile))
     .filter(p => p.uid !== currentUser?.uid);

    if (fetchedProfiles.length > 0) setProfiles(fetchedProfiles);
    else setProfiles(DIRECTORY);
   } catch (error) {
    console.error('Error fetching profiles:', error);
    setProfiles(DIRECTORY);
   } finally {
    setLoading(false);
   }
  };

  fetchProfiles();
 }, [currentUser, isDemoMode]);

 const viewer = fromProfile(viewerProfile);
 const filteredProfiles = profiles.filter(profile => {
  const haystack = `${profile.fullName} ${profile.headline} ${profile.bio} ${(profile.skills || []).join(' ')}`.toLowerCase();
  const matchesSearch = !searchQuery || haystack.includes(searchQuery.toLowerCase());
  const matchesStage = !filters.stage || profile.stage === filters.stage;
  const matchesRole = !filters.role || profile.role === filters.role;
  const matchesCommitment = !filters.commitment || profile.commitment === filters.commitment;
  const matchesLocation = !filters.location || (profile.location || '').toLowerCase().includes(filters.location.toLowerCase());

  return matchesSearch && matchesStage && matchesRole && matchesCommitment && matchesLocation;
 }).slice().sort((a, b) => {
  const sa = compatibility(viewer, fromCast({ skills: a.skills, lookingFor: a.lookingFor, interests: a.interests, industry: a.industry, stage: a.stage, commitment: a.commitment, city: a.location?.split(',')[0], timezone: a.timezone })).score ?? -1;
  const sb = compatibility(viewer, fromCast({ skills: b.skills, lookingFor: b.lookingFor, interests: b.interests, industry: b.industry, stage: b.stage, commitment: b.commitment, city: b.location?.split(',')[0], timezone: b.timezone })).score ?? -1;
  return sb - sa;
 });
 const filterCause = [
  searchQuery.trim() && `search “${searchQuery.trim()}”`,
  filters.stage && `stage ${filters.stage}`,
  filters.role && `role ${filters.role}`,
  filters.commitment && `commitment ${filters.commitment}`,
  filters.location && `location ${filters.location}`,
 ].filter(Boolean).join(', ');

 return (
  <PageShell
   title="Discover Co-Founders"
   description="Find entrepreneurs and builders who complement your skills."
  >
   <div className="space-y-5">
    {/* Search & Filters */}
    <div className="space-y-3">

    <div className="flex gap-2">
     <div className="flex-1 relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
      <input 
       type="text"
       placeholder="Search by skills, interests, or headline..."
       value={searchQuery}
       onChange={(e) => { setSearchQuery(e.target.value); persistFilters({ q: e.target.value }); }}
       className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 transition-all"
      />
     </div>
     <button 
      onClick={() => setShowFilters(!showFilters)}
      className={cn(
       "flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border",
       showFilters 
        ? "bg-stone-900 text-white border-stone-900" 
        : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
      )}
     >
      <SlidersHorizontal className="w-3.5 h-3.5" />
      Filters
      {Object.values(filters).filter(Boolean).length > 0 && (
       <span className="ml-1 px-1.5 py-0.5 bg-stone-100 text-stone-900 rounded text-[10px] font-semibold">
        {Object.values(filters).filter(Boolean).length}
       </span>
      )}
     </button>
    </div>
    {searchQuery.trim().length > 1 && (
     <p className="text-xs text-stone-400">Will search names, headlines, and skills for “{searchQuery.trim()}”.</p>
    )}

    <AnimatePresence>
     {showFilters && (
      <motion.div 
       initial={{ opacity: 0, y: -8 }}
       animate={{ opacity: 1, y: 0 }}
       exit={{ opacity: 0, y: -8 }}
       className="bg-white p-4 rounded-2xl border border-stone-200 grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
       {[{ label: 'Stage', key: 'stage', opts: STAGES }, { label: 'Role', key: 'role', opts: ROLES }, { label: 'Commitment', key: 'commitment', opts: COMMITMENTS }].map(({ label, key, opts }) => (
        <div key={key} className="space-y-1.5">
         <label className="text-[10px] font-semibold text-stone-400 tracking-wider">{label}</label>
         <select 
          value={(filters as any)[key]}
          onChange={(e) => { const next = {...filters, [key]: e.target.value}; setFilters(next); persistFilters(next); }}
          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 outline-none focus:ring-1 focus:ring-stone-900"
         >
          <option value="">All</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
         </select>
        </div>
       ))}
       <div className="flex items-end">
        <button 
         onClick={() => setFilters({ stage: '', role: '', commitment: '', location: '' })}
         className="w-full py-2 text-xs font-medium text-stone-400 hover:text-stone-900 border border-stone-200 rounded-lg transition-colors bg-white"
        >
         Reset
        </button>
       </div>
      </motion.div>
     )}
    </AnimatePresence>
   </div>

   {/* Results */}
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {loading ? (
     Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="bg-white rounded-2xl border border-stone-100 p-5 space-y-4 animate-pulse">
       <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-stone-100 rounded-xl shrink-0" />
        <div className="space-y-2 flex-1">
         <div className="h-3 bg-stone-100 rounded w-3/4" />
         <div className="h-2.5 bg-stone-100 rounded w-1/2" />
        </div>
       </div>
       <div className="space-y-2">
        <div className="h-2.5 bg-stone-100 rounded w-full" />
        <div className="h-2.5 bg-stone-100 rounded w-5/6" />
       </div>
       <div className="h-8 bg-stone-100 rounded-xl w-full" />
      </div>
     ))
    ) : filteredProfiles.length > 0 ? (
     filteredProfiles.map((profile, idx) => {
      const explained = compatibility(viewer, fromCast({
       skills: profile.skills,
       lookingFor: profile.lookingFor,
       interests: profile.interests,
       industry: profile.industry,
       stage: profile.stage,
       commitment: profile.commitment,
       city: profile.location?.split(',')[0],
       timezone: profile.timezone,
      }));
      return (
      <motion.div 
       key={`${profile.uid}-${idx}`}
       initial={{ opacity: 0, y: 12 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ delay: idx * 0.04 }}
       onClick={() => { rememberPerson({ id: profile.uid, fullName: profile.fullName, headline: profile.headline, location: profile.location, role: profile.role, industry: profile.industry || '', bio: profile.bio }); navigate(`/profile/${profile.uid}`); }}
       className="bg-white rounded-2xl border border-stone-100 p-5 hover:border-stone-300 hover:shadow-md transition-all group cursor-pointer"
      >
       <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
         <Avatar
          src={avatarFor(profile.uid)}
          fallback={profile.fullName || 'Founder'}
          size="lg"
          className="w-11 h-11"
         />
         <div>
          <p className="text-sm font-medium text-stone-900 group-hover:text-stone-700">
           {profile.fullName || profile.headline?.split(' at ')[0] || 'Founder'}
          </p>
          <p className="text-xs text-stone-400 line-clamp-1">{profile.headline}</p>
          {explained.headline && <p className="text-xs text-stone-500">{explained.headline.en} · {explained.headline.el}</p>}
         </div>
        </div>
        <span className="text-xs font-semibold text-stone-900 bg-stone-50 border border-stone-200 px-2 py-1 rounded-lg shrink-0">{explained.score == null ? '—' : `${explained.score}%`}</span>
       </div>

       <p className="text-xs text-stone-500 leading-relaxed line-clamp-2 mb-4">
        {profile.bio || 'Passionate founder looking for the right partner.'}
       </p>

       <FactLine className="mb-4" items={[profile.stage, profile.commitment, profile.location]} label="Profile facts" />

       <div className="flex items-center gap-2">
        <button
         type="button"
         onClick={(e) => {
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Why do I match with ${profile.fullName}?`, context: profile.fullName } }));
         }}
         className="px-2 py-2 bg-stone-50 text-stone-700 rounded-xl hover:bg-stone-100 transition-all border border-stone-100 text-xs font-medium"
        >
         Ask
        </button>
        <button 
         onClick={(e) => handleConnect(e, profile)}
         disabled={connecting === profile.uid}
         className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-stone-900 text-white rounded-xl text-xs font-medium hover:bg-stone-800 transition-all disabled:opacity-50"
        >
         <UserPlus className="w-3.5 h-3.5" />
         {connecting === profile.uid ? 'Sending...' : 'Connect'}
        </button>
        <button 
         onClick={(e) => handleMessage(e, profile.uid)}
         className="p-2 bg-stone-50 text-stone-700 rounded-xl hover:bg-stone-100 transition-all border border-stone-100"
        >
         <MessageSquare className="w-3.5 h-3.5" />
        </button>
        <button
         type="button"
         onClick={(e) => handleSave(e, profile)}
         className="p-2 bg-stone-50 text-stone-700 rounded-xl hover:bg-stone-100 transition-all border border-stone-100"
        >
         <Star className={cn('w-3.5 h-3.5', savedIds.includes(profile.uid) && 'fill-current text-amber-500')} />
        </button>
       </div>
      </motion.div>
      );
     })
    ) : (
     <EmptyHint className="col-span-full" title={filterCause ? `No founders match ${filterCause}.` : 'No founders found'} detail="Clear that filter, or ask the studio assistant who still ranks on this profile.">
       <button 
        type="button"
        onClick={() => { setSearchQuery(''); setFilters({ stage: '', role: '', commitment: '', location: '' }); }}
        className="text-xs font-medium text-stone-900 hover:underline"
       >
        Clear filters
       </button>
       <AskLink prompt="who is my best match" />
     </EmptyHint>
    )}
   </div>

   {!loading && !isDemoMode && filteredProfiles.length > 0 && (
    <div className="flex justify-center">
     <button 
      onClick={loadMore}
      className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-600 hover:text-stone-900 hover:border-stone-300 transition-all flex items-center gap-2"
     >
      Load more founders <ChevronDown className="w-3.5 h-3.5" />
     </button>
    </div>
   )}
  </div>
  </PageShell>
 );
}
