import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
 TrendingUp, Activity, Award, Star, 
 ChevronRight, Calendar, Users, Target, 
 BarChart3, PieChart, Zap, Rocket,
 ArrowUpRight, ArrowDownRight, Info,
 Cpu,
 Globe,
 Shield
} from "lucide-react";
import { 
 LineChart, Line, XAxis, YAxis, CartesianGrid, 
 Tooltip, ResponsiveContainer, AreaChart, Area,
 BarChart, Bar
} from 'recharts';
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { cn } from "../lib/utils";
import { User } from "../types";

interface InsightsProps {
 user: User;
}

const readinessData = [
 { name: 'Jan', score: 45 },
 { name: 'Feb', score: 52 },
 { name: 'Mar', score: 48 },
 { name: 'Apr', score: 61 },
 { name: 'May', score: 58 },
 { name: 'Jun', score: 72 },
 { name: 'Jul', score: 85 },
];

const activityData = [
 { name: 'Mon', connections: 4, messages: 12, views: 24 },
 { name: 'Tue', connections: 2, messages: 8, views: 18 },
 { name: 'Wed', connections: 6, messages: 15, views: 32 },
 { name: 'Thu', connections: 3, messages: 10, views: 28 },
 { name: 'Fri', connections: 5, messages: 20, views: 45 },
 { name: 'Sat', connections: 1, messages: 5, views: 12 },
 { name: 'Sun', connections: 2, messages: 7, views: 15 },
];

