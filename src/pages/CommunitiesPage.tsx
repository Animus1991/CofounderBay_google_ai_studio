import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
 TrendingUp, 
 Users, 
 MessageSquare, 
 Plus, 
 Search, 
 Filter, 
 Zap, 
 CheckCircle2, 
 ArrowRight,
 ShieldCheck,
 Globe,
 Bell,
 MoreVertical,
 Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const COMMUNITIES = [
 {
  id: '1',
  name: 'Fintech Founders',
  description: 'A space for entrepreneurs building the future of finance, banking, and payments.',
  members: '1.2k',
  posts: 45,
  category: 'Industry',
  avatar: 'https://picsum.photos/seed/fintech/200/200',
  joined: true
 },
 {
  id: '2',
  name: 'AI & Machine Learning',
  description: 'Discussing the latest in LLMs, computer vision, and AI-driven applications.',
  members: '3.4k',
  posts: 128,
  category: 'Technology',
  avatar: 'https://picsum.photos/seed/ai/200/200',
  joined: false
 },
 {
  id: '3',
  name: 'SaaS Builders',
  description: 'Everything about building, scaling, and selling software as a service.',
  members: '2.1k',
  posts: 89,
  category: 'Business Model',
  avatar: 'https://picsum.photos/seed/saas/200/200',
  joined: true
 },
 {
  id: '4',
  name: 'Web3 & Crypto',
  description: 'Decentralized applications, blockchain protocols, and the future of the web.',
  members: '1.8k',
  posts: 67,
  category: 'Technology',
  avatar: 'https://picsum.photos/seed/web3/200/200',
  joined: false
 }
];

