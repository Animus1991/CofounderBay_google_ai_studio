import { useState } from "react";
import PageShell from "../components/ui/PageShell";
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
  <PageShell title="Programs" description="Curated accelerators, grants, and strategic opportunities for every stage.">
   <div className="space-y-6">
    <div className="flex flex-wrap items-center gap-2">
     <Button variant="outline" className="h-8 rounded-xl px-3 text-sm border-stone-200 hover:bg-stone-50 flex items-center gap-1.5">
      <Filter className="w-3 h-3" /> Filter
     </Button>
     <Button variant="primary" className="h-8 rounded-xl px-4 text-sm bg-stone-900 hover:bg-stone-800 text-white">
      Find Programs
     </Button>
    </div>

   <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
    {/* Main Programs List */}
    <div className="lg:col-span-8 space-y-4">
     {/* Tab Switcher */}
     <div className="scroll-tabs bg-stone-50 p-1 rounded-xl border border-stone-100">
      {['All', 'Accelerators', 'Grants', 'Bootcamps'].map((tab) => (
       <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={cn(
         "px-3 py-1.5 text-sm font-semibold tracking-wide rounded-lg transition-all",
         activeTab === tab ? "bg-stone-900 text-white shadow" : "text-stone-400 hover:text-stone-700"
        )}
       >
        {tab}
       </button>
      ))}
     </div>

     <div className="space-y-3">
      {mockPrograms.map((program, idx) => (
       <motion.div
        key={program.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.1 }}
       >
        <Card noPadding className="overflow-hidden group hover:border-stone-300 hover:shadow-md transition-all border-stone-100 rounded-2xl">
         <div className="flex flex-col md:flex-row">
          <div className="md:w-48 h-40 md:h-auto overflow-hidden relative shrink-0">
           <img
            src={program.image}
            alt={program.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            referrerPolicy="no-referrer"
           />
           <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-white/95 backdrop-blur-sm rounded-md text-xs font-semibold tracking-wider border border-stone-100 shadow-sm">
            {program.type}
           </div>
          </div>
          <div className="flex-1 p-4 space-y-3">
           <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
             <h3 className="text-sm font-semibold text-stone-900 leading-snug">{program.title}</h3>
             <p className="text-xs text-stone-400">by {program.organizer}</p>
            </div>
            <button className="p-1 text-stone-300 hover:text-amber-500 transition-colors shrink-0">
             <Star className="w-3.5 h-3.5" />
            </button>
           </div>
           <p className="text-sm text-stone-500 leading-relaxed line-clamp-2">{program.description}</p>
           <div className="grid grid-cols-3 gap-3 py-3 border-y border-stone-100">
            {[
             { icon: DollarSign, label: 'Funding',  value: program.funding ?? 'N/A' },
             { icon: Clock,      label: 'Duration', value: program.duration },
             { icon: Calendar,   label: 'Deadline', value: program.deadline },
            ].map(({ icon: Icon, label, value }) => (
             <div key={label} className="space-y-0.5">
              <div className="flex items-center gap-1 text-xs text-stone-400 tracking-wider">
               <Icon className="w-2.5 h-2.5" />{label}
              </div>
              <p className="text-sm font-semibold text-stone-900">{value}</p>
             </div>
            ))}
           </div>
           <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1">
             {program.focus.map((f) => (
              <span key={f} className="text-xs font-medium px-2 py-0.5 bg-stone-50 text-stone-500 rounded-md border border-stone-100">{f}</span>
             ))}
            </div>
            <Button variant="primary" className="h-7 rounded-lg px-4 text-sm bg-stone-900 hover:bg-stone-800 text-white whitespace-nowrap shrink-0">
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
    <aside className="lg:col-span-4 space-y-4">
     <Card className="rounded-2xl border-stone-100 p-4 space-y-3">
      <div>
       <h4 className="text-sm font-semibold text-stone-900">Program Finder</h4>
       <p className="text-xs text-stone-400 mt-0.5">AI-matched to your stage, industry, and goals.</p>
      </div>
      <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex items-center gap-2.5">
       <div className="w-7 h-7 rounded-lg bg-stone-900 flex items-center justify-center text-white shrink-0">
        <Zap className="w-3.5 h-3.5" />
       </div>
       <span className="text-sm font-semibold text-stone-700">AI-Powered Matching</span>
      </div>
      <Button variant="outline" className="w-full h-8 rounded-xl text-sm border-stone-200 hover:bg-white transition-all">
       Start Finder
      </Button>
     </Card>

     <Card className="rounded-2xl border-stone-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
       <h4 className="text-sm font-semibold text-stone-900">Ecosystem Stats</h4>
       <TrendingUp className="w-3.5 h-3.5 text-stone-400" />
      </div>
      <div className="grid grid-cols-2 gap-2">
       {[
        { label: "Active Programs", value: "24",   icon: Rocket },
        { label: "Total Funding",   value: "$2.4M", icon: DollarSign },
        { label: "Applications",    value: "1.2k",  icon: Users },
        { label: "Success Rate",    value: "85%",   icon: Target },
       ].map((stat, idx) => (
        <div key={idx} className="p-2.5 bg-stone-50 border border-stone-100 rounded-xl space-y-1">
         <div className="flex items-center gap-1 text-xs text-stone-400 tracking-wider">
          <stat.icon className="w-2.5 h-2.5" />{stat.label}
         </div>
         <p className="text-base font-bold text-stone-900">{stat.value}</p>
        </div>
       ))}
      </div>
     </Card>

     {/* Premium — light amber instead of dark */}
     <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-3">
      <div className="w-8 h-8 bg-white border border-amber-100 rounded-xl flex items-center justify-center">
       <Award className="w-4 h-4 text-amber-600" />
      </div>
      <div>
       <h4 className="text-sm font-semibold text-stone-900">Premium Opportunities</h4>
       <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
        Upgrade to Pro for early access to exclusive grants and accelerators before they go public.
       </p>
      </div>
      <Button className="w-full h-8 rounded-xl text-sm font-semibold bg-stone-900 text-white hover:bg-stone-800">
       Upgrade Now
      </Button>
     </div>
    </aside>
   </div>
  </div>
  </PageShell>
 );
}
