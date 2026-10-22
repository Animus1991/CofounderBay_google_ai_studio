import React, { useEffect, useMemo, useState } from 'react';
import PageShell from '../components/ui/PageShell';
import FactLine from '../components/ui/FactLine';
import EmptyHint, { AskLink, ClearFiltersButton } from '../components/ui/EmptyHint';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';
import {
 TrendingUp,
 Plus,
 Search,
 ArrowRight,
 MoreVertical,
 Share2,
 Send,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useT } from '../lib/language';
import { useAuth } from '../App';
import { useToast } from '../context/ToastContext';
import { listKeys, logActivity, readIds, setId } from '../lib/localLists';
import { usePageControls } from '../lib/pageControls';
import { useStored } from '../lib/useStored';
import {
 addCommunityPost,
 createCommunity,
 joinCommunity,
 leaveCommunity,
 onCommunities,
 onCommunityPosts,
 type CommunityDoc,
 type CommunityPost,
} from '../lib/communities';

const TAB_EL: Record<string, string> = {
 all: 'Όλα',
 joined: 'Συμμετέχω',
 trending: 'Δημοφιλή',
 new: 'Νέα',
};

const COMMUNITIES = [
 {
  id: 'fintech-founders',
  name: 'Fintech Founders',
  description: 'A space for entrepreneurs building the future of finance, banking, and payments.',
  members: '1.2k',
  posts: 45,
  category: 'Industry',
  categoryEl: 'Κλάδος',
  avatar: '',
  joined: true,
 },
 {
  id: 'ai-machine-learning',
  name: 'AI & Machine Learning',
  description: 'Discussing the latest in LLMs, computer vision, and AI-driven applications.',
  members: '3.4k',
  posts: 128,
  category: 'Technology',
  categoryEl: 'Τεχνολογία',
  avatar: '',
  joined: false,
 },
 {
  id: 'saas-builders',
  name: 'SaaS Builders',
  description: 'Everything about building, scaling, and selling software as a service.',
  members: '2.1k',
  posts: 89,
  category: 'Business Model',
  categoryEl: 'Επιχειρηματικό μοντέλο',
  avatar: '',
  joined: true,
 },
 {
  id: 'web3-crypto',
  name: 'Web3 & Crypto',
  description: 'Decentralized applications, blockchain protocols, and the future of the web.',
  members: '1.8k',
  posts: 67,
  category: 'Technology',
  categoryEl: 'Τεχνολογία',
  avatar: '',
  joined: false,
 },
];

interface CommunityCardData {
 id: string;
 name: string;
 description: string;
 category: string;
 categoryEl?: string;
 avatar: string;
 /** null → real mode and no membership document yet (do not invent a count). */
 members: string | number | null;
 posts: number | null;
 official: boolean;
 memberIds: string[];
}

const CATEGORY_EL: Record<string, string> = {
 Industry: 'Κλάδος',
 Technology: 'Τεχνολογία',
 'Business Model': 'Επιχειρηματικό μοντέλο',
 General: 'Γενικά',
};

