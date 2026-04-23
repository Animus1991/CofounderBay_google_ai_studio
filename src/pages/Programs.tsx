import { useState } from "react";
import { 
 Rocket, Search, Filter, SlidersHorizontal, ArrowRight, 
 CheckCircle2, XCircle, Star, MessageSquare, Plus, 
 Users, Globe, Zap, Target, Shield, TrendingUp,
 Calendar, DollarSign, Award, Info, Clock
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { cn } from "../lib/utils";
import { User } from "../types";
import { motion } from "framer-motion";

interface ProgramsProps {
 user: User;
}

interface Program {
 id: string;
 title: string;
 description: string;
 type: 'Accelerator' | 'Incubator' | 'Grant' | 'Bootcamp';
 funding?: string;
 duration: string;
 deadline: string;
 focus: string[];
 image: string;
 organizer: string;
}

export default function Programs({ user }: ProgramsProps) {
 const [activeTab, setActiveTab] = useState('All');

 const mockPrograms: Program[] = [
  {
   id: "1",
   title: "FinTech Accelerator Q3 2026",
   description: "A 3-month intensive program for early-stage fintech startups. Includes $120k funding and mentorship from top industry experts.",
   type: 'Accelerator',
   funding: "$120,000",
   duration: "12 Weeks",
   deadline: "April 15, 2026",
   focus: ["FinTech", "Blockchain", "SaaS"],
   image: "https://picsum.photos/seed/prog1/800/400",
   organizer: "Finly Ventures"
  },
  {
   id: "2",
   title: "CleanTech Innovation Grant",
   description: "Non-dilutive funding for startups working on breakthrough clean energy solutions. Focus on scalability and impact.",
   type: 'Grant',
   funding: "$50,000",
   duration: "N/A",
   deadline: "May 01, 2026",
   focus: ["CleanTech", "Energy", "Sustainability"],
   image: "https://picsum.photos/seed/prog2/800/400",
   organizer: "Green Earth Foundation"
  },
  {
   id: "3",
   title: "SaaS Growth Bootcamp",
   description: "Intensive 4-week program focused on scaling your SaaS product, optimizing user acquisition, and improving retention.",
   type: 'Bootcamp',
   funding: "N/A",
   duration: "4 Weeks",
   deadline: "March 30, 2026",
   focus: ["SaaS", "Growth", "Marketing"],
   image: "https://picsum.photos/seed/prog3/800/400",
   organizer: "Founders Academy"
  }
 ];

 return (
  <div className="space-y-12 max-w-7xl mx-auto pb-20">
   {/* Header Section */}
   <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-stone-200 pb-12">
    <div className="space-y-4 max-w-2xl">
     <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 border border-stone-200">
      <Rocket className="w-3 h-3 text-stone-500" />
      <span className="text-xs font-medium uppercase tracking-widest text-stone-500">Growth Ecosystem</span>
     </div>
     <h1 className="text-xl md:text-2xl font-light tracking-tight text-stone-900 leading-snug">
      Startup <span className="font-serif italic">Programs</span>
     </h1>
     <p className="text-sm sm:text-base lg:text-lg text-stone-500 font-light leading-relaxed">
      Accelerate your growth with curated programs, grants, and strategic opportunities designed for every stage of your journey.
     </p>
    </div>
    <div className="flex items-center gap-3">
     <Button variant="outline" className="rounded-full px-6 border-stone-200 hover:bg-stone-50">
      <Filter className="w-4 h-4 mr-2" /> Filter
     </Button>
     <Button variant="primary" className="rounded-full px-8 bg-stone-900 hover:bg-stone-800 text-white shadow-lg shadow-stone-200">
      Find Programs
     </Button>
    </div>
   </header>

   <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
    {/* Main Programs List */}
    <div className="lg:col-span-8 space-y-10">
     {/* Tab Switcher */}
     <div className="flex items-center gap-1 bg-stone-100/50 p-1 rounded-2xl border border-stone-200/60 w-fit">
      {['All', 'Accelerators', 'Grants', 'Bootcamps'].map((tab) => (
       <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={cn(
         "px-6 py-2.5 text-xs font-medium uppercase tracking-widest rounded-xl transition-all duration-300",
         activeTab === tab 
          ? "bg-white text-stone-900 shadow-sm border border-stone-200" 
          : "text-stone-400 hover:text-stone-600 hover:bg-white/50"
        )}
       >
        {tab}
       </button>
      ))}
     </div>

     <div className="space-y-8">
      {mockPrograms.map((program, idx) => (
       <motion.div
        key={program.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.1 }}
       >
        <Card noPadding className="overflow-hidden group hover:shadow-2xl transition-all duration-500 border-stone-200 hover:border-stone-400 rounded-[2.5rem]">
         <div className="flex flex-col md:flex-row">
          <div className="md:w-72 h-64 md:h-auto overflow-hidden relative">
           <img 
            src={program.image} 
            alt={program.title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            referrerPolicy="no-referrer"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-stone-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
           <div className="absolute top-6 left-6 px-4 py-1.5 bg-white/95 backdrop-blur-md rounded-full text-xs font-medium uppercase tracking-widest shadow-sm border border-stone-100">
            {program.type}
           </div>
          </div>
          <div className="flex-1 p-8 md:p-10 space-y-6">
           <div className="flex items-start justify-between">
            <div className="space-y-2">
             <h3 className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900 group-hover:text-stone-900 transition-colors leading-tight">
              {program.title}
             </h3>
             <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-stone-400 uppercase tracking-widest">Organized by</span>
              <span className="text-xs text-stone-600 font-medium">{program.organizer}</span>
             </div>
            </div>
            <button className="p-2 text-stone-300 hover:text-amber-500 transition-colors">
             <Star className="w-5 h-5" />
            </button>
           </div>
           
           <p className="text-stone-500 font-light leading-relaxed line-clamp-2 text-sm">
            {program.description}
           </p>

           <div className="grid grid-cols-2 md:grid-cols-3 gap-6 py-6 border-y border-stone-100">
            <div className="space-y-1">
             <div className="flex items-center gap-2 text-xs font-medium text-stone-400 uppercase tracking-widest">
              <DollarSign className="w-3 h-3" />
              <span>Funding</span>
             </div>
             <p className="text-sm font-medium text-stone-900">{program.funding}</p>
            </div>
            <div className="space-y-1">
             <div className="flex items-center gap-2 text-xs font-medium text-stone-400 uppercase tracking-widest">
              <Clock className="w-3 h-3" />
              <span>Duration</span>
             </div>
             <p className="text-sm font-medium text-stone-900">{program.duration}</p>
            </div>
            <div className="space-y-1">
             <div className="flex items-center gap-2 text-xs font-medium text-stone-400 uppercase tracking-widest">
              <Calendar className="w-3 h-3" />
              <span>Deadline</span>
             </div>
             <p className="text-sm font-medium text-stone-900">{program.deadline}</p>
            </div>
           </div>

           <div className="pt-2 flex items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
             {program.focus.map((f) => (
              <span key={f} className="text-xs font-medium px-3 py-1 bg-stone-50 text-stone-500 rounded-full border border-stone-100 uppercase tracking-widest">
               {f}
              </span>
             ))}
            </div>
            <Button variant="primary" className="rounded-full px-8 bg-stone-900 hover:bg-stone-800 text-white whitespace-nowrap">
             Apply Now
            </Button>
           </div>
          </div>
         </div>
        </Card>
       </motion.div>
      ))}
     </div>
    </div>

    {/* Sidebar */}
    <aside className="lg:col-span-4 space-y-10">
     <Card className="rounded-[2rem] border-stone-200 p-8 space-y-6">
      <div className="space-y-2">
       <h4 className="text-xl font-medium text-stone-900">Program Finder</h4>
       <p className="text-sm text-stone-500 font-light leading-relaxed">
        Our AI analyzes your startup stage, industry, and needs to recommend the best programs for you.
       </p>
      </div>
      <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100 space-y-4">
       <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-stone-900 flex items-center justify-center text-white">
         <Zap className="w-4 h-4" />
        </div>
        <span className="text-xs font-medium text-stone-900">AI-Powered Matching</span>
       </div>
       <Button variant="outline" className="w-full rounded-xl border-stone-200 hover:bg-white transition-all">
        Start Finder
       </Button>
      </div>
     </Card>

     <Card className="rounded-[2rem] border-stone-200 p-8 space-y-8">
      <div className="flex items-center justify-between">
       <h4 className="text-xl font-medium text-stone-900">Ecosystem Stats</h4>
       <TrendingUp className="w-5 h-5 text-stone-400" />
      </div>
      <div className="grid grid-cols-2 gap-6">
       {[
        { label: "Active Programs", value: "24", icon: Rocket },
        { label: "Total Funding", value: "$2.4M", icon: DollarSign },
        { label: "Applications", value: "1.2k", icon: Users },
        { label: "Success Rate", value: "85%", icon: Target }
       ].map((stat, idx) => (
        <div key={idx} className="space-y-2">
         <div className="flex items-center gap-2 text-xs font-medium text-stone-400 uppercase tracking-widest">
          <stat.icon className="w-3 h-3" />
          <span>{stat.label}</span>
         </div>
         <p className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900">{stat.value}</p>
        </div>
       ))}
      </div>
     </Card>

     <Card className="rounded-[2rem] bg-stone-900 text-white border-none p-10 overflow-hidden relative group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/10 transition-all duration-700" />
      <div className="relative z-10 space-y-6">
       <div className="w-12 h-12 bg-stone-800 rounded-2xl flex items-center justify-center text-amber-500 border border-stone-700">
        <Award className="w-6 h-6" />
       </div>
       <div className="space-y-2">
        <h4 className="text-xl font-medium">Premium Opportunities</h4>
        <p className="text-sm text-stone-400 font-light leading-relaxed">
         Upgrade to Pro to get early access to exclusive grants and accelerator programs before they go public.
        </p>
       </div>
       <Button variant="primary" className="w-full rounded-xl bg-white text-stone-900 hover:bg-stone-100 shadow-xl shadow-black/20">
        Upgrade Now
       </Button>
      </div>
     </Card>
    </aside>
   </div>
  </div>
 );
}
