import React, { useMemo, useState } from 'react';
import {
 useNavigate } from 'react-router-dom';
import { addSession,
 keys,
 listKeys,
 logActivity,
 readIds,
 readSessions,
 toggleId } from '../lib/localLists';
import { 
 Star,
 MessageSquare,
 Search,
 Zap,
 CheckCircle2,
 ArrowRight,
 ShieldCheck,
 Bookmark,
 X
} from "lucide-react";
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useT } from '../lib/language';
import { labelOf } from '../lib/labels';
import PageShell from '../components/ui/PageShell';
import FactLine from '../components/ui/FactLine';
import EmptyHint, { AskLink, ClearFiltersButton } from '../components/ui/EmptyHint';
import { avatarFor, castByRole } from '../data/cast';
import { usePeople } from '../lib/directory';
import { avatarOf, mentorPool, type Person } from '../lib/peopleSource';
import { sendConnectionRequest } from '../lib/social';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../App';
import { useStored } from '../lib/useStored';
import { usePageControls } from '../lib/pageControls';

type MentorCard = {
  id: string;
  name: string;
  role: string;
  company: string;
  expertise: string[];
  rating: number;
  reviews: number;
  availability: string;
  avatar: string;
  verified: boolean;
  roleEl?: string;
  detailedBio: string;
  detailedBioEl?: string;
  achievements: string[];
};

const SAMPLE_MENTORS: MentorCard[] = castByRole('Mentor').map((person) => ({
  id: person.id,
  name: person.fullName,
  role: person.headline,
  roleEl: person.headlineEl,
  company: person.company || '',
  expertise: person.expertise || [],
  rating: person.rating || 0,
  reviews: person.reviews || 0,
  availability: person.availability || 'Flexible',
  avatar: avatarFor(person.id, 200),
  verified: true,
  detailedBio: person.bio,
  detailedBioEl: person.bioEl,
  achievements: person.achievements || [],
}));

function mentorFromPerson(person: Person): MentorCard {
  return {
    id: person.id,
    name: person.fullName,
    role: person.headline || person.role,
    roleEl: person.headlineEl,
    company: person.company,
    expertise: person.expertise.length ? person.expertise : person.skills,
    rating: person.rating,
    reviews: person.reviews,
    availability: person.availability || 'Flexible',
    avatar: avatarOf(person),
    verified: person.verified,
    detailedBio: person.bio,
    detailedBioEl: person.bioEl,
    achievements: person.achievements,
  };
}

