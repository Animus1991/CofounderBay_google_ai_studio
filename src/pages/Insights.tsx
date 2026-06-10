import { useState } from "react";

import PageShell from "../components/ui/PageShell";

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

  <PageShell title="Insights" description="Analytics and performance intelligence for your startup journey.">

   <div className="space-y-5">



    {/* Time range tab bar */}

    <div className="flex items-center gap-1 bg-stone-50 p-1 rounded-xl border border-stone-100 w-fit">

     {['24H', '7D', '30D', 'ALL'].map((range) => (

      <button

       key={range}

       onClick={() => setActiveRange(range)}

       className={cn(

        "px-3 py-1.5 text-sm font-semibold rounded-lg transition-all tracking-widest",

        activeRange === range ? "bg-stone-900 text-white shadow" : "text-stone-400 hover:text-stone-700"

       )}

      >

       {range}

      </button>

     ))}

    </div>



    {/* KPI Stats Row */}

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

     {[

      { label: "Readiness Score", value: "85%", change: "+12%", icon: Target,    dot: "bg-amber-400",   bar: "bg-amber-400",   pct: 85 },

      { label: "Profile Views",   value: "1,240", change: "+24%", icon: Users,     dot: "bg-blue-400",    bar: "bg-blue-400",    pct: 62 },

      { label: "Connections",     value: "48",   change: "+8%",  icon: Zap,       dot: "bg-violet-400",  bar: "bg-violet-400",  pct: 48 },

      { label: "Activity Score",  value: "92%",  change: "+5%",  icon: TrendingUp, dot: "bg-emerald-400", bar: "bg-emerald-400", pct: 92 },

     ].map((stat, i) => (

      <div key={i} className="bg-white border border-stone-100 rounded-2xl p-4 hover:border-stone-200 hover:shadow-sm transition-all group">

       <div className="flex items-start justify-between mb-3">

        <div className="w-8 h-8 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center shrink-0">

         <stat.icon className="w-4 h-4 text-stone-500" />

        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">

         <ArrowUpRight className="w-2.5 h-2.5" />{stat.change}

        </div>

       </div>

       <p className="text-base font-bold text-stone-900">{stat.value}</p>

       <p className="text-xs text-stone-400 tracking-wider mt-0.5">{stat.label}</p>

       <div className="mt-2.5 h-1 bg-stone-100 rounded-full overflow-hidden">

        <motion.div

         initial={{ width: 0 }}

         animate={{ width: `${stat.pct}%` }}

         transition={{ duration: 1.2, delay: i * 0.1, ease: "circOut" }}

         className={cn("h-full rounded-full", stat.bar)}

        />

       </div>

      </div>

     ))}

    </div>



    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">



     {/* Main Charts */}

     <div className="lg:col-span-8 space-y-4">



      {/* Readiness Score Chart */}

      <Card className="p-4 border-stone-100 bg-white">

       <div className="flex items-center justify-between mb-3">

        <div>

         <h3 className="text-sm font-semibold text-stone-900">Readiness Score Progression</h3>

         <p className="text-xs text-stone-400">Venture maturity over time</p>

        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-50 rounded-lg border border-stone-100">

         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />

         <span className="text-xs font-semibold text-stone-500 tracking-wider">Live</span>

        </div>

       </div>

       <div className="h-56 w-full">

        <ResponsiveContainer width="100%" height="100%">

         <AreaChart data={readinessData}>

          <defs>

           <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">

            <stop offset="5%" stopColor="#1c1917" stopOpacity={0.07}/>

            <stop offset="95%" stopColor="#1c1917" stopOpacity={0}/>

           </linearGradient>

          </defs>

          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f5f5f4" />

          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a8a29e' }} dy={8} />

          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a8a29e' }} dx={-8} />

          <Tooltip

           contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', fontSize: '11px', padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}

           itemStyle={{ color: '#1c1917' }}

           cursor={{ stroke: '#d6d3d1', strokeWidth: 1, strokeDasharray: '4 4' }}

          />

          <Area type="monotone" dataKey="score" stroke="#1c1917" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" animationDuration={1500} activeDot={{ r: 5, fill: '#1c1917', stroke: '#fff', strokeWidth: 2 }} />

         </AreaChart>

        </ResponsiveContainer>

       </div>

      </Card>



      {/* Weekly Engagement Chart */}

      <Card className="p-4 border-stone-100 bg-white">

       <div className="flex items-center justify-between mb-3">

        <div>

         <h3 className="text-sm font-semibold text-stone-900">Weekly Engagement</h3>

         <p className="text-xs text-stone-400">Connections · Messages · Views</p>

        </div>

        <div className="flex items-center gap-3">

         {[{ label: "Connect", color: "bg-stone-900" }, { label: "Message", color: "bg-stone-400" }, { label: "View", color: "bg-stone-200" }].map(({ label, color }) => (

          <div key={label} className="flex items-center gap-1">

           <div className={cn("w-2 h-2 rounded-full", color)} />

           <span className="text-xs text-stone-400 tracking-wider">{label}</span>

          </div>

         ))}

        </div>

       </div>

       <div className="h-56 w-full">

        <ResponsiveContainer width="100%" height="100%">

         <BarChart data={activityData} barGap={2}>

          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f5f5f4" />

          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a8a29e' }} dy={8} />

          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a8a29e' }} dx={-8} />

          <Tooltip

           cursor={{ fill: '#fafaf9' }}

           contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', fontSize: '11px', padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}

          />

          <Bar dataKey="connections" fill="#1c1917" radius={[4, 4, 0, 0]} barSize={14} />

          <Bar dataKey="messages"    fill="#78716c" radius={[4, 4, 0, 0]} barSize={14} />

          <Bar dataKey="views"       fill="#d6d3d1" radius={[4, 4, 0, 0]} barSize={14} />

         </BarChart>

        </ResponsiveContainer>

       </div>

      </Card>

     </div>



     {/* Sidebar */}

     <aside className="lg:col-span-4 space-y-4">



      {/* Activity Feed */}

      <Card className="p-4 border-stone-100 bg-white space-y-3">

       <div>

        <h3 className="text-sm font-semibold text-stone-900">Activity Feed</h3>

        <p className="text-xs text-stone-400">Real-time ecosystem updates</p>

       </div>

       <div className="space-y-3">

        {[

         { user: 'Alex Rivera',  action: 'connected with you',          time: '2h ago', icon: Users,    bg: 'bg-stone-50',   ic: 'text-stone-600' },

         { user: 'You',          action: 'reached 85% Readiness Score', time: '5h ago', icon: Award,    bg: 'bg-amber-50',   ic: 'text-amber-600' },

         { user: 'Sarah Chen',   action: 'sent you a message',          time: '1d ago', icon: Zap,      bg: 'bg-violet-50',  ic: 'text-violet-600' },

         { user: 'You',          action: 'registered for Pitch Night',  time: '2d ago', icon: Calendar, bg: 'bg-blue-50',    ic: 'text-blue-600' },

        ].map((item, i) => (

         <div key={i} className="flex items-start gap-2.5 group cursor-pointer">

          <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border border-stone-100 transition-all group-hover:bg-stone-900 group-hover:text-white", item.bg, item.ic)}>

           <item.icon className="w-3.5 h-3.5" />

          </div>

          <div className="flex-1 min-w-0">

           <p className="text-sm text-stone-600 leading-snug">

            <span className="font-semibold text-stone-900">{item.user}</span> {item.action}

           </p>

           <p className="text-xs text-stone-400 mt-0.5">{item.time}</p>

          </div>

         </div>

        ))}

       </div>

       <Button variant="ghost" className="w-full h-7 rounded-xl text-xs font-semibold tracking-wider text-stone-400 hover:text-stone-900 hover:bg-stone-50 border border-stone-100 transition-all">

        View Full History

       </Button>

      </Card>



      {/* Achievements */}

      <Card className="p-4 border-stone-100 bg-white space-y-3">

       <div>

        <h3 className="text-sm font-semibold text-stone-900">Achievements</h3>

        <p className="text-xs text-stone-400">Verified milestone credentials</p>

       </div>

       <div className="grid grid-cols-2 gap-2">

        {[

         { name: 'Early Bird',   icon: Rocket, unlocked: true },

         { name: 'Networker',    icon: Users,  unlocked: true },

         { name: 'Pitch Master', icon: Zap,    unlocked: false },

         { name: 'Funded',       icon: Star,   unlocked: false },

        ].map((badge, i) => (

         <div key={i} className={cn(

          "p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all group cursor-pointer",

          badge.unlocked ? "bg-white border-stone-100 hover:border-stone-300 hover:shadow-sm" : "bg-stone-50 border-stone-100 opacity-40 grayscale"

         )}>

          <div className={cn(

           "w-9 h-9 rounded-xl flex items-center justify-center transition-all",

           badge.unlocked ? "bg-stone-900 text-white group-hover:scale-110" : "bg-stone-200 text-stone-400"

          )}>

           <badge.icon className="w-4 h-4" />

          </div>

          <p className="text-xs font-semibold text-stone-700 tracking-wider text-center">{badge.name}</p>

         </div>

        ))}

       </div>

      </Card>



      {/* Strategic Insight — light amber version */}

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-3">

       <div className="flex items-center gap-2">

        <div className="w-7 h-7 rounded-xl bg-white border border-amber-100 flex items-center justify-center shrink-0">

         <Zap className="w-3.5 h-3.5 text-amber-500" />

        </div>

        <h4 className="text-sm font-semibold text-stone-900">Strategic Insight</h4>

       </div>

       <p className="text-sm text-stone-600 leading-relaxed">

        Startups with a <span className="font-semibold text-stone-900">Readiness Score over 80%</span> are <span className="font-semibold text-stone-900">3× more likely</span> to secure funding within 6 months.

       </p>

       <Button className="w-full h-7 rounded-lg bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800">

        Optimize Score

       </Button>

      </div>



     </aside>

    </div>

   </div>

  </PageShell>

 );

}

