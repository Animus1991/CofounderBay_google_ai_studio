import React, { useState, useEffect } from 'react';
import { 
 BarChart3, 
 Users, 
 Award, 
 ShieldAlert, 
 Settings, 
 TrendingUp, 
 Activity,
 AlertTriangle,
 CheckCircle,
 XCircle,
 Search,
 Filter,
 ArrowUpRight,
 ArrowDownRight,
 ShieldCheck,
 MoreVertical
} from 'lucide-react';
import { 
 BarChart, 
 Bar, 
 XAxis, 
 YAxis, 
 CartesianGrid, 
 Tooltip, 
 ResponsiveContainer,
 Cell
} from 'recharts';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { getAdminAnalytics, detectAbuse, updateSystemConfig } from '../services/adminService';
import { useAuth } from '../App';

export default function AdminDashboard() {
 const { user, isDemoMode } = useAuth();
 const [analytics, setAnalytics] = useState<any>(null);
 const [abuseFlags, setAbuseFlags] = useState<any[]>([]);
 const [dismissedFlags, setDismissedFlags] = useState<Set<number>>(new Set());
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<'overview' | 'abuse' | 'config'>('overview');
 const [configDrafts, setConfigDrafts] = useState<Record<string, number>>({});
 const [configSaved, setConfigSaved] = useState(false);

 useEffect(() => {
  // The demo account has no Firestore access — the sample numbers below are
  // rendered without touching the backend.
  if (isDemoMode || !user) {
   setLoading(false);
   return;
  }
  const fetchData = async () => {
   const [stats, flags] = await Promise.all([
    getAdminAnalytics(),
    detectAbuse()
   ]);
   setAnalytics(stats);
   setAbuseFlags(flags);
   setLoading(false);
  };
  fetchData();
 }, [isDemoMode, user]);

 const COLORS = ['#1c1917', '#44403c', '#78716c', '#a8a29e', '#d6d3d1'];

 if (loading) {
  return (
   <div className="min-h-screen flex items-center justify-center bg-stone-50">
    <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
   </div>
  );
 }

 const distributionData = analytics ? Object.entries(analytics.eventTypeDistribution).map(([name, value]) => ({
  name: name.replace(/_/g, ' '),
  value
 })) : [];

 return (
  <div className="w-full px-2 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-24 space-y-6">
   {/* Header */}
   <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8 lg:pr-56">
    <div className="space-y-2">
     <div className="flex items-center gap-2 text-stone-400 font-medium tracking-wide text-xs">
      <ShieldCheck className="w-4 h-4" />
      Admin Control Center
     </div>
     <h1 className="text-xl sm:text-2xl font-semibold text-stone-900 tracking-tight">Ecosystem Health</h1>
     <button type="button" className="text-xs font-medium text-stone-900 hover:underline" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'What is overdue?' } }))}>
      Ask the studio assistant
     </button>
    </div>
    <div className="flex items-center gap-3">
     <div className="flex bg-stone-100 p-1 rounded-xl">
      {(['overview', 'abuse', 'config'] as const).map((tab) => (
       <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={cn(
         "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
         activeTab === tab ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
        )}
       >
        {tab}
       </button>
      ))}
     </div>
     <button
      type="button"
      title="Refresh analytics"
      onClick={() => { if (isDemoMode || !user) return; setLoading(true); Promise.all([getAdminAnalytics(), detectAbuse()]).then(([a, f]) => { setAnalytics(a); setAbuseFlags(f); setDismissedFlags(new Set()); setLoading(false); }); }}
      className="p-3 bg-white text-stone-900 rounded-xl hover:bg-stone-50 transition-all border border-stone-100 shadow-sm"
     >
      <Activity className="w-5 h-5" />
     </button>
    </div>
   </div>

   {activeTab === 'overview' && (
    <div className="space-y-12">
     {/* Stats Grid */}
     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
       { label: 'Total Users', value: analytics?.totalUsers, icon: Users, color: 'blue' },
       { label: 'Ecosystem XP', value: analytics?.totalXP.toLocaleString(), icon: TrendingUp, color: 'green' },
       { label: 'Badges Earned', value: analytics?.totalBadgesAwarded, icon: Award, color: 'amber' },
       { label: 'XP Events', value: analytics?.xpEventsCount, icon: Activity, color: 'purple' },
      ].map((stat, idx) => (
       <motion.div 
        key={stat.label}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.1 }}
        className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all group"
       >
        <div className="flex justify-between items-start mb-3">
         <div className={cn(
          "p-3 rounded-xl transition-all",
          stat.color === 'blue' ? "bg-blue-50 text-blue-600" :
          stat.color === 'green' ? "bg-green-50 text-green-600" :
          stat.color === 'amber' ? "bg-amber-50 text-amber-600" :
          "bg-purple-50 text-purple-600"
         )}>
          <stat.icon className="w-5 h-5" />
         </div>
        </div>
        <div className="text-lg font-semibold text-stone-900">{stat.value}</div>
        <div className="text-sm text-stone-400 font-medium tracking-wide mt-1">{stat.label}</div>
       </motion.div>
      ))}
     </div>

     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Event Distribution */}
      <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm">
       <h3 className="text-sm font-semibold text-stone-900 tracking-wider mb-8">Behavioral Event Distribution</h3>
       <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
         <BarChart data={distributionData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f5f5f4" />
          <XAxis type="number" hide />
          <YAxis 
           dataKey="name" 
           type="category" 
           axisLine={false} 
           tickLine={false} 
           width={150}
           tick={{ fill: '#78716c', fontSize: 10, fontWeight: 600 }}
          />
          <Tooltip 
           cursor={{ fill: '#f5f5f4' }}
           contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
           {distributionData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
           ))}
          </Bar>
         </BarChart>
        </ResponsiveContainer>
       </div>
      </div>

      {/* Momentum Insights */}
      <div className="space-y-8">
       <div className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm space-y-6">
        <h3 className="text-sm font-semibold text-stone-900 tracking-wider">Derived metrics</h3>
        <div className="space-y-4">
         {[
          { title: 'Events per user', value: analytics?.totalUsers ? (analytics.xpEventsCount / analytics.totalUsers).toFixed(1) : '—', desc: 'XP events recorded per registered user.' },
          { title: 'Badges per user', value: analytics?.totalUsers ? (analytics.totalBadgesAwarded / analytics.totalUsers).toFixed(2) : '—', desc: 'Average badges awarded per user.' },
          { title: 'AI chats', value: analytics?.aiUsageCount?.toLocaleString() ?? '—', desc: 'Assistant messages sent by real accounts.' },
          { title: 'Top event type', value: distributionData[0]?.name ?? '—', desc: 'Most frequent behavioral event.' },
          { title: 'Abuse flags', value: String(abuseFlags.length), desc: 'Users over the same-event threshold in the latest window.' },
         ].map((insight) => (
          <div key={insight.title} className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
           <div className="flex justify-between items-start mb-1">
            <h4 className="font-medium text-stone-900 text-sm">{insight.title}</h4>
            <span className="text-lg font-medium text-stone-900">{insight.value}</span>
           </div>
           <p className="text-xs text-stone-500">{insight.desc}</p>
          </div>
         ))}
        </div>
       </div>

       <div className="bg-stone-900 text-white p-8 rounded-[32px] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
         <h3 className="text-base font-semibold text-white">System Health</h3>
         <Activity className="w-6 h-6 text-green-400" />
        </div>
        <div className="space-y-4">
         {[
          { label: 'Scoring Engine', ok: analytics != null },
          { label: 'Behavioral AI', ok: analytics != null },
          { label: 'Anti-Abuse', ok: abuseFlags != null },
         ].map((service) => (
          <div key={service.label} className="flex items-center justify-between">
           <div className="flex items-center gap-3">
            <div className={cn("w-1.5 h-1.5 rounded-full", service.ok ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-400")} />
            <span className="text-sm font-medium">{service.label}</span>
           </div>
           <span className="text-xs font-mono text-stone-500">{service.ok ? 'ok' : 'down'}</span>
          </div>
         ))}
        </div>
       </div>
      </div>
     </div>
    </div>
   )}

   {activeTab === 'abuse' && (
    <div className="bg-white rounded-[32px] border border-stone-100 shadow-sm overflow-hidden">
     <div className="p-8 border-b border-stone-50 flex justify-between items-center">
      <div>
       <h3 className="text-sm font-semibold text-stone-900 tracking-wider">Anti-Abuse Monitor</h3>
       <p className="text-sm text-stone-400 font-medium">Flags for suspicious XP farming or bot-like behavior.</p>
      </div>
      <div className="flex items-center gap-2">
       <span className="px-4 py-1.5 text-red-600 rounded-xl text-xs font-medium tracking-wide">
        {abuseFlags.length} Active Flags
       </span>
      </div>
     </div>
     <div className="overflow-x-auto">
      <table className="w-full text-left">
       <thead className="bg-stone-50/50 text-stone-400 text-xs font-medium tracking-wide">
        <tr>
         <th className="px-5 py-2.5">User ID</th>
         <th className="px-5 py-2.5">Violation Type</th>
         <th className="px-5 py-2.5">Severity</th>
         <th className="px-5 py-2.5">Evidence</th>
         <th className="px-5 py-2.5 text-right">Actions</th>
        </tr>
       </thead>
       <tbody className="divide-y divide-stone-50">
        {abuseFlags.map((flag, idx) => (
         <tr key={idx} className="hover:bg-stone-50/30 transition-colors group">
          <td className="px-8 py-5 font-mono text-xs text-stone-600">{flag.userId}</td>
          <td className="px-8 py-5">
           <span className="px-2 py-1 text-amber-700 rounded-lg text-xs font-medium tracking-wider">
            {flag.type}
           </span>
          </td>
          <td className="px-8 py-5">
           <div className="w-24 h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-red-500" style={{ width: `${flag.severity * 100}%` }} />
           </div>
          </td>
          <td className="px-8 py-5 text-xs text-stone-400 font-medium">
           {flag.metadata.count} events of {flag.metadata.eventType}
          </td>
          <td className="px-8 py-5 text-right">
           <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
             type="button"
             title="Mark reviewed — flag clears until the next detection pass"
             onClick={() => setDismissedFlags((prev) => new Set(prev).add(idx))}
             className="p-2 text-stone-400 hover:text-green-600 hover:bg-white rounded-lg transition-all shadow-sm"
            >
             <CheckCircle className="w-4 h-4" />
            </button>
            <button
             type="button"
             title="Inspect this user's score and events"
             onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Inspect user ${flag.userId} for XP farming` } }))}
             className="p-2 text-stone-400 hover:text-red-600 hover:bg-white rounded-lg transition-all shadow-sm"
            >
             <XCircle className="w-4 h-4" />
            </button>
           </div>
          </td>
         </tr>
        )).filter((_, idx) => !dismissedFlags.has(idx))}
        {abuseFlags.filter((_, idx) => !dismissedFlags.has(idx)).length === 0 && (
         <tr>
          <td colSpan={5} className="px-8 py-12 text-center text-stone-400 italic font-medium">
           No suspicious activity detected in the current window.
          </td>
         </tr>
        )}
       </tbody>
      </table>
     </div>
    </div>
   )}

   {activeTab === 'config' && (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
     <div className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm space-y-8">
      <h3 className="text-sm font-semibold text-stone-900 tracking-wider">Scoring Weights</h3>
      <div className="space-y-8">
       {[
        { label: 'Artifact Completion XP', value: 100, key: 'xp_artifact_complete' },
        { label: 'Mentor Feedback Multiplier', value: 1.5, key: 'multiplier_mentor' },
        { label: 'Streak Bonus (Daily)', value: 20, key: 'bonus_streak' },
        { label: 'Team Collaboration Weight', value: 0.3, key: 'weight_collab' },
       ].map((config) => {
        const draft = configDrafts[config.key] ?? config.value;
        return (
        <div key={config.key} className="space-y-4">
         <div className="flex justify-between items-center">
          <label htmlFor={`cfg-${config.key}`} className="text-sm font-medium text-stone-700">{config.label}</label>
          <span className="text-sm font-mono font-medium text-stone-900 bg-stone-50 px-2 py-1 rounded-lg">{draft}</span>
         </div>
         <input
          id={`cfg-${config.key}`}
          type="range"
          className="w-full h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-stone-900"
          min={0}
          max={config.value * 2}
          step={config.value / 10}
          value={draft}
          onChange={(e) => setConfigDrafts((prev) => ({ ...prev, [config.key]: Number(e.target.value) }))}
         />
        </div>
        );
       })}
       <button
        type="button"
        className="w-full py-4 bg-stone-900 text-white rounded-2xl font-medium hover:bg-stone-800 transition-all shadow-sm"
        onClick={async () => {
         const entries = Object.entries(configDrafts);
         if (entries.length === 0) return;
         const results = await Promise.all(entries.map(([key, value]) => updateSystemConfig(key, value)));
         if (results.every(Boolean)) { setConfigSaved(true); setTimeout(() => setConfigSaved(false), 2500); }
        }}
       >
        {configSaved ? 'Saved to systemConfig' : 'Save Configuration'}
       </button>
      </div>
     </div>

     <div className="bg-stone-50 p-8 rounded-[32px] border border-stone-100 border-dashed flex flex-col items-center justify-center text-center space-y-4">
      <div className="p-4 bg-white rounded-2xl shadow-sm">
       <Settings className="w-8 h-8 text-stone-400" />
      </div>
      <div>
       <h4 className="text-base font-semibold text-stone-900">Advanced Tuning</h4>
       <p className="text-sm text-stone-500 max-w-xs mx-auto">
        Modify the underlying behavioral models and scoring heuristics. Changes take effect immediately.
       </p>
      </div>
      <button
       type="button"
       onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'Explain the scoring weights on this page' } }))}
       className="px-6 py-2.5 bg-white text-stone-900 border border-stone-200 rounded-xl text-sm font-medium hover:bg-stone-100 transition-all"
      >
       Ask the assistant
      </button>
     </div>
    </div>
   )}
  </div>
 );
}
