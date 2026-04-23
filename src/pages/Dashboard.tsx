import { useState, useEffect, useMemo } from "react";
import { 
 Zap, 
 Users, 
 Trophy, 
 ArrowRight, 
 BarChart3, 
 Rocket, 
 Globe, 
 Target, 
 ShieldCheck, 
 Clock, 
 Briefcase, 
 DollarSign, 
 Activity, 
 ChevronRight,
 Sparkles,
 Share2,
 TrendingUp,
 ShieldAlert,
 Loader2,
 CheckCircle2,
 LayoutGrid,
 ExternalLink,
 ArrowUpRight,
 Cpu,
 Fingerprint,
 Network as NetworkIcon,
 Layers,
 Terminal,
 Database
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageContainer from "../components/layout/PageContainer";
import { User } from "../types";
import { cn } from "../lib/utils";
import { AIService } from "../services/aiService";

interface DashboardProps {
 user: User;
}

interface AIInsight {
 title: string;
 description: string;
 type: 'opportunity' | 'warning' | 'tip';
 icon: string;
}

const IconMap: Record<string, any> = {
 Zap,
 Target,
 Users,
 TrendingUp,
 ShieldAlert,
 Globe,
 Rocket,
 Activity
};

export default function Dashboard({ user }: DashboardProps) {
 const [insights, setInsights] = useState<AIInsight[]>([]);
 const [loadingInsights, setLoadingInsights] = useState(true);

 const ecosystemStatus = {
  activeFounders: "2,482",
  openRoles: "156",
  totalFunding: "$45.2M",
  successRate: "12.4%",
  readinessScore: 78,
  openVentures: 42,
  successfulMatches: 128
 };

 const milestones = [
  { id: '1', title: "Finalize MVP Features", dueDate: "Oct 15", status: 'in-progress', progress: 65 },
  { id: '2', title: "Seed Round Pitch Deck", dueDate: "Oct 22", status: 'pending', progress: 0 },
  { id: '3', title: "User Testing Phase 1", dueDate: "Nov 05", status: 'pending', progress: 0 },
  { id: '4', title: "Market Research", dueDate: "Sep 30", status: 'completed', progress: 100 },
 ];

 useEffect(() => {
  const fetchInsights = async () => {
   try {
    const data = await AIService.getDashboardInsights(user, ecosystemStatus);
    setInsights(data);
   } catch (error) {
    console.error("Error fetching insights:", error);
   } finally {
    setLoadingInsights(false);
   }
  };

  fetchInsights();
 }, [user]);

 const systemStatus = useMemo(() => ({
  latency: "12ms",
  uptime: "99.99%",
  version: "v4.2.0-stable",
  region: "EU-WEST-1"
 }), []);

 return (
  <PageContainer className="space-y-12 pb-20">
   {/* Hero Section - Refined Editorial Style */}
   <section className="relative overflow-hidden rounded-3xl bg-stone-900 border border-white/5 px-8 py-16 md:px-16 md:py-20 shadow-xl">
    {/* Subtle Background Elements */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.02)_0%,transparent_60%)] pointer-events-none" />
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
    
    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-12">
     <div className="max-w-3xl space-y-8">
      <motion.div 
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       className="inline-flex items-center gap-3 rounded-full bg-white/5 px-4 py-1.5 text-xs font-medium text-stone-400 uppercase tracking-widest border border-white/10 backdrop-blur-xl"
      >
       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
       Intelligence Briefing • {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </motion.div>
      <h2 className="text-2xl font-light tracking-tight leading-snug text-white">
       Build your <span className="font-serif italic text-stone-500">vision</span> <br className="hidden md:block" /> with <span className="font-medium">absolute</span> clarity.
      </h2>
      <p className="text-lg text-stone-400 max-w-xl leading-relaxed font-light">
       Your ecosystem is evolving. We've analyzed <span className="text-white font-medium">12 new opportunities</span> that align with your current venture trajectory.
      </p>
      <div className="flex flex-wrap gap-4 pt-2">
       <Button 
        size="md"
        className="rounded-full px-8 bg-white text-stone-950 font-medium text-xs uppercase tracking-wider hover:bg-stone-200 transition-all shadow-lg hover:-translate-y-0.5"
        onClick={() => window.location.href = '/workspace'}
       >
        Continue Building
       </Button>
       <Button 
        variant="outline" 
        size="md"
        className="rounded-full px-8 border-white/10 text-stone-300 font-medium text-xs uppercase tracking-wider hover:bg-white/5 hover:border-white/30 transition-all hover:-translate-y-0.5"
        onClick={() => window.location.href = '/discovery'}
       >
        Explore Network
       </Button>
      </div>
     </div>
     
     <div className="flex flex-col items-center lg:items-end gap-6 sm:gap-8">
      <div className="text-center lg:text-right space-y-6">
       <div className="space-y-1">
        <p className="text-xs font-medium text-stone-500 uppercase tracking-widest">Venture Status</p>
        <div className="h-px w-12 bg-white/10 ml-auto hidden lg:block" />
       </div>
       <div className="flex items-center gap-6 sm:gap-12">
        <div className="flex flex-col items-center lg:items-end space-y-1">
         <span className="text-xl font-medium text-white tracking-tight">1,240</span>
         <span className="text-xs font-medium text-stone-500 uppercase tracking-widest">Ecosystem Points</span>
        </div>
        <div className="w-px h-12 bg-white/10" />
        <div className="flex flex-col items-center lg:items-end space-y-1">
         <span className="text-xl font-medium text-white tracking-tight">Lvl 4</span>
         <span className="text-xs font-medium text-stone-500 uppercase tracking-widest">Pioneer Tier</span>
        </div>
       </div>
      </div>
      <div className="w-full lg:w-72 h-3 bg-white/5 rounded-full overflow-hidden shadow-inner p-0.5 border border-white/10 relative">
       <motion.div 
        initial={{ width: 0 }}
        animate={{ width: '65%' }}
        transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
        className="h-full bg-white rounded-full shadow-lg shadow-white/10 relative overflow-hidden"
       />
      </div>
     </div>
    </div>
   </section>

   {/* AI Insights Section - Refined Hardware Style */}
   <section className="space-y-8">
    <div className="flex items-center justify-between px-4">
     <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-stone-900 flex items-center justify-center border border-white/10">
       <Cpu className="w-6 h-6 text-white" />
      </div>
      <div className="space-y-0.5">
       <h3 className="text-xl font-medium text-white tracking-tight">Strategic Insights</h3>
       <p className="text-xs text-stone-500 font-medium uppercase tracking-widest">Neural processing active • {systemStatus.version}</p>
      </div>
     </div>
     <Button 
      variant="ghost" 
      size="sm" 
      className="text-xs font-medium text-stone-500 hover:text-white hover:bg-white/5 uppercase tracking-widest rounded-full px-6 h-10 border border-white/5 hover:border-white/20 transition-all"
      onClick={() => {
       setLoadingInsights(true);
       const fetchInsights = async () => {
        try {
         const data = await AIService.getDashboardInsights(user, ecosystemStatus);
         setInsights(data);
        } catch (error) {
         console.error("Error fetching insights:", error);
        } finally {
         setLoadingInsights(false);
        }
       };
       fetchInsights();
      }}
     >
      Refresh Analysis
     </Button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
     {loadingInsights ? (
      Array(3).fill(0).map((_, i) => (
       <div key={i} className="bg-stone-900/50 border border-white/5 rounded-[2rem] sm:rounded-3xl p-6 sm:p-8 animate-pulse space-y-6">
        <div className="w-12 h-12 bg-white/5 rounded-2xl" />
        <div className="space-y-4">
         <div className="h-6 bg-white/5 rounded-lg w-3/4" />
         <div className="h-4 bg-white/5 rounded-lg w-full" />
         <div className="h-4 bg-white/5 rounded-lg w-5/6" />
        </div>
       </div>
      ))
     ) : (
      <AnimatePresence mode="popLayout">
       {insights.map((insight, i) => {
        const Icon = IconMap[insight.icon] || Zap;
        return (
         <motion.div
          key={insight.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="bg-stone-900/50 border border-white/5 rounded-[2rem] sm:rounded-3xl p-6 sm:p-8 group hover:border-white/20 transition-all duration-500 relative overflow-hidden flex flex-col h-full"
         >
          <div className="absolute top-4 right-4 text-[8px] font-mono font-medium text-stone-600 uppercase tracking-widest opacity-40">
           ANALYSIS_0{i + 1}
          </div>
          
          <div className={cn(
           "w-12 h-12 rounded-2xl flex items-center justify-center mb-8 transition-all group-hover:scale-105 duration-500 shadow-sm relative z-10 border border-white/5",
           insight.type === 'opportunity' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
           insight.type === 'warning' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
           "bg-blue-500/10 text-blue-400 border-blue-500/20"
          )}>
           <Icon className="w-6 h-6" />
          </div>
          <div className="space-y-3 relative z-10 flex-1">
           <h4 className="text-base font-medium text-white leading-tight">
            {insight.title}
           </h4>
           <p className="text-sm text-stone-400 leading-relaxed font-light">
            {insight.description}
           </p>
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
           <span className={cn(
            "text-xs font-medium uppercase tracking-widest px-3 py-1.5 rounded-full border",
            insight.type === 'opportunity' ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/10" :
            insight.type === 'warning' ? "bg-amber-500/5 text-amber-400 border-amber-500/10" :
            "bg-blue-500/5 text-blue-400 border-blue-500/10"
           )}>
            {insight.type}
           </span>
           <Button variant="ghost" size="sm" className="h-8 px-4 text-xs font-medium text-stone-500 hover:text-white hover:bg-white/5 rounded-full group-hover:translate-x-1 transition-all duration-300">
            Explore <ArrowUpRight className="ml-2 w-4 h-4" />
           </Button>
          </div>
         </motion.div>
        );
       })}
      </AnimatePresence>
     )}
    </div>
   </section>

   {/* Main Content Grid */}
   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
    {/* Left Column: Readiness & Milestones */}
    <div className="lg:col-span-2 space-y-12">
     {/* Venture Readiness Score - Refined Mission Control */}
     <section className="bg-stone-900/50 rounded-3xl p-10 text-white relative overflow-hidden border border-white/5">
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-[100px]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:2rem_2rem]" />
      
      <div className="relative z-10 space-y-12">
       <div className="flex items-center justify-between">
        <div className="space-y-2">
         <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
           <Target className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-medium tracking-tight">Venture Readiness</h3>
         </div>
         <p className="text-xs text-stone-500 font-medium uppercase tracking-widest">Institutional grade assessment • System v2.0</p>
        </div>
        <div className="px-6 py-3 bg-white/5 rounded-full border border-white/10 backdrop-blur-2xl flex items-center gap-3">
         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
         <span className="text-xs font-medium text-stone-300 tracking-widest uppercase">Top 5% Ecosystem</span>
        </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-12 items-center">
        <div className="flex flex-col items-center justify-center p-10 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-xl relative group">
         <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
           <circle
            cx="96"
            cy="96"
            r="88"
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            className="text-white/5"
           />
           <motion.circle
            cx="96"
            cy="96"
            r="88"
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={2 * Math.PI * 88}
            initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - ecosystemStatus.readinessScore / 100) }}
            transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
            className="text-white"
            strokeLinecap="round"
           />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
           <span className="text-xl font-medium tracking-tight leading-none">{ecosystemStatus.readinessScore}</span>
           <span className="text-xs font-medium text-stone-500 uppercase tracking-widest mt-2">Score</span>
          </div>
         </div>
        </div>

        <div className="space-y-8">
         {[
          { label: 'Technical Maturity', value: 92, color: 'bg-white', icon: Cpu },
          { label: 'Market Alignment', value: 85, color: 'bg-stone-400', icon: Globe },
          { label: 'Team Synergy', value: 78, color: 'bg-stone-600', icon: Users }
         ].map((metric) => (
          <div key={metric.label} className="space-y-3">
           <div className="flex justify-between text-xs font-medium uppercase tracking-widest text-stone-400">
            <div className="flex items-center gap-2">
             <metric.icon className="w-3.5 h-3.5" />
             <span>{metric.label}</span>
            </div>
            <span className="text-white">{metric.value}%</span>
           </div>
           <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <motion.div
             initial={{ width: 0 }}
             animate={{ width: `${metric.value}%` }}
             transition={{ duration: 2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
             className={cn("h-full rounded-full shadow-lg", metric.color)}
            />
           </div>
          </div>
         ))}
        </div>
       </div>
      </div>
     </section>

     {/* Active Milestones - Systematic Data Grid */}
     <section className="space-y-8">
      <div className="flex items-center justify-between px-4">
       <div className="space-y-1">
        <h3 className="text-xl font-medium text-white tracking-tight">Active Milestones</h3>
        <p className="text-xs text-stone-500 font-medium uppercase tracking-widest">Strategic roadmap • Q1 2026</p>
       </div>
       <Button variant="outline" size="sm" className="rounded-full border-white/10 text-xs font-medium uppercase tracking-widest px-8 h-10 hover:bg-white/5 hover:border-white/30 transition-all text-stone-400 hover:text-white">
        View Roadmap
       </Button>
      </div>

      <div className="space-y-4">
       {milestones.map((milestone, i) => (
        <motion.div
         key={milestone.id}
         initial={{ opacity: 0, x: -20 }}
         animate={{ opacity: 1, x: 0 }}
         transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
         className="group bg-stone-900/50 border border-white/5 rounded-2xl p-6 flex items-center gap-6 hover:border-white/20 transition-all duration-500"
        >
         <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-105 shadow-sm relative overflow-hidden border border-white/5",
          milestone.status === 'completed' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
          milestone.status === 'in-progress' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
          "bg-stone-800 text-stone-500 border-stone-700"
         )}>
          {milestone.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : 
           milestone.status === 'in-progress' ? <Zap className="w-6 h-6 animate-pulse" /> : 
           <Clock className="w-6 h-6" />}
         </div>
         <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center justify-between">
           <div className="space-y-0.5">
            <h4 className="text-base font-medium text-white truncate">
             {milestone.title}
            </h4>
            <p className="text-[8px] font-mono font-medium text-stone-600 uppercase tracking-widest">ID: MS-00{milestone.id}</p>
           </div>
           <span className="text-xs font-medium text-stone-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-lg border border-white/5">
            {milestone.dueDate}
           </span>
          </div>
          <div className="flex items-center gap-6">
           <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
            <motion.div
             initial={{ width: 0 }}
             animate={{ width: `${milestone.progress}%` }}
             transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
             className={cn(
              "h-full rounded-full shadow-sm",
              milestone.status === 'completed' ? "bg-emerald-500" :
              milestone.status === 'in-progress' ? "bg-blue-500" :
              "bg-stone-700"
             )}
            />
           </div>
           <span className="text-sm font-medium text-stone-400 tabular-nums">{milestone.progress}%</span>
          </div>
         </div>
         <ArrowUpRight className="w-5 h-5 text-stone-700 group-hover:text-white transition-all duration-500" />
        </motion.div>
       ))}
      </div>
     </section>
    </div>

    {/* Right Column: Ecosystem Pulse & Activity */}
    <div className="space-y-12">
     {/* Ecosystem Pulse - Refined Hardware Widget */}
     <section className="bg-stone-900/50 border border-white/5 rounded-3xl p-10 space-y-10 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-[80px] pointer-events-none" />
      
      <div className="space-y-1.5 relative z-10">
       <h3 className="text-lg font-medium text-white tracking-tight">Ecosystem Pulse</h3>
       <p className="text-xs text-stone-500 font-medium uppercase tracking-widest">Network activity • LIVE</p>
      </div>

      <div className="space-y-8 relative z-10">
       {[
        { label: 'Active Founders', value: ecosystemStatus.activeFounders, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Open Ventures', value: ecosystemStatus.openVentures, icon: Rocket, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: 'Successful Matches', value: ecosystemStatus.successfulMatches, icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/10' }
       ].map((stat) => (
        <div key={stat.label} className="flex items-center gap-6 group/stat">
         <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover/stat:scale-105 shadow-sm relative overflow-hidden border border-white/5", stat.bg, stat.color)}>
          <stat.icon className="w-6 h-6 relative z-10" />
         </div>
         <div className="space-y-1">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-widest">{stat.label}</p>
          <p className="text-xl sm:text-2xl xl:text-3xl font-medium text-white tabular-nums tracking-tight leading-none">{stat.value.toLocaleString()}</p>
         </div>
        </div>
       ))}
      </div>

      <div className="pt-8 border-t border-white/5 relative z-10">
       <Button className="w-full bg-white hover:bg-stone-200 text-stone-950 rounded-full h-10 text-xs font-medium uppercase tracking-wider transition-all hover:-translate-y-1">
        Explore Network
       </Button>
      </div>
     </section>

     {/* Quick Actions - Refined Brutalist Style */}
     <section className="bg-stone-900/50 rounded-3xl p-10 space-y-8 border border-white/5 relative overflow-hidden">
      <div className="space-y-1.5 relative z-10">
       <h3 className="text-lg font-medium text-white tracking-tight">Quick Actions</h3>
       <p className="text-xs text-stone-500 font-medium uppercase tracking-widest">Accelerate your journey</p>
      </div>
      <div className="grid grid-cols-2 gap-4 relative z-10">
       {[
        { label: 'Find Partner', icon: Users },
        { label: 'Post Venture', icon: Rocket },
        { label: 'AI Review', icon: Sparkles },
        { label: 'Get Funded', icon: Target }
       ].map((action) => (
        <button key={action.label} className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-white/20 transition-all duration-300 group relative overflow-hidden">
         <action.icon className="w-6 h-6 text-stone-600 group-hover:text-white mb-4 transition-all duration-300 group-hover:scale-110 relative z-10" />
         <span className="text-xs font-medium text-stone-500 group-hover:text-white uppercase tracking-widest text-center leading-tight relative z-10">{action.label}</span>
        </button>
       ))}
      </div>
     </section>
    </div>
   </div>
  </PageContainer>
 );
}
