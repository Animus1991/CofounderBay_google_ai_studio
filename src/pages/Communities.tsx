import { useState, useEffect } from "react";
import { Globe, Search, Filter, SlidersHorizontal, ArrowRight, CheckCircle2, XCircle, Star, MessageSquare, Plus, Users, Sparkles, Zap, ShieldCheck, TrendingUp, LayoutGrid, List } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageContainer from "../components/layout/PageContainer";
import { User } from "../types";
import { cn } from "../lib/utils";

interface CommunitiesProps {
 user: User;
}

const CommunitiesSkeleton = () => (
 <PageContainer className="space-y-12 py-20">
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
   <div className="space-y-4">
    <div className="h-4 w-32 bg-stone-200 rounded-full animate-pulse"></div>
    <div className="h-16 w-96 bg-stone-200 rounded-2xl animate-pulse"></div>
    <div className="h-6 w-[500px] bg-stone-100 rounded-lg animate-pulse"></div>
   </div>
  </div>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
   {[1, 2, 3, 4, 5, 6].map(i => (
    <div key={i} className="h-[500px] bg-stone-100 rounded-[3rem] border border-stone-200 animate-pulse"></div>
   ))}
  </div>
 </PageContainer>
);

export default function Communities({ user }: CommunitiesProps) {
 const [communities, setCommunities] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState("");
 const [selectedTag, setSelectedTag] = useState("All");
 const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

 const industryTags = ["All", "SaaS", "FinTech", "AI", "HealthTech", "CleanTech", "EdTech", "Web3", "E-commerce"];

 useEffect(() => {
  const fetchCommunities = async () => {
   try {
    const res = await fetch("/api/communities");
    const data = await res.json();
    setCommunities(data);
   } catch (err) {
    console.error("Error fetching communities", err);
   } finally {
    // Artificial delay for premium feel
    setTimeout(() => setLoading(false), 800);
   }
  };
  fetchCommunities();
 }, []);

 if (loading) return <CommunitiesSkeleton />;

 const filteredCommunities = communities.filter(c => {
  const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
             c.description.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesTag = selectedTag === "All" || c.tags.includes(selectedTag) || c.category === selectedTag;
  return matchesSearch && matchesTag;
 });

 return (
  <PageContainer className="space-y-16 pb-32">
   {/* Editorial Header Section */}
   <header className="relative space-y-12 pt-12">
    <div className="space-y-6 max-w-4xl">
     <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full bg-stone-100 border border-stone-200">
      <Globe className="w-3 h-3 text-stone-500" />
      <span className="text-xs font-medium uppercase tracking-wider text-stone-500">Global Ecosystem</span>
     </div>
     <h1 className="text-xl md:text-2xl font-light tracking-tight leading-snug text-stone-900">
      Find Your <span className="font-serif italic text-stone-400">Strategic Hub</span>
     </h1>
     <p className="text-base sm:text-lg md:text-xl xl:text-2xl text-stone-500 font-light max-w-2xl leading-relaxed">
      Connect with specialized networks designed to accelerate your venture. From deep tech to social impact, find the community that speaks your language.
     </p>
    </div>
    
    <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-10 border-t border-stone-100">
     <div className="flex items-center gap-4 w-full md:w-auto">
      <div className="relative group flex-1 md:w-96">
       <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
       <input 
        type="text" 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search hubs..." 
        className="w-full bg-stone-50/50 border border-stone-200/60 rounded-2xl py-4.5 pl-14 pr-12 text-base text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-200/50 focus:border-stone-300 transition-all font-light"
       />
       {searchQuery && (
        <button 
         onClick={() => setSearchQuery("")}
         className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-900 transition-colors"
        >
         <XCircle className="w-5 h-5" />
        </button>
       )}
      </div>
      <Button className="h-11 px-8 bg-stone-900 text-white hover:bg-stone-800 rounded-2xl text-xs font-medium uppercase tracking-wider transition-all shadow-xl shadow-stone-900/10">
       <Plus className="w-5 h-5 mr-3" /> 
       Create Hub
      </Button>
     </div>

     <div className="flex items-center gap-12">
      <div className="text-right space-y-1">
       <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">Communities</p>
       <p className="text-xl font-medium text-stone-900">{communities.length}</p>
      </div>
      <div className="text-right space-y-1">
       <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">Active Members</p>
       <p className="text-xl font-medium text-stone-900">42.8k</p>
      </div>
     </div>
    </div>
   </header>

   {/* Industry Filter Tabs */}
   <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl py-6 border-y border-stone-100 -mx-4 px-4">
    <div className="flex items-center justify-between gap-8">
     <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide no-scrollbar">
      {industryTags.map((tag) => (
       <button
        key={tag}
        onClick={() => setSelectedTag(tag)}
        className={cn(
         "px-6 py-3 text-xs font-medium uppercase tracking-wider rounded-xl transition-all whitespace-nowrap border",
         selectedTag === tag 
          ? "bg-stone-900 text-white border-stone-900 shadow-xl shadow-stone-900/10" 
          : "text-stone-400 border-transparent hover:text-stone-900 hover:bg-stone-50"
        )}
       >
        {tag}
       </button>
      ))}
     </div>
     <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl border border-stone-200/50">
      <button 
       onClick={() => setViewMode('grid')}
       className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white text-stone-900 shadow-sm" : "text-stone-400 hover:text-stone-600")}
      >
       <LayoutGrid className="w-4 h-4" />
      </button>
      <button 
       onClick={() => setViewMode('list')}
       className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white text-stone-900 shadow-sm" : "text-stone-400 hover:text-stone-600")}
      >
       <List className="w-4 h-4" />
      </button>
     </div>
    </div>
   </div>

   {/* Communities Grid */}
   <div className={cn(
    "grid gap-10",
    viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
   )}>
    <AnimatePresence mode="popLayout">
     {filteredCommunities.length > 0 ? (
      filteredCommunities.map((community, index) => (
       <motion.div
        key={community.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.5, delay: index * 0.05 }}
       >
        <Card className={cn(
         "group relative overflow-hidden bg-white border border-stone-200/60 hover:border-stone-900 hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] transition-all duration-700 flex rounded-[3rem]",
         viewMode === 'grid' ? "flex-col h-full" : "flex-row items-center p-6 gap-10"
        )}>
         {/* Banner Image Area */}
         <div className={cn(
          "bg-stone-100 relative overflow-hidden rounded-[2.5rem] transition-all duration-700",
          viewMode === 'grid' ? "h-72 m-4" : "w-64 h-48 shrink-0"
         )}>
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/40 via-transparent to-transparent z-10 opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
          <img 
           src={`https://picsum.photos/seed/${community.id}/800/600`} 
           alt={community.title}
           className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
           referrerPolicy="no-referrer"
          />
          <div className="absolute top-6 right-6 z-20">
           <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-xl border border-white/20">
            <span className="text-xs font-medium text-stone-900 uppercase tracking-wider">{community.category}</span>
           </div>
          </div>
         </div>

         <div className={cn(
          "space-y-6 flex-1 flex flex-col",
          viewMode === 'grid' ? "p-10 pt-4" : "py-4 pr-10"
         )}>
          <div className="space-y-4">
           <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-stone-900 border border-stone-200/50 group-hover:bg-stone-900 group-hover:text-white transition-all duration-500">
              <Globe className="w-5 h-5" />
             </div>
             <div className="text-xs font-medium text-stone-400 uppercase tracking-widest">
              {community.membersCount || "1.2k"} Members
             </div>
            </div>
            <div className="flex items-center gap-2 text-emerald-500">
             <Zap className="w-3.5 h-3.5 fill-current" />
             <span className="text-xs font-medium uppercase tracking-widest">Active</span>
            </div>
           </div>
           <h3 className=" font-medium text-xl leading-tight text-stone-900 group-hover:text-black transition-colors">{community.title}</h3>
           <p className="text-base text-stone-500 leading-relaxed line-clamp-2 font-light">{community.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
           {community.tags.map((tag: string) => (
            <span key={tag} className="text-xs bg-stone-50 px-3 py-1.5 rounded-lg text-stone-500 font-medium uppercase tracking-widest border border-stone-100 group-hover:border-stone-200 transition-all">
             {tag}
            </span>
           ))}
          </div>

          <div className="mt-auto pt-6">
           <Button className="w-full h-16 rounded-2xl bg-stone-900 text-white hover:bg-stone-800 transition-all font-medium text-xs uppercase tracking-wider gap-3 group/btn shadow-xl shadow-stone-900/5">
            Join Community
            <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform duration-300" />
           </Button>
          </div>
         </div>
        </Card>
       </motion.div>
      ))
     ) : (
      <motion.div 
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       className="col-span-full py-40 flex flex-col items-center justify-center text-center space-y-10"
      >
       <div className="w-32 h-32 bg-stone-50 rounded-[3rem] flex items-center justify-center text-stone-200 border border-stone-100 shadow-inner">
        <Search className="w-12 h-12" />
       </div>
       <div className="space-y-4">
        <h3 className="text-2xl font-light tracking-tight text-stone-900">No hubs found</h3>
        <p className="text-lg text-stone-400 max-w-sm font-light leading-relaxed">
         We couldn't find any communities matching "{searchQuery}". Try adjusting your search or filters.
        </p>
       </div>
       <Button 
        variant="outline" 
        onClick={() => { setSearchQuery(""); setSelectedTag("All"); }}
        className="h-16 px-12 rounded-2xl text-xs font-medium uppercase tracking-wider border-stone-200 hover:bg-stone-50"
       >
        Clear all filters
       </Button>
      </motion.div>
     )}
    </AnimatePresence>
   </div>
  </PageContainer>
 );
}
