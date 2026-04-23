import { useState, useMemo } from "react";
import { 
 Users, 
 UserPlus, 
 Search, 
 Filter, 
 SlidersHorizontal, 
 ArrowRight, 
 CheckCircle2, 
 Clock, 
 TrendingUp, 
 Target, 
 BarChart3, 
 Plus, 
 ChevronRight, 
 MoreVertical, 
 Layers, 
 Lightbulb, 
 FileText, 
 Globe, 
 PieChart, 
 Zap, 
 Star, 
 AlertCircle, 
 Briefcase, 
 Heart, 
 MessageSquare, 
 ShieldCheck, 
 Award,
 Cpu,
 Fingerprint,
 Terminal,
 Activity,
 ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageContainer from "../components/layout/PageContainer";
import { User, Endorsement, UserRole } from "../types";
import { cn } from "../lib/utils";

interface NetworkProps {
 user: User;
}

export default function Network({ user }: NetworkProps) {
 const [activeTab, setActiveTab] = useState<'connections' | 'saved' | 'endorsements' | 'compare'>('connections');

 const mockConnections = [
  { id: "u1", fullName: "Sarah Chen", role: UserRole.MENTOR, industry: "FinTech", status: "Connected", location: "NYC" },
  { id: "u2", fullName: "Alex Rivera", role: UserRole.FOUNDER, industry: "AI", status: "Connected", location: "SF" },
  { id: "u3", fullName: "James Wilson", role: UserRole.ADVISOR, industry: "SaaS", status: "Pending", location: "London" },
  { id: "u4", fullName: "Elena Rodriguez", role: UserRole.CO_FOUNDER_CANDIDATE, industry: "CleanTech", status: "Connected", location: "Berlin" }
 ];

 const mockEndorsements: Endorsement[] = [
  { id: "e1", endorserId: "u1", recipientId: user.id, skillId: "Product Strategy", comment: "One of the most focused founders I've worked with.", createdAt: "2026-03-15" },
  { id: "e2", endorserId: "u2", recipientId: user.id, skillId: "Full-Stack Dev", comment: "Incredible technical depth and speed.", createdAt: "2026-03-20" }
 ];

 const systemMetadata = useMemo(() => ({
  nodeCount: "4.2k",
  syncStatus: "OPTIMAL",
  latency: "14ms",
  version: "v4.2.0"
 }), []);

 return (
  <PageContainer className="space-y-12 pb-20 bg-[#0A0A0A]">
   <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-10 relative overflow-hidden">
    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-[100px] pointer-events-none" />
    
    <div className="space-y-6 relative z-10">
     <div className="flex items-center gap-4">
      <div className="h-px w-12 bg-white/20"></div>
      <span className="text-xs font-medium uppercase tracking-wider text-stone-500">Ecosystem Management • {systemMetadata.syncStatus}</span>
     </div>
     <h2 className="text-2xl font-light tracking-tight text-white leading-none">
      My <span className="text-stone-600 italic serif">Network</span>
     </h2>
     <p className="text-stone-400 text-xl font-light max-w-2xl leading-relaxed">
      Manage your connections, endorsements, and saved profiles with <span className="text-white font-medium">algorithmic precision</span>.
     </p>
    </div>
    <div className="flex items-center gap-3 bg-white/5 p-2 rounded-[2rem] border border-white/10 backdrop-blur-2xl shadow-2xl relative z-10">
     {(['connections', 'saved', 'endorsements', 'compare'] as const).map((tab) => (
      <button
       key={tab}
       onClick={() => setActiveTab(tab)}
       className={cn(
        "px-8 py-3.5 text-xs font-medium uppercase tracking-wider rounded-[1.5rem] transition-all whitespace-nowrap",
        activeTab === tab 
         ? "bg-white text-stone-950 shadow-[0_10px_30px_-5px_rgba(255,255,255,0.2)]" 
         : "text-stone-500 hover:text-white hover:bg-white/5"
       )}
      >
       {tab}
      </button>
     ))}
    </div>
   </div>

   {activeTab === 'connections' && (
    <div className="space-y-12">
     <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 px-4">
      <div className="space-y-2">
       <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <h3 className="text-xl font-medium tracking-tight text-white">Active Connections</h3>
       </div>
       <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">Node Registry • {mockConnections.length} Verified Entities</p>
      </div>
      <div className="flex items-center gap-4">
       <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500 group-focus-within:text-white transition-colors" />
        <input 
         type="text" 
         placeholder="Search network..." 
         className="bg-white/5 border border-white/10 rounded-[2rem] py-4 pl-14 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-white/10 focus:bg-white/10 transition-all w-full md:w-[350px] font-light text-white placeholder:text-stone-600"
        />
       </div>
       <Button variant="outline" className="h-11 px-8 rounded-[2rem] border-white/10 hover:bg-white/5 text-xs font-medium uppercase tracking-wider text-stone-400 hover:text-white transition-all">
        <SlidersHorizontal className="w-4 h-4 mr-3" /> Filters
       </Button>
      </div>
     </div>

     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {mockConnections.map((conn, i) => (
       <motion.div
        key={conn.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
       >
        <Card className="group hover:shadow-[0_60px_120px_-20px_rgba(0,0,0,0.5)] hover:-translate-y-2 transition-all duration-1000 border-white/5 hover:border-white/20 p-10 rounded-[3.5rem] bg-stone-950 relative overflow-hidden">
         {/* Hardware Decorative Elements */}
         <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity duration-1000">
          <Fingerprint className="w-32 h-32 -mr-12 -mt-12 text-white" />
         </div>
         <div className="absolute top-8 right-8 text-xs font-mono font-medium text-stone-700 uppercase tracking-widest">
          ENTITY_ID: {conn.id.toUpperCase()}
         </div>
         
         <div className="flex flex-col items-center text-center space-y-8 relative z-10">
          <div className="relative">
           <div className="w-32 h-32 rounded-[2.5rem] bg-stone-900 overflow-hidden border-4 border-stone-800 shadow-2xl group-hover:scale-105 transition-transform duration-1000">
            <img src={`https://picsum.photos/seed/${conn.id}/300/300`} alt={conn.fullName} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000" referrerPolicy="no-referrer" />
           </div>
           <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-stone-950 border border-white/10 flex items-center justify-center shadow-xl">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
           </div>
          </div>
          
          <div className="space-y-3">
           <h4 className=" font-medium text-xl tracking-tight text-white group-hover:text-white transition-colors">{conn.fullName}</h4>
           <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs font-medium text-stone-500 uppercase tracking-widest group-hover:text-stone-300 transition-colors">{conn.role}</span>
            <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs font-medium text-stone-500 uppercase tracking-widest group-hover:text-stone-300 transition-colors">{conn.industry}</span>
           </div>
          </div>
          
          <div className="flex items-center gap-3 w-full pt-4">
           <Button className="flex-1 h-11 rounded-[1.5rem] bg-white text-stone-950 hover:bg-stone-200 text-xs font-medium uppercase tracking-wider shadow-xl shadow-white/5 transition-all">
            Message
           </Button>
           <Button variant="outline" size="icon" className="h-11 w-14 rounded-[1.5rem] border-white/10 hover:bg-white/5 text-stone-500 hover:text-white transition-all">
            <ChevronRight className="w-6 h-6" />
           </Button>
          </div>
         </div>
         
         <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
           <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]", conn.status === "Connected" ? "bg-emerald-500 shadow-emerald-500/50" : "bg-amber-500 shadow-amber-500/50")}></div>
           <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">{conn.status}</span>
          </div>
          <div className="flex items-center gap-2 text-stone-600 group-hover:text-stone-400 transition-colors">
           <Globe className="w-3.5 h-3.5" />
           <span className="text-xs font-mono font-medium tracking-tighter">{conn.location}</span>
          </div>
         </div>
        </Card>
       </motion.div>
      ))}
     </div>
    </div>
   )}

   {activeTab === 'endorsements' && (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
     <div className="lg:col-span-7 space-y-12">
      <div className="space-y-4">
       <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
         <Award className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-xl font-medium tracking-tight text-white">Received <span className="text-stone-600 italic serif">Endorsements</span></h3>
       </div>
       <p className="text-stone-400 text-xl font-light leading-relaxed">What your network says about your professional capabilities.</p>
      </div>
      <div className="space-y-10">
       {mockEndorsements.map((e, i) => (
        <motion.div
         key={e.id}
         initial={{ opacity: 0, x: -30 }}
         animate={{ opacity: 1, x: 0 }}
         transition={{ delay: i * 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
         <Card className="p-12 rounded-[4rem] border-white/5 shadow-2xl bg-stone-950 relative group hover:border-white/20 transition-all duration-1000 overflow-hidden">
          <div className="absolute top-12 right-12 opacity-5 group-hover:opacity-40 transition-opacity duration-1000">
           <Award className="w-16 h-16 text-amber-500" />
          </div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          
          <div className="flex flex-col space-y-10">
           <div className="flex items-center gap-8">
            <div className="w-20 h-20 rounded-[2rem] bg-stone-900 overflow-hidden border-2 border-white/10 shadow-2xl group-hover:scale-105 transition-transform duration-1000">
             <img src={`https://picsum.photos/seed/${e.endorserId}/200/200`} alt="Endorser" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000" referrerPolicy="no-referrer" />
            </div>
            <div className="space-y-2">
             <p className="text-xl sm:text-2xl xl:text-3xl font-medium text-white">Endorsed for <span className="text-stone-500 italic serif">{e.skillId}</span></p>
             <p className="text-xs font-mono font-medium text-stone-600 uppercase tracking-wider">
              by {e.endorserId === 'u1' ? 'Sarah Chen' : 'Alex Rivera'} • {new Date(e.createdAt).toLocaleDateString()}
             </p>
            </div>
           </div>
           <div className="relative">
            <span className="absolute -top-8 -left-6 text-2xl text-white/5 font-serif pointer-events-none">"</span>
            <p className="text-2xl text-stone-400 italic serif leading-relaxed relative z-10 pl-6 group-hover:text-stone-300 transition-colors duration-1000">
             {e.comment}
            </p>
           </div>
          </div>
         </Card>
        </motion.div>
       ))}
      </div>
      <Button variant="outline" className="w-full h-20 rounded-[2.5rem] border-dashed border-white/10 hover:border-white/30 hover:bg-white/5 text-xs font-medium uppercase tracking-wider text-stone-500 hover:text-white transition-all">
       Request New Endorsement
      </Button>
     </div>

     <div className="lg:col-span-5 space-y-12">
      <Card className="p-12 rounded-[4rem] border-white/5 shadow-2xl bg-stone-950 relative overflow-hidden group">
       <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:1.5rem_1.5rem]" />
       
       <div className="space-y-12 relative z-10">
        <div className="space-y-3">
         <h3 className="text-xl font-medium tracking-tight text-white">Skill Distribution</h3>
         <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">Algorithmic Recognition Matrix</p>
        </div>
        <div className="space-y-12">
         {[
          { skill: "Product Strategy", count: 12, color: "bg-white" },
          { skill: "Full-Stack Development", count: 8, color: "bg-stone-400" },
          { skill: "UI/UX Design", count: 5, color: "bg-stone-600" },
          { skill: "Growth Marketing", count: 3, color: "bg-stone-800" }
         ].map((item, i) => (
          <div key={i} className="space-y-5 group/skill cursor-pointer">
           <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider group-hover/skill:text-white transition-colors">{item.skill}</span>
            <span className="text-xs font-mono font-medium text-stone-600 uppercase tracking-widest">{item.count} Endorsements</span>
           </div>
           <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-1">
            <motion.div 
             initial={{ width: 0 }}
             animate={{ width: `${(item.count / 12) * 100}%` }}
             transition={{ duration: 1.5, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
             className={cn("h-full rounded-full shadow-lg relative overflow-hidden", item.color)} 
            >
             <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-[shimmer_3s_infinite]" />
            </motion.div>
           </div>
          </div>
         ))}
        </div>
       </div>
      </Card>

      <Card className="bg-stone-900 border-white/5 p-12 rounded-[4rem] shadow-2xl relative overflow-hidden group">
       <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-20 transition-opacity duration-1000">
        <Award className="w-48 h-48 -mr-20 -mt-20 text-amber-500" />
       </div>
       <div className="space-y-10 relative z-10">
        <div className="flex items-center gap-4 text-amber-400">
         <Star className="w-8 h-8 fill-current" />
         <h4 className="font-medium text-xs uppercase tracking-wider">Expert Badge • Verified</h4>
        </div>
        <p className="text-2xl text-stone-400 leading-relaxed font-light">
         You are in the <span className="text-white font-medium">top 5% of founders</span> endorsed for Product Strategy this month.
        </p>
        <Button className="w-full h-20 rounded-[2rem] bg-white text-stone-950 hover:bg-stone-200 transition-all font-medium text-xs uppercase tracking-wider shadow-xl shadow-white/5">
         Share Achievement
        </Button>
       </div>
      </Card>
     </div>
    </div>
   )}

   {activeTab === 'compare' && (
    <motion.div
     initial={{ opacity: 0, scale: 0.98 }}
     animate={{ opacity: 1, scale: 1 }}
     transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
     <Card className="p-24 text-center space-y-12 rounded-[5rem] border-white/5 shadow-2xl bg-stone-950 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02] pointer-events-none" />
      
      <div className="w-40 h-40 bg-white/5 rounded-[3.5rem] flex items-center justify-center mx-auto text-stone-700 border border-white/10 shadow-inner group relative overflow-hidden">
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
       <BarChart3 className="w-20 h-20 relative z-10" />
      </div>
      <div className="max-w-3xl mx-auto space-y-6">
       <h3 className="text-2xl font-light tracking-tight text-white">Compare <span className="text-stone-600 italic serif">Profiles</span></h3>
       <p className="text-stone-400 text-xl font-light leading-relaxed">
        Select multiple profiles from your network to compare their skills, experience, and compatibility side-by-side using our <span className="text-white font-medium">proprietary matching algorithm</span>.
       </p>
      </div>
      <div className="flex items-center justify-center gap-10 pt-12">
       {[1, 2, 3].map((i) => (
        <div key={i} className="w-32 h-32 rounded-[3rem] border-2 border-dashed border-white/10 flex items-center justify-center text-stone-700 hover:border-white/30 hover:text-white hover:bg-white/5 transition-all cursor-pointer group">
         <Plus className="w-10 h-10 group-hover:rotate-90 transition-transform duration-700" />
        </div>
       ))}
      </div>
      <div className="pt-12">
       <Button className="h-20 px-16 rounded-[2.5rem] bg-white text-stone-950 hover:bg-stone-200 text-sm font-medium uppercase tracking-wider shadow-[0_20px_50px_-10px_rgba(255,255,255,0.1)] transition-all hover:-translate-y-2">
        Initialize Comparison Engine
       </Button>
      </div>
     </Card>
    </motion.div>
   )}
  </PageContainer>
 );
}
