import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
 Target, 
 CheckCircle2, 
 Circle, 
 Clock, 
 Plus, 
 Zap, 
 TrendingUp, 
 Calendar,
 ArrowRight,
 ChevronRight,
 Edit3,
 Trash2,
 AlertCircle,
 Flag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { Milestone, User } from '../types';
import { milestoneService } from '../services/milestoneService';
import PageContainer from '../components/layout/PageContainer';

interface MilestonesPageProps {
 user?: User;
}

export default function MilestonesPage({ user }: MilestonesPageProps) {
 const navigate = useNavigate();
 const [milestones, setMilestones] = useState<Milestone[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
  fetchMilestones();
 }, []);

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

 const stats = [
  { label: 'Completed', value: milestones.filter(m => m.status === 'Completed').length, color: 'emerald', icon: CheckCircle2 },
  { label: 'In Progress', value: milestones.filter(m => m.status === 'In Progress').length, color: 'blue', icon: TrendingUp },
  { label: 'Upcoming', value: milestones.filter(m => m.status === 'Planned').length, color: 'amber', icon: Clock },
 ];

 return (
  <PageContainer>
   <div className="max-w-5xl mx-auto space-y-12">
    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
     <div className="max-w-2xl space-y-4">
      <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-medium text-stone-900 tracking-tight">
       Your Startup <span className="text-stone-400">Roadmap.</span>
      </h1>
      <p className="text-sm sm:text-base lg:text-lg text-stone-500 font-medium">
       Track your progress, set goals, and celebrate your achievements as you build your startup.
      </p>
     </div>
     <button 
      onClick={() => navigate('/dashboard')}
      className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-2xl font-medium hover:bg-stone-800 transition-all shadow-lg shadow-stone-900/20 group"
     >
      <Plus className="w-5 h-5" />
      Add Milestone
     </button>
    </div>

    {/* Progress Overview */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
     {stats.map((stat) => (
      <div key={stat.label} className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-3xl border border-stone-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
       <div className="space-y-1">
        <div className="text-lg sm:text-xl md:text-2xl font-medium text-stone-900">{stat.value}</div>
        <div className="text-xs font-medium text-stone-400 uppercase tracking-widest">{stat.label}</div>
       </div>
       <div className={cn(
        "p-4 rounded-2xl transition-all group-hover:scale-110",
        stat.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
        stat.color === 'blue' ? "bg-blue-50 text-blue-600" :
        "bg-amber-50 text-amber-600"
       )}>
        <stat.icon className="w-6 h-6" />
       </div>
      </div>
     ))}
    </div>

    {/* Timeline */}
    <div className="space-y-12 relative before:absolute before:left-4 sm:before:left-1/2 before:top-0 before:bottom-0 before:w-px before:bg-stone-100 min-h-[400px]">
     {loading ? (
      <div className="flex justify-center py-20">
       <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin"></div>
      </div>
     ) : error ? (
      <div className="flex flex-col items-center justify-center py-20 text-stone-400 space-y-4">
       <AlertCircle className="w-12 h-12" />
       <p className="font-medium uppercase tracking-widest text-xs">{error}</p>
       <button onClick={fetchMilestones} className="text-stone-900 underline font-medium text-xs">Retry</button>
      </div>
     ) : milestones.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-20 text-stone-400 space-y-4">
       <Target className="w-12 h-12" />
       <p className="font-medium uppercase tracking-widest text-xs">No milestones yet</p>
      </div>
     ) : (
      milestones.map((milestone, idx) => (
       <motion.div 
        key={milestone.id}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: idx * 0.1 }}
        className={cn(
         "relative flex flex-col sm:flex-row gap-8 sm:gap-0",
         idx % 2 === 0 ? "sm:flex-row-reverse" : ""
        )}
       >
        {/* Timeline Dot */}
        <div className="absolute left-4 sm:left-1/2 -translate-x-1/2 top-0 z-10">
         <div className={cn(
          "w-8 h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center",
          milestone.status === 'Completed' ? "bg-emerald-500" :
          milestone.status === 'In Progress' ? "bg-blue-500" :
          milestone.status === 'Overdue' ? "bg-red-500" :
          "bg-stone-200"
         )}>
          {milestone.status === 'Completed' && <CheckCircle2 className="w-4 h-4 text-white" />}
          {milestone.status === 'In Progress' && <TrendingUp className="w-4 h-4 text-white" />}
          {(milestone.status === 'Planned' || milestone.status === 'Delayed' || milestone.status === 'Overdue') && <Flag className="w-4 h-4 text-white" />}
         </div>
        </div>

        {/* Content Card */}
        <div className="w-full sm:w-[45%] pl-12 sm:pl-0">
         <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[32px] border border-stone-100 shadow-sm hover:shadow-xl transition-all group">
          <div className="flex items-center justify-between mb-6">
           <span className="px-3 py-1 bg-stone-50 text-stone-900 rounded-lg text-xs font-medium uppercase tracking-widest border border-stone-100">
            {milestone.category}
           </span>
           <div className="flex items-center gap-2">
            <button className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-all">
             <Edit3 className="w-4 h-4" />
            </button>
            <button className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
             <Trash2 className="w-4 h-4" />
            </button>
           </div>
          </div>

          <div className="space-y-4">
           <h3 className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900 group-hover:text-stone-700 transition-colors">{milestone.title}</h3>
           <p className="text-stone-500 text-sm font-medium leading-relaxed">
            {milestone.description}
           </p>

           <div className="flex items-center gap-2 text-xs font-medium text-stone-400 uppercase tracking-widest pt-2">
            <Calendar className="w-4 h-4" />
            Target: {new Date(milestone.targetDate).toLocaleDateString()}
           </div>

           {milestone.tasks && milestone.tasks.length > 0 && (() => {
            const completedCount = milestone.tasks.filter(t => t.completed).length;
            const progress = (completedCount / milestone.tasks.length) * 100;
            return (
            <div className="pt-6 space-y-4">
             <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-widest">
               <h4 className="text-stone-900">Task Progress</h4>
               <span className="text-stone-500">{completedCount} of {milestone.tasks.length}</span>
              </div>
              <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
               <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className={cn("h-full transition-all duration-1000", progress === 100 ? "bg-emerald-500" : "bg-stone-900")}
               />
              </div>
             </div>
             
             <div className="space-y-2">
              {milestone.tasks.map((task) => (
               <div key={task.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl group/task cursor-pointer">
                <div className="flex items-center gap-3">
                 <div className={cn(
                  "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                  task.completed ? "bg-stone-900 border-stone-900" : "border-stone-200 group-hover/task:border-stone-400"
                 )}>
                  {task.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                 </div>
                 <span className={cn(
                  "text-sm font-medium transition-all",
                  task.completed ? "text-stone-400 line-through" : "text-stone-600 group-hover/task:text-stone-900"
                 )}>
                  {task.title}
                 </span>
                </div>
                {!task.completed && (
                 <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 opacity-0 group-hover/task:opacity-100 transition-opacity pr-2">Done</span>
                )}
               </div>
              ))}
             </div>
            </div>
           )})()}
          </div>
         </div>
        </div>
       </motion.div>
      ))
     )}
    </div>

    {/* Success CTA */}
    <div className="bg-stone-900 rounded-[2rem] sm:rounded-[40px] p-6 sm:p-12 text-center space-y-6 sm:space-y-8 relative overflow-hidden shadow-2xl shadow-stone-900/20">
     <div className="relative z-10 max-w-2xl mx-auto space-y-6">
      <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto backdrop-blur-md">
       <Zap className="w-10 h-10 text-amber-400" />
      </div>
      <h2 className="text-xl sm:text-2xl xl:text-3xl font-medium text-white tracking-tight leading-tight">
       Ready to reach your next big <span className="text-stone-400">Milestone?</span>
      </h2>
      <p className="text-lg text-stone-400 font-medium leading-relaxed">
       Break down your goals into actionable tasks and track your journey to success.
      </p>
      <button 
       onClick={() => navigate('/dashboard')}
       className="px-6 py-3 bg-white text-stone-900 rounded-2xl font-medium hover:bg-stone-100 transition-all shadow-xl shadow-white/10 flex items-center gap-2 mx-auto group"
      >
       Add New Milestone
       <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>
     </div>
     <div className="absolute -left-20 -top-20 w-64 h-64 bg-stone-800 rounded-full opacity-50 blur-3xl" />
     <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-stone-800 rounded-full opacity-50 blur-3xl" />
    </div>
   </div>
  </PageContainer>
 );
}