function initialsOf(name: string): string {
 return name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

const AVAILABILITY_EL: Record<string, string> = {
 Immediate: 'Άμεσα',
 Flexible: 'Ευέλικτα',
 '1 month notice': 'Σε 1 μήνα',
};

export default function MentorsPage() {
 const t = useT();
 const { isDemoMode, user: authUser } = useAuth();
 const toast = useToast();
 const { people, loading: peopleLoading } = usePeople(authUser?.uid);
 // Demo: the sample mentors. Real account: every member who is a mentor/advisor or open to mentoring.
 const mentors = useMemo<MentorCard[]>(() => {
  if (isDemoMode) return SAMPLE_MENTORS;
  const ids = new Set(mentorPool().map((person) => person.id));
  return people.filter((person) => ids.has(person.id)).map(mentorFromPerson);
 }, [isDemoMode, people]);
 const [sending, setSending] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');
 const [availabilityFilter, setAvailabilityFilter] = useState('All');
 const [expertiseFilter, setExpertiseFilter] = useState('All');
 const [selectedMentor, setSelectedMentor] = useState<any>(null);
 const [isMentorshipModalOpen, setIsMentorshipModalOpen] = useState(false);
 const [focusAreas, setFocusAreas] = useState('');
 const [yourAvailability, setYourAvailability] = useState('');
 const [requestError, setRequestError] = useState('');
 const savedMentors = useStored(() => new Set(readIds(listKeys.mentors)), [keys.mentors]);
 const sessions = useStored(() => readSessions(), [keys.sessions]);
 const navigate = useNavigate();

 usePageControls(() => [
  { id: 'open-filters', en: 'Open filters', el: 'Φίλτρα', run: () => document.getElementById('mentor-filters')?.scrollIntoView({ behavior: 'smooth' }) },
  ...(selectedMentor ? [{ id: 'request-mentorship', en: 'Request mentorship', el: 'Αίτημα καθοδήγησης', run: () => setIsMentorshipModalOpen(true) }] : []),
  { id: 'become-a-mentor', en: 'Become a mentor', el: 'Γίνε μέντορας', run: () => navigate('/profile') },
 ], [selectedMentor]);

 const availableFilters = ['All', 'Immediate', 'Flexible', '1 month notice'];
 const expertiseFilters = ['All', 'Product', 'Growth', 'Fundraising', 'Engineering', 'Marketing'];

 const filteredMentors = mentors.filter(mentor => {
  const matchesSearch = mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             mentor.expertise.some(e => e.toLowerCase().includes(searchQuery.toLowerCase())) ||
             mentor.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
             mentor.company.toLowerCase().includes(searchQuery.toLowerCase());

  const matchesAvailability = availabilityFilter === 'All' || mentor.availability === availabilityFilter;
  const matchesExpertise = expertiseFilter === 'All' || mentor.expertise.some((item) => item.toLowerCase().includes(expertiseFilter.toLowerCase()));

  return matchesSearch && matchesAvailability && matchesExpertise;
 });

 return (
  <PageShell sample={isDemoMode} title={t('Mentors', 'Μέντορες')} description={t('Connect with world-class mentors who have built and scaled successful startups.', 'Συνδέσου με μέντορες κορυφαίου επιπέδου που έχουν χτίσει και αναπτύξει επιτυχημένες startups.')}>
  <div className="space-y-6">
   {/* Hero Section */}
   <div className="bg-stone-900 rounded-xl p-6 sm:p-8 relative overflow-hidden">
    <div className="relative z-10 max-w-2xl space-y-6">
     <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-full backdrop-blur-md text-sm font-medium tracking-wide">
      <Zap className="w-4 h-4 text-amber-400" />
      {t('Expert Guidance', 'Καθοδήγηση από ειδικούς')}
     </div>
     <h2 className="text-base font-semibold text-white tracking-tight leading-tight">
      {t('Learn from the', 'Μάθε από')} <span className="text-stone-400">{t('Best in the World.', 'τα καλύτερα μυαλά του κόσμου.')}</span>
     </h2>
     <p className="text-sm text-stone-400 leading-relaxed">
      {t('Connect with world-class mentors who have built, scaled, and exited successful startups.', 'Συνδέσου με μέντορες κορυφαίου επιπέδου που έχουν χτίσει, αναπτύξει και πουλήσει επιτυχημένες startups.')}
     </p>
     <div className="flex flex-col sm:flex-row gap-4 pt-4 relative z-20">
      <div className="flex-1 relative group">
       <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-stone-500 group-focus-within:text-white transition-colors" />
       <input 
        type="text"
        placeholder={t('Search by expertise, company, or name...', 'Αναζήτηση με εξειδίκευση, εταιρεία ή όνομα…')}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3.5 bg-white/10 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-stone-400 outline-none focus:ring-2 focus:ring-white/20 transition-all font-semibold backdrop-blur-sm shadow-sm"
       />
      </div>
      <button 
       onClick={() => document.getElementById('mentor-grid')?.scrollIntoView({ behavior: 'smooth' })}
       className="px-4 sm:px-6 py-2 sm:py-2.5 bg-white text-stone-900 rounded-xl text-xs sm:text-sm font-semibold hover:bg-stone-50 transition-all shadow-md whitespace-nowrap "
      >
       {t('Find Mentor', 'Βρες μέντορα')}
      </button>
     </div>
     <div id="mentor-filters" className="flex flex-wrap gap-y-3 gap-x-6 pt-2 relative z-20">
      <div className="space-y-2 flex-1">
       <span className="text-xs font-semibold text-stone-400 tracking-wide block">{t('Expertise', 'Εξειδίκευση')}</span>
       <div className="flex flex-wrap gap-2">
        {expertiseFilters.map(filter => (
         <button
          key={filter}
          onClick={() => setExpertiseFilter(filter)}
          className={cn(
           "px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all",
           expertiseFilter === filter 
            ? "bg-white text-stone-900" 
            : "bg-white/10 text-stone-300 hover:bg-white/20 hover:text-white"
          )}
         >
          {filter === 'All' ? t('All', 'Όλα') : labelOf(filter)}
         </button>
        ))}
       </div>
      </div>

      <div className="space-y-2">
       <span className="text-xs font-semibold text-stone-400 tracking-wide block">{t('Availability', 'Διαθεσιμότητα')}</span>
       <div className="flex flex-wrap gap-2">
        {availableFilters.map(filter => (
         <button
          key={filter}
          onClick={() => setAvailabilityFilter(filter)}
          className={cn(
           "px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all",
           availabilityFilter === filter 
            ? "bg-white text-stone-900" 
            : "bg-white/10 text-stone-300 hover:bg-white/20 hover:text-white"
          )}
         >
          {filter === 'All' ? t('Any Time', 'Οποτεδήποτε') : t(filter, AVAILABILITY_EL[filter] ?? filter)}
         </button>
        ))}
       </div>
      </div>
     </div>
    </div>
   </div>

   {/* Stats Bar — every figure read from the list on screen or the reader's own sessions. */}
   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-5 border-y border-stone-100">
    {[
     { label: 'Mentors', labelEl: 'Μέντορες', value: `${mentors.length}` },
     { label: 'Verified Mentors', labelEl: 'Μέντορες με επαλήθευση', value: `${mentors.filter((m) => m.verified).length}` },
     { label: 'Sessions Booked', labelEl: 'Συνεδρίες που κλείστηκαν', value: `${sessions.filter((s) => s.type === 'Mentorship').length}` },
     ...(mentors.some((m) => m.rating > 0)
      ? [{ label: 'Avg. Rating', labelEl: 'Μέση βαθμολογία', value: `${(mentors.reduce((sum, m) => sum + m.rating, 0) / mentors.filter((m) => m.rating > 0).length).toFixed(1)}/5` }]
      : []),
    ].map((stat) => (
     <div key={stat.label} className="text-center space-y-1">
      <div className="text-lg font-semibold text-stone-900">{stat.value}</div>
      <div className="text-xs font-medium text-stone-400 tracking-wider">{t(stat.label, stat.labelEl)}</div>
     </div>
    ))}
   </div>

   {/* Mentor Grid */}
   <div id="mentor-grid" className="space-y-4">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
     <p className="text-xs font-semibold text-stone-400 tracking-wider">{t('Top Rated Mentors', 'Μέντορες με την υψηλότερη βαθμολογία')}</p>
     <div className="flex items-center gap-4">
      <button
       type="button"
       onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'Find a fundraising mentor' } }))}
       className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors group"
      >
       {t('Ask the assistant', 'Ρώτα τον βοηθό')}
       <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
     </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
     {filteredMentors.map((mentor, idx) => (
      <motion.div 
       key={mentor.id}
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ delay: idx * 0.1 }}
       onClick={() => setSelectedMentor(mentor)}
       className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm hover:shadow-md  transition-all group cursor-pointer flex flex-col"
      >
       <div className="relative">
        {mentor.avatar ? (
         <img
          src={mentor.avatar}
          alt={mentor.name}
          className="w-full h-44 object-cover"
          referrerPolicy="no-referrer"
         />
        ) : (
         <div className="w-full h-44 bg-stone-100 flex items-center justify-center text-2xl font-semibold text-stone-400">{initialsOf(mentor.name)}</div>
        )}
        {mentor.verified && (
         <div className="absolute bottom-2 right-2 bg-blue-500 text-white p-1 rounded-md border-2 border-white shadow">
          <ShieldCheck className="w-3 h-3" />
         </div>
        )}
       </div>

       {/* Body */}
       <div className="p-4 flex flex-col flex-1">
        <div className="mb-3">
         <h3 className="text-sm font-semibold text-stone-900 leading-snug">{mentor.name}</h3>
         <FactLine className="mt-0.5" items={[t(mentor.role, mentor.roleEl ?? mentor.role), mentor.company]} label={t('Mentor facts', 'Στοιχεία μέντορα')} />
        </div>

        <FactLine className="mb-3" items={mentor.expertise.slice(0, 3)} label={t('Expertise', 'Εξειδίκευση')} />

        <div className="flex items-center justify-between mb-3">
         <div className="flex items-center gap-1">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="text-xs font-semibold text-stone-900">{mentor.rating}</span>
          <span className="text-xs text-stone-400">({mentor.reviews})</span>
         </div>
         <div className="flex items-center gap-1 text-xs font-semibold text-stone-400 tracking-wider">
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          {t(mentor.availability, AVAILABILITY_EL[mentor.availability] ?? mentor.availability)}
         </div>
        </div>

        <div className="mt-auto flex gap-2">
         <button 
          onClick={(e) => { e.stopPropagation(); navigate('/messages'); }}
          className="flex-1 min-h-11 py-2 bg-stone-900 text-white rounded-lg text-sm font-semibold hover:bg-stone-800 transition-all flex items-center justify-center gap-1.5"
         >
          <MessageSquare className="w-3.5 h-3.5" /> {t('Message', 'Μήνυμα')}
         </button>
         <button 
          aria-label={savedMentors.has(mentor.id) ? t("Remove saved mentor", "Αφαίρεση από τα αποθηκευμένα") : t("Save mentor", "Αποθήκευση μέντορα")}
          onClick={(e) => { e.stopPropagation(); toggleId(listKeys.mentors, mentor.id); }}
          className="min-h-11 min-w-11 inline-flex items-center justify-center bg-stone-50 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-all border border-stone-100"
         >
          <Bookmark className={savedMentors.has(mentor.id) ? 'w-3.5 h-3.5 fill-current text-stone-900' : 'w-3.5 h-3.5'} />
         </button>
        </div>
       </div>
      </motion.div>
     ))}
    </div>
    {!isDemoMode && peopleLoading && mentors.length === 0 && (
     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => <div key={i} className="h-64 rounded-2xl bg-stone-100 animate-pulse" />)}
     </div>
    )}
    {filteredMentors.length === 0 && !(peopleLoading && !isDemoMode) && (
     <EmptyHint
      title={mentors.length === 0 ? t('No mentors have joined yet.', 'Δεν έχουν εγγραφεί μέντορες ακόμη.') : t('No mentors match these filters.', 'Δεν υπάρχουν μέντορες για αυτά τα φίλτρα.')}
      detail={mentors.length === 0 ? t('Members who mark “Open to mentoring” on their profile appear here. Know someone? Invite them.', 'Εδώ εμφανίζονται τα μέλη που δηλώνουν διαθεσιμότητα για καθοδήγηση στο προφίλ τους. Γνωρίζεις κάποιον; Στείλε πρόσκληση.') : t('Try another expertise or availability, or ask the assistant.', 'Δοκίμασε άλλη εξειδίκευση ή διαθεσιμότητα, ή ρώτα τον βοηθό.')}
     >
      {mentors.length > 0 && (
       <ClearFiltersButton onClick={() => { setSearchQuery(''); setAvailabilityFilter('All'); setExpertiseFilter('All'); }} />
      )}
      <AskLink prompt={mentors.length === 0 ? 'Invite 3 founders' : 'Find a fundraising mentor'}>{mentors.length === 0 ? t('Invite someone', 'Πρόσκληση') : t('Ask assistant', 'Ρώτα τον βοηθό')}</AskLink>
     </EmptyHint>
    )}
   </div>

  {/* Become a Mentor CTA */}
  <div className="bg-stone-50 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border border-stone-100">
   <div className="max-w-xl space-y-3">
    <h2 className="text-sm font-semibold text-stone-900 leading-snug">{t('Share your experience. Become a Mentor.', 'Μοιράσου την εμπειρία σου. Γίνε μέντορας.')}</h2>
    <p className="text-xs text-stone-500 leading-relaxed">
     {t('Help the next generation of founders succeed. Join our elite network of mentors and give back to the startup community.', 'Βοήθησε τη νέα γενιά ιδρυτών να πετύχει. Μπες στο επίλεκτο δίκτυο μεντόρων μας και στήριξε την κοινότητα των startups.')}
    </p>
    <div className="flex flex-wrap gap-3 mt-1">
     <button 
      onClick={() => navigate('/profile')}
      className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 transition-all"
     >
      {t('Apply to Mentor', 'Αίτηση ως μέντορας')}
     </button>
     <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'How do I become a mentor?' } }))}
      className="px-4 py-2 bg-white text-stone-900 rounded-lg text-xs font-semibold hover:bg-stone-50 transition-all border border-stone-200"
     >
      {t('Learn More', 'Περισσότερα')}
     </button>
    </div>
   </div>
   <div className="grid grid-cols-2 gap-3">
    {mentors.slice(0, 4).map((mentor, i) => (
     mentor.avatar ? (
     <img
      key={mentor.id}
      src={mentor.avatar}
      alt={mentor.name}
      className={cn(
       "w-20 h-20 rounded-2xl object-cover shadow border-2 border-white",
       i % 2 === 0 ? "translate-y-3" : ""
      )}
      referrerPolicy="no-referrer"
     />
     ) : (
     <div
      key={mentor.id}
      aria-label={mentor.name}
      className={cn(
       "w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center text-base font-semibold text-stone-400 shadow border-2 border-white",
       i % 2 === 0 ? "translate-y-3" : ""
      )}
     >
      {initialsOf(mentor.name)}
     </div>
     )
    ))}
   </div>
  </div>

  {/* Detail Side Panel */}
  <AnimatePresence>
   {selectedMentor && (
    <>
     <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40"
      onClick={() => setSelectedMentor(null)}
     />
     <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed right-0 top-16 bottom-0 z-[65] w-full overflow-y-auto bg-white shadow-sm sm:inset-y-0 sm:max-w-md"
     >
      <div className="p-6 md:p-8 space-y-8">
       {/* Close Button */}
       <button 
        type="button"
        aria-label={t('Close mentor details', 'Κλείσιμο στοιχείων μέντορα')}
        onClick={() => setSelectedMentor(null)}
        className="absolute top-6 right-6 p-2 text-stone-400 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 rounded-full transition-colors"
       >
        <X className="w-5 h-5" />
       </button>

       {/* Profile Header */}
       <div className="text-center space-y-4 pt-8">
        {selectedMentor.avatar ? (
         <img
          src={selectedMentor.avatar}
          alt={selectedMentor.name}
          className="w-32 h-32 mx-auto rounded-3xl object-cover shadow-xl border-4 border-white"
          referrerPolicy="no-referrer"
         />
        ) : (
         <div className="w-32 h-32 mx-auto rounded-3xl bg-stone-100 flex items-center justify-center text-3xl font-semibold text-stone-400 shadow-xl border-4 border-white">{initialsOf(selectedMentor.name)}</div>
        )}
        <div>
         <h2 className="text-base font-semibold text-stone-900 tracking-tight inline-flex items-center gap-2">
          {selectedMentor.name}
          {selectedMentor.verified && <ShieldCheck className="w-5 h-5 text-blue-500" />}
         </h2>
         <p className="text-stone-500 font-medium">{t(selectedMentor.role, selectedMentor.roleEl ?? selectedMentor.role)}</p>
        </div>

        <div className="flex items-center justify-center gap-4 text-sm font-medium">
         <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
          <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
          {selectedMentor.rating} ({selectedMentor.reviews})
         </div>
         <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
          <CheckCircle2 className="w-4 h-4" />
          {t(selectedMentor.availability, AVAILABILITY_EL[selectedMentor.availability] ?? selectedMentor.availability)}
         </div>
        </div>
       </div>

       {/* Expertise */}
       <div className="space-y-3">
        <h3 className="text-sm font-semibold text-stone-400 tracking-wide">{t('Expertise', 'Εξειδίκευση')}</h3>
        <div className="flex flex-wrap gap-2">
         {selectedMentor.expertise.map((skill: string) => (
          <span key={skill} className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-xl text-sm font-medium border border-stone-200">
           {skill}
          </span>
         ))}
        </div>
       </div>

       {/* Bio */}
       <div className="space-y-3">
        <h3 className="text-sm font-semibold text-stone-400 tracking-wide">{t('About', 'Σχετικά')}</h3>
        <p className="text-stone-600 leading-relaxed">
         {selectedMentor.detailedBio ? t(selectedMentor.detailedBio, selectedMentor.detailedBioEl ?? selectedMentor.detailedBio) : t("No detailed bio available.", "Δεν υπάρχει αναλυτικό βιογραφικό.")}
        </p>
       </div>

       {/* Achievements */}
       {selectedMentor.achievements && selectedMentor.achievements.length > 0 && (
        <div className="space-y-3">
         <h3 className="text-sm font-semibold text-stone-400 tracking-wide">{t('Achievements', 'Επιτεύγματα')}</h3>
         <ul className="space-y-3">
          {selectedMentor.achievements.map((achievement: string, idx: number) => (
           <li key={idx} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
             <Star className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <span className="text-stone-700 font-medium text-sm leading-tight leading-relaxed">{achievement}</span>
           </li>
          ))}
         </ul>
        </div>
       )}

       {/* Action Button */}
       <div className="pt-4 pb-12">
        <button 
         onClick={() => setIsMentorshipModalOpen(true)}
         className="w-full py-2 sm:py-2.5 bg-stone-900 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-stone-800 transition-all shadow-md text-center"
        >
         {t('Request Mentorship', 'Αίτημα καθοδήγησης')}
        </button>
       </div>
      </div>
     </motion.div>
    </>
   )}
  </AnimatePresence>

  {/* Mentorship Request Modal */}
  <AnimatePresence>
   {isMentorshipModalOpen && (
    <>
     <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[60]"
      onClick={() => setIsMentorshipModalOpen(false)}
     />
     <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-xl shadow-sm z-[70] overflow-hidden"
     >
      <div className="p-8 space-y-6">
       <div className="flex items-start justify-between">
        <div>
         <h2 className="text-base font-semibold text-stone-900">{t('Request Mentorship', 'Αίτημα καθοδήγησης')}</h2>
         <p className="text-stone-500 mt-1">{t('Connect with', 'Σύνδεση με')} {selectedMentor?.name}</p>
        </div>
       </div>

       <div className="space-y-5">
        {requestError && (
         <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
          {requestError}
         </div>
        )}
        <div className="space-y-2">
         <label className="text-sm font-semibold text-stone-900">{t('Focus Areas', 'Τομείς εστίασης')}</label>
         <textarea 
          placeholder={t('What specific challenges are you facing? Example: Fundraising, PMF, Go-to-Market...', 'Ποιες συγκεκριμένες προκλήσεις αντιμετωπίζεις; Π.χ. χρηματοδότηση, PMF, go-to-market…')}
          value={focusAreas}
          onChange={(e) => {
           setFocusAreas(e.target.value);
           setRequestError('');
          }}
          rows={4}
          className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm transition-all"
         />
        </div>

        <div className="space-y-2">
         <label className="text-sm font-semibold text-stone-900">{t('Your Availability', 'Η διαθεσιμότητά σου')}</label>
         <input 
          type="text"
          placeholder={t('e.g. Next week, Mon-Wed after 5pm EST', 'π.χ. την επόμενη εβδομάδα, Δευ-Τετ μετά τις 17:00 EST')}
          value={yourAvailability}
          onChange={(e) => {
           setYourAvailability(e.target.value);
           setRequestError('');
          }}
          className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm transition-all"
         />
        </div>
       </div>

       <div className="flex items-center gap-3 pt-4">
        <button 
         onClick={() => setIsMentorshipModalOpen(false)}
         className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 bg-stone-100 text-stone-900 font-semibold rounded-xl text-xs sm:text-sm hover:bg-stone-200 transition-all border border-stone-200"
        >
         {t('Cancel', 'Ακύρωση')}
        </button>
        <button 
         type="button"
         disabled={sending}
         onClick={async () => {
          if (!focusAreas.trim() || !yourAvailability.trim()) {
           setRequestError(t('Please fill in all fields before sending the request.', 'Συμπλήρωσε όλα τα πεδία πριν στείλεις το αίτημα.'));
           return;
          }
          const mentor = selectedMentor as MentorCard | null;
          if (!mentor) return;
          setSending(true);
          try {
           const note = `${t('Focus areas', 'Θέματα')}: ${focusAreas.trim()}\n${t('Availability', 'Διαθεσιμότητα')}: ${yourAvailability.trim()}`;
           if (!isDemoMode) {
            // A mentorship request is a connection request of type Mentor: the mentor is notified and answers from Requests.
            await sendConnectionRequest({ id: mentor.id, fullName: mentor.name, headline: mentor.role, avatarUrl: mentor.avatar }, 'Mentor', note);
           }
           addSession({
            id: String(Date.now()),
            title: `${t('Mentoring', 'Καθοδήγηση')} · ${mentor.name}`,
            type: 'Mentorship',
            time: yourAvailability.trim(),
            duration: '45m',
            location: t('Messages', 'Μηνύματα'),
            participants: [mentor.name],
            priority: 'Medium',
           });
           logActivity({ kind: 'session', title: `Requested mentoring from ${mentor.name}`, titleEl: `Αίτημα καθοδήγησης προς ${mentor.name}`, href: `/profile/${mentor.id}`, byAssistant: false });
           toast.success(t('Request sent', 'Το αίτημα στάλθηκε'), isDemoMode ? t('In the demo, requests stay on this device.', 'Στη δοκιμαστική λειτουργία, τα αιτήματα μένουν σε αυτή τη συσκευή.') : t(`${mentor.name} will see your focus areas and availability and can reply in Messages.`, `${mentor.name} θα δει τα θέματα και τη διαθεσιμότητά σου και μπορεί να απαντήσει στα Μηνύματα.`));
           setIsMentorshipModalOpen(false);
           setSelectedMentor(null);
           setFocusAreas('');
           setYourAvailability('');
           setRequestError('');
          } catch (error) {
           const code = error instanceof Error ? error.message : '';
           setRequestError(code === 'declined' ? t('This mentor declined an earlier request.', 'Αυτός ο μέντορας απέρριψε προηγούμενο αίτημα.') : t('The request could not be sent. Please try again.', 'Το αίτημα δεν στάλθηκε. Δοκίμασε ξανά.'));
          } finally {
           setSending(false);
          }
         }}
         className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 bg-stone-900 text-white font-semibold rounded-xl text-xs sm:text-sm hover:bg-stone-800 transition-all shadow-md disabled:opacity-60"
        >
         {sending ? t('Sending…', 'Αποστολή…') : t('Send request', 'Αποστολή αιτήματος')}
        </button>
       </div>
      </div>
     </motion.div>
    </>
   )}
  </AnimatePresence>
 </div>
 </PageShell>
 );
}
