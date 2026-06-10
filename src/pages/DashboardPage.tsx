import React, { useState, useEffect } from 'react';

import { NavLink, useNavigate } from 'react-router-dom';

import { 

 Users, 

 MessageSquare, 

 Target, 

 TrendingUp, 

 ArrowRight, 

 Search, 

 Plus, 

 Bell,

 Star,

 CheckCircle2,

 Clock,

 Zap,

 MoreVertical,

 Calendar,

 Award,

 Flame,

 BookOpen,

 Coffee,

 Sparkles,

 ShieldCheck,

 Rocket,

 Filter

} from 'lucide-react';

import { 

 LineChart, 

 Line, 

 XAxis, 

 YAxis, 

 CartesianGrid, 

 Tooltip, 

 ResponsiveContainer,

 AreaChart,

 Area,

 PieChart,

 Pie,

 Cell

} from 'recharts';

import { motion, AnimatePresence } from 'motion/react';

import { cn } from '../lib/utils';

import { useAuth } from '../App';

import PageShell from '../components/ui/PageShell';

import { getNextBestActions, NextBestAction, logNudgeExposure, logNudgeConversion } from '../services/behavioralOptimizer';

import { doc, onSnapshot } from 'firebase/firestore';

import { db } from '../firebase';

import { Streak, ReadinessScore } from '../types';



const ACTIVITY_DATA = [

 { name: 'Mon', views: 40, matches: 24 },

 { name: 'Tue', views: 30, matches: 13 },

 { name: 'Wed', views: 20, matches: 98 },

 { name: 'Thu', views: 27, matches: 39 },

 { name: 'Fri', views: 18, matches: 48 },

 { name: 'Sat', views: 23, matches: 38 },

 { name: 'Sun', views: 34, matches: 43 },

];



const RECENT_MATCHES = [

 { id: '1', name: 'Alex Rivera', role: 'CTO / Full-stack', match: 94, avatar: 'https://picsum.photos/seed/alex/100/100' },

 { id: '2', name: 'Sarah Chen', role: 'Product Designer', match: 88, avatar: 'https://picsum.photos/seed/sarah/100/100' },

 { id: '3', name: 'Marcus Thorne', role: 'Growth Marketer', match: 82, avatar: 'https://picsum.photos/seed/marcus/100/100' },

];



const ACTIVE_COMMUNITIES = [

 { id: '1', name: 'Fintech Founders', members: '1.2k', newPosts: 12 },

 { id: '2', name: 'AI & Machine Learning', members: '3.4k', newPosts: 45 },

];



