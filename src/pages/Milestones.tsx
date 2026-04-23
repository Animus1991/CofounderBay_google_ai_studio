import { useState, useEffect } from "react";
import { 
 Flag, Calendar as CalendarIcon, CheckCircle2, Circle, 
 Clock, Plus, Filter, MoreVertical, ChevronRight,
 Target, Rocket, TrendingUp, Shield, Zap, AlertCircle, Trash2
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { cn } from "../lib/utils";
import { User, Milestone, MilestoneTask } from "../types";
import { milestoneService } from "../services/milestoneService";
import PageContainer from "../components/layout/PageContainer";
import { motion, AnimatePresence } from "framer-motion";

interface MilestonesProps {
 user?: User;
}

export default function Milestones({ user }: MilestonesProps) {
 const [activeFilter, setActiveFilter] = useState('All');
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
 const [deletingMilestone, setDeletingMilestone] = useState<Milestone | null>(null);
 const [deletingTask, setDeletingTask] = useState<{ milestoneId: string; taskId: string; title: string, isModalTask?: boolean, index?: number } | null>(null);
 const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
 const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({});
 const [newTaskDueDates, setNewTaskDueDates] = useState<Record<string, string>>({});

 const [milestones, setMilestones] = useState<Milestone[]>([]);
 const [loading, setLoading] = useState(true);
 const [loadingMore, setLoadingMore] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [page, setPage] = useState(1);
 const [total, setTotal] = useState(0);
 const [searchQuery, setSearchQuery] = useState('');
 const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
 const [selectedPriority, setSelectedPriority] = useState<Milestone['priority'] | undefined>(undefined);
 const LIMIT = 5;

 const [formData, setFormData] = useState<Partial<Milestone>>({
  title: '',
  description: '',
  targetDate: '',
  category: 'Product',
  priority: 'Medium',
  status: 'Planned',
  progress: 0
 });

 useEffect(() => {
  fetchMilestones(1, true);
 }, [activeFilter, selectedCategory, selectedPriority, searchQuery]);

 const fetchMilestones = async (pageNum: number, reset: boolean = false) => {
  if (reset) setLoading(true);
  else setLoadingMore(true);
  setError(null);
  
  try {
   const { milestones: newData, total: newTotal } = await milestoneService.getMilestones({
    status: activeFilter as any,
    category: selectedCategory,
    priority: selectedPriority,
    search: searchQuery,
    page: pageNum,
    limit: LIMIT
   });
   
   if (reset) {
    setMilestones(newData);
   } else {
    setMilestones(prev => [...prev, ...newData]);
   }
   setTotal(newTotal);
   setPage(pageNum);
  } catch (error) {
   console.error("Error fetching milestones:", error);
   setError("Failed to load milestones. Please try again.");
  } finally {
   setLoading(false);
   setLoadingMore(false);
  }
 };

 const handleLoadMore = () => {
  if (milestones.length < total) {
   fetchMilestones(page + 1);
  }
 };

 const handleOpenModal = (milestone?: Milestone) => {
  if (milestone) {
   setEditingMilestone(milestone);
   setFormData(milestone);
  } else {
   setEditingMilestone(null);
   setFormData({
    title: '',
    description: '',
    targetDate: '',
    category: 'Product',
    priority: 'Medium',
    status: 'Planned',
    progress: 0
   });
  }
  setIsModalOpen(true);
 };

 const handleCloseModal = () => {
  setIsModalOpen(false);
  setEditingMilestone(null);
 };

 const handleDeleteMilestone = async () => {
  if (!deletingMilestone) return;
  try {
   await milestoneService.deleteMilestone(deletingMilestone.id);
   setMilestones(prev => prev.filter(m => m.id !== deletingMilestone.id));
   setDeletingMilestone(null);
  } catch (error) {
   console.error("Error deleting milestone:", error);
  }
 };

 const handleToggleTaskInMilestone = async (milestoneId: string, taskId: string) => {
  const milestone = milestones.find(m => m.id === milestoneId);
  if (!milestone) return;
  const taskIndex = milestone.tasks?.findIndex(t => t.id === taskId);
  if (taskIndex === undefined || taskIndex === -1) return;
  
  const newTasks = [...(milestone.tasks || [])];
  newTasks[taskIndex].completed = !newTasks[taskIndex].completed;
  
  const completedTasks = newTasks.filter(t => t.completed).length;
  const totalTasks = newTasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : milestone.progress;
  
  setMilestones(prev => prev.map(m => m.id === milestoneId ? { ...m, tasks: newTasks, progress } : m));
  
  try {
   await milestoneService.updateMilestone(milestoneId, { tasks: newTasks, progress });
  } catch (e) {
   console.error("Failed to update task", e);
   fetchMilestones(page, true);
  }
 };

 const handleAddNewTaskToMilestone = async (milestoneId: string) => {
  const title = newTaskTitles[milestoneId];
  const dueDate = newTaskDueDates[milestoneId];
  if (!title || !title.trim()) return;
  
  const milestone = milestones.find(m => m.id === milestoneId);
  if (!milestone) return;
  
  const newTask: MilestoneTask = {
   id: Math.random().toString(36).substr(2, 9),
   title: title.trim(),
   completed: false,
   ...(dueDate ? { dueDate } : {})
  };
  
  const newTasks = [...(milestone.tasks || []), newTask];
  
  const completedTasks = newTasks.filter(t => t.completed).length;
  const totalTasks = newTasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : milestone.progress;
  
  setMilestones(prev => prev.map(m => m.id === milestoneId ? { ...m, tasks: newTasks, progress } : m));
  setNewTaskTitles(prev => ({ ...prev, [milestoneId]: '' }));
  setNewTaskDueDates(prev => ({ ...prev, [milestoneId]: '' }));
  
  try {
   await milestoneService.updateMilestone(milestoneId, { tasks: newTasks, progress });
  } catch (e) {
   console.error("Failed to add task", e);
   fetchMilestones(page, true);
  }
 };

 const handleDeleteTaskFromMilestone = async () => {
  if (!deletingTask || deletingTask.isModalTask) return;
  const { milestoneId, taskId } = deletingTask;
  
  const milestone = milestones.find(m => m.id === milestoneId);
  if (!milestone) return;
  
  const newTasks = (milestone.tasks || []).filter(t => t.id !== taskId);
  
  const completedTasks = newTasks.filter(t => t.completed).length;
  const totalTasks = newTasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : milestone.progress;
  
  setMilestones(prev => prev.map(m => m.id === milestoneId ? { ...m, tasks: newTasks, progress } : m));
  setDeletingTask(null);
  
  try {
   await milestoneService.updateMilestone(milestoneId, { tasks: newTasks, progress });
  } catch (e) {
   console.error("Failed to delete task", e);
   fetchMilestones(page, true);
  }
 };

 const handleAddTask = () => {
  const newTask = {
   id: Math.random().toString(36).substr(2, 9),
   title: '',
   completed: false
  };
  setFormData(prev => ({
   ...prev,
   tasks: [...(prev.tasks || []), newTask]
  }));
 };

 const handleToggleTask = (index: number) => {
  const newTasks = [...(formData.tasks || [])];
  newTasks[index] = { ...newTasks[index], completed: !newTasks[index].completed };
  setFormData(prev => ({ ...prev, tasks: newTasks }));
 };

 const handleUpdateTask = (index: number, title: string, dueDate?: string) => {
  const newTasks = [...(formData.tasks || [])];
  newTasks[index] = { ...newTasks[index], title, ...(dueDate !== undefined ? { dueDate } : {}) };
  setFormData(prev => ({ ...prev, tasks: newTasks }));
 };

 const handleRemoveTask = (index: number) => {
  setDeletingTask({ milestoneId: '', taskId: '', title: formData.tasks?.[index]?.title || 'Task', isModalTask: true, index });
 };

 const confirmDeleteModalTask = () => {
  if (!deletingTask || !deletingTask.isModalTask || deletingTask.index === undefined) return;
  const newTasks = [...(formData.tasks || [])];
  newTasks.splice(deletingTask.index, 1);
  setFormData(prev => ({ ...prev, tasks: newTasks }));
  setDeletingTask(null);
 };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
   if (editingMilestone) {
    await milestoneService.updateMilestone(editingMilestone.id, formData);
   } else {
    await milestoneService.createMilestone({
     ...formData,
     ownerId: user?.id || "1"
    });
   }
   await fetchMilestones(1, true);
   handleCloseModal();
  } catch (error) {
   console.error("Error saving milestone:", error);
  }
 };

 const getStatusColor = (status: Milestone['status']) => {
  switch (status) {
   case 'Completed': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
   case 'In Progress': return 'text-amber-500 bg-amber-50 border-amber-100';
   case 'Overdue': return 'text-red-500 bg-red-50 border-red-100';
   case 'Delayed': return 'text-orange-500 bg-orange-50 border-orange-100';
   default: return 'text-stone-400 bg-stone-50 border-stone-100';
  }
 };

 const filteredMilestones = milestones; // Already filtered by service

 const overallProgress = milestones.length > 0 
  ? Math.round((milestones.filter(m => m.status === 'Completed').length / milestones.length) * 100)
  : 0;

 return (
  <PageContainer>
   <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-8"
   >
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
     <div className="space-y-1">
      <h2 className="text-xl font-medium tracking-tight text-stone-900">Strategic Milestones</h2>
      <p className="text-stone-500 font-medium">Track your startup's progress and key achievements.</p>
     </div>
     <div className="flex items-center gap-3">
      <div className="relative hidden md:block">
       <input
        type="text"
        placeholder="Search milestones..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 w-64 transition-all"
       />
       <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
      </div>
      <Button className="bg-stone-900 hover:bg-stone-800 text-white border-none rounded-xl h-10 px-6 font-medium text-xs uppercase tracking-widest shadow-lg shadow-stone-200" onClick={() => handleOpenModal()}>
       <Plus className="w-4 h-4 mr-2" /> Add Milestone
      </Button>
     </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
     {/* Stats Summary */}
     <div className="lg:col-span-1 space-y-6">
      <Card className="bg-stone-900 text-white border-none shadow-2xl relative overflow-hidden group">
       <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all"></div>
       <div className="space-y-6 relative z-10">
        <div className="flex items-center justify-between">
         <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
          <Target className="w-6 h-6 text-stone-300" />
         </div>
         <span className="text-xs font-medium uppercase tracking-widest text-stone-400">Overall Progress</span>
        </div>
        <div>
         <div className="flex items-baseline gap-2">
          <p className="text-xl font-medium tracking-tighter">{overallProgress}%</p>
          <TrendingUp className="w-5 h-5 text-emerald-400" />
         </div>
         <div className="mt-6 h-2 bg-white/10 rounded-full overflow-hidden shadow-inner">
          <motion.div 
           initial={{ width: 0 }}
           animate={{ width: `${overallProgress}%` }}
           transition={{ duration: 1.5, ease: "easeOut" }}
           className="h-full bg-white shadow-lg shadow-white/20" 
          ></motion.div>
         </div>
        </div>
        <p className="text-xs text-stone-400 font-medium uppercase tracking-widest">
         {milestones.filter(m => m.status === 'Completed').length} of {milestones.length} milestones completed
        </p>
       </div>
      </Card>

      <Card className="border-stone-200/60 shadow-sm">
       <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-stone-50 rounded-xl border border-stone-100">
         <Shield className="w-4 h-4 text-stone-900" />
        </div>
        <h3 className="text-sm font-medium text-stone-900 uppercase tracking-widest">Categories</h3>
       </div>
       <div className="space-y-4">
        {['Product', 'Legal', 'Funding', 'Marketing', 'Team'].map((cat) => (
         <div 
          key={cat} 
          className={cn(
           "flex items-center justify-between group cursor-pointer",
           selectedCategory === cat && "text-stone-900"
          )}
          onClick={() => setSelectedCategory(selectedCategory === cat ? undefined : cat)}
         >
          <div className="flex items-center gap-3">
           <div className={cn(
            "w-2 h-2 rounded-full transition-colors",
            selectedCategory === cat ? "bg-stone-900" : "bg-stone-200 group-hover:bg-stone-900"
           )}></div>
           <span className={cn(
            "text-xs font-medium transition-colors uppercase tracking-widest",
            selectedCategory === cat ? "text-stone-900" : "text-stone-500 group-hover:text-stone-900"
           )}>{cat}</span>
          </div>
         </div>
        ))}
       </div>
      </Card>

      <Card className="border-stone-200/60 shadow-sm">
       <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-stone-50 rounded-xl border border-stone-100">
         <Flag className="w-4 h-4 text-stone-900" />
        </div>
        <h3 className="text-sm font-medium text-stone-900 uppercase tracking-widest">Priority</h3>
       </div>
       <div className="space-y-4">
        {['High', 'Medium', 'Low'].map((p) => (
         <div 
          key={p} 
          className={cn(
           "flex items-center justify-between group cursor-pointer",
           selectedPriority === p && "text-stone-900"
          )}
          onClick={() => setSelectedPriority(selectedPriority === p ? undefined : p as any)}
         >
          <div className="flex items-center gap-3">
           <div className={cn(
            "w-2 h-2 rounded-full transition-colors",
            selectedPriority === p ? "bg-stone-900" : "bg-stone-200 group-hover:bg-stone-900"
           )}></div>
           <span className={cn(
            "text-xs font-medium transition-colors uppercase tracking-widest",
            selectedPriority === p ? "text-stone-900" : "text-stone-500 group-hover:text-stone-900"
           )}>{p}</span>
          </div>
         </div>
        ))}
       </div>
      </Card>

      <Card className="bg-amber-50 border-amber-100 shadow-sm">
       <div className="flex gap-4">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm flex-shrink-0 border border-amber-100">
         <Zap className="w-6 h-6" />
        </div>
        <div className="space-y-1">
         <h4 className="font-medium text-sm text-stone-900 uppercase tracking-widest">Next Big Step</h4>
         <p className="text-xs text-stone-600 leading-relaxed">
          {milestones.find(m => m.status === 'In Progress')?.title || 'No active milestones'}. Keep pushing!
         </p>
        </div>
       </div>
      </Card>
     </div>

     {/* Milestone Timeline/List */}
     <div className="lg:col-span-3 space-y-6">
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-stone-200 shadow-sm w-fit">
       {['All', 'Active', 'Completed', 'Overdue'].map((tab) => (
        <button
         key={tab}
         onClick={() => setActiveFilter(tab)}
         className={cn(
          "px-5 py-2.5 text-xs font-medium uppercase tracking-widest rounded-xl transition-all",
          activeFilter === tab 
           ? "bg-stone-900 text-white shadow-lg shadow-stone-900/20" 
           : "text-stone-400 hover:text-stone-900 hover:bg-stone-50"
         )}
        >
         {tab}
        </button>
       ))}
      </div>

      <div className="space-y-4">
       {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium flex items-center gap-3">
         <AlertCircle className="w-5 h-5" />
         {error}
         <button onClick={() => fetchMilestones(1, true)} className="ml-auto underline text-xs uppercase tracking-widest font-medium">Retry</button>
        </div>
       )}
       {loading ? (
        [1, 2, 3].map(i => (
         <div key={i} className="h-40 bg-stone-100 rounded-[2rem] animate-pulse"></div>
        ))
       ) : (
        <AnimatePresence mode="popLayout">
         {filteredMilestones.map((milestone, i) => (
          <motion.div
           key={milestone.id}
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: 20 }}
           transition={{ delay: i * 0.05 }}
          >
           <Card className="group hover:border-stone-900 transition-all border-stone-200/60 shadow-sm hover:shadow-xl rounded-[2rem] p-8">
            <div className="flex items-start gap-8">
             <div className={cn(
              "w-16 h-16 rounded-[1.5rem] flex items-center justify-center border-2 transition-all shadow-inner shrink-0",
              milestone.status === 'Completed' ? "bg-emerald-50 border-emerald-100 text-emerald-500" : "bg-stone-50 border-stone-100 text-stone-300"
             )}>
              {milestone.status === 'Completed' ? <CheckCircle2 className="w-8 h-8" /> : <Flag className="w-8 h-8" />}
             </div>
             
             <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                <h3 className="font-medium text-xl text-stone-900 tracking-tight">{milestone.title}</h3>
                <span className={cn(
                 "text-xs font-medium px-3 py-1 rounded-full border uppercase tracking-widest inline-flex items-center gap-1.5",
                 getStatusColor(milestone.status)
                )}>
                 <div className={cn("w-1.5 h-1.5 rounded-full", 
                  milestone.status === 'Completed' ? "bg-emerald-500" : 
                  milestone.status === 'In Progress' ? "bg-amber-500" : 
                  milestone.status === 'Overdue' ? "bg-red-500" : "bg-stone-400"
                 )}></div>
                 {milestone.status}
                </span>
               </div>
               <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <Button 
                 variant="ghost" 
                 size="icon" 
                 className="h-10 w-10 rounded-xl hover:bg-stone-100 border border-transparent hover:border-stone-200"
                 onClick={() => handleOpenModal(milestone)}
                >
                 <MoreVertical className="w-5 h-5 text-stone-400" />
                </Button>
               </div>
              </div>
              
              <p className="text-sm text-stone-500 leading-relaxed font-medium max-w-3xl">
               {milestone.description}
              </p>

              {milestone.tasks && milestone.tasks.length > 0 && (
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {milestone.tasks.map(task => (
                 <div key={task.id} className="flex items-center justify-between p-2 bg-stone-50/50 rounded-xl border border-stone-100/50 group/task hover:bg-stone-50 transition-colors">
                  <div 
                   className="flex items-center gap-3 flex-1 cursor-pointer overflow-hidden" 
                   onClick={() => handleToggleTaskInMilestone(milestone.id, task.id)}
                  >
                   <div className={cn(
                    "w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all",
                    task.completed ? "bg-stone-900 border-stone-900" : "border-stone-300 bg-white"
                   )}>
                    {task.completed && <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />}
                   </div>
                   <div className="flex flex-col min-w-0">
                    <span className={cn(
                     "text-xs font-semibold tracking-wide truncate transition-all duration-300",
                     task.completed ? "text-stone-400 line-through" : "text-stone-700"
                    )}>{task.title}</span>
                    {task.dueDate && (
                     <span className={cn(
                      "text-[10px] font-medium uppercase tracking-widest mt-0.5",
                      task.completed ? "text-stone-400" : (new Date(task.dueDate) < new Date() ? "text-red-500" : "text-stone-500")
                     )}>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    )}
                   </div>
                  </div>
                  <button 
                   className="opacity-0 group-hover/task:opacity-100 shrink-0 p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                   onClick={(e) => {
                    e.stopPropagation();
                    setDeletingTask({ milestoneId: milestone.id, taskId: task.id, title: task.title });
                   }}
                   title="Delete task"
                  >
                   <Trash2 className="w-3.5 h-3.5" />
                  </button>
                 </div>
                ))}
               </div>
              )}
              
              <div className="flex flex-col sm:flex-row items-end gap-3 pt-2">
               <div className="flex-1 space-y-2 w-full">
                <input
                 type="text"
                 placeholder="+ Add a new task..."
                 value={newTaskTitles[milestone.id] || ''}
                 onChange={(e) => setNewTaskTitles(prev => ({ ...prev, [milestone.id]: e.target.value }))}
                 onKeyDown={(e) => e.key === 'Enter' && handleAddNewTaskToMilestone(milestone.id)}
                 className="w-full text-xs font-medium bg-transparent border-b border-stone-200 focus:border-stone-400 px-1 py-1.5 outline-none transition-colors placeholder:text-stone-400"
                />
               </div>
               <div className="w-full sm:w-auto h-full flex items-center gap-2">
                <input
                 type="date"
                 value={newTaskDueDates[milestone.id] || ''}
                 onChange={(e) => setNewTaskDueDates(prev => ({ ...prev, [milestone.id]: e.target.value }))}
                 className="text-xs font-medium text-stone-500 bg-transparent border-b border-stone-200 outline-none p-1.5 shrink-0 hover:text-stone-900 cursor-pointer transition-colors"
                />
                <button
                 className="px-3 py-1.5 shrink-0 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition-colors border border-stone-200"
                 onClick={() => handleAddNewTaskToMilestone(milestone.id)}
                 disabled={!newTaskTitles[milestone.id]?.trim()}
                >
                 Add
                </button>
               </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-4 border-t border-stone-100">
               <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-stone-50 rounded-lg">
                 <CalendarIcon className="w-3.5 h-3.5 text-stone-400" />
                </div>
                <span className="text-xs font-medium text-stone-500 uppercase tracking-widest">
                 Due: {milestone.targetDate ? new Date(milestone.targetDate).toLocaleDateString() : 'No date set'}
                </span>
               </div>
               <div className="flex items-center gap-2.5">
                <div className={cn(
                 "w-2.5 h-2.5 rounded-full shadow-sm",
                 milestone.priority === 'High' ? "bg-red-500" : milestone.priority === 'Medium' ? "bg-amber-500" : "bg-blue-500"
                )}></div>
                <span className="text-xs font-medium text-stone-500 uppercase tracking-widest">{milestone.priority} Priority</span>
               </div>
               <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-stone-50 rounded-lg">
                 <Shield className="w-3.5 h-3.5 text-stone-400" />
                </div>
                <span className="text-xs font-medium text-stone-400 uppercase tracking-widest">{milestone.category}</span>
               </div>
               <div className="ml-auto flex items-center gap-4">
                <div className="w-32 h-2 bg-stone-100 rounded-full overflow-hidden shadow-inner">
                 <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${milestone.progress}%` }}
                  className="h-full bg-stone-900 shadow-lg"
                 ></motion.div>
                </div>
                <span className="text-xs font-medium text-stone-900">{milestone.progress}%</span>
               </div>
              </div>
             </div>
            </div>
           </Card>
          </motion.div>
         ))}
        </AnimatePresence>
       )}
      </div>

      {!loading && filteredMilestones.length === 0 && (
       <div className="py-20 text-center space-y-4">
        <div className="w-20 h-20 bg-stone-50 rounded-[2rem] flex items-center justify-center mx-auto text-stone-200 border border-stone-100">
         <AlertCircle className="w-10 h-10" />
        </div>
        <div className="space-y-1">
         <p className="text-lg font-medium text-stone-900">No milestones found</p>
         <p className="text-sm text-stone-500 font-medium">Try adjusting your filters or create a new milestone.</p>
        </div>
        <Button variant="outline" className="rounded-xl h-11 px-6 font-medium text-xs uppercase tracking-widest" onClick={() => setActiveFilter('All')}>
         Clear Filters
        </Button>
       </div>
      )}

      {milestones.length < total && (
       <div className="pt-8 text-center">
        <button 
         onClick={handleLoadMore}
         disabled={loadingMore}
         className="inline-flex items-center gap-2 text-stone-400 hover:text-stone-900 cursor-pointer transition-colors group disabled:opacity-50"
        >
         <span className="text-xs font-medium uppercase tracking-widest">
          {loadingMore ? 'Loading...' : 'Load More Milestones'}
         </span>
         {!loadingMore && <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
        </button>
       </div>
      )}
     </div>
    </div>
   </motion.div>

   {/* Add/Edit Milestone Modal */}
   <AnimatePresence>
    {isModalOpen && (
     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <motion.div 
       initial={{ opacity: 0, scale: 0.95 }}
       animate={{ opacity: 1, scale: 1 }}
       exit={{ opacity: 0, scale: 0.95 }}
       className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden"
      >
       <div className="p-10">
        <div className="flex items-center justify-between mb-10">
         <div className="space-y-1">
          <h3 className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900 tracking-tight">
           {editingMilestone ? 'Refine Milestone' : 'New Strategic Goal'}
          </h3>
          <p className="text-sm text-stone-500 font-medium">Define the parameters of your next achievement.</p>
         </div>
         <button 
          onClick={handleCloseModal}
          className="w-12 h-10 rounded-2xl bg-stone-50 flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors border border-stone-100"
         >
          <Plus className="w-7 h-7 rotate-45" />
         </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
         <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-widest text-stone-400 ml-1">Title</label>
          <input
           type="text"
           required
           value={formData.title}
           onChange={(e) => setFormData({ ...formData, title: e.target.value })}
           className="w-full px-5 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-stone-900/5 focus:border-stone-900 transition-all font-medium"
           placeholder="e.g. MVP Launch Phase 1"
          />
         </div>

         <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-widest text-stone-400 ml-1">Description</label>
          <textarea
           required
           value={formData.description}
           onChange={(e) => setFormData({ ...formData, description: e.target.value })}
           className="w-full px-5 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-stone-900/5 focus:border-stone-900 transition-all min-h-[120px] font-medium leading-relaxed"
           placeholder="Describe the specific objectives and success criteria..."
          />
         </div>

         <div className="grid grid-cols-2 gap-8">
          <div className="space-y-2">
           <label className="text-xs font-medium uppercase tracking-widest text-stone-400 ml-1">Target Date</label>
           <div className="relative">
            <CalendarIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
             type="date"
             required
             value={formData.targetDate}
             onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
             className="w-full pl-14 pr-5 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-stone-900/5 focus:border-stone-900 transition-all font-medium"
            />
           </div>
          </div>
          <div className="space-y-2">
           <label className="text-xs font-medium uppercase tracking-widest text-stone-400 ml-1">Category</label>
           <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-5 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-stone-900/5 focus:border-stone-900 transition-all appearance-none font-medium"
           >
            {['Product', 'Legal', 'Funding', 'Marketing', 'Team'].map(cat => (
             <option key={cat} value={cat}>{cat}</option>
            ))}
           </select>
          </div>
         </div>

          <div className="grid grid-cols-3 gap-6">
          <div className="space-y-2">
           <label className="text-xs font-medium uppercase tracking-widest text-stone-400 ml-1">Priority</label>
           <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as Milestone['priority'] })}
            className="w-full px-5 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-stone-900/5 focus:border-stone-900 transition-all appearance-none font-medium"
           >
            {['High', 'Medium', 'Low'].map(p => (
             <option key={p} value={p}>{p}</option>
            ))}
           </select>
          </div>
          <div className="space-y-2">
           <label className="text-xs font-medium uppercase tracking-widest text-stone-400 ml-1">Status</label>
           <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as Milestone['status'] })}
            className="w-full px-5 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-stone-900/5 focus:border-stone-900 transition-all appearance-none font-medium"
           >
            {['Planned', 'In Progress', 'Completed', 'Delayed', 'Overdue'].map(s => (
             <option key={s} value={s}>{s}</option>
            ))}
           </select>
          </div>
          <div className="space-y-2">
           <label className="text-xs font-medium uppercase tracking-widest text-stone-400 ml-1">Progress (%)</label>
           <input
            type="number"
            min="0"
            max="100"
            value={formData.progress}
            onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
            className="w-full px-5 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-stone-900/5 focus:border-stone-900 transition-all font-medium"
           />
          </div>
         </div>

         <div className="space-y-4">
          <div className="flex items-center justify-between">
           <label className="text-xs font-medium uppercase tracking-widest text-stone-400 ml-1">Tasks</label>
           <button 
            type="button"
            onClick={handleAddTask}
            className="text-xs font-medium uppercase tracking-widest text-stone-900 hover:underline"
           >
            + Add Task
           </button>
          </div>
          <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
           {formData.tasks?.map((task, index) => (
            <div key={task.id} className="flex flex-col sm:flex-row gap-2 sm:items-center bg-stone-50 p-2.5 rounded-xl border border-stone-100 group/task">
             <div className="flex items-center gap-3 flex-1 px-1">
              <button
               type="button"
               onClick={() => handleToggleTask(index)}
               className={cn(
                "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                task.completed ? "bg-stone-900 border-stone-900" : "bg-white border-stone-300"
               )}
              >
               {task.completed && <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </button>
              <input
               type="text"
               value={task.title}
               onChange={(e) => handleUpdateTask(index, e.target.value, task.dueDate)}
               className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-stone-900 p-0 shadow-none outline-none"
               placeholder="Task title..."
              />
             </div>
             <div className="flex items-center gap-2 px-1 sm:px-0">
               <input
                type="date"
                value={task.dueDate || ''}
                onChange={(e) => handleUpdateTask(index, task.title, e.target.value)}
                className="text-xs font-medium text-stone-500 bg-transparent border-b border-stone-200 outline-none p-1 shrink-0 hover:text-stone-900 cursor-pointer transition-colors"
                title="Task due date"
               />
              <button
               type="button"
               onClick={() => handleRemoveTask(index)}
               className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto"
              >
               <Trash2 className="w-4 h-4" />
              </button>
             </div>
            </div>
           ))}
           {(!formData.tasks || formData.tasks.length === 0) && (
            <div className="text-center py-4 border-2 border-dashed border-stone-100 rounded-2xl">
             <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">No tasks defined</p>
            </div>
           )}
          </div>
         </div>

         <div className="pt-6 flex gap-4">
          <Button 
           type="button" 
           variant="outline" 
           className="flex-1 h-11 rounded-2xl font-medium text-xs uppercase tracking-widest border-stone-200" 
           onClick={handleCloseModal}
          >
           Cancel
          </Button>
          <Button 
           type="submit" 
           className="flex-1 h-11 rounded-2xl font-medium text-xs uppercase tracking-widest bg-stone-900 text-white hover:bg-stone-800 border-none shadow-xl shadow-stone-900/20"
          >
           {editingMilestone ? 'Update Milestone' : 'Deploy Milestone'}
          </Button>
         </div>
        </form>
       </div>
      </motion.div>
     </div>
    )}
   </AnimatePresence>

   {/* Delete Confirmation Modal */}
   <AnimatePresence>
    {deletingMilestone && (
     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <motion.div 
       initial={{ opacity: 0, scale: 0.95 }}
       animate={{ opacity: 1, scale: 1 }}
       exit={{ opacity: 0, scale: 0.95 }}
       className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden p-8 text-center space-y-6"
      >
       <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center border border-red-100 mx-auto">
        <Trash2 className="w-8 h-8" />
       </div>
       <div className="space-y-2">
        <h3 className="text-2xl font-medium text-stone-900 tracking-tight">Delete Milestone</h3>
        <p className="text-sm font-medium text-stone-500">
         Are you sure you want to delete <span className="text-stone-900">"{deletingMilestone.title}"</span>? This action cannot be undone.
        </p>
       </div>
       <div className="flex gap-4 pt-4">
        <Button 
         variant="outline" 
         className="flex-1 rounded-2xl h-11 font-medium text-xs uppercase tracking-widest border-stone-200"
         onClick={() => setDeletingMilestone(null)}
        >
         Cancel
        </Button>
        <Button 
         className="flex-1 rounded-2xl h-11 font-medium text-xs uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 border-none shadow-xl shadow-red-500/20"
         onClick={handleDeleteMilestone}
        >
         Delete
        </Button>
       </div>
      </motion.div>
     </div>
    )}
   </AnimatePresence>
   {/* Delete Task Confirmation Modal */}
   <AnimatePresence>
    {deletingTask && (
     <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <motion.div 
       initial={{ opacity: 0, scale: 0.95 }}
       animate={{ opacity: 1, scale: 1 }}
       exit={{ opacity: 0, scale: 0.95 }}
       className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center space-y-6"
      >
       <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center border border-red-100 mx-auto">
        <Trash2 className="w-8 h-8" />
       </div>
       <div className="space-y-2">
        <h3 className="text-xl font-medium text-stone-900 tracking-tight">Delete Task</h3>
        <p className="text-sm font-medium text-stone-500">
         Are you sure you want to delete <span className="text-stone-900">"{deletingTask.title}"</span>? This action cannot be undone.
        </p>
       </div>
       <div className="flex gap-4 pt-4">
        <Button 
         variant="outline" 
         className="flex-1 rounded-2xl h-11 font-medium text-xs uppercase tracking-widest border-stone-200"
         onClick={() => setDeletingTask(null)}
        >
         Cancel
        </Button>
        <Button 
         className="flex-1 rounded-2xl h-11 font-medium text-xs uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 border-none shadow-xl shadow-red-500/20"
         onClick={() => {
          if (deletingTask.isModalTask) {
           confirmDeleteModalTask();
          } else {
           handleDeleteTaskFromMilestone();
          }
         }}
        >
         Delete
        </Button>
       </div>
      </motion.div>
     </div>
    )}
   </AnimatePresence>

  </PageContainer>
 );
}
