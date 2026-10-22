import React, { useState, useMemo, useEffect } from "react";
import {
 Search,
 Globe,
 Users,
 Zap,
 ArrowRight,
 Rocket,
 Activity,
 X,
 Calendar as CalendarIcon,
 MessageSquare,
 Bookmark,
 SlidersHorizontal,
 Grid,
 List as ListIcon,
 ShieldCheck
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import Button from "../components/ui/Button";
import PageShell from "../components/ui/PageShell";
import FactLine from "../components/ui/FactLine";
import EmptyHint, { AskLink, ClearFiltersButton } from "../components/ui/EmptyHint";
import { User } from "../types";
import { useAuth } from "../App";
import { readDiscoveryFilters, writeDiscoveryFilters, addSavedSearch, removeSavedSearch, readSavedSearches, keys, readValue, writeValue } from "../lib/localLists";
import { cn } from "../lib/utils";
import { explainMatch } from "../lib/matchReason";
import { bothText, labelOf } from "../lib/labels";
import { useLanguage, useT } from "../lib/language";
import { rememberPerson } from "../lib/people";
import { usePeople } from "../lib/directory";
import { avatarOf, isOnline } from "../lib/peopleSource";
import PersonHovercard from "../components/ui/PersonHovercard";
import Avatar from "../components/ui/Avatar";
import { parseQualifiers, QUALIFIER_HINT_EL, QUALIFIER_HINT_EN } from "../lib/searchQualifiers";
import { formatDate, formatTime } from "../lib/dates";
import { coverFor } from "../data/photos";
import { usePageControls } from "../lib/pageControls";
import { onCatalog, str, strList, toMillis } from "../lib/catalog";
import { onCommunities } from "../lib/communities";
import { useStored } from "../lib/useStored";

interface DiscoveryProps {
 user: User;
}

type CategoryType = "All" | "Matches" | "Communities" | "Opportunities" | "Events";

const availableSkills = ["React", "Node.js", "Python", "AI/ML", "Product Management", "Growth Marketing", "UI/UX Design", "Blockchain", "Sales", "Strategy"];
const availableIndustries = ["SaaS", "AI/ML", "Fintech", "Healthtech", "Sustainability", "Web3", "E-commerce"];

export default function Discovery({ user }: DiscoveryProps) {
 useLanguage();
 const t = useT();
 const { profile: authProfile, isDemoMode, user: authUser } = useAuth();
 const viewerSkills = (user as any)?.skills ?? authProfile?.skills;
 const viewerIndustry = (user as any)?.profile?.industry ?? (user as any)?.industry ?? authProfile?.industry;
 const [activeCategory, setActiveCategory] = useState<CategoryType>("All");
 const remembered = readDiscoveryFilters();
 const [searchQuery, setSearchQuery] = useState(remembered.q);
 const navigate = useNavigate();
 const [suggestions, setSuggestions] = useState<string[]>([]);
 const [showSuggestions, setShowSuggestions] = useState(false);
 const [isFilterOpen, setIsFilterOpen] = useState(false);
 const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
 const [selectedSkills, setSelectedSkills] = useState<string[]>(remembered.skills);
 const [selectedIndustries, setSelectedIndustries] = useState<string[]>(remembered.industries);
 const [selectedStages, setSelectedStages] = useState<string[]>(remembered.stages);
 const [selectedLocations, setSelectedLocations] = useState<string[]>(remembered.locations);
 useEffect(() => {
  writeDiscoveryFilters({ q: searchQuery, skills: selectedSkills, industries: selectedIndustries, stages: selectedStages, locations: selectedLocations });
 }, [searchQuery, selectedSkills, selectedIndustries, selectedStages, selectedLocations]);
 const [briefingEmail, setBriefingEmail] = useState(() => String(readValue<Record<string, string>>(keys.prefs, {}).briefingEmail ?? authUser?.email ?? ''));
 const [briefingSaved, setBriefingSaved] = useState(false);
 const ask = (prompt: string) => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt } }));
 const savedSearches = useStored(readSavedSearches, [keys.savedSearches]);
 const hasActiveFilters = Boolean(searchQuery.trim() || selectedSkills.length || selectedIndustries.length || selectedStages.length || selectedLocations.length);

 const clearFilters = () => {
  setSearchQuery('');
  setSelectedSkills([]);
  setSelectedIndustries([]);
  setSelectedStages([]);
  setSelectedLocations([]);
 };
 const saveCurrentSearch = () => {
  const parts = [searchQuery.trim(), ...selectedSkills, ...selectedIndustries, ...selectedStages, ...selectedLocations].filter(Boolean);
  addSavedSearch(
   { q: searchQuery.trim(), skills: selectedSkills, industries: selectedIndustries, stages: selectedStages, locations: selectedLocations },
   parts.join(' · ').slice(0, 60) || 'Search',
  );
 };
 const applySearch = (item: { q: string; skills: string[]; industries: string[]; stages: string[]; locations: string[] }) => {
  setSearchQuery(item.q);
  setSelectedSkills(item.skills);
  setSelectedIndustries(item.industries);
  setSelectedStages(item.stages);
  setSelectedLocations(item.locations);
 };

 usePageControls(() => [
  { id: 'open-filters', en: 'Open filters', el: 'Άνοιγμα φίλτρων', run: () => setIsFilterOpen(true) },
  ...(hasActiveFilters ? [
   { id: 'save-search', en: 'Save this search', el: 'Αποθήκευση αναζήτησης', run: saveCurrentSearch },
   { id: 'clear-filters', en: 'Clear filters', el: 'Καθαρισμός φίλτρων', run: clearFilters },
  ] : []),
 ], [hasActiveFilters, searchQuery, selectedSkills, selectedIndustries, selectedStages, selectedLocations]);

 const categories: CategoryType[] = ["All", "Matches", "Communities", "Opportunities", "Events"];

 useEffect(() => {
  if (searchQuery.length > 1) {
   const filteredSuggestions = [
    ...availableSkills.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase())),
    ...availableIndustries.filter(i => i.toLowerCase().includes(searchQuery.toLowerCase()))
   ].slice(0, 5);
   setSuggestions(filteredSuggestions);
   setShowSuggestions(true);
  } else {
   setSuggestions([]);
   setShowSuggestions(false);
  }
 }, [searchQuery]);

 // People come from the live member directory (the sample cast in the demo), already filtered for
 // visibility, blocks and hidden members, and kept in the shape the cards below expect.
 const { people, loading: peopleLoading } = usePeople(authUser?.uid);
 const users = useMemo(() => people.map((person) => ({
  id: person.id,
  name: person.fullName,
  role: person.role,
  skills: person.skills.map((skill) => ({ name: skill })),
  lastActiveAt: person.lastActiveAt,
  verified: person.verified,
  profile: {
   headline: person.headline,
   headlineEl: person.headlineEl,
   bio: person.bio,
   bioEl: person.bioEl,
   industry: person.industry ? [person.industry] : [],
   location: person.location,
   stage: person.stage,
   profilePhoto: avatarOf(person),
  },
 })), [people]);
 const loading = peopleLoading;

 const toggleSkill = (skill: string) => {
  setSelectedSkills(prev => 
   prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
  );
 };

 const toggleIndustry = (industry: string) => {
  setSelectedIndustries(prev => 
   prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry]
  );
 };

 const toggleStage = (stage: string) => {
  setSelectedStages(prev => 
   prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]
  );
 };

 const toggleLocation = (location: string) => {
  setSelectedLocations(prev => 
   prev.includes(location) ? prev.filter(l => l !== location) : [...prev, location]
  );
 };

 const filteredUsers = useMemo(() => {
  const parsed = parseQualifiers(searchQuery);
  const skillList = (person: any) => (person.skills || []).map((s: any) => s?.name || s).filter(Boolean);
  const industryOf = (person: any) => Array.isArray(person.profile?.industry) ? person.profile.industry.join(' ') : (person.profile?.industry || '');
  return users.filter(u => {
   const qualifierOk = (!parsed.filters.role || String(u.role || '').toLowerCase().includes(parsed.filters.role.toLowerCase()))
    && (!parsed.filters.location || String(u.profile?.location || '').toLowerCase().includes(parsed.filters.location.toLowerCase()))
    && (!parsed.filters.skill || skillList(u).some((name: string) => name.toLowerCase().includes(parsed.filters.skill!.toLowerCase())))
    && (!parsed.filters.industry || industryOf(u).toLowerCase().includes(parsed.filters.industry.toLowerCase()))
    && (!parsed.filters.stage || String(u.profile?.stage || '').toLowerCase().includes(parsed.filters.stage.toLowerCase()));
   if (!qualifierOk) return false;
   if (!parsed.text && !searchQuery) {
    const matchesSkills = selectedSkills.length === 0 || 
               selectedSkills.some(s => u.skills?.some((us: any) => us.name === s));
    const matchesIndustries = selectedIndustries.length === 0 ||
                 selectedIndustries.some(i => u.profile?.industry?.includes(i));
    const matchesStages = selectedStages.length === 0 ||
               selectedStages.includes(u.profile?.stage);
    const matchesLocations = selectedLocations.length === 0 ||
                selectedLocations.includes(u.profile?.location);
    return matchesSkills && matchesIndustries && matchesStages && matchesLocations;
   }

   const q = parsed.text.toLowerCase();
   const matchesSearch = !q || u.name.toLowerCase().includes(q) || 
              (u.profile?.headline || '').toLowerCase().includes(q) ||
              (u.profile?.bio || '').toLowerCase().includes(q) ||
              (u.skills || []).some((s: any) => s.name.toLowerCase().includes(q)) ||
              (u.profile?.industry || []).some((i: string) => i.toLowerCase().includes(q));

   const matchesSkills = selectedSkills.length === 0 || 
              selectedSkills.some(s => u.skills?.some((us: any) => us.name === s));

   const matchesIndustries = selectedIndustries.length === 0 ||
                selectedIndustries.some(i => u.profile?.industry?.includes(i));

   const matchesStages = selectedStages.length === 0 ||
              selectedStages.includes(u.profile?.stage);

   const matchesLocations = selectedLocations.length === 0 ||
               selectedLocations.includes(u.profile?.location);

   return matchesSearch && matchesSkills && matchesIndustries && matchesStages && matchesLocations;
  }).sort((a, b) => {
   let scoreA = 0;
   let scoreB = 0;

   // Prioritize based on current user's skills and industries
   if (user) {
    const mySkills = (user as any).skills?.map((s: any) => s.name || s) || [];
    const myIndustries = (user as any).profile?.industry || [];

    const aSkills = a.skills?.map((s: any) => s.name) || [];
    const aIndustries = a.profile?.industry || [];

    scoreA += aSkills.filter((s: string) => mySkills.includes(s)).length;
    scoreA += aIndustries.filter((i: string) => myIndustries.includes(i)).length;

    const bSkills = b.skills?.map((s: any) => s.name) || [];
    const bIndustries = b.profile?.industry || [];

    scoreB += bSkills.filter((s: string) => mySkills.includes(s)).length;
    scoreB += bIndustries.filter((i: string) => myIndustries.includes(i)).length;
   }

   // Optional: Boost if they match the exact search term in skills or industry
   if (searchQuery) {
    const q = searchQuery.toLowerCase();
    if (a.skills?.some((s: any) => s.name.toLowerCase() === q)) scoreA += 5;
    if (a.profile?.industry?.some((i: string) => i.toLowerCase() === q)) scoreA += 5;

    if (b.skills?.some((s: any) => s.name.toLowerCase() === q)) scoreB += 5;
    if (b.profile?.industry?.some((i: string) => i.toLowerCase() === q)) scoreB += 5;
   }

   return scoreB - scoreA;
  });
 }, [users, searchQuery, selectedSkills, selectedIndustries, selectedStages, selectedLocations, user]);

 const demoOpportunities = useMemo(() => {
  // Demo deadlines stay in the future relative to today.
  const ahead = (days: number) => formatDate(new Date(Date.now() + days * 86_400_000), { month: 'short', day: 'numeric' });
  return [
   { id: 'd1', title: "EcoSphere Accelerator", type: "Accelerator", location: "Remote", deadline: ahead(9), tags: ["Sustainability", "Seed"], photo: coverFor('d1', ["EcoSphere Accelerator", "Accelerator", "Sustainability", "Seed"], 800, 600), description: "A 12-week program for early-stage startups building solutions for a sustainable future." },
   { id: 'd2', title: "Web3 Founders Grant", type: "Grant", location: "Global", deadline: ahead(25), tags: ["Crypto", "Infrastructure"], photo: coverFor('d2', ["Web3 Founders Grant", "Grant", "Crypto", "Infrastructure"], 800, 600), description: "Equity-free funding for developers building core Web3 infrastructure and protocols." },
   { id: 'd3', title: "AI Innovation Lab", type: "Incubator", location: "Berlin", deadline: ahead(45), tags: ["AI", "Enterprise"], photo: coverFor('d3', ["AI Innovation Lab", "Incubator", "AI", "Enterprise"], 800, 600), description: "Deep-tech incubation for AI startups focusing on enterprise automation and efficiency." },
  ];
 }, []);

 const demoCommunities = useMemo(() => [
  { id: 'dc1', name: "SaaS Founders Collective", members: "1.2k", description: "A private network for B2B SaaS founders to share insights and scale.", icon: Rocket, status: "ACTIVE" },
  { id: 'dc2', name: "AI Builders Network", members: "850", description: "Connecting engineers and product managers building the next generation of AI.", icon: Zap, status: "STABLE" },
  { id: 'dc3', name: "Impact Ventures Hub", members: "540", description: "Dedicated to startups solving global environmental and social challenges.", icon: Globe, status: "EMERGING" },
 ], []);

 // Real accounts discover the platform-published programs and member communities.
 const [liveOpportunities, setLiveOpportunities] = useState<typeof demoOpportunities | null>(null);
 const [liveCommunities, setLiveCommunities] = useState<typeof demoCommunities | null>(null);
 const [liveEvents, setLiveEvents] = useState<{ id: string; title: string; at: number; type: string }[] | null>(null);
 useEffect(() => {
  if (isDemoMode) { setLiveOpportunities(null); setLiveCommunities(null); setLiveEvents(null); return; }
  const stops = [
   onCatalog('events', (docs) => setLiveEvents(docs.map((doc) => ({
    id: doc.id,
    title: str(doc.title ?? doc.name, 'Event'),
    at: toMillis(doc.startsAt ?? doc.startAt ?? doc.date) ?? 0,
    type: str(doc.type, 'Networking'),
   })).filter((item) => item.at >= Date.now()).sort((a, b) => a.at - b.at).slice(0, 3)), () => setLiveEvents([])),
   onCatalog('programs', (docs) => setLiveOpportunities(docs.map((doc) => {
    const deadline = toMillis(doc.deadline);
    return {
     id: doc.id,
     title: str(doc.title, 'Program'),
     type: str(doc.type, 'Accelerator'),
     location: str(doc.location, ''),
     deadline: deadline ? formatDate(new Date(deadline), { month: 'short', day: 'numeric' }) : str(doc.deadline, ''),
     tags: strList(doc.focus ?? doc.tags),
     photo: str(doc.image ?? doc.imageUrl),
     description: str(doc.description),
    };
   })), () => setLiveOpportunities([])),
   onCommunities((docs) => setLiveCommunities(docs.map((doc) => ({
    id: doc.id,
    name: doc.name,
    members: String(doc.memberIds.length),
    description: doc.description,
    icon: Users,
    status: doc.postCount > 0 ? 'ACTIVE' : 'EMERGING',
   }))), () => setLiveCommunities([])),
  ];
  return () => { stops.forEach((stop) => stop()); };
 }, [isDemoMode]);

 const filteredOpportunities = isDemoMode ? demoOpportunities : (liveOpportunities ?? []);
 const filteredCommunities = isDemoMode ? demoCommunities : (liveCommunities ?? []);

 return (
  <PageShell sample={isDemoMode} title={bothText("Discovery", "Εξερεύνηση")} description={bothText("Founders, communities, opportunities and events. Ranked co-founder matches live in Matches.", "Ιδρυτές, κοινότητες, ευκαιρίες και εκδηλώσεις. Οι ταξινομημένες αντιστοιχίσεις συνιδρυτή είναι στις Αντιστοιχίσεις.")} noPadding={false}>
  <div className="space-y-8">
   {/* Filter Overlay */}
   <AnimatePresence>
    {isFilterOpen && (
     <>
      <motion.div 
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       exit={{ opacity: 0 }}
       onClick={() => setIsFilterOpen(false)}
       className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-40"
      />
      <motion.div 
       initial={{ x: "100%" }}
       animate={{ x: 0 }}
       exit={{ x: "100%" }}
       transition={{ type: "spring", damping: 25, stiffness: 200 }}
       className="fixed top-16 right-0 bottom-0 z-[65] w-full overflow-y-auto border-l border-stone-200 bg-white p-4 shadow-sm sm:top-0 sm:h-full sm:max-w-md sm:p-12"
      >
       <div className="flex items-center justify-between mb-16">
        <div className="space-y-2">
         <h3 className="text-sm font-medium tracking-wider text-stone-400">{t('Refine search', 'Περιόρισε την αναζήτηση')}</h3>
         <p className="text-xl font-medium text-stone-900">{t('Advanced filters', 'Προχωρημένα φίλτρα')}</p>
        </div>
        <button 
         type="button"
         aria-label={t("Close filters", "Κλείσιμο φίλτρων")}
         onClick={() => setIsFilterOpen(false)}
         className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors"
        >
         <X className="w-6 h-6" />
        </button>
       </div>

       <div className="space-y-16">
        {/* Filter Groups */}
        <div className="space-y-8">
         <p className="text-sm font-medium text-stone-900 tracking-wider">{t('Expertise & skills', 'Εξειδίκευση και δεξιότητες')}</p>
         <div className="flex flex-wrap gap-3">
          {availableSkills.map(skill => (
           <button 
            key={skill} 
            onClick={() => toggleSkill(skill)}
            className={cn(
             "px-6 py-3 rounded-full border text-sm font-medium transition-all",
             selectedSkills.includes(skill)
              ? "bg-stone-200 border-stone-400 text-stone-900"
              : "border-stone-200 text-stone-500 hover:border-stone-900 hover:text-stone-900"
            )}
           >
            {skill}
           </button>
          ))}
         </div>
        </div>

        <div className="space-y-8">
         <p className="text-sm font-medium text-stone-900 tracking-wider">{t('Industry', 'Κλάδος')}</p>
         <div className="flex flex-wrap gap-3">
          {["SaaS", "AI/ML", "Fintech", "Healthtech", "Sustainability", "Web3", "E-commerce"].map(ind => (
           <button 
            key={ind} 
            onClick={() => toggleIndustry(ind)}
            className={cn(
             "px-6 py-3 rounded-full border text-sm font-medium transition-all",
             selectedIndustries.includes(ind)
              ? "bg-stone-200 border-stone-400 text-stone-900"
              : "border-stone-200 text-stone-500 hover:border-stone-900 hover:text-stone-900"
            )}
           >
            {ind}
           </button>
          ))}
         </div>
        </div>

        <div className="space-y-8">
         <p className="text-sm font-medium text-stone-900 tracking-wider">{t('Stage', 'Στάδιο')}</p>
         <div className="flex flex-wrap gap-3">
          {["Pre-seed", "Seed", "Series A", "Series B+"].map(stage => (
           <button 
            key={stage} 
            onClick={() => toggleStage(stage)}
            className={cn(
             "px-6 py-3 rounded-full border text-sm font-medium transition-all",
             selectedStages.includes(stage)
              ? "bg-stone-200 border-stone-400 text-stone-900"
              : "border-stone-200 text-stone-500 hover:border-stone-900 hover:text-stone-900"
            )}
           >
            {labelOf(stage)}
           </button>
          ))}
         </div>
        </div>

        <div className="space-y-8">
         <p className="text-sm font-medium text-stone-900 tracking-wider">{t('Location', 'Τόπος')}</p>
         <div className="flex flex-wrap gap-3">
          {["Remote", "San Francisco", "New York", "London", "Berlin", "Global"].map(loc => (
           <button 
            key={loc} 
            onClick={() => toggleLocation(loc)}
            className={cn(
             "px-6 py-3 rounded-full border text-sm font-medium transition-all",
             selectedLocations.includes(loc)
              ? "bg-stone-200 border-stone-400 text-stone-900"
              : "border-stone-200 text-stone-500 hover:border-stone-900 hover:text-stone-900"
            )}
           >
            {loc}
           </button>
          ))}
         </div>
        </div>

        <div className="pt-12 border-t border-stone-100 flex gap-4">
         <Button onClick={() => setIsFilterOpen(false)} className="flex-1 rounded-2xl h-16 bg-stone-900 text-white font-medium text-base tracking-wider">
          {t('Apply filters', 'Εφαρμογή φίλτρων')}
         </Button>
         <Button variant="outline" onClick={() => { setSearchQuery(''); setSelectedSkills([]); setSelectedIndustries([]); setSelectedStages([]); setSelectedLocations([]); }} className="flex-1 rounded-2xl h-16 border-stone-200 text-stone-500 font-medium text-base tracking-wider">
          {t('Reset', 'Επαναφορά')}
         </Button>
        </div>
       </div>
      </motion.div>
     </>
    )}
   </AnimatePresence>

   {/* Discovery Search Bar */}
   <div className="flex flex-col sm:flex-row items-center gap-3">
    <div className="relative group flex-1">
     <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
     <input
      type="text"
      placeholder={t(`Skill, industry, name, or ${QUALIFIER_HINT_EN}`, `Δεξιότητα, κλάδος, όνομα, ή ${QUALIFIER_HINT_EL}`)}
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
      className="w-full bg-white border border-stone-200 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-stone-400 transition-all placeholder:text-stone-400"
     />
     <AnimatePresence>
      {showSuggestions && suggestions.length > 0 && (
       <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-stone-100 shadow-lg z-50 overflow-hidden"
       >
        {suggestions.map((suggestion, idx) => (
         <button
          key={idx}
          onClick={() => { setSearchQuery(suggestion); setShowSuggestions(false); }}
          className="w-full px-4 py-2 text-left hover:bg-stone-50 flex items-center justify-between"
         >
          <span className="text-sm text-stone-600">{suggestion}</span>
          <ArrowRight className="w-3 h-3 text-stone-300" />
         </button>
        ))}
       </motion.div>
      )}
     </AnimatePresence>
    </div>
    <Button
     variant="outline"
     className={cn(
      "h-8 px-3 rounded-xl border-stone-200 text-sm flex items-center gap-2",
      isFilterOpen && "bg-stone-200 text-stone-900 border-stone-400"
     )}
     onClick={() => setIsFilterOpen(!isFilterOpen)}
    >
     <SlidersHorizontal className="w-3.5 h-3.5" /> {t('Filters', 'Φίλτρα')}
    </Button>
    <Button
     variant="outline"
     size="icon"
     title={t('Save this search', 'Αποθήκευση αναζήτησης')}
     aria-label={t('Save this search', 'Αποθήκευση αναζήτησης')}
     disabled={!hasActiveFilters}
     className="h-8 w-8 min-h-8 min-w-8 p-0 rounded-xl border-stone-200 flex items-center justify-center disabled:opacity-40"
     onClick={saveCurrentSearch}
    >
     <Bookmark className="w-3.5 h-3.5" />
    </Button>
   </div>
   {savedSearches.length > 0 && (
    <div className="flex flex-wrap items-center gap-1.5 -mt-1">
     <span className="text-xs text-stone-400">{t('Saved:', 'Αποθηκευμένες:')}</span>
     {savedSearches.map((item) => (
      <span key={item.id} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-stone-50 border border-stone-100 text-xs font-medium text-stone-600">
       <button type="button" onClick={() => applySearch(item)} className="hover:text-stone-900 max-w-48 truncate">{item.label}</button>
       <button type="button" onClick={() => removeSavedSearch(item.id)} aria-label={t('Remove saved search', 'Διαγραφή αποθηκευμένης αναζήτησης')} className="p-0.5 rounded hover:bg-stone-200 text-stone-400 hover:text-stone-900"><X className="w-3 h-3" /></button>
      </span>
     ))}
    </div>
   )}
   {searchQuery.trim().length > 1 && (
    <p className="text-xs text-stone-400 -mt-1">{t(`Names, skills, and industries for “${searchQuery.trim()}”.`, `Ονόματα, δεξιότητες και κλάδοι για «${searchQuery.trim()}».`)}</p>
   )}

   {/* Category Tabs */}
   <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-1 min-w-0">
    <div className="scroll-tabs gap-4 sm:gap-6 flex-1 w-auto">
     {categories.map((cat) => (
      <button
       key={cat}
       onClick={() => setActiveCategory(cat)}
       className={cn(
        "pb-3 text-sm font-semibold tracking-wider transition-all relative whitespace-nowrap",
        activeCategory === cat ? "text-stone-900" : "text-stone-400 hover:text-stone-600"
       )}
      >
       {labelOf(cat)}
       {activeCategory === cat && (
        <motion.div layoutId="activeCategory" className="absolute bottom-0 left-0 right-0 h-[2px] bg-stone-900 rounded-full" />
       )}
      </button>
     ))}
    </div>
    <div className="flex items-center gap-1 bg-stone-50 p-1 rounded-xl border border-stone-100 shrink-0">
     <button type="button" aria-label={t('Grid view', 'Προβολή πλέγματος')} onClick={() => setViewMode("grid")} className={cn("min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg transition-all", viewMode === "grid" ? "bg-white text-stone-900 shadow-sm" : "text-stone-400")}>
      <Grid className="w-4 h-4" />
     </button>
     <button type="button" aria-label={t('List view', 'Προβολή λίστας')} onClick={() => setViewMode("list")} className={cn("min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg transition-all", viewMode === "list" ? "bg-white text-stone-900 shadow-sm" : "text-stone-400")}>
      <ListIcon className="w-4 h-4" />
     </button>
    </div>
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
    {/* Main Content Area */}
    <div className="lg:col-span-8 space-y-8">
     {/* Founders & Mentors Section (Matches) */}
     {(activeCategory === "All" || activeCategory === "Matches") && (
      <section className="space-y-4">
       <div className="flex items-center justify-between">
        <div>
         <p className="text-xs font-semibold tracking-wider text-stone-400">{t('Expertise & talent', 'Εξειδίκευση')}</p>
         <h3 className="text-base font-semibold text-stone-900">{t('Founders & mentors', 'Ιδρυτές και μέντορες')}</h3>
        </div>
        <Link to="/matches" data-ui="button" className="inline-flex items-center justify-center h-7 px-3 text-sm font-medium text-stone-600 rounded-lg border border-stone-100 hover:border-stone-300 transition-colors">
         {t('View all', 'Όλα')} <ArrowRight className="ml-1.5 w-3 h-3" />
        </Link>
       </div>

       {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
         {[1, 2].map(i => (
          <div key={i} className="h-32 bg-stone-100 rounded-2xl animate-pulse" />
         ))}
        </div>
       ) : filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
         {filteredUsers.slice(0, 4).map((user, idx) => {
          const matchPhrase = explainMatch(viewerSkills, viewerIndustry, user.skills, user.profile?.industry).reasonPhrase;
          return (
          <motion.div
           key={user.id || `user-${idx}`}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: idx * 0.07 }}
           className="group bg-white border border-stone-100 rounded-2xl p-4 hover:border-stone-200 hover:shadow-sm transition-all"
          >
           <Link to={`/profile/${user.id}`} onClick={() => rememberPerson({ id: user.id, fullName: user.name || 'Founder', headline: user.profile?.headline || '', role: user.role || 'Founder', industry: user.profile?.industry?.[0] || '', location: user.profile?.location || '' })} className="block space-y-3">
            <div className="flex items-start justify-between">
             <Avatar src={user.profile?.profilePhoto || undefined} fallback={user.name} size="lg" status={isOnline({ lastActiveAt: user.lastActiveAt }) ? 'online' : undefined} className="[&>*]:rounded-xl" />
             <div className="flex items-center gap-1 px-2 py-1 bg-stone-50 rounded-lg border border-stone-100">
              <ShieldCheck className={`w-3 h-3 ${user.verified ? 'text-emerald-500' : 'text-stone-300'}`} />
              <span className="text-xs text-stone-500">{user.verified ? t('Verified', 'Επαληθευμένο') : t('Not verified yet', 'Χωρίς επαλήθευση ακόμη')}</span>
             </div>
            </div>
            <div>
             <PersonHovercard person={user.id || user.name}>
              <h4 className="text-base font-semibold text-stone-900">{user.name}</h4>
             </PersonHovercard>
             <p className="text-sm text-stone-500 line-clamp-1 mt-0.5">{t(user.profile?.headline ?? '', user.profile?.headlineEl ?? user.profile?.headline ?? '')}</p>
            </div>
            <FactLine
             items={[labelOf(user.role), Array.isArray(user.profile?.industry) ? user.profile.industry[0] : user.profile?.industry, user.profile?.location]}
             label={t('Profile facts', 'Στοιχεία προφίλ')}
            />
            <FactLine items={(user.skills ?? []).slice(0, 3).map((skill: { name?: string } | string) => typeof skill === 'string' ? skill : skill.name)} label={t('Skills', 'Δεξιότητες')} />
            <div className="pt-2 border-t border-stone-50 flex items-center justify-between">
             <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-stone-400">{bothText("Available", "Σε διάθεση")}{matchPhrase ? ` · ${matchPhrase}` : ''}</span>
             </div>
             <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-stone-600 rounded-lg border border-stone-100"
               onClick={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); ask(`Why do I match with ${user.name}?`); }}>
               {t('Ask', 'Ρώτα')}
              </Button>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-stone-600 rounded-lg border border-stone-100"
               onClick={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); navigate(`/messages?user=${user.id}`); }}>
               {t('Message', 'Μήνυμα')}
              </Button>
             </div>
            </div>
           </Link>
          </motion.div>
          );
         })}
        </div>
       ) : (
        <EmptyHint title={t('No matches for these filters', 'Καμία αντιστοίχιση με αυτά τα κριτήρια')} detail={t('Clear the filters, or ask who still ranks on this profile.', 'Καθάρισε τα φίλτρα, ή ρώτα ποιον βαθμολογεί ακόμα αυτό το προφίλ.')}>
          <ClearFiltersButton onClick={() => { setSearchQuery(''); setSelectedSkills([]); setSelectedIndustries([]); setSelectedStages([]); setSelectedLocations([]); }} />
          <AskLink prompt="who is my best match" />
        </EmptyHint>
       )}
      </section>
     )}

     {/* Featured Section */}
     {(activeCategory === 'All' || activeCategory === 'Opportunities') && (
      <section className="space-y-4">
       <div>
        <p className="text-xs font-semibold tracking-wider text-stone-400">{t('Featured', 'Προτεινόμενα')}</p>
        <h3 className="text-base font-semibold text-stone-900">{t('Curated opportunities', 'Επιλεγμένες ευκαιρίες')}</h3>
       </div>
      <div className={cn(
       "grid gap-4",
       viewMode === "grid" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
      )}>
       {filteredOpportunities.length === 0 && (
        <EmptyHint
         title={t('No open opportunities yet.', 'Δεν υπάρχουν ακόμη ανοιχτές ευκαιρίες.')}
         detail={t('New programs are published here as they open. Ask the assistant to watch for your stage.', 'Νέα προγράμματα δημοσιεύονται εδώ μόλις ανοίξουν. Ζήτα από τον βοηθό να σε ενημερώσει για το στάδιό σου.')}
        >
         <AskLink prompt="Notify me about new programs for my stage" />
        </EmptyHint>
       )}
       {filteredOpportunities.map((opp, i) => (
        <motion.div 
         key={opp.id}
         initial={{ opacity: 0, y: 30 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
         role="button"
         tabIndex={0}
         onClick={() => ask(`Tell me about ${opp.title}`)}
         onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') ask(`Tell me about ${opp.title}`); }}
         className={cn(
          "group cursor-pointer overflow-hidden border border-stone-100 bg-white hover:border-stone-300 hover:shadow-sm transition-all",
          viewMode === "grid" ? "rounded-2xl" : "rounded-2xl flex flex-col md:flex-row items-center"
         )}
        >
         <div className={cn(
          "relative overflow-hidden shrink-0",
          viewMode === "grid" ? "h-40 w-full" : "h-32 w-full md:w-48"
         )}>
          {opp.photo ? (
           <img src={opp.photo} alt="" className="w-full h-full object-cover" />
          ) : (
           <div className="w-full h-full bg-stone-800" aria-hidden />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
          <div className="absolute top-3 left-3">
           <span className="bg-white/80 backdrop-blur-sm text-stone-700 text-xs font-semibold tracking-wider px-2 py-0.5 rounded-md">
            {labelOf(opp.type)}
           </span>
          </div>
          <div className="absolute bottom-3 left-3 flex items-center gap-1">
           <span className="text-white/90 text-xs font-semibold flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" /> {opp.deadline}
           </span>
          </div>
         </div>
         <div className="p-4 space-y-2 text-left flex-1">
          <h4 className="text-base font-semibold text-stone-900 leading-snug">{opp.title}</h4>
          {viewMode === "list" && (
           <p className="text-sm text-stone-500 line-clamp-2">{opp.description}</p>
          )}
          <FactLine items={[labelOf(opp.type), opp.location]} label={t('Opportunity facts', 'Στοιχεία ευκαιρίας')} />
          <FactLine items={opp.tags} label={t('Tags', 'Ετικέτες')} />
         </div>
         {viewMode === "list" && (
          <div className="px-12 pb-8 md:pb-0 md:pr-12">
           <Button type="button" variant="outline" className="rounded-full h-11 px-8 text-sm font-medium tracking-wider border-stone-200 group-hover:bg-stone-900 group-hover:text-white group-hover:border-stone-900 transition-all" onClick={(e: React.MouseEvent) => { e.stopPropagation(); ask(`Tell me about ${opp.title}`); }}>
             {t('Details', 'Λεπτομέρειες')}
            </Button>
          </div>
         )}
        </motion.div>
       ))}
      </div>
     </section>
    )}

    {/* Communities Section */}
    {(activeCategory === 'All' || activeCategory === 'Communities') && (
     <section className="space-y-4">
      <div className="flex items-center justify-between">
       <div>
        <p className="text-xs font-semibold tracking-wider text-stone-400">{t('Communities', 'Κοινότητες')}</p>
        <h3 className="text-base font-semibold text-stone-900">{t('Strategic hubs', 'Στρατηγικοί κόμβοι')}</h3>
       </div>
       <Link to="/communities" data-ui="button" className="inline-flex items-center justify-center h-7 px-3 text-sm font-medium text-stone-600 rounded-lg border border-stone-100 hover:border-stone-300 transition-colors">
         {t('Explore all', 'Όλες')} <ArrowRight className="ml-1.5 w-3 h-3" />
        </Link>
      </div>
      <div className="border border-stone-100 rounded-2xl overflow-hidden divide-y divide-stone-100">
       {filteredCommunities.length === 0 && (
        <p className="p-6 text-sm text-stone-400 text-center">{t('No communities yet — create one on the Communities page.', 'Καμία κοινότητα ακόμη — δημιούργησε μία στη σελίδα Κοινότητες.')}</p>
       )}
       {filteredCommunities.map((comm, i) => (
        <motion.div
         key={comm.id}
         initial={{ opacity: 0, x: -10 }}
         animate={{ opacity: 1, x: 0 }}
         transition={{ delay: i * 0.07 }}
         className="group p-4 bg-white hover:bg-stone-50 transition-all cursor-pointer"
        >
         <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-100 text-stone-500 flex items-center justify-center shrink-0">
           <comm.icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
           <div className="flex items-center gap-2 mb-0.5">
            <h4 className="text-base font-semibold text-stone-900">{comm.name}</h4>
            <span className={cn(
             "text-xs font-semibold px-1.5 py-0.5 rounded-md border",
             comm.status === "ACTIVE" ? "text-emerald-600 border-transparent" :
             comm.status === "STABLE" ? "text-blue-600 border-transparent" :
             "text-amber-600 border-transparent"
            )}>{labelOf(comm.status)}</span>
           </div>
           <p className="text-sm text-stone-500 line-clamp-1">{comm.description}</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
           <div className="text-right">
            <p className="text-sm font-semibold text-stone-900">{comm.members}</p>
            <p className="text-xs text-stone-400">{t('members', 'μέλη')}</p>
           </div>
           <Link to="/communities" aria-label={t('Open communities', 'Άνοιγμα κοινοτήτων')}>
            <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-stone-600 transition-colors" />
           </Link>
          </div>
         </div>
        </motion.div>
       ))}
      </div>
     </section>
     )}

     {(activeCategory === 'All' || activeCategory === 'Events') && (
      <section className="space-y-4">
       <div className="flex items-center justify-between">
        <div>
         <p className="text-xs font-semibold tracking-wider text-stone-400">{t('Ecosystem events', 'Εκδηλώσεις οικοσυστήματος')}</p>
         <h3 className="text-base font-semibold text-stone-900">{t('Upcoming sessions', 'Επερχόμενες συναντήσεις')}</h3>
        </div>
        <Link to="/events" data-ui="button" className="inline-flex items-center justify-center h-7 px-3 text-sm font-medium text-stone-600 rounded-lg border border-stone-100 hover:border-stone-300 transition-colors">
         {t('View all', 'Όλες')} <ArrowRight className="ml-1.5 w-3 h-3" />
        </Link>
       </div>
       {(!isDemoMode && (liveEvents ?? []).length === 0) ? (
        <EmptyHint
         title={t('No upcoming events yet', 'Δεν υπάρχουν ακόμη επερχόμενες εκδηλώσεις')}
         detail={t('Published sessions appear here. Open Events to browse, or ask the assistant what’s on this week.', 'Οι δημοσιευμένες συναντήσεις εμφανίζονται εδώ. Άνοιξε τις Εκδηλώσεις, ή ρώτα τον βοηθό τι γίνεται αυτή την εβδομάδα.')}
        >
         <AskLink prompt="What events are coming up?" />
         <Link to="/events" className="text-xs font-medium text-stone-900 hover:underline">{t('Open Events', 'Άνοιγμα Εκδηλώσεων')}</Link>
        </EmptyHint>
       ) : (
        <div className="space-y-2">
         {(isDemoMode
           ? [
            { id: 'demo-e1', title: 'Founder Mixer SF', at: new Date(Date.now() + 2 * 86_400_000).setHours(18, 0, 0, 0), type: 'In-Person' },
            { id: 'demo-e2', title: 'AI Product Workshop', at: new Date(Date.now() + 4 * 86_400_000).setHours(10, 0, 0, 0), type: 'Virtual' },
            { id: 'demo-e3', title: 'Seed Funding Webinar', at: new Date(Date.now() + 9 * 86_400_000).setHours(14, 0, 0, 0), type: 'Virtual' },
           ]
           : (liveEvents ?? [])
         ).map((event) => (
          <div key={event.id} role="button" tabIndex={0} onClick={() => ask(`Tell me about ${event.title}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') ask(`Tell me about ${event.title}`); }} className="group p-3 rounded-xl border border-stone-100 bg-white hover:border-stone-200 transition-all cursor-pointer flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-100 flex flex-col items-center justify-center shrink-0">
            <span className="text-[8px] font-semibold text-stone-400">{formatDate(event.at, { month: 'short' })}</span>
            <span className="text-base font-bold text-stone-900">{formatDate(event.at, { day: 'numeric' })}</span>
           </div>
           <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-stone-900 truncate">{event.title}</h4>
            <p className="text-xs text-stone-400">{formatTime(event.at)} · {t(event.type, event.type === 'Virtual' || event.type === 'Webinar' ? 'Εικονικά' : 'Δια ζώσης')}</p>
           </div>
          </div>
         ))}
        </div>
       )}
      </section>
     )}
    </div>

    {/* Right Column - Sidebar Info */}
    <div className="lg:col-span-4 space-y-4">
     {/* Trending Topics */}
     <section className="bg-white border border-stone-100 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
       <h3 className="text-xs font-semibold tracking-wider text-stone-400">{t('Trending intelligence', 'Τάσεις')}</h3>
       <Activity className="w-3.5 h-3.5 text-stone-400 animate-pulse" />
      </div>

      <div className="space-y-3">
       {[
        { topic: "Generative AI", topicEl: "Γεννητική ΤΝ", growth: "+140%", count: 240, trend: [10, 25, 45, 30, 60, 85, 100] },
        { topic: "Sustainable Tech", topicEl: "Βιώσιμη τεχνολογία", growth: "+85%", count: 180, trend: [20, 15, 35, 40, 55, 70, 80] },
        { topic: "Remote Work 2.0", topicEl: "Απομακρυσμένη εργασία 2.0", growth: "+42%", count: 120, trend: [50, 45, 40, 42, 45, 48, 52] },
        { topic: "Fintech Regulation", topicEl: "Ρύθμιση fintech", growth: "+30%", count: 95, trend: [10, 12, 15, 18, 22, 25, 30] },
       ].map((trend) => (
        <div key={trend.topic} role="button" tabIndex={0} onClick={() => ask(`Tell me about ${trend.topic}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') ask(`Tell me about ${trend.topic}`); }} className="flex items-center justify-between py-1.5 border-b border-stone-50 last:border-0 cursor-pointer group/item">
         <div>
          <p className="text-sm font-semibold text-stone-800 group-hover/item:text-stone-600 transition-colors">{t(trend.topic, trend.topicEl)}</p>
          {isDemoMode ? (
           <p className="text-xs text-stone-400">{t(`${trend.count} posts`, `${trend.count} αναρτήσεις`)}</p>
          ) : (
           <p className="text-xs text-stone-400">{t('Ask the assistant about this topic', 'Ρώτα τον βοηθό για αυτό το θέμα')}</p>
          )}
         </div>
         {isDemoMode && (
         <div className="flex items-center gap-2">
          <svg className="w-12 h-5 overflow-visible">
           <polyline fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className="text-stone-300"
            points={trend.trend.map((val, i) => `${(i / (trend.trend.length - 1)) * 48},${20 - (val / 100) * 20}`).join(' ')} />
          </svg>
          <span className="text-sm font-semibold text-emerald-600">{trend.growth}</span>
         </div>
         )}
        </div>
       ))}
      </div>
      <Button type="button" variant="outline" onClick={() => navigate('/communities')} className="w-full h-7 rounded-lg text-sm border-stone-100">
       {t('View all topics', 'Όλα τα θέματα')}
      </Button>
     </section>

     {/* Upcoming Events */}
     <section className="bg-white border border-stone-100 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
       <div>
        <p className="text-xs font-semibold tracking-wider text-stone-400">{t('Ecosystem events', 'Εκδηλώσεις οικοσυστήματος')}</p>
        <h3 className="text-sm font-semibold text-stone-900">{t('Upcoming sessions', 'Επερχόμενες συναντήσεις')}</h3>
       </div>
       {isDemoMode && (
       <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs text-stone-400">{t('Live now', 'Ζωντανά τώρα')}</span>
       </div>
       )}
      </div>
      <div className="space-y-2">
       {(!isDemoMode && (liveEvents ?? []).length === 0) ? (
        <EmptyHint
         title={t('Nothing scheduled', 'Τίποτα στο ημερολόγιο')}
         detail={t('Open Events to browse, or ask the assistant what’s on this week.', 'Άνοιξε τις Εκδηλώσεις, ή ρώτα τον βοηθό τι γίνεται αυτή την εβδομάδα.')}
        >
         <Link to="/events" className="text-xs font-medium text-stone-900 hover:underline">{t('Open Events', 'Άνοιγμα Εκδηλώσεων')}</Link>
        </EmptyHint>
       ) : (isDemoMode
         ? [
        { title: "Founder Mixer SF", at: new Date(Date.now() + 2 * 86_400_000).setHours(18, 0, 0, 0), type: "In-Person", capacity: "85%", status: "FILLING" },
        { title: "AI Product Workshop", at: new Date(Date.now() + 4 * 86_400_000).setHours(10, 0, 0, 0), type: "Virtual", capacity: "40%", status: "OPEN" },
        { title: "Seed Funding Webinar", at: new Date(Date.now() + 9 * 86_400_000).setHours(14, 0, 0, 0), type: "Virtual", capacity: "95%", status: "LAST_CALL" },
           ]
         : (liveEvents ?? []).map((event) => ({ title: event.title, at: event.at, type: event.type, capacity: '', status: '' }))
       ).map((event) => (
        <div key={event.title} role="button" tabIndex={0} onClick={() => ask(`Tell me about ${event.title}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') ask(`Tell me about ${event.title}`); }} className="group p-3 rounded-xl border border-stone-100 bg-stone-50 hover:border-stone-200 transition-all cursor-pointer flex items-center gap-3">
         <div className="w-10 h-10 rounded-xl bg-white border border-stone-100 flex flex-col items-center justify-center shrink-0">
          <span className="text-[8px] font-semibold text-stone-400">{formatDate(event.at, { month: 'short' })}</span>
          <span className="text-base font-bold text-stone-900">{formatDate(event.at, { day: 'numeric' })}</span>
         </div>
         <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-stone-900 truncate">{event.title}</h4>
          <p className="text-xs text-stone-400">{formatTime(event.at)} · {t(event.type, event.type === 'Virtual' ? 'Εικονικά' : 'Δια ζώσης')}</p>
          {isDemoMode && event.capacity ? (
          <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden mt-1">
           <motion.div initial={{ width: 0 }} animate={{ width: event.capacity }}
            className={cn("h-full", event.status === "LAST_CALL" ? "bg-amber-400" : "bg-stone-300")} />
          </div>
          ) : null}
         </div>
         {isDemoMode && event.status ? <span className={cn("text-xs font-semibold shrink-0", event.status === "LAST_CALL" ? "text-amber-600" : "text-stone-400")}>{labelOf(event.status)}</span> : null}
        </div>
       ))}
      </div>
     </section>

     {/* Newsletter Card */}
     <section className="bg-stone-50 border border-stone-100 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
       <div className="w-8 h-8 bg-white border border-stone-100 rounded-xl flex items-center justify-center">
        <MessageSquare className="w-4 h-4 text-stone-500" />
       </div>
       <div>
        <h4 className="text-sm font-semibold text-stone-900">{t('Weekly briefing', 'Εβδομαδιαίο briefing')}</h4>
        <p className="text-xs text-stone-400">{t('Ecosystem news & funding alerts', 'Νέα οικοσυστήματος και χρηματοδότηση')}</p>
       </div>
      </div>
      <input
       type="email"
       value={briefingEmail}
       onChange={(e) => { setBriefingEmail(e.target.value); setBriefingSaved(false); }}
       placeholder={t('Enter your email', 'Το email σου')}
       className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
      />
      <Button type="button" onClick={() => {
       const email = briefingEmail.trim();
       if (isDemoMode) { ask('what should I do today'); return; }
       if (!email) return;
       writeValue(keys.prefs, { ...readValue<Record<string, unknown>>(keys.prefs, {}), briefingEmail: email });
       setBriefingSaved(true);
      }} className="w-full rounded-lg h-8 bg-stone-900 text-white text-sm hover:bg-stone-800 transition-all">
       {briefingSaved ? t('Saved on this device', 'Αποθηκεύτηκε σε αυτή τη συσκευή') : t('Subscribe now', 'Εγγραφή')}
      </Button>
     </section>
    </div>
   </div>
  </div>
  </PageShell>
 );
}