export default function DashboardPage() {

 const { user, profile, isDemoMode } = useAuth();

 const navigate = useNavigate();

 const [loading, setLoading] = useState(true);

 const [nextActions, setNextActions] = useState<NextBestAction[]>([]);

 const [streak, setStreak] = useState<Streak | null>(null);

 const [readiness, setReadiness] = useState<ReadinessScore | null>(null);

 const [userStats, setUserStats] = useState({ totalXP: 0, level: 1 });

 const [searchQuery, setSearchQuery] = useState('');

 const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());



 // Calculate profile completion

 const getProfileCompletion = () => {

  if (!profile) return { score: 0, missing: ['Basic Info'] };

  let score = 0;

  const missing = [];



  if (profile.fullName) score += 20; else missing.push('Full Name');

  if (profile.bio) score += 20; else missing.push('Bio');

  if (profile.role) score += 10; else missing.push('Role');

  if (profile.industry) score += 10; else missing.push('Industry');

  if (profile.skills && profile.skills.length > 0) score += 20; else missing.push('Skills');

  if (profile.location) score += 10; else missing.push('Location');

  if (profile.socialLinks && Object.keys(profile.socialLinks).length > 0) score += 10; else missing.push('Social Links');



  return { score, missing };

 };



 const { score, missing } = getProfileCompletion();



 const HABITS = [

  { id: '1', title: 'Daily Discovery', description: 'View 5 new founder profiles', icon: Search, progress: 3, total: 5, color: 'blue' },

  { id: '2', title: 'Network Growth', description: 'Send 2 connection requests', icon: Users, progress: 1, total: 2, color: 'purple' },

  { id: '3', title: 'Community Voice', description: 'Post 1 update in a community', icon: MessageSquare, progress: 0, total: 1, color: 'amber' },

 ];



 const UPCOMING_EVENTS = [

  { id: '1', title: 'Startup Pitch Night', date: 'Tomorrow, 6:00 PM', type: 'Pitch', attendees: 45 },

  { id: '2', title: 'AI in SaaS Workshop', date: 'Oct 12, 4:00 PM', type: 'Workshop', attendees: 120 },

 ];



 useEffect(() => {

  if (user) {

   setLoading(false);

   

   // Fetch Next Best Actions (graceful failure)

   getNextBestActions(user.uid).then(actions => {

    setNextActions(actions);

    const firstAction = actions[0];

    if (firstAction) {

     logNudgeExposure(user.uid, firstAction.id, 'dashboard_hero');

    }

   }).catch(() => {});



   if (isDemoMode) return;



   // Listen to Firestore — wrapped in try/catch to prevent loading freeze

   let unsubUser: (() => void) | undefined;

   let unsubStreak: (() => void) | undefined;

   let unsubReadiness: (() => void) | undefined;

   try {

    unsubUser = onSnapshot(doc(db, 'users', user.uid), (doc) => {

     if (doc.exists()) {

      const data = doc.data();

      const xp = data.totalXP || 0;

      setUserStats({

       totalXP: xp,

       level: Math.floor(Math.sqrt(xp / 100)) + 1

      });

     }

    }, (error) => {

     console.error('Error listening to user stats:', error);

    });



    unsubStreak = onSnapshot(doc(db, 'streaks', user.uid), (doc) => {

     if (doc.exists()) setStreak(doc.data() as Streak);

    }, (error) => {

     console.error('Error listening to streak:', error);

    });



    unsubReadiness = onSnapshot(doc(db, 'readinessScores', user.uid), (doc) => {

     if (doc.exists()) setReadiness(doc.data() as ReadinessScore);

    }, (error) => {

     console.error('Error listening to readiness score:', error);

    });

   } catch (err) {

    console.warn('Firestore listeners failed to initialize:', err);

   }



   return () => {

    unsubUser?.();

    unsubStreak?.();

    unsubReadiness?.();

   };

  } else {

   // No user available — stop loading to prevent infinite spinner

   setLoading(false);

  }

  return undefined;

 }, [user]);



 const heroAction = nextActions[0];

 const handleActionClick = (action: NextBestAction) => {

  logNudgeConversion(user!.uid, action.id);

  navigate(`/${action.section}`);

 };



 if (loading) {

  return (

   <div className="min-h-screen flex items-center justify-center bg-stone-50">

    <div className="flex flex-col items-center gap-4">

     <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin" />

     <p className="text-stone-500 font-medium">Loading your ecosystem...</p>

    </div>

   </div>

  );

 }



 return (

  <PageShell

   title={`Good morning, ${user?.displayName?.split(' ')[0] || 'Founder'}`}

   description="Ready to build something great today?"

  >

   <div className="space-y-6">



    {/* Search Bar */}

    <div className="flex items-center gap-2">

     <div className="relative flex-1">

      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">

       <Search className="h-4 w-4 text-stone-400" />

      </div>

      <input

       type="text"

       value={searchQuery}

       onChange={(e) => setSearchQuery(e.target.value)}

       onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim()) navigate(`/discovery?q=${encodeURIComponent(searchQuery.trim())}`); }}

       className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 transition-all"

       placeholder="Search founders, mentors, communities..."

      />

     </div>

     <button onClick={() => navigate('/discovery')} className="flex items-center justify-center w-10 h-10 bg-white border border-stone-200 rounded-xl text-stone-400 hover:text-stone-900 hover:border-stone-300 transition-all shrink-0">

      <Filter className="w-4 h-4" />

     </button>

    </div>



    {/* Next Best Action */}

    <AnimatePresence mode="wait">

     {heroAction && (

      <motion.div 

       initial={{ opacity: 0, y: -8 }}

       animate={{ opacity: 1, y: 0 }}

       exit={{ opacity: 0, y: -8 }}

       className="bg-stone-900 rounded-2xl p-4 flex items-center justify-between"

      >

       <div className="flex items-center gap-3">

        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0">

         <CheckCircle2 className="w-4 h-4 text-white" />

        </div>

        <div>

         <p className="text-sm font-medium text-white">{heroAction.description}</p>

         <p className="text-xs text-stone-400">{heroAction.reason || 'Recommended action'}</p>

        </div>

       </div>

       <button 

        onClick={() => handleActionClick(heroAction)}

        className="px-4 py-2 bg-white text-stone-900 rounded-xl text-xs font-semibold hover:bg-stone-100 transition-colors whitespace-nowrap shrink-0"

       >

        Go

       </button>

      </motion.div>

     )}

    </AnimatePresence>



    {/* Recent Matches row */}

    <div className="overflow-x-auto -mx-1 px-1 pb-1">

     <div className="flex items-center gap-3 min-w-max">

      <div className="flex flex-col items-center gap-1.5 cursor-pointer group" onClick={() => navigate('/profile')}>

       <div className="relative">

        <img src={user?.photoURL || `https://picsum.photos/seed/${user?.uid || 'you'}/100/100`} alt="You" className="w-12 h-12 rounded-full object-cover border-2 border-stone-200 group-hover:scale-105 transition-transform" />

        <div className="absolute bottom-0 right-0 w-4 h-4 bg-stone-900 border-2 border-white rounded-full flex items-center justify-center">

         <Plus className="w-2.5 h-2.5 text-white" />

        </div>

       </div>

       <span className="text-[10px] font-medium text-stone-400">You</span>

      </div>

      {[...RECENT_MATCHES, { id: '4', name: 'Emma Kim', avatar: 'https://picsum.photos/seed/emma/100/100', role: '', match: 0 }, { id: '5', name: 'David Park', avatar: 'https://picsum.photos/seed/david/100/100', role: '', match: 0 }].map(match => (

       <div key={match.id} className="flex flex-col items-center gap-1.5 cursor-pointer group" onClick={() => navigate(`/profile/${match.id}`)}>

        <div className="w-12 h-12 rounded-full p-[2px] bg-stone-100 ring-1 ring-stone-200">

         <img src={match.avatar} alt={match.name} className="w-full h-full rounded-full object-cover border border-white group-hover:scale-95 transition-transform" />

        </div>

        <span className="text-[10px] font-medium text-stone-400">{match.name.split(' ')[0]}</span>

       </div>

      ))}

     </div>

    </div>



    {/* Activity Feed */}

    <div className="space-y-3">

     <div className="flex items-center justify-between">

      <p className="text-xs font-semibold text-stone-400 tracking-wider">Activity Feed</p>

      <div className="flex items-center gap-2">

       <button onClick={() => navigate('/milestones')} className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors">

        <TrendingUp className="w-3 h-3" /> Log Update

       </button>

       <button onClick={() => navigate('/communities')} className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 rounded-xl text-xs font-medium text-white hover:bg-stone-800 transition-colors">

        <Plus className="w-3 h-3" /> Post

       </button>

      </div>

     </div>



     {[{ match: RECENT_MATCHES[1], text: 'just reached a Match score of 98', time: '2h ago', likes: 4, comments: 1 }, { match: RECENT_MATCHES[0], text: 'hit a 10-day profile activity streak', time: '4h ago', likes: 12, comments: 3 }].filter((item): item is typeof item & { match: NonNullable<typeof item.match> } => Boolean(item.match)).map((item, i) => (

      <div key={i} className="bg-white rounded-2xl p-4 border border-stone-100">

       <div className="flex items-start gap-3">

        <img src={item.match.avatar} alt={item.match.name} className="w-9 h-9 rounded-full object-cover shrink-0 border border-stone-100 cursor-pointer hover:ring-2 hover:ring-stone-300 transition-all" onClick={() => navigate(`/profile/${item.match.id}`)} />

        <div className="flex-1 min-w-0">

         <p className="text-sm text-stone-900">

          <span className="font-medium">{item.match.name.split(' ')[0]}</span>{' '}

          <span className="text-stone-400">{item.text}</span>

         </p>

         <span className="text-xs text-stone-400">{item.time}</span>

        </div>

       </div>

       <div className="flex items-center gap-4 mt-3 ml-12">

        <button onClick={() => setLikedPosts(prev => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; })} className={cn('flex items-center gap-1 text-xs transition-colors', likedPosts.has(i) ? 'text-amber-500' : 'text-stone-400 hover:text-stone-600')}><Star className="w-3.5 h-3.5" fill={likedPosts.has(i) ? 'currentColor' : 'none'} /> {item.likes + (likedPosts.has(i) ? 1 : 0)}</button>

        <button onClick={() => navigate('/messages')} className="flex items-center gap-1 text-stone-400 hover:text-stone-600 text-xs"><MessageSquare className="w-3.5 h-3.5" /> {item.comments}</button>

       </div>

      </div>

     ))}

    </div>



    {/* KPI Row */}

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

     {[

      { label: 'Profile Views', value: '124', sub: 'this week', trend: 'up' as const, trendValue: '12%' },

      { label: 'Match Score', value: `${RECENT_MATCHES[0]!.match}%`, sub: 'top match', trend: 'up' as const, trendValue: '5%' },

      { label: 'Streak', value: `${streak?.currentStreak || 12}d`, sub: 'active days', trend: 'neutral' as const },

      { label: 'Messages', value: '3', sub: 'unread', trend: 'neutral' as const },

     ].map((s) => (

      <div key={s.label} onClick={() => navigate(s.label === 'Profile Views' ? '/profile' : s.label === 'Match Score' ? '/matches' : s.label === 'Streak' ? '/milestones' : '/messages')} className="bg-white rounded-2xl border border-stone-100 p-4 cursor-pointer hover:border-stone-300 hover:shadow-sm transition-all">

       <p className="text-[10px] font-semibold text-stone-400 tracking-wider">{s.label}</p>

       <p className="text-xl font-semibold text-stone-900 mt-1.5 tracking-tight tabular-nums">{s.value}</p>

       <p className={cn('text-xs mt-0.5', s.trend === 'up' ? 'text-emerald-600' : 'text-stone-400')}>

        {s.trend === 'up' ? '↑' : ''} {s.sub}

       </p>

      </div>

     ))}

    </div>



    {/* Top Match + Streak */}

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

     <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">

      <p className="text-[10px] font-semibold text-stone-400 tracking-wider mb-3">Co-founder Prospect</p>

      <div className="flex items-center gap-3">

       <div className="relative shrink-0">

        <img src={RECENT_MATCHES[1]!.avatar} alt="Sarah" className="w-11 h-11 rounded-full object-cover border border-stone-200" />

        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-stone-50 rounded-full" />

       </div>

       <div className="flex-1 min-w-0">

        <p className="text-sm font-medium text-stone-900">{RECENT_MATCHES[1]!.name}</p>

        <p className="text-xs text-stone-400">{RECENT_MATCHES[1]!.role}</p>

       </div>

       <span className="text-xs font-semibold text-stone-900 bg-white border border-stone-200 px-2 py-1 rounded-lg">{RECENT_MATCHES[1]!.match}%</span>

      </div>

      <div className="flex gap-2 mt-3">

       <button onClick={() => navigate('/messages')} className="flex-1 py-2 bg-stone-900 text-white rounded-xl text-xs font-medium hover:bg-stone-800 transition-colors">Connect</button>

       <button onClick={() => navigate(`/profile/${RECENT_MATCHES[1]!.id}`)} className="flex-1 py-2 bg-white border border-stone-200 text-stone-900 rounded-xl text-xs font-medium hover:bg-stone-50 transition-colors">View Profile</button>

      </div>

     </div>

     <div className="bg-white rounded-2xl p-4 border border-stone-100 flex flex-col justify-between">

      <p className="text-[10px] font-semibold text-stone-400 tracking-wider">Current Streak</p>

      <div>

       <p className="text-xl font-semibold text-stone-900 tracking-tight mt-2">{streak?.currentStreak || 12}<span className="text-sm font-medium text-stone-400">d</span></p>

       <div className="flex items-center gap-1.5 mt-2">

        <Flame className="w-3.5 h-3.5 text-amber-500" />

        <p className="text-xs text-stone-400">Keep the momentum going</p>

       </div>

      </div>

     </div>

    </div>



    {/* Profile completion */}

    <div className="bg-white rounded-2xl border border-stone-100 p-4">

     <div className="flex items-center justify-between mb-3">

      <div className="flex items-center gap-2">

       <Target className="w-4 h-4 text-stone-400" />

       <p className="text-sm font-medium text-stone-900">Complete your profile</p>

      </div>

      <span className="text-xs font-semibold text-stone-900">{score}%</span>

     </div>

     <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden">

      <div className="h-full bg-stone-900 rounded-full transition-all" style={{ width: `${score}%` }} />

     </div>

     {missing.length > 0 && (

      <div className="flex items-center justify-between mt-2">

       <p className="text-xs text-stone-400">Missing: {missing.slice(0, 3).join(', ')}{missing.length > 3 ? ` +${missing.length - 3} more` : ''}</p>

       <button onClick={() => navigate('/profile')} className="text-xs font-medium text-stone-900 hover:underline">Edit Profile →</button>

      </div>

     )}

    </div>



    {/* Upcoming events */}

    <div className="bg-white rounded-2xl border border-stone-100 p-4">

     <div className="flex items-center justify-between mb-4">

      <p className="text-xs font-semibold text-stone-400 tracking-wider">Upcoming</p>

      <NavLink to="/calendar" className="text-xs text-stone-400 hover:text-stone-900 transition-colors">View all →</NavLink>

     </div>

     <div className="space-y-4 relative">

      <div className="absolute left-1 top-2 bottom-2 w-px bg-stone-100" />

      {[

       { title: 'Downtown Pitch Club', time: 'Tomorrow, 7:00 AM', type: 'MEETUP' },

       { title: 'Weekend Builders Hackathon', time: 'Saturday, 8:00 AM', type: 'NETWORK' },

       { title: 'Pre-Seed Checklist Deadline', time: 'Next Friday', type: 'MILESTONE' },

      ].map((ev, i) => (

       <div key={i} className="pl-5 relative cursor-pointer hover:bg-stone-50/50 -mx-2 px-2 py-1 rounded-lg transition-colors" onClick={() => navigate(ev.type === 'MILESTONE' ? '/milestones' : '/events')}>

        <div className="absolute left-[-1px] top-2.5 w-2.5 h-2.5 rounded-full bg-stone-900 border-2 border-white" />

        <p className="text-sm font-medium text-stone-900 leading-tight">{ev.title}</p>

        <div className="flex items-center gap-2 mt-1">

         <Clock className="w-3 h-3 text-stone-400" />

         <span className="text-xs text-stone-400">{ev.time}</span>

         <span className="text-[10px] font-semibold tracking-wider bg-stone-50 border border-stone-100 text-stone-400 px-1.5 py-0.5 rounded">{ev.type}</span>

        </div>

       </div>

      ))}

     </div>

    </div>



    {/* Local meetups */}

    <div className="space-y-2">

     <div className="flex items-center justify-between">

      <p className="text-xs font-semibold text-stone-400 tracking-wider">Local Meetups</p>

      <button onClick={() => navigate('/events')} className="text-xs text-stone-400 hover:text-stone-900 transition-colors">See Map</button>

     </div>

     {[{ day: 'Tomorrow', time: '7:00', title: 'Downtown Pitch Club', location: 'Tech Hub HQ', attendees: 12 }, { day: 'Saturday', time: '9:00', title: 'Founder Coffee Meet', location: 'Riverside Cafe', attendees: 8 }].map((ev, i) => (

      <div key={i} className="bg-white rounded-2xl border border-stone-100 p-4 flex items-center gap-3 cursor-pointer hover:border-stone-300 hover:shadow-sm transition-all" onClick={() => navigate('/events')}>

       <div className="bg-stone-50 border border-stone-100 rounded-xl p-3 text-center shrink-0 min-w-[60px]">

        <p className="text-[10px] font-semibold text-stone-400 tracking-wider">{ev.day}</p>

        <p className="text-base font-semibold text-stone-900">{ev.time}</p>

       </div>

       <div className="flex-1 min-w-0">

        <p className="text-sm font-medium text-stone-900 truncate">{ev.title}</p>

        <div className="flex items-center gap-3 mt-1">

         <span className="text-xs text-stone-400">{ev.location}</span>

         <span className="text-xs text-stone-400">· {ev.attendees} attending</span>

        </div>

       </div>

      </div>

     ))}

    </div>



   </div>{/* end space-y-6 */}

  </PageShell>

 );

}

