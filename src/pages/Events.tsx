import { useState } from "react";
import { 
 Calendar as CalendarIcon, MapPin, Users, Video, 
 Plus, Search, Filter, ChevronRight, Star, 
 Clock, Share2, Bookmark, ExternalLink, Rocket, Zap, Globe
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageShell from "../components/ui/PageShell";
import { cn } from "../lib/utils";
import { eventListKeys, readIds, toggleId } from "../lib/localLists";
import { User } from "../types";

interface EventsProps {
 user: User;
}

interface Event {
 id: string;
 title: string;
 description: string;
 date: string;
 time: string;
 location: string;
 type: 'Workshop' | 'Networking' | 'Pitch Night' | 'Webinar' | 'Conference';
 attendees: number;
 image: string;
 isOnline: boolean;
 organizer: string;
}

export default function Events({ user }: EventsProps) {
 const [activeTab, setActiveTab] = useState('Upcoming');
 const [typeFilter, setTypeFilter] = useState<'All' | Event['type']>('All');
 const categoryType: Record<string, Event['type']> = {
  Workshops: 'Workshop',
  Networking: 'Networking',
  'Pitch Nights': 'Pitch Night',
  Webinars: 'Webinar',
  Conferences: 'Conference',
 };
 const [showTypes, setShowTypes] = useState(false);
 const [registeredEvents, setRegisteredEvents] = useState<string[]>(() => readIds(eventListKeys.registered));
 const [bookmarkedEvents, setBookmarkedEvents] = useState<string[]>(() => readIds(eventListKeys.bookmarked));

 const toggleRegistration = (eventId: string) => {
  setRegisteredEvents(toggleId(eventListKeys.registered, eventId));
 };
 const toggleBookmark = (eventId: string) => {
  setBookmarkedEvents(toggleId(eventListKeys.bookmarked, eventId));
 };

 const mockEvents: Event[] = [
  {
   id: "1",
   title: "Startup Founders Networking Night",
   description: "Connect with fellow founders, share experiences, and find potential collaborators in a relaxed environment.",
   date: "March 28, 2026",
   time: "6:00 PM - 9:00 PM",
   location: "Tech Hub, London",
   type: 'Networking',
   attendees: 124,
   image: "https://picsum.photos/seed/event1/800/400",
   isOnline: false,
   organizer: "CoFounderBay Team"
  },
  {
   id: "2",
   title: "Mastering the Seed Round Pitch",
   description: "Learn the secrets of a successful seed round pitch from venture capitalists and successful founders.",
   date: "April 02, 2026",
   time: "2:00 PM - 4:00 PM",
   location: "Zoom / Online",
   type: 'Workshop',
   attendees: 450,
   image: "https://picsum.photos/seed/event2/800/400",
   isOnline: true,
   organizer: "Sarah Chen"
  },
  {
   id: "3",
   title: "FinTech Demo Day Q2",
   description: "Watch the most promising fintech startups from our ecosystem pitch their solutions to top-tier investors.",
   date: "April 15, 2026",
   time: "10:00 AM - 1:00 PM",
   location: "Innovation Center, NY",
   type: 'Pitch Night',
   attendees: 85,
   image: "https://picsum.photos/seed/event3/800/400",
   isOnline: false,
   organizer: "Finly Ventures"
  }
 ];
 const visibleEvents = typeFilter === 'All' ? mockEvents : mockEvents.filter((event) => event.type === typeFilter);

 return (
  <PageShell
   title="Events"
   description="Discover workshops, networking nights, and pitch events designed to accelerate your growth."
   actions={
    <div className="flex flex-wrap items-center gap-2">
     <button 
      type="button"
      onClick={() => setShowTypes((open) => !open)}
      className="flex items-center gap-1.5 min-h-11 px-3 py-2 bg-white text-stone-600 rounded-xl text-sm font-medium hover:bg-stone-50 transition-all border border-stone-200"
     >
      <Filter className="w-3.5 h-3.5" /> {typeFilter === 'All' ? 'Filter' : typeFilter}
     </button>
     <button 
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'Schedule a new event on my calendar' } }))}
      className="flex items-center gap-1.5 min-h-11 px-3 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-all"
     >
      <Plus className="w-3.5 h-3.5" /> Host Event
     </button>
    </div>
   }
  >

   <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
    {/* Main Events List */}
    <div className="lg:col-span-8 space-y-4">
     <div className="scroll-tabs bg-stone-50 p-1 rounded-xl border border-stone-100">
      {['Upcoming', 'My Events', 'Past'].map((tab) => (
       <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={cn(
         "px-4 py-2 text-sm font-medium rounded-lg transition-all",
         activeTab === tab 
          ? "bg-stone-900 text-white shadow-sm" 
          : "text-stone-400 hover:text-stone-900 hover:bg-white"
        )}
       >
        {tab}
       </button>
      ))}
     </div>

     {showTypes && (
      <div className="flex flex-wrap gap-2">
       {(['All', 'Workshop', 'Networking', 'Pitch Night', 'Webinar', 'Conference'] as const).map((type) => (
        <button
         key={type}
         type="button"
         onClick={() => setTypeFilter(type)}
         className={cn(
          "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
          typeFilter === type ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-500 border-stone-200 hover:text-stone-900"
         )}
        >
         {type}
        </button>
       ))}
      </div>
     )}

     <div id="event-list" className="space-y-4">
      {(visibleEvents.length === 0) && (
       <p className="text-sm text-stone-500 bg-white border border-stone-100 rounded-2xl p-4">
        No events in this category yet. Ask the studio assistant to host one.
       </p>
      )}
      {visibleEvents.map((event) => (
       <div key={event.id} className="bg-white overflow-hidden group hover:shadow-md transition-all border border-stone-100 rounded-2xl">
        <div className="flex flex-col md:flex-row">
         <div className="md:w-56 h-44 md:h-auto overflow-hidden relative shrink-0">
          <img 
           src={event.image} 
           alt={event.title} 
           className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
           referrerPolicy="no-referrer"
          />
          <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-semibold tracking-wider shadow border border-white/20">
           {event.type}
          </div>
         </div>
         <div className="flex-1 p-5 flex flex-col justify-between gap-4">
          <div>
           <div className="flex items-start justify-between gap-3 mb-2">
            <div>
             <h3 className="text-base font-semibold text-stone-900 leading-snug">{event.title}</h3>
             <p className="text-xs text-stone-400 mt-0.5 tracking-wider">by {event.organizer}</p>
            </div>
            <div className="flex gap-1 shrink-0">
             <button type="button" onClick={() => toggleBookmark(event.id)} className={cn("p-1.5 hover:bg-stone-50 rounded-lg transition-all", bookmarkedEvents.includes(event.id) ? "text-stone-900" : "text-stone-300 hover:text-stone-700")}>
              <Bookmark className={cn("w-3.5 h-3.5", bookmarkedEvents.includes(event.id) && "fill-current")} />
             </button>
             <button type="button" onClick={() => { void navigator.clipboard?.writeText(event.title); }} className="p-1.5 text-stone-300 hover:text-stone-700 hover:bg-stone-50 rounded-lg transition-all">
              <Share2 className="w-3.5 h-3.5" />
             </button>
            </div>
           </div>
           <p className="text-sm text-stone-500 leading-relaxed line-clamp-2">{event.description}</p>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-stone-500">
           <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-stone-400" />
            <span>{event.date}</span>
           </div>
           <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span>{event.time}</span>
           </div>
           <div className="flex items-center gap-1.5">
            {event.isOnline ? <Video className="w-3.5 h-3.5 text-stone-400" /> : <MapPin className="w-3.5 h-3.5 text-stone-400" />}
            <span className="truncate max-w-[140px]">{event.location}</span>
           </div>
           <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-stone-400" />
            <span>{event.attendees} attending</span>
           </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-stone-50">
           <div className="flex -space-x-2">
            {[1, 2, 3, 4].map((i) => (
             <div key={i} className="w-7 h-7 rounded-lg border-2 border-white bg-stone-100 overflow-hidden shadow-sm">
              <img src={`https://picsum.photos/seed/att${i}/100/100`} alt="Attendee" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
             </div>
            ))}
            <div className="w-7 h-7 rounded-lg border-2 border-white bg-stone-900 flex items-center justify-center text-xs font-medium text-white shadow">
             +12
            </div>
           </div>
           <button
            onClick={() => toggleRegistration(event.id)}
            className={cn(
             "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
             registeredEvents.includes(event.id)
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-stone-900 text-white hover:bg-stone-800"
            )}
           >
            {registeredEvents.includes(event.id) ? "✓ Registered" : "Register Now"}
           </button>
          </div>
         </div>
        </div>
       </div>
      ))}
     </div>
    </div>

    {/* Sidebar */}
    <aside className="lg:col-span-4 space-y-4">
     {/* Featured Event */}
     <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
      <p className="text-xs font-semibold text-stone-400 tracking-wider mb-3">Featured Event</p>
      <div className="h-40 rounded-xl overflow-hidden relative group cursor-pointer mb-3">
       <img 
        src="https://picsum.photos/seed/featured/600/400" 
        alt="Featured" 
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        referrerPolicy="no-referrer"
       />
       <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 to-transparent"></div>
       <div className="absolute bottom-3 left-3 right-3">
        <span className="text-[10px] font-semibold text-white tracking-wider bg-amber-500 px-2 py-0.5 rounded mb-1 inline-block">Recommended</span>
        <p className="text-white text-sm font-semibold leading-tight">Global Startup Summit 2026</p>
       </div>
      </div>
      <p className="text-sm text-stone-500 leading-relaxed mb-3">
       The biggest gathering of founders and investors in the ecosystem.
      </p>
      <button 
       type="button"
       onClick={() => document.getElementById('event-list')?.scrollIntoView({ behavior: 'smooth' })}
       className="w-full py-2 rounded-lg text-sm font-medium text-stone-600 bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-all"
      >
       Learn More
      </button>
     </div>

     {/* Categories */}
     <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
      <p className="text-xs font-semibold text-stone-400 tracking-wider mb-3">Event Categories</p>
      <div className="space-y-1">
       {[
        { name: "Workshops", count: 12, icon: Rocket },
        { name: "Networking", count: 8, icon: Users },
        { name: "Pitch Nights", count: 5, icon: Zap },
        { name: "Webinars", count: 15, icon: Video },
        { name: "Conferences", count: 3, icon: Globe }
       ].map((cat) => (
        <button key={cat.name} type="button" onClick={() => { setTypeFilter(categoryType[cat.name] ?? 'All'); setShowTypes(true); document.getElementById('event-list')?.scrollIntoView({ behavior: 'smooth' }); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-stone-50 transition-all group">
         <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-stone-50 flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all">
           <cat.icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-medium text-stone-600 group-hover:text-stone-900 transition-colors">{cat.name}</span>
         </div>
         <span className="text-xs font-semibold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{cat.count}</span>
        </button>
       ))}
      </div>
     </div>

     {/* Host CTA — light version */}
     <div className="studio-nudge bg-emerald-50 border border-emerald-100 rounded-2xl space-y-3">
      <div className="w-8 h-8 bg-white border border-emerald-100 rounded-xl flex items-center justify-center">
       <Rocket className="w-4 h-4 text-emerald-600" />
      </div>
      <div>
       <p className="text-sm font-semibold text-stone-900">Host Your Own Event</p>
       <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
        Share your expertise or host a networking session for the community.
       </p>
      </div>
      <button
       type="button"
       onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'Schedule a new event on my calendar' } }))}
       className="w-full py-2 rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-all text-sm font-semibold"
      >
       Create Event
      </button>
     </div>
    </aside>
   </div>
  </PageShell>
 );
}
