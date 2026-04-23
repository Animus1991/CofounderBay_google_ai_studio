import { useState, useMemo, useEffect } from "react";
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
import PageContainer from "../components/layout/PageContainer";
import { User } from "../types";
import { cn } from "../lib/utils";

interface DiscoveryProps {
 user: User;
}

type CategoryType = "All" | "Matches" | "Communities" | "Opportunities" | "Events";

export default function Discovery({ user }: DiscoveryProps) {
 const [activeCategory, setActiveCategory] = useState<CategoryType>("All");
 const [searchQuery, setSearchQuery] = useState("");
 const navigate = useNavigate();
 const [suggestions, setSuggestions] = useState<string[]>([]);
 const [showSuggestions, setShowSuggestions] = useState(false);
 const [isFilterOpen, setIsFilterOpen] = useState(false);
 const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
 const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
 const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
 const [selectedStages, setSelectedStages] = useState<string[]>([]);
 const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
 const [users, setUsers] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

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
  <PageContainer className="space-y-32 pb-40 bg-stone-50/20">
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
       className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 p-12 overflow-y-auto border-l border-stone-200"
      >
       <div className="flex items-center justify-between mb-16">
        <div className="space-y-2">
         <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400">Refine Search</h3>
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
         <p className="text-xs font-medium text-stone-900 uppercase tracking-wider">Expertise & Skills</p>
         <div className="flex flex-wrap gap-3">
          {availableSkills.map(skill => (
           <button 
            key={skill} 
            onClick={() => toggleSkill(skill)}
            className={cn(
             "px-6 py-3 rounded-full border text-xs font-medium transition-all",
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
         <p className="text-xs font-medium text-stone-900 uppercase tracking-wider">Industry</p>
         <div className="flex flex-wrap gap-3">
          {["SaaS", "AI/ML", "Fintech", "Healthtech", "Sustainability", "Web3", "E-commerce"].map(ind => (
           <button 
            key={ind} 
            onClick={() => toggleIndustry(ind)}
            className={cn(
             "px-6 py-3 rounded-full border text-xs font-medium transition-all",
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
         <p className="text-xs font-medium text-stone-900 uppercase tracking-wider">Stage</p>
         <div className="flex flex-wrap gap-3">
          {["Pre-seed", "Seed", "Series A", "Series B+"].map(stage => (
           <button 
            key={stage} 
            onClick={() => toggleStage(stage)}
            className={cn(
             "px-6 py-3 rounded-full border text-xs font-medium transition-all",
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
         <p className="text-xs font-medium text-stone-900 uppercase tracking-wider">Location</p>
         <div className="flex flex-wrap gap-3">
          {["Remote", "San Francisco", "New York", "London", "Berlin", "Global"].map(loc => (
           <button 
            key={loc} 
            onClick={() => toggleLocation(loc)}
            className={cn(
             "px-6 py-3 rounded-full border text-xs font-medium transition-all",
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
         <Button className="flex-1 rounded-2xl h-16 bg-stone-900 text-white font-medium text-sm uppercase tracking-wider">
          Apply Filters
         </Button>
         <Button variant="outline" className="flex-1 rounded-2xl h-16 border-stone-200 text-stone-500 font-medium text-sm uppercase tracking-wider">
          Reset
         </Button>
        </div>
       </div>
      </motion.div>
     </>
    )}
   </AnimatePresence>

   {/* Discovery Header - Editorial Style */}
   <header className="relative pt-24 overflow-hidden">
    {/* Immersive Background Elements */}
    <div className="absolute -top-48 -left-48 w-[70rem] h-[70rem] bg-stone-100/60 rounded-full blur-[140px] opacity-40 -z-10" />
    <div className="absolute top-0 right-0 w-[45rem] h-[45rem] bg-stone-50/40 rounded-full blur-[120px] opacity-30 -z-10" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.015] pointer-events-none -z-10" />
    
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-24 text-left">
     <div className="space-y-12 max-w-5xl">
      <motion.div 
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       className="inline-flex items-center gap-4 px-6 py-2.5 bg-stone-900/5 rounded-full text-xs font-medium text-stone-500 uppercase tracking-wider border border-stone-200/40 backdrop-blur-xl shadow-sm"
      >
       <div className="w-2 h-2 rounded-full bg-stone-900 animate-pulse" />
       Intelligence Discovery • v4.2
      </motion.div>
      
      <div className="space-y-4">
       <h2 className="text-xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-medium tracking-tight text-stone-900 leading-snug">
        Explore <br />
        <span className="text-stone-300 italic font-serif font-light lowercase tracking-tight">the</span> Frontier.
       </h2>
      </div>
      
      <p className="text-base sm:text-2xl text-stone-500 max-w-xl leading-relaxed font-light">
       Navigate the most promising opportunities, communities, and <span className="text-stone-900 font-medium">strategic hubs</span> in the global startup ecosystem.
      </p>
     </div>

     <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
      <div className="hidden lg:flex items-center gap-4 bg-white/40 backdrop-blur-md px-4 py-2 rounded-3xl border border-white/20 shadow-sm">
       <div className="flex flex-col">
        <span className="text-xs font-medium text-stone-400 uppercase tracking-widest">Daily Goal</span>
        <span className="text-sm font-medium text-stone-900">3/5 Profiles Viewed</span>
       </div>
       <div className="w-12 h-12 rounded-full border-4 border-stone-100 border-t-stone-900 flex items-center justify-center text-xs font-medium">
        60%
       </div>
      </div>
      <div className="relative group w-full lg:w-[32rem]">
       <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-stone-300 group-focus-within:text-stone-900 transition-colors duration-500" />
       <input 
        type="text" 
        placeholder="Search by skill, industry, or name..." 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
        className="w-full bg-white border border-stone-200/60 rounded-[2rem] py-7 pl-20 pr-10 text-base font-medium focus:outline-none focus:border-stone-900 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.03)] placeholder:text-stone-300 text-stone-900"
       />
       
       {/* Auto-suggestions */}
       <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
         <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute top-full left-0 right-0 mt-4 bg-white rounded-3xl border border-stone-100 shadow-2xl z-50 overflow-hidden"
         >
          {suggestions.map((suggestion, idx) => (
           <button
            key={idx}
            onClick={() => {
             setSearchQuery(suggestion);
             setShowSuggestions(false);
            }}
            className="w-full px-5 py-2.5 text-left hover:bg-stone-50 flex items-center justify-between group/sug"
           >
            <span className="text-stone-600 group-hover:text-stone-900 font-medium">{suggestion}</span>
            <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-stone-900 transition-all" />
           </button>
          ))}
         </motion.div>
        )}
       </AnimatePresence>
      </div>
      <Button 
       variant="outline" 
       className={cn(
        "h-20 px-12 rounded-[2rem] border-stone-200 bg-white shadow-sm transition-all flex items-center gap-5 font-medium text-sm uppercase tracking-wider hover:border-stone-400 hover:-translate-y-1",
        isFilterOpen && "bg-stone-900 text-white border-stone-900"
       )}
       onClick={() => setIsFilterOpen(!isFilterOpen)}
      >
       <SlidersHorizontal className="w-6 h-6" />
       Filters
      </Button>
     </div>
    </div>
   </header>

   {/* Category Tabs - Minimal & High Contrast */}
   <div className="flex items-center justify-between border-b border-stone-200/40 pb-2">
    <div className="flex items-center gap-16 overflow-x-auto scrollbar-hide">
     {categories.map((cat) => (
      <button
       key={cat}
       onClick={() => setActiveCategory(cat)}
       className={cn(
        "pb-8 text-sm font-medium uppercase tracking-wider transition-all relative whitespace-nowrap",
        activeCategory === cat 
         ? "text-stone-900" 
         : "text-stone-400 hover:text-stone-600"
       )}
      >
       {cat}
       {activeCategory === cat && (
        <motion.div 
         layoutId="activeCategory"
         className="absolute bottom-0 left-0 right-0 h-[4px] bg-stone-900 rounded-full"
        />
       )}
      </button>
     ))}
    </div>
    <div className="hidden md:flex items-center gap-2 bg-stone-100/50 p-2 rounded-[1.5rem] border border-stone-200/40 backdrop-blur-md">
     <button 
      onClick={() => setViewMode("grid")}
      className={cn("p-3 rounded-xl transition-all duration-500", viewMode === "grid" ? "bg-white text-stone-900 shadow-xl shadow-stone-200/50" : "text-stone-400 hover:text-stone-600")}
     >
      <Grid className="w-6 h-6" />
     </button>
     <button 
      onClick={() => setViewMode("list")}
      className={cn("p-3 rounded-xl transition-all duration-500", viewMode === "list" ? "bg-white text-stone-900 shadow-xl shadow-stone-200/50" : "text-stone-400 hover:text-stone-600")}
     >
      <ListIcon className="w-6 h-6" />
     </button>
    </div>
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-12 gap-24">
    {/* Main Content Area */}
    <div className="lg:col-span-8 space-y-32">
     {/* Founders & Mentors Section (Matches) */}
     {(activeCategory === "All" || activeCategory === "Matches") && (
      <section className="space-y-12">
       <div className="flex items-end justify-between px-4">
        <div className="space-y-3 text-left">
         <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400">Expertise & Talent</h3>
         <p className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900 tracking-tight">Founders & Mentors</p>
        </div>
        <Link to="/matches">
         <Button variant="ghost" className="text-sm font-medium text-stone-900 uppercase tracking-wider hover:bg-stone-100 px-8 rounded-full h-11 border border-stone-200/50 hover:border-stone-400 transition-all">
          View All <ArrowRight className="ml-4 w-5 h-5" />
         </Button>
        </Link>
       </div>

       {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
         {[1, 2].map(i => (
          <div key={i} className="h-96 bg-stone-100 rounded-[3rem] animate-pulse" />
         ))}
        </div>
       ) : filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
         {filteredUsers.slice(0, 4).map((user, idx) => (
          <motion.div
           key={user.id || `user-${idx}`}
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: idx * 0.1 }}
           className="group relative bg-white border border-stone-200/60 rounded-[3rem] p-10 transition-all duration-700 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] hover:border-stone-300"
          >
           <Link to={`/profile/${user.id}`} className="block space-y-8">
            <div className="flex items-start justify-between">
             <div className="w-24 h-24 rounded-2xl overflow-hidden border border-stone-100 shadow-lg">
              <img src={user.profile?.profilePhoto || `https://picsum.photos/seed/${user.id}/200/200`} alt="" className="w-full h-full object-cover" />
             </div>
             <div className="flex items-center gap-2 px-4 py-2 bg-stone-50 rounded-full border border-stone-100">
              <ShieldCheck className={`w-4 h-4 ${user.profileCompletionScore > 90 && user.emailVerified ? 'text-emerald-500' : 'text-stone-300'}`} />
              <span className="text-xs font-medium text-stone-600 uppercase tracking-widest">
               {user.profileCompletionScore > 90 && user.emailVerified ? 'Verified' : 'Pending'}
              </span>
             </div>
            </div>

            <div className="space-y-3 text-left">
             <h4 className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900 tracking-tight">{user.name}</h4>
             <p className="text-sm text-stone-500 font-medium line-clamp-2 leading-relaxed">{user.profile?.headline}</p>
            </div>

            <div className="flex flex-wrap gap-2">
             {user.skills?.slice(0, 3).map((skill: any, sIdx: number) => (
              <span key={skill.id || `skill-${sIdx}`} className="text-xs font-medium text-stone-400 uppercase tracking-widest border border-stone-100 px-3 py-1.5 rounded-lg">
               {skill.name}
              </span>
             ))}
             {user.skills?.length > 3 && (
              <span className="text-xs font-medium text-stone-400 uppercase tracking-widest border border-stone-100 px-3 py-1.5 rounded-lg">
               +{user.skills.length - 3}
              </span>
             )}
            </div>

            <div className="pt-6 border-t border-stone-50 flex items-center justify-between">
             <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Available Now</span>
             </div>
             <div className="flex items-center gap-4">
              <Button 
               variant="ghost" 
               size="sm" 
               className="h-10 px-6 text-xs font-medium text-stone-900 uppercase tracking-wider hover:bg-stone-100 rounded-full border border-stone-200/50"
               onClick={(e) => {
                e.preventDefault();
                navigate(`/messages?userId=${user.id}`);
               }}
              >
               Message
              </Button>
              <div className="text-xs font-medium text-stone-900 uppercase tracking-wider">
               {user.profile?.yearsOfExperience || 0} Yrs Exp
              </div>
             </div>
            </div>
           </Link>
          </motion.div>
         ))}
        </div>
       ) : (
        <div className="h-64 flex flex-col items-center justify-center bg-stone-50/50 rounded-[3rem] border border-dashed border-stone-200">
         <Search className="w-12 h-12 text-stone-300 mb-4" />
         <p className="text-stone-400 font-medium">No matches found for your criteria</p>
        </div>
       )}
      </section>
     )}

     {/* Featured Section - Premium Cards */}
     <section className="space-y-12">
      <div className="flex items-center justify-between px-6">
       <div className="space-y-3 text-left">
        <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400">Featured</h3>
        <p className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900 tracking-tight">Curated Opportunities</p>
       </div>
       <Link to="/discovery">
        <Button variant="ghost" size="sm" className="text-sm font-medium text-stone-900 uppercase tracking-wider hover:bg-stone-100 px-8 rounded-full h-11 border border-stone-200/50 hover:border-stone-400 transition-all">
         View All <ArrowRight className="ml-4 w-5 h-5" />
        </Button>
       </Link>
      </div>
      <div className={cn(
       "grid gap-12",
       viewMode === "grid" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
      )}>
       {filteredOpportunities.map((opp, i) => (
        <motion.div 
         key={opp.id}
         initial={{ opacity: 0, y: 30 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
         className={cn(
          "group cursor-pointer overflow-hidden border border-stone-200/50 bg-white hover:border-stone-900 transition-all duration-1000",
          viewMode === "grid" ? "rounded-[4rem] hover:shadow-[0_60px_120px_-20px_rgba(0,0,0,0.1)]" : "rounded-[2rem] flex flex-col md:flex-row items-center"
         )}
        >
         <div className={cn(
          "relative overflow-hidden shrink-0",
          viewMode === "grid" ? "h-80 w-full" : "h-64 w-full md:w-80"
         )}>
          <img src={opp.photo} alt="" className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
          <div className="absolute top-10 left-10">
           <span className="bg-white/10 backdrop-blur-3xl text-white text-xs font-medium uppercase tracking-wider px-6 py-2.5 rounded-full border border-white/20">
            {opp.type}
           </span>
          </div>
          <div className="absolute bottom-10 left-10 right-10 flex items-center justify-between">
           <span className="text-white/90 text-xs font-medium uppercase tracking-wider flex items-center gap-4">
            <CalendarIcon className="w-5 h-5" /> {opp.deadline}
           </span>
          </div>
         </div>
         <div className={cn(
          "p-12 space-y-10 text-left flex-1",
          viewMode === "list" && "py-8"
         )}>
          <div className="space-y-4">
           <h4 className={cn(
            " font-medium text-stone-900 leading-snug group-hover:text-stone-600 transition-colors",
            viewMode === "grid" ? "text-2xl" : "text-xl"
           )}>{opp.title}</h4>
           {viewMode === "list" && (
            <p className="text-sm sm:text-base lg:text-lg text-stone-500 font-light line-clamp-2">{opp.description}</p>
           )}
           <p className="text-sm font-medium text-stone-400 uppercase tracking-wider flex items-center gap-3">
            <MapPin className="w-5 h-5 text-stone-300" /> {opp.location}
           </p>
          </div>
          <div className="flex flex-wrap gap-4">
           {opp.tags.map(tag => (
            <span key={tag} className="text-xs font-medium text-stone-500 uppercase tracking-wider bg-stone-50 px-5 py-2.5 rounded-full border border-stone-100 group-hover:border-stone-200 transition-colors">
             {tag}
            </span>
           ))}
          </div>
         </div>
         {viewMode === "list" && (
          <div className="px-12 pb-8 md:pb-0 md:pr-12">
           <Link to={`/discovery?opportunity=${opp.id}`}>
            <Button variant="outline" className="rounded-full h-11 px-8 text-xs font-medium uppercase tracking-wider border-stone-200 group-hover:bg-stone-900 group-hover:text-white group-hover:border-stone-900 transition-all">
             Details
            </Button>
           </Link>
          </div>
         )}
        </motion.div>
       ))}
      </div>
     </section>

     {/* Communities Section - Data Grid Style */}
     <section className="space-y-12">
      <div className="flex items-center justify-between px-6">
       <div className="space-y-3 text-left">
        <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400">Communities</h3>
        <p className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900 tracking-tight">Strategic Hubs</p>
       </div>
       <Link to="/communities">
        <Button variant="ghost" size="sm" className="text-sm font-medium text-stone-900 uppercase tracking-wider hover:bg-stone-100 px-8 rounded-full h-11 border border-stone-200/50 hover:border-stone-400 transition-all">
         Explore All <ArrowRight className="ml-4 w-5 h-5" />
        </Button>
       </Link>
      </div>
      <div className="space-y-0 border-t border-stone-200/60 rounded-[3rem] overflow-hidden border-x border-b">
       {filteredCommunities.map((comm, i) => (
        <motion.div 
         key={comm.id}
         initial={{ opacity: 0, x: -20 }}
         animate={{ opacity: 1, x: 0 }}
         transition={{ delay: i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
         className="group relative p-12 border-b border-stone-200/60 bg-white hover:bg-stone-900 transition-all duration-700 cursor-pointer last:border-b-0"
        >
         <div className="flex items-center gap-12">
          <div className="w-24 h-24 rounded-[2rem] bg-stone-50 text-stone-900 flex items-center justify-center shrink-0 group-hover:bg-white transition-all duration-700 border border-stone-200/50 group-hover:border-transparent group-hover:scale-110">
           <comm.icon className="w-12 h-12" />
          </div>
          <div className="flex-1 space-y-5 text-left">
           <div className="flex items-center justify-between">
            <div className="space-y-1">
             <h4 className="text-xl font-medium text-stone-900 group-hover:text-white transition-colors">{comm.name}</h4>
             <div className="flex items-center gap-4">
              <span className={cn(
               "text-xs font-medium px-3 py-1 rounded-full border",
               comm.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
               comm.status === "STABLE" ? "bg-blue-50 text-blue-600 border-blue-100" : 
               "bg-amber-50 text-amber-600 border-amber-100"
              )}>
               {comm.status}
              </span>
              <span className="text-xs font-mono text-stone-400 group-hover:text-stone-500">GROWTH: {comm.growth}</span>
             </div>
            </div>
            <div className="flex items-center gap-12">
             <div className="flex flex-col items-end">
              <span className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2 group-hover:text-stone-500">Members</span>
              <span className="text-base font-mono font-medium text-stone-900 group-hover:text-white">{comm.members}</span>
             </div>
             <div className="flex flex-col items-end">
              <span className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2 group-hover:text-stone-500">Activity</span>
              <span className="text-base font-mono font-medium text-stone-900 group-hover:text-white">{comm.activity}</span>
             </div>
            </div>
           </div>
           <p className="text-sm sm:text-base lg:text-lg text-stone-500 leading-relaxed max-w-3xl group-hover:text-stone-400 transition-colors font-light">{comm.description}</p>
          </div>
          <div className="self-center">
           <Link to={`/communities/${comm.id}`}>
            <div className="w-14 h-11 rounded-full border border-stone-200 flex items-center justify-center text-stone-300 group-hover:text-white group-hover:border-white transition-all duration-700 group-hover:translate-x-2">
             <ArrowRight className="w-7 h-7" />
            </div>
           </Link>
          </div>
         </div>
        </motion.div>
       ))}
      </div>
     </section>
    </div>

    {/* Right Column - Sidebar Info */}
    <div className="lg:col-span-4 space-y-24">
     {/* Trending Topics - Atmospheric Style */}
     <section className="bg-stone-950 border border-stone-800 rounded-[3.5rem] p-16 md:p-20 space-y-16 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.4)] text-left relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-stone-700/10 rounded-full -mr-32 -mt-32 blur-[100px] pointer-events-none group-hover:bg-stone-600/20 transition-colors duration-1000" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
      
      <div className="flex items-center justify-between relative z-10">
       <h3 className="text-xs font-medium uppercase tracking-wider text-stone-500">Trending Intelligence</h3>
       <Activity className="w-5 h-5 text-stone-600 animate-pulse" />
      </div>

      <div className="space-y-12 relative z-10">
       {[
        { topic: "Generative AI", growth: "+140%", count: "240 posts", trend: [10, 25, 45, 30, 60, 85, 100] },
        { topic: "Sustainable Tech", growth: "+85%", count: "180 posts", trend: [20, 15, 35, 40, 55, 70, 80] },
        { topic: "Remote Work 2.0", growth: "+42%", count: "120 posts", trend: [50, 45, 40, 42, 45, 48, 52] },
        { topic: "Fintech Regulation", growth: "+30%", count: "95 posts", trend: [10, 12, 15, 18, 22, 25, 30] },
       ].map((t) => (
        <div key={t.topic} className="flex items-center justify-between group/item cursor-pointer">
         <div className="space-y-3">
          <p className="text-xl font-medium text-white group-hover/item:text-stone-300 transition-colors tracking-tight">{t.topic}</p>
          <div className="flex items-center gap-4">
           <p className="text-xs text-stone-500 font-mono font-medium uppercase tracking-wider">{t.count}</p>
           {/* Simple SVG Sparkline */}
           <svg className="w-16 h-6 overflow-visible">
            <polyline
             fill="none"
             stroke="currentColor"
             strokeWidth="2"
             strokeLinecap="round"
             strokeLinejoin="round"
             className="text-stone-700 group-hover/item:text-stone-500 transition-colors"
             points={t.trend.map((val, i) => `${(i / (t.trend.length - 1)) * 64},${24 - (val / 100) * 24}`).join(' ')}
            />
           </svg>
          </div>
         </div>
         <div className="text-right">
          <p className="text-lg font-mono font-medium text-emerald-500">{t.growth}</p>
          <p className="text-xs font-medium text-stone-600 uppercase tracking-wider mt-2">Velocity</p>
         </div>
        </div>
       ))}
      </div>
      <Button 
       onClick={() => navigate('/dashboard')}
       className="w-full h-20 rounded-[1.5rem] text-sm font-medium uppercase tracking-wider bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all hover:border-white/20 hover:-translate-y-1 relative z-10 backdrop-blur-xl"
      >
       View All Topics
      </Button>
     </section>

     {/* Upcoming Events - Hardware Style */}
     <section className="space-y-12 text-left">
      <div className="px-6 flex items-center justify-between">
       <div className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400">Ecosystem Events</h3>
        <p className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900 tracking-tight">Upcoming Sessions</p>
       </div>
       <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-mono font-medium text-stone-400 uppercase tracking-wider">Live Now</span>
       </div>
      </div>
      <div className="space-y-6">
       {[
        { title: "Founder Mixer SF", date: "Oct 18", time: "6:00 PM", location: "Downtown SF", type: "In-Person", capacity: "85%", status: "FILLING" },
        { title: "AI Product Workshop", date: "Oct 20", time: "10:00 AM", location: "Zoom", type: "Virtual", capacity: "40%", status: "OPEN" },
        { title: "Seed Funding Webinar", date: "Oct 25", time: "2:00 PM", location: "Zoom", type: "Virtual", capacity: "95%", status: "LAST_CALL" },
       ].map((event) => (
        <div key={event.title} className="group p-10 rounded-[3rem] border border-stone-200/60 bg-white hover:border-stone-900 transition-all duration-700 cursor-pointer hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.06)] relative overflow-hidden">
         <div className="absolute top-0 right-0 w-1 h-full bg-stone-100 group-hover:bg-stone-900 transition-colors" />
         <div className="flex items-center gap-8 relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col items-center justify-center shrink-0 group-hover:bg-stone-900 group-hover:text-white transition-all duration-700 group-hover:scale-110">
           <span className="text-xs font-mono font-medium text-stone-400 uppercase tracking-wider group-hover:text-stone-500">{event.date.split(' ')[0]}</span>
           <span className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900 group-hover:text-white">{event.date.split(' ')[1]}</span>
          </div>
          <div className="flex-1 min-w-0 space-y-3">
           <h4 className="text-xl font-medium text-stone-900 truncate group-hover:text-stone-600 transition-colors tracking-tight">{event.title}</h4>
           <div className="flex items-center gap-6">
            <p className="text-xs text-stone-400 font-mono font-medium uppercase tracking-wider">
             {event.time} • {event.type}
            </p>
            <div className="h-1 w-1 rounded-full bg-stone-200" />
            <p className={cn(
             "text-xs font-medium uppercase tracking-wider",
             event.status === "LAST_CALL" ? "text-amber-600" : "text-stone-400"
            )}>
             {event.status}
            </p>
           </div>
           {/* Hardware-style progress bar */}
           <div className="w-full h-1 bg-stone-50 rounded-full overflow-hidden border border-stone-100">
            <motion.div 
             initial={{ width: 0 }}
             animate={{ width: event.capacity }}
             className="h-full bg-stone-200 group-hover:bg-stone-900 transition-colors"
            />
           </div>
          </div>
          <ArrowRight className="w-6 h-6 text-stone-200 group-hover:text-stone-900 transition-colors group-hover:translate-x-1" />
         </div>
        </div>
       ))}
      </div>
     </section>

     {/* Newsletter Card - Atmospheric Style */}
     <section className="rounded-[4rem] bg-stone-900 p-16 text-center space-y-12 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-80 h-80 bg-stone-700/20 rounded-full -mr-40 -mt-40 blur-[100px] group-hover:bg-stone-600/30 transition-colors duration-1000" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-stone-800/20 rounded-full -ml-32 -mb-32 blur-[80px]" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.05] pointer-events-none" />
      
      <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-10 border border-white/10 relative z-10 shadow-inner backdrop-blur-3xl group-hover:scale-110 transition-transform duration-1000">
       <MessageSquare className="w-12 h-12 text-white" />
      </div>
      <div className="space-y-6 relative z-10">
       <h4 className="text-xl sm:text-2xl xl:text-3xl font-medium text-white tracking-tight">Weekly Briefing</h4>
       <p className="text-base text-stone-400 leading-relaxed font-light max-w-[320px] mx-auto">
        Get the latest ecosystem news, funding alerts, and founder stories delivered to your inbox.
       </p>
      </div>
      <div className="space-y-6 relative z-10">
       <input 
        type="email" 
        placeholder="Enter your email" 
        className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-6 px-10 text-lg text-white placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all backdrop-blur-3xl"
       />
       <Button 
        onClick={() => navigate('/dashboard')}
        className="w-full rounded-[1.5rem] h-20 bg-white text-stone-900 font-medium text-lg hover:bg-stone-100 transition-all shadow-2xl hover:-translate-y-2"
       >
        Subscribe Now
       </Button>
      </div>
     </section>
    </div>
   </div>
  </PageContainer>
 );
}
