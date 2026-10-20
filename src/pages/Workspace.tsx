import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
 Layout, 
 CheckSquare, 
 Target, 
 Trophy, 
 Calendar as CalendarIcon, 
 Plus, 
 Search, 
 Filter, 
 MoreVertical, 
 ChevronRight, 
 Clock, 
 AlertCircle, 
 Sparkles, 
 Zap,
 ArrowRight,
 FileText,
 Layers,
 MessageSquare,
 Save,
 Timer,
 Play,
 Pause,
 Square,
 LayoutGrid,
 List,
 Columns,
 TrendingUp,
 Focus,
 Coffee,
 Moon,
 Sun,
 GripVertical,
 CalendarDays,
 Clock3,
 CheckCircle,
 BarChart3,
 Flame,
 Music,
 Headphones,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageShell from "../components/ui/PageShell";
import { User } from "../types";
import { cn } from "../lib/utils";
import { addStudioTask, keys, readMilestones, readSessions, readTasks, readValue, writeValue, type StudioTask } from "../lib/localLists";
import { useStored } from "../lib/useStored";
import { usePageControls } from "../lib/pageControls";
import { BUILDER_MODULES, builderStatus, readBuilderInputs } from "../lib/builder";
import { useT } from "../lib/language";
import { labelOf } from "../lib/labels";
import { formatDate } from "../lib/dates";
import { useAuth } from "../App";
import { studioNextStep } from "../lib/nextStep";
import { uploadFile, formatBytes, type UploadFolder } from "../lib/files";
import { safeMediaUrl } from "../lib/webUrl";
import type { Milestone } from "../types";

interface WorkspaceProps {
 user: User;
}

type TabType = "Dashboard" | "Builder" | "Canvas" | "Milestones" | "Calendar";
type TaskView = "list" | "kanban";
type FocusMode = "work" | "shortBreak" | "longBreak";

type Task = StudioTask;

type FocusStats = { date: string; seconds: number; sessions: number };
type CanvasDraft = Record<string, string>;
type AssetRow = { name: string; size: string; url?: string; path?: string };

const CANVAS_SECTIONS = [
 { key: 'problem', title: 'Problem' },
 { key: 'solution', title: 'Solution' },
 { key: 'keyMetrics', title: 'Key Metrics' },
 { key: 'uvp', title: 'Unique Value Prop' },
 { key: 'advantage', title: 'Unfair Advantage' },
] as const;

// Demo-only canvas content — real members start from their own draft.
const DEMO_CANVAS: CanvasDraft = {
 problem: 'Existing solutions are too complex and expensive for early-stage startups.',
 solution: 'A minimalist, AI-powered workspace designed specifically for founders.',
 keyMetrics: 'Daily Active Users, Task Completion Rate, Retention.',
 uvp: 'The only workspace that actively guides you through the startup lifecycle.',
 advantage: 'Proprietary AI matching engine and exclusive mentor network.',
};

const todayKey = () => new Date().toISOString().slice(0, 10);