export default function CommunitiesPage() {
 const t = useT();
 const toast = useToast();
 const { user, isDemoMode } = useAuth();
 const [searchQuery, setSearchQuery] = useState('');
 const [activeTab, setActiveTab] = useState('all');
 const joinedList = useStored(() => readIds(listKeys.communities), ['cfb.joinedCommunities']);
 const localJoined = new Set(joinedList);
 const ask = (prompt: string) => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt } }));

 const [cloud, setCloud] = useState<CommunityDoc[] | null>(isDemoMode ? [] : null);
 const [createOpen, setCreateOpen] = useState(false);
 const [openId, setOpenId] = useState<string | null>(null);
 const [busy, setBusy] = useState<string | null>(null);

 usePageControls(() => [
  { id: 'create-community', en: 'Create community', el: 'Δημιουργία κοινότητας', run: () => (isDemoMode ? ask('How do I create a community?') : setCreateOpen(true)) },
 ], [isDemoMode]);

 useEffect(() => {
  if (isDemoMode) { setCloud([]); return; }
  return onCommunities((list) => setCloud(list), () => setCloud([]));
 }, [isDemoMode]);

 useEffect(() => {
  if (isDemoMode && readIds(listKeys.communities).length === 0) {
   COMMUNITIES.filter((c) => c.joined).forEach((c) => setId(listKeys.communities, c.id, true));
  }
 }, [isDemoMode]);

 const cloudIds = useMemo(() => new Set((cloud ?? []).map((c) => c.id)), [cloud]);
 const cards: CommunityCardData[] = useMemo(() => {
  const cloudCards: CommunityCardData[] = (cloud ?? []).map((doc) => ({
   id: doc.id,
   name: doc.name,
   description: doc.description,
   category: doc.category,
   categoryEl: CATEGORY_EL[doc.category],
   avatar: '',
   members: doc.memberIds.length,
   posts: doc.postCount,
   official: false,
   memberIds: doc.memberIds,
  }));
  const builtin: CommunityCardData[] = (isDemoMode ? COMMUNITIES.filter((b) => !cloudIds.has(b.id)) : []).map((b) => ({
   id: b.id,
   name: b.name,
   description: b.description,
   category: b.category,
   categoryEl: b.categoryEl,
   avatar: b.avatar,
   // demo mode shows the friendly headline numbers; real mode shows the true
   // member count once the space has a cloud document, otherwise "New space".
   members: isDemoMode ? b.members : null,
   posts: isDemoMode ? b.posts : null,
   official: true,
   memberIds: [],
  }));
  return [...cloudCards, ...builtin];
 }, [cloud, cloudIds, isDemoMode]);

 const isJoined = (card: CommunityCardData) =>
  (user ? card.memberIds.includes(user.uid) : false) || localJoined.has(card.id);

 const visibleCommunities = cards.filter((community) => {
  const q = searchQuery.trim().toLowerCase();
  const matchesQuery = !q || community.name.toLowerCase().includes(q) || community.description.toLowerCase().includes(q) || community.category.toLowerCase().includes(q);
  const joined = isJoined(community);
  if (activeTab === 'joined') return matchesQuery && joined;
  if (activeTab === 'trending') return matchesQuery && (community.posts ?? 0) > (isDemoMode ? 80 : 0);
  if (activeTab === 'new') return matchesQuery && !joined;
  return matchesQuery;
 });

 const join = async (card: CommunityCardData) => {
  setId(listKeys.communities, card.id, true);
  logActivity({ kind: 'community', title: `Joined ${card.name}`, titleEl: `Συμμετοχή στην κοινότητα: ${card.name}`, href: '/communities' });
  if (!isDemoMode && user) {
   setBusy(card.id);
   try {
    await joinCommunity(card.id, user.uid, card.official ? { name: card.name, description: card.description, category: card.category } : undefined);
   } catch { /* membership stays local if the write is not permitted */ }
   finally { setBusy(null); }
  }
 };

 const leave = async (card: CommunityCardData) => {
  setId(listKeys.communities, card.id, false);
  if (!isDemoMode && user && card.memberIds.includes(user.uid)) {
   setBusy(card.id);
   try { await leaveCommunity(card.id, user.uid); } catch { /* keep local state */ }
   finally { setBusy(null); }
  }
  toast.toast({
   type: 'info',
   title: t('Left community', 'Αποχώρησες από την κοινότητα'),
   description: card.name,
   duration: 6000,
   action: { label: t('Undo', 'Αναίρεση'), run: () => void join(card) },
  });
 };

 const openCommunity = async (card: CommunityCardData) => {
  if (!isDemoMode && user && !cloudIds.has(card.id)) {
   // Materialise the platform space so its posts live somewhere real.
   try { await joinCommunity(card.id, user.uid, { name: card.name, description: card.description, category: card.category }); } catch { /* read-only view */ }
  }
  setOpenId(card.id);
 };

 const openCard = cards.find((c) => c.id === openId) ?? null;

 return (
  <PageShell
   sample={isDemoMode}
   title={t('Communities', 'Κοινότητες')}
   description={t('Connect with like-minded founders. Share insights, ask questions, and grow together.', 'Συνδέσου με ιδρυτές που σκέφτονται σαν εσένα. Μοιράσου γνώσεις, κάνε ερωτήσεις και εξελίξου μαζί τους.')}
   actions={
    <button
     type="button"
     onClick={() => (isDemoMode ? ask('How do I create a community?') : setCreateOpen(true))}
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
     detail={isDemoMode
      ? t('Ask the studio assistant to find one, or create a new space.', 'Ζήτα από τον βοηθό να βρει μία ή φτιάξε νέο χώρο.')
      : t('Be the first to start a space, or ask the assistant for ideas.', 'Ξεκίνα εσύ έναν χώρο ή ζήτα ιδέες από τον βοηθό.')}
    >
     {(searchQuery.trim() || activeTab !== 'all') && (
      <ClearFiltersButton onClick={() => { setSearchQuery(''); setActiveTab('all'); }} />
     )}
     {!isDemoMode && (
      <button type="button" onClick={() => setCreateOpen(true)} className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-all">
       {t('Create community', 'Δημιουργία κοινότητας')}
      </button>
     )}
     <AskLink prompt="How do I create a community?">{t('Ask assistant', 'Ρώτα τον βοηθό')}</AskLink>
    </EmptyHint>
   )}
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <AnimatePresence>
    {visibleCommunities.map((community, idx) => (
     <motion.div
      key={community.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: Math.min(idx, 8) * 0.05 }}
      className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm hover:shadow-md  transition-all group flex flex-col"
     >
      {/* Top row: avatar + actions */}
      <div className="flex items-start justify-between mb-5">
       {community.avatar ? (
        <img
         src={community.avatar}
         alt={community.name}
         className="w-14 h-14 rounded-xl object-cover shadow-sm"
         referrerPolicy="no-referrer"
        />
       ) : (
        <div className="w-14 h-14 rounded-xl bg-stone-900 text-white flex items-center justify-center text-base font-semibold shadow-sm" aria-hidden>
         {community.name.slice(0, 2).toUpperCase()}
        </div>
       )}
       <div className="flex items-center gap-1">
        <button type="button" aria-label={t('Share community', 'Κοινοποίηση κοινότητας')} className="p-2 text-stone-300 hover:text-stone-700 hover:bg-stone-50 rounded-lg transition-all" onClick={() => void navigator.clipboard?.writeText(community.name)}>
         <Share2 className="w-4 h-4" />
        </button>
        <button type="button" aria-label={t('Community options', 'Επιλογές κοινότητας')} className="p-2 text-stone-300 hover:text-stone-700 hover:bg-stone-50 rounded-lg transition-all" onClick={() => ask(`What can I do in ${community.name}?`)}>
         <MoreVertical className="w-4 h-4" />
        </button>
       </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
       <FactLine items={[community.categoryEl ? t(community.category, community.categoryEl) : community.category]} />
       {community.official && (
        <span className="text-xs font-semibold text-stone-400 tracking-wide">{t('Official', 'Επίσημη')}</span>
       )}
       {(community.posts ?? 0) > 80 && (
        <span className="flex items-center gap-1 text-xs font-semibold text-amber-500 tracking-wide">
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
       items={[
        community.members != null
         ? t(`${community.members} ${community.members === 1 ? 'member' : 'members'}`, `${community.members} ${community.members === 1 ? 'μέλος' : 'μέλη'}`)
         : (isDemoMode && community.posts != null ? t(`${community.posts} posts`, `${community.posts} αναρτήσεις`) : t('New space', 'Νέος χώρος')),
       ]}
       label={t('Community size', 'Μέγεθος κοινότητας')}
      />

      {/* CTA */}
      {isJoined(community) ? (
       <div className="flex gap-2">
        <button
         type="button"
         onClick={() => void openCommunity(community)}
         className="flex-1 py-2 bg-stone-50 text-stone-900 rounded-xl text-xs font-semibold hover:bg-stone-100 transition-all border border-stone-200 flex items-center justify-center gap-1.5"
        >
         {t('Enter Community', 'Είσοδος στην κοινότητα')} <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
         type="button"
         onClick={() => void leave(community)}
         disabled={busy === community.id}
         className="px-3 py-2 text-stone-400 hover:text-stone-700 rounded-xl text-xs font-medium transition-all"
        >
         {t('Leave', 'Αποχώρηση')}
        </button>
       </div>
      ) : (
       <button
        type="button"
        disabled={busy === community.id}
        onClick={() => void join(community)}
        className="w-full py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
       >
        <Plus className="w-3.5 h-3.5" /> {busy === community.id ? t('Joining…', 'Συμμετοχή…') : t('Join Community', 'Συμμετοχή')}
       </button>
      )}
     </motion.div>
    ))}
    </AnimatePresence>
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
       {isDemoMode && <p className="text-xs text-stone-400 font-medium tracking-wider mt-1.5">{t(`${topic.posts} discussions`, `${topic.posts} συζητήσεις`)}</p>}
      </div>
     ))}
    </div>
   </div>
  </div>

  <CreateCommunityModal
   open={createOpen}
   uid={user?.uid ?? ''}
   onClose={() => setCreateOpen(false)}
   onCreated={(id) => { setCreateOpen(false); setOpenId(id); }}
  />

  <CommunityModal card={openCard} uid={user?.uid ?? ''} userName={user?.displayName ?? user?.email?.split('@')[0] ?? ''} isDemoMode={isDemoMode} onClose={() => setOpenId(null)} />
  </PageShell>
 );
}

