import { useState } from "react";
import { 
 Calendar as CalendarIcon, Clock, Plus,
 ChevronLeft, ChevronRight, MoreVertical, MapPin,
 Users, Video, Bell, Search
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageShell from "../components/ui/PageShell";
import { cn } from "../lib/utils";
import { readSessions } from "../lib/localLists";
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

 const starterEvents: Event[] = [
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
 const events: Event[] = [...readSessions(), ...starterEvents];

 const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

 return (
  <PageShell
   title="Schedule"
   description="Manage meetings, track deadlines, and stay aligned with your objectives."
   actions={
    <div className="flex items-center gap-2">
     <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400" />
      <input
       type="text"
       placeholder="Search events..."
       className="pl-8 pr-3 py-1.5 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-400 w-36 transition-all"
      />
     </div>
     <Button className="h-8 px-3 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-sm">
      <Plus className="w-3.5 h-3.5 mr-1.5" /> Schedule
     </Button>
    </div>
   }
  >
   <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
    {/* Main Calendar Grid */}
    <div className="lg:col-span-8">
     <Card noPadding className="rounded-2xl border-stone-100 overflow-hidden bg-white">
      <div className="px-5 py-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
       <div className="flex items-center gap-3">
        <h3 className="text-base font-semibold text-stone-900">{currentMonth}</h3>
        <div className="flex items-center gap-1">
         <Button variant="ghost" size="icon" aria-label="Previous month" className="rounded-lg border border-stone-100 hover:bg-stone-50">
          <ChevronLeft className="w-4 h-4" />
         </Button>
         <Button variant="ghost" size="icon" aria-label="Next month" className="rounded-lg border border-stone-100 hover:bg-stone-50">
          <ChevronRight className="w-4 h-4" />
         </Button>
        </div>
       </div>
       <div className="scroll-tabs bg-stone-50 p-1 rounded-xl border border-stone-100">
        {['Month', 'Week', 'Day'].map((v) => (
         <button
          key={v}
          onClick={() => setView(v)}
          className={cn(
           "px-3 py-1.5 text-sm font-medium rounded-lg transition-all",
           view === v ? "bg-white text-stone-900 shadow-sm border border-stone-200" : "text-stone-400 hover:text-stone-600"
          )}
         >
          {v}
         </button>
        ))}
       </div>
      </div>

      <div className="p-4">
       <div className="grid grid-cols-7 mb-2">
        {weekDays.map((day) => (
         <div key={day} className="text-center text-xs font-semibold text-stone-400 py-2">
          <span className="sm:hidden">{day.slice(0, 1)}</span>
          <span className="hidden sm:inline">{day}</span>
         </div>
        ))}
       </div>
       <div className="grid grid-cols-7 gap-px bg-stone-100 border border-stone-100 rounded-xl overflow-hidden">
        {Array.from({ length: 35 }).map((_, i) => {
         const dayNum = i - 3;
         const isCurrentMonth = dayNum > 0 && dayNum <= 31;
         const hasEvent = [15, 20, 25].includes(dayNum);
         const isToday = dayNum === 26;

         return (
          <div
           key={i}
           className={cn(
            "min-h-14 h-16 sm:h-20 lg:h-28 bg-white p-1 sm:p-2 transition-all hover:bg-stone-50 cursor-pointer group relative",
            !isCurrentMonth && "bg-stone-50/60"
           )}
          >
           {isCurrentMonth && (
            <span className={cn(
             "text-sm font-medium transition-all",
             isToday ? "w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs" : "text-stone-300 group-hover:text-stone-400"
            )}>
             {dayNum}
            </span>
           )}

           {hasEvent && (
            <div className="mt-1 space-y-0.5 relative z-10">
             <div className="bg-stone-900 text-white text-xs font-medium px-1.5 py-0.5 rounded-md truncate">
              MVP Launch
             </div>
             <div className="bg-white border border-stone-200 text-stone-600 text-xs font-medium px-1.5 py-0.5 rounded-md truncate">
              Sync Me...
             </div>
            </div>
           )}

           <button className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all w-6 h-6 bg-white border border-stone-200 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-900">
            <Plus className="w-3 h-3" />
           </button>
          </div>
         );
        })}
       </div>
      </div>
     </Card>
    </div>

    {/* Upcoming Events Sidebar */}
    <div className="lg:col-span-4 space-y-4">
     <Card className="rounded-2xl border-stone-100 p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
       <div>
        <h4 className="text-sm font-semibold text-stone-900">Upcoming Today</h4>
        <p className="text-xs text-stone-400 mt-0.5">Thursday, March 26</p>
       </div>
       <Button variant="outline" className="h-7 px-3 text-sm rounded-lg border-stone-200">
        Full Agenda
       </Button>
      </div>
      <div className="space-y-2">
       {events.map((event, idx) => (
        <motion.div
         key={event.id}
         initial={{ opacity: 0, y: 6 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: idx * 0.06 }}
         className="p-3 bg-stone-50 rounded-xl border border-stone-100 hover:border-stone-300 transition-all cursor-pointer group"
        >
         <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
           <div className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            event.type === 'Meeting' ? "bg-blue-500" :
            event.type === 'Deadline' ? "bg-red-500" :
            event.type === 'Mentorship' ? "bg-purple-500" :
            "bg-emerald-500"
           )} />
           <span className="text-xs font-semibold text-stone-400 tracking-wider">{event.type}</span>
          </div>
          <button className="text-stone-300 hover:text-stone-600 transition-colors opacity-0 group-hover:opacity-100">
           <MoreVertical className="w-3.5 h-3.5" />
          </button>
         </div>

         <h4 className="text-sm font-semibold text-stone-900 mb-2 leading-tight">{event.title}</h4>

         <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-stone-400">
           <Clock className="w-3 h-3 shrink-0" />
           <span>{event.time} · {event.duration}</span>
          </div>
          {event.location && (
           <div className="flex items-center gap-2 text-xs text-stone-400">
            {event.location.includes('Meet') || event.location.includes('Zoom') ? <Video className="w-3 h-3 shrink-0" /> : <MapPin className="w-3 h-3 shrink-0" />}
            <span className="truncate">{event.location}</span>
           </div>
          )}
          {event.participants && (
           <div className="flex items-center gap-2 text-xs text-stone-400">
            <Users className="w-3 h-3 shrink-0" />
            <span className="truncate">{event.participants.join(", ")}</span>
           </div>
          )}
         </div>
        </motion.div>
       ))}
      </div>
     </Card>

     {/* Event Reminders — light version */}
     <Card className="rounded-2xl border-stone-100 p-4 bg-amber-50 border-amber-100">
      <div className="flex gap-3 items-start">
       <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-amber-500 border border-amber-100 shrink-0">
        <Bell className="w-4 h-4" />
       </div>
       <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-stone-900 mb-1">Event Reminders</h4>
        <p className="text-xs text-stone-500 leading-relaxed mb-3">
         3 events scheduled for tomorrow. Enable morning briefings?
        </p>
        <Button className="w-full h-7 rounded-lg bg-stone-900 text-white hover:bg-stone-800 text-sm">
         Enable Briefing
        </Button>
       </div>
      </div>
     </Card>
    </div>
   </div>
  </PageShell>
 );
}
