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

import { readSaved, removeSaved, saveProfile } from '../lib/localLists';

const DEMO_MATCHES = [
 { uid: 'demo-sarah', fullName: 'Sarah Chen', headline: 'Product lead', bio: 'Building fintech tools.', location: 'NYC', stage: 'Pre-seed', role: 'FOUNDER', commitment: 'Full-time', industry: 'Fintech', skills: ['React'] },
 { uid: 'demo-alex', fullName: 'Alex Rivera', headline: 'Engineer', bio: 'Ships product with small teams.', location: 'SF', stage: 'Seed', role: 'FOUNDER', commitment: 'Full-time', industry: 'AI', skills: ['TypeScript'] },
 { uid: 'demo-marcus', fullName: 'Marcus Thorne', headline: 'Operator', bio: 'Looks for a technical co-founder.', location: 'London', stage: 'Idea', role: 'CO_FOUNDER_CANDIDATE', commitment: 'Part-time', industry: 'SaaS', skills: ['Sales'] },
] as UserProfile[];

import { useAuth } from '../App';

import { explainMatch } from '../lib/matchReason';

import PageShell from '../components/ui/PageShell';

import { useToast } from '../context/ToastContext';



const STAGES = ['Idea', 'Pre-seed', 'Seed', 'Series A', 'Growth'];

const ROLES = ['Technical Founder', 'Product Founder', 'Business Founder', 'Growth Founder', 'Design Founder'];

const COMMITMENTS = ['Full-time', 'Part-time', 'Side Project', 'Advisory'];



export default function MatchDiscovery() {

 const { user: currentUser, profile: viewerProfile, isDemoMode } = useAuth();

 const navigate = useNavigate();

 const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();

 const [profiles, setProfiles] = useState<UserProfile[]>([]);

 const [loading, setLoading] = useState(true);

 const [connecting, setConnecting] = useState<string | null>(null);

 const [searchQuery, setSearchQuery] = useState('');

 const [showFilters, setShowFilters] = useState(false);

 const [savedIds, setSavedIds] = useState<string[]>(() => readSaved().map((item) => item.id));

 const [filters, setFilters] = useState({

  stage: '',

  role: '',

  commitment: '',

  location: ''

 });



 const handleConnect = async (e: React.MouseEvent, targetUid: string) => {

  e.stopPropagation();

  if (!currentUser) return;

  setConnecting(targetUid);

  try {

   // Logic to send connection request

   await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay

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

  setSavedIds(readSaved().map((item) => item.id));

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

   if (isDemoMode) setProfiles(DEMO_MATCHES);

   setLoading(!isDemoMode);

   try {

    // In a real app, we'd use more complex queries and pagination

    const q = query(

     collection(db, 'profiles'),

     limit(20)

    );

    const querySnapshot = await getDocs(q);

    const fetchedProfiles = querySnapshot.docs

     .map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile))

     .filter(p => p.uid !== currentUser?.uid); // Don't show self

    

    if (fetchedProfiles.length > 0) setProfiles(fetchedProfiles);
    else if (isDemoMode) setProfiles(DEMO_MATCHES);

   } catch (error) {

    console.error('Error fetching profiles:', error);

   } finally {

    setLoading(false);

   }

  };



  fetchProfiles();

 }, [currentUser, isDemoMode]);



 const filteredProfiles = profiles.filter(profile => {

  const matchesSearch = profile.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||

             profile.bio.toLowerCase().includes(searchQuery.toLowerCase());

  const matchesStage = !filters.stage || profile.stage === filters.stage;

  const matchesRole = !filters.role || profile.role === filters.role;

  const matchesCommitment = !filters.commitment || profile.commitment === filters.commitment;

  

  return matchesSearch && matchesStage && matchesRole && matchesCommitment;

 });



 const viewerSkills = viewerProfile?.skills;

 const viewerIndustry = viewerProfile?.industry ?? (viewerProfile as { profile?: { industry?: string | string[] } } | null)?.profile?.industry;



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

       onChange={(e) => setSearchQuery(e.target.value)}

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

          onChange={(e) => setFilters({...filters, [key]: e.target.value})}

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

      const explained = explainMatch(viewerSkills, viewerIndustry, profile.skills, profile.industry);

      return (

      <motion.div 

       key={`${profile.uid}-${idx}`}

       initial={{ opacity: 0, y: 12 }}

       animate={{ opacity: 1, y: 0 }}

       transition={{ delay: idx * 0.04 }}

       onClick={() => navigate(`/profile/${profile.uid}`)}

       className="bg-white rounded-2xl border border-stone-100 p-5 hover:border-stone-300 hover:shadow-md transition-all group cursor-pointer"

      >

       <div className="flex items-start justify-between mb-4">

        <div className="flex items-center gap-3">

         <img 

          src={`https://picsum.photos/seed/${profile.uid}/100/100`} 

          alt="Founder" 

          className="w-11 h-11 rounded-xl object-cover border border-stone-100"

          referrerPolicy="no-referrer"

         />

         <div>

          <p className="text-sm font-medium text-stone-900 group-hover:text-stone-700">

           {profile.headline?.split(' at ')[0] || 'Founder'}

          </p>

          <p className="text-xs text-stone-400 line-clamp-1">{profile.headline}</p>

          {explained.reasonPhrase && <p className="text-xs text-stone-400">{explained.reasonPhrase}</p>}

         </div>

        </div>

        <span className="text-xs font-semibold text-stone-900 bg-stone-50 border border-stone-200 px-2 py-1 rounded-lg shrink-0">{explained.pct == null ? '—' : `${explained.pct}%`}</span>

       </div>



       <p className="text-xs text-stone-500 leading-relaxed line-clamp-2 mb-4">

        {profile.bio || 'Passionate founder looking for the right partner.'}

       </p>



       <div className="flex flex-wrap gap-1.5 mb-4">

        {profile.stage && (

         <span className="px-2 py-1 bg-stone-50 text-stone-600 rounded-lg text-[10px] font-medium border border-stone-100">{profile.stage}</span>

        )}

        {profile.commitment && (

         <span className="px-2 py-1 bg-stone-50 text-stone-600 rounded-lg text-[10px] font-medium border border-stone-100">{profile.commitment}</span>

        )}

       </div>



       <div className="flex items-center gap-2">

        <button 

         onClick={(e) => handleConnect(e, profile.uid)}

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

     <div className="col-span-full py-16 text-center">

      <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center mx-auto text-stone-300 mb-4">

       <Search className="w-7 h-7" />

      </div>

      <p className="text-sm font-medium text-stone-900 mb-1">No founders found</p>

      <p className="text-xs text-stone-400 mb-4">Try adjusting your filters or search query.</p>

      <button 

       onClick={() => { setSearchQuery(''); setFilters({ stage: '', role: '', commitment: '', location: '' }); }}

       className="text-xs font-medium text-stone-900 hover:underline"

      >

       Clear filters

      </button>

     </div>

    )}

   </div>



   {!loading && filteredProfiles.length > 0 && (

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

