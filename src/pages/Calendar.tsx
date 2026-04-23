import { useState } from "react";
import { 
 Calendar as CalendarIcon, Clock, Plus, Filter, 
 ChevronLeft, ChevronRight, MoreVertical, MapPin,
 Users, Video, Star, Bell, Search, TrendingUp
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { cn } from "../lib/utils";
import { motion } from "framer-motion";

interface Event {
 id: string;
 title: string;
 type: 'Meeting' | 'Deadline' | 'Event' | 'Mentorship';
 time: string;
 duration: string;
 location?: string;
 participants?: string[];
 description?: string;
 priority: 'High' | 'Medium' | 'Low';
}

export default function Calendar() {
 const [currentMonth, setCurrentMonth] = useState("March 2026");
 const [view, setView] = useState('Month');

 const events: Event[] = [
  {
   id: "1",
   title: "Co-founder Sync",
   type: 'Meeting',
   time: "10:00 AM",
   duration: "45m",
   location: "Google Meet",
   participants: ["Sarah Chen", "Alex Rivera"],
   priority: 'High'
  },
  {
   id: "2",
   title: "MVP Beta Deadline",
   type: 'Deadline',
   time: "11:59 PM",
   duration: "All Day",
   priority: 'High'
  },
  {
   id: "3",
   title: "Startup Networking Event",
   type: 'Event',
   time: "06:00 PM",
   duration: "2h",
   location: "Tech Hub, London",
   participants: ["120+ attendees"],
   priority: 'Medium'
  },
  {
   id: "4",
   title: "Mentorship Session",
   type: 'Mentorship',
   time: "02:00 PM",
   duration: "1h",
   location: "Zoom",
   participants: ["David Miller"],
   priority: 'Medium'
  }
 ];

 const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

 return (
  <div className="space-y-12 max-w-7xl mx-auto pb-20">
   {/* Header Section */}
   <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-stone-200 pb-12">
    <div className="space-y-4 max-w-2xl">
     <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 border border-stone-200">
      <CalendarIcon className="w-3 h-3 text-stone-500" />
      <span className="text-xs font-medium uppercase tracking-widest text-stone-500">Time Management</span>
     </div>
     <h1 className="text-2xl font-light tracking-tight text-stone-900 leading-snug">
      Startup <span className="font-serif italic text-stone-400">Schedule</span>
     </h1>
     <p className="text-sm sm:text-base lg:text-lg text-stone-500 font-light leading-relaxed">
      Orchestrate your startup's momentum. Manage meetings, track deadlines, and stay aligned with your core objectives.
     </p>
    </div>
    <div className="flex items-center gap-3">
     <div className="relative hidden md:block group">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
      <input 
       type="text" 
       placeholder="Search events..." 
       className="bg-stone-50 border border-stone-200/60 rounded-2xl py-3 pl-12 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:bg-white transition-all w-[240px] font-light"
      />
     </div>
     <Button variant="primary" className="rounded-full px-8 bg-stone-900 hover:bg-stone-800 text-white shadow-lg shadow-stone-200">
      <Plus className="w-4 h-4 mr-2" /> Schedule
     </Button>
    </div>
   </header>

   <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
    {/* Main Calendar Grid */}
    <div className="lg:col-span-8 space-y-8">
     <Card noPadding className="rounded-[3rem] border-stone-200/60 shadow-xl overflow-hidden bg-white">
      <div className="p-8 md:p-10 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
       <div className="flex items-center gap-6">
        <h3 className="text-xl font-medium text-stone-900">{currentMonth}</h3>
        <div className="flex items-center gap-2">
         <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl border border-stone-100 hover:bg-stone-50">
          <ChevronLeft className="w-5 h-5" />
         </Button>
         <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl border border-stone-100 hover:bg-stone-50">
          <ChevronRight className="w-5 h-5" />
         </Button>
        </div>
       </div>
       <div className="flex items-center gap-1 bg-stone-100/50 p-1 rounded-2xl border border-stone-200/60 w-fit">
        {['Month', 'Week', 'Day'].map((v) => (
         <button 
          key={v}
          onClick={() => setView(v)}
          className={cn(
           "px-6 py-2.5 text-xs font-medium uppercase tracking-widest rounded-xl transition-all duration-300",
           view === v ? "bg-white text-stone-900 shadow-sm border border-stone-200" : "text-stone-400 hover:text-stone-600 hover:bg-white/50"
          )}
         >
          {v}
         </button>
        ))}
       </div>
      </div>
      
      <div className="p-6 md:p-8">
       <div className="grid grid-cols-7 mb-4">
        {weekDays.map((day) => (
         <div key={day} className="text-center text-xs font-medium text-stone-400 uppercase tracking-wider py-4">
          {day}
         </div>
        ))}
       </div>
       <div className="grid grid-cols-7 gap-px bg-stone-100 border border-stone-100 rounded-[2rem] overflow-hidden shadow-inner">
        {Array.from({ length: 35 }).map((_, i) => {
         const dayNum = i - 3; // Offset for March 2026
         const isCurrentMonth = dayNum > 0 && dayNum <= 31;
         const hasEvent = [15, 20, 25].includes(dayNum);
         const isToday = dayNum === 26;
         
         return (
          <div 
           key={i} 
           className={cn(
            "h-32 lg:h-40 bg-white p-4 transition-all hover:bg-stone-50/80 cursor-pointer group relative",
            !isCurrentMonth && "bg-stone-50/30 text-stone-200"
           )}
          >
           <span className={cn(
            "text-2xl font-light transition-all duration-500",
            isCurrentMonth ? "text-stone-100 group-hover:text-stone-200" : "text-stone-50",
            isToday && "text-stone-900"
           )}>
            {isCurrentMonth ? dayNum : ""}
           </span>
           
           {isToday && (
            <div className="absolute top-4 right-4 w-2 h-2 bg-stone-900 rounded-full shadow-lg shadow-stone-900/20" />
           )}

           {hasEvent && (
            <div className="mt-2 space-y-1.5 relative z-10">
             <div className="bg-stone-900 text-white text-xs font-medium px-2 py-1 rounded-lg truncate shadow-lg shadow-stone-900/10 border border-stone-800">
              MVP Launch
             </div>
             <div className="bg-white border border-stone-200 text-stone-600 text-xs font-medium px-2 py-1 rounded-lg truncate shadow-sm">
              Sync Meeting
             </div>
            </div>
           )}

           <button className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 w-10 h-10 bg-white border border-stone-200 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-900 shadow-xl">
            <Plus className="w-4 h-4" />
           </button>
          </div>
         );
        })}
       </div>
      </div>
     </Card>
    </div>

    {/* Upcoming Events Sidebar */}
    <div className="lg:col-span-4 space-y-10">
     <Card className="rounded-[2.5rem] border-stone-200/60 p-8 space-y-8 bg-white shadow-xl">
      <div className="space-y-1">
       <h4 className="text-lg font-medium text-stone-900">Upcoming <span className="font-serif italic text-stone-400">Today</span></h4>
       <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">Thursday, March 26</p>
      </div>
      <div className="space-y-6">
       {events.map((event, idx) => (
        <motion.div 
         key={event.id}
         initial={{ opacity: 0, x: 20 }}
         animate={{ opacity: 1, x: 0 }}
         transition={{ delay: idx * 0.1 }}
         className="p-6 bg-stone-50 rounded-[2rem] border border-stone-100 hover:border-stone-900 transition-all cursor-pointer group shadow-sm hover:shadow-xl"
        >
         <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
           <div className={cn(
            "w-2 h-2 rounded-full",
            event.type === 'Meeting' ? "bg-blue-500 shadow-lg shadow-blue-500/20" : 
            event.type === 'Deadline' ? "bg-red-500 shadow-lg shadow-red-500/20" : 
            "bg-green-500 shadow-lg shadow-green-500/20"
           )}></div>
           <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">{event.type}</span>
          </div>
          <button className="text-stone-300 hover:text-stone-900 transition-colors">
           <MoreVertical className="w-4 h-4" />
          </button>
         </div>
         
         <h4 className="font-medium text-base text-stone-900 mb-4 tracking-tight group-hover:text-stone-900 transition-colors">{event.title}</h4>
         
         <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center gap-2.5 text-xs text-stone-500 font-light">
           <Clock className="w-4 h-4 text-stone-400" />
           <span>{event.time} <span className="text-stone-300 mx-1">/</span> {event.duration}</span>
          </div>
          {event.location && (
           <div className="flex items-center gap-2.5 text-xs text-stone-500 font-light">
            {event.location.includes('Meet') || event.location.includes('Zoom') ? <Video className="w-4 h-4 text-stone-400" /> : <MapPin className="w-4 h-4 text-stone-400" />}
            <span className="truncate">{event.location}</span>
           </div>
          )}
          {event.participants && (
           <div className="flex items-center gap-2.5 text-xs text-stone-500 font-light">
            <Users className="w-4 h-4 text-stone-400" />
            <span className="truncate">{event.participants.join(", ")}</span>
           </div>
          )}
         </div>
        </motion.div>
       ))}
      </div>
      <Button variant="outline" className="w-full h-11 rounded-2xl text-xs font-medium uppercase tracking-wider border-stone-200 hover:bg-stone-50">
       View Full Agenda
      </Button>
     </Card>

     <Card className="rounded-[2.5rem] bg-stone-900 text-white border-none p-10 overflow-hidden relative group shadow-2xl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/10 transition-all duration-700" />
      <div className="relative z-10 space-y-6">
       <div className="w-12 h-12 bg-stone-800 rounded-2xl flex items-center justify-center text-amber-500 border border-stone-700">
        <Bell className="w-6 h-6" />
       </div>
       <div className="space-y-2">
        <h4 className="text-lg font-medium">Event Reminders</h4>
        <p className="text-sm text-stone-400 font-light leading-relaxed">
         You have 3 events scheduled for tomorrow. Would you like a morning briefing delivered to your inbox?
        </p>
       </div>
       <Button variant="primary" className="w-full h-11 rounded-2xl bg-white text-stone-900 hover:bg-stone-100 shadow-xl shadow-black/20 font-medium text-xs uppercase tracking-wider">
        Enable Briefing
       </Button>
      </div>
     </Card>
    </div>
   </div>
  </div>
 );
}
