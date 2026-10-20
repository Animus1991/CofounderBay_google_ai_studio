import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
 Search,
 Star,
 UserPlus,
 MessageSquare,
 ChevronDown,
 Check,
 Clock,
 SlidersHorizontal,
 EyeOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { keys, logActivity, readIds, readMatchFilters, readSaved, removeSaved, saveProfile, saveRequest, toggleId, writeMatchFilters } from '../lib/localLists';
import { compatibility, fromCast, fromProfile } from '../lib/compatibility';
import { useStored } from '../lib/useStored';
import { useAuth } from '../App';
import { rememberPerson } from '../lib/people';
import { bothText, labelOf } from '../lib/labels';
import { useLanguage, useT } from '../lib/language';
import PageShell from '../components/ui/PageShell';
import Avatar from '../components/ui/Avatar';
import FactLine from '../components/ui/FactLine';
import EmptyHint, { AskLink } from '../components/ui/EmptyHint';
import PersonHovercard from '../components/ui/PersonHovercard';
import { useToast } from '../context/ToastContext';
import { parseQualifiers, QUALIFIER_HINT_EL, QUALIFIER_HINT_EN } from '../lib/searchQualifiers';
import { usePeople } from '../lib/directory';
import { avatarOf, cofounderPool, isOnline, type Person } from '../lib/peopleSource';
import { connectionStateWith, respondToConnection, sendConnectionRequest, useConnections, withdrawConnection } from '../lib/social';

const STAGES = ['Idea', 'Pre-seed', 'Seed', 'Series A', 'Growth'];
const ROLES = ['Founder', 'Co-Founder Candidate', 'Technical Founder', 'Product Founder', 'Business Founder', 'Growth Founder', 'Design Founder'];
const COMMITMENTS = ['Full-time', 'Part-time', 'Side Project', 'Advisory'];
const PAGE = 24;