export default function Insights({ user }: InsightsProps) {
 const [activeRange, setActiveRange] = useState('7D');

 return (
  <div className="space-y-12 max-w-7xl mx-auto pb-24">
   {/* Header Section - Editorial Style */}
   <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-stone-200/60 pb-12 overflow-hidden group">
    <div className="absolute -top-24 -left-24 w-80 h-80 bg-stone-100 rounded-full blur-[100px] opacity-60 group-hover:opacity-80 transition-opacity duration-1000" />
    
    <div className="relative space-y-8">
     <div className="flex items-center gap-6">
      <div className="h-px w-16 bg-stone-900"></div>
      <div className="flex items-center gap-3">
       <span className="text-xs font-mono font-medium uppercase tracking-wider text-stone-400">System Intelligence</span>
       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </div>
     </div>
     <div className="space-y-4">
      <h2 className="text-xl sm:text-2xl xl:text-3xl font-medium tracking-tighter text-stone-900 leading-snug">
       Analytics & <br />
       <span className="text-stone-300 italic serif font-light">Insights</span>
      </h2>
     </div>
     <div className="flex flex-col md:flex-row md:items-center gap-8">
      <p className="text-stone-500 text-lg font-light max-w-xl leading-relaxed">
       Harness the power of data to track your startup's trajectory, network growth, and ecosystem influence with surgical precision.
      </p>
      <div className="h-12 w-px bg-stone-100 hidden md:block" />
      <div className="flex items-center gap-4">
       <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
        <Globe className="w-5 h-5 text-stone-400" />
       </div>
       <div className="space-y-0.5">
        <p className="text-xs font-mono font-medium text-stone-400 uppercase tracking-widest">Global Rank</p>
        <p className="text-sm font-medium text-stone-900">TOP 2.4%</p>
       </div>
      </div>
     </div>
    </div>

    <div className="relative flex items-center gap-2 bg-white/50 backdrop-blur-md p-2 rounded-[2rem] border border-stone-200/60 shadow-2xl shadow-stone-900/5">
     {['24H', '7D', '30D', 'ALL'].map((range) => (
      <button
       key={range}
       onClick={() => setActiveRange(range)}
       className={cn(
        "px-5 py-2.5 text-xs font-mono font-medium uppercase tracking-wider rounded-2xl transition-all duration-500",
        activeRange === range 
         ? "bg-stone-900 text-white shadow-2xl shadow-stone-900/40 scale-[1.05]" 
         : "text-stone-400 hover:text-stone-900 hover:bg-stone-50"
       )}
      >
       {range}
      </button>
     ))}
    </div>
   </div>

   {/* Top Stats Grid - Hardware/Specialist Tool Style */}
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
    {[
     { label: "Readiness Score", value: "85", change: "+12%", icon: Target, color: "text-amber-400", bg: "bg-stone-900" },
     { label: "Profile Views", value: "1,240", change: "+24%", icon: Users, color: "text-blue-400", bg: "bg-stone-900" },
     { label: "Connections", value: "48", change: "+8%", icon: Zap, color: "text-purple-400", bg: "bg-stone-900" },
     { label: "Activity Score", value: "92", change: "+5%", icon: TrendingUp, color: "text-emerald-400", bg: "bg-stone-900" },
    ].map((stat, i) => (
     <Card key={i} className="bg-stone-950 border-stone-800 hover:border-stone-600 transition-all duration-700 group p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-1000">
       <stat.icon className="w-40 h-40 -mr-16 -mt-16" />
      </div>
      
      {/* Decorative Hardware Elements */}
      <div className="absolute top-6 right-6 flex gap-1.5">
       <div className="w-1.5 h-1.5 rounded-full bg-stone-800" />
       <div className="w-1.5 h-1.5 rounded-full bg-stone-800" />
       <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", stat.color.replace('text-', 'bg-'))} />
      </div>

      <div className="flex items-start justify-between relative z-10">
       <div className={cn(
        "w-16 h-16 rounded-2xl flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.05)] border border-white/5 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6", 
        stat.color,
        "bg-white/5 backdrop-blur-xl"
       )}>
        <stat.icon className="w-8 h-8" />
       </div>
       <div className="flex items-center gap-2 text-xs font-mono font-medium text-emerald-400 bg-emerald-400/10 px-4 py-2 rounded-full border border-emerald-400/20 backdrop-blur-xl">
        <ArrowUpRight className="w-3.5 h-3.5" /> {stat.change}
       </div>
      </div>
      
      <div className="mt-12 space-y-4 relative z-10">
       <div className="flex items-center gap-3">
        <span className="text-xs font-mono font-medium text-stone-600">0{i+1}</span>
        <p className="text-xs font-mono font-medium text-stone-500 uppercase tracking-wider">{stat.label}</p>
       </div>
       <div className="flex items-baseline gap-2">
        <p className="text-xl sm:text-2xl xl:text-3xl font-medium text-white tracking-tighter leading-none">{stat.value}</p>
        {stat.label.includes('Score') && <span className="text-xl font-medium text-stone-700">%</span>}
       </div>
      </div>
      
      <div className="mt-10 h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden backdrop-blur-sm p-[1px]">
       <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${Number(stat.value.replace(',', '')) / (stat.value.includes(',') ? 20 : 1)}%` }}
        transition={{ duration: 2, delay: i * 0.2, ease: "circOut" }}
        className={cn("h-full rounded-full shadow-[0_0_20px_rgba(255,255,255,0.1)]", stat.color.replace('text-', 'bg-'))}
       />
      </div>
     </Card>
    ))}
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
    {/* Main Charts Area */}
    <div className="lg:col-span-8 space-y-12">
     <Card className="p-12 rounded-[3rem] border-stone-200/60 shadow-2xl bg-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-stone-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 relative z-10">
       <div className="space-y-2">
        <h3 className="text-lg font-medium tracking-tight text-stone-900">Readiness Score Progression</h3>
        <p className="text-base text-stone-400 font-light">Temporal analysis of venture maturity metrics</p>
       </div>
       <div className="flex items-center gap-3 px-5 py-2.5 bg-stone-50 rounded-2xl border border-stone-200/50 shadow-sm">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-mono font-medium text-stone-500 uppercase tracking-wider">Live Telemetry</span>
       </div>
      </div>
      
      <div className="h-[400px] w-full relative z-10">
       <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={readinessData}>
         <defs>
          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
           <stop offset="5%" stopColor="#1c1917" stopOpacity={0.08}/>
           <stop offset="95%" stopColor="#1c1917" stopOpacity={0}/>
          </linearGradient>
         </defs>
         <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f5f5f4" />
         <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 11, fontWeight: 700, fill: '#a8a29e', fontFamily: 'monospace' }}
          dy={20}
         />
         <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 11, fontWeight: 700, fill: '#a8a29e', fontFamily: 'monospace' }}
          dx={-20}
         />
         <Tooltip 
          contentStyle={{ 
           backgroundColor: '#1c1917', 
           borderRadius: '20px', 
           border: 'none',
           boxShadow: '0 30px 60px -12px rgb(0 0 0 / 0.6)',
           fontSize: '13px',
           fontWeight: '700',
           color: '#fff',
           fontFamily: 'monospace',
           padding: '16px'
          }}
          itemStyle={{ color: '#fff', padding: '4px 0' }}
          cursor={{ stroke: '#1c1917', strokeWidth: 1, strokeDasharray: '4 4' }}
         />
         <Area 
          type="monotone" 
          dataKey="score" 
          stroke="#1c1917" 
          strokeWidth={4}
          fillOpacity={1} 
          fill="url(#colorScore)" 
          animationDuration={2500}
          activeDot={{ r: 8, fill: '#1c1917', stroke: '#fff', strokeWidth: 3 }}
         />
        </AreaChart>
       </ResponsiveContainer>
      </div>
     </Card>

     <Card className="p-12 rounded-[3rem] border-stone-200/60 shadow-2xl bg-white relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8">
       <div className="space-y-2">
        <h3 className="text-lg font-medium tracking-tight text-stone-900">Weekly Engagement</h3>
        <p className="text-base text-stone-400 font-light">Cross-ecosystem interaction density</p>
       </div>
       <div className="flex flex-wrap items-center gap-8">
        <div className="flex items-center gap-3">
         <div className="w-3 h-3 rounded-full bg-stone-900 shadow-lg shadow-stone-900/20"></div>
         <span className="text-xs font-mono font-medium text-stone-500 uppercase tracking-widest">Connect</span>
        </div>
        <div className="flex items-center gap-3">
         <div className="w-3 h-3 rounded-full bg-stone-400"></div>
         <span className="text-xs font-mono font-medium text-stone-500 uppercase tracking-widest">Message</span>
        </div>
        <div className="flex items-center gap-3">
         <div className="w-3 h-3 rounded-full bg-stone-200"></div>
         <span className="text-xs font-mono font-medium text-stone-500 uppercase tracking-widest">View</span>
        </div>
       </div>
      </div>
      
      <div className="h-[400px] w-full">
       <ResponsiveContainer width="100%" height="100%">
        <BarChart data={activityData}>
         <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f5f5f4" />
         <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 11, fontWeight: 700, fill: '#a8a29e', fontFamily: 'monospace' }}
          dy={20}
         />
         <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 11, fontWeight: 700, fill: '#a8a29e', fontFamily: 'monospace' }}
          dx={-20}
         />
         <Tooltip 
          cursor={{ fill: '#f5f5f4', radius: 12 }}
          contentStyle={{ 
           backgroundColor: '#1c1917', 
           borderRadius: '20px', 
           border: 'none',
           boxShadow: '0 30px 60px -12px rgb(0 0 0 / 0.6)',
           fontSize: '13px',
           fontWeight: '700',
           color: '#fff',
           fontFamily: 'monospace',
           padding: '16px'
          }}
         />
         <Bar dataKey="connections" fill="#1c1917" radius={[8, 8, 0, 0]} barSize={28} />
         <Bar dataKey="messages" fill="#78716c" radius={[8, 8, 0, 0]} barSize={28} />
         <Bar dataKey="views" fill="#d6d3d1" radius={[8, 8, 0, 0]} barSize={28} />
        </BarChart>
       </ResponsiveContainer>
      </div>
     </Card>
    </div>

    {/* Activity Feed Sidebar */}
    <aside className="lg:col-span-4 space-y-12">
     <Card className="p-12 rounded-[3rem] border-stone-200/60 shadow-2xl bg-white">
      <div className="space-y-10">
       <div className="space-y-2">
        <h3 className="text-base font-medium tracking-tight text-stone-900">Activity Feed</h3>
        <p className="text-sm text-stone-400 font-light">Real-time ecosystem updates</p>
       </div>
       
       <div className="space-y-10">
        {[
         { type: 'connection', user: 'Alex Rivera', action: 'connected with you', time: '2h ago', icon: Users, color: 'text-stone-900', bg: 'bg-stone-50' },
         { type: 'achievement', user: 'You', action: 'reached 85% Readiness Score', time: '5h ago', icon: Award, color: 'text-stone-900', bg: 'bg-stone-50' },
         { type: 'message', user: 'Sarah Chen', action: 'sent you a message', time: '1d ago', icon: Zap, color: 'text-stone-900', bg: 'bg-stone-50' },
         { type: 'event', user: 'You', action: 'registered for Pitch Night', time: '2d ago', icon: Calendar, color: 'text-stone-900', bg: 'bg-stone-50' },
        ].map((item, i) => (
         <div key={i} className="flex gap-6 group cursor-pointer">
          <div className={cn(
           "w-14 h-11 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:bg-stone-900 group-hover:text-white border border-stone-100", 
           item.bg, item.color
          )}>
           <item.icon className="w-7 h-7" />
          </div>
          <div className="space-y-2 flex-1">
           <p className="text-base font-medium text-stone-600 leading-snug group-hover:text-stone-900 transition-colors">
            <span className="font-medium text-stone-900">{item.user}</span> {item.action}
           </p>
           <p className="text-xs font-mono font-medium text-stone-400 uppercase tracking-wider">{item.time}</p>
          </div>
         </div>
        ))}
        
        <Button variant="ghost" className="w-full h-16 rounded-2xl text-xs font-medium uppercase tracking-wider text-stone-400 hover:text-stone-900 hover:bg-stone-50 border border-transparent hover:border-stone-200/50 transition-all duration-300">
         View Full History
        </Button>
       </div>
      </div>
     </Card>

     <Card className="p-12 rounded-[3rem] border-stone-200/60 shadow-2xl bg-white">
      <div className="space-y-10">
       <div className="space-y-2">
        <h3 className="text-base font-medium tracking-tight text-stone-900">Achievements</h3>
        <p className="text-sm text-stone-400 font-light">Verified milestone credentials</p>
       </div>
       
       <div className="grid grid-cols-2 gap-8">
        {[
         { name: 'Early Bird', icon: Rocket, unlocked: true },
         { name: 'Networker', icon: Users, unlocked: true },
         { name: 'Pitch Master', icon: Zap, unlocked: false },
         { name: 'Funded', icon: Star, unlocked: false },
        ].map((badge, i) => (
         <div key={i} className={cn(
          "p-8 rounded-[2.5rem] border flex flex-col items-center justify-center gap-5 transition-all duration-500 group",
          badge.unlocked 
           ? "bg-white border-stone-200/60 shadow-sm hover:border-stone-900 hover:shadow-2xl hover:-translate-y-2" 
           : "bg-stone-50 border-stone-100 opacity-40 grayscale"
         )}>
          <div className={cn(
           "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-700 group-hover:rotate-[360deg]",
           badge.unlocked ? "bg-stone-900 text-white shadow-2xl shadow-stone-900/30" : "bg-stone-200 text-stone-400"
          )}>
           <badge.icon className="w-8 h-8" />
          </div>
          <p className="text-xs font-medium text-stone-900 uppercase tracking-[0.25em] text-center leading-tight">{badge.name}</p>
         </div>
        ))}
       </div>
      </div>
     </Card>

     <Card className="bg-stone-900 border-stone-800 p-12 rounded-[3rem] shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity duration-1000">
       <Rocket className="w-48 h-48 -mr-16 -mt-16" />
      </div>
      
      <div className="space-y-8 relative z-10">
       <div className="flex items-center gap-4 text-amber-400">
        <div className="p-2 bg-amber-400/10 rounded-lg border border-amber-400/20">
         <Zap className="w-6 h-6 fill-current" />
        </div>
        <h4 className="font-medium text-xs uppercase tracking-wider">Strategic Insight</h4>
       </div>
       
       <p className="text-lg text-stone-400 leading-relaxed font-light">
        Startups with a <span className="text-white font-medium">Readiness Score over 80%</span> are <span className="text-white italic serif">3x more likely</span> to secure funding within 6 months.
       </p>
       
       <Button className="w-full h-16 rounded-2xl bg-white text-stone-900 hover:bg-stone-100 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-medium text-xs uppercase tracking-wider shadow-xl shadow-white/5">
        Optimize Score
       </Button>
      </div>
     </Card>
    </aside>
   </div>
  </div>

 );
}