export default function CommunitiesPage() {
 const [searchQuery, setSearchQuery] = useState('');
 const [activeTab, setActiveTab] = useState('all');
 const navigate = useNavigate();

 return (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
   {/* Header */}
   <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
    <div className="max-w-2xl space-y-4">
     <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-medium text-stone-900 tracking-tight">
      Join the <span className="text-stone-400">Conversation.</span>
     </h1>
     <p className="text-sm sm:text-base lg:text-lg text-stone-500 font-medium">
      Connect with like-minded founders in specialized communities. Share insights, ask questions, and grow together.
     </p>
    </div>
    <button 
     onClick={() => navigate('/dashboard')}
     className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-stone-900 text-white rounded-[2rem] text-xs sm:text-sm font-semibold hover:bg-stone-800 transition-all shadow-md group"
    >
     <Plus className="w-5 h-5" />
     Create Community
    </button>
   </div>

   {/* Search & Tabs */}
   <div className="flex flex-col md:flex-row gap-6 items-center justify-between border-b border-stone-100 pb-8">
    <div className="flex items-center gap-1 bg-stone-50 p-1.5 rounded-2xl border border-stone-100">
     {['all', 'joined', 'trending', 'new'].map((tab) => (
      <button
       key={tab}
       onClick={() => setActiveTab(tab)}
       className={cn(
        "px-4 sm:px-6 py-2 sm:py-2.5 rounded-[2rem] text-xs sm:text-sm font-semibold capitalize transition-all",
        activeTab === tab 
         ? "bg-white text-stone-900 shadow-md border border-stone-100" 
         : "text-stone-500 hover:text-stone-900 hover:bg-white/50"
       )}
      >
       {tab}
      </button>
     ))}
    </div>
    <div className="w-full md:w-96 relative group">
     <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
     <input 
      type="text"
      placeholder="Search communities..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full pl-12 pr-4 py-3.5 bg-white border border-stone-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-stone-900 focus:border-transparent outline-none transition-all text-stone-900 font-medium"
     />
    </div>
   </div>

   {/* Community Grid */}
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
    {COMMUNITIES.map((community, idx) => (
     <motion.div 
      key={community.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.1 }}
      className="bg-white rounded-[2rem] sm:rounded-[32px] border border-stone-100 p-6 sm:p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
     >
      <div className="flex items-start justify-between mb-8">
       <img 
        src={community.avatar} 
        alt={community.name} 
        className="w-20 h-20 rounded-3xl object-cover shadow-lg"
        referrerPolicy="no-referrer"
       />
       <div className="flex items-center gap-2">
        <button className="p-2.5 bg-stone-50 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all border border-stone-100">
         <Share2 className="w-5 h-5" />
        </button>
        <button className="p-2.5 bg-stone-50 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all border border-stone-100">
         <MoreVertical className="w-5 h-5" />
        </button>
       </div>
      </div>

      <div className="space-y-4">
       <div className="flex items-center gap-2">
        <span className="px-3 py-1 bg-stone-50 text-stone-900 rounded-lg text-xs font-medium uppercase tracking-widest border border-stone-100">
         {community.category}
        </span>
        {community.posts > 100 && (
         <span className="flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-medium uppercase tracking-widest border border-amber-100">
          <TrendingUp className="w-3 h-3" />
          Trending
         </span>
        )}
       </div>

       <div>
        <h3 className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900 group-hover:text-stone-700 transition-colors">{community.name}</h3>
        <p className="text-stone-500 text-sm font-medium leading-relaxed mt-2 line-clamp-2">
         {community.description}
        </p>
       </div>

       <div className="flex items-center gap-6 pt-4">
        <div className="flex items-center gap-2">
         <Users className="w-5 h-5 text-stone-400" />
         <span className="text-sm font-medium text-stone-900">{community.members}</span>
         <span className="text-xs text-stone-400 font-medium uppercase tracking-wider">Members</span>
        </div>
        <div className="flex items-center gap-2">
         <MessageSquare className="w-5 h-5 text-stone-400" />
         <span className="text-sm font-medium text-stone-900">{community.posts}</span>
         <span className="text-xs text-stone-400 font-medium uppercase tracking-wider">Posts</span>
        </div>
       </div>

       <div className="pt-8">
        {community.joined ? (
         <button 
          onClick={() => navigate('/dashboard')}
          className="w-full py-2 sm:py-2.5 bg-stone-50 text-stone-900 rounded-[2rem] text-xs sm:text-sm font-semibold hover:bg-stone-100 transition-all border border-stone-100 flex items-center justify-center gap-2 group/btn"
         >
          Enter Community
          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
         </button>
        ) : (
         <button 
          onClick={() => navigate('/dashboard')}
          className="w-full py-2 sm:py-2.5 bg-stone-900 text-white rounded-[2rem] text-xs sm:text-sm font-semibold hover:bg-stone-800 transition-all shadow-md flex items-center justify-center gap-2"
         >
          <Plus className="w-5 h-5" />
          Join Community
         </button>
        )}
       </div>
      </div>
     </motion.div>
    ))}
   </div>

   {/* Featured Topics */}
   <div className="bg-stone-50 rounded-[2rem] sm:rounded-[40px] p-6 sm:p-12 space-y-6 sm:space-y-8 border border-stone-100">
    <div className="flex items-center justify-between">
     <h2 className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900 tracking-tight">Trending Topics</h2>
     <button className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">View all topics</button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
     {[
      { tag: '#fundraising', posts: '1.2k', color: 'blue' },
      { tag: '#product-market-fit', posts: '840', color: 'green' },
      { tag: '#hiring-founders', posts: '560', color: 'amber' },
      { tag: '#mvp-launch', posts: '2.4k', color: 'purple' },
     ].map((topic) => (
      <div 
       key={topic.tag} 
       onClick={() => navigate('/dashboard')}
       className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
      >
       <h4 className="font-medium text-stone-900 group-hover:text-stone-600 transition-colors">{topic.tag}</h4>
       <p className="text-xs text-stone-400 font-medium uppercase tracking-widest mt-2">{topic.posts} discussions</p>
      </div>
     ))}
    </div>
   </div>
  </div>
 );
}