export default function MatchDiscovery() {
 useLanguage();
 const t = useT();
 const { user: currentUser, profile: viewerProfile, isDemoMode } = useAuth();
 const navigate = useNavigate();
 const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
 const real = !isDemoMode && Boolean(currentUser?.uid);
 const { people, loading, error } = usePeople(currentUser?.uid);
 const connections = useConnections();
 const [connecting, setConnecting] = useState<string | null>(null);
 const [visibleCount, setVisibleCount] = useState(PAGE);
 const storedFilters = useStored(readMatchFilters, ['cfb.matchFilters']);
 const [searchQuery, setSearchQuery] = useState(() => storedFilters.q);
 const [showFilters, setShowFilters] = useState(false);
 const savedIds = useStored(() => readSaved().map((item) => item.id), ['cfb.savedProfiles']);
 const hiddenIds = useStored(() => readIds(keys.hiddenPeople), [keys.hiddenPeople]);
 const [filters, setFilters] = useState({
  stage: storedFilters.stage,
  role: storedFilters.role,
  commitment: storedFilters.commitment,
  location: storedFilters.location
 });
 void connections.items; // re-render when connection states change

 // The same pool Matches has always ranked: founders and co-founder candidates, from the live directory.
 const poolIds = new Set(cofounderPool().map((person) => person.id));
 const profiles = people.filter((person) => poolIds.has(person.id));

 const persistFilters = (next: { q?: string; stage?: string; role?: string; commitment?: string; location?: string; skill?: string; industry?: string }) => {
  const parsed = parseQualifiers(next.q ?? searchQuery);
  writeMatchFilters({
   q: next.q ?? searchQuery,
   role: next.role ?? parsed.filters.role ?? filters.role,
   stage: next.stage ?? parsed.filters.stage ?? filters.stage,
   commitment: next.commitment ?? filters.commitment,
   location: next.location ?? parsed.filters.location ?? filters.location,
   skill: next.skill ?? parsed.filters.skill ?? storedFilters.skill,
   industry: next.industry ?? parsed.filters.industry ?? storedFilters.industry,
  });
 };

 const handleConnect = async (e: React.MouseEvent, person: Person) => {
  e.stopPropagation();
  if (!currentUser) return;
  setConnecting(person.id);
  try {
   if (!real) {
    saveRequest({ id: person.id, fullName: person.fullName, role: person.role, industry: person.industry || '', location: person.location || '', note: person.headline || '', status: 'pending' });
    logActivity({ kind: 'request', title: `Requested ${person.fullName}`, titleEl: `Αίτημα προς ${person.fullName}`, href: `/profile/${person.id}` });
    toastSuccess(t('Request sent', 'Το αίτημα στάλθηκε'), t('In the demo, requests stay on this device.', 'Στη δοκιμαστική λειτουργία, τα αιτήματα μένουν σε αυτή τη συσκευή.'));
    return;
   }
   const state = connectionStateWith(person.id);
   if (state.state === 'outgoing' && state.record) {
    await withdrawConnection(state.record);
    toastInfo(t('Request withdrawn', 'Το αίτημα ανακλήθηκε'));
    return;
   }
   if (state.state === 'incoming' && state.record) {
    await respondToConnection(state.record, true);
    toastSuccess(t('Connected', 'Συνδεθήκατε'), t(`You and ${person.fullName} can message each other now.`, `Μπορείτε πλέον να ανταλλάσσετε μηνύματα με ${person.fullName}.`));
    return;
   }
   const result = await sendConnectionRequest({ id: person.id, fullName: person.fullName, headline: person.headline, avatarUrl: avatarOf(person) }, 'Co-Founder');
   logActivity({ kind: 'request', title: `Requested ${person.fullName}`, titleEl: `Αίτημα προς ${person.fullName}`, href: `/profile/${person.id}` });
   if (result === 'accepted') toastSuccess(t('Connected', 'Συνδεθήκατε'), t('They had already asked — you are now connected.', 'Είχαν ήδη ζητήσει σύνδεση — τώρα είστε συνδεδεμένοι.'));
   else if (result === 'exists') toastInfo(t('Already requested', 'Έχει ήδη σταλεί αίτημα'));
   else toastSuccess(t('Request sent', 'Το αίτημα στάλθηκε'), t('You will be notified when they answer.', 'Θα ειδοποιηθείς όταν απαντήσουν.'));
  } catch (err) {
   const code = err instanceof Error ? err.message : '';
   toastError(t('Could not send the request', 'Το αίτημα δεν στάλθηκε'), code === 'declined' ? t('This member declined an earlier request.', 'Αυτό το μέλος απέρριψε προηγούμενο αίτημα.') : t('Please try again.', 'Δοκίμασε ξανά.'));
  } finally {
   setConnecting(null);
  }
 };

 const handleSave = (e: React.MouseEvent, person: Person) => {
  e.stopPropagation();
  if (savedIds.includes(person.id)) removeSaved(person.id);
  else saveProfile({ id: person.id, fullName: person.fullName, role: person.role, industry: person.industry || '', location: person.location || '', note: person.headline || '' });
 };

 const handleHide = (e: React.MouseEvent, person: Person) => {
  e.stopPropagation();
  toggleId(keys.hiddenPeople, person.id);
  toastInfo(t(`${person.fullName.split(' ')[0]} hidden`, `Απόκρυψη: ${person.fullName.split(' ')[0]}`), t('Hidden members stay out of Matches and Explore. Undo from Settings › Privacy.', 'Τα κρυμμένα μέλη μένουν εκτός Αντιστοιχίσεων και Εξερεύνησης. Αναίρεση από Ρυθμίσεις › Απόρρητο.'));
 };

 const handleMessage = (e: React.MouseEvent, targetUid: string) => {
  e.stopPropagation();
  navigate(`/messages?user=${targetUid}`);
 };

 const viewer = fromProfile(viewerProfile);
 const parsedSearch = parseQualifiers(searchQuery);
 const scored = profiles
  .filter((person) => !hiddenIds.includes(person.id))
  .filter((person) => {
   const haystack = `${person.fullName} ${person.headline} ${person.bio} ${person.skills.join(' ')} ${person.industry}`.toLowerCase();
   const freeText = parsedSearch.text.toLowerCase();
   const stage = parsedSearch.filters.stage || filters.stage;
   const role = parsedSearch.filters.role || filters.role;
   const location = parsedSearch.filters.location || filters.location;
   const matchesSearch = !freeText || haystack.includes(freeText);
   const matchesStage = !stage || person.stage.toLowerCase().includes(stage.toLowerCase());
   const matchesRole = !role || person.role.toLowerCase().includes(role.toLowerCase()) || person.headline.toLowerCase().includes(role.toLowerCase());
   const matchesCommitment = !filters.commitment || person.commitment === filters.commitment;
   const matchesLocation = !location || person.location.toLowerCase().includes(location.toLowerCase());
   const matchesSkill = !parsedSearch.filters.skill || person.skills.some((skill) => skill.toLowerCase().includes(parsedSearch.filters.skill!.toLowerCase()));
   const matchesIndustry = !parsedSearch.filters.industry || person.industry.toLowerCase().includes(parsedSearch.filters.industry.toLowerCase());
   return matchesSearch && matchesStage && matchesRole && matchesCommitment && matchesLocation && matchesSkill && matchesIndustry;
  })
  .map((person) => ({
   person,
   fit: compatibility(viewer, fromCast({ skills: person.skills, lookingFor: person.lookingFor, interests: person.interests, industry: person.industry, stage: person.stage, commitment: person.commitment, city: person.city || person.location.split(',')[0], timezone: person.timezone })),
  }))
  .sort((a, b) => (b.fit.score ?? -1) - (a.fit.score ?? -1));
 const filteredProfiles = scored.slice(0, visibleCount);
 const hasMore = scored.length > visibleCount;

 const filterCause = [
  parsedSearch.text && t(`search “${parsedSearch.text}”`, `αναζήτηση «${parsedSearch.text}»`),
  (parsedSearch.filters.stage || filters.stage) && `${t('stage', 'στάδιο')} ${labelOf(parsedSearch.filters.stage || filters.stage)}`,
  (parsedSearch.filters.role || filters.role) && `${t('role', 'ρόλος')} ${labelOf(parsedSearch.filters.role || filters.role)}`,
  filters.commitment && `${t('commitment', 'δέσμευση')} ${labelOf(filters.commitment)}`,
  (parsedSearch.filters.location || filters.location) && `${t('location', 'τοποθεσία')} ${parsedSearch.filters.location || filters.location}`,
  parsedSearch.filters.skill && `${t('skill', 'δεξιότητα')} ${parsedSearch.filters.skill}`,
  parsedSearch.filters.industry && `${t('industry', 'κλάδος')} ${parsedSearch.filters.industry}`,
 ].filter(Boolean).join(', ');

 const connectState = (id: string) => (real ? connectionStateWith(id).state : 'none');

 return (
  <PageShell
   title={t('Find co-founders', 'Βρες συνιδρυτές')}
   description={t('Members ranked by how well they complement your skills, stage, commitment and working hours — every score explained.', 'Μέλη ταξινομημένα κατά το πόσο συμπληρώνουν τις δεξιότητες, το στάδιο, τη δέσμευση και τις ώρες εργασίας σου — κάθε σκορ με εξήγηση.')}
  >
   <div className="space-y-5">
    <div className="space-y-3">
    <div className="flex gap-2">
     <div className="flex-1 relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
      <input
       type="search"
       aria-label={t('Search members', 'Αναζήτηση μελών')}
       placeholder={t(`Skills, headline, or ${QUALIFIER_HINT_EN}`, `Δεξιότητες, τίτλος ή ${QUALIFIER_HINT_EL}`)}
       value={searchQuery}
       onChange={(e) => { setSearchQuery(e.target.value); persistFilters({ q: e.target.value }); setVisibleCount(PAGE); }}
       className="w-full min-h-11 pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 transition-all"
      />
     </div>
     <button
      type="button"
      onClick={() => setShowFilters(!showFilters)}
      aria-expanded={showFilters}
      className={cn(
       "flex items-center gap-2 min-h-11 px-3 rounded-xl text-xs font-medium transition-all border",
       showFilters ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
      )}
     >
      <SlidersHorizontal className="w-3.5 h-3.5" />
      {t('Filters', 'Φίλτρα')}
      {Object.values(filters).filter(Boolean).length > 0 && (
       <span className="ml-1 px-1.5 py-0.5 bg-stone-100 text-stone-900 rounded text-xs font-semibold">{Object.values(filters).filter(Boolean).length}</span>
      )}
     </button>
    </div>
    {searchQuery.trim().length > 1 && (
     <p className="text-xs text-stone-400">{t(`Searching names, headlines and skills for “${searchQuery.trim()}”. Shortcuts: ${QUALIFIER_HINT_EN}.`, `Αναζήτηση σε ονόματα, τίτλους και δεξιότητες για «${searchQuery.trim()}». Συντομεύσεις: ${QUALIFIER_HINT_EL}.`)}</p>
    )}

    <AnimatePresence>
     {showFilters && (
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="bg-white p-4 rounded-2xl border border-stone-200 grid grid-cols-2 lg:grid-cols-4 gap-3">
       {[{ label: t('Stage', 'Στάδιο'), key: 'stage' as const, opts: STAGES }, { label: t('Role', 'Ρόλος'), key: 'role' as const, opts: ROLES }, { label: t('Commitment', 'Δέσμευση'), key: 'commitment' as const, opts: COMMITMENTS }].map(({ label, key, opts }) => (
        <div key={key} className="space-y-1.5">
         <label className="text-xs font-semibold text-stone-400 tracking-wider" htmlFor={`filter-${key}`}>{label}</label>
         <select
          id={`filter-${key}`}
          value={filters[key]}
          onChange={(e) => { const next = { ...filters, [key]: e.target.value }; setFilters(next); persistFilters(next); setVisibleCount(PAGE); }}
          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 outline-none focus:ring-1 focus:ring-stone-900"
         >
          <option value="">{t('All', 'Όλα')}</option>
          {opts.map(o => <option key={o} value={o}>{labelOf(o)}</option>)}
         </select>
        </div>
       ))}
       <div className="space-y-1.5">
        <label className="text-xs font-semibold text-stone-400 tracking-wider" htmlFor="filter-location">{t('Location', 'Τοποθεσία')}</label>
        <input
         id="filter-location"
         type="text"
         value={filters.location}
         onChange={(e) => { const next = { ...filters, location: e.target.value }; setFilters(next); persistFilters(next); setVisibleCount(PAGE); }}
         placeholder={t('City or country', 'Πόλη ή χώρα')}
         className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 outline-none focus:ring-1 focus:ring-stone-900 placeholder:text-stone-400"
        />
       </div>
       <div className="col-span-2 lg:col-span-4 flex items-end">
        <button
         type="button"
         onClick={() => { const next = { stage: '', role: '', commitment: '', location: '' }; setFilters(next); persistFilters({ ...next, q: searchQuery, skill: '', industry: '' }); }}
         className="w-full min-h-10 text-xs font-medium text-stone-400 hover:text-stone-900 border border-stone-200 rounded-lg transition-colors bg-white"
        >
         {t('Reset filters', 'Επαναφορά φίλτρων')}
        </button>
       </div>
      </motion.div>
     )}
    </AnimatePresence>
   </div>

   {error && real && (
    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">{t('The member list could not be refreshed. Showing what was last loaded.', 'Η λίστα μελών δεν ανανεώθηκε. Εμφανίζεται ό,τι φορτώθηκε τελευταία.')}</p>
   )}

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
     filteredProfiles.map(({ person, fit }, idx) => {
      const state = connectState(person.id);
      const busy = connecting === person.id;
      return (
      <motion.div
       key={person.id}
       initial={{ opacity: 0, y: 12 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ delay: Math.min(idx, 12) * 0.03 }}
       role="link"
       tabIndex={0}
       onKeyDown={(e) => { if (e.key === 'Enter') { rememberPerson({ id: person.id, fullName: person.fullName, headline: person.headline, location: person.location, role: person.role, industry: person.industry, bio: person.bio }); navigate(`/profile/${person.id}`); } }}
       onClick={() => { rememberPerson({ id: person.id, fullName: person.fullName, headline: person.headline, location: person.location, role: person.role, industry: person.industry, bio: person.bio }); navigate(`/profile/${person.id}`); }}
       className="bg-white rounded-2xl border border-stone-100 p-5 hover:border-stone-300 hover:shadow-md transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-stone-900/20"
      >
       <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
         <Avatar src={avatarOf(person) || undefined} fallback={person.fullName || 'Founder'} size="lg" status={isOnline(person) ? 'online' : undefined} className="w-11 h-11" />
         <div className="min-w-0">
          <PersonHovercard person={person.id}>
           <p className="text-sm font-medium text-stone-900 group-hover:text-stone-700 truncate">{person.fullName || t('Founder', 'Ιδρυτής')}</p>
          </PersonHovercard>
          <p className="text-xs text-stone-400 line-clamp-1">{person.headline ? t(person.headline, person.headlineEl || person.headline) : labelOf(person.role)}</p>
          {fit.headline && <p className="text-xs text-stone-500">{bothText(fit.headline.en, fit.headline.el)}</p>}
         </div>
        </div>
        <span className="text-xs font-semibold text-stone-900 bg-stone-50 border border-stone-200 px-2 py-1 rounded-lg shrink-0 tabular-nums" title={t('Compatibility with your profile', 'Συμβατότητα με το προφίλ σου')}>{fit.score == null ? '—' : `${fit.score}%`}</span>
       </div>

       <p className="text-xs text-stone-500 leading-relaxed line-clamp-2 mb-4">
        {person.bio ? t(person.bio, person.bioEl || person.bio) : t('No bio yet.', 'Δεν υπάρχει περιγραφή ακόμη.')}
       </p>

       <FactLine className="mb-4" items={[labelOf(person.stage), labelOf(person.commitment), person.location]} label={t('Profile facts', 'Στοιχεία προφίλ')} />

       <div className="flex items-center gap-2">
        <button
         type="button"
         onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Why do I match with ${person.fullName}?`, context: person.fullName } })); }}
         className="min-h-10 px-2.5 bg-stone-50 text-stone-700 rounded-xl hover:bg-stone-100 transition-all border border-stone-100 text-xs font-medium"
         title={t('Ask the assistant why this is a match', 'Ρώτα τον βοηθό γιατί ταιριάζετε')}
        >
         {t('Why?', 'Γιατί;')}
        </button>
        <button
         type="button"
         onClick={(e) => void handleConnect(e, person)}
         disabled={busy || state === 'connected' || state === 'declined'}
         className={cn(
          'flex-1 flex items-center justify-center gap-1.5 min-h-10 rounded-xl text-xs font-medium transition-all disabled:opacity-60',
          state === 'connected' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
           : state === 'outgoing' ? 'bg-white text-stone-700 border border-stone-200 hover:border-stone-900'
           : state === 'incoming' ? 'bg-stone-900 text-white hover:bg-stone-800'
           : 'bg-stone-900 text-white hover:bg-stone-800',
         )}
        >
         {state === 'connected' ? <Check className="w-3.5 h-3.5" /> : state === 'outgoing' ? <Clock className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
         {busy ? t('Sending…', 'Αποστολή…')
          : state === 'connected' ? t('Connected', 'Συνδεδεμένοι')
          : state === 'outgoing' ? t('Requested', 'Αίτημα σταλμένο')
          : state === 'incoming' ? t('Accept', 'Αποδοχή')
          : state === 'declined' ? t('Declined', 'Απορρίφθηκε')
          : t('Connect', 'Σύνδεση')}
        </button>
        <button type="button" onClick={(e) => handleMessage(e, person.id)} aria-label={t('Message', 'Μήνυμα')} title={t('Message', 'Μήνυμα')} className="min-h-10 min-w-10 inline-flex items-center justify-center bg-stone-50 text-stone-700 rounded-xl hover:bg-stone-100 transition-all border border-stone-100">
         <MessageSquare className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={(e) => handleSave(e, person)} aria-pressed={savedIds.includes(person.id)} aria-label={savedIds.includes(person.id) ? t('Remove from saved', 'Αφαίρεση από τα αποθηκευμένα') : t('Save', 'Αποθήκευση')} title={savedIds.includes(person.id) ? t('Remove from saved', 'Αφαίρεση από τα αποθηκευμένα') : t('Save', 'Αποθήκευση')} className="min-h-10 min-w-10 inline-flex items-center justify-center bg-stone-50 text-stone-700 rounded-xl hover:bg-stone-100 transition-all border border-stone-100">
         <Star className={cn('w-3.5 h-3.5', savedIds.includes(person.id) && 'fill-current text-amber-500')} />
        </button>
        <button type="button" onClick={(e) => handleHide(e, person)} aria-label={t('Hide this member', 'Απόκρυψη μέλους')} title={t('Hide this member', 'Απόκρυψη μέλους')} className="min-h-10 min-w-10 inline-flex items-center justify-center bg-stone-50 text-stone-400 rounded-xl hover:bg-stone-100 hover:text-stone-700 transition-all border border-stone-100">
         <EyeOff className="w-3.5 h-3.5" />
        </button>
       </div>
      </motion.div>
      );
     })
    ) : (
     <EmptyHint
      className="col-span-full"
      title={filterCause ? t(`No members match ${filterCause}.`, `Κανένα μέλος δεν ταιριάζει σε ${filterCause}.`) : profiles.length === 0 && real ? t('No other founders have joined yet.', 'Δεν έχουν εγγραφεί άλλοι ιδρυτές ακόμη.') : t('No members found', 'Δεν βρέθηκαν μέλη')}
      detail={filterCause ? t('Clear the filter, or ask the assistant who ranks highest for your profile.', 'Καθάρισε το φίλτρο ή ρώτα τον βοηθό ποιοι ταιριάζουν περισσότερο στο προφίλ σου.') : t('Invite the founders you already know — the fit check link takes a minute.', 'Προσκάλεσε τους ιδρυτές που ήδη γνωρίζεις — ο σύνδεσμος fit check παίρνει ένα λεπτό.')}
     >
      {filterCause ? (
       <button
        type="button"
        onClick={() => { setSearchQuery(''); setFilters({ stage: '', role: '', commitment: '', location: '' }); persistFilters({ q: '', stage: '', role: '', commitment: '', location: '', skill: '', industry: '' }); }}
        className="text-xs font-medium text-stone-900 hover:underline min-h-11"
       >
        {t('Clear filters', 'Καθαρισμός φίλτρων')}
       </button>
      ) : (
       <AskLink prompt="Invite 3 founders">{t('Invite founders', 'Πρόσκληση ιδρυτών')}</AskLink>
      )}
      <AskLink prompt="who is my best match" />
     </EmptyHint>
    )}
   </div>

   {!loading && hasMore && (
    <div className="flex justify-center">
     <button
      type="button"
      onClick={() => setVisibleCount((count) => count + PAGE)}
      className="min-h-11 px-4 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-600 hover:text-stone-900 hover:border-stone-300 transition-all flex items-center gap-2"
     >
      {t(`Show more (${scored.length - visibleCount} left)`, `Περισσότερα (${scored.length - visibleCount} ακόμη)`)} <ChevronDown className="w-3.5 h-3.5" />
     </button>
    </div>
   )}
  </div>
  </PageShell>
 );
}
