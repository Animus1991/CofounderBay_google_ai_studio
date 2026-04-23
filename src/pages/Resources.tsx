import { useState } from "react";
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
import { User } from "../types";
import { cn } from "../lib/utils";
import { motion } from "motion/react";

interface ResourcesProps {
 user: User;
}

export default function Resources({ user }: ResourcesProps) {
 const [activeTab, setActiveTab] = useState<'learning' | 'services' | 'jobs' | 'support'>('learning');

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
  <div className="space-y-12 max-w-7xl mx-auto pb-20">
   {/* Header Section */}
   <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-stone-200 pb-12">
    <div className="space-y-4 max-w-2xl">
     <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 border border-stone-200">
      <BookOpen className="w-3 h-3 text-stone-500" />
      <span className="text-xs font-medium uppercase tracking-widest text-stone-500">Knowledge Base</span>
     </div>
     <h1 className="text-2xl font-light tracking-tight text-stone-900 leading-snug">
      Resource <span className="font-serif italic">Center</span>
     </h1>
     <p className="text-sm sm:text-base lg:text-lg text-stone-500 font-light leading-relaxed">
      Access curated learning materials, professional services, and strategic growth tools to empower your startup journey.
     </p>
    </div>
    <div className="flex items-center gap-2 bg-stone-50 p-1.5 rounded-2xl border border-stone-200/60 shadow-sm overflow-x-auto no-scrollbar">
     {(['learning', 'services', 'jobs', 'support'] as const).map((tab) => (
      <button
       key={tab}
       onClick={() => setActiveTab(tab)}
       className={cn(
        "px-6 py-3 text-xs font-medium uppercase tracking-wider rounded-xl transition-all whitespace-nowrap",
        activeTab === tab 
         ? "bg-stone-900 text-white shadow-xl shadow-stone-900/10" 
         : "text-stone-400 hover:text-stone-900 hover:bg-white"
       )}
      >
       {tab}
      </button>
     ))}
    </div>
   </header>

   {activeTab === 'learning' && (
    <div className="space-y-10">
     <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="space-y-1">
       <h3 className="text-lg font-medium tracking-tight text-stone-900">Learning Hub</h3>
       <p className="text-sm text-stone-400 font-light">Master the art of building and scaling with world-class instructors.</p>
      </div>
      <div className="flex items-center gap-3">
       <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
        <input 
         type="text" 
         placeholder="Search courses..." 
         className="bg-stone-50 border border-stone-200/60 rounded-2xl py-3 pl-12 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:bg-white transition-all w-full md:w-[300px] font-light"
        />
       </div>
       <Button variant="outline" className="h-10 px-6 rounded-2xl border-stone-200/60 hover:bg-stone-50 text-xs font-medium uppercase tracking-widest">
        <SlidersHorizontal className="w-4 h-4 mr-2" /> Filters
       </Button>
      </div>
     </div>

     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 sm:gap-8">
      {mockCourses.map((course, idx) => (
       <motion.div
        key={course.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.1 }}
       >
        <Card className="group hover:shadow-2xl transition-all duration-500 border-stone-200/60 hover:border-stone-900 flex flex-col h-full p-4 rounded-[2.5rem] bg-white overflow-hidden">
         <div className="aspect-video bg-stone-100 rounded-[1.5rem] mb-6 overflow-hidden relative">
          <img 
           src={course.image} 
           alt={course.title} 
           className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
           referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
           <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-stone-900 shadow-xl scale-75 group-hover:scale-100 transition-transform">
            <PlayCircle className="w-6 h-6" />
           </div>
          </div>
          <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-xs font-medium uppercase tracking-widest shadow-sm border border-white/20">
           {course.level}
          </div>
         </div>
         <div className="space-y-4 flex-1 px-2">
          <div className="space-y-1">
           <h4 className="font-medium text-base leading-tight text-stone-900 group-hover:text-stone-900 transition-colors">{course.title}</h4>
           <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-stone-400 uppercase tracking-widest">Instructor</span>
            <span className="text-xs text-stone-600 font-medium">{course.instructor}</span>
           </div>
          </div>
          <div className="flex items-center gap-4 pt-2 border-t border-stone-50">
           <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-stone-400 uppercase tracking-widest">
            <Clock className="w-3.5 h-3.5" /> {course.duration}
           </div>
           <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-amber-500 uppercase tracking-widest">
            <Star className="w-3.5 h-3.5 fill-amber-500" /> {course.rating}
           </div>
          </div>
         </div>
         <Button variant="outline" className="w-full mt-8 h-10 rounded-2xl text-xs font-medium uppercase tracking-wider border-stone-200 hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-all">
          Start Learning
         </Button>
        </Card>
       </motion.div>
      ))}
     </div>
    </div>
   )}

   {activeTab === 'services' && (
    <div className="space-y-10">
     <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="space-y-1">
       <h3 className="text-lg font-medium tracking-tight text-stone-900">Partner Services</h3>
       <p className="text-sm text-stone-400 font-light">Exclusive deals and vetted services for our ecosystem members.</p>
      </div>
      <Button variant="outline" className="h-10 px-6 rounded-2xl border-stone-200/60 hover:bg-stone-50 text-xs font-medium uppercase tracking-widest">
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
        <Card className="group hover:shadow-2xl transition-all duration-500 border-stone-200/60 hover:border-stone-900 p-10 rounded-[3rem] bg-white relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <Wrench className="w-32 h-32 -mr-12 -mt-12" />
         </div>
         <div className="flex items-start justify-between mb-8 relative z-10">
          <div className="w-16 h-16 bg-stone-50 rounded-[1.5rem] flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all border border-stone-100 shadow-sm">
           <Wrench className="w-8 h-8" />
          </div>
          <div className="text-right">
           <p className="text-xl font-medium text-stone-900 tracking-tight">{service.price}</p>
           <p className="text-xs text-stone-400 font-medium uppercase tracking-wider">Starting at</p>
          </div>
         </div>
         <div className="space-y-4 relative z-10">
          <div className="space-y-1">
           <h4 className="font-medium text-lg tracking-tight text-stone-900">{service.name}</h4>
           <p className="text-sm text-stone-500 font-light">by {service.provider}</p>
          </div>
          <div className="flex items-center gap-4 pt-4 border-t border-stone-50">
           <span className="px-3 py-1 bg-stone-50 text-stone-500 rounded-full text-xs font-medium uppercase tracking-widest border border-stone-100">{service.type}</span>
           <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-amber-500 uppercase tracking-widest">
            <Star className="w-4 h-4 fill-amber-500" /> {service.rating}
           </div>
          </div>
         </div>
         <Button variant="primary" className="w-full mt-10 h-11 rounded-2xl text-xs font-medium uppercase tracking-wider shadow-xl shadow-stone-900/10">
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
       <h3 className="text-lg font-medium tracking-tight text-stone-900">Jobs & Roles</h3>
       <p className="text-sm text-stone-400 font-light">Find your next co-founder or early-stage hire.</p>
      </div>
      <Button variant="primary" className="h-10 px-8 rounded-2xl text-xs font-medium uppercase tracking-widest shadow-lg shadow-stone-900/10">
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
        <Card className="group hover:shadow-2xl transition-all duration-500 border-stone-200/60 hover:border-stone-900 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] bg-white">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-8">
           <div className="w-16 h-16 bg-stone-50 rounded-[1.5rem] flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all border border-stone-100 shadow-sm">
            <Briefcase className="w-8 h-8" />
           </div>
           <div className="space-y-1">
            <h4 className="font-medium text-lg tracking-tight text-stone-900">{job.title}</h4>
            <div className="flex items-center gap-3">
             <span className="text-sm text-stone-600 font-medium">{job.company}</span>
             <div className="w-1 h-1 rounded-full bg-stone-200"></div>
             <span className="text-sm text-stone-400 font-light">{job.location}</span>
            </div>
           </div>
          </div>
          <div className="flex items-center gap-10">
           <div className="text-right hidden md:block space-y-1">
            <p className="text-base font-medium text-stone-900 tracking-tight">{job.salary}</p>
            <p className="text-xs text-stone-400 font-medium uppercase tracking-wider">{job.type}</p>
           </div>
           <Button variant="outline" className="h-11 px-10 rounded-2xl text-xs font-medium uppercase tracking-wider border-stone-200 hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-all">
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
         className="flex items-center justify-between p-6 sm:p-8 bg-white rounded-[2rem] border border-stone-200/60 hover:border-stone-900 transition-all cursor-pointer group shadow-sm hover:shadow-xl"
        >
         <p className="text-base font-medium text-stone-900">{q}</p>
         <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-300 group-hover:bg-stone-900 group-hover:text-white transition-all">
          <ChevronRight className="w-5 h-5" />
         </div>
        </motion.div>
       ))}
      </div>
      <Button variant="outline" className="w-full h-16 rounded-[2rem] text-xs font-medium uppercase tracking-wider border-stone-200 hover:bg-stone-50">
       Visit Full Help Center
      </Button>
     </div>

     <div className="lg:col-span-5 space-y-10">
      <Card className="p-10 rounded-[3rem] border-stone-200/60 shadow-xl bg-white relative overflow-hidden group">
       <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <GraduationCap className="w-40 h-40 -mr-16 -mt-16" />
       </div>
       <div className="space-y-8 relative z-10">
        <div className="space-y-1">
         <h3 className="text-lg font-medium tracking-tight text-stone-900">Expert Coaching</h3>
         <p className="text-sm text-stone-400 font-light">Book a session with a startup veteran</p>
        </div>
        <div className="space-y-6">
         <div className="p-6 sm:p-8 bg-stone-900 rounded-[2rem] sm:rounded-[2.5rem] text-white space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl" />
          <div className="flex items-center gap-6">
           <div className="w-16 h-16 rounded-[1.5rem] bg-stone-800 border border-stone-700 overflow-hidden shadow-xl">
            <img src="https://picsum.photos/seed/coach/150/150" alt="Coach" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
           </div>
           <div className="space-y-1">
            <p className="text-base font-medium">Sarah Chen</p>
            <p className="text-xs text-stone-400 font-medium uppercase tracking-widest">Fundraising Expert</p>
           </div>
          </div>
          <p className="text-sm text-stone-300 italic serif leading-relaxed">
           "I help founders refine their pitch deck and strategy to close their Seed and Series A rounds faster."
          </p>
          <div className="flex items-center justify-between pt-4 border-t border-stone-800">
           <div className="space-y-0.5">
            <p className="text-lg font-medium text-white">$150</p>
            <p className="text-xs text-stone-500 font-medium uppercase tracking-widest">per session</p>
           </div>
           <Button className="h-10 px-8 rounded-xl bg-white text-stone-900 hover:bg-stone-100 transition-all font-medium text-xs uppercase tracking-wider">
            Book Now
           </Button>
          </div>
         </div>
         <Button variant="ghost" className="w-full h-11 rounded-2xl text-xs font-medium uppercase tracking-wider text-stone-400 hover:text-stone-900 hover:bg-stone-50 border border-transparent hover:border-stone-100 transition-all">
          View All Coaches
         </Button>
        </div>
       </div>
      </Card>

      <Card className="bg-stone-50 border-stone-200/60 p-10 rounded-[3rem] shadow-sm relative overflow-hidden group">
       <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <HelpCircle className="w-32 h-32 -mr-12 -mt-12" />
       </div>
       <div className="space-y-6 relative z-10">
        <div className="flex items-center gap-3 text-stone-900">
         <HelpCircle className="w-5 h-5" />
         <h4 className="font-medium text-sm uppercase tracking-wider">Live Support</h4>
        </div>
        <p className="text-base text-stone-500 leading-relaxed font-light">
         Need immediate assistance? Our support team is available 24/7 for premium members.
        </p>
        <Button variant="outline" className="w-full h-11 rounded-2xl border-stone-200 hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-all font-medium text-xs uppercase tracking-wider">
         Start Chat
        </Button>
       </div>
      </Card>
     </div>
    </div>
   )}
  </div>
 );
}