export default function Workspace({ user }: WorkspaceProps) {
 const t = useT();
 const { profile, isDemoMode } = useAuth();
 const [activeTab, setActiveTab] = useState<TabType>("Dashboard");
 const [searchQuery, setSearchQuery] = useState("");
 const [taskView, setTaskView] = useState<TaskView>("list");
 const [focusMode, setFocusMode] = useState(false);
 const [focusTimer, setFocusTimer] = useState(25 * 60); // 25 minutes in seconds
 const [focusState, setFocusState] = useState<FocusMode>("work");
 const [isTimerRunning, setIsTimerRunning] = useState(false);
 const focusStats = useStored(() => {
  const stats = readValue<FocusStats>(keys.focus, { date: todayKey(), seconds: 0, sessions: 0 });
  return stats.date === todayKey() ? stats : { date: todayKey(), seconds: 0, sessions: 0 };
 }, [keys.focus]);
 useEffect(() => {
  if (!isTimerRunning || focusTimer <= 0) return;
  const interval = setInterval(() => {
   setFocusTimer(prev => {
    if (prev <= 1) {
     setIsTimerRunning(false);
     // A finished work block is a real recorded session.
     if (focusState === 'work') {
      const stats = focusStats.date === todayKey() ? focusStats : { date: todayKey(), seconds: 0, sessions: 0 };
      writeValue(keys.focus, { date: todayKey(), seconds: stats.seconds + 25 * 60, sessions: stats.sessions + 1 });
     }
     return 0;
    }
    return prev - 1;
   });
  }, 1000);
  return () => clearInterval(interval);
 }, [isTimerRunning, focusTimer, focusState, focusStats]);
 const [activeTask, setActiveTask] = useState<string | null>(null);
 const [roadmapFilter, setRoadmapFilter] = useState<'All' | 'completed' | 'in-progress' | 'pending'>('All');
 const tasks = useStored(readTasks, [keys.tasks]);
 const milestones = useStored(readMilestones, [keys.milestones]);
 const sessions = useStored(readSessions, [keys.sessions]);
 const canvas = useStored(() => readValue<CanvasDraft>(keys.canvas, {}), [keys.canvas]);
 const builderInputs = useStored(readBuilderInputs, [keys.builderInputs]);

 usePageControls(() => [
  { id: 'toggle-focus', en: focusMode ? 'Exit focus mode' : 'Start focus mode', el: focusMode ? 'Έξοδος από εστίαση' : 'Έναρξη εστίασης', run: () => setFocusMode((prev) => !prev) },
  { id: 'add-milestone', en: 'Add milestone', el: 'Προσθήκη ορόσημου', run: () => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'add milestone' } })) },
 ], [focusMode]);
 const assets = useStored(() => readValue<AssetRow[]>(keys.assets, []), [keys.assets]);
 const nextStep = useMemo(() => studioNextStep(profile), [profile]);

 // The gantt rows are real milestones: bar = createdAt → targetDate over an
 // 8-week window starting at the earliest milestone.
 const roadmapData = useMemo(() => {
  const demoRows = isDemoMode ? [
   { name: "MVP Launch", category: "Product", start: 0, duration: 3, status: "completed" as const, color: "bg-emerald-400" },
   { name: "Beta Testing", category: "Product", start: 2, duration: 4, status: "in-progress" as const, color: "bg-violet-400" },
   { name: "Seed Funding", category: "Fundraising", start: 3, duration: 5, status: "in-progress" as const, color: "bg-amber-400" },
   { name: "First 100 Users", category: "Growth", start: 5, duration: 3, status: "pending" as const, color: "bg-stone-300" },
   { name: "Product Hunt Launch", category: "Marketing", start: 7, duration: 2, status: "pending" as const, color: "bg-blue-400" },
  ] : [];
  const real = milestones
   .filter((m) => m.targetDate)
   .map((m) => ({ m, created: new Date(m.createdAt).getTime(), target: new Date(m.targetDate).getTime() }))
   .filter((row) => Number.isFinite(row.created) && Number.isFinite(row.target))
   .sort((a, b) => a.created - b.created);
  const t0 = real[0]?.created ?? Date.now();
  const week = 7 * 86400000;
  const toStatus = (m: Milestone) => m.status === 'Completed' ? 'completed' as const : m.status === 'In Progress' ? 'in-progress' as const : 'pending' as const;
  const toColor = (status: string, i: number) =>
   status === 'completed' ? 'bg-emerald-400' : status === 'in-progress' ? 'bg-violet-400' : ['bg-stone-300', 'bg-amber-400', 'bg-blue-400'][i % 3]!;
  const rows = real.map(({ m, created, target }, i) => ({
   name: m.title,
   category: m.category || 'General',
   start: Math.max(0, Math.min(7, Math.round((created - t0) / week))),
   duration: Math.max(1, Math.min(8, Math.ceil((target - created) / week))),
   status: toStatus(m),
   color: toColor(toStatus(m), i),
  }));
  return { rows: [...demoRows, ...rows], startTs: t0 };
 }, [isDemoMode, milestones]);
 const roadmap = roadmapData.rows;
 const roadmapTodayPct = Math.max(0, Math.min(100, ((Date.now() - roadmapData.startTs) / (8 * 7 * 86400000)) * 100));
 const visibleRoadmap = roadmapFilter === 'All' ? roadmap : roadmap.filter((item) => item.status === roadmapFilter);

 const taskQuery = searchQuery.trim().toLowerCase();
 const visibleTasks = tasks.filter((task) => !taskQuery || task.title.toLowerCase().includes(taskQuery) || task.tags.some((tag) => tag.toLowerCase().includes(taskQuery)));
 const addTask = (title?: string) => {
  addStudioTask((title ?? searchQuery).trim() || 'New task');
  setSearchQuery('');
 };
 const ask = (prompt: string) => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt } }));

 const tabs: TabType[] = ["Dashboard", "Builder", "Canvas", "Milestones", "Calendar"];
 const tabLabel = (tab: TabType) => ({
  Dashboard: t("Dashboard", "Πίνακας ελέγχου"),
  Builder: t("Builder", "Δημιουργός"),
  Canvas: t("Canvas", "Καμβάς"),
  Milestones: t("Milestones", "Ορόσημα"),
  Calendar: t("Calendar", "Ημερολόγιο"),
 }[tab]);
 const deadlineLabel = (value: string) => {
  if (value === "Today") return t("Today", "Σήμερα");
  if (value === "Tomorrow") return t("Tomorrow", "Αύριο");
  if (value === "2d left") return t("2d left", "απομένουν 2 ημ.");
  if (value === "Done") return labelOf("Done");
  if (value === "New") return t("New", "Νέο");
  const match = /^(\d+)d left$/.exec(value);
  if (match) return t(`${match[1]}d left`, `απομένουν ${match[1]} ημ.`);
  return value;
 };
 const canvasTitle = (title: string) => ({
  Problem: t("Problem", "Πρόβλημα"),
  Solution: t("Solution", "Λύση"),
  "Key Metrics": t("Key Metrics", "Βασικοί δείκτες"),
  "Unique Value Prop": t("Unique Value Prop", "Μοναδική αξία"),
  "Unfair Advantage": t("Unfair Advantage", "Μοναδικό συγκριτικό πλεονέκτημα"),
 }[title] ?? title);
 const weekLabel = (w: string) => t(w, w.replace("W", "Ε"));
 const focusStateLabel = (mode: FocusMode) =>
  mode === "work" ? t("Deep Work", "Εστιασμένη εργασία") : mode === "shortBreak" ? t("Short Break", "Σύντομο διάλειμμα") : t("Long Break", "Μεγάλο διάλειμμα");

 // Real milestone stats — same list the Milestones page reads.
 const milestoneStats = useMemo(() => {
  const total = milestones.length;
  const done = milestones.filter((m) => m.status === 'Completed').length;
  const active = milestones.filter((m) => m.status === 'In Progress').length;
  const overdue = milestones.filter((m) => m.status !== 'Completed' && m.targetDate && new Date(m.targetDate).getTime() < Date.now()).length;
  return { total, done, active, overdue };
 }, [milestones]);

 // Canvas draft — real accounts persist their own text, demo starts filled.
 const saveCanvas = () => {
  writeValue(keys.canvas, canvas);
 };
 const setCanvasField = (key: string, value: string) => {
  writeValue(keys.canvas, { ...canvas, [key]: value });
 };
 const canvasValue = (key: string) => canvas[key] ?? (isDemoMode ? DEMO_CANVAS[key] ?? '' : '');

 // Calendar — real month navigation and real session markers.
 const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
 const calDays = useMemo(() => {
  const first = new Date(calMonth.year, calMonth.month, 1);
  const daysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7; // Monday-first grid
  const cells: (number | null)[] = [...Array(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  return cells;
 }, [calMonth]);
 const sessionDays = useMemo(() => {
  const set = new Set<string>();
  for (const s of sessions) {
   const d = new Date(s.time);
   if (Number.isFinite(d.getTime())) set.add(d.toISOString().slice(0, 10));
  }
  return set;
 }, [sessions]);
 const dayKey = (day: number) => `${calMonth.year}-${String(calMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
 const sessionsOn = (day: number) => sessions.filter((s) => s.time.slice(0, 10) === dayKey(day));
 const todaySessions = sessions.filter((s) => s.time.slice(0, 10) === todayKey());
 const weekSessions = sessions
  .filter((s) => { const ts = new Date(s.time).getTime(); return ts >= Date.now() && ts < Date.now() + 7 * 86400000; })
  .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
  .slice(0, 5);

 const addAsset = async (file: File | null) => {
  if (!file) return;
  const row: AssetRow = { name: file.name, size: formatBytes(file.size) };
  if (!isDemoMode && user.id) {
   try {
    const uploaded = await uploadFile(file, { folder: 'assets' as UploadFolder, uid: user.id });
    row.url = uploaded.url; row.path = uploaded.path; row.size = formatBytes(uploaded.size);
   } catch { /* keep the local row without a link */ }
  }
  writeValue(keys.assets, [row, ...assets.filter((a) => a.name !== row.name)]);
 };

 return (
  <PageShell
   sample={isDemoMode}
   title={t("Venture Builder", "Χώρος εργασίας")}
   description={t("Your startup's central workspace — tasks, canvas, milestones, and calendar.", "Ο κεντρικός χώρος εργασίας του startup — εργασίες, canvas, ορόσημα και ημερολόγιο.")}
   maxWidth="full"
   actions={
    <div className="scroll-tabs bg-stone-50 p-1 rounded-xl border border-stone-100">
     {tabs.map((tab) => (
      <button
       key={tab}
       onClick={() => setActiveTab(tab)}
       className={cn(
        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
        activeTab === tab
         ? "bg-stone-900 text-white shadow-sm"
         : "text-stone-400 hover:text-stone-700"
       )}
      >
       {tabLabel(tab)}
      </button>
     ))}
    </div>
   }
  >

   <AnimatePresence mode="wait">
    {activeTab === "Dashboard" && (
     <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-5"
     >
      {/* Left Column - Tasks & Progress */}
      <div className="lg:col-span-8 space-y-4">
       <section className="card-minimal p-5">
        <div className="flex items-center justify-between mb-5">
         <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-stone-900">{t("Active Sprint", "Ενεργό sprint")}</h3>
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-stone-50 p-0.5 rounded-lg border border-stone-100">
           <button 
            onClick={() => setTaskView("list")}
            className={cn(
             "px-2 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1",
             taskView === "list" ? "bg-white text-stone-900 shadow-sm" : "text-stone-400 hover:text-stone-600"
            )}
           >
            <List className="w-3 h-3" /> {t("List", "Λίστα")}
           </button>
           <button 
            onClick={() => setTaskView("kanban")}
            className={cn(
             "px-2 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1",
             taskView === "kanban" ? "bg-white text-stone-900 shadow-sm" : "text-stone-400 hover:text-stone-600"
            )}
           >
            <LayoutGrid className="w-3 h-3" /> {t("Kanban", "Kanban")}
           </button>
          </div>
         </div>
         <div className="flex items-center gap-2">
          <div className="relative w-40 group">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
           <input 
            type="text" 
            placeholder={t("Search tasks...", "Αναζήτηση…")} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-50 border border-stone-100 rounded-lg py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 transition-all"
           />
          </div>
          <Button
           size="sm"
           className="rounded-lg h-7 bg-stone-900 text-white text-sm px-3"
           onClick={() => addTask()}
          >
           <Plus className="w-3.5 h-3.5 mr-1" /> {t("Task", "Εργασία")}
          </Button>
         </div>
        </div>

        {/* List View */}
        {taskView === "list" && (
         <div className="space-y-2">
          {visibleTasks.filter((task) => task.status !== "Done").map((task) => (
           <div 
            key={task.id} 
            onClick={() => setActiveTask(activeTask === task.id ? null : task.id)}
            className={cn(
             "group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
             activeTask === task.id ? "border-stone-300 bg-stone-50" : "border-stone-100 hover:border-stone-200 hover:bg-stone-50"
            )}
           >
            <div className="flex items-center gap-3">
             <div className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0",
              task.priority === "High" ? "bg-red-400" : task.priority === "Medium" ? "bg-amber-400" : "bg-blue-400"
             )} />
             <div>
              <h4 className="text-sm font-semibold text-stone-900">{task.title}</h4>
              <div className="flex items-center gap-2 mt-0.5">
               <span className={cn(
                "text-xs tracking-wider font-medium",
                task.status === "In Progress" ? "text-violet-500" : 
                task.status === "Review" ? "text-amber-500" : 
                task.status === "Done" ? "text-emerald-500" : "text-stone-400"
               )}>{labelOf(task.status)}</span>
               <span className="w-1 h-1 bg-stone-200 rounded-full" />
               <span className="text-xs text-stone-400 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> {deadlineLabel(task.deadline)}
               </span>
               {/* Time tracking indicator */}
               {task.timeTracked > 0 && (
                <>
                 <span className="w-1 h-1 bg-stone-200 rounded-full" />
                 <span className="text-xs text-stone-400 flex items-center gap-1">
                  <Timer className="w-2.5 h-2.5" /> {Math.floor(task.timeTracked / 60)}h {task.timeTracked % 60}m
                 </span>
                </>
               )}
              </div>
             </div>
            </div>
            <div className="flex items-center gap-2">
             {/* Tags */}
             <div className="flex gap-1">
              {task.tags.slice(0, 2).map(tag => (
               <span key={tag} className="px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded text-xs">{labelOf(tag)}</span>
              ))}
             </div>
             <ChevronRight className={cn(
              "w-3.5 h-3.5 transition-colors",
              activeTask === task.id ? "text-stone-500" : "text-stone-200 group-hover:text-stone-500"
             )} />
            </div>
           </div>
          ))}
         </div>
        )}

        {/* Kanban View */}
        {taskView === "kanban" && (
         <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {["Todo", "In Progress", "Review", "Done"].map((status) => (
           <div key={status} className="space-y-2">
            <div className="flex items-center justify-between px-1">
             <span className={cn(
              "text-xs font-semibold tracking-wider",
              status === "In Progress" ? "text-violet-500" : 
              status === "Review" ? "text-amber-500" : 
              status === "Done" ? "text-emerald-500" : "text-stone-400"
             )}>{labelOf(status)}</span>
             <span className="text-xs text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">
              {visibleTasks.filter((task) => task.status === status).length}
             </span>
            </div>
            <div className="space-y-2">
             {visibleTasks.filter((task) => task.status === status).length === 0 && (
              <p className="text-xs text-stone-400 px-1">{t("No items", "Κανένα")}</p>
             )}
             {visibleTasks.filter((task) => task.status === status).map((task) => (
              <div 
               key={task.id}
               className="p-3 bg-white border border-stone-100 rounded-xl hover:border-stone-300 hover:shadow-sm transition-all cursor-pointer group"
              >
               <div className="flex items-start justify-between mb-2">
                <div className={cn(
                 "w-1.5 h-1.5 rounded-full",
                 task.priority === "High" ? "bg-red-400" : task.priority === "Medium" ? "bg-amber-400" : "bg-blue-400"
                )} />
                <GripVertical className="w-3 h-3 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
               </div>
               <h4 className="text-sm font-medium text-stone-900 mb-2">{task.title}</h4>
               <div className="flex items-center justify-between">
                <div className="flex gap-1">
                 {task.tags.slice(0, 1).map(tag => (
                  <span key={tag} className="px-1 py-0.5 bg-stone-50 text-stone-400 rounded text-xs">{labelOf(tag)}</span>
                 ))}
                </div>
                {task.timeTracked > 0 && (
                 <span className="text-xs text-stone-400 flex items-center gap-0.5">
                  <Timer className="w-2.5 h-2.5" /> {Math.floor(task.timeTracked / 60)}h
                 </span>
                )}
               </div>
              </div>
             ))}
            </div>
           </div>
          ))}
         </div>
        )}
       </section>

       <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-minimal p-4 space-y-3">
         <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-stone-50 text-stone-700 flex items-center justify-center border border-stone-100">
           <Zap className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-stone-900 tracking-wider">{t("Velocity", "Ταχύτητα")}</h3>
         </div>
         <div className="flex items-end justify-between">
          <span className="text-lg font-semibold text-stone-900">{tasks.filter((task) => task.status === 'Done').length}</span>
          <span className="text-sm font-medium text-stone-400">{tasks.filter((task) => task.status !== 'Done').length} {t("open", "ανοικτές")}</span>
         </div>
         <p className="text-xs text-stone-400">{t("Tasks completed on this board.", "Εργασίες που ολοκληρώθηκαν σε αυτόν τον πίνακα.")}</p>
        </div>

        <div className="card-minimal p-4 space-y-3">
         <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-stone-50 text-stone-700 flex items-center justify-center border border-stone-100">
           <Target className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-stone-900 tracking-wider">{t("Focus Score", "Σκορ εστίασης")}</h3>
         </div>
         <div className="flex items-end justify-between">
          <span className="text-lg font-semibold text-stone-900">{Math.round(focusStats.seconds / 60)}m</span>
          <span className="text-sm text-stone-400">{t("deep work today", "deep work σήμερα")}</span>
         </div>
         <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
          <div className="h-full bg-stone-900 transition-all" style={{ width: `${Math.min(100, (focusStats.seconds / (4 * 3600)) * 100)}%` }} />
         </div>
        </div>
       </section>
      </div>

      {/* Right Column - Quick Actions & AI */}
      <div className="lg:col-span-4 space-y-4">
       <section className="card-minimal p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
         <div className="w-7 h-7 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-stone-500" />
         </div>
         <h3 className="text-sm font-semibold text-stone-900">{t("AI Assistant", "Βοηθός AI")}</h3>
        </div>
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 space-y-2.5">
         <p className="text-xs font-semibold text-stone-400 tracking-wider">{t("Next Best Action", "Επόμενη καλύτερη ενέργεια")}</p>
         <p className="text-sm text-stone-600 leading-relaxed">
          {t(nextStep.en, nextStep.el)}
         </p>
         <Button
          className="w-full bg-stone-900 text-white h-7 rounded-lg text-sm hover:bg-stone-800"
          onClick={() => {
           window.dispatchEvent(new CustomEvent('OPEN_AI_CHAT', {
            detail: { agentId: 'a3', prompt: nextStep.prompt ?? nextStep.en }
           }));
          }}
         >
          {t(nextStep.action?.en ?? "Open AI Chat", nextStep.action?.el ?? "Άνοιγμα συνομιλίας AI")}
         </Button>
        </div>
       </section>

       {/* Focus Mode Widget */}
       <section className={cn(
        "card-minimal p-4 space-y-3",
        focusMode && "bg-stone-900 text-white"
       )}>
        <div className="flex items-center justify-between">
         <div className="flex items-center gap-2">
          <div className={cn(
           "w-7 h-7 rounded-lg flex items-center justify-center border",
           focusMode ? "bg-white/10 border-white/20" : "bg-stone-50 border-stone-100"
          )}>
           <Focus className={cn("w-3.5 h-3.5", focusMode ? "text-white" : "text-stone-500")} />
          </div>
          <h3 className={cn("text-sm font-semibold", focusMode ? "text-white" : "text-stone-900")}>{t("Focus Mode", "Λειτουργία εστίασης")}</h3>
         </div>
         <div className="flex items-center gap-1">
          {["work", "shortBreak", "longBreak"].map((mode) => (
           <button
            key={mode}
            onClick={() => setFocusState(mode as FocusMode)}
            className={cn(
             "w-5 h-5 rounded-md flex items-center justify-center transition-colors",
             focusState === mode 
              ? (focusMode ? "bg-white/20" : "bg-stone-200") 
              : "hover:bg-stone-100"
            )}
           >
            {mode === "work" ? <Sun className="w-3 h-3" /> : mode === "shortBreak" ? <Coffee className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
           </button>
          ))}
         </div>
        </div>

        <div className="text-center py-2">
         <div className={cn("text-lg font-bold tracking-tight font-mono", focusMode ? "text-white" : "text-stone-900")}>
          {Math.floor(focusTimer / 60).toString().padStart(2, "0")}:{(focusTimer % 60).toString().padStart(2, "0")}
         </div>
         <p className={cn("text-xs mt-1", focusMode ? "text-white/60" : "text-stone-400")}>
          {focusStateLabel(focusState)}
         </p>
        </div>

        <div className="flex gap-2">
         <button
          onClick={() => setIsTimerRunning(!isTimerRunning)}
          className={cn(
           "flex-1 h-8 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors",
           focusMode 
            ? "bg-white text-stone-900 hover:bg-white/90" 
            : "bg-stone-900 text-white hover:bg-stone-800"
          )}
         >
          {isTimerRunning ? <><Pause className="w-3.5 h-3.5" /> {t("Pause", "Παύση")}</> : <><Play className="w-3.5 h-3.5" /> {t("Start", "Έναρξη")}</>}
         </button>
         <button
          onClick={() => {
           setFocusTimer(focusState === "work" ? 25 * 60 : focusState === "shortBreak" ? 5 * 60 : 15 * 60);
           setIsTimerRunning(false);
          }}
          className={cn(
           "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
           focusMode ? "bg-white/10 hover:bg-white/20" : "bg-stone-100 hover:bg-stone-200"
          )}
         >
          <Square className={cn("w-3.5 h-3.5", focusMode ? "text-white" : "text-stone-500")} />
         </button>
        </div>

        {/* Session Stats */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100/20">
         <div className="text-center">
          <p className={cn("text-lg font-bold", focusMode ? "text-white" : "text-stone-900")}>{focusStats.sessions}</p>
          <p className={cn("text-xs", focusMode ? "text-white/60" : "text-stone-400")}>{t("Sessions Today", "Συνεδρίες σήμερα")}</p>
         </div>
         <div className="text-center">
          <p className={cn("text-lg font-bold", focusMode ? "text-white" : "text-stone-900")}>{(focusStats.seconds / 3600).toFixed(1)}h</p>
          <p className={cn("text-xs", focusMode ? "text-white/60" : "text-stone-400")}>{t("Deep Work", "Deep work")}</p>
         </div>
        </div>

        <button
         onClick={() => setFocusMode(!focusMode)}
         className={cn(
          "w-full h-7 rounded-lg text-xs font-medium transition-colors",
          focusMode 
           ? "bg-white/10 text-white hover:bg-white/20" 
           : "bg-stone-50 text-stone-600 hover:bg-stone-100"
         )}
        >
         {focusMode ? t("Exit Full Focus", "Έξοδος από εστίαση") : t("Enter Full Focus Mode", "Πλήρης λειτουργία εστίασης")}
        </button>
       </section>

       {/* Time Tracking Summary */}
       <section className="card-minimal p-4 space-y-3">
        <div className="flex items-center justify-between">
         <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center">
           <Clock3 className="w-3.5 h-3.5 text-stone-500" />
          </div>
          <h3 className="text-sm font-semibold text-stone-900">{t("Time Tracking", "Καταγραφή χρόνου")}</h3>
         </div>
         <span className="text-xs text-stone-400">{t("This sprint", "Αυτό το sprint")}</span>
        </div>

        <div className="space-y-2">
         {tasks.filter((task) => task.timeTracked > 0).sort((a, b) => b.timeTracked - a.timeTracked).slice(0, 3).map(task => (
          <div key={task.id} className="flex items-center justify-between">
           <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
             "w-1.5 h-1.5 rounded-full shrink-0",
             task.priority === "High" ? "bg-red-400" : task.priority === "Medium" ? "bg-amber-400" : "bg-blue-400"
            )} />
            <span className="text-xs text-stone-600 truncate">{task.title}</span>
           </div>
           <span className="text-xs font-medium text-stone-900 shrink-0">
            {Math.floor(task.timeTracked / 60)}h {task.timeTracked % 60}m
           </span>
          </div>
         ))}
        </div>

        <div className="pt-2 border-t border-stone-100">
         <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-stone-400">{t("Total Tracked", "Σύνολο")}</span>
          <span className="text-base font-bold text-stone-900">
           {Math.floor(tasks.reduce((acc, task) => acc + task.timeTracked, 0) / 60)}h {tasks.reduce((acc, task) => acc + task.timeTracked, 0) % 60}m
          </span>
         </div>
         <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
          <div 
           className="h-full bg-stone-900 rounded-full transition-all"
           style={{ width: `${Math.min(100, (tasks.reduce((acc, task) => acc + task.timeTracked, 0) / (8 * 60)) * 100)}%` }}
          />
         </div>
        </div>
       </section>

       <section className="card-minimal p-4 space-y-3">
        <h3 className="text-sm font-semibold text-stone-900 mb-1">{t("Project Assets", "Αρχεία έργου")}</h3>
        <div className="space-y-1">
         {assets.length === 0 && (
          <p className="text-xs text-stone-400 py-1">{t("No files yet — upload a deck, a doc, or a zip.", "Κανένα αρχείο ακόμη — ανέβασε deck, doc ή zip.")}</p>
         )}
         {assets.slice(0, 5).map((asset) => {
          const url = safeMediaUrl(asset.url);
          return (
          <a
           key={asset.name}
           href={url ?? undefined}
           target={url ? '_blank' : undefined}
           rel="noopener noreferrer"
           className="flex items-center justify-between p-2.5 rounded-lg hover:bg-stone-50 transition-colors group"
          >
           <div className="flex items-center gap-2.5">
            <FileText className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 transition-colors shrink-0" />
            <div>
             <p className="text-sm font-medium text-stone-900">{asset.name}</p>
             <p className="text-xs text-stone-400">{asset.size}</p>
            </div>
           </div>
           {url ? <ArrowRight className="w-3.5 h-3.5 text-stone-300" /> : null}
          </a>
          );
         })}
        </div>
        <label className="flex items-center justify-center w-full h-7 rounded-lg text-sm border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer">
         <Plus className="w-3.5 h-3.5 mr-1.5" /> {t("Upload file", "Μεταφόρτωση αρχείου")}
         <input type="file" className="sr-only" onChange={(e) => { void addAsset(e.target.files?.[0] ?? null); e.target.value = ''; }} />
        </label>
       </section>
      </div>
     </motion.div>
    )}

    {activeTab === "Canvas" && (
     <motion.div
      key="canvas"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
     >
      <div className="flex items-center justify-between">
       <div>
        <h3 className="text-sm font-semibold text-stone-900">{t("Lean Canvas", "Lean canvas")}</h3>
        <p className="text-xs text-stone-400 mt-0.5">{t("Map out your business model in a single page.", "Αποτύπωσε το επιχειρηματικό σου μοντέλο σε μία σελίδα.")}</p>
       </div>
       <div className="flex items-center gap-2">
        <Button
         variant="outline"
         size="sm"
         className="h-7 text-sm border-stone-200"
         onClick={saveCanvas}
        >
         <Save className="w-3 h-3 mr-1.5" /> {t("Save", "Αποθήκευση")}
        </Button>
        <Button
         size="sm"
         className="h-7 bg-stone-900 text-white text-sm px-3"
         onClick={() => {
          window.dispatchEvent(new CustomEvent('OPEN_AI_CHAT', {
           detail: { agentId: 'a3', prompt: 'Can you help me refine my Lean Canvas?' }
          }));
         }}
        >
         <Sparkles className="w-3 h-3 mr-1.5" /> {t("AI Refine", "Βελτίωση με AI")}
        </Button>
       </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
       {CANVAS_SECTIONS.map((section) => (
        <div key={section.key} className="card-minimal p-4 space-y-2 min-h-[180px] flex flex-col">
         <h4 className="text-xs font-semibold tracking-wider text-stone-400">{canvasTitle(section.title)}</h4>
         <textarea
          value={canvasValue(section.key)}
          onChange={(e) => setCanvasField(section.key, e.target.value)}
          placeholder={t('Write it here — it saves to your account.', 'Γράψε εδώ — αποθηκεύεται στον λογαριασμό σου.')}
          className="flex-1 bg-transparent text-sm text-stone-600 leading-relaxed resize-none focus:outline-none placeholder:text-stone-300"
         />
        </div>
       ))}
      </div>
     </motion.div>
    )}

    {/* ── MILESTONES TAB ───────────────────────────────────── */}
    {activeTab === "Milestones" && (
     <motion.div
      key="milestones"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
     >
      {/* Milestones Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
       {[
        { label: t("Total", "Σύνολο"), value: String(milestoneStats.total), color: "bg-stone-900 text-white" },
        { label: t("Completed", "Ολοκληρώθηκε"), value: String(milestoneStats.done), color: "bg-emerald-50 text-emerald-700" },
        { label: t("In Progress", "Σε εξέλιξη"), value: String(milestoneStats.active), color: "bg-violet-50 text-violet-700" },
        { label: t("Overdue", "Εκπρόθεσμο"), value: String(milestoneStats.overdue), color: "bg-red-50 text-red-700" },
       ].map(stat => (
        <div key={stat.label} className={cn("p-3 rounded-2xl border", stat.color.replace("text-", "border-").replace("700", "100").replace("900", "stone-100"))}>
         <p className={cn("text-lg font-bold", stat.color.includes("white") ? "text-white" : stat.color.split(" ")[1])}>{stat.value}</p>
         <p className={cn("text-xs", stat.color.includes("white") ? "text-stone-300" : "text-stone-500")}>{stat.label}</p>
        </div>
       ))}
      </div>

      {/* Timeline / Gantt View */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
         <h3 className="text-sm font-semibold text-stone-900">{t("Product Roadmap", "Οδικός χάρτης προϊόντος")}</h3>
         <p className="text-xs text-stone-400 mt-0.5">{t("Your milestones on an 8-week window", "Τα ορόσημά σου σε οκταεβδομαδιαίο παράθυρο")}</p>
        </div>
        <div className="flex items-center gap-2">
         <Button type="button" variant="outline" size="sm" className="h-7 text-sm rounded-lg" onClick={() => setRoadmapFilter((prev) => prev === 'All' ? 'completed' : prev === 'completed' ? 'in-progress' : prev === 'in-progress' ? 'pending' : 'All')}>
          <Filter className="w-3.5 h-3.5 mr-1.5" /> {roadmapFilter === 'All' ? t("Filter", "Φίλτρο") : labelOf(roadmapFilter)}
         </Button>
         <Button type="button" size="sm" className="h-7 text-sm rounded-lg bg-stone-900 text-white" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'add milestone' } }))}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> {t("Add Milestone", "Προσθήκη ορόσημου")}
         </Button>
        </div>
       </div>

       {/* Timeline Grid */}
       <div className="space-y-3 overflow-x-auto">
        {/* Weeks header */}
        <div className="grid grid-cols-12 gap-1 pb-2 border-b border-stone-100 min-w-[640px]">
         <div className="col-span-3 text-xs font-semibold text-stone-400">{t("Milestone", "Ορόσημο")}</div>
         {["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"].map(w => (
          <div key={w} className="text-xs text-stone-400 text-center">{weekLabel(w)}</div>
         ))}
        </div>

        {/* Timeline rows */}
        {visibleRoadmap.length === 0 && (
         <p className="text-sm text-stone-400 py-3 px-1">{t('No milestones on the roadmap yet — add one and its bar appears here.', 'Κανένα ορόσημο στον οδικό χάρτη ακόμη — πρόσθεσε ένα και η μπάρα του εμφανίζεται εδώ.')}</p>
        )}
        {visibleRoadmap.map((milestone, idx) => (
         <div key={milestone.name} className="grid grid-cols-12 gap-1 items-center py-2 hover:bg-stone-50 rounded-lg transition-colors group min-w-[640px]">
          <div className="col-span-3 px-2">
           <p className="text-sm font-medium text-stone-900">{milestone.name}</p>
           <p className="text-xs text-stone-400">{labelOf(milestone.category)}</p>
          </div>
          <div className="col-span-9 relative h-6 bg-stone-100 rounded-full overflow-hidden">
           <div 
            className={cn("absolute h-full rounded-full transition-all", milestone.color)}
            style={{ 
             left: `${(milestone.start / 8) * 100}%`, 
             width: `${(milestone.duration / 8) * 100}%` 
            }}
           >
            {milestone.status === "in-progress" && (
             <div className="absolute inset-0 bg-white/20 animate-pulse" />
            )}
           </div>
           {/* Today marker — position derives from the real 8-week window */}
           <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10" style={{ left: `${roadmapTodayPct}%` }}>
            <span className="absolute -top-4 -left-2 text-[8px] text-red-400 font-semibold">{t("Today", "Σήμερα")}</span>
           </div>
          </div>
         </div>
        ))}
       </div>
      </Card>

      {/* Milestone List — the same records the Milestones page and assistant manage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
       {milestones.length === 0 && (
        <div className="col-span-2 p-4 bg-white border border-stone-100 rounded-2xl text-sm text-stone-400">
         {t('No milestones yet — ask the assistant to add one, or open the Milestones page.', 'Κανένα ορόσημο ακόμη — ζήτα από τον βοηθό να προσθέσει ή άνοιξε τη σελίδα Ορόσημα.')}
        </div>
       )}
       {milestones.slice(0, 6).map(m => {
        const status = m.status === 'Completed' ? 'completed' : m.status === 'In Progress' ? 'in-progress' : 'pending';
        return (
        <div key={m.id} className="flex items-center justify-between p-4 bg-white border border-stone-100 rounded-2xl hover:border-stone-300 transition-all">
         <div className="flex items-center gap-3">
          <div className={cn(
           "w-8 h-8 rounded-xl flex items-center justify-center",
           status === "completed" ? "bg-emerald-100 text-emerald-600" :
           status === "in-progress" ? "bg-violet-100 text-violet-600" :
           "bg-stone-100 text-stone-400"
          )}>
           {status === "completed" ? <CheckCircle className="w-4 h-4" /> :
            status === "in-progress" ? <Clock className="w-4 h-4" /> :
            <CalendarIcon className="w-4 h-4" />}
          </div>
          <div>
           <p className="text-sm font-semibold text-stone-900">{m.title}</p>
           <p className="text-xs text-stone-400">{(m.tasks ?? []).length} {t("tasks", "εργασίες")} · {t("Due", "Προθεσμία")} {formatDate(m.targetDate)}</p>
          </div>
         </div>
         <ChevronRight className="w-4 h-4 text-stone-300" />
        </div>
        );
       })}
      </div>
     </motion.div>
    )}

    {/* ── CALENDAR TAB ─────────────────────────────────────── */}
    {activeTab === "Calendar" && (
     <motion.div
      key="calendar"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-5"
     >
      {/* Calendar Grid */}
      <div className="lg:col-span-2 space-y-4">
       <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
         <div>
          <h3 className="text-sm font-semibold text-stone-900">{formatDate(new Date(calMonth.year, calMonth.month, 1), { month: "long", year: "numeric" })}</h3>
         </div>
         <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" aria-label={t("Previous month", "Προηγούμενος μήνας")} onClick={() => setCalMonth((m) => ({ year: m.month === 0 ? m.year - 1 : m.year, month: (m.month + 11) % 12 }))}>
           <ChevronRight className="w-4 h-4 rotate-180" />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label={t("Next month", "Επόμενος μήνας")} onClick={() => setCalMonth((m) => ({ year: m.month === 11 ? m.year + 1 : m.year, month: (m.month + 1) % 12 }))}>
           <ChevronRight className="w-4 h-4" />
          </Button>
         </div>
        </div>

        {/* Calendar Days Header — Monday-first, localized */}
        <div className="grid grid-cols-7 gap-1 mb-2">
         {Array.from({ length: 7 }, (_, i) => {
          const ref = new Date(2024, 0, 1 + i); // 2024-01-01 was a Monday
          return <div key={i} className="text-center text-xs font-semibold text-stone-400 py-1">{formatDate(ref, { weekday: "short" })}</div>;
         })}
        </div>

        {/* Calendar Grid — marks days that hold real sessions */}
        <div className="grid grid-cols-7 gap-1">
         {calDays.map((day, i) => {
          if (day === null) return <div key={`pad-${i}`} />;
          const isToday = dayKey(day) === todayKey();
          const hasEvent = sessionDays.has(dayKey(day));
          return (
           <div
            key={day}
            className={cn(
             "aspect-square p-1 rounded-lg border transition-all relative",
             isToday ? "border-stone-900 bg-stone-50" : "border-stone-100 hover:border-stone-300",
             hasEvent && "cursor-pointer"
            )}
           >
            <span className={cn(
             "text-sm font-medium",
             isToday ? "text-stone-900" : "text-stone-600"
            )}>{day}</span>
            {hasEvent && (
             <div className="absolute bottom-1 left-1 right-1 flex gap-0.5">
              <div className="h-1 flex-1 bg-violet-400 rounded-full" />
             </div>
            )}
           </div>
          );
         })}
        </div>
       </Card>

       {/* Day Events — the sessions actually on today */}
       <Card className="p-4">
        <h4 className="text-sm font-semibold text-stone-900 mb-3">{t("Today", "Σήμερα")}, {formatDate(new Date(), { day: "numeric", month: "long" })}</h4>
        <div className="space-y-2">
         {todaySessions.length === 0 && (
          <p className="text-sm text-stone-400">{t('Nothing scheduled today — use New Event or ask the assistant.', 'Τίποτα προγραμματισμένο σήμερα — πάτα Νέα εκδήλωση ή ζήτα από τον βοηθό.')}</p>
         )}
         {todaySessions.map((event) => (
          <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 transition-colors">
           <span className="text-xs font-medium text-stone-400 w-10">{event.time.slice(11, 16) || '—'}</span>
           <div className={cn(
            "flex-1 p-2 rounded-lg text-sm font-medium",
            event.type === 'Meeting' ? 'bg-violet-100 text-violet-700' :
            event.type === 'Deadline' ? 'bg-red-100 text-red-700' :
            event.type === 'Mentorship' ? 'bg-amber-100 text-amber-700' :
            'bg-emerald-100 text-emerald-700'
           )}>
            {event.title}
           </div>
          </div>
         ))}
        </div>
       </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
       {/* Quick Add */}
       <Card className="p-4 space-y-3">
        <h4 className="text-sm font-semibold text-stone-900">{t("Quick Add", "Γρήγορη προσθήκη")}</h4>
        <Button type="button" size="sm" className="w-full h-8 text-sm bg-stone-900 text-white rounded-lg" onClick={() => ask('Schedule a new event on my calendar')}>
         <Plus className="w-3.5 h-3.5 mr-1.5" /> {t("New Event", "Νέα εκδήλωση")}
        </Button>
        <div className="flex gap-2">
         <Button type="button" variant="outline" size="sm" className="flex-1 h-7 text-xs rounded-lg" onClick={() => ask('Schedule a meeting on my calendar')}>
          <CalendarDays className="w-3 h-3 mr-1" /> {t("Meeting", "Συνάντηση")}
         </Button>
         <Button type="button" variant="outline" size="sm" className="flex-1 h-7 text-xs rounded-lg" onClick={() => { addTask('Calendar task'); setActiveTab('Dashboard'); }}>
          <CheckSquare className="w-3 h-3 mr-1" /> {t("Task", "Εργασία")}
         </Button>
        </div>
       </Card>

       {/* Upcoming — the next seven days of real sessions */}
       <Card className="p-4 space-y-3">
        <h4 className="text-sm font-semibold text-stone-900">{t("This Week", "Αυτή την εβδομάδα")}</h4>
        <div className="space-y-2">
         {weekSessions.length === 0 && (
          <p className="text-sm text-stone-400">{t('Nothing scheduled this week.', 'Τίποτα προγραμματισμένο αυτή την εβδομάδα.')}</p>
         )}
         {weekSessions.map((item) => (
          <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-stone-50 transition-colors">
           <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
            <CalendarIcon className="w-3.5 h-3.5 text-stone-500" />
           </div>
           <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-900 truncate">{item.title}</p>
            <p className="text-xs text-stone-400">{formatDate(item.time.slice(0, 10), { weekday: "short", day: "numeric" })} · {item.time.slice(11, 16) || item.duration}</p>
           </div>
          </div>
         ))}
        </div>
       </Card>
      </div>
     </motion.div>
    )}

    {/* ── BUILDER TAB ────────────────────────── */}
    {activeTab === "Builder" && (() => {
     const moduleStats = BUILDER_MODULES.map((module) => ({ module, ...builderStatus(module.id, builderInputs) }));
     const done = moduleStats.filter((stat) => stat.status === 'Completed').length;
     const firstIncomplete = moduleStats.find((stat) => stat.status !== 'Completed') ?? moduleStats[0];
     const askPrompt = t('Help me with the {title} module', 'Βοήθησέ με με την ενότητα {title}')
      .replace('{title}', firstIncomplete ? t(firstIncomplete.module.title, firstIncomplete.module.titleEl) : '');
     return (
     <motion.div
      key="builder"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
     >
      <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
       <Layers className="w-8 h-8 text-stone-400" />
      </div>
      <h3 className="text-base font-semibold text-stone-900 mb-2">{t("Builder Mode", "Λειτουργία κατασκευής")}</h3>
      <p className="text-sm text-stone-400 max-w-xs">{t("Canvas and task tools on this tab stay here. Ask the studio assistant to add a milestone, book time, or open Founder Tools.", "Τα εργαλεία canvas και εργασιών μένουν σε αυτή την καρτέλα. Ζήτα από τον βοηθό να προσθέσει ορόσημο, να κλείσει ώρα ή να ανοίξει τα εργαλεία ιδρυτή.")}</p>
      <div className="w-full max-w-xl mt-6 space-y-3 text-left">
       <p className="text-sm text-stone-500">
        {t('{n} of {total} modules complete', '{n} από {total} ενότητες ολοκληρωμένες')
         .replace('{n}', String(done)).replace('{total}', String(BUILDER_MODULES.length))}
       </p>
       <Card className="p-2 border-stone-100 rounded-2xl space-y-1">
        {moduleStats.map(({ module, status, filled, total }) => (
         <div key={module.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-stone-50 transition-all">
          <span className="text-stone-400 font-mono font-semibold text-sm w-6">{String(module.id).padStart(2, '0')}</span>
          <div className="flex-1 min-w-0">
           <h4 className="text-sm font-semibold text-stone-900 truncate">{t(module.title, module.titleEl)}</h4>
           <p className="text-xs text-stone-400">{filled}/{total}</p>
          </div>
          <span className={cn(
           "text-xs font-medium tracking-wider px-2 py-0.5 rounded-full border shrink-0",
           status === "Completed" ? "text-emerald-600 border-transparent" :
           status === "In-Progress" ? "text-amber-600 border-transparent" :
           "text-stone-400 border-transparent"
          )}>{labelOf(status)}</span>
          <Link to={`/founder-tools?step=${module.id}`} className="text-xs font-medium text-stone-900 hover:underline shrink-0">{t('Continue', 'Συνέχεια')}</Link>
         </div>
        ))}
       </Card>
      </div>
      <Button type="button" className="mt-4 h-8 px-4 rounded-lg bg-stone-900 text-white text-sm" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: askPrompt } }))}>
       {t("Ask the studio assistant", "Ρώτα τον βοηθό")}
      </Button>
     </motion.div>
     );
    })()}
   </AnimatePresence>
  </PageShell>
 );
}
