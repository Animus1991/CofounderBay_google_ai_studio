import {
 useEffect,
 useMemo,
 useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/ui/PageShell";
import { motion } from "motion/react";
import {
 TrendingUp,
 Award,
 Star,
 Calendar,
 Users,
 Target,
 Zap,
 Rocket,
 ArrowUpRight
} from "lucide-react";
import {
 XAxis, YAxis, CartesianGrid,
 Tooltip, ResponsiveContainer, AreaChart, Area,
 BarChart, Bar
} from 'recharts';
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { cn } from "../lib/utils";
import { User, UserProfile } from "../types";
import { keys, readActivity, readRequests, readRound, readSaved, readTracked, readValue, writeValue, type ActivityItem } from "../lib/localLists";
import { useStored } from "../lib/useStored";
import { usePageControls } from "../lib/pageControls";
import { useLanguage, useT } from "../lib/language";
import { localizeAxisLabel } from "../lib/dates";
import { useAuth } from "../App";
import { mergeFitIntoViewer } from "../lib/fitCheck";
import EmptyHint, { AskLink } from "../components/ui/EmptyHint";
import { DEMO_ACTIVITY, DEMO_READINESS, demoActivityDelta, demoReadinessDelta } from "../data/demoStats";

interface InsightsProps {
 user: User;
}

const DAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type ScorePoint = { at: string; score: number };

/** Readiness = share of the profile fields matching actually reads. */
function profileCompleteness(profile: UserProfile | null): number {
 if (!profile) return 0;
 const fields = [
  (profile.skills?.length ?? 0) > 0,
  (profile.lookingFor?.length ?? 0) > 0,
  Boolean(profile.stage),
  Boolean(profile.commitment),
  Boolean(profile.location),
  Boolean(profile.headline),
  Boolean(profile.bio),
  Boolean(profile.company),
 ];
 return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

export default function Insights({ user }: InsightsProps) {
 const t = useT();
 const { mode } = useLanguage();
 const navigate = useNavigate();
 const { profile, isDemoMode } = useAuth();
 const [activeRange, setActiveRange] = useState('7D');

 usePageControls(() => [
  { id: 'range-24h', en: 'Last 24 hours', el: 'Τελευταίες 24 ώρες', run: () => setActiveRange('24H') },
  { id: 'range-7d', en: 'Last 7 days', el: 'Τελευταίες 7 ημέρες', run: () => setActiveRange('7D') },
  { id: 'range-30d', en: 'Last 30 days', el: 'Τελευταίες 30 ημέρες', run: () => setActiveRange('30D') },
 ], []);
 const studioActivity = useStored(readActivity, [keys.activity]);
 const saved = useStored(readSaved, [keys.saved]);
 const requests = useStored(readRequests, [keys.requests]);
 const tracked = useStored(readTracked, [keys.tracked]);
 const round = useStored(readRound, [keys.round]);
 const pitch = useStored(() => readValue<Record<string, string>>(keys.pitch, {}), [keys.pitch]);
 const history = useStored(() => readValue<ScorePoint[]>(keys.readiness, []), [keys.readiness]);

 const merged = useMemo(() => mergeFitIntoViewer(profile), [profile]);
 const readinessScore = isDemoMode ? 85 : profileCompleteness(merged);

 // Persist one score point a day so the progression chart is real.
 useEffect(() => {
  if (isDemoMode) return;
  const last = history[history.length - 1];
  const dayAgo = Date.now() - 20 * 3600 * 1000;
  if (!last || new Date(last.at).getTime() < dayAgo || last.score !== readinessScore) {
   writeValue(keys.readiness, [...history, { at: new Date().toISOString(), score: readinessScore }].slice(-60));
  }
 }, [isDemoMode, readinessScore]); // eslint-disable-line react-hooks/exhaustive-deps -- history is intentionally read once per score change

 const rangeDays: Record<string, number> = { '24H': 1, '7D': 7, '30D': 30, ALL: 3650 };
 const days = rangeDays[activeRange] ?? 7;
 const cutoff = Date.now() - days * 86400000;

 const readinessView = useMemo(() => {
  const axis = (name: string) => localizeAxisLabel(name, mode);
  if (isDemoMode) {
   // The sample covers one week: 24H shows the last point, wider ranges show it all.
   const sample = activeRange === '24H' ? DEMO_READINESS.slice(-1) : DEMO_READINESS;
   return sample.map((p) => ({ ...p, name: axis(p.name) }));
  }
  const points = history.filter((p) => new Date(p.at).getTime() >= cutoff);
  return points.map((p) => {
   const d = new Date(p.at);
   return { name: axis(DAY_EN[d.getDay()] ?? ''), score: p.score };
  });
 }, [isDemoMode, activeRange, history, cutoff, mode]);

 const readinessDelta = useMemo(() => {
  if (isDemoMode) return demoReadinessDelta();
  const points = history;
  if (points.length < 2) return null;
  return points[points.length - 1]!.score - points[0]!.score;
 }, [isDemoMode, history]);

 // Real weekly engagement: activity entries grouped by weekday.
 const activityView = useMemo(() => {
  const axis = (name: string) => localizeAxisLabel(name, mode);
  if (isDemoMode) {
   const sample = activeRange === '24H' ? DEMO_ACTIVITY.slice(-1) : DEMO_ACTIVITY;
   return sample.map((row) => ({ ...row, name: axis(row.name) }));
  }
  const week: { name: string; connections: number; messages: number; views: number }[] = [];
  for (let i = 6; i >= 0; i--) {
   const d = new Date(Date.now() - i * 86400000);
   const key = d.toISOString().slice(0, 10);
   const items = studioActivity.filter((a) => a.at.slice(0, 10) === key);
   week.push({
    name: axis(DAY_EN[d.getDay()] ?? ''),
    connections: items.filter((a) => a.kind === 'request' || a.kind === 'connection' || a.kind === 'community').length,
    messages: items.filter((a) => a.kind === 'message').length,
    views: items.filter((a) => a.kind !== 'request' && a.kind !== 'connection' && a.kind !== 'community' && a.kind !== 'message').length,
   });
  }
  return week;
 }, [isDemoMode, activeRange, studioActivity, mode]);

 const lastScore = readinessView[readinessView.length - 1]?.score ?? readinessScore;
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
 const signedPct = (n: number | null) => (n == null ? null : `${n >= 0 ? '+' : ''}${n}%`);

 const kpis = isDemoMode
  ? [
   { label: t("Readiness Score", "Δείκτης ετοιμότητας"), value: `${lastScore}%`, change: `+${demoReadinessDelta()}pts`, icon: Target, dot: "bg-amber-400", bar: "bg-amber-400", pct: lastScore, href: '/profile' },
   { label: t("Profile Views", "Προβολές προφίλ"), value: String(viewSum), change: signedPct(demoActivityDelta('views')), icon: Users, dot: "bg-blue-400", bar: "bg-blue-400", pct: Math.min(100, viewSum), href: '/network' },
   { label: t("Connections", "Συνδέσεις"), value: String(connectSum), change: signedPct(demoActivityDelta('connections')), icon: Zap, dot: "bg-violet-400", bar: "bg-violet-400", pct: Math.min(100, connectSum * 8), href: '/network' },
   { label: t("Activity Score", "Δείκτης δραστηριότητας"), value: `${Math.min(99, 70 + connectSum)}%`, change: signedPct(demoActivityDelta('messages')), icon: TrendingUp, dot: "bg-emerald-400", bar: "bg-emerald-400", pct: Math.min(99, 70 + connectSum), href: '/notifications' },
  ]
  : [
   { label: t("Readiness Score", "Δείκτης ετοιμότητας"), value: `${readinessScore}%`, change: readinessDelta == null ? null : `${readinessDelta >= 0 ? '+' : ''}${readinessDelta}pts`, icon: Target, dot: "bg-amber-400", bar: "bg-amber-400", pct: readinessScore, href: '/profile' },
   { label: t("Saved people", "Αποθηκευμένοι"), value: String(saved.length), change: null, icon: Users, dot: "bg-blue-400", bar: "bg-blue-400", pct: Math.min(100, saved.length * 10), href: '/network' },
   { label: t("Requests sent", "Αιτήματα"), value: String(requests.length), change: null, icon: Zap, dot: "bg-violet-400", bar: "bg-violet-400", pct: Math.min(100, requests.length * 12), href: '/network' },
   { label: t("Applications", "Αιτήσεις"), value: String(tracked.length), change: null, icon: TrendingUp, dot: "bg-emerald-400", bar: "bg-emerald-400", pct: Math.min(100, tracked.length * 20), href: '/fundraising' },
  ];

 const feed = [
  ...studioActivity.slice(0, 4).map((item: ActivityItem) => ({
   user: item.byAssistant ? t('Assistant', 'Βοηθός') : (user.fullName?.split(' ')[0] || you),
   action: t(item.title, item.titleEl ?? item.title),
   time: item.at.slice(11, 16) || '',
   icon: Zap,
   bg: 'bg-stone-50',
   ic: 'text-stone-600',
   href: item.href || '/notifications',
  })),
  ...(isDemoMode ? [
   { user: 'Alex Rivera', action: t('connected with you', 'συνδέθηκε μαζί σου'), time: t('2h ago', 'πριν 2 ώρες'), icon: Users, bg: 'bg-stone-50', ic: 'text-stone-600', href: '/network' },
   { user: you, action: t('reached 85% Readiness Score', 'έφτασε 85% στον δείκτη ετοιμότητας'), time: t('5h ago', 'πριν 5 ώρες'), icon: Award, bg: 'bg-amber-50', ic: 'text-amber-600', href: '/profile' },
   { user: 'Sarah Chen', action: t('sent you a message', 'σου έστειλε μήνυμα'), time: t('1d ago', 'πριν 1 ημέρα'), icon: Zap, bg: 'bg-violet-50', ic: 'text-violet-600', href: '/messages' },
   { user: you, action: t('registered for Pitch Night', 'εγγράφηκε στη βραδιά pitch'), time: t('2d ago', 'πριν 2 ημέρες'), icon: Calendar, bg: 'bg-blue-50', ic: 'text-blue-600', href: '/events' },
  ] : []),
 ].slice(0, 4);

 const pitchFilled = Object.values(pitch ?? {}).filter((v) => typeof v === 'string' && v.trim()).length;
 const badges = [
  { name: t('Early Bird', 'Πρώιμη εγγραφή'), icon: Rocket, unlocked: isDemoMode || Boolean(profile), promptName: 'Early Bird' },
  { name: t('Networker', 'Δικτύωση'), icon: Users, unlocked: saved.length + requests.length >= 3, promptName: 'Networker' },
  { name: t('Pitch Master', 'Άσος στο pitch'), icon: Zap, unlocked: pitchFilled >= 3, promptName: 'Pitch Master' },
  { name: t('Funded', 'Με χρηματοδότηση'), icon: Star, unlocked: round.committedAmount > 0, promptName: 'Funded' },
 ];

 return (
  <PageShell sample={isDemoMode} title={t("Insights", "Αναλυτικά στοιχεία")} description={t("Analytics and performance intelligence for your startup journey.", "Αναλυτικά και εικόνα απόδοσης για τη διαδρομή του startup σου.")}>
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
        {stat.change ? (
         <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 px-2 py-0.5 rounded-md">
          <ArrowUpRight className="w-2.5 h-2.5" />{stat.change}
         </div>
        ) : null}
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
         <p className="text-xs text-stone-400">{isDemoMode ? t('Venture maturity over time', 'Ωριμότητα του εγχειρήματος στον χρόνο') : t('How complete your profile is — matching reads these fields', 'Πόσο πλήρες είναι το προφίλ σου — αυτά διαβάζει η αντιστοίχιση')}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-50 rounded-lg border border-stone-100">
         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
         <span className="text-xs font-semibold text-stone-500 tracking-wider">{t('Live', 'Ζωντανά')}</span>
        </div>
       </div>
       {readinessChart.length === 0 ? (
        <EmptyHint
         title={t('No score history yet.', 'Δεν υπάρχει ιστορικό δείκτη ακόμη.')}
         detail={t('Your readiness is recorded once a day — complete profile fields move it.', 'Ο δείκτης καταγράφεται μια φορά την ημέρα — πλήρη πεδία προφίλ τον ανεβάζουν.')}
        >
         <AskLink prompt="How do I raise my readiness score?" />
        </EmptyHint>
       ) : (
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
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a8a29e' }} dx={-8} domain={[0, 100]} />
          <Tooltip
           contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', fontSize: '11px', padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
           itemStyle={{ color: '#1c1917' }}
           cursor={{ stroke: '#d6d3d1', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area type="monotone" dataKey="score" name={t('Score', 'Δείκτης')} stroke="#1c1917" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" animationDuration={1500} activeDot={{ r: 5, fill: '#1c1917', stroke: '#fff', strokeWidth: 2 }} />
         </AreaChart>
        </ResponsiveContainer>
       </div>
       )}
      </Card>

      {/* Weekly Engagement Chart */}
      <Card className="p-4 border-stone-100 bg-white">
       <div className="flex items-center justify-between mb-3">
        <div>
         <h3 className="text-sm font-semibold text-stone-900">{t('Weekly Engagement', 'Εβδομαδιαία δραστηριότητα')}</h3>
         <p className="text-xs text-stone-400">{isDemoMode ? t('Connections · Messages · Views', 'Συνδέσεις · Μηνύματα · Προβολές') : t('Your actions this week, by kind', 'Οι ενέργειές σου αυτή την εβδομάδα, ανά είδος')}</p>
        </div>
        <div className="flex items-center gap-3">
         {[{ label: t("Connect", "Σύνδεση"), color: "bg-stone-900" }, { label: t("Message", "Μήνυμα"), color: "bg-stone-400" }, { label: isDemoMode ? t("View", "Προβολή") : t("Other", "Άλλες"), color: "bg-stone-200" }].map(({ label, color }) => (
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
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a8a29e' }} dx={-8} allowDecimals={false} />
          <Tooltip
           cursor={{ fill: '#fafaf9' }}
           contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', fontSize: '11px', padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
          />
          <Bar dataKey="connections" name={t('Connections', 'Συνδέσεις')} fill="#1c1917" radius={[4, 4, 0, 0]} barSize={14} />
          <Bar dataKey="messages"    name={t('Messages', 'Μηνύματα')} fill="#78716c" radius={[4, 4, 0, 0]} barSize={14} />
          <Bar dataKey="views"       name={isDemoMode ? t('Views', 'Προβολές') : t('Other actions', 'Λοιπές ενέργειες')} fill="#d6d3d1" radius={[4, 4, 0, 0]} barSize={14} />
         </BarChart>
        </ResponsiveContainer>
       </div>
      </Card>
      {isDemoMode && (activeRange === '30D' || activeRange === 'ALL') && (
       <p className="text-xs text-stone-400 text-center">{t('Sample covers one week', 'Το δείγμα καλύπτει μία εβδομάδα')}</p>
      )}
     </div>

     {/* Sidebar */}
     <aside className="lg:col-span-4 space-y-4">

      {/* Activity Feed */}
      <Card className="p-4 border-stone-100 bg-white" contentClassName="space-y-3">
       <div>
        <h3 className="text-sm font-semibold text-stone-900">{t('Activity Feed', 'Ροή δραστηριότητας')}</h3>
        <p className="text-xs text-stone-400">{isDemoMode ? t('Sample ecosystem updates', 'Δειγματικές ενημερώσεις οικοσυστήματος') : t('Your recent activity', 'Η πρόσφατη δραστηριότητά σου')}</p>
       </div>
       <div className="space-y-3">
        {feed.length === 0 && (
         <p className="text-sm text-stone-400">{t('Nothing yet — your actions appear here.', 'Τίποτα ακόμη — οι ενέργειές σου εμφανίζονται εδώ.')}</p>
        )}
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
      <Card className="p-4 border-stone-100 bg-white" contentClassName="space-y-3">
       <div>
        <h3 className="text-sm font-semibold text-stone-900">{t('Achievements', 'Επιτεύγματα')}</h3>
        <p className="text-xs text-stone-400">{t('Unlocked by what you actually do', 'Ξεκλειδώνονται από τις πραγματικές σου ενέργειες')}</p>
       </div>
       <div className="grid grid-cols-2 gap-2">
        {badges.map((badge, i) => (
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

      {/* Strategic Insight — honest, no fabricated stats */}
      <div className="studio-nudge bg-amber-50 border border-amber-100 rounded-2xl space-y-3">
       <p className="text-xs font-semibold text-stone-400 tracking-wider">{t('Strategic insight', 'Στρατηγική εικόνα')}</p>
       <p className="text-sm text-stone-700 leading-relaxed">
        {t('Your readiness score is the share of profile fields matching reads — a complete profile produces sharper matches.', 'Ο δείκτης ετοιμότητας είναι το ποσοστό των πεδίων που διαβάζει η αντιστοίχιση — πλήρες προφίλ σημαίνει καλύτερες αντιστοιχίσεις.')}
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
