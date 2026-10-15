import React, { useState, useMemo, useEffect } from "react";
import { 
 Search, 
 Filter, 
 Globe, 
 Users, 
 Zap, 
 ArrowRight, 
 Star, 
 ChevronRight, 
 Trophy, 
 Target, 
 Briefcase, 
 Rocket, 
 Activity, 
 Sparkles, 
 X, 
 Check, 
 Plus, 
 MoreVertical, 
 Layout, 
 Compass, 
 MapPin, 
 Calendar as CalendarIcon, 
 MessageSquare, 
 Share2, 
 Heart, 
 Bookmark, 
 ExternalLink, 
 ChevronDown, 
 SlidersHorizontal, 
 Grid, 
 List as ListIcon,
 ShieldCheck
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageShell from "../components/ui/PageShell";
import { User } from "../types";
import { useAuth } from "../App";
import { readDiscoveryFilters, writeDiscoveryFilters } from "../lib/localLists";
import { cn } from "../lib/utils";
import { explainMatch } from "../lib/matchReason";
import { rememberPerson } from "../lib/people";

interface DiscoveryProps {
 user: User;
}

type CategoryType = "All" | "Matches" | "Communities" | "Opportunities" | "Events";

export default function Discovery({ user }: DiscoveryProps) {
 const { profile: authProfile } = useAuth();
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
 const [users, setUsers] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const ask = (prompt: string) => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt } }));

 const categories: CategoryType[] = ["All", "Matches", "Communities", "Opportunities", "Events"];
 const availableSkills = ["React", "Node.js", "Python", "AI/ML", "Product Management", "Growth Marketing", "UI/UX Design", "Blockchain", "Sales", "Strategy"];
 const availableIndustries = ["SaaS", "AI/ML", "Fintech", "Healthtech", "Sustainability", "Web3", "E-commerce"];

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

 useEffect(() => {
  const fetchData = async () => {
   try {
    const res = await fetch("/api/users");
    const data = await res.json();
    const usersWithProfiles = await Promise.all(data.map(async (u: any) => {
     const profileRes = await fetch(`/api/users/${u.id}`);
     const profileData = await profileRes.json();
     return { ...profileData, id: u.id };
    }));
    setUsers(usersWithProfiles);
   } catch (err) {
    console.error("Error fetching data", err);
   } finally {
    setLoading(false);
   }
  };
  fetchData();
 }, []);

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
  return users.filter(u => {
   if (!searchQuery) {
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

   const q = searchQuery.toLowerCase();
   const matchesSearch = u.name.toLowerCase().includes(q) || 
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

 const filteredOpportunities = useMemo(() => [
  { id: 1, title: "EcoSphere Accelerator", type: "Accelerator", location: "Remote", deadline: "Oct 30", tags: ["Sustainability", "Seed"], photo: "https://picsum.photos/seed/eco/800/600", description: "A 12-week program for early-stage startups building solutions for a sustainable future." },
  { id: 2, title: "Web3 Founders Grant", type: "Grant", location: "Global", deadline: "Nov 15", tags: ["Crypto", "Infrastructure"], photo: "https://picsum.photos/seed/web3/800/600", description: "Equity-free funding for developers building core Web3 infrastructure and protocols." },
  { id: 3, title: "AI Innovation Lab", type: "Incubator", location: "Berlin", deadline: "Dec 05", tags: ["AI", "Enterprise"], photo: "https://picsum.photos/seed/ai/800/600", description: "Deep-tech incubation for AI startups focusing on enterprise automation and efficiency." },
 ], []);

 const filteredCommunities = useMemo(() => [
  { id: 1, name: "SaaS Founders Collective", members: "1.2k", activity: "High", description: "A private network for B2B SaaS founders to share insights and scale.", icon: Rocket, status: "ACTIVE", growth: "+12%" },
  { id: 2, name: "AI Builders Network", members: "850", activity: "Very High", description: "Connecting engineers and product managers building the next generation of AI.", icon: Zap, status: "STABLE", growth: "+24%" },
  { id: 3, name: "Impact Ventures Hub", members: "540", activity: "Medium", description: "Dedicated to startups solving global environmental and social challenges.", icon: Globe, status: "EMERGING", growth: "+8%" },
 ], []);

 return (
  <PageShell title="Discovery · Εξερεύνηση" description="Explore founders, communities, opportunities and events in your ecosystem. · Ιδρυτές, κοινότητες, ευκαιρίες και εκδηλώσεις." noPadding={false}>
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
       className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-sm z-50 p-12 overflow-y-auto border-l border-stone-200"
      >
       <div className="flex items-center justify-between mb-16">
        <div className="space-y-2">
         <h3 className="text-sm font-medium tracking-wider text-stone-400">Refine Search</h3>
         <p className="text-xl font-medium text-stone-900">Advanced Filters</p>
        </div>
        <button 
         onClick={() => setIsFilterOpen(false)}
         className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors"
        >
         <X className="w-6 h-6" />
        </button>
       </div>

       <div className="space-y-16">
        {/* Filter Groups */}
        <div className="space-y-8">
         <p className="text-sm font-medium text-stone-900 tracking-wider">Expertise & Skills</p>
         <div className="flex flex-wrap gap-3">
          {availableSkills.map(skill => (
           <button 
            key={skill} 
            onClick={() => toggleSkill(skill)}
            className={cn(
             "px-6 py-3 rounded-full border text-sm font-medium transition-all",
             selectedSkills.includes(skill)
              ? "bg-stone-900 border-stone-900 text-white"
              : "border-stone-200 text-stone-500 hover:border-stone-900 hover:text-stone-900"
            )}
           >
            {skill}
           </button>
          ))}
         </div>
        </div>

        <div className="space-y-8">
         <p className="text-sm font-medium text-stone-900 tracking-wider">Industry</p>
         <div className="flex flex-wrap gap-3">
          {["SaaS", "AI/ML", "Fintech", "Healthtech", "Sustainability", "Web3", "E-commerce"].map(ind => (
           <button 
            key={ind} 
            onClick={() => toggleIndustry(ind)}
            className={cn(
             "px-6 py-3 rounded-full border text-sm font-medium transition-all",
             selectedIndustries.includes(ind)
              ? "bg-stone-900 border-stone-900 text-white"
              : "border-stone-200 text-stone-500 hover:border-stone-900 hover:text-stone-900"
            )}
           >
            {ind}
           </button>
          ))}
         </div>
        </div>

        <div className="space-y-8">
         <p className="text-sm font-medium text-stone-900 tracking-wider">Stage</p>
         <div className="flex flex-wrap gap-3">
          {["Pre-seed", "Seed", "Series A", "Series B+"].map(stage => (
           <button 
            key={stage} 
            onClick={() => toggleStage(stage)}
            className={cn(
             "px-6 py-3 rounded-full border text-sm font-medium transition-all",
             selectedStages.includes(stage)
              ? "bg-stone-900 border-stone-900 text-white"
              : "border-stone-200 text-stone-500 hover:border-stone-900 hover:text-stone-900"
            )}
           >
            {stage}
           </button>
          ))}
         </div>
        </div>

        <div className="space-y-8">
         <p className="text-sm font-medium text-stone-900 tracking-wider">Location</p>
         <div className="flex flex-wrap gap-3">
          {["Remote", "San Francisco", "New York", "London", "Berlin", "Global"].map(loc => (
           <button 
            key={loc} 
            onClick={() => toggleLocation(loc)}
            className={cn(
             "px-6 py-3 rounded-full border text-sm font-medium transition-all",
             selectedLocations.includes(loc)
              ? "bg-stone-900 border-stone-900 text-white"
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
          Apply Filters
         </Button>
         <Button variant="outline" onClick={() => { setSearchQuery(''); setSelectedSkills([]); setSelectedIndustries([]); setSelectedStages([]); setSelectedLocations([]); }} className="flex-1 rounded-2xl h-16 border-stone-200 text-stone-500 font-medium text-base tracking-wider">
          Reset
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
      placeholder="Search by skill, industry, or name..."
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
      isFilterOpen && "bg-stone-900 text-white border-stone-900"
     )}
     onClick={() => setIsFilterOpen(!isFilterOpen)}
    >
     <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
    </Button>
   </div>

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
       {cat}
       {activeCategory === cat && (
        <motion.div layoutId="activeCategory" className="absolute bottom-0 left-0 right-0 h-[2px] bg-stone-900 rounded-full" />
       )}
      </button>
     ))}
    </div>
    <div className="flex items-center gap-1 bg-stone-50 p-1 rounded-xl border border-stone-100 shrink-0">
     <button type="button" aria-label="Grid view" onClick={() => setViewMode("grid")} className={cn("min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg transition-all", viewMode === "grid" ? "bg-white text-stone-900 shadow-sm" : "text-stone-400")}>
      <Grid className="w-4 h-4" />
     </button>
     <button type="button" aria-label="List view" onClick={() => setViewMode("list")} className={cn("min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg transition-all", viewMode === "list" ? "bg-white text-stone-900 shadow-sm" : "text-stone-400")}>
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
         <p className="text-xs font-semibold tracking-wider text-stone-400">Expertise & Talent</p>
         <h3 className="text-base font-semibold text-stone-900">Founders & Mentors</h3>
        </div>
        <Link to="/matches">
         <Button variant="ghost" size="sm" className="h-7 px-3 text-sm text-stone-600 rounded-lg border border-stone-100 hover:border-stone-300">
          View All <ArrowRight className="ml-1.5 w-3 h-3" />
         </Button>
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
           <Link to={`/profile/${user.id}`} onClick={() => rememberPerson({ id: user.id, fullName: user.name || 'Founder', headline: user.profile?.headline || '', role: user.role || 'Founder', industry: user.profile?.industry || '', location: user.profile?.location || '' })} className="block space-y-3">
            <div className="flex items-start justify-between">
             <div className="w-12 h-12 rounded-xl overflow-hidden border border-stone-100">
              <img src={user.profile?.profilePhoto || `https://picsum.photos/seed/${user.id}/200/200`} alt="" className="w-full h-full object-cover" />
             </div>
             <div className="flex items-center gap-1 px-2 py-1 bg-stone-50 rounded-lg border border-stone-100">
              <ShieldCheck className={`w-3 h-3 ${user.profileCompletionScore > 90 && user.emailVerified ? 'text-emerald-500' : 'text-stone-300'}`} />
              <span className="text-xs text-stone-500">{user.profileCompletionScore > 90 && user.emailVerified ? 'Verified' : 'Pending'}</span>
             </div>
            </div>
            <div>
             <h4 className="text-base font-semibold text-stone-900">{user.name}</h4>
             <p className="text-sm text-stone-500 line-clamp-1 mt-0.5">{user.profile?.headline}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
             {user.skills?.slice(0, 3).map((skill: any, sIdx: number) => (
              <span key={skill.id || `skill-${sIdx}`} className="text-xs text-stone-400 border border-stone-100 px-2 py-0.5 rounded-md">{skill.name}</span>
             ))}
            </div>
            <div className="pt-2 border-t border-stone-50 flex items-center justify-between">
             <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-stone-400">Available · Διαθέσιμος{matchPhrase ? ` · ${matchPhrase}` : ''}</span>
             </div>
             <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-stone-600 rounded-lg border border-stone-100"
              onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate(`/messages?userId=${user.id}`); }}>
              Message
             </Button>
            </div>
           </Link>
          </motion.div>
          );
         })}
        </div>
       ) : (
        <div className="h-32 flex flex-col items-center justify-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
         <Search className="w-8 h-8 text-stone-300 mb-2" />
         <p className="text-sm text-stone-400">No matches found for your criteria · Καμία αντιστοίχιση με αυτά τα κριτήρια</p>
         <button type="button" onClick={() => { setSearchQuery(''); setSelectedSkills([]); setSelectedIndustries([]); setSelectedStages([]); setSelectedLocations([]); }} className="mt-2 text-xs font-medium text-stone-900 hover:underline">Clear filters</button>
        </div>
       )}
      </section>
     )}

     {/* Featured Section */}
     <section className="space-y-4">
      <div className="flex items-center justify-between">
       <div>
        <p className="text-xs font-semibold tracking-wider text-stone-400">Featured</p>
        <h3 className="text-base font-semibold text-stone-900">Curated Opportunities</h3>
       </div>
       <Link to="/discovery">
        <Button variant="ghost" size="sm" className="text-base font-medium text-stone-900 tracking-wider hover:bg-stone-100 px-8 rounded-full h-11 border border-stone-200/50 hover:border-stone-400 transition-all">
         View All <ArrowRight className="ml-4 w-5 h-5" />
        </Button>
       </Link>
      </div>
      <div className={cn(
       "grid gap-4",
       viewMode === "grid" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
      )}>
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
          <img src={opp.photo} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
          <div className="absolute top-3 left-3">
           <span className="bg-white/80 backdrop-blur-sm text-stone-700 text-xs font-semibold tracking-wider px-2 py-0.5 rounded-md">
            {opp.type}
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
          <p className="text-xs text-stone-400 flex items-center gap-1">
           <MapPin className="w-3 h-3" /> {opp.location}
          </p>
          <div className="flex flex-wrap gap-1.5">
           {opp.tags.map(tag => (
            <span key={tag} className="text-xs font-semibold text-stone-500 tracking-wider bg-stone-50 px-2 py-0.5 rounded-md border border-stone-100">
             {tag}
            </span>
           ))}
          </div>
         </div>
         {viewMode === "list" && (
          <div className="px-12 pb-8 md:pb-0 md:pr-12">
           <Button type="button" variant="outline" className="rounded-full h-11 px-8 text-sm font-medium tracking-wider border-stone-200 group-hover:bg-stone-900 group-hover:text-white group-hover:border-stone-900 transition-all" onClick={(e: React.MouseEvent) => { e.stopPropagation(); ask(`Tell me about ${opp.title}`); }}>
             Details
            </Button>
          </div>
         )}
        </motion.div>
       ))}
      </div>
     </section>

     {/* Communities Section */}
     <section className="space-y-4">
      <div className="flex items-center justify-between">
       <div>
        <p className="text-xs font-semibold tracking-wider text-stone-400">Communities</p>
        <h3 className="text-base font-semibold text-stone-900">Strategic Hubs</h3>
       </div>
       <Link to="/communities">
        <Button variant="ghost" size="sm" className="h-7 px-3 text-sm text-stone-600 rounded-lg border border-stone-100 hover:border-stone-300">
         Explore All <ArrowRight className="ml-1.5 w-3 h-3" />
        </Button>
       </Link>
      </div>
      <div className="border border-stone-100 rounded-2xl overflow-hidden divide-y divide-stone-100">
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
            )}>{comm.status}</span>
           </div>
           <p className="text-sm text-stone-500 line-clamp-1">{comm.description}</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
           <div className="text-right">
            <p className="text-sm font-semibold text-stone-900">{comm.members}</p>
            <p className="text-xs text-stone-400">members</p>
           </div>
           <Link to={`/communities/${comm.id}`}>
            <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-stone-600 transition-colors" />
           </Link>
          </div>
         </div>
        </motion.div>
       ))}
      </div>
     </section>
    </div>

    {/* Right Column - Sidebar Info */}
    <div className="lg:col-span-4 space-y-4">
     {/* Trending Topics */}
     <section className="bg-white border border-stone-100 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
       <h3 className="text-xs font-semibold tracking-wider text-stone-400">Trending Intelligence</h3>
       <Activity className="w-3.5 h-3.5 text-stone-400 animate-pulse" />
      </div>

      <div className="space-y-3">
       {[
        { topic: "Generative AI", growth: "+140%", count: "240 posts", trend: [10, 25, 45, 30, 60, 85, 100] },
        { topic: "Sustainable Tech", growth: "+85%", count: "180 posts", trend: [20, 15, 35, 40, 55, 70, 80] },
        { topic: "Remote Work 2.0", growth: "+42%", count: "120 posts", trend: [50, 45, 40, 42, 45, 48, 52] },
        { topic: "Fintech Regulation", growth: "+30%", count: "95 posts", trend: [10, 12, 15, 18, 22, 25, 30] },
       ].map((t) => (
        <div key={t.topic} role="button" tabIndex={0} onClick={() => ask(`Tell me about ${t.topic}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') ask(`Tell me about ${t.topic}`); }} className="flex items-center justify-between py-1.5 border-b border-stone-50 last:border-0 cursor-pointer group/item">
         <div>
          <p className="text-sm font-semibold text-stone-800 group-hover/item:text-stone-600 transition-colors">{t.topic}</p>
          <p className="text-xs text-stone-400">{t.count}</p>
         </div>
         <div className="flex items-center gap-2">
          <svg className="w-12 h-5 overflow-visible">
           <polyline fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className="text-stone-300"
            points={t.trend.map((val, i) => `${(i / (t.trend.length - 1)) * 48},${20 - (val / 100) * 20}`).join(' ')} />
          </svg>
          <span className="text-sm font-semibold text-emerald-600">{t.growth}</span>
         </div>
        </div>
       ))}
      </div>
      <Button type="button" variant="outline" onClick={() => navigate('/communities')} className="w-full h-7 rounded-lg text-sm border-stone-100">
       View All Topics
      </Button>
     </section>

     {/* Upcoming Events */}
     <section className="bg-white border border-stone-100 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
       <div>
        <p className="text-xs font-semibold tracking-wider text-stone-400">Ecosystem Events</p>
        <h3 className="text-sm font-semibold text-stone-900">Upcoming Sessions</h3>
       </div>
       <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs text-stone-400">Live Now</span>
       </div>
      </div>
      <div className="space-y-2">
       {[
        { title: "Founder Mixer SF", date: "Oct 18", time: "6:00 PM", type: "In-Person", capacity: "85%", status: "FILLING" },
        { title: "AI Product Workshop", date: "Oct 20", time: "10:00 AM", type: "Virtual", capacity: "40%", status: "OPEN" },
        { title: "Seed Funding Webinar", date: "Oct 25", time: "2:00 PM", type: "Virtual", capacity: "95%", status: "LAST_CALL" },
       ].map((event) => (
        <div key={event.title} role="button" tabIndex={0} onClick={() => ask(`Tell me about ${event.title}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') ask(`Tell me about ${event.title}`); }} className="group p-3 rounded-xl border border-stone-100 bg-stone-50 hover:border-stone-200 transition-all cursor-pointer flex items-center gap-3">
         <div className="w-10 h-10 rounded-xl bg-white border border-stone-100 flex flex-col items-center justify-center shrink-0">
          <span className="text-[8px] font-semibold text-stone-400">{event.date.split(' ')[0]}</span>
          <span className="text-base font-bold text-stone-900">{event.date.split(' ')[1]}</span>
         </div>
         <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-stone-900 truncate">{event.title}</h4>
          <p className="text-xs text-stone-400">{event.time} · {event.type}</p>
          <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden mt-1">
           <motion.div initial={{ width: 0 }} animate={{ width: event.capacity }}
            className={cn("h-full", event.status === "LAST_CALL" ? "bg-amber-400" : "bg-stone-300")} />
          </div>
         </div>
         <span className={cn("text-xs font-semibold shrink-0", event.status === "LAST_CALL" ? "text-amber-600" : "text-stone-400")}>{event.status}</span>
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
        <h4 className="text-sm font-semibold text-stone-900">Weekly Briefing</h4>
        <p className="text-xs text-stone-400">Ecosystem news & funding alerts</p>
       </div>
      </div>
      <input
       type="email"
       placeholder="Enter your email"
       className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
      />
      <Button type="button" onClick={() => ask('what should I do today')} className="w-full rounded-lg h-8 bg-stone-900 text-white text-sm hover:bg-stone-800 transition-all">
       Subscribe Now
      </Button>
     </section>
    </div>
   </div>
  </div>
  </PageShell>
 );
}
