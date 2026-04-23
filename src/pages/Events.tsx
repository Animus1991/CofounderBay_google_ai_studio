import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
 Calendar as CalendarIcon, MapPin, Users, Video, 
 Plus, Search, Filter, ChevronRight, Star, 
 Clock, Share2, Bookmark, ExternalLink, Rocket, Zap, Globe
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { cn } from "../lib/utils";
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
 type: 'Workshop' | 'Networking' | 'Pitch Night' | 'Webinar';
 attendees: number;
 image: string;
 isOnline: boolean;
 organizer: string;
}

export default function Events({ user }: EventsProps) {
 const [activeTab, setActiveTab] = useState('Upcoming');
 const [registeredEvents, setRegisteredEvents] = useState<string[]>([]);
 const navigate = useNavigate();

 const toggleRegistration = (eventId: string) => {
  setRegisteredEvents(prev => 
   prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
  );
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

 return (
  <div className="space-y-12 max-w-7xl mx-auto pb-20">
   <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-stone-200 pb-10">
    <div className="space-y-4">
     <div className="flex items-center gap-3">
      <div className="h-px w-8 bg-stone-900"></div>
      <span className="text-xs font-medium uppercase tracking-wider text-stone-400">Ecosystem Gatherings</span>
     </div>
     <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-medium tracking-tight text-stone-900">Ecosystem <span className="text-stone-300 italic serif">Events</span></h2>
     <p className="text-stone-500 text-lg font-light max-w-2xl">Discover workshops, networking nights, and pitch events designed to accelerate your growth.</p>
    </div>
    <div className="flex items-center gap-3">
     <Button 
      variant="outline" 
      onClick={() => navigate('/dashboard')}
      className="h-11 px-8 rounded-2xl border-stone-200/60 hover:bg-stone-50 text-xs font-medium uppercase tracking-wider"
     >
      <Filter className="w-4 h-4 mr-2" /> Filter
     </Button>
     <Button 
      variant="primary" 
      onClick={() => navigate('/dashboard')}
      className="h-11 px-8 rounded-2xl text-xs font-medium uppercase tracking-wider shadow-xl shadow-stone-900/10"
     >
      <Plus className="w-4 h-4 mr-2" /> Host Event
     </Button>
    </div>
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
    {/* Main Events List */}
    <div className="lg:col-span-8 space-y-10">
     <div className="flex items-center gap-2 bg-stone-50 p-1.5 rounded-2xl border border-stone-200/60 shadow-sm w-fit">
      {['Upcoming', 'My Events', 'Past'].map((tab) => (
       <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={cn(
         "px-6 py-3 text-xs font-medium uppercase tracking-wider rounded-xl transition-all",
         activeTab === tab 
          ? "bg-stone-900 text-white shadow-xl shadow-stone-900/10" 
          : "text-stone-400 hover:text-stone-900 hover:bg-white"
        )}
       >
        {tab}
       </button>
      ))}
     </div>

     <div className="space-y-8">
      {mockEvents.map((event) => (
       <Card key={event.id} noPadding className="overflow-hidden group hover:shadow-2xl transition-all border-stone-200/60 hover:border-stone-900 rounded-[3rem] bg-white">
        <div className="flex flex-col md:flex-row h-full">
         <div className="md:w-80 h-64 md:h-auto overflow-hidden relative shrink-0">
          <img 
           src={event.image} 
           alt={event.title} 
           className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
           referrerPolicy="no-referrer"
          />
          <div className="absolute top-6 left-6 px-4 py-2 bg-white/90 backdrop-blur-md rounded-2xl text-xs font-medium uppercase tracking-wider shadow-xl border border-white/20">
           {event.type}
          </div>
         </div>
         <div className="flex-1 p-10 space-y-8 flex flex-col justify-between">
          <div className="space-y-6">
           <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
             <h3 className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900 tracking-tight leading-tight group-hover:text-stone-900 transition-colors">{event.title}</h3>
             <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-stone-400 uppercase tracking-widest">Organized by</span>
              <span className="text-xs font-mono font-medium text-stone-900 uppercase tracking-widest">{event.organizer}</span>
             </div>
            </div>
            <div className="flex gap-2 shrink-0">
             <Button variant="ghost" size="icon" className="h-10 w-12 rounded-2xl text-stone-300 hover:text-stone-900 hover:bg-stone-50 border border-transparent hover:border-stone-100">
              <Bookmark className="w-5 h-5" />
             </Button>
             <Button variant="ghost" size="icon" className="h-10 w-12 rounded-2xl text-stone-300 hover:text-stone-900 hover:bg-stone-50 border border-transparent hover:border-stone-100">
              <Share2 className="w-5 h-5" />
             </Button>
            </div>
           </div>
           
           <p className="text-base text-stone-500 font-light leading-relaxed line-clamp-2">
            {event.description}
           </p>

           <div className="grid grid-cols-2 gap-y-6 gap-x-10 pt-8 border-t border-stone-50">
            <div className="flex items-center gap-4 group/item">
             <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-400 group-hover/item:bg-stone-900 group-hover/item:text-white transition-all">
              <CalendarIcon className="w-5 h-5" />
             </div>
             <div className="space-y-0.5">
              <p className="text-xs font-mono font-medium text-stone-400 uppercase tracking-widest">Date</p>
              <p className="text-sm font-medium text-stone-900">{event.date}</p>
             </div>
            </div>
            <div className="flex items-center gap-4 group/item">
             <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-400 group-hover/item:bg-stone-900 group-hover/item:text-white transition-all">
              <Clock className="w-5 h-5" />
             </div>
             <div className="space-y-0.5">
              <p className="text-xs font-mono font-medium text-stone-400 uppercase tracking-widest">Time</p>
              <p className="text-sm font-medium text-stone-900">{event.time}</p>
             </div>
            </div>
            <div className="flex items-center gap-4 group/item">
             <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-400 group-hover/item:bg-stone-900 group-hover/item:text-white transition-all">
              {event.isOnline ? <Video className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
             </div>
             <div className="space-y-0.5">
              <p className="text-xs font-mono font-medium text-stone-400 uppercase tracking-widest">Location</p>
              <p className="text-sm font-medium text-stone-900 truncate max-w-[150px]">{event.location}</p>
             </div>
            </div>
            <div className="flex items-center gap-4 group/item">
             <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-400 group-hover/item:bg-stone-900 group-hover/item:text-white transition-all">
              <Users className="w-5 h-5" />
             </div>
             <div className="space-y-0.5">
              <p className="text-xs font-mono font-medium text-stone-400 uppercase tracking-widest">Attending</p>
              <p className="text-sm font-medium text-stone-900">{event.attendees} Founders</p>
             </div>
            </div>
           </div>
          </div>

          <div className="pt-8 flex items-center justify-between border-t border-stone-50">
           <div className="flex -space-x-3">
            {[1, 2, 3, 4, 5].map((i) => (
             <div key={i} className="w-10 h-10 rounded-2xl border-4 border-white bg-stone-100 overflow-hidden shadow-sm hover:translate-y-1 transition-transform cursor-pointer">
              <img src={`https://picsum.photos/seed/att${i}/100/100`} alt="Attendee" referrerPolicy="no-referrer" />
             </div>
            ))}
            <div className="w-10 h-10 rounded-2xl border-4 border-white bg-stone-900 flex items-center justify-center text-xs font-medium text-white shadow-xl">
             +12
            </div>
           </div>
           <Button 
            variant={registeredEvents.includes(event.id) ? "outline" : "primary"} 
            onClick={() => toggleRegistration(event.id)}
            className={cn(
             "h-11 px-10 rounded-[1.5rem] text-xs font-medium uppercase tracking-wider shadow-2xl shadow-stone-900/20",
             registeredEvents.includes(event.id) && "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-none hover:bg-emerald-100"
            )}
           >
            {registeredEvents.includes(event.id) ? "Registered" : "Register Now"}
           </Button>
          </div>
         </div>
        </div>
       </Card>
      ))}
     </div>
    </div>

    {/* Sidebar: Featured & Filters */}
    <aside className="lg:col-span-4 space-y-10">
     <Card className="p-10 rounded-[3rem] border-stone-200/60 shadow-xl bg-white">
      <div className="space-y-8">
       <div className="space-y-1">
        <h3 className="text-lg font-medium tracking-tight text-stone-900">Featured Event</h3>
        <p className="text-xs text-stone-400 font-light">Hand-picked by our curators</p>
       </div>
       <div className="space-y-6">
        <div className="h-56 rounded-[2rem] overflow-hidden relative group cursor-pointer shadow-2xl">
         <img 
          src="https://picsum.photos/seed/featured/600/400" 
          alt="Featured" 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
         />
         <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/20 to-transparent"></div>
         <div className="absolute bottom-6 left-6 right-6">
          <span className="text-[8px] font-medium text-white uppercase tracking-wider bg-amber-500 px-3 py-1 rounded-full mb-3 inline-block shadow-xl">Recommended</span>
          <h4 className="text-white font-medium text-lg leading-tight tracking-tight">Global Startup Summit 2026</h4>
         </div>
        </div>
        <p className="text-base text-stone-500 leading-relaxed font-light">
         The biggest gathering of founders and investors in the ecosystem. Don't miss out on the networking event of the year.
        </p>
        <Button 
         variant="outline" 
         onClick={() => navigate('/dashboard')}
         className="w-full h-11 rounded-2xl border-stone-200/60 hover:bg-stone-50 text-xs font-medium uppercase tracking-wider"
        >
         Learn More
        </Button>
       </div>
      </div>
     </Card>

     <Card className="p-10 rounded-[3rem] border-stone-200/60 shadow-xl bg-white">
      <div className="space-y-8">
       <div className="space-y-1">
        <h3 className="text-lg font-medium tracking-tight text-stone-900">Event Categories</h3>
        <p className="text-xs text-stone-400 font-light">Browse by interest</p>
       </div>
       <div className="space-y-3">
        {[
         { name: "Workshops", count: 12, icon: Rocket },
         { name: "Networking", count: 8, icon: Users },
         { name: "Pitch Nights", count: 5, icon: Zap },
         { name: "Webinars", count: 15, icon: Video },
         { name: "Conferences", count: 3, icon: Globe }
        ].map((cat) => (
         <button key={cat.name} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-stone-50 transition-all group border border-transparent hover:border-stone-100">
          <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all">
            <cat.icon className="w-5 h-5" />
           </div>
           <span className="text-sm font-medium text-stone-600 group-hover:text-stone-900 transition-colors">{cat.name}</span>
          </div>
          <span className="text-xs font-mono font-medium text-stone-400 bg-stone-100 px-3 py-1 rounded-full group-hover:bg-stone-200 transition-all">{cat.count}</span>
         </button>
        ))}
       </div>
      </div>
     </Card>

     <Card className="bg-stone-900 border-stone-800 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
       <Rocket className="w-40 h-40 -mr-16 -mt-16" />
      </div>
      <div className="space-y-8 relative z-10">
       <div className="flex items-center gap-3 text-emerald-400">
        <Plus className="w-6 h-6" />
        <h4 className="font-medium text-sm uppercase tracking-wider">Community Host</h4>
       </div>
       <h4 className="text-xl font-medium text-white tracking-tight">Host Your Own Event</h4>
       <p className="text-base text-stone-400 leading-relaxed font-light">
        Want to share your expertise or host a networking session? Create an event today.
       </p>
       <Button 
        onClick={() => navigate('/dashboard')}
        className="w-full h-16 rounded-[2rem] bg-white text-stone-900 hover:bg-stone-100 transition-all font-medium text-xs uppercase tracking-wider"
       >
        Create Event
       </Button>
      </div>
     </Card>
    </aside>
   </div>
  </div>
 );
}
