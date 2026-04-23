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
import { useAuth } from '../App';

const STAGES = ['Idea', 'Pre-seed', 'Seed', 'Series A', 'Growth'];
const ROLES = ['Technical Founder', 'Product Founder', 'Business Founder', 'Growth Founder', 'Design Founder'];
const COMMITMENTS = ['Full-time', 'Part-time', 'Side Project', 'Advisory'];

export default function MatchDiscovery() {
 const { user: currentUser } = useAuth();
 const navigate = useNavigate();
 const [profiles, setProfiles] = useState<UserProfile[]>([]);
 const [loading, setLoading] = useState(true);
 const [connecting, setConnecting] = useState<string | null>(null);
 const [searchQuery, setSearchQuery] = useState('');
 const [showFilters, setShowFilters] = useState(false);
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
   alert('Connection request sent!');
  } catch (error) {
   console.error('Error connecting:', error);
  } finally {
   setConnecting(null);
  }
 };

 const handleMessage = (e: React.MouseEvent, targetUid: string) => {
  e.stopPropagation();
  navigate(`/messages?user=${targetUid}`);
 };

 const loadMore = () => {
  // Mock load more
  alert('Loading more profiles...');
 };

 useEffect(() => {
  const fetchProfiles = async () => {
   setLoading(true);
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
    
    setProfiles(fetchedProfiles);
   } catch (error) {
    console.error('Error fetching profiles:', error);
   } finally {
    setLoading(false);
   }
  };

  fetchProfiles();
 }, [currentUser]);

 const filteredProfiles = profiles.filter(profile => {
  const matchesSearch = profile.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
             profile.bio.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesStage = !filters.stage || profile.stage === filters.stage;
  const matchesRole = !filters.role || profile.role === filters.role;
  const matchesCommitment = !filters.commitment || profile.commitment === filters.commitment;
  
  return matchesSearch && matchesStage && matchesRole && matchesCommitment;
 });

 return (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
   {/* Header & Search */}
   <div className="space-y-8">
    <div className="text-center max-w-3xl mx-auto space-y-4">
     <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-medium text-stone-900 tracking-tight">
      Find Your Perfect <span className="text-stone-400">Co-Founder</span>
     </h1>
     <p className="text-sm sm:text-base lg:text-lg text-stone-500 font-medium">
      Discover entrepreneurs, builders, and visionaries who share your passion and complement your skills.
     </p>
    </div>

    <div className="flex flex-col md:flex-row gap-4">
     <div className="flex-1 relative group">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
      <input 
       type="text"
       placeholder="Search by skills, interests, or headline..."
       value={searchQuery}
       onChange={(e) => setSearchQuery(e.target.value)}
       className="w-full pl-12 pr-4 py-4 bg-white border border-stone-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-stone-900 focus:border-transparent outline-none transition-all text-stone-900 font-medium"
      />
     </div>
     <button 
      onClick={() => setShowFilters(!showFilters)}
      className={cn(
       "flex items-center gap-2 px-4 py-2 rounded-2xl font-medium transition-all border",
       showFilters 
        ? "bg-stone-900 text-white border-stone-900 shadow-lg shadow-stone-900/20" 
        : "bg-white text-stone-600 border-stone-100 hover:border-stone-300 shadow-sm"
      )}
     >
      <SlidersHorizontal className="w-5 h-5" />
      Filters
      {Object.values(filters).filter(Boolean).length > 0 && (
       <span className="ml-1 px-2 py-0.5 bg-stone-100 text-stone-900 rounded-full text-xs">
        {Object.values(filters).filter(Boolean).length}
       </span>
      )}
     </button>
    </div>

    {/* Filters Panel */}
    <AnimatePresence>
     {showFilters && (
      <motion.div 
       initial={{ opacity: 0, y: -20 }}
       animate={{ opacity: 1, y: 0 }}
       exit={{ opacity: 0, y: -20 }}
       className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-100 shadow-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      >
       <div className="space-y-2">
        <label className="text-xs font-medium text-stone-400 uppercase tracking-widest">Startup Stage</label>
        <select 
         value={filters.stage}
         onChange={(e) => setFilters({...filters, stage: e.target.value})}
         className="w-full bg-stone-50 border-none rounded-xl px-4 py-3 text-sm font-medium text-stone-900 outline-none focus:ring-2 focus:ring-stone-900"
        >
         <option value="">All Stages</option>
         {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
       </div>
       <div className="space-y-2">
        <label className="text-xs font-medium text-stone-400 uppercase tracking-widest">Ideal Role</label>
        <select 
         value={filters.role}
         onChange={(e) => setFilters({...filters, role: e.target.value})}
         className="w-full bg-stone-50 border-none rounded-xl px-4 py-3 text-sm font-medium text-stone-900 outline-none focus:ring-2 focus:ring-stone-900"
        >
         <option value="">All Roles</option>
         {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
       </div>
       <div className="space-y-2">
        <label className="text-xs font-medium text-stone-400 uppercase tracking-widest">Commitment</label>
        <select 
         value={filters.commitment}
         onChange={(e) => setFilters({...filters, commitment: e.target.value})}
         className="w-full bg-stone-50 border-none rounded-xl px-4 py-3 text-sm font-medium text-stone-900 outline-none focus:ring-2 focus:ring-stone-900"
        >
         <option value="">All Commitments</option>
         {COMMITMENTS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
       </div>
       <div className="flex items-end">
        <button 
         onClick={() => setFilters({ stage: '', role: '', commitment: '', location: '' })}
         className="w-full py-3 text-sm font-medium text-stone-400 hover:text-stone-900 transition-colors"
        >
         Reset All Filters
        </button>
       </div>
      </motion.div>
     )}
    </AnimatePresence>
   </div>

   {/* Results Grid */}
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
    {loading ? (
     Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="bg-white rounded-3xl border border-stone-100 p-6 sm:p-8 space-y-6 animate-pulse">
       <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-stone-100 rounded-2xl" />
        <div className="space-y-2 flex-1">
         <div className="h-4 bg-stone-100 rounded w-3/4" />
         <div className="h-3 bg-stone-100 rounded w-1/2" />
        </div>
       </div>
       <div className="space-y-2">
        <div className="h-3 bg-stone-100 rounded w-full" />
        <div className="h-3 bg-stone-100 rounded w-full" />
       </div>
       <div className="h-10 bg-stone-100 rounded-xl w-full" />
      </div>
     ))
    ) : filteredProfiles.length > 0 ? (
     filteredProfiles.map((profile, idx) => (
      <motion.div 
       key={`${profile.uid}-${idx}`}
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ delay: idx * 0.05 }}
       onClick={() => navigate(`/profile/${profile.uid}`)}
       className="bg-white rounded-3xl border border-stone-100 p-6 sm:p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer"
      >
       <div className="flex items-start justify-between mb-6">
        <div className="relative">
         <img 
          src={`https://picsum.photos/seed/${profile.uid}/150/150`} 
          alt="Founder" 
          className="w-20 h-20 rounded-2xl object-cover shadow-lg"
          referrerPolicy="no-referrer"
         />
         <div className="absolute -bottom-2 -right-2 bg-stone-900 text-white p-1.5 rounded-lg border-2 border-white shadow-md">
          <Zap className="w-3 h-3" />
         </div>
        </div>
        <div className="flex flex-col items-end">
         <div className="flex items-center gap-1 text-amber-400">
          <Star className="w-4 h-4 fill-amber-400" />
          <span className="text-sm font-medium text-stone-900">92%</span>
         </div>
         <span className="text-xs font-medium text-stone-400 uppercase tracking-widest mt-1">Match Score</span>
        </div>
       </div>

       <div className="space-y-4">
        <div>
         <h3 className="text-lg sm:text-xl md:text-2xl font-medium text-stone-900 group-hover:text-stone-700 transition-colors">
          {profile.headline.split(' at ')[0] || 'Founder'}
         </h3>
         <p className="text-sm font-medium text-stone-500 mt-1 line-clamp-1">{profile.headline}</p>
        </div>

        <p className="text-stone-500 text-xs sm:text-sm md:text-base leading-relaxed line-clamp-3">
         {profile.bio || 'Passionate founder looking for the right partner to build something meaningful.'}
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
         <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 text-stone-600 rounded-lg text-xs font-medium border border-stone-100">
          <Briefcase className="w-3 h-3" />
          {profile.stage}
         </div>
         <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 text-stone-600 rounded-lg text-xs font-medium border border-stone-100">
          <Target className="w-3 h-3" />
          {profile.commitment}
         </div>
        </div>

        <div className="pt-6 flex items-center gap-3">
         <button 
          onClick={(e) => handleConnect(e, profile.uid)}
          disabled={connecting === profile.uid}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all shadow-lg shadow-stone-900/10 disabled:opacity-50"
         >
          <UserPlus className="w-4 h-4" />
          {connecting === profile.uid ? 'Connecting...' : 'Connect'}
         </button>
         <button 
          onClick={(e) => handleMessage(e, profile.uid)}
          className="p-3 bg-stone-50 text-stone-900 rounded-xl hover:bg-stone-100 transition-all border border-stone-100"
         >
          <MessageSquare className="w-4 h-4" />
         </button>
        </div>
       </div>
      </motion.div>
     ))
    ) : (
     <div className="col-span-full py-20 text-center space-y-4">
      <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto text-stone-300">
       <Search className="w-10 h-10" />
      </div>
      <h3 className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900">No matches found</h3>
      <p className="text-stone-500 max-w-sm mx-auto">
       Try adjusting your filters or search query to find more founders in the ecosystem.
      </p>
      <button 
       onClick={() => {
        setSearchQuery('');
        setFilters({ stage: '', role: '', commitment: '', location: '' });
       }}
       className="text-stone-900 font-medium hover:underline"
      >
       Clear all filters
      </button>
     </div>
    )}
   </div>

   {/* Load More */}
   {!loading && filteredProfiles.length > 0 && (
    <div className="flex justify-center pt-8">
     <button 
      onClick={loadMore}
      className="px-4 py-2 bg-white border border-stone-100 rounded-2xl font-medium text-stone-600 hover:text-stone-900 hover:border-stone-300 shadow-sm transition-all flex items-center gap-2 group"
     >
      Load More Founders
      <ChevronDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
     </button>
    </div>
   )}
  </div>
 );
}
