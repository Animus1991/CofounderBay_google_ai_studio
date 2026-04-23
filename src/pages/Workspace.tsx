import { useState, useMemo } from "react";
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
 Save
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageContainer from "../components/layout/PageContainer";
import { User } from "../types";
import { cn } from "../lib/utils";
import { FixedSizeList as List } from 'react-window';

interface WorkspaceProps {
 user: User;
}

type TabType = "Dashboard" | "Builder" | "Canvas" | "Milestones" | "Calendar";

export default function Workspace({ user }: WorkspaceProps) {
 const [activeTab, setActiveTab] = useState<TabType>("Dashboard");
 const [searchQuery, setSearchQuery] = useState("");

 const tabs: TabType[] = ["Dashboard", "Builder", "Canvas", "Milestones", "Calendar"];

 return (
  <PageContainer className="space-y-10 pb-20">
   {/* Workspace Header */}
   <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
    <div className="space-y-2">
     <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="inline-flex items-center gap-2 text-micro"
     >
      <Layout className="w-3 h-3" />
      Project Workspace
     </motion.div>
     <h2 className="text-xl sm:text-2xl xl:text-3xl font-medium tracking-tight">
      Venture <span className="text-stone-400 font-light">Builder</span>
     </h2>
    </div>

    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
     {tabs.map((tab) => (
      <button
       key={tab}
       onClick={() => setActiveTab(tab)}
       className={cn(
        "px-6 py-2.5 rounded-full text-xs font-medium uppercase tracking-widest transition-all whitespace-nowrap",
        activeTab === tab 
         ? "bg-stone-900 text-white shadow-lg shadow-stone-900/10" 
         : "text-stone-400 hover:text-stone-900 hover:bg-stone-50"
       )}
      >
       {tab}
      </button>
     ))}
    </div>
   </header>

   <AnimatePresence mode="wait">
    {activeTab === "Dashboard" && (
     <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-8"
     >
      {/* Left Column - Tasks & Progress */}
      <div className="lg:col-span-8 space-y-10">
       <section className="card-minimal p-8">
        <div className="flex items-center justify-between mb-8">
         <h3 className="text-base font-medium">Active Sprint</h3>
         <div className="flex items-center gap-3">
          <div className="relative w-48 group">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
           <input 
            type="text" 
            placeholder="Search tasks..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-50 border border-stone-100 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-stone-900/5 transition-all"
           />
          </div>
          <Button 
           size="sm" 
           className="rounded-xl h-9 bg-stone-900 text-white text-xs font-medium px-4"
           onClick={() => console.log("New Task creation initiated")}
          >
           <Plus className="w-4 h-4 mr-2" /> New Task
          </Button>
         </div>
        </div>

        <div className="space-y-3">
         {[
          { id: "1", title: "Refine User Personas", priority: "High", status: "Todo", deadline: "2d left" },
          { id: "2", title: "Landing Page Copywriting", priority: "Medium", status: "In Progress", deadline: "Today" },
          { id: "3", title: "Competitor Analysis", priority: "Low", status: "Review", deadline: "Tomorrow" },
          { id: "4", title: "Setup Analytics Pipeline", priority: "High", status: "Todo", deadline: "5d left" },
         ].map((task) => (
          <div key={task.id} className="group flex items-center justify-between p-4 rounded-2xl border border-stone-50 hover:border-stone-200 hover:bg-stone-50/30 transition-all cursor-pointer">
           <div className="flex items-center gap-4">
            <div className={cn(
             "w-2 h-2 rounded-full",
             task.priority === "High" ? "bg-red-400" : task.priority === "Medium" ? "bg-amber-400" : "bg-blue-400"
            )} />
            <div>
             <h4 className="text-sm font-medium text-stone-900">{task.title}</h4>
             <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-medium text-stone-400 uppercase tracking-widest">{task.status}</span>
              <span className="w-1 h-1 bg-stone-200 rounded-full" />
              <span className="text-xs font-medium text-stone-400 uppercase tracking-widest flex items-center gap-1">
               <Clock className="w-3 h-3" /> {task.deadline}
              </span>
             </div>
            </div>
           </div>
           <Button variant="ghost" size="icon" className="text-stone-300 group-hover:text-stone-900">
            <ChevronRight className="w-4 h-4" />
           </Button>
          </div>
         ))}
        </div>
       </section>

       <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card-minimal p-6 space-y-4">
         <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center">
           <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-medium uppercase tracking-widest">Velocity</h3>
         </div>
         <div className="space-y-4">
          <div className="flex items-end justify-between">
           <span className="text-lg font-medium">12</span>
           <span className="text-xs font-medium text-green-600">+20% vs last week</span>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">Tasks completed in the current sprint cycle.</p>
         </div>
        </div>

        <div className="card-minimal p-6 space-y-4">
         <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-50 text-stone-900 flex items-center justify-center border border-stone-100">
           <Target className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-medium uppercase tracking-widest">Focus Score</h3>
         </div>
         <div className="space-y-4">
          <div className="flex items-end justify-between">
           <span className="text-lg font-medium">8.4</span>
           <span className="text-xs font-medium text-stone-400">Target: 9.0</span>
          </div>
          <div className="h-1.5 bg-stone-50 rounded-full overflow-hidden">
           <div className="h-full bg-stone-900 w-[84%]" />
          </div>
         </div>
        </div>
       </section>
      </div>

      {/* Right Column - Quick Actions & AI */}
      <div className="lg:col-span-4 space-y-8">
       <section className="card-minimal p-6 space-y-6">
        <h3 className="text-sm font-medium uppercase tracking-widest text-stone-400">AI Assistant</h3>
        <div className="p-4 rounded-2xl bg-stone-900 text-white space-y-4 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl" />
         <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-stone-400" />
          <span className="text-xs font-medium">Next Best Action</span>
         </div>
         <p className="text-xs text-stone-300 leading-relaxed">
          "Based on your current progress, I recommend focusing on the **Pitch Deck** to prepare for the upcoming investor meeting."
         </p>
         <Button 
          className="w-full bg-white text-stone-900 h-9 rounded-xl text-xs font-medium uppercase tracking-widest hover:bg-stone-100"
          onClick={() => {
           window.dispatchEvent(new CustomEvent('OPEN_AI_CHAT', { 
            detail: { agentId: 'a3', prompt: 'I want to refine my startup idea' } 
           }));
          }}
         >
          Open AI Chat
         </Button>
        </div>
       </section>

       <section className="card-minimal p-6 space-y-6">
        <h3 className="text-sm font-medium uppercase tracking-widest text-stone-400">Project Assets</h3>
        <div className="space-y-3">
         {[
          { name: "Pitch Deck v2.pdf", size: "2.4 MB", icon: FileText },
          { name: "Brand Guidelines.zip", size: "15.8 MB", icon: Layers },
          { name: "Market Research.docx", size: "840 KB", icon: FileText },
         ].map((asset) => (
          <div key={asset.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer group">
           <div className="flex items-center gap-3">
            <asset.icon className="w-4 h-4 text-stone-400 group-hover:text-stone-900 transition-colors" />
            <div>
             <p className="text-xs font-medium text-stone-900">{asset.name}</p>
             <p className="text-xs text-stone-400 font-medium uppercase tracking-widest">{asset.size}</p>
            </div>
           </div>
           <MoreVertical className="w-4 h-4 text-stone-300" />
          </div>
         ))}
        </div>
        <Button 
         variant="outline" 
         className="w-full h-9 rounded-xl text-xs font-medium uppercase tracking-widest border-stone-100"
         onClick={() => console.log("Viewing all project assets")}
        >
         View All Assets
        </Button>
       </section>
      </div>
     </motion.div>
    )}

    {activeTab === "Canvas" && (
     <motion.div
      key="canvas"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="space-y-8"
     >
      <div className="flex items-center justify-between">
       <div className="space-y-1">
        <h3 className="text-base font-medium">Lean Canvas</h3>
        <p className="text-sm text-stone-400">Map out your business model in a single page.</p>
       </div>
       <div className="flex items-center gap-3">
        <Button 
         variant="outline" 
         size="sm" 
         className="text-micro border-stone-200"
         onClick={() => console.log("Saving Lean Canvas draft")}
        >
         <Save className="w-3.5 h-3.5 mr-2" /> Save Draft
        </Button>
        <Button 
         size="sm" 
         className="bg-stone-900 text-white text-micro px-6"
         onClick={() => {
          window.dispatchEvent(new CustomEvent('OPEN_AI_CHAT', { 
           detail: { agentId: 'a3', prompt: 'Can you help me refine my Lean Canvas?' } 
          }));
         }}
        >
         <Sparkles className="w-3.5 h-3.5 mr-2" /> AI Refine
        </Button>
       </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
       {[
        { title: "Problem", content: "Existing solutions are too complex and expensive for early-stage startups." },
        { title: "Solution", content: "A minimalist, AI-powered workspace designed specifically for founders." },
        { title: "Key Metrics", content: "Daily Active Users, Task Completion Rate, Retention." },
        { title: "Unique Value Prop", content: "The only workspace that actively guides you through the startup lifecycle." },
        { title: "Unfair Advantage", content: "Proprietary AI matching engine and exclusive mentor network." },
       ].map((section) => (
        <div key={section.title} className="card-minimal p-6 space-y-4 min-h-[240px] flex flex-col">
         <h4 className="text-xs font-medium uppercase tracking-wider text-stone-400">{section.title}</h4>
         <textarea 
          defaultValue={section.content}
          className="flex-1 bg-transparent text-xs text-stone-600 leading-relaxed resize-none focus:outline-none"
         />
        </div>
       ))}
      </div>
     </motion.div>
    )}
   </AnimatePresence>
  </PageContainer>
 );
}