function CreateCommunityModal({ open, uid, onClose, onCreated }: { open: boolean; uid: string; onClose: () => void; onCreated: (id: string) => void }) {
 const t = useT();
 const [name, setName] = useState('');
 const [description, setDescription] = useState('');
 const [category, setCategory] = useState('General');
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState('');

 const submit = async () => {
  if (!name.trim() || !uid) return;
  setSaving(true);
  setError('');
  try {
   const id = await createCommunity({ name, description, category, isPublic: true, ownerId: uid });
   logActivity({ kind: 'community', title: `Created community ${name.trim()}`, titleEl: `Δημιουργία κοινότητας: ${name.trim()}`, href: '/communities' });
   onCreated(id);
  } catch {
   setError(t('Could not create the community. Try again.', 'Δεν ήταν δυνατή η δημιουργία. Δοκίμασε ξανά.'));
  } finally {
   setSaving(false);
  }
 };

 return (
  <Modal open={open} onClose={onClose} title={t('Create a community', 'Δημιούργησε κοινότητα')}>
   <div className="space-y-4">
    <div>
     <label className="text-xs font-semibold text-stone-500">{t('Name', 'Όνομα')}</label>
     <input
      value={name}
      onChange={(e) => setName(e.target.value)}
      maxLength={100}
      placeholder={t('e.g. Climate Tech Founders', 'π.χ. Climate Tech Founders')}
      className="mt-1.5 w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-stone-900"
     />
    </div>
    <div>
     <label className="text-xs font-semibold text-stone-500">{t('Description', 'Περιγραφή')}</label>
     <textarea
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      maxLength={1000}
      rows={3}
      placeholder={t('What is this space about?', 'Για τι είναι αυτός ο χώρος;')}
      className="mt-1.5 w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-stone-900 resize-none"
     />
    </div>
    <div>
     <label htmlFor="community-category" className="text-xs font-semibold text-stone-500">{t('Category', 'Κατηγορία')}</label>
     <select id="community-category"
      value={category}
      onChange={(e) => setCategory(e.target.value)}
      className="mt-1.5 w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-stone-900"
     >
      {['General', 'Industry', 'Technology', 'Business Model'].map((cat) => (
       <option key={cat} value={cat}>{CATEGORY_EL[cat] ? t(cat, CATEGORY_EL[cat]) : cat}</option>
      ))}
     </select>
    </div>
    {error && <p className="text-xs text-red-600">{error}</p>}
    <div className="flex justify-end gap-2">
     <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-all">{t('Cancel', 'Άκυρο')}</button>
     <button
      type="button"
      onClick={() => void submit()}
      disabled={!name.trim() || saving}
      className="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-all disabled:opacity-50"
     >
      {saving ? t('Creating…', 'Δημιουργία…') : t('Create', 'Δημιουργία')}
     </button>
    </div>
   </div>
  </Modal>
 );
}

