import { useState } from "react";
import PageShell from "../components/ui/PageShell";
import { 
 BookOpen, 
 Briefcase, 
 Star, 
 Search, 
 Filter, 
 SlidersHorizontal, 
 ArrowRight, 
 CheckCircle2, 
 Clock, 
 TrendingUp, 
 Users, 
 Target, 
 BarChart3, 
 Plus, 
 ChevronRight, 
 AlertCircle, 
 FileText, 
 Globe, 
 PieChart, 
 Zap, 
 GraduationCap, 
 Wrench, 
 HelpCircle, 
 MessageSquare,
 Award,
 PlayCircle
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import FactLine from "../components/ui/FactLine";
import EmptyHint, { AskLink } from "../components/ui/EmptyHint";
import { User } from "../types";
import { cn } from "../lib/utils";
import { motion } from "motion/react";

interface ResourcesProps {
 user: User;
}

export default function Resources({ user }: ResourcesProps) {
 const [activeTab, setActiveTab] = useState<'learning' | 'services' | 'jobs' | 'support'>('learning');
 const [courseQuery, setCourseQuery] = useState('');
 const [courseLevel, setCourseLevel] = useState<'All' | 'Beginner' | 'Intermediate' | 'Advanced'>('All');
 const ask = (prompt: string) => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt } }));

 const mockCourses = [
  { id: "c1", title: "Foundations of Fundraising", instructor: "Naval Ravikant", duration: "4h 20m", level: "Beginner", rating: 4.9, image: "https://picsum.photos/seed/course1/800/450" },
  { id: "c2", title: "Building a Scalable Sales Engine", instructor: "Aaron Ross", duration: "6h 15m", level: "Intermediate", rating: 4.8, image: "https://picsum.photos/seed/course2/800/450" },
  { id: "c3", title: "Legal Essentials for Startups", instructor: "Sarah Chen", duration: "2h 45m", level: "Beginner", rating: 4.7, image: "https://picsum.photos/seed/course3/800/450" },
  { id: "c4", title: "Product-Market Fit Workshop", instructor: "Marc Andreessen", duration: "8h 00m", level: "Advanced", rating: 5.0, image: "https://picsum.photos/seed/course4/800/450" }
 ];

 const mockServices = [
  { id: "s1", name: "Legal Review", provider: "StartupLaw LLP", price: "$499", rating: 4.9, type: "Legal" },
  { id: "s2", name: "Pitch Deck Design", provider: "PixelPerfect", price: "$750", rating: 4.8, type: "Design" },
  { id: "s3", name: "Cloud Infrastructure Audit", provider: "DevOps Pros", price: "$1,200", rating: 4.7, type: "Tech" }
 ];

 const mockJobs = [
  { id: "j1", title: "Lead Full-Stack Engineer", company: "EcoFlow Systems", type: "Full-time", location: "Remote", salary: "$120k - $160k" },
  { id: "j2", title: "Growth Marketing Manager", company: "Finly", type: "Full-time", location: "NYC", salary: "$90k - $130k" },
  { id: "j3", title: "Product Design Intern", company: "Healthify", type: "Internship", location: "SF", salary: "$30/hr" }
 ];

 return (
  <PageShell title="Resources" description="Curated learning materials, professional services, and strategic growth tools.">
   <div className="space-y-6">
    <div className="scroll-tabs bg-stone-50 p-1 rounded-xl border border-stone-100">
     {(['learning', 'services', 'jobs', 'support'] as const).map((tab) => (
      <button
       key={tab}
       onClick={() => setActiveTab(tab)}
       className={cn(
        "px-4 py-2 text-sm font-medium rounded-lg transition-all capitalize",
        activeTab === tab 
         ? "bg-stone-900 text-white shadow-sm" 
         : "text-stone-400 hover:text-stone-900 hover:bg-white"
       )}
      >
       {tab}
      </button>
     ))}
    </div>

   {activeTab === 'learning' && (
    <div className="space-y-10">
     <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="space-y-1">
       <h3 className="text-xl font-medium tracking-tight text-stone-900">Learning Hub</h3>
       <p className="text-base text-stone-400 font-light">Master the art of building and scaling with world-class instructors.</p>
      </div>
      <div className="flex items-center gap-3">
       <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
        <input 
         type="text"
         value={courseQuery}
         onChange={(e) => setCourseQuery(e.target.value)}
         placeholder="Search courses..." 
         className="bg-stone-50 border border-stone-200/60 rounded-2xl py-3 pl-12 pr-6 text-base focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:bg-white transition-all w-full md:w-[300px] font-light"
        />
       </div>
       <Button type="button" variant="outline" className="h-10 px-6 rounded-2xl border-stone-200/60 hover:bg-stone-50 text-sm font-medium tracking-wide" onClick={() => {
        const levels = ['All', 'Beginner', 'Intermediate', 'Advanced'] as const;
        const index = levels.indexOf(courseLevel);
        setCourseLevel(levels[(index + 1) % levels.length] ?? 'All');
       }}>
        <SlidersHorizontal className="w-4 h-4 mr-2" /> {courseLevel === 'All' ? 'Filters' : courseLevel}
       </Button>
      </div>
     </div>

     {(() => {
      const visibleCourses = mockCourses.filter((course) => {
        const q = courseQuery.trim().toLowerCase();
        const matchesQuery = !q || course.title.toLowerCase().includes(q) || course.instructor.toLowerCase().includes(q);
        const matchesLevel = courseLevel === 'All' || course.level === courseLevel;
        return matchesQuery && matchesLevel;
      });
      if (visibleCourses.length === 0) {
        return (
         <EmptyHint title="No courses match this filter." detail="Clear the search, or ask the assistant which program to start.">
          <button type="button" className="text-xs font-medium text-stone-900 hover:underline" onClick={() => { setCourseQuery(''); setCourseLevel('All'); }}>Clear filters</button>
          <AskLink prompt="What programs can I apply to?" />
         </EmptyHint>
        );
      }
      return (
     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 sm:gap-8">
      {visibleCourses.map((course, idx) => (
       <motion.div
        key={course.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.1 }}
       >
        <Card className="group hover:shadow-sm transition-all duration-200 border-stone-200/60 hover:border-stone-900 flex flex-col h-full p-4 rounded-xl bg-white overflow-hidden">
         <div className="aspect-video bg-stone-100 rounded-xl mb-6 overflow-hidden relative">
          <img 
           src={course.image} 
           alt={course.title} 
           className="w-full h-full object-cover"
           referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
           <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-stone-900 border border-stone-200">
            <PlayCircle className="w-6 h-6" />
           </div>
          </div>
          <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-sm font-medium tracking-wide shadow-sm border border-white/20">
           {course.level}
          </div>
         </div>
         <div className="space-y-4 flex-1 px-2">
          <div className="space-y-1">
           <h4 className="font-medium text-base leading-tight text-stone-900 group-hover:text-stone-900 transition-colors">{course.title}</h4>
           <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-stone-400 tracking-wide">Instructor</span>
            <span className="text-sm text-stone-600 font-medium">{course.instructor}</span>
           </div>
          </div>
          <div className="flex items-center gap-4 pt-2 border-t border-stone-50">
           <div className="flex items-center gap-1.5 text-sm font-mono font-medium text-stone-400 tracking-wide">
            <Clock className="w-3.5 h-3.5" /> {course.duration}
           </div>
           <div className="flex items-center gap-1.5 text-sm font-mono font-medium text-amber-500 tracking-wide">
            <Star className="w-3.5 h-3.5 fill-amber-500" /> {course.rating}
           </div>
          </div>
         </div>
         <Button type="button" variant="outline" className="w-full mt-8 h-10 rounded-2xl text-sm font-medium tracking-wider border-stone-200 hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-all" onClick={() => ask(`Tell me about ${course.title}`)}>
          Start Learning
         </Button>
        </Card>
       </motion.div>
      ))}
     </div>
      );
     })()}
    </div>
   )}

   {activeTab === 'services' && (
    <div className="space-y-10">
     <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="space-y-1">
       <h3 className="text-xl font-medium tracking-tight text-stone-900">Partner Services</h3>
       <p className="text-base text-stone-400 font-light">Exclusive deals and vetted services for our ecosystem members.</p>
      </div>
      <Button type="button" variant="outline" className="h-10 px-6 rounded-2xl border-stone-200/60 hover:bg-stone-50 text-sm font-medium tracking-wide" onClick={() => ask('How do I list a partner service?')}>
       <Plus className="w-4 h-4 mr-2" /> List Your Service
      </Button>
     </div>

     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {mockServices.map((service, idx) => (
       <motion.div
        key={service.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: idx * 0.1 }}
       >
        <Card className="group hover:shadow-sm transition-all duration-200 border-stone-200/60 hover:border-stone-900 p-10 rounded-xl bg-white relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <Wrench className="w-32 h-32 -mr-12 -mt-12" />
         </div>
         <div className="flex items-start justify-between mb-8 relative z-10">
          <div className="w-16 h-16 bg-stone-50 rounded-xl flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all border border-stone-100 shadow-sm">
           <Wrench className="w-8 h-8" />
          </div>
          <div className="text-right">
           <p className="text-xl font-medium text-stone-900 tracking-tight">{service.price}</p>
           <p className="text-sm text-stone-400 font-medium tracking-wider">Starting at</p>
          </div>
         </div>
         <div className="space-y-4 relative z-10">
          <div className="space-y-1">
           <h4 className="font-medium text-xl tracking-tight text-stone-900">{service.name}</h4>
           <p className="text-base text-stone-500 font-light">by {service.provider}</p>
          </div>
          <div className="flex items-center gap-4 pt-4 border-t border-stone-50">
           <FactLine className="text-sm" items={[service.type]} label="Service type" />
           <div className="flex items-center gap-1.5 text-sm font-mono font-medium text-amber-500 tracking-wide">
            <Star className="w-4 h-4 fill-amber-500" /> {service.rating}
           </div>
          </div>
         </div>
         <Button type="button" variant="primary" className="w-full mt-10 h-11 rounded-2xl text-sm font-medium tracking-wider shadow-sm" onClick={() => ask(`Tell me about ${service.name}`)}>
          View Details
         </Button>
        </Card>
       </motion.div>
      ))}
     </div>
    </div>
   )}

   {activeTab === 'jobs' && (
    <div className="space-y-10">
     <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="space-y-1">
       <h3 className="text-xl font-medium tracking-tight text-stone-900">Jobs & Roles</h3>
       <p className="text-base text-stone-400 font-light">Find your next co-founder or early-stage hire.</p>
      </div>
      <Button type="button" variant="primary" className="h-10 px-8 rounded-2xl text-sm font-medium tracking-wide shadow-lg shadow-stone-900/10" onClick={() => ask('How do I post a job?')}>
       <Plus className="w-4 h-4 mr-2" /> Post a Job
      </Button>
     </div>

     <div className="space-y-6">
      {mockJobs.map((job, idx) => (
       <motion.div
        key={job.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.1 }}
       >
        <Card className="group hover:shadow-sm transition-all duration-200 border-stone-200/60 hover:border-stone-900 p-6 sm:p-8 rounded-xl sm:rounded-xl bg-white">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-8">
           <div className="w-16 h-16 bg-stone-50 rounded-xl flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all border border-stone-100 shadow-sm">
            <Briefcase className="w-8 h-8" />
           </div>
           <div className="space-y-1">
            <h4 className="font-medium text-xl tracking-tight text-stone-900">{job.title}</h4>
            <div className="flex items-center gap-3">
             <span className="text-base text-stone-600 font-medium">{job.company}</span>
             <div className="w-1 h-1 rounded-full bg-stone-200"></div>
             <span className="text-base text-stone-400 font-light">{job.location}</span>
            </div>
           </div>
          </div>
          <div className="flex items-center gap-10">
           <div className="text-right hidden md:block space-y-1">
            <p className="text-base font-medium text-stone-900 tracking-tight">{job.salary}</p>
            <p className="text-sm text-stone-400 font-medium tracking-wider">{job.type}</p>
           </div>
           <Button type="button" variant="outline" className="h-11 px-10 rounded-2xl text-sm font-medium tracking-wider border-stone-200 hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-all" onClick={() => ask(`How do I apply for ${job.title} at ${job.company}?`)}>
            Apply Now
           </Button>
          </div>
         </div>
        </Card>
       </motion.div>
      ))}
     </div>
    </div>
   )}

   {activeTab === 'support' && (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
     <div className="lg:col-span-7 space-y-10">
      <div className="space-y-1">
       <h3 className="text-xl font-medium tracking-tight text-stone-900">Help & <span className="text-stone-300 italic serif">Support</span></h3>
       <p className="text-stone-500 text-base font-light">Get answers to your questions and resolve issues quickly.</p>
      </div>
      <div className="space-y-4">
       {[
        "How do I find a co-founder?",
        "What is the Readiness Score?",
        "How to apply for programs?",
        "Managing your subscription"
       ].map((q, i) => (
        <motion.div 
         key={i}
         whileHover={{ x: 10 }}
         role="button"
         tabIndex={0}
         onClick={() => ask(q)}
         onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ask(q); } }}
         className="flex items-center justify-between p-6 sm:p-8 bg-white rounded-xl border border-stone-200/60 hover:border-stone-900 transition-all cursor-pointer group shadow-sm hover:shadow-xl"
        >
         <p className="text-base font-medium text-stone-900">{q}</p>
         <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-300 group-hover:bg-stone-900 group-hover:text-white transition-all">
          <ChevronRight className="w-5 h-5" />
         </div>
        </motion.div>
       ))}
      </div>
      <Button type="button" variant="outline" className="w-full h-16 rounded-xl text-sm font-medium tracking-wider border-stone-200 hover:bg-stone-50" onClick={() => ask('what can you do')}>
       Visit Full Help Center
      </Button>
     </div>

     <div className="lg:col-span-5 space-y-10">
      <Card className="p-10 rounded-xl border-stone-200/60 shadow-xl bg-white relative overflow-hidden group">
       <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <GraduationCap className="w-40 h-40 -mr-16 -mt-16" />
       </div>
       <div className="space-y-8 relative z-10">
        <div className="space-y-1">
         <h3 className="text-xl font-medium tracking-tight text-stone-900">Expert Coaching</h3>
         <p className="text-base text-stone-400 font-light">Book a session with a startup veteran</p>
        </div>
        <div className="space-y-6">
         <div className="p-6 sm:p-8 bg-stone-900 rounded-xl sm:rounded-xl text-white space-y-6 shadow-sm relative overflow-hidden">

          <div className="flex items-center gap-6">
           <div className="w-16 h-16 rounded-xl bg-stone-800 border border-stone-700 overflow-hidden shadow-xl">
            <img src="https://picsum.photos/seed/coach/150/150" alt="Coach" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
           </div>
           <div className="space-y-1">
            <p className="text-base font-medium">Sarah Chen</p>
            <p className="text-sm text-stone-400 font-medium tracking-wide">Fundraising Expert</p>
           </div>
          </div>
          <p className="text-base text-stone-300 italic serif leading-relaxed">
           "I help founders refine their pitch deck and strategy to close their Seed and Series A rounds faster."
          </p>
          <div className="flex items-center justify-between pt-4 border-t border-stone-800">
           <div className="space-y-0.5">
            <p className="text-xl font-medium text-white">$150</p>
            <p className="text-sm text-stone-500 font-medium tracking-wide">per session</p>
           </div>
           <Button type="button" className="h-10 px-8 rounded-xl bg-white text-stone-900 hover:bg-stone-100 transition-all font-medium text-sm tracking-wider" onClick={() => ask('book Sarah Chen')}>
            Book Now
           </Button>
          </div>
         </div>
         <Button type="button" variant="ghost" className="w-full h-11 rounded-2xl text-sm font-medium tracking-wider text-stone-400 hover:text-stone-900 hover:bg-stone-50 border border-transparent hover:border-stone-100 transition-all" onClick={() => ask('Find a fundraising mentor')}>
          View All Coaches
         </Button>
        </div>
       </div>
      </Card>

      <Card className="bg-stone-50 border-stone-200/60 p-10 rounded-xl shadow-sm relative overflow-hidden group">
       <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <HelpCircle className="w-32 h-32 -mr-12 -mt-12" />
       </div>
       <div className="space-y-6 relative z-10">
        <div className="flex items-center gap-3 text-stone-900">
         <HelpCircle className="w-5 h-5" />
         <h4 className="font-medium text-base tracking-wider">Live Support</h4>
        </div>
        <p className="text-base text-stone-500 leading-relaxed font-light">
         Need immediate assistance? Our support team is available 24/7 for premium members.
        </p>
        <Button type="button" variant="outline" className="w-full h-11 rounded-2xl border-stone-200 hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-all font-medium text-sm tracking-wider" onClick={() => ask('what can you do')}>
         Start Chat
        </Button>
       </div>
      </Card>
     </div>
    </div>
   )}
  </div>
  </PageShell>
 );
}
