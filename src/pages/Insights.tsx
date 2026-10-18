import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { keys, readActivity } from "../lib/localLists";
import { useStored } from "../lib/useStored";
import { useT } from "../lib/language";

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
 const t = useT();
 const navigate = useNavigate();
 const [activeRange, setActiveRange] = useState('7D');
 const studioActivity = useStored(readActivity, [keys.activity]);
 const readinessView = useMemo(() => {
  if (activeRange === '24H') return readinessData.slice(-1);
  if (activeRange === '7D') return readinessData.slice(-2);
  if (activeRange === '30D') return readinessData.slice(-4);
  return readinessData;
 }, [activeRange]);
 const activityView = useMemo(() => {
  if (activeRange === '24H') return activityData.slice(-1);
  if (activeRange === '7D') return activityData.slice(-3);
  if (activeRange === '30D') return activityData.slice(-5);
  return activityData;
 }, [activeRange]);
 const lastScore = readinessView[readinessView.length - 1]?.score ?? 85;
 const viewSum = activityView.reduce((sum, row) => sum + row.views, 0);
 const connectSum = activityView.reduce((sum, row) => sum + row.connections, 0);
 const axisLabel: Record<string, string> = {
  Jan: t('Jan', 'Ιαν'), Feb: t('Feb', 'Φεβ'), Mar: t('Mar', 'Μαρ'), Apr: t('Apr', 'Απρ'),
  May: t('May', 'Μάι'), Jun: t('Jun', 'Ιουν'), Jul: t('Jul', 'Ιουλ'),
  Mon: t('Mon', 'Δευ'), Tue: t('Tue', 'Τρί'), Wed: t('Wed', 'Τετ'), Thu: t('Thu', 'Πέμ'),
  Fri: t('Fri', 'Παρ'), Sat: t('Sat', 'Σάβ'), Sun: t('Sun', 'Κυρ'),
 };
 const readinessChart = readinessView.map((row) => ({ ...row, name: axisLabel[row.name] ?? row.name }));
 const activityChart = activityView.map((row) => ({ ...row, name: axisLabel[row.name] ?? row.name }));
 const you = t('You', 'Εσύ');
 const kpis = [
  { label: t("Readiness Score", "Δείκτης ετοιμότητας"), value: `${lastScore}%`, change: "+12%", icon: Target,    dot: "bg-amber-400",   bar: "bg-amber-400",   pct: lastScore, href: '/profile' },
  { label: t("Profile Views", "Προβολές προφίλ"),   value: String(viewSum), change: "+24%", icon: Users,     dot: "bg-blue-400",    bar: "bg-blue-400",    pct: Math.min(100, viewSum), href: '/network' },
  { label: t("Connections", "Συνδέσεις"),     value: String(connectSum), change: "+8%",  icon: Zap,       dot: "bg-violet-400",  bar: "bg-violet-400",  pct: Math.min(100, connectSum * 8), href: '/network' },
  { label: t("Activity Score", "Δείκτης δραστηριότητας"),  value: `${Math.min(99, 70 + connectSum)}%`,  change: "+5%",  icon: TrendingUp, dot: "bg-emerald-400", bar: "bg-emerald-400", pct: Math.min(99, 70 + connectSum), href: '/notifications' },
 ];
 const feed = [
  ...studioActivity.slice(0, 4).map((item) => ({
   user: item.byAssistant ? t('Studio', 'Στούντιο') : (user.fullName?.split(' ')[0] || you),
   action: t(item.title, item.titleEl ?? item.title),
   time: item.at.slice(11, 16) || '',
   icon: Zap,
   bg: 'bg-stone-50',
   ic: 'text-stone-600',
   href: item.href || '/notifications',
  })),
  { user: 'Alex Rivera',  action: t('connected with you', 'συνδέθηκε μαζί σου'),          time: t('2h ago', 'πριν 2 ώρες'), icon: Users,    bg: 'bg-stone-50',   ic: 'text-stone-600', href: '/network' },
  { user: you,          action: t('reached 85% Readiness Score', 'έφτασε 85% στον δείκτη ετοιμότητας'), time: t('5h ago', 'πριν 5 ώρες'), icon: Award,    bg: 'bg-amber-50',   ic: 'text-amber-600', href: '/profile' },
  { user: 'Sarah Chen',   action: t('sent you a message', 'σου έστειλε μήνυμα'),          time: t('1d ago', 'πριν 1 ημέρα'), icon: Zap,      bg: 'bg-violet-50',  ic: 'text-violet-600', href: '/messages' },
  { user: you,          action: t('registered for Pitch Night', 'εγγράφηκε στη βραδιά pitch'),  time: t('2d ago', 'πριν 2 ημέρες'), icon: Calendar, bg: 'bg-blue-50',    ic: 'text-blue-600', href: '/events' },
 ].slice(0, 4);

 return (
  <PageShell title={t("Insights", "Εικόνα")} description={t("Analytics and performance intelligence for your startup journey.", "Αναλυτικά και εικόνα απόδοσης για τη διαδρομή του startup σου.")}>
   <div className="space-y-5">

    {/* Time range tab bar */}
    <div className="scroll-tabs bg-stone-50 p-1 rounded-xl border border-stone-100">
     {['24H', '7D', '30D', 'ALL'].map((range) => (
      <button
       key={range}
       onClick={() => setActiveRange(range)}
       className={cn(
        "px-3 py-1.5 text-sm font-semibold rounded-lg transition-all tracking-wide",
        activeRange === range ? "bg-stone-900 text-white shadow" : "text-stone-400 hover:text-stone-700"
       )}
      >
        {range === 'ALL' ? t('ALL', 'Όλα') : range}
      </button>
     ))}
    </div>

    {/* KPI Stats Row */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
     {kpis.map((stat, i) => (
      <div key={stat.label} role="button" tabIndex={0} onClick={() => navigate(stat.href)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(stat.href); }} className="bg-white border border-stone-100 rounded-2xl p-4 hover:border-stone-200 hover:shadow-sm transition-all group cursor-pointer">
       <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center shrink-0">
         <stat.icon className="w-4 h-4 text-stone-500" />
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 px-2 py-0.5 rounded-md">
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
         <h3 className="text-sm font-semibold text-stone-900">{t('Readiness Score Progression', 'Εξέλιξη δείκτη ετοιμότητας')}</h3>
         <p className="text-xs text-stone-400">{t('Venture maturity over time', 'Ωριμότητα του εγχειρήματος στον χρόνο')}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-50 rounded-lg border border-stone-100">
         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
         <span className="text-xs font-semibold text-stone-500 tracking-wider">{t('Live', 'Ζωντανά')}</span>
        </div>
       </div>
       <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
         <AreaChart data={readinessChart}>
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
          <Area type="monotone" dataKey="score" name={t('Score', 'Δείκτης')} stroke="#1c1917" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" animationDuration={1500} activeDot={{ r: 5, fill: '#1c1917', stroke: '#fff', strokeWidth: 2 }} />
         </AreaChart>
        </ResponsiveContainer>
       </div>
      </Card>

      {/* Weekly Engagement Chart */}
      <Card className="p-4 border-stone-100 bg-white">
       <div className="flex items-center justify-between mb-3">
        <div>
         <h3 className="text-sm font-semibold text-stone-900">{t('Weekly Engagement', 'Εβδομαδιαία δραστηριότητα')}</h3>
         <p className="text-xs text-stone-400">{t('Connections · Messages · Views', 'Συνδέσεις · Μηνύματα · Προβολές')}</p>
        </div>
        <div className="flex items-center gap-3">
         {[{ label: t("Connect", "Σύνδεση"), color: "bg-stone-900" }, { label: t("Message", "Μήνυμα"), color: "bg-stone-400" }, { label: t("View", "Προβολή"), color: "bg-stone-200" }].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1">
           <div className={cn("w-2 h-2 rounded-full", color)} />
           <span className="text-xs text-stone-400 tracking-wider">{label}</span>
          </div>
         ))}
        </div>
       </div>
       <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
         <BarChart data={activityChart} barGap={2}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f5f5f4" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a8a29e' }} dy={8} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a8a29e' }} dx={-8} />
          <Tooltip
           cursor={{ fill: '#fafaf9' }}
           contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', fontSize: '11px', padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
          />
          <Bar dataKey="connections" name={t('Connections', 'Συνδέσεις')} fill="#1c1917" radius={[4, 4, 0, 0]} barSize={14} />
          <Bar dataKey="messages"    name={t('Messages', 'Μηνύματα')} fill="#78716c" radius={[4, 4, 0, 0]} barSize={14} />
          <Bar dataKey="views"       name={t('Views', 'Προβολές')} fill="#d6d3d1" radius={[4, 4, 0, 0]} barSize={14} />
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
        <h3 className="text-sm font-semibold text-stone-900">{t('Activity Feed', 'Ροή δραστηριότητας')}</h3>
        <p className="text-xs text-stone-400">{t('Real-time ecosystem updates', 'Ενημερώσεις οικοσυστήματος σε πραγματικό χρόνο')}</p>
       </div>
       <div className="space-y-3">
        {feed.map((item, i) => (
         <div key={`${item.user}-${item.action}-${i}`} role="button" tabIndex={0} onClick={() => navigate(item.href)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(item.href); }} className="flex items-start gap-2.5 group cursor-pointer">
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
       <Button type="button" variant="ghost" className="w-full h-7 rounded-xl text-xs font-semibold tracking-wider text-stone-400 hover:text-stone-900 hover:bg-stone-50 border border-stone-100 transition-all" onClick={() => navigate('/notifications')}>
        {t('View Full History', 'Πλήρες ιστορικό')}
       </Button>
      </Card>

      {/* Achievements */}
      <Card className="p-4 border-stone-100 bg-white space-y-3">
       <div>
        <h3 className="text-sm font-semibold text-stone-900">{t('Achievements', 'Επιτεύγματα')}</h3>
        <p className="text-xs text-stone-400">{t('Verified milestone credentials', 'Επαληθευμένα διαπιστευτήρια οροσήμων')}</p>
       </div>
       <div className="grid grid-cols-2 gap-2">
        {[
         { name: t('Early Bird', 'Πρώιμη εγγραφή'),   icon: Rocket, unlocked: true, promptName: 'Early Bird' },
         { name: t('Networker', 'Δικτύωση'),    icon: Users,  unlocked: true, promptName: 'Networker' },
         { name: t('Pitch Master', 'Άσος στο pitch'), icon: Zap,    unlocked: false, promptName: 'Pitch Master' },
         { name: t('Funded', 'Με χρηματοδότηση'),       icon: Star,   unlocked: false, promptName: 'Funded' },
        ].map((badge, i) => (
         <div key={i} role="button" tabIndex={0} onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Tell me about readiness score and the ${badge.promptName} achievement` } }))} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Tell me about readiness score and the ${badge.promptName} achievement` } })); }} className={cn(
          "p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all group cursor-pointer",
          badge.unlocked ? "bg-white border-stone-100 hover:border-stone-300 hover:shadow-sm" : "bg-stone-50 border-stone-100 opacity-40 grayscale"
         )}>
          <div className={cn(
           "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
           badge.unlocked ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-400"
          )}>
           <badge.icon className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-stone-700 tracking-wider text-center">{badge.name}</p>
         </div>
        ))}
       </div>
      </Card>

      {/* Strategic Insight — light amber version */}
      <div className="studio-nudge bg-amber-50 border border-amber-100 rounded-2xl space-y-3">
       <p className="text-xs font-semibold text-stone-400 tracking-wider">{t('Strategic insight', 'Στρατηγική εικόνα')}</p>
       <p className="text-sm text-stone-700 leading-relaxed">
        {t('Teams over 80% readiness are modeled as 3× more likely to close in six months.', 'Ομάδες πάνω από 80% ετοιμότητα εμφανίζονται 3× πιο πιθανό να κλείσουν γύρο σε έξι μήνες.')}
       </p>
       <p className="text-xs text-stone-500">{t('Next: fill skills and looking-for on Profile so the score can move.', 'Επόμενο: συμπλήρωσε δεξιότητες και τι ζητάς στο προφίλ, ώστε να κινηθεί ο δείκτης.')}</p>
       <div className="flex gap-2">
        <Button onClick={() => navigate('/profile')} className="flex-1 h-7 rounded-lg bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800">
         {t('Optimize Score', 'Βελτιστοποίηση δείκτη')}
        </Button>
        <Button type="button" variant="outline" className="h-7 rounded-lg text-sm" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'Tell me about readiness score' } }))}>
         {t('Ask', 'Ρώτα')}
        </Button>
       </div>
      </div>

     </aside>
    </div>
   </div>
  </PageShell>
 );
}
