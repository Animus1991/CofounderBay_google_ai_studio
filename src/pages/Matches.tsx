import { useState, useMemo } from "react";
import { 
 Search, 
 Filter, 
 ArrowRight, 
 Star, 
 Users, 
 Zap, 
 Globe, 
 Target, 
 Briefcase, 
 Rocket, 
 Activity, 
 Sparkles, 
 Check, 
 Plus, 
 MoreVertical, 
 Layout, 
 ChevronRight, 
 MessageSquare, 
 Share2, 
 Heart, 
 Bookmark, 
 ExternalLink, 
 ChevronDown, 
 SlidersHorizontal, 
 Grid, 
 List as ListIcon, 
 ShieldCheck, 
 DollarSign, 
 Clock, 
 MapPin,
 X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageContainer from "../components/layout/PageContainer";
import { User } from "../types";
import { cn } from "../lib/utils";

interface MatchesProps {
 user: User;
}

type MatchType = "All" | "Co-founders" | "Investors" | "Mentors" | "Advisors";

export default function Matches({ user }: MatchesProps) {
 const [activeType, setActiveType] = useState<MatchType>("All");
 const [searchQuery, setSearchQuery] = useState("");
 const [isFilterOpen, setIsFilterOpen] = useState(false);
 const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
 const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

 const matchTypes: MatchType[] = ["All", "Co-founders", "Investors", "Mentors", "Advisors"];
 const availableSkills = ["React", "Node.js", "Python", "AI/ML", "Product Management", "Growth Marketing", "UI/UX Design", "Blockchain", "Sales", "Strategy"];

 const toggleSkill = (skill: string) => {
  setSelectedSkills(prev => 
   prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
  );
 };

 return (
  <PageContainer className="space-y-24 pb-40 bg-stone-50/20">
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
         <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400">Refine Matches</h3>
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
         <p className="text-xs font-medium text-stone-900 uppercase tracking-wider">Location</p>
         <div className="flex flex-wrap gap-3">
          {["Remote", "San Francisco", "New York", "London", "Berlin"].map(loc => (
           <button key={loc} className="px-4 py-1.5 rounded-full border border-stone-200 text-xs font-medium text-stone-500 hover:border-stone-900 hover:text-stone-900 transition-all">
            {loc}
           </button>
          ))}
         </div>
        </div>

        <div className="pt-12 border-t border-stone-100 flex gap-4">
         <Button 
          onClick={() => setIsFilterOpen(false)}
          className="flex-1 rounded-2xl h-16 bg-stone-900 text-white font-medium text-sm uppercase tracking-wider"
         >
          Apply Filters
         </Button>
         <Button 
          variant="outline" 
          onClick={() => setSelectedSkills([])}
          className="flex-1 rounded-2xl h-16 border-stone-200 text-stone-500 font-medium text-sm uppercase tracking-wider"
         >
          Reset
         </Button>
        </div>
       </div>
      </motion.div>
     </>
    )}
   </AnimatePresence>
   {/* Matches Header - Editorial Style */}
   <header className="relative pt-16 overflow-hidden">
    <div className="absolute -top-32 -left-32 w-[50rem] h-[50rem] bg-stone-100/60 rounded-full blur-[120px] opacity-40 -z-10" />
    <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-stone-50/40 rounded-full blur-[100px] opacity-30 -z-10" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.015] pointer-events-none -z-10" />

    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-16 text-left">
     <div className="space-y-10 max-w-4xl">
      <motion.div 
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       className="inline-flex items-center gap-4 px-6 py-2.5 bg-stone-900/5 rounded-full text-xs font-medium text-stone-500 uppercase tracking-wider border border-stone-200/40 backdrop-blur-xl shadow-sm"
      >
       <div className="w-2 h-2 rounded-full bg-stone-900 animate-pulse" />
       AI Matchmaking • Engine v5.0
      </motion.div>
      
      <div className="space-y-4">
       <h2 className="text-xl md:text-2xl lg:text-xl font-medium tracking-tight text-stone-900 leading-snug uppercase">
        Find your <br />
        <span className="text-stone-300 italic font-serif font-light lowercase tracking-tight">perfect</span> match.
       </h2>
      </div>
      
      <p className="text-sm sm:text-base lg:text-lg text-stone-500 max-w-xl leading-relaxed font-light">
       Our proprietary AI engine analyzes <span className="text-stone-900 font-medium">thousands of data points</span> to connect you with the right strategic partners.
      </p>
     </div>

     <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
      <div className="relative group w-full lg:w-[24rem]">
       <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-stone-400 group-focus-within:text-stone-900 transition-colors duration-500" />
       <input 
        type="text" 
        placeholder="Search matches..." 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full bg-white border border-stone-200/60 rounded-[2rem] py-2.5 sm:py-3.5 pl-10 sm:pl-12 pr-4 text-xs sm:text-sm font-medium focus:outline-none focus:border-stone-900 transition-all shadow-sm placeholder:text-stone-400 text-stone-900"
       />
      </div>
      <Button 
       variant="outline" 
       className={cn(
        "px-4 sm:px-6 py-2 sm:py-2.5 rounded-[2rem] border-stone-200 bg-white shadow-sm transition-all flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm hover:border-stone-400 hover:-translate-y-0.5 w-full sm:w-auto",
        isFilterOpen && "bg-stone-900 text-white border-stone-900"
       )}
       onClick={() => setIsFilterOpen(!isFilterOpen)}
      >
       <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
       Filters
      </Button>
     </div>
    </div>
   </header>

   {/* Match Type Tabs - Minimal & High Contrast */}
   <div className="flex items-center justify-between border-b border-stone-200/40 pb-2">
    <div className="flex items-center gap-16 overflow-x-auto scrollbar-hide">
     {matchTypes.map((type) => (
      <button
       key={type}
       onClick={() => setActiveType(type)}
       className={cn(
        "pb-8 text-sm font-medium uppercase tracking-wider transition-all relative whitespace-nowrap",
        activeType === type 
         ? "text-stone-900" 
         : "text-stone-400 hover:text-stone-600"
       )}
      >
       {type}
       {activeType === type && (
        <motion.div 
         layoutId="activeMatchType"
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
    <div className="lg:col-span-8 space-y-24">
     {/* Featured Match Section - Premium Editorial Card */}
     <section className="space-y-12">
      <div className="flex items-center justify-between px-6">
       <div className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400">Featured Recommendation</h3>
        <p className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900 tracking-tight">Match of the Day</p>
       </div>
       <Button variant="ghost" size="sm" className="text-sm font-medium text-stone-900 uppercase tracking-wider hover:bg-stone-100 px-8 rounded-full h-11 border border-stone-200/50 hover:border-stone-400 transition-all">
        Refresh <ArrowRight className="ml-4 w-5 h-5" />
       </Button>
      </div>
      
      <motion.div 
       initial={{ opacity: 0, y: 30 }}
       animate={{ opacity: 1, y: 0 }}
       className="relative group overflow-hidden rounded-[4rem] border border-stone-200/50 bg-white p-16 md:p-24 transition-all duration-1000 hover:shadow-[0_60px_120px_-20px_rgba(0,0,0,0.1)]"
      >
       <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-stone-50 rounded-full blur-[120px] opacity-60 -mr-64 -mt-64 -z-10 group-hover:bg-stone-100/60 transition-colors duration-1000" />
       <div className="absolute top-12 right-12 text-xs font-mono font-medium text-stone-300 uppercase tracking-widest">
        REF_MATCH_2026_01
       </div>
       
       <div className="flex flex-col xl:flex-row gap-20 xl:gap-28">
        <div className="w-full xl:w-80 h-80 rounded-[3rem] overflow-hidden border border-stone-200/50 shadow-2xl shrink-0 group-hover:scale-[1.02] transition-transform duration-1000 relative">
         <img src="https://picsum.photos/seed/alex/800/800" alt="" className="w-full h-full object-cover" />
         <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        </div>
        <div className="flex-1 space-y-12">
         <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-8">
          <div className="space-y-5">
           <div className="flex items-center gap-6">
            <h4 className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900 tracking-tight text-left">Alex Rivera</h4>
            <div className="flex flex-col items-center">
             <span className="bg-stone-900 text-white text-xs font-medium uppercase tracking-wider px-6 py-2 rounded-full shadow-xl shadow-stone-900/20">
              98% Match
             </span>
            </div>
           </div>
           <p className="text-sm sm:text-base lg:text-lg text-stone-500 font-medium tracking-tight text-left">Full-stack Engineer & AI Specialist</p>
          </div>
          <div className="flex items-center gap-4">
           <Button variant="outline" size="icon" className="w-14 h-11 rounded-2xl border-stone-200 hover:bg-stone-50 transition-all hover:border-stone-400">
            <Bookmark className="w-6 h-6 text-stone-600" />
           </Button>
           <Button variant="outline" size="icon" className="w-14 h-11 rounded-2xl border-stone-200 hover:bg-stone-50 transition-all hover:border-stone-400">
            <Share2 className="w-6 h-6 text-stone-600" />
           </Button>
          </div>
         </div>
         
         <p className="text-xl text-stone-600 leading-relaxed max-w-3xl font-light italic font-serif text-left">
          "I'm looking to join an early-stage venture focused on sustainable tech. I bring 8+ years of experience in scaling distributed systems and a passion for building products that matter."
         </p>
         
         <div className="flex flex-wrap gap-12">
          <div className="flex items-center gap-4 text-sm font-medium text-stone-400 uppercase tracking-wider">
           <MapPin className="w-5 h-5 text-stone-300" /> New York, NY
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-stone-400 uppercase tracking-wider">
           <Briefcase className="w-5 h-5 text-stone-300" /> 3x Founder
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-stone-400 uppercase tracking-wider">
           <Activity className="w-5 h-5 text-emerald-500" /> Active Now
          </div>
         </div>
         
         <div className="flex flex-col sm:flex-row items-center gap-4 pt-6">
          <Button className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 rounded-[2rem] bg-stone-900 text-white font-semibold text-xs sm:text-sm hover:bg-stone-800 transition-all shadow-md hover:-translate-y-0.5">
           Connect with Alex
          </Button>
          <Button variant="ghost" className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 rounded-[2rem] text-stone-600 font-semibold text-xs sm:text-sm hover:bg-stone-100 hover:text-stone-900 transition-all border border-transparent hover:border-stone-200">
           View Profile
          </Button>
         </div>
        </div>
       </div>
      </motion.div>
     </section>

     {/* Matches Grid - Clean Utility Style */}
     <section className="space-y-12">
      <div className="flex items-center justify-between px-6">
       <div className="space-y-2 text-left">
        <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400">Recommendations</h3>
        <p className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900 tracking-tight">Curated for You</p>
       </div>
       <div className="flex items-center gap-5 px-5 py-2.5 bg-white rounded-full border border-stone-200/60 cursor-pointer hover:border-stone-900 transition-all shadow-sm">
        <span className="text-xs text-stone-500 font-medium uppercase tracking-wider">Sort by: Relevance</span>
        <ChevronDown className="w-5 h-5 text-stone-400" />
       </div>
      </div>
      
      <div className={cn(
       "grid gap-10",
       viewMode === "grid" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
      )}>
       {[
        { name: "Elena Kostic", role: "Product Manager", match: 94, photo: "https://picsum.photos/seed/elena/400/400", tags: ["Fintech", "UX", "Strategy"] },
        { name: "David Chen", role: "Growth Marketer", match: 91, photo: "https://picsum.photos/seed/david/400/400", tags: ["B2B", "SEO", "Ads"] },
        { name: "Sophia Wu", role: "Legal Counsel", match: 88, photo: "https://picsum.photos/seed/sophia/400/400", tags: ["IP", "Contracts", "VC"] },
        { name: "James Wilson", role: "Backend Architect", match: 85, photo: "https://picsum.photos/seed/james/400/400", tags: ["Go", "Kubernetes", "AWS"] },
       ].map((match, i) => (
        <motion.div 
         key={match.name}
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
         className="group p-12 rounded-[3rem] border border-stone-200/50 bg-white hover:border-stone-900 transition-all duration-700 cursor-pointer hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.06)]"
        >
         <div className="flex items-center gap-10">
          <div className="w-28 h-28 rounded-[2rem] overflow-hidden border border-stone-200/50 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-1000">
           <img src={match.photo} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 space-y-5 text-left">
           <div className="flex items-center justify-between">
            <h4 className="text-xl font-medium text-stone-900 group-hover:text-stone-600 transition-colors">{match.name}</h4>
            <span className="text-sm font-mono font-medium text-stone-400 uppercase tracking-widest">{match.match}% Match</span>
           </div>
           <p className="text-sm sm:text-base lg:text-lg text-stone-500 font-medium tracking-tight">{match.role}</p>
           <div className="flex flex-wrap gap-3 pt-2">
            {match.tags.map(tag => (
             <span key={tag} className="text-xs font-medium text-stone-400 uppercase tracking-wider bg-stone-50 px-4 py-2 rounded-full border border-stone-100 group-hover:border-stone-200 transition-colors">
              {tag}
             </span>
            ))}
           </div>
          </div>
          <div className="w-14 h-11 rounded-full border border-stone-200 flex items-center justify-center text-stone-300 group-hover:text-stone-900 group-hover:border-stone-900 transition-all duration-700 group-hover:translate-x-2">
           <ChevronRight className="w-8 h-8" />
          </div>
         </div>
        </motion.div>
       ))}
      </div>
      
      <div className="pt-16 text-center">
       <Button variant="outline" className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 rounded-[2rem] border-stone-200 text-stone-600 font-semibold text-xs sm:text-sm hover:bg-stone-50 hover:text-stone-900 transition-all hover:border-stone-400 shadow-sm">
        Load More Matches
       </Button>
      </div>
     </section>
    </div>

    {/* Right Column - Filters & Insights */}
    <div className="lg:col-span-4 space-y-24">
     {/* Match Insights - Hardware Style */}
     <section className="bg-white border border-stone-200 rounded-[3.5rem] p-16 space-y-16 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.04)] text-left relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-48 h-48 bg-stone-50/50 rounded-full -mr-24 -mt-24 blur-[100px] pointer-events-none group-hover:bg-stone-100/50 transition-colors duration-1000" />
      
      <div className="space-y-3 relative z-10">
       <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400">Match Insights</h3>
       <p className="text-xl font-medium text-stone-900 tracking-tight">System Analysis</p>
      </div>

      <div className="space-y-16 relative z-10">
       <div className="space-y-6">
        <div className="flex items-center justify-between">
         <p className="text-sm font-mono font-medium text-stone-900 uppercase tracking-wider">Ecosystem Fit</p>
         <p className="text-sm font-mono font-medium text-stone-900">84%</p>
        </div>
        <div className="h-3 bg-stone-100 rounded-full overflow-hidden border border-stone-200/50 p-0.5">
         <div className="h-full bg-stone-900 w-[84%] rounded-full transition-all duration-1000 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
         </div>
        </div>
        <p className="text-base text-stone-500 leading-relaxed font-light">
         Your profile aligns well with current ecosystem trends in <span className="text-stone-900 font-medium">AI and Sustainability</span>.
        </p>
       </div>
       
       <div className="space-y-6">
        <div className="flex items-center justify-between">
         <p className="text-sm font-mono font-medium text-stone-900 uppercase tracking-wider">Network Strength</p>
         <p className="text-sm font-mono font-medium text-stone-900">62%</p>
        </div>
        <div className="h-3 bg-stone-100 rounded-full overflow-hidden border border-stone-200/50 p-0.5">
         <div className="h-full bg-stone-900 w-[62%] rounded-full transition-all duration-1000 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
         </div>
        </div>
        <p className="text-base text-stone-500 leading-relaxed font-light">
         Connecting with <span className="text-stone-900 font-medium">more mentors</span> could significantly boost your visibility.
        </p>
       </div>
      </div>
     </section>

     {/* Quick Filters - Data Grid Style */}
     <section className="space-y-12 text-left">
      <div className="space-y-2 px-6">
       <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400">Quick Filters</h3>
       <p className="text-xl font-medium text-stone-900 tracking-tight">Refine Search</p>
      </div>
      <div className="space-y-0 border-t border-stone-200/60 rounded-[2.5rem] overflow-hidden border-x border-b">
       {[
        { label: "Available Now", count: 24 },
        { label: "Verified Only", count: 156 },
        { label: "Local (SF)", count: 42 },
        { label: "Past Collaborators", count: 8 },
       ].map((filter) => (
        <label key={filter.label} className="flex items-center justify-between p-8 border-b border-stone-200/60 bg-white cursor-pointer hover:bg-stone-50 transition-all group last:border-b-0">
         <div className="flex items-center gap-6">
          <div className="w-7 h-7 rounded-xl border border-stone-300 flex items-center justify-center bg-white group-hover:border-stone-900 transition-all duration-500 group-hover:scale-110">
           <div className="w-3.5 h-3.5 bg-stone-900 rounded-md opacity-0 group-hover:opacity-10 transition-opacity" />
          </div>
          <span className="text-base font-medium text-stone-700 group-hover:text-stone-900 transition-colors duration-500">{filter.label}</span>
         </div>
         <span className="text-sm font-mono font-medium text-stone-400 uppercase tracking-widest group-hover:text-stone-900 transition-colors duration-500">{filter.count}</span>
        </label>
       ))}
      </div>
     </section>

     {/* AI Tip Card - Atmospheric Style */}
     <section className="rounded-[3.5rem] bg-stone-900 p-16 text-center space-y-12 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-80 h-80 bg-stone-700/20 rounded-full -mr-40 -mt-40 blur-[100px] group-hover:bg-stone-600/30 transition-colors duration-1000" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.05] pointer-events-none" />
      
      <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-white/10 relative z-10 shadow-inner group-hover:scale-110 transition-transform duration-1000">
       <Sparkles className="w-12 h-12 text-white" />
      </div>
      <div className="space-y-6 relative z-10">
       <h4 className="text-xl sm:text-2xl xl:text-3xl font-medium text-white tracking-tight">AI Matching Tip</h4>
       <p className="text-base text-stone-400 leading-relaxed font-light max-w-[320px] mx-auto">
        Complete your <span className="text-white font-medium">"Venture Readiness"</span> assessment to unlock even more precise matches.
       </p>
      </div>
      <Button className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 rounded-[2rem] bg-white text-stone-900 font-semibold text-xs sm:text-sm hover:bg-stone-50 transition-all shadow-md relative z-10 hover:-translate-y-0.5">
       Go to Assessment
      </Button>
     </section>
    </div>
   </div>
  </PageContainer>
 );
}
