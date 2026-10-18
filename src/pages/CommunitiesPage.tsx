import React, { useEffect, useState } from 'react';
import PageShell from '../components/ui/PageShell';
import FactLine from '../components/ui/FactLine';
import EmptyHint, { AskLink } from '../components/ui/EmptyHint';
import { useNavigate } from 'react-router-dom';
import { 
 TrendingUp, 
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
import { useT } from '../lib/language';
import { listKeys, logActivity, readIds, setId } from '../lib/localLists';
import { useStored } from '../lib/useStored';

const TAB_EL: Record<string, string> = {
 all: 'Όλα',
 joined: 'Συμμετέχω',
 trending: 'Δημοφιλή',
 new: 'Νέα',
};

const COMMUNITIES = [
 {
  id: '1',
  name: 'Fintech Founders',
  description: 'A space for entrepreneurs building the future of finance, banking, and payments.',
  members: '1.2k',
  posts: 45,
  category: 'Industry',
  categoryEl: 'Κλάδος',
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
  categoryEl: 'Τεχνολογία',
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
  categoryEl: 'Επιχειρηματικό μοντέλο',
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
  categoryEl: 'Τεχνολογία',
  avatar: 'https://picsum.photos/seed/web3/200/200',
  joined: false
 }
];

export default function CommunitiesPage() {
 const t = useT();
 const [searchQuery, setSearchQuery] = useState('');
 const [activeTab, setActiveTab] = useState('all');
 const joinedList = useStored(() => readIds(listKeys.communities), ['cfb.joinedCommunities']);
 const joinedIds = new Set(joinedList.length ? joinedList : COMMUNITIES.filter((c) => c.joined).map((c) => c.id));
 const navigate = useNavigate();
 const ask = (prompt: string) => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt } }));
 useEffect(() => {
  if (readIds(listKeys.communities).length === 0) {
   COMMUNITIES.filter((c) => c.joined).forEach((c) => setId(listKeys.communities, c.id, true));
  }
 }, []);
 const visibleCommunities = COMMUNITIES.filter((community) => {
  const q = searchQuery.trim().toLowerCase();
  const matchesQuery = !q || community.name.toLowerCase().includes(q) || community.description.toLowerCase().includes(q) || community.category.toLowerCase().includes(q);
  const isJoined = joinedIds.has(community.id);
  if (activeTab === 'joined') return matchesQuery && isJoined;
  if (activeTab === 'trending') return matchesQuery && community.posts > 80;
  if (activeTab === 'new') return matchesQuery && !isJoined;
  return matchesQuery;
 });

 return (
  <PageShell
   title={t('Communities', 'Κοινότητες')}
   description={t('Connect with like-minded founders. Share insights, ask questions, and grow together.', 'Συνδέσου με ιδρυτές που σκέφτονται σαν εσένα. Μοιράσου γνώσεις, κάνε ερωτήσεις και εξελίξου μαζί τους.')}
   actions={
    <button
     type="button"
     onClick={() => ask('How do I create a community?')}
     className="flex items-center gap-1.5 min-h-11 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-all"
    >
     <Plus className="w-3.5 h-3.5" /> {t('Create', 'Δημιουργία')}
    </button>
   }
  >
  <div className="space-y-5">

   {/* Search & Tabs */}
   <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-4 border-b border-stone-100">
    <div className="scroll-tabs bg-stone-50 p-1 rounded-xl border border-stone-100">
     {['all', 'joined', 'trending', 'new'].map((tab) => (
      <button
       key={tab}
       onClick={() => setActiveTab(tab)}
       className={cn(
        "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all",
        activeTab === tab 
         ? "bg-white text-stone-900 shadow-sm border border-stone-100" 
         : "text-stone-500 hover:text-stone-900"
       )}
      >
       {t(tab, TAB_EL[tab])}
      </button>
     ))}
    </div>
    <div className="relative w-full sm:w-64">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
     <input 
      type="text"
      placeholder={t('Search communities...', 'Αναζήτηση κοινοτήτων…')}
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
     />
    </div>
   </div>

   {/* Community Grid */}
   {visibleCommunities.length === 0 && (
    <EmptyHint
     title={searchQuery.trim()
      ? t(`No communities match search “${searchQuery.trim()}”${activeTab !== 'all' ? ` and the ${activeTab} tab` : ''}.`, `Δεν βρέθηκαν κοινότητες για «${searchQuery.trim()}»${activeTab !== 'all' ? ` στην καρτέλα «${TAB_EL[activeTab]}»` : ''}.`)
      : t(`No communities on the ${activeTab} tab.`, `Δεν υπάρχουν κοινότητες στην καρτέλα «${TAB_EL[activeTab]}».`)}
     detail={t('Ask the studio assistant to find one, or create a new space.', 'Ζήτα από τον βοηθό του στούντιο να βρει μία ή φτιάξε νέο χώρο.')}
    >
     <AskLink prompt="How do I create a community?">{t('Ask assistant', 'Ρώτα τον βοηθό')}</AskLink>
    </EmptyHint>
   )}
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {visibleCommunities.map((community, idx) => (
     <motion.div 
      key={community.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.1 }}
      className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm hover:shadow-md  transition-all group flex flex-col"
     >
      {/* Top row: avatar + actions */}
      <div className="flex items-start justify-between mb-5">
       <img 
        src={community.avatar} 
        alt={community.name} 
        className="w-14 h-14 rounded-xl object-cover shadow-sm"
        referrerPolicy="no-referrer"
       />
       <div className="flex items-center gap-1">
        <button type="button" className="p-2 text-stone-300 hover:text-stone-700 hover:bg-stone-50 rounded-lg transition-all" onClick={() => ask(`Tell me about ${community.name}`)}>
         <Share2 className="w-4 h-4" />
        </button>
        <button type="button" className="p-2 text-stone-300 hover:text-stone-700 hover:bg-stone-50 rounded-lg transition-all" onClick={() => ask(`What can I do in ${community.name}?`)}>
         <MoreVertical className="w-4 h-4" />
        </button>
       </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
       <FactLine items={[t(community.category, community.categoryEl)]} />
       {community.posts > 100 && (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-500 tracking-wide">
         <TrendingUp className="w-3 h-3" />{t('Trending', 'Δημοφιλή')}
        </span>
       )}
      </div>

      {/* Title + description */}
      <div className="flex-1">
       <h3 className="text-base font-semibold text-stone-900 group-hover:text-stone-700 transition-colors leading-snug">{community.name}</h3>
       <p className="text-stone-500 text-xs leading-relaxed mt-1.5 line-clamp-2">
        {community.description}
       </p>
      </div>

      <FactLine
       className="mt-4 mb-4 text-stone-500"
       items={[t(`${community.members} members`, `${community.members} μέλη`), t(`${community.posts} posts`, `${community.posts} αναρτήσεις`)]}
       label={t('Community size', 'Μέγεθος κοινότητας')}
      />

      {/* CTA */}
      {joinedIds.has(community.id) ? (
       <button 
        type="button"
        onClick={() => navigate('/messages')}
        className="w-full py-2 bg-stone-50 text-stone-900 rounded-xl text-xs font-semibold hover:bg-stone-100 transition-all border border-stone-200 flex items-center justify-center gap-1.5"
       >
        {t('Enter Community', 'Είσοδος στην κοινότητα')} <ArrowRight className="w-3.5 h-3.5" />
       </button>
      ) : (
       <button 
        type="button"
        onClick={() => {
         setId(listKeys.communities, community.id, true);
         logActivity({ kind: 'community', title: `Joined ${community.name}`, titleEl: `Έγινε join: ${community.name}`, href: '/communities' });
        }}
        className="w-full py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition-all flex items-center justify-center gap-1.5"
       >
        <Plus className="w-3.5 h-3.5" /> {t('Join Community', 'Συμμετοχή')}
       </button>
      )}
     </motion.div>
    ))}
   </div>

   {/* Trending Topics */}
   <div className="space-y-3">
    <div className="flex items-center justify-between">
     <p className="text-xs font-semibold text-stone-400 tracking-wider">{t('Trending Topics', 'Δημοφιλή θέματα')}</p>
     <button type="button" className="text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors" onClick={() => ask('what events are coming')}>{t('View all topics', 'Όλα τα θέματα')}</button>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
     {[
      { tag: '#fundraising', posts: '1.2k' },
      { tag: '#product-market-fit', posts: '840' },
      { tag: '#hiring-founders', posts: '560' },
      { tag: '#mvp-launch', posts: '2.4k' },
     ].map((topic) => (
      <div 
       key={topic.tag} 
       onClick={() => ask(`Tell me about ${topic.tag}`)}
       className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm hover:shadow-md  transition-all cursor-pointer group"
      >
       <p className="text-xs font-semibold text-stone-900 group-hover:text-stone-600 transition-colors">{topic.tag}</p>
       <p className="text-[10px] text-stone-400 font-medium tracking-wider mt-1.5">{t(`${topic.posts} discussions`, `${topic.posts} συζητήσεις`)}</p>
      </div>
     ))}
    </div>
   </div>
  </div>
  </PageShell>
 );
}
