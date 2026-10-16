import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
 Target, 
 CheckCircle2, 
 Clock, 
 Plus, 
 Zap, 
 TrendingUp, 
 Calendar,
 ArrowRight,
 Edit3,
 Trash2,
 AlertCircle,
 Flag,
 LayoutGrid,
 List,
 GitBranch,
 Filter,
 Search,
 MoreVertical,
 ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Milestone, User } from '../types';
import { milestoneService } from '../services/milestoneService';
import PageShell from '../components/ui/PageShell';
import EmptyHint, { AskLink } from '../components/ui/EmptyHint';

interface MilestonesPageProps {
 user?: User;
}

type ViewMode = 'kanban' | 'timeline' | 'list';

const CATEGORY_COLORS: Record<string, string> = {
 Product: 'text-blue-600 border-transparent',
 Legal: 'text-purple-600 border-transparent',
 Funding: 'text-emerald-600 border-transparent',
 Marketing: 'text-amber-600 border-transparent',
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
 Completed: { color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
 'In Progress': { color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
 Planned: { color: 'text-stone-500', bg: 'bg-stone-50', dot: 'bg-stone-300' },
 Delayed: { color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
 Overdue: { color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
};

const PRIORITY_BADGE: Record<string, string> = {
 High: 'text-red-600 border-transparent',
 Medium: 'text-amber-600 border-transparent',
 Low: 'text-stone-500 border-transparent',
};

function ProgressRing({ progress, size = 40, stroke = 3.5 }: { progress: number; size?: number; stroke?: number }) {
 const radius = (size - stroke) / 2;
 const circumference = 2 * Math.PI * radius;
 const offset = circumference - (progress / 100) * circumference;
 return (
  <svg width={size} height={size} className="transform -rotate-90">
   <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f5f5f4" strokeWidth={stroke} />
   <circle
    cx={size / 2} cy={size / 2} r={radius} fill="none"
    stroke={progress === 100 ? '#10b981' : '#1c1917'}
    strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset}
    strokeLinecap="round" className="transition-all duration-700"
   />
   <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
    className="fill-stone-900 text-[9px] font-semibold" transform={`rotate(90, ${size / 2}, ${size / 2})`}>
    {progress}%
   </text>
  </svg>
 );
}

function MilestoneCard({ milestone, compact }: { milestone: Milestone; compact?: boolean }) {
 const cfg = STATUS_CONFIG[milestone.status] || STATUS_CONFIG.Planned!;
 const tasksDone = milestone.tasks?.filter(t => t.completed).length || 0;
 const tasksTotal = milestone.tasks?.length || 0;

 return (
  <div className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md  transition-all group p-4 space-y-3">
   {/* Header row */}
   <div className="flex items-start justify-between gap-2">
    <div className="flex items-center gap-2 min-w-0">
     <ProgressRing progress={milestone.progress} size={compact ? 32 : 40} stroke={compact ? 3 : 3.5} />
     <div className="min-w-0">
      <h3 className="text-sm font-semibold text-stone-900 truncate">{milestone.title}</h3>
      <div className="flex items-center gap-1.5 mt-0.5">
       <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
       <span className={cn("text-[10px] font-medium", cfg.color)}>{milestone.status}</span>
      </div>
     </div>
    </div>
    <button
     type="button"
     title="Ask the studio assistant about this goal"
     onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `What should I do about ${milestone.title}?`, context: milestone.title } }))}
     className="p-1 text-stone-300 hover:text-stone-600 rounded opacity-0 group-hover:opacity-100 transition-all shrink-0"
    >
     <MoreVertical className="w-3.5 h-3.5" />
    </button>
   </div>

   {/* Description */}
   {!compact && milestone.description && (
    <p className="text-xs text-stone-400 leading-relaxed line-clamp-2">{milestone.description}</p>
   )}

   {/* Tags row */}
   <div className="flex flex-wrap items-center gap-1.5">
    <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold border", CATEGORY_COLORS[milestone.category] || 'text-stone-500 border-transparent')}>
     {milestone.category}
    </span>
    <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold border", PRIORITY_BADGE[milestone.priority])}>
     {milestone.priority}
    </span>
   </div>

   {/* Tasks progress bar */}
   {tasksTotal > 0 && (
    <div className="space-y-1.5">
     <div className="flex items-center justify-between">
      <span className="text-[10px] font-semibold text-stone-400 tracking-wider">Tasks</span>
      <span className="text-[10px] font-medium text-stone-400">{tasksDone}/{tasksTotal}</span>
     </div>
     <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden">
      <div
       className={cn("h-full rounded-full transition-all duration-200", tasksDone === tasksTotal ? "bg-emerald-500" : "bg-stone-900")}
       style={{ width: `${tasksTotal > 0 ? (tasksDone / tasksTotal) * 100 : 0}%` }}
      />
     </div>
     {!compact && (
      <div className="space-y-1 pt-1">
       {milestone.tasks!.slice(0, 3).map((task) => (
        <div key={task.id} className="flex items-center gap-2">
         <div className={cn("w-3 h-3 rounded-sm flex items-center justify-center shrink-0", task.completed ? "bg-stone-700" : "border border-stone-200")}>
          {task.completed && <CheckCircle2 className="w-2 h-2 text-white" />}
         </div>
         <span className={cn("text-[11px]", task.completed ? "text-stone-400 line-through" : "text-stone-600")}>{task.title}</span>
        </div>
       ))}
       {milestone.tasks!.length > 3 && (
        <span className="text-[10px] text-stone-400 pl-5">+{milestone.tasks!.length - 3} more</span>
       )}
      </div>
     )}
    </div>
   )}

   {/* Footer */}
   <div className="flex items-center justify-between pt-1 border-t border-stone-50">
    <div className="flex items-center gap-1 text-[10px] text-stone-400">
     <Calendar className="w-3 h-3" />
     {new Date(milestone.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
    </div>
    <div className="flex items-center gap-1">
     <button className="p-1 text-stone-300 hover:text-stone-600 hover:bg-stone-50 rounded transition-all">
      <Edit3 className="w-3 h-3" />
     </button>
     <button className="p-1 text-stone-300 hover:text-red-400 hover:bg-red-50 rounded transition-all">
      <Trash2 className="w-3 h-3" />
     </button>
    </div>
   </div>
  </div>
 );
}

