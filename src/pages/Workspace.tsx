import { useState, useMemo, useEffect } from "react";
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
import { addStudioTask, keys, readTasks, type StudioTask } from "../lib/localLists";
import { useStored } from "../lib/useStored";
import { useT } from "../lib/language";
import { labelOf } from "../lib/labels";
import { formatDate } from "../lib/dates";
import { FixedSizeList as VirtualList } from 'react-window';

interface WorkspaceProps {
 user: User;
}

type TabType = "Dashboard" | "Builder" | "Canvas" | "Milestones" | "Calendar";
type TaskView = "list" | "kanban";
type FocusMode = "work" | "shortBreak" | "longBreak";

type Task = StudioTask;

export default function Workspace({ user }: WorkspaceProps) {
 const t = useT();
 const [activeTab, setActiveTab] = useState<TabType>("Dashboard");
 const [searchQuery, setSearchQuery] = useState("");
 const [taskView, setTaskView] = useState<TaskView>("list");
 const [focusMode, setFocusMode] = useState(false);
 const [focusTimer, setFocusTimer] = useState(25 * 60); // 25 minutes in seconds
 const [focusState, setFocusState] = useState<FocusMode>("work");
 const [isTimerRunning, setIsTimerRunning] = useState(false);
 useEffect(() => {
  if (!isTimerRunning || focusTimer <= 0) return;
  const interval = setInterval(() => {
   setFocusTimer(prev => {
    if (prev <= 1) { setIsTimerRunning(false); return 0; }
    return prev - 1;
   });
  }, 1000);
  return () => clearInterval(interval);
 }, [isTimerRunning, focusTimer]);
 const [activeTask, setActiveTask] = useState<string | null>(null);
 const [roadmapFilter, setRoadmapFilter] = useState<'All' | 'completed' | 'in-progress' | 'pending'>('All');
 const tasks = useStored(readTasks, [keys.tasks]);
 const roadmap = [
  { name: "MVP Launch", category: "Product", start: 0, duration: 3, status: "completed" as const, color: "bg-emerald-400" },
  { name: "Beta Testing", category: "Product", start: 2, duration: 4, status: "in-progress" as const, color: "bg-violet-400" },
  { name: "Seed Funding", category: "Fundraising", start: 3, duration: 5, status: "in-progress" as const, color: "bg-amber-400" },
  { name: "First 100 Users", category: "Growth", start: 5, duration: 3, status: "pending" as const, color: "bg-stone-300" },
  { name: "Product Hunt Launch", category: "Marketing", start: 7, duration: 2, status: "pending" as const, color: "bg-blue-400" },
 ];
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

 return (
  <PageShell
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
              <p className="text-[10px] text-stone-400 px-1">{t("No items", "Κανένα")}</p>
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
                  <span key={tag} className="px-1 py-0.5 bg-stone-50 text-stone-400 rounded text-[10px]">{labelOf(tag)}</span>
                 ))}
                </div>
                {task.timeTracked > 0 && (
                 <span className="text-[10px] text-stone-400 flex items-center gap-0.5">
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
          <span className="text-xl font-semibold text-stone-900">12</span>
          <span className="text-sm font-medium text-emerald-600">{t("+20% vs last week", "+20% έναντι προηγούμενης εβδομάδας")}</span>
         </div>
         <p className="text-xs text-stone-400">{t("Tasks completed in the current sprint cycle.", "Εργασίες που ολοκληρώθηκαν στον τρέχοντα κύκλο sprint.")}</p>
        </div>

        <div className="card-minimal p-4 space-y-3">
         <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-stone-50 text-stone-700 flex items-center justify-center border border-stone-100">
           <Target className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-stone-900 tracking-wider">{t("Focus Score", "Σκορ εστίασης")}</h3>
         </div>
         <div className="flex items-end justify-between">
          <span className="text-xl font-semibold text-stone-900">8.4</span>
          <span className="text-sm text-stone-400">{t("Target", "Στόχος")}: 9.0</span>
         </div>
         <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
          <div className="h-full bg-stone-900 w-[84%]" />
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
          {t("Based on your progress, focus on the Pitch Deck to prepare for your upcoming investor meeting.", "Με βάση την πρόοδό σου, εστίασε στο pitch deck για την επερχόμενη συνάντηση με επενδυτές.")}
         </p>
         <Button
          className="w-full bg-stone-900 text-white h-7 rounded-lg text-sm hover:bg-stone-800"
          onClick={() => {
           window.dispatchEvent(new CustomEvent('OPEN_AI_CHAT', {
            detail: { agentId: 'a3', prompt: 'I want to refine my startup idea' }
           }));
          }}
         >
          {t("Open AI Chat", "Άνοιγμα συνομιλίας AI")}
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
         <div className={cn("text-xl font-bold tracking-tight font-mono", focusMode ? "text-white" : "text-stone-900")}>
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
          <p className={cn("text-xl font-bold", focusMode ? "text-white" : "text-stone-900")}>4</p>
          <p className={cn("text-xs", focusMode ? "text-white/60" : "text-stone-400")}>{t("Sessions Today", "Συνεδρίες σήμερα")}</p>
         </div>
         <div className="text-center">
          <p className={cn("text-xl font-bold", focusMode ? "text-white" : "text-stone-900")}>2.4h</p>
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
         <span className="text-xs text-stone-400">{t("Today", "Σήμερα")}</span>
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
         {[
          { name: "Pitch Deck v2.pdf", size: "2.4 MB", icon: FileText },
          { name: "Brand Guidelines.zip", size: "15.8 MB", icon: Layers },
          { name: "Market Research.docx", size: "840 KB", icon: FileText },
         ].map((asset) => (
          <div key={asset.name} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer group">
           <div className="flex items-center gap-2.5">
            <asset.icon className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 transition-colors shrink-0" />
            <div>
             <p className="text-sm font-medium text-stone-900">{asset.name}</p>
             <p className="text-xs text-stone-400">{asset.size}</p>
            </div>
           </div>
           <MoreVertical className="w-3.5 h-3.5 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
         ))}
        </div>
        <Button
         variant="outline"
         className="w-full h-7 rounded-lg text-sm border-stone-200"
         onClick={() => ask('Open my pitch deck and workspace assets')}
        >
         {t("View All Assets", "Όλα τα αρχεία")}
        </Button>
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
         onClick={() => ask('Help me save and refine my Lean Canvas')}
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
       {[
        { title: "Problem", content: "Existing solutions are too complex and expensive for early-stage startups." },
        { title: "Solution", content: "A minimalist, AI-powered workspace designed specifically for founders." },
        { title: "Key Metrics", content: "Daily Active Users, Task Completion Rate, Retention." },
        { title: "Unique Value Prop", content: "The only workspace that actively guides you through the startup lifecycle." },
        { title: "Unfair Advantage", content: "Proprietary AI matching engine and exclusive mentor network." },
       ].map((section) => (
        <div key={section.title} className="card-minimal p-4 space-y-2 min-h-[180px] flex flex-col">
         <h4 className="text-xs font-semibold tracking-wider text-stone-400">{canvasTitle(section.title)}</h4>
         <textarea
          defaultValue={section.content}
          className="flex-1 bg-transparent text-sm text-stone-600 leading-relaxed resize-none focus:outline-none"
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
        { label: t("Total", "Σύνολο"), value: "12", color: "bg-stone-900 text-white" },
        { label: t("Completed", "Ολοκληρώθηκε"), value: "8", color: "bg-emerald-50 text-emerald-700" },
        { label: t("In Progress", "Σε εξέλιξη"), value: "3", color: "bg-violet-50 text-violet-700" },
        { label: t("Overdue", "Εκπρόθεσμο"), value: "1", color: "bg-red-50 text-red-700" },
       ].map(stat => (
        <div key={stat.label} className={cn("p-3 rounded-2xl border", stat.color.replace("text-", "border-").replace("700", "100").replace("900", "stone-100"))}>
         <p className={cn("text-xl font-bold", stat.color.includes("white") ? "text-white" : stat.color.split(" ")[1])}>{stat.value}</p>
         <p className={cn("text-xs", stat.color.includes("white") ? "text-stone-300" : "text-stone-500")}>{stat.label}</p>
        </div>
       ))}
      </div>

      {/* Timeline / Gantt View */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
         <h3 className="text-sm font-semibold text-stone-900">{t("Product Roadmap", "Οδικός χάρτης προϊόντος")}</h3>
         <p className="text-xs text-stone-400 mt-0.5">{t("Q2 2026 Milestones", "Ορόσημα Q2 2026")}</p>
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
           {/* Today marker */}
           <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10" style={{ left: "37.5%" }}>
            <span className="absolute -top-4 -left-2 text-[8px] text-red-400 font-semibold">{t("Today", "Σήμερα")}</span>
           </div>
          </div>
         </div>
        ))}
       </div>
      </Card>

      {/* Milestone List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
       {[
        { title: "Complete User Research", date: "2026-04-15", status: "completed", tasks: 8 },
        { title: "Finalize Core Features", date: "2026-04-28", status: "in-progress", tasks: 12 },
        { title: "Launch Private Beta", date: "2026-05-10", status: "pending", tasks: 15 },
        { title: "First Revenue", date: "2026-06-01", status: "pending", tasks: 6 },
       ].map(m => (
        <div key={m.title} className="flex items-center justify-between p-4 bg-white border border-stone-100 rounded-2xl hover:border-stone-300 transition-all">
         <div className="flex items-center gap-3">
          <div className={cn(
           "w-8 h-8 rounded-xl flex items-center justify-center",
           m.status === "completed" ? "bg-emerald-100 text-emerald-600" : 
           m.status === "in-progress" ? "bg-violet-100 text-violet-600" : 
           "bg-stone-100 text-stone-400"
          )}>
           {m.status === "completed" ? <CheckCircle className="w-4 h-4" /> : 
            m.status === "in-progress" ? <Clock className="w-4 h-4" /> : 
            <CalendarIcon className="w-4 h-4" />}
          </div>
          <div>
           <p className="text-sm font-semibold text-stone-900">{m.title}</p>
           <p className="text-xs text-stone-400">{m.tasks} {t("tasks", "εργασίες")} · {t("Due", "Προθεσμία")} {formatDate(m.date)}</p>
          </div>
         </div>
         <ChevronRight className="w-4 h-4 text-stone-300" />
        </div>
       ))}
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
          <h3 className="text-sm font-semibold text-stone-900">{formatDate(new Date(2026, 3, 1), { month: "long", year: "numeric" })}</h3>
         </div>
         <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label={t("Previous month", "Προηγούμενος μήνας")}>
           <ChevronRight className="w-4 h-4 rotate-180" />
          </Button>
          <Button variant="outline" size="icon" aria-label={t("Next month", "Επόμενος μήνας")}>
           <ChevronRight className="w-4 h-4" />
          </Button>
         </div>
        </div>

        {/* Calendar Days Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
         {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="text-center text-xs font-semibold text-stone-400 py-1">{formatDate(new Date(2026, 3, 6 + i), { weekday: "short" })}</div>
         ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
         {Array.from({ length: 30 }, (_, i) => {
          const day = i + 1;
          const hasEvent = [5, 12, 15, 18, 22, 28].includes(day);
          const isToday = day === 15;
          return (
           <div 
            key={day} 
            className={cn(
             "aspect-square p-1 rounded-lg border cursor-pointer transition-all relative",
             isToday ? "border-stone-900 bg-stone-50" : "border-stone-100 hover:border-stone-300",
             day > 30 && "opacity-30"
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

       {/* Day Events */}
       <Card className="p-4">
        <h4 className="text-sm font-semibold text-stone-900 mb-3">{t("Today", "Σήμερα")}, {formatDate(new Date(2026, 3, 15), { day: "numeric", month: "long" })}</h4>
        <div className="space-y-2">
         {[
          { time: "10:00", title: "Investor Pitch Call", type: "meeting", color: "bg-violet-100 text-violet-700" },
          { time: "14:00", title: "Team Standup", type: "internal", color: "bg-stone-100 text-stone-700" },
          { time: "16:30", title: "MVP Deadline", type: "milestone", color: "bg-emerald-100 text-emerald-700" },
         ].map(event => (
          <div key={event.title} className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 transition-colors">
           <span className="text-xs font-medium text-stone-400 w-10">{event.time}</span>
           <div className={cn("flex-1 p-2 rounded-lg text-sm font-medium", event.color)}>
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

       {/* Upcoming */}
       <Card className="p-4 space-y-3">
        <h4 className="text-sm font-semibold text-stone-900">{t("This Week", "Αυτή την εβδομάδα")}</h4>
        <div className="space-y-2">
         {[
          { day: "2026-04-16", title: "Product Review", time: "11:00" },
          { day: "2026-04-17", title: "Investor Dinner", time: "19:00" },
          { day: "2026-04-18", title: "Sprint Planning", time: "10:00" },
         ].map(item => (
          <div key={item.title} className="flex items-center gap-2 p-2 rounded-lg hover:bg-stone-50 transition-colors">
           <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
            <CalendarIcon className="w-3.5 h-3.5 text-stone-500" />
           </div>
           <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-900 truncate">{item.title}</p>
            <p className="text-xs text-stone-400">{formatDate(item.day, { weekday: "short", day: "numeric" })} · {item.time}</p>
           </div>
          </div>
         ))}
        </div>
       </Card>
      </div>
     </motion.div>
    )}

    {/* ── BUILDER TAB (Placeholder) ────────────────────────── */}
    {activeTab === "Builder" && (
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
      <Button type="button" className="mt-4 h-8 px-4 rounded-lg bg-stone-900 text-white text-sm" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'add milestone ship the MVP' } }))}>
       {t("Ask the studio assistant", "Ρώτα τον βοηθό")}
      </Button>
     </motion.div>
    )}
   </AnimatePresence>
  </PageShell>
 );
}