function CommunityModal({ card, uid, userName, isDemoMode, onClose }: { card: CommunityCardData | null; uid: string; userName: string; isDemoMode: boolean; onClose: () => void }) {
 const t = useT();
 const [posts, setPosts] = useState<CommunityPost[]>([]);
 const [title, setTitle] = useState('');
 const [body, setBody] = useState('');
 const [posting, setPosting] = useState(false);
 const [error, setError] = useState('');

 const cardId = card?.id;
 useEffect(() => {
  setPosts([]);
  if (!cardId || isDemoMode) return;
  return onCommunityPosts(cardId, (list) => setPosts(list), () => setPosts([]));
 }, [cardId, isDemoMode]);

 const submit = async () => {
  if (!card || !uid || !body.trim()) return;
  setPosting(true);
  setError('');
  try {
   await addCommunityPost(card.id, { authorId: uid, authorName: userName || 'Member', title: title.trim() || body.trim().slice(0, 80), body });
   setTitle('');
   setBody('');
  } catch {
   setError(t('Could not post. Try again.', 'Η ανάρτηση απέτυχε. Δοκίμασε ξανά.'));
  } finally {
   setPosting(false);
  }
 };

 if (!card) return null;
 return (
  <Modal open={!!card} onClose={onClose} title={card.name}>
   <div className="space-y-4">
    <p className="text-sm text-stone-500 leading-relaxed">{card.description}</p>
    <FactLine items={[card.categoryEl ? t(card.category, card.categoryEl) : card.category, card.members != null ? t(`${card.members} members`, `${card.members} μέλη`) : '']} />

    {!isDemoMode && (
     <div className="rounded-xl border border-stone-100 p-3 space-y-2 bg-stone-50/50">
      <input
       value={title}
       onChange={(e) => setTitle(e.target.value)}
       maxLength={200}
       placeholder={t('Post title (optional)', 'Τίτλος ανάρτησης (προαιρετικό)')}
       className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-stone-900"
      />
      <textarea
       value={body}
       onChange={(e) => setBody(e.target.value)}
       rows={3}
       maxLength={10000}
       placeholder={t('Share something with the community…', 'Μοιράσου κάτι με την κοινότητα…')}
       className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-stone-900 resize-none"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end">
       <button
        type="button"
        onClick={() => void submit()}
        disabled={!body.trim() || posting}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-all disabled:opacity-50"
       >
        <Send className="w-3.5 h-3.5" /> {posting ? t('Posting…', 'Δημοσίευση…') : t('Post', 'Δημοσίευση')}
       </button>
      </div>
     </div>
    )}

    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
     {posts.length === 0 && (
      <p className="text-xs text-stone-400 text-center py-6">
       {isDemoMode ? t('Community posts appear here.', 'Οι αναρτήσεις της κοινότητας εμφανίζονται εδώ.') : t('No posts yet — start the conversation.', 'Καμία ανάρτηση ακόμη — ξεκίνα τη συζήτηση.')}
      </p>
     )}
     {posts.map((post) => (
      <div key={post.id} className="rounded-xl border border-stone-100 p-3">
       <div className="flex items-center gap-2 mb-1.5">
        <Avatar name={post.authorName} size="xs" />
        <span className="text-xs font-semibold text-stone-700">{post.authorName}</span>
        {post.createdAt && <span className="text-xs text-stone-400">{new Date(post.createdAt).toLocaleDateString()}</span>}
       </div>
       {post.title && <p className="text-sm font-semibold text-stone-900">{post.title}</p>}
       <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">{post.body}</p>
      </div>
     ))}
    </div>
   </div>
  </Modal>
 );
}
