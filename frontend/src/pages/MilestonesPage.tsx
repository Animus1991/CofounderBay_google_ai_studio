import React, { useState, useEffect, useMemo } from 'react';
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
 Search,
 MoreVertical
} from "lucide-react";
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Milestone, User } from '../types';
import { milestoneService } from '../services/milestoneService';
import { keys, onDataChange, upsertMilestone } from '../lib/localLists';
import PageShell from '../components/ui/PageShell';
import Disclosure from '../components/ui/Disclosure';
import EmptyHint, { AskLink, ClearFiltersButton } from '../components/ui/EmptyHint';
import { labelOf } from '../lib/labels';
import { useT } from '../lib/language';
import { formatDate } from '../lib/dates';
import { usePageControls } from '../lib/pageControls';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../App';
import { useProtectedDraft } from '../lib/useProtectedDraft';
import DraftNotice from '../components/ui/DraftNotice';
import SaveStatus from '../components/ui/SaveStatus';
import { ConfirmDialog } from '../components/ui/Modal';
import { askAssistant } from '../lib/assistantBus';

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
 Planned: { color: 'text-stone-500', bg: 'bg-stone-50', dot: 'bg-stone-500' },
 Delayed: { color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
 Overdue: { color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
};

const PRIORITY_BADGE: Record<string, string> = {
 High: 'text-red-600 border-transparent',
 Medium: 'text-amber-600 border-transparent',
 Low: 'text-stone-500 border-transparent',
};

function ProgressRing({ progress, size = 40, stroke = 3.5, showValue = true }: { progress: number; size?: number; stroke?: number; showValue?: boolean }) {
 const radius = (size - stroke) / 2;
 const circumference = 2 * Math.PI * radius;
 const offset = circumference - (progress / 100) * circumference;
 return (
  <svg width={size} height={size} className="transform -rotate-90">
   <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-stone-200" />
   <circle
    cx={size / 2} cy={size / 2} r={radius} fill="none"
    stroke="currentColor"
    strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset}
    strokeLinecap="round" className={cn("transition-all duration-700", progress === 100 ? "text-emerald-500" : "text-stone-900")}
   />
   {showValue && <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
    className="fill-stone-900 text-[9px] font-semibold" transform={`rotate(90, ${size / 2}, ${size / 2})`}>
    {progress}%
   </text>}
  </svg>
 );
}

function MilestoneCard({ 
 milestone, 
 compact, 
 onEdit, 
 onDelete 
}: { 
 milestone: Milestone; 
 compact?: boolean; 
 onEdit?: (m: Milestone) => void; 
 onDelete?: (m: Milestone) => void; 
}) {
 const m = milestone;
 const t = useT();
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
      <h3 className="text-sm font-semibold text-stone-900 break-words">{milestone.title}</h3>
      <div className="flex items-center gap-1.5 mt-0.5">
       <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
       <span className={cn("text-xs font-medium", cfg.color)}>{milestone.status === 'Delayed' ? t('Delayed', 'Καθυστερημένο') : labelOf(milestone.status)}</span>
      </div>
     </div>
    </div>
    <button
     type="button"
     title={t("Ask the studio assistant about this goal", "Ρώτα τον βοηθό για αυτόν τον στόχο")}
     onClick={() => askAssistant(`What should I do about ${milestone.title}?`, { context: milestone.title })}
     className="p-1 text-stone-400 hover:text-stone-600 rounded transition-all shrink-0 focus-visible:ring-1 focus-visible:ring-stone-400"
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
    <span className={cn("px-2 py-0.5 rounded text-xs font-semibold border", CATEGORY_COLORS[milestone.category] || 'text-stone-500 border-transparent')}>
     {labelOf(milestone.category)}
    </span>
    <span className={cn("px-2 py-0.5 rounded text-xs font-semibold border", PRIORITY_BADGE[milestone.priority])}>
     {labelOf(milestone.priority)}
    </span>
   </div>

   {/* Tasks progress bar */}
   {tasksTotal > 0 && (
    <div className="space-y-1.5">
     <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-stone-400 tracking-wider">{t("Tasks", "Εργασίες")}</span>
      <span className="text-xs font-medium text-stone-400">{tasksDone}/{tasksTotal}</span>
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
         <span className={cn("text-xs", task.completed ? "text-stone-400 line-through" : "text-stone-600")}>{task.title}</span>
        </div>
       ))}
       {milestone.tasks!.length > 3 && (
        <span className="text-xs text-stone-400 pl-5">+{milestone.tasks!.length - 3} {t("more", "ακόμη")}</span>
       )}
      </div>
     )}
    </div>
   )}

   {/* Footer */}
   <div className="flex items-center justify-between pt-1 border-t border-stone-50">
    <div className="flex items-center gap-1 text-xs text-stone-400">
     <Calendar className="w-3 h-3" />
     {formatDate(milestone.targetDate, { month: 'short', day: 'numeric' })}
    </div>
    <div className="flex items-center gap-1">
     <button
      type="button"
      title={t("Edit", "Επεξεργασία")}
      onClick={() => onEdit?.(m)}
      className="p-1 text-stone-300 hover:text-stone-600 hover:bg-stone-50 rounded transition-all"
     >
      <Edit3 className="w-3 h-3" />
     </button>
     <button
      type="button"
      title={t("Delete", "Διαγραφή")}
      onClick={() => onDelete?.(m)}
      className="p-1 text-stone-300 hover:text-red-400 hover:bg-red-50 rounded transition-all"
     >
      <Trash2 className="w-3 h-3" />
     </button>
    </div>
   </div>
  </div>
 );
}

