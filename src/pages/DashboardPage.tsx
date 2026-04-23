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
   
   // Fetch Next Best Actions
   getNextBestActions(user.uid).then(actions => {
    setNextActions(actions);
    // Log exposure for the first action
    if (actions.length > 0) {
     logNudgeExposure(user.uid, actions[0].id, 'dashboard_hero');
    }
   });

   if (isDemoMode) return;

   // Listen to user stats
   const unsubUser = onSnapshot(doc(db, 'users', user.uid), (doc) => {
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

   // Listen to streak
   const unsubStreak = onSnapshot(doc(db, 'streaks', user.uid), (doc) => {
    if (doc.exists()) setStreak(doc.data() as Streak);
   }, (error) => {
    console.error('Error listening to streak:', error);
   });

   // Listen to readiness score (assuming user is in a workspace with same ID for demo)
   const unsubReadiness = onSnapshot(doc(db, 'readinessScores', user.uid), (doc) => {
    if (doc.exists()) setReadiness(doc.data() as ReadinessScore);
   }, (error) => {
    console.error('Error listening to readiness score:', error);
   });

   return () => {
    unsubUser();
    unsubStreak();
    unsubReadiness();
   };
  }
 }, [user]);

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
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
   {/* Header Section */}
   <div className="flex flex-col gap-6 w-full">
    <div className="flex items-center justify-between mt-2">
     <div className="space-y-1">
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
       Good morning, {user?.displayName?.split(' ')[0] || 'Founder'}
      </h1>
      <p className="text-sm text-slate-400 font-medium tracking-wide">
       Ready to crush your goals today?
      </p>
     </div>
    </div>

    {/* Search Bar - Screenshot Match */}
    <div className="flex items-center gap-3 w-full">
     <div className="relative flex-1">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
       <Search className="h-5 w-5 text-slate-400" />
      </div>
      <input
       type="text"
       className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-100 rounded-full text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent font-medium shadow-sm"
       placeholder="Search founders, communities, or mentors..."
      />
     </div>
     <button className="flex items-center justify-center w-12 h-12 bg-white border border-slate-100 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm shrink-0">
      <Filter className="w-5 h-5" />
     </button>
    </div>
   </div>

   {/* Main Layout matches mobile-first flow from screenshots */}
   <div className="flex flex-col gap-6">
    
    {/* Daily Check-in / Next Action */}
    <AnimatePresence mode="wait">
     {nextActions.length > 0 && (
      <motion.div 
       initial={{ opacity: 0, y: -10 }}
       animate={{ opacity: 1, y: 0 }}
       exit={{ opacity: 0, y: -10 }}
       className="bg-white rounded-3xl p-4 sm:p-5 flex items-center justify-between shadow-sm border border-slate-100"
      >
       <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center shrink-0 border border-slate-100">
         <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
         <h3 className="font-semibold text-slate-900">{nextActions[0].description}</h3>
         <p className="text-sm text-slate-500">{nextActions[0].reason || 'Pending Activity'}</p>
        </div>
       </div>
       <button 
        onClick={() => handleActionClick(nextActions[0])}
        className="px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-900 text-white rounded-[2rem] text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap"
       >
        Check In
       </button>
      </motion.div>
     )}
    </AnimatePresence>

    {/* Avatars / Stories */}
    <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto custom-scrollbar pb-2 pt-2">
     <div className="flex items-center gap-4 min-w-max">
      {/* Your Story */}
      <div className="flex flex-col items-center gap-2 cursor-pointer group">
       <div className="relative">
        <img src={user?.photoURL || "https://picsum.photos/seed/you/100/100"} alt="Your Story" className="w-16 h-16 sm:w-18 sm:h-18 rounded-full object-cover border border-slate-200 group-hover:scale-105 transition-transform" />
        <div className="absolute bottom-0 right-0 w-5 h-5 bg-slate-900 border-2 border-white rounded-full flex items-center justify-center">
         <Plus className="w-3 h-3 text-white" />
        </div>
       </div>
       <span className="text-xs font-medium text-slate-500">Your Story</span>
      </div>
      
      {/* Other Stories */}
      {RECENT_MATCHES.map(match => (
       <div key={match.id} className="flex flex-col items-center gap-2 cursor-pointer group">
        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full p-[2px] bg-gradient-to-tr from-blue-500 to-indigo-500">
         <img src={match.avatar} alt={match.name} className="w-full h-full rounded-full object-cover border-2 border-white group-hover:scale-95 transition-transform" />
        </div>
        <span className="text-xs font-medium text-slate-500">{match.name.split(' ')[0]}</span>
       </div>
      ))}
      {/* Extra filler items to make it scrollable */}
      {[
        { id: '4', name: 'Emma', avatar: 'https://picsum.photos/seed/emma/100/100' },
        { id: '5', name: 'David', avatar: 'https://picsum.photos/seed/david/100/100' },
        { id: '6', name: 'Lisa', avatar: 'https://picsum.photos/seed/lisa/100/100' }
      ].map(match => (
       <div key={match.id} className="flex flex-col items-center gap-2 cursor-pointer group">
        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full p-[2px] bg-slate-200">
         <img src={match.avatar} alt={match.name} className="w-full h-full rounded-full object-cover border-2 border-white group-hover:scale-95 transition-transform grayscale hover:grayscale-0" />
        </div>
        <span className="text-xs font-medium text-slate-500">{match.name}</span>
       </div>
      ))}
     </div>
    </div>

    {/* Ecosystem Activity Feed */}
    <div className="flex flex-col gap-4">
     <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold text-slate-900">Ecosystem Activity</h2>
      <div className="flex items-center gap-2">
       <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
        <TrendingUp className="w-3.5 h-3.5" /> Log Update
       </button>
       <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 rounded-full text-xs font-semibold text-white hover:bg-slate-800 transition-colors">
        <Plus className="w-3.5 h-3.5" /> Create Post
       </button>
      </div>
     </div>

     {/* Feed Cards */}
     <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
      <div className="flex items-start gap-4">
       <img src={RECENT_MATCHES[1].avatar} alt="Sarah" className="w-12 h-12 rounded-full object-cover shrink-0" />
       <div className="flex-1">
        <p className="text-slate-900 text-[15px]">
         <span className="font-semibold">{RECENT_MATCHES[1].name.split(' ')[0]}</span> <span className="text-slate-400">just reached a</span> <span className="font-semibold">Match score of 98</span>
        </p>
        <span className="text-xs text-slate-400 mt-1 block">2h ago</span>
       </div>
      </div>
      <div className="flex items-center gap-6 mt-1 ml-16">
       <button className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-sm font-medium">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
        4
       </button>
       <button className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-sm font-medium">
        <MessageSquare className="w-4 h-4" />
        1
       </button>
       <button className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-sm font-medium ml-auto">
        <svg fill="none" className="w-4 h-4" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
        Share
       </button>
      </div>
     </div>

     <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
      <div className="flex items-start gap-4">
       <img src={RECENT_MATCHES[0].avatar} alt="Alex" className="w-12 h-12 rounded-full object-cover shrink-0" />
       <div className="flex-1">
        <p className="text-slate-900 text-[15px]">
         <span className="font-semibold">{RECENT_MATCHES[0].name.split(' ')[0]}</span> <span className="text-slate-400">hit a 10-day</span> <span className="font-semibold">profile activity streak</span>
        </p>
        <span className="text-xs text-slate-400 mt-1 block">4h ago</span>
       </div>
      </div>
      <div className="flex items-center gap-6 mt-1 ml-16">
       <button className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-sm font-medium">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
        12
       </button>
       <button className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-sm font-medium">
        <MessageSquare className="w-4 h-4" />
        3
       </button>
       <button className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-sm font-medium ml-auto">
        <svg fill="none" className="w-4 h-4" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
        Share
       </button>
      </div>
     </div>
    </div>

    {/* Streak / Stats Wrapper */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
     {/* Partner Match Card */}
     <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 flex flex-col gap-4">
      <div className="flex items-center justify-between">
       <span className="text-xs font-bold uppercase tracking-widest text-slate-500">CO-FOUNDER PROSPECT</span>
       <Users className="w-5 h-5 text-slate-400" />
      </div>
      <div className="flex items-center gap-4">
       <div className="relative">
        <img src={RECENT_MATCHES[1].avatar} alt="Sarah" className="w-14 h-14 rounded-full object-cover" />
        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
       </div>
       <div>
        <h4 className="font-semibold text-slate-900 text-lg">{RECENT_MATCHES[1].name.split(' ')[0]}</h4>
        <p className="text-sm text-slate-400">Updated their profile today</p>
       </div>
      </div>
      <div className="flex items-center gap-3 mt-1">
       <button className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-900 text-white rounded-[2rem] font-semibold text-xs sm:text-sm hover:bg-slate-800 transition-colors">
        Connect
       </button>
       <button className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 bg-white border border-slate-200 text-slate-900 rounded-[2rem] font-semibold text-xs sm:text-sm hover:bg-slate-50 transition-colors">
        Profile
       </button>
      </div>
     </div>

     {/* Streak Card */}
     <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between">
       <span className="text-sm font-medium text-slate-400">Current Streak</span>
       <Flame className="w-5 h-5 text-slate-900" />
      </div>
      <div className="mt-2">
       <h1 className="text-5xl font-bold text-slate-900 tracking-tight">{streak?.currentStreak || 12}<span className="text-2xl font-semibold">d</span></h1>
       <p className="text-sm text-slate-400 mt-2">Systems Nominal / Keep It Up</p>
      </div>
     </div>
    </div>

    {/* Progress Bars / Challenges */}
    <div className="flex flex-col gap-4">
     <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold text-slate-900">Active Goals</h2>
      <button className="text-xs font-semibold text-slate-400 hover:text-slate-900">View All</button>
     </div>
     
     <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
      <div className="flex items-center justify-between">
       <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center shrink-0">
         <Target className="w-5 h-5 text-slate-900" />
        </div>
        <div>
         <h4 className="font-semibold text-slate-900">Complete Profile</h4>
         <p className="text-[13px] text-slate-400">Score: {score}/100</p>
        </div>
       </div>
       <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-xs font-medium border border-slate-100">
        4d left
       </span>
      </div>
      <div className="pt-2">
       <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-slate-900 rounded-full transition-all" style={{ width: `${score}%` }} />
       </div>
       <div className="flex justify-between items-center mt-2 px-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Progress</span>
        <span className="text-xs font-bold text-slate-900">{score}%</span>
       </div>
      </div>
     </div>
    </div>

    {/* Upcoming Timeline */}
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-6 w-full">
     <div className="flex items-center justify-between">
      <h3 className="font-bold text-slate-900 text-lg">Upcoming</h3>
      <Calendar className="w-5 h-5 text-slate-400" />
     </div>
     
     <div className="flex flex-col gap-5 px-1 relative">
      <div className="absolute left-[3px] top-2 bottom-4 w-0.5 bg-slate-100" />
      
      {/* Event 1 */}
      <div className="relative pl-6">
       <div className="absolute left-[-2px] top-1.5 w-3 h-3 rounded-full bg-slate-900 border-2 border-white" />
       <h4 className="font-semibold text-slate-900 leading-tight">Downtown Pitch Club</h4>
       <div className="flex items-center gap-2 mt-1.5">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs text-slate-500 font-medium">Tomorrow, 7:00 AM</span>
        <span className="text-[10px] uppercase tracking-widest font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">MEETUP</span>
       </div>
      </div>

      {/* Event 2 */}
      <div className="relative pl-6">
       <div className="absolute left-[-2px] top-1.5 w-3 h-3 rounded-full bg-slate-900 border-2 border-white" />
       <h4 className="font-semibold text-slate-900 leading-tight">Weekend Builders Hackathon</h4>
       <div className="flex items-center gap-2 mt-1.5">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs text-slate-500 font-medium">Saturday, 8:00 AM</span>
        <span className="text-[10px] uppercase tracking-widest font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">NETWORK</span>
       </div>
      </div>

      {/* Event 3 */}
      <div className="relative pl-6">
       <div className="absolute left-[-2px] top-1.5 w-3 h-3 rounded-full bg-slate-200 border-2 border-white" />
       <h4 className="font-semibold text-slate-900 leading-tight">Pre-Seed Checklist Deadline</h4>
       <div className="flex items-center gap-2 mt-1.5">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs text-slate-500 font-medium">Next Friday</span>
        <span className="text-[10px] uppercase tracking-widest font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">MILESTONE</span>
       </div>
      </div>
     </div>

     <button className="w-full px-4 sm:px-6 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-[2rem] text-xs sm:text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors mt-2">
      View Full Calendar
     </button>
    </div>

    {/* Local Meetups */}
    <div className="flex flex-col gap-4">
     <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold text-slate-900">Local Meetups</h2>
      <button className="text-xs font-semibold text-slate-400 hover:text-slate-900">See Map</button>
     </div>
     
     <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
      <div className="bg-slate-50 p-3 rounded-2xl flex flex-col items-center justify-center shrink-0 min-w-[70px]">
       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Tomorrow</span>
       <span className="text-xl font-bold text-slate-900 leading-none">7:00</span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
       <h4 className="font-semibold text-slate-900 truncate">Downtown Pitch Club</h4>
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-400">
         <Target className="w-3.5 h-3.5" /> <span className="text-[11px] uppercase tracking-wider font-semibold">Location</span>
        </div>
        <span className="text-xs font-medium text-slate-900">Tech Hub HQ</span>
       </div>
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-400">
         <Users className="w-3.5 h-3.5" /> <span className="text-[11px] uppercase tracking-wider font-semibold">Status</span>
        </div>
        <span className="text-xs font-medium text-slate-900">12 Confirmed</span>
       </div>
      </div>
     </div>

     <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
      <div className="bg-slate-50 p-3 rounded-2xl flex flex-col items-center justify-center shrink-0 min-w-[70px]">
       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Saturday</span>
       <span className="text-xl font-bold text-slate-900 leading-none">9:00</span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
       <h4 className="font-semibold text-slate-900 truncate">Founder Coffee Meet</h4>
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-400">
         <Target className="w-3.5 h-3.5" /> <span className="text-[11px] uppercase tracking-wider font-semibold">Location</span>
        </div>
        <span className="text-xs font-medium text-slate-900">Riverside Cafe</span>
       </div>
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-400">
         <Users className="w-3.5 h-3.5" /> <span className="text-[11px] uppercase tracking-wider font-semibold">Status</span>
        </div>
        <span className="text-xs font-medium text-slate-900">8 Confirmed</span>
       </div>
      </div>
     </div>
    </div>

    {/* Floating Mobile Nav bar Match (Visible on smaller screens or as design spec) */}
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[360px] bg-white rounded-full shadow-2xl shadow-slate-900/10 border border-slate-100 p-2 flex items-center justify-between px-4">
     <button className="p-3 text-slate-800 transition-colors">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
     </button>
     <button className="p-3 text-slate-400 hover:text-slate-800 transition-colors">
      <Search className="w-6 h-6" />
     </button>
     <button className="w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 transform hover:scale-105 -translate-y-1">
      <Plus className="w-6 h-6" />
     </button>
     <button className="p-3 text-slate-400 hover:text-slate-800 transition-colors">
      <Users className="w-6 h-6" />
     </button>
     <button className="p-3 text-slate-400 hover:text-slate-800 transition-colors">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
     </button>
    </div>

   </div>
  </div>
 );
}