export default function MilestonesPage({ user }: MilestonesPageProps) {
 const navigate = useNavigate();
 const [milestones, setMilestones] = useState<Milestone[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [view, setView] = useState<ViewMode>('kanban');
 const [searchQuery, setSearchQuery] = useState('');
 const [categoryFilter, setCategoryFilter] = useState('All');
 const [statusFilter, setStatusFilter] = useState('All');
 const [adding, setAdding] = useState(false);
 const [draftTitle, setDraftTitle] = useState('');

 useEffect(() => { fetchMilestones(); }, []);

 const fetchMilestones = async () => {
  setLoading(true);
  setError(null);
  try {
   const { milestones: data } = await milestoneService.getMilestones();
   setMilestones(data);
  } catch (err) {
   console.error("Error fetching milestones:", err);
   setError("Failed to load milestones.");
  } finally {
   setLoading(false);
  }
 };
 const saveMilestone = async () => {
  const title = draftTitle.trim();
  if (!title) return;
  const created = await milestoneService.createMilestone({ title, ownerId: user?.id || '1' });
  setMilestones((prev) => [created, ...prev]);
  setDraftTitle('');
  setAdding(false);
 };

 const categories = useMemo(() => ['All', ...Array.from(new Set(milestones.map(m => m.category)))], [milestones]);

 const filtered = useMemo(() => {
  return milestones.filter(m => {
   const matchSearch = !searchQuery || m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.description?.toLowerCase().includes(searchQuery.toLowerCase());
   const matchCat = categoryFilter === 'All' || m.category === categoryFilter;
   const matchStatus = statusFilter === 'All' || m.status === statusFilter;
   return matchSearch && matchCat && matchStatus;
  });
 }, [milestones, searchQuery, categoryFilter, statusFilter]);

 const overallProgress = milestones.length > 0 ? Math.round(milestones.reduce((sum, m) => sum + m.progress, 0) / milestones.length) : 0;

 const stats = [
  { label: 'Overall', value: `${overallProgress}%`, icon: Target, ring: true },
  { label: 'Completed', value: milestones.filter(m => m.status === 'Completed').length, icon: CheckCircle2, color: 'emerald' },
  { label: 'In Progress', value: milestones.filter(m => m.status === 'In Progress').length, icon: TrendingUp, color: 'blue' },
  { label: 'Upcoming', value: milestones.filter(m => m.status === 'Planned').length, icon: Clock, color: 'amber' },
  { label: 'Overdue', value: milestones.filter(m => m.status === 'Overdue').length, icon: AlertCircle, color: 'red' },
 ];

 const KANBAN_COLUMNS: { key: Milestone['status']; label: string }[] = [
  { key: 'Planned', label: 'Planned' },
  { key: 'In Progress', label: 'In Progress' },
  { key: 'Completed', label: 'Completed' },
  { key: 'Overdue', label: 'Overdue' },
 ];

 return (
  <PageShell
   title="Milestones"
   description="Track your progress, set goals, and celebrate achievements."
   actions={
    <div className="flex flex-wrap items-center gap-2">
     <AskLink prompt="What is overdue?" />
     <button type="button" onClick={() => setAdding(true)} title="Names a goal and puts it on this board. · Δίνει όνομα σε έναν στόχο και τον βάζει σε αυτόν τον πίνακα." className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 text-white rounded-xl text-xs font-medium hover:bg-stone-800 transition-all">
      <Plus className="w-3.5 h-3.5" /> Add Milestone
     </button>
    </div>
   }
  >
  <div className="space-y-6">

   {/* Stats row with overall progress ring */}
   <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
    {stats.map((stat) => (
     <div key={stat.label} className="bg-white p-4 rounded-2xl border border-stone-100 flex items-center gap-3">
      {stat.ring ? (
       <ProgressRing progress={overallProgress} size={36} stroke={3} />
      ) : (
       <div className={cn("p-2 rounded-xl",
        stat.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
        stat.color === 'blue' ? "bg-blue-50 text-blue-600" :
        stat.color === 'red' ? "bg-red-50 text-red-600" :
        "bg-amber-50 text-amber-600"
       )}>
        <stat.icon className="w-4 h-4" />
       </div>
      )}
      <div>
       <div className="text-sm font-semibold text-stone-900">{stat.value}</div>
       <div className="text-[10px] text-stone-400 tracking-wider">{stat.label}</div>
      </div>
     </div>
    ))}
   </div>

   {/* Controls: Search + Filters + View Toggle */}
   <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
    <div className="relative flex-1 w-full">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
     <input
      type="text" placeholder="Search milestones..."
      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
     />
    </div>
    {adding && (
     <form onSubmit={(e) => { e.preventDefault(); void saveMilestone(); }} className="flex items-center gap-2 w-full sm:w-auto">
      <input
       type="text"
       value={draftTitle}
       onChange={(e) => setDraftTitle(e.target.value)}
       placeholder="Name the milestone · Όνομα οροσήμου"
       className="w-full sm:w-56 pl-3 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
       autoFocus
      />
      <button type="submit" className="px-3 py-2 bg-stone-900 text-white rounded-xl text-xs font-medium hover:bg-stone-800 transition-all">Save · Αποθήκευση</button>
      <button type="button" onClick={() => { setAdding(false); setDraftTitle(''); }} className="px-3 py-2 text-xs font-medium text-stone-500 hover:text-stone-900">Cancel · Άκυρο</button>
     </form>
    )}
    <div className="flex items-center gap-2 flex-wrap">
     <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-xl p-0.5">
      {categories.map(cat => (
       <button key={cat} onClick={() => setCategoryFilter(cat)}
        className={cn("px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all",
         categoryFilter === cat ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-50"
        )}>
        {cat}
       </button>
      ))}
     </div>
     <div className="flex items-center bg-white border border-stone-200 rounded-xl p-0.5">
      {([
       { key: 'kanban' as ViewMode, icon: LayoutGrid, tip: 'Board' },
       { key: 'timeline' as ViewMode, icon: GitBranch, tip: 'Timeline' },
       { key: 'list' as ViewMode, icon: List, tip: 'List' },
      ]).map(v => (
       <button key={v.key} onClick={() => setView(v.key)} title={v.tip}
        className={cn("p-1.5 rounded-lg transition-all", view === v.key ? "bg-stone-900 text-white" : "text-stone-400 hover:text-stone-600 hover:bg-stone-50")}>
        <v.icon className="w-3.5 h-3.5" />
       </button>
      ))}
     </div>
    </div>
   </div>

   {/* Content */}
   {loading ? (
    <div className="flex justify-center py-20">
     <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
    </div>
   ) : error ? (
    <div className="flex flex-col items-center justify-center py-20 text-stone-400 space-y-4">
     <AlertCircle className="w-10 h-10" />
     <p className="font-medium text-xs">{error}</p>
     <button onClick={fetchMilestones} className="text-stone-900 underline font-medium text-xs">Retry</button>
    </div>
   ) : filtered.length === 0 ? (
    <EmptyHint title="No milestones found · Δεν βρέθηκαν ορόσημα" detail={searchQuery ? 'Try a different search term · Δοκιμάστε άλλον όρο' : 'Add a milestone, or ask the assistant what is overdue. · Προσθέστε ορόσημο, ή ρωτήστε τι είναι εκπρόθεσμο.'}>
     <AskLink prompt="What is overdue?" />
     <AskLink prompt="add milestone ship the MVP">Add via assistant</AskLink>
    </EmptyHint>
   ) : (
    <>
     {/* Kanban View */}
     {view === 'kanban' && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
       {KANBAN_COLUMNS.map(col => {
        const colItems = filtered.filter(m => m.status === col.key);
        const cfg = STATUS_CONFIG[col.key] || STATUS_CONFIG.Planned!;
        return (
         <div key={col.key} className="space-y-3">
          <div className="flex items-center justify-between px-1">
           <div className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
            <span className="text-[10px] font-semibold text-stone-500 tracking-wider">{col.label}</span>
           </div>
           <span className="text-[10px] font-medium text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded">{colItems.length}</span>
          </div>
          <div className="space-y-3 min-h-[120px]">
           {colItems.map((m, idx) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
             <MilestoneCard milestone={m} compact />
            </motion.div>
           ))}
           {colItems.length === 0 && (
            <div className="border-2 border-dashed border-stone-100 rounded-2xl p-6 flex flex-col items-center justify-center text-stone-300">
             <Plus className="w-4 h-4 mb-1" />
             <span className="text-[10px]">No items</span>
            </div>
           )}
          </div>
         </div>
        );
       })}
      </div>
     )}

     {/* Timeline View */}
     {view === 'timeline' && (
      <div className="space-y-6 relative before:absolute before:left-4 before:top-0 before:bottom-0 before:w-px before:bg-stone-100">
       {filtered.map((milestone, idx) => {
        const cfg = STATUS_CONFIG[milestone.status] || STATUS_CONFIG.Planned!;
        return (
         <motion.div key={milestone.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.08 }}
          className="relative pl-10">
          {/* Dot */}
          <div className="absolute left-4 -translate-x-1/2 top-4 z-10">
           <div className={cn("w-5 h-5 rounded-full border-2 border-white shadow flex items-center justify-center", cfg.dot)}>
            {milestone.status === 'Completed' && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
            {milestone.status === 'In Progress' && <TrendingUp className="w-2.5 h-2.5 text-white" />}
            {milestone.status === 'Overdue' && <AlertCircle className="w-2.5 h-2.5 text-white" />}
            {(milestone.status === 'Planned' || milestone.status === 'Delayed') && <Flag className="w-2.5 h-2.5 text-white" />}
           </div>
          </div>
          <MilestoneCard milestone={milestone} />
         </motion.div>
        );
       })}
      </div>
     )}

     {/* List View */}
     {view === 'list' && (
      <div className="bg-white rounded-2xl border border-stone-100 overflow-x-auto">
       {/* Table Header */}
       <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-stone-50 border-b border-stone-100 text-[10px] font-semibold text-stone-400 tracking-wider min-w-[720px]">
        <div className="col-span-4">Milestone</div>
        <div className="col-span-2">Category</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-1">Priority</div>
        <div className="col-span-1">Progress</div>
        <div className="col-span-2">Target Date</div>
       </div>
       {filtered.map((m, idx) => {
        const cfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.Planned!;
        return (
         <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
          className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-stone-50 hover:bg-stone-50/50 transition-colors items-center group min-w-[720px]">
          <div className="col-span-4 flex items-center gap-3 min-w-0">
           <ProgressRing progress={m.progress} size={28} stroke={2.5} />
           <div className="min-w-0">
            <p className="text-xs font-semibold text-stone-900 truncate">{m.title}</p>
            {m.description && <p className="text-[10px] text-stone-400 truncate">{m.description}</p>}
           </div>
          </div>
          <div className="col-span-2">
           <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold border", CATEGORY_COLORS[m.category] || 'text-stone-500 border-transparent')}>{m.category}</span>
          </div>
          <div className="col-span-2 flex items-center gap-1.5">
           <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
           <span className={cn("text-[10px] font-medium", cfg.color)}>{m.status}</span>
          </div>
          <div className="col-span-1">
           <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold border", PRIORITY_BADGE[m.priority])}>{m.priority}</span>
          </div>
          <div className="col-span-1">
           <span className="text-xs font-semibold text-stone-900">{m.progress}%</span>
          </div>
          <div className="col-span-2 flex items-center justify-between">
           <span className="text-[10px] text-stone-400">{new Date(m.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <button className="p-1 text-stone-300 hover:text-stone-600 rounded"><Edit3 className="w-3 h-3" /></button>
            <button className="p-1 text-stone-300 hover:text-red-400 rounded"><Trash2 className="w-3 h-3" /></button>
           </div>
          </div>
         </motion.div>
        );
       })}
      </div>
     )}
    </>
   )}

   {/* CTA */}
   <div className="bg-stone-50 border border-stone-100 rounded-2xl p-5 flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
     <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
      <Zap className="w-4 h-4" />
     </div>
     <div>
      <p className="text-xs font-semibold text-stone-900">Ready for your next milestone?</p>
      <p className="text-[10px] text-stone-400 mt-0.5">Break goals into tasks and track your journey.</p>
     </div>
    </div>
    <button type="button" onClick={() => setAdding(true)} title="Names a goal and puts it on this board. · Δίνει όνομα σε έναν στόχο και τον βάζει σε αυτόν τον πίνακα." className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-all">
     Add Milestone <ArrowRight className="w-3 h-3" />
    </button>
   </div>

  </div>
  </PageShell>
 );
}
