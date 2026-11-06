import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
 Heart,
 Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { SEGMENT_TRACK, segmentItem } from '../lib/segmented';
import CoverImage from '../components/ui/CoverImage';
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
 toggleCommunityPostLike,
 type CommunityDoc,
 type CommunityPost,
} from '../lib/communities';
import { askAssistant } from '../lib/assistantBus';
import { absoluteUrl, shareLink } from '../lib/download';
import { avatarOf, findPerson } from '../lib/peopleSource';
import { findCast } from '../data/cast';

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

/** Sample posts for the bundled demo spaces — read-only, from cast members. */
const DEMO_POSTS: Record<string, { authorId: string; title: string; body: string; days: number }[]> = {
 'fintech-founders': [
  { authorId: 'sarah-chen', title: 'Open-banking APIs worth reusing', body: 'We mapped the aggregators our invoicing tool needed — happy to share the shortlist with anyone building on PSD2.', days: 2 },
  { authorId: 'marcus-thorne', title: 'Waiting list → paid pilot in 6 weeks', body: 'What worked for us: a 20-call batch of bookkeeping demos, then a fixed-price pilot. Notes inside.', days: 5 },
 ],
 'saas-builders': [
  { authorId: 'alex-rivera', title: 'Seats vs usage: our pricing teardown', body: 'We moved from per-seat to usage-based last quarter — churn, expansion and the mistakes that cost us two deals.', days: 1 },
 ],
 'ai-machine-learning': [
  { authorId: 'priya-sharma', title: 'Eval harness before the demo, not after', body: 'The checklist we run before any LLM feature ships: golden set, regression run, cost ceiling.', days: 3 },
 ],
};

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
 const joinedList = useStored(() => readIds(listKeys.communities), [listKeys.communities]);
 const localJoined = new Set(joinedList);
 const ask = (prompt: string) => askAssistant(prompt);

 const [cloud, setCloud] = useState<CommunityDoc[] | null>(isDemoMode ? [] : null);
 const [createOpen, setCreateOpen] = useState(false);
 // ?id= deep-links a community — shared links and assistant navigation land
 // on its space directly (parity: the sibling gives each group its own page).
 const [params, setParams] = useSearchParams();
 const openId = params.get('id');
 const setOpenId = (id: string | null) => {
  const next = new URLSearchParams(params);
  if (id) next.set('id', id);
  else next.delete('id');
  setParams(next, { replace: true });
 };
 const [busy, setBusy] = useState<string | null>(null);

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

 // One rule per tab, used for both the list and the tab's counter.
 const inTab = (community: CommunityCardData, tab: string) => {
  const q = searchQuery.trim().toLowerCase();
  const matchesQuery = !q || community.name.toLowerCase().includes(q) || community.description.toLowerCase().includes(q) || community.category.toLowerCase().includes(q);
  const joined = isJoined(community);
  if (tab === 'joined') return matchesQuery && joined;
  if (tab === 'trending') return matchesQuery && (community.posts ?? 0) > (isDemoMode ? 80 : 0);
  if (tab === 'new') return matchesQuery && !joined;
  return matchesQuery;
 };
 const visibleCommunities = cards.filter((community) => inTab(community, activeTab));
 const tabCount = (tab: string) => cards.filter((community) => inTab(community, tab)).length;

 usePageControls(() => [
  { id: 'create-community', en: 'Create community', el: 'Δημιουργία κοινότητας', run: () => (isDemoMode ? ask('How do I create a community?') : setCreateOpen(true)) },
  { id: 'show-joined', en: 'Show my communities', el: 'Οι κοινότητές μου', run: () => setActiveTab('joined') },
  { id: 'show-trending', en: 'Show trending', el: 'Δημοφιλείς', run: () => setActiveTab('trending') },
  { id: 'show-new', en: 'Show new communities', el: 'Νέες κοινότητες', run: () => setActiveTab('new') },
  ...(openId ? [] : [{ id: 'open-first-community', en: 'Open the first community', el: 'Άνοιγμα πρώτης κοινότητας', run: () => { const first = cards.find((community) => inTab(community, activeTab)); if (first) void openCommunity(first); } }]),
 ], [isDemoMode, openId, cards, activeTab, joinedList]);

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

 const share = async (card: CommunityCardData) => {
  // The link lands on this community's space through ?id=, not on the page's top.
  const result = await shareLink({ title: card.name, text: card.description, url: absoluteUrl(`/communities?id=${encodeURIComponent(card.id)}`) });
  if (result === 'copied') toast.success(t('Link copied', 'Ο σύνδεσμος αντιγράφηκε'), card.name);
  else if (result === 'failed') toast.error(t('Could not copy the link', 'Ο σύνδεσμος δεν αντιγράφηκε'));
 };

 const openCard = cards.find((c) => c.id === openId) ?? null;

 return (
  <PageShell
   title={t('Communities', 'Κοινότητες')}
   description={t('Ask, share and learn with other founders.', 'Ρώτα, μοιράσου και μάθε με άλλους ιδρυτές.')}
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
    <div className={SEGMENT_TRACK}>
     {['all', 'joined', 'trending', 'new'].map((tab) => (
      <button
       key={tab}
       type="button"
       aria-pressed={activeTab === tab}
       onClick={() => setActiveTab(tab)}
       className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all",
        segmentItem(activeTab === tab)
       )}
      >
       {t(tab, TAB_EL[tab])}
       <span className="min-w-5 px-1.5 rounded-full bg-stone-200/70 text-stone-600 text-xs tabular-nums leading-5">{tabCount(tab)}</span>
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
      className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm hover:shadow-md transition-all group flex flex-col"
     >
      {/* Top row: avatar + actions */}
      <div className="flex items-start justify-between mb-5">
       <CoverImage
        src={community.avatar}
        alt={community.name}
        className="w-14 h-14 shrink-0 rounded-xl shadow-sm"
        fallback={<span className="flex h-full w-full items-center justify-center bg-stone-900 text-base font-semibold text-white">{community.name.slice(0, 2).toUpperCase()}</span>}
       />
       <div className="flex items-center gap-1">
        <button type="button" aria-label={t('Share community', 'Κοινοποίηση κοινότητας')} title={t('Copy the community link', 'Αντιγραφή συνδέσμου κοινότητας')} className="p-2 text-stone-300 hover:text-stone-700 hover:bg-stone-50 rounded-lg transition-all tap-area" onClick={() => void share(community)}>
         <Share2 className="w-4 h-4" />
        </button>
        <button type="button" aria-label={t('Community options', 'Επιλογές κοινότητας')} className="p-2 text-stone-300 hover:text-stone-700 hover:bg-stone-50 rounded-lg transition-all tap-area" onClick={() => ask(`What can I do in ${community.name}?`)}>
         <MoreVertical className="w-4 h-4" />
        </button>
       </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
       <FactLine items={[community.categoryEl ? t(community.category, community.categoryEl) : community.category]} />
       {community.official && (
        <span className="text-xs font-semibold text-stone-400">{t('Official', 'Επίσημη')}</span>
       )}
       {(community.posts ?? 0) > 80 && (
        <span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
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
     <p className="text-xs font-semibold text-stone-400">{t('Trending Topics', 'Δημοφιλή θέματα')}</p>
     <button type="button" className="text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors tap-area" onClick={() => ask('what events are coming')}>{t('View all topics', 'Όλα τα θέματα')}</button>
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
       className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
      >
       <p className="text-xs font-semibold text-stone-900 group-hover:text-stone-600 transition-colors">{topic.tag}</p>
       {isDemoMode && <p className="text-xs text-stone-400 font-medium mt-1.5">{t(`${topic.posts} discussions`, `${topic.posts} συζητήσεις`)}</p>}
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
     <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-all tap-area">{t('Cancel', 'Άκυρο')}</button>
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

    {/* Members, when the cloud document knows them (platform spaces list them
        as they join; a sample row never invents a roster). */}
    {card.memberIds.length > 0 && (
     <div className="flex items-center gap-2 flex-wrap">
      <Users className="w-3.5 h-3.5 text-stone-400 shrink-0" aria-hidden="true" />
      {card.memberIds.slice(0, 8).map((id) => {
       const member = findPerson(id);
       const name = member?.fullName || id;
       return (
        <span key={id} className="inline-flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full bg-stone-50 border border-stone-100 text-xs text-stone-600" title={name}>
         <Avatar src={member ? avatarOf(member) : undefined} fallback={name} size="xs" />
         <span className="max-w-24 truncate">{name.split(' ')[0]}</span>
        </span>
       );
      })}
      {card.memberIds.length > 8 && <span className="text-xs text-stone-400">+{card.memberIds.length - 8}</span>}
     </div>
    )}

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
     {/* Demo spaces show the sample posts their cast authors wrote; a real
         account reads and writes the community's own collection. */}
     {isDemoMode ? (
      (DEMO_POSTS[card.id] ?? []).length === 0 ? (
       <p className="text-xs text-stone-400 text-center py-6">{t('Community posts appear here.', 'Οι αναρτήσεις της κοινότητας εμφανίζονται εδώ.')}</p>
      ) : (
       (DEMO_POSTS[card.id] ?? []).map((post, i) => {
        const author = findCast(post.authorId);
        const name = author?.fullName || t('A member', 'Ένα μέλος');
        return (
         <div key={i} className="rounded-xl border border-stone-100 p-3">
          <div className="flex items-center gap-2 mb-1.5">
           <Avatar name={name} size="xs" />
           <span className="text-xs font-semibold text-stone-700">{name}</span>
           <span className="text-xs text-stone-400">{t(`${post.days}d ago`, `πριν ${post.days} ημ.`)}</span>
          </div>
          <p className="text-sm font-semibold text-stone-900">{post.title}</p>
          <p className="text-sm text-stone-600 leading-relaxed">{post.body}</p>
         </div>
        );
       })
      )
     ) : (
      <>
       {posts.length === 0 && (
        <p className="text-xs text-stone-400 text-center py-6">{t('No posts yet — start the conversation.', 'Καμία ανάρτηση ακόμη — ξεκίνα τη συζήτηση.')}</p>
       )}
       {posts.map((post) => {
        const liked = uid ? post.likeIds.includes(uid) : false;
        return (
         <div key={post.id} className="rounded-xl border border-stone-100 p-3">
          <div className="flex items-center gap-2 mb-1.5">
           <Avatar name={post.authorName} size="xs" />
           <span className="text-xs font-semibold text-stone-700">{post.authorName}</span>
           {post.createdAt && <span className="text-xs text-stone-400">{new Date(post.createdAt).toLocaleDateString()}</span>}
          </div>
          {post.title && <p className="text-sm font-semibold text-stone-900">{post.title}</p>}
          <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">{post.body}</p>
          <div className="mt-2 flex items-center gap-2">
           <button
            type="button"
            aria-pressed={liked}
            aria-label={liked ? t('Unlike post', 'Αναίρεση «μου αρέσει»') : t('Like post', 'Μου αρέσει')}
            onClick={() => { if (uid) void toggleCommunityPostLike(card.id, post.id, uid, liked).catch(() => undefined); }}
            className={cn('inline-flex items-center gap-1 min-h-8 px-2 rounded-lg text-xs font-medium transition-colors', liked ? 'text-stone-900 bg-stone-100' : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50')}
           >
            <Heart className={cn('w-3.5 h-3.5', liked && 'fill-current')} />
            {post.reactionsCount > 0 && <span className="tabular-nums">{post.reactionsCount}</span>}
           </button>
          </div>
         </div>
        );
       })}
      </>
     )}
    </div>
   </div>
  </Modal>
 );
}