export default function MilestonesPage({ user }: MilestonesPageProps) {
 const t = useT();
 const { isDemoMode } = useAuth();
 const toast = useToast();
 const [milestones, setMilestones] = useState<Milestone[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [view, setView] = useState<ViewMode>('list');
 const [searchQuery, setSearchQuery] = useState('');
 const [categoryFilter, setCategoryFilter] = useState('All');
 const [statusFilter, setStatusFilter] = useState('All');
 const editor = useProtectedDraft('milestone', user?.id || 'anonymous', { title: '', editingId: '' });
 const [adding, setAdding] = useState(editor.dirty);
 const draftTitle = editor.value.title;
 const editingId = editor.value.editingId || null;
 const setDraftTitle = (title: string) => editor.setValue(previous => ({ ...previous, title }));
 const [saving, setSaving] = useState(false);
 const [saveError, setSaveError] = useState('');
 const [switchTarget, setSwitchTarget] = useState<Milestone | null>(null);
 const openNew = () => {
  if (saving) return;
  if (!editor.dirty) editor.reset({ title: '', editingId: '' });
  setSaveError('');
  setAdding(true);
 };
 const setShowCreate = setAdding;
 const filtersActive = Boolean(searchQuery) || categoryFilter !== 'All' || statusFilter !== 'All';
 const clearFilters = () => { setSearchQuery(''); setCategoryFilter('All'); setStatusFilter('All'); };

 useEffect(() => {
  fetchMilestones();
  return onDataChange((key) => {
   if (key === '*' || key === keys.milestones) {
    void milestoneService.getMilestones().then(({ milestones: data }) => setMilestones(data));
   }
  });
 }, []);

 usePageControls(() => [
  { id: 'new-milestone', en: 'New milestone', el: 'Νέο ορόσημο', run: openNew },
 ], [editor.dirty]);

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
  if (!title || saving) return;
  setSaving(true);
  setSaveError('');
  try {
  if (editingId) {
   const updated = await milestoneService.updateMilestone(editingId, { title });
   setMilestones((prev) => prev.map((m) => (m.id === editingId ? updated : m)));
  } else {
   const created = await milestoneService.createMilestone({ title, ownerId: user?.id || 'me' });
   // The write also refreshes subscribers before this promise resolves.
   // Merge by identity so one saved record cannot appear twice.
   setMilestones((prev) => [created, ...prev.filter((m) => m.id !== created.id)]);
  }
  editor.reset({ title: '', editingId: '' });
  setAdding(false);
  } catch {
   setSaveError(t('Could not save. Your draft is still here — try again.', 'Η αποθήκευση απέτυχε. Το πρόχειρο διατηρήθηκε — δοκίμασε ξανά.'));
  } finally {
   setSaving(false);
  }
 };
 const handleEdit = (m: Milestone) => {
  if (saving) return;
  if (editor.dirty && editingId !== m.id) { setSwitchTarget(m); return; }
  if (!editor.dirty) editor.reset({ title: m.title, editingId: m.id });
  setSaveError('');
  setShowCreate(true);
 };
 const handleDelete = async (id: string) => {
  const item = milestones.find((m) => m.id === id);
  await milestoneService.deleteMilestone(id);
  setMilestones((prev) => prev.filter((m) => m.id !== id));
  if (item) {
   toast.toast({
    type: 'info',
    title: t('Milestone deleted', 'Το ορόσημο διαγράφηκε'),
    duration: 6000,
    action: { label: t('Undo', 'Αναίρεση'), run: () => setMilestones(upsertMilestone(item)) },
   });
  }
 };

 const categories = useMemo(() => ['All', ...Array.from(new Set(milestones.map(m => m.category)))], [milestones]);

 const filtered = useMemo(() => {
  // Order by what needs attention: overdue first, then open ones by due date, finished last.
  const rank = (m: Milestone) => (m.status === 'Overdue' ? 0 : m.status === 'Completed' ? 2 : 1);
  const due = (m: Milestone) => { const v = new Date(m.targetDate).getTime(); return Number.isFinite(v) ? v : Number.MAX_SAFE_INTEGER; };
  return milestones.filter(m => {
   const matchSearch = !searchQuery || m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.description?.toLowerCase().includes(searchQuery.toLowerCase());
   const matchCat = categoryFilter === 'All' || m.category === categoryFilter;
   const matchStatus = statusFilter === 'All' || m.status === statusFilter;
   return matchSearch && matchCat && matchStatus;
  }).sort((a, b) => rank(a) - rank(b) || due(a) - due(b));
 }, [milestones, searchQuery, categoryFilter, statusFilter]);

 const overallProgress = milestones.length > 0 ? Math.round(milestones.reduce((sum, m) => sum + m.progress, 0) / milestones.length) : 0;

 // Each card doubles as the filter for its own status, so the number you read is
 // the number you can click. "Overall" clears the filter back to every milestone.
 const stats: { label: string; value: string | number; icon: React.ElementType; ring?: boolean; color?: string; status: string }[] = [
  { label: t('Overall', 'Συνολικά'), value: `${overallProgress}%`, icon: Target, ring: true, status: 'All' },
  { label: labelOf('Completed'), value: milestones.filter(m => m.status === 'Completed').length, icon: CheckCircle2, color: 'emerald', status: 'Completed' },
  { label: labelOf('In Progress'), value: milestones.filter(m => m.status === 'In Progress').length, icon: TrendingUp, color: 'blue', status: 'In Progress' },
  { label: labelOf('Upcoming'), value: milestones.filter(m => m.status === 'Planned').length, icon: Clock, color: 'amber', status: 'Planned' },
  { label: labelOf('Overdue'), value: milestones.filter(m => m.status === 'Overdue').length, icon: AlertCircle, color: 'red', status: 'Overdue' },
 ];

 const KANBAN_COLUMNS: { key: Milestone['status']; label: string }[] = [
  { key: 'Planned', label: 'Planned' },
  { key: 'In Progress', label: 'In Progress' },
  { key: 'Completed', label: 'Completed' },
  { key: 'Overdue', label: 'Overdue' },
 ];

 return (
  <PageShell
   sample={isDemoMode}
   title={t("Milestones", "Ορόσημα")}
   description={t('Goals, progress and wins.', 'Στόχοι, πρόοδος και επιτυχίες.')}
   actions={
    <div className="flex flex-wrap items-center gap-2">
     <AskLink prompt="What is overdue?">{t("Ask assistant", "Ρώτα τον βοηθό")}</AskLink>
     <button type="button" disabled={saving} onClick={openNew} title={t('Names a goal and puts it on this board.', 'Δίνει όνομα σε έναν στόχο και τον βάζει σε αυτόν τον πίνακα.')} className="inline-flex min-h-11 items-center gap-1.5 px-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-all">
      <Plus className="w-3.5 h-3.5" /> {t('Add Milestone', 'Νέο ορόσημο')}
     </button>
    </div>
   }
  >
  <div className="space-y-4">

   {/* Compact status filters retain every count without five competing cards. */}
   <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("Filter by status", "Φίλτρο κατάστασης")}>
    {stats.map((stat) => {
     const active = statusFilter === stat.status;
     const isAll = stat.status === 'All';
     return (
      <button
       key={stat.label}
       type="button"
       aria-pressed={active}
       onClick={() => setStatusFilter(active && !isAll ? 'All' : stat.status)}
       title={isAll
        ? t('Show every milestone', 'Εμφάνιση όλων των οροσήμων')
        : t(`Show only: ${stat.label}`, `Εμφάνιση μόνο: ${stat.label}`)}
       className={cn(
        "bg-white px-3 py-1 rounded-lg border text-left inline-flex items-center gap-2 transition-all hover:border-stone-300",
        active ? "border-stone-300 bg-stone-50" : "border-transparent",
       )}
      >
       {stat.ring ? (
        <ProgressRing progress={overallProgress} size={36} stroke={3} showValue={false} />
       ) : (
        <div className={cn("p-1 rounded-md",
         stat.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
         stat.color === 'blue' ? "bg-blue-50 text-blue-600" :
         stat.color === 'red' ? "bg-red-50 text-red-600" :
         "bg-amber-50 text-amber-600"
        )}>
         <stat.icon className="w-4 h-4" />
        </div>
       )}
       <div className="min-w-0 flex flex-wrap items-baseline gap-x-1.5">
        <div className="text-sm font-semibold text-stone-900">{stat.value}</div>
        <div className="text-xs text-stone-500">{stat.label}</div>
       </div>
      </button>
     );
    })}
   </div>

   {/* The editor stays outside disclosures and view changes preserve its draft. */}
   <SaveStatus listKey={keys.milestones} />
   {adding && (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-2">
    <form onSubmit={(e) => { e.preventDefault(); void saveMilestone(); }} className="flex flex-col sm:flex-row sm:items-center gap-2">
     <input
      type="text"
      value={draftTitle}
      disabled={saving}
      onChange={(e) => setDraftTitle(e.target.value)}
      aria-label={t('Milestone title', 'Τίτλος οροσήμου')}
      placeholder={editingId ? t('Edit milestone title', 'Επεξεργασία οροσήμου') : t('Name the milestone', 'Όνομα οροσήμου')}
      className="w-full min-w-0 flex-1 pl-3 pr-3 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
      autoFocus
     />
     <div className="flex items-center gap-2">
      <button type="submit" disabled={saving || !draftTitle.trim()} className="min-h-8 px-3 py-1 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-all disabled:opacity-50">{saving ? t('Saving…', 'Αποθηκεύεται…') : editingId ? t('Update', 'Ενημέρωση') : t('Save', 'Αποθήκευση')}</button>
      <button type="button" disabled={saving} onClick={() => setAdding(false)} className="min-h-8 px-3 py-1 text-sm font-medium text-stone-500 hover:text-stone-900">{t('Close', 'Κλείσιμο')}</button>
     </div>
    </form>
    {saveError && <p role="alert" className="text-xs text-red-700">{saveError}</p>}
    {!saving && <DraftNotice {...editor} onDiscard={() => { editor.reset(); setSaveError(''); setAdding(false); }} />}
    </div>
   )}
   {!adding && editor.dirty && <button type="button" className="text-xs text-stone-600 underline underline-offset-2" onClick={() => setAdding(true)}>{t('Continue your unsubmitted draft', 'Συνέχεια μη υποβληθέντος πρόχειρου')}</button>}
   <ConfirmDialog open={!!switchTarget} onClose={() => setSwitchTarget(null)}
    title={t('Replace the current draft?', 'Να αντικατασταθεί το τρέχον πρόχειρο;')}
    description={t('The unsaved draft will be discarded so you can edit the other milestone. Saved milestones will not change.', 'Το μη αποθηκευμένο πρόχειρο θα διαγραφεί για να επεξεργαστείς το άλλο ορόσημο. Τα αποθηκευμένα ορόσημα δεν θα αλλάξουν.')}
    confirmLabel={t('Discard and edit', 'Διαγραφή και επεξεργασία')} variant="danger"
    onConfirm={() => { if (switchTarget) { editor.reset({ title: switchTarget.title, editingId: switchTarget.id }); setSaveError(''); setAdding(true); } setSwitchTarget(null); }} />

   {/* Search and named view modes remain immediately available. */}
   <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
    <div className="relative flex-1 w-full">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
     <input
      type="text" placeholder={t("Search milestones...", "Αναζήτηση…")}
      aria-label={t("Search milestones", "Αναζήτηση οροσήμων")}
      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
     />
    </div>
     <div role="group" aria-label={t("Milestone view", "Προβολή οροσήμων")} className="flex flex-wrap items-center gap-0.5 rounded-lg border border-stone-200 bg-white p-0.5">
      {([
       { key: 'kanban' as ViewMode, icon: LayoutGrid, tip: t('Board', 'Πίνακας') },
       { key: 'timeline' as ViewMode, icon: GitBranch, tip: t('Timeline', 'Χρονολόγιο') },
       { key: 'list' as ViewMode, icon: List, tip: t('List', 'Λίστα') },
      ]).map(v => (
       <button type="button" key={v.key} onClick={() => setView(v.key)} title={v.tip} aria-pressed={view === v.key}
        className={cn("inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-all", view === v.key ? "bg-stone-100 text-stone-900" : "text-stone-500 hover:text-stone-700 hover:bg-stone-50")}>
        <v.icon aria-hidden="true" className="w-3.5 h-3.5" /> {v.tip}
       </button>
      ))}
     </div>
   </div>

   <Disclosure title={t("Category filter", "Φίλτρο κατηγορίας")} hint={categoryFilter === 'All' ? t("All categories included.", "Περιλαμβάνονται όλες οι κατηγορίες.") : `${t("Selected", "Επιλογή")}: ${labelOf(categoryFilter)}`}>
    <div role="group" aria-label={t("Milestone category", "Κατηγορία οροσήμων")} className="flex flex-wrap items-center gap-1">
     {categories.map(cat => (
      <button type="button" key={cat} onClick={() => setCategoryFilter(cat)} aria-pressed={categoryFilter === cat}
       className={cn("px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
        categoryFilter === cat ? "bg-stone-100 text-stone-900" : "text-stone-500 hover:bg-stone-50"
       )}>
       {cat === 'All' ? t('All', 'Όλα') : labelOf(cat)}
      </button>
     ))}
    </div>
   </Disclosure>
   {filtersActive && filtered.length > 0 && (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
     <span>{filtered.length} / {milestones.length} {t("milestones match your filters", "ορόσημα ταιριάζουν στα φίλτρα")}</span>
     <ClearFiltersButton onClick={clearFilters} />
    </div>
   )}

   {/* Content */}
   {loading ? (
    <div className="flex justify-center py-20">
     <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
    </div>
   ) : error ? (
    <div className="flex flex-col items-center justify-center py-20 text-stone-400 space-y-4">
     <AlertCircle className="w-10 h-10" />
     <p className="font-medium text-xs">{t("Failed to load milestones.", "Αποτυχία φόρτωσης οροσήμων.")}</p>
     <button onClick={fetchMilestones} className="text-stone-900 underline font-medium text-xs">{t("Retry", "Δοκίμασε ξανά")}</button>
    </div>
   ) : filtered.length === 0 ? (
    <EmptyHint
     title={t('No milestones found', 'Δεν βρέθηκαν ορόσημα')}
     detail={filtersActive
      ? t('No milestone matches the current filters.', 'Κανένα ορόσημο δεν ταιριάζει με τα ενεργά φίλτρα.')
      : t('Add a milestone, or ask the assistant what is overdue.', 'Πρόσθεσε ορόσημο, ή ρώτα τι είναι εκπρόθεσμο.')}
    >
     {filtersActive && <ClearFiltersButton onClick={clearFilters} />}
     <AskLink prompt="What is overdue?">{t("Ask assistant", "Ρώτα τον βοηθό")}</AskLink>
     <AskLink prompt="add milestone ship the MVP">{t("Add via assistant", "Προσθήκη μέσω βοηθού")}</AskLink>
    </EmptyHint>
   ) : (
    <>
     {/* Kanban View */}
     {view === 'kanban' && (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-4">
       {KANBAN_COLUMNS.map(col => {
        const colItems = filtered.filter(m => m.status === col.key);
        const cfg = STATUS_CONFIG[col.key] || STATUS_CONFIG.Planned!;
        return (
         <div key={col.key} className="space-y-3">
          <div className="flex items-center justify-between px-1">
           <div className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
            <span className="text-xs font-semibold text-stone-500 tracking-wider">{labelOf(col.label)}</span>
           </div>
           <span className="text-xs font-medium text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded">{colItems.length}</span>
          </div>
          <div className="space-y-3">
           {colItems.map((m, idx) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
             <MilestoneCard milestone={m} compact onEdit={handleEdit} onDelete={(item) => handleDelete(item.id)} />
            </motion.div>
           ))}
           {colItems.length === 0 && (
            <p className="text-xs text-stone-400 px-1">{t("No items", "Κανένα")}</p>
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
          <MilestoneCard milestone={milestone} onEdit={handleEdit} onDelete={(item) => handleDelete(item.id)} />
         </motion.div>
        );
       })}
      </div>
     )}

     {/* List View */}
     {view === 'list' && (
      <>
      <div className="space-y-2 sm:hidden">
       {filtered.map(m => <MilestoneCard key={m.id} milestone={m} compact onEdit={handleEdit} onDelete={(item) => handleDelete(item.id)} />)}
      </div>
      <div role="region" aria-label={t("Milestone details table. Scroll horizontally to see all columns.", "Πίνακας οροσήμων. Κύλησε οριζόντια για όλες τις στήλες.")} tabIndex={0} className="hidden sm:block bg-white rounded-xl border border-stone-100 overflow-x-auto focus-visible:outline-1 focus-visible:outline-stone-400">
       {/* Table Header */}
       <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-stone-50 border-b border-stone-100 text-xs font-semibold text-stone-400 tracking-wider min-w-[720px]">
        <div className="col-span-4">{t("Milestone", "Ορόσημο")}</div>
        <div className="col-span-2">{t("Category", "Κατηγορία")}</div>
        <div className="col-span-2">{t("Status", "Κατάσταση")}</div>
        <div className="col-span-1">{t("Priority", "Προτεραιότητα")}</div>
        <div className="col-span-1">{t("Progress", "Πρόοδος")}</div>
        <div className="col-span-2">{t("Target Date", "Ημερομηνία στόχος")}</div>
       </div>
       {filtered.map((m, idx) => {
        const cfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.Planned!;
        return (
         <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
          className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-stone-50 hover:bg-stone-50/50 transition-colors items-center group min-w-[720px]">
          <div className="col-span-4 flex items-center gap-3 min-w-0">
           <ProgressRing progress={m.progress} size={28} stroke={2.5} showValue={false} />
           <div className="min-w-0">
            <p className="text-xs font-semibold text-stone-900 break-words">{m.title}</p>
            {m.description && <p className="text-xs text-stone-400 truncate">{m.description}</p>}
           </div>
          </div>
          <div className="col-span-2">
           <span className={cn("px-2 py-0.5 rounded text-xs font-semibold border", CATEGORY_COLORS[m.category] || 'text-stone-500 border-transparent')}>{labelOf(m.category)}</span>
          </div>
          <div className="col-span-2 flex items-center gap-1.5">
           <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
           <span className={cn("text-xs font-medium", cfg.color)}>{m.status === 'Delayed' ? t('Delayed', 'Καθυστερημένο') : labelOf(m.status)}</span>
          </div>
          <div className="col-span-1">
           <span className={cn("px-1.5 py-0.5 rounded text-xs font-semibold border", PRIORITY_BADGE[m.priority])}>{labelOf(m.priority)}</span>
          </div>
          <div className="col-span-1">
           <span className="text-xs font-semibold text-stone-900">{m.progress}%</span>
          </div>
          <div className="col-span-2 flex items-center justify-between">
           <span className="text-xs text-stone-400">{formatDate(m.targetDate)}</span>
           <div className="flex items-center gap-1 transition-all">
            <button type="button" aria-label={t(`Edit milestone: ${m.title}`, `Επεξεργασία οροσήμου: ${m.title}`)} className="p-1 text-stone-300 hover:text-stone-600 rounded" onClick={() => handleEdit(m)}><Edit3 className="w-3 h-3" /></button>
            <button type="button" aria-label={t(`Delete milestone: ${m.title}`, `Διαγραφή οροσήμου: ${m.title}`)} className="p-1 text-stone-300 hover:text-red-400 rounded" onClick={() => void handleDelete(m.id)}><Trash2 className="w-3 h-3" /></button>
           </div>
          </div>
         </motion.div>
        );
       })}
      </div>
      </>
     )}
    </>
   )}

   {/* CTA */}
   <div className="bg-stone-50 border border-stone-100 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
    <div className="flex items-center gap-3">
     <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
      <Zap className="w-4 h-4" />
     </div>
     <div>
      <p className="text-xs font-semibold text-stone-900">{t("Ready for your next milestone?", "Πάμε για το επόμενο ορόσημο;")}</p>
      <p className="text-xs text-stone-400 mt-0.5">{t("Break goals into tasks and track your journey.", "Χώρισε τους στόχους σε εργασίες και παρακολούθησε τη διαδρομή.")}</p>
     </div>
    </div>
    <button type="button" onClick={openNew} title={t('Names a goal and puts it on this board.', 'Δίνει όνομα σε έναν στόχο και τον βάζει σε αυτόν τον πίνακα.')} className="shrink-0 inline-flex min-h-8 items-center gap-1.5 px-3 py-1 border border-stone-200 bg-white text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-100 transition-all">
     {t('Add Milestone', 'Νέο ορόσημο')} <ArrowRight className="w-3 h-3" />
    </button>
   </div>

  </div>
  </PageShell>
 );
}
