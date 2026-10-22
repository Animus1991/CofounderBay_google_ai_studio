import {
 useEffect,
 useState,
 useMemo } from "react";
import {
 Calendar as CalendarIcon,
 MapPin,
 Users,
 Video,
 Plus,
 Filter,
 Clock,
 Share2,
 Bookmark,
 Rocket,
 Zap,
 Globe,
 CalendarPlus
} from "lucide-react";
import PageShell from "../components/ui/PageShell";
import EmptyHint, { AskLink, ClearFiltersButton } from "../components/ui/EmptyHint";
import { cn } from "../lib/utils";
import { useT } from "../lib/language";
import { labelOf } from "../lib/labels";
import { addSession, eventListKeys, logActivity, readIds, removeSession, toggleId } from "../lib/localLists";
import { toMillis } from "../lib/peopleSource";
import { formatDate, formatTime } from "../lib/dates";
import { downloadIcs, slugify, type CalendarEntry } from "../lib/download";
import { useToast } from "../context/ToastContext";
import { useStored } from "../lib/useStored";
import { usePageControls } from "../lib/pageControls";
import { coverFor } from "../data/photos";
import { useAuth } from "../App";
import { User } from "../types";
import { collection, limit, onSnapshot, query } from "firebase/firestore";
import { db } from "../firebase";

const TAB_EL: Record<string, string> = {
 Upcoming: 'Επερχόμενες',
 'My Events': 'Οι εκδηλώσεις μου',
 Past: 'Παλαιότερες',
 Bookmarked: 'Αποθηκευμένες',
};

interface EventsProps {
 user?: User;
}

interface Event {
 id: string;
 title: string;
 titleEl?: string;
 description: string;
 descriptionEl?: string;
 date: string;
 dateEl: string;
 time: string;
 timeEl: string;
 location: string;
 locationEl?: string;
 type: 'Workshop' | 'Networking' | 'Pitch Night' | 'Webinar' | 'Conference';
 attendees: number;
 image: string;
 isOnline: boolean;
 organizer: string;
 /** epoch millis when known — drives the Upcoming/Past split for real events. */
 startsAt?: number | null;
}

const EVENT_TYPES: Event['type'][] = ['Workshop', 'Networking', 'Pitch Night', 'Webinar', 'Conference'];

/** Maps a Firestore `events` document onto the card shape, tolerating partial fields. */
function eventFromDoc(id: string, data: Record<string, unknown>): Event {
 const startsAt = toMillis(data.startsAt ?? data.startAt ?? data.date);
 const when = startsAt ? new Date(startsAt) : null;
 const location = String(data.location ?? data.venue ?? '');
 const type = EVENT_TYPES.includes(data.type as Event['type']) ? (data.type as Event['type']) : 'Networking';
 return {
  id,
  title: String(data.title ?? data.name ?? 'Event'),
  description: String(data.description ?? ''),
  date: when ? when.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : String(data.date ?? ''),
  dateEl: when ? when.toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
  time: when ? when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : String(data.time ?? ''),
  timeEl: when ? when.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' }) : '',
  location,
  type,
  attendees: typeof data.attendees === 'number' ? data.attendees : Array.isArray(data.attendeeIds) ? data.attendeeIds.length : typeof data.attending === 'number' ? data.attending : 0,
  image: String(data.image ?? data.imageUrl ?? ''),
  isOnline: data.isOnline === true || /online|zoom|meet|virtual/i.test(location),
  organizer: String(data.organizer ?? data.organizerName ?? 'CoFounderBay'),
  startsAt,
 };
}

export default function Events(_props: EventsProps = {}) {
 const t = useT();
 const { isDemoMode } = useAuth();
 const toast = useToast();
 const [activeTab, setActiveTab] = useState('Upcoming');
 const [typeFilter, setTypeFilter] = useState<'All' | Event['type']>('All');
 const [showTypes, setShowTypes] = useState(false);
 const registeredEvents = useStored(() => readIds(eventListKeys.registered), [eventListKeys.registered]);
 const bookmarkedEvents = useStored(() => readIds(eventListKeys.bookmarked), [eventListKeys.bookmarked]);

 usePageControls(() => [
  { id: 'show-my-events', en: 'Show my events', el: 'Οι εκδηλώσεις μου', run: () => setActiveTab('My Events') },
  { id: 'show-bookmarked', en: 'Show bookmarked', el: 'Αποθηκευμένες', run: () => setActiveTab('Bookmarked') },
  { id: 'all-events', en: 'All events', el: 'Όλες οι εκδηλώσεις', run: () => { setActiveTab('Upcoming'); setTypeFilter('All'); } },
  { id: 'open-filters', en: 'Open filters', el: 'Φίλτρα', run: () => setShowTypes(true) },
 ], []);

 const toggleRegistration = (eventId: string) => {
  const next = toggleId(eventListKeys.registered, eventId);
  const listed = allEvents.find((item) => item.id === eventId);
  if (!listed) return;
  if (next.includes(eventId)) {
   addSession({
    id: `evt-${eventId}`,
    title: listed.title,
    type: 'Event',
    time: listed.startsAt ? new Date(listed.startsAt).toISOString() : `${listed.date} ${listed.time}`,
    duration: listed.time,
    location: listed.location,
    participants: [listed.organizer],
    priority: 'Medium',
   });
   logActivity({ kind: 'event', title: `Registered for ${listed.title}`, titleEl: `Εγγραφή: ${listed.title}`, href: '/calendar' });
  } else {
   removeSession(`evt-${eventId}`);
  }
 };
 const toggleBookmark = (eventId: string) => {
  toggleId(eventListKeys.bookmarked, eventId);
 };

 // One .ics file per card — disabled when the event has no real start time.
 const exportEvent = (event: Event) => {
  if (!event.startsAt) return;
  const start = new Date(event.startsAt);
  const entry: CalendarEntry = {
   uid: `event-${event.id}`,
   title: event.title,
   start,
   end: new Date(start.getTime() + 2 * 3_600_000),
   description: event.description || undefined,
   location: event.location || undefined,
  };
  downloadIcs(`${slugify(event.title)}.ics`, [entry]);
  toast.success(t('Calendar file downloaded', 'Το αρχείο ημερολογίου κατέβηκε'));
 };

 // Demo events stay in the future relative to today (7 / 12 / 25 days out)
 // and render through the shared 24-hour, language-aware date helpers.
 const buildMockEvents = (): Event[] => {
  const at = (days: number, hour: number) => {
   const d = new Date();
   d.setDate(d.getDate() + days);
   d.setHours(hour, 0, 0, 0);
   return d;
  };
  const mk = (id: string, title: string, titleEl: string, description: string, descriptionEl: string, start: Date, endHour: number, location: string, locationEl: string, type: Event['type'], attendees: number, image: string, isOnline: boolean, organizer: string): Event => {
   const end = new Date(start.getTime());
   end.setHours(endHour, 0, 0, 0);
   const dateLabel = formatDate(start, { day: 'numeric', month: 'long', year: 'numeric' });
   const timeLabel = `${formatTime(start)} - ${formatTime(end)}`;
   return {
    id, title, titleEl, description, descriptionEl,
    date: dateLabel, dateEl: dateLabel,
    time: timeLabel, timeEl: timeLabel,
    location, locationEl, type, attendees, image, isOnline, organizer,
    startsAt: start.getTime(),
   };
  };
  return [
   mk("1", "Startup Founders Networking Night", "Βραδιά δικτύωσης ιδρυτών startup", "Connect with fellow founders, share experiences, and find potential collaborators in a relaxed environment.", "Γνώρισε συνιδρυτές, μοιράσου εμπειρίες και βρες πιθανούς συνεργάτες σε χαλαρό περιβάλλον.", at(7, 18), 21, "Tech Hub, London", "Tech Hub, Λονδίνο", 'Networking', 124, coverFor("event-1", ["Startup Founders Networking Night", 'Networking'], 800, 400), false, "CoFounderBay Team"),
   mk("2", "Mastering the Seed Round Pitch", "Πώς να πετύχεις το seed round pitch", "Learn the secrets of a successful seed round pitch from venture capitalists and successful founders.", "Μάθε τα μυστικά ενός επιτυχημένου seed round pitch από επενδυτές κεφαλαίου και έμπειρα ιδρυτικά μέλη.", at(12, 14), 16, "Zoom / Online", "Zoom / Διαδικτυακά", 'Workshop', 450, coverFor("event-2", ["Mastering the Seed Round Pitch", 'Workshop'], 800, 400), true, "Sarah Chen"),
   mk("3", "FinTech Demo Day Q2", "FinTech Demo Day Q2", "Watch the most promising fintech startups from our ecosystem pitch their solutions to top-tier investors.", "Δες τα πιο πολλά υποσχόμενα fintech startups του οικοσυστήματος να κάνουν pitch σε κορυφαίους επενδυτές.", at(25, 10), 13, "Innovation Center, NY", "Innovation Center, Νέα Υόρκη", 'Pitch Night', 85, coverFor("event-3", ["FinTech Demo Day Q2", 'Pitch Night'], 800, 400), false, "Finly Ventures"),
  ];
 };
 const mockEvents = useMemo(() => buildMockEvents(), []);

 // Real accounts read the shared `events` collection; demo mode keeps the
 // illustrative listings below.
 const [liveEvents, setLiveEvents] = useState<Event[] | null>(null);
 useEffect(() => {
  if (isDemoMode) { setLiveEvents(null); return; }
  return onSnapshot(
   query(collection(db, 'events'), limit(50)),
   (snapshot) => setLiveEvents(snapshot.docs.map((entry) => eventFromDoc(entry.id, entry.data()))),
   () => setLiveEvents([]),
  );
 }, [isDemoMode]);

 const allEvents = useMemo(() => (isDemoMode ? mockEvents : (liveEvents ?? [])), [isDemoMode, mockEvents, liveEvents]);
 const [now] = useState(() => Date.now());

 const visibleEvents = useMemo(() => {
   let filtered = typeFilter === 'All' ? allEvents : allEvents.filter((e) => e.type === typeFilter);
   if (activeTab === 'My Events') filtered = filtered.filter((e) => registeredEvents.includes(e.id));
   if (activeTab === 'Bookmarked') filtered = filtered.filter((e) => bookmarkedEvents.includes(e.id));
   if (activeTab === 'Past') filtered = filtered.filter((e) => e.startsAt != null && e.startsAt < now);
   if (activeTab === 'Upcoming' && !isDemoMode) filtered = filtered.filter((e) => e.startsAt == null || e.startsAt >= now);
   return filtered;
  }, [allEvents, typeFilter, activeTab, registeredEvents, bookmarkedEvents, isDemoMode, now]);

 const featured = allEvents[0] ?? null;
 const typeCounts = useMemo(() => {
  const counts = new Map<Event['type'], number>();
  allEvents.forEach((event) => counts.set(event.type, (counts.get(event.type) ?? 0) + 1));
  return counts;
 }, [allEvents]);

 return (
  <PageShell
   sample={isDemoMode}
   title={t("Events", "Εκδηλώσεις")}
   description={t("Discover workshops, networking nights, and pitch events designed to accelerate your growth.", "Ανακάλυψε εργαστήρια, βραδιές δικτύωσης και εκδηλώσεις pitch που επιταχύνουν την ανάπτυξή σου.")}
   actions={
    <div className="flex flex-wrap items-center gap-2">
     <button 
      type="button"
      onClick={() => setShowTypes((open) => !open)}
      className="flex items-center gap-1.5 min-h-11 px-3 py-2 bg-white text-stone-600 rounded-xl text-sm font-medium hover:bg-stone-50 transition-all border border-stone-200"
     >
      <Filter className="w-3.5 h-3.5" /> {typeFilter === 'All' ? t('Filter', 'Φίλτρο') : labelOf(typeFilter)}
     </button>
     <button 
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'Schedule a new event on my calendar' } }))}
      className="flex items-center gap-1.5 min-h-11 px-3 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-all"
     >
      <Plus className="w-3.5 h-3.5" /> {t('Host Event', 'Διοργάνωση εκδήλωσης')}
     </button>
    </div>
   }
  >

   <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
    {/* Main Events List */}
    <div className="lg:col-span-8 space-y-4">
     <div className="scroll-tabs bg-stone-50 p-1 rounded-xl border border-stone-100">
      {['Upcoming', 'My Events', 'Past', 'Bookmarked'].map((tab) => (
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
        {t(tab, TAB_EL[tab])}
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
         {type === 'All' ? t('All', 'Όλα') : labelOf(type)}
        </button>
       ))}
      </div>
     )}

     <div id="event-list" className="space-y-4">
      {(visibleEvents.length === 0) && (
       <EmptyHint title={t("No events in this category yet.", "Δεν υπάρχουν ακόμη εκδηλώσεις σε αυτή την κατηγορία.")} detail={t("Ask the studio assistant to host one.", "Ζήτα από τον βοηθό να διοργανώσει μία.")}>
        {(typeFilter !== 'All' || activeTab !== 'Upcoming') && (
         <ClearFiltersButton onClick={() => { setTypeFilter('All'); setActiveTab('Upcoming'); setShowTypes(false); }} />
        )}
        <AskLink prompt="Schedule a new event on my calendar">{t('Ask assistant', 'Ρώτα τον βοηθό')}</AskLink>
       </EmptyHint>
      )}
      {visibleEvents.map((event) => (
       <div key={event.id} className="bg-white overflow-hidden group hover:shadow-md transition-all border border-stone-100 rounded-2xl">
        <div className="flex flex-col md:flex-row">
         <div className="md:w-56 h-44 md:h-auto overflow-hidden relative shrink-0">
          {event.image ? (
           <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            referrerPolicy="no-referrer"
           />
          ) : (
           <div className="w-full h-full bg-stone-100 flex items-center justify-center" aria-hidden>
            <CalendarIcon className="w-8 h-8 text-stone-300" />
           </div>
          )}
          <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-semibold tracking-wider shadow border border-white/20">
           {labelOf(event.type)}
          </div>
         </div>
         <div className="flex-1 p-5 flex flex-col justify-between gap-4">
          <div>
           <div className="flex items-start justify-between gap-3 mb-2">
            <div>
             <h3 className="text-base font-semibold text-stone-900 leading-snug">{t(event.title, event.titleEl ?? event.title)}</h3>
             <p className="text-xs text-stone-400 mt-0.5 tracking-wider">{t(`by ${event.organizer}`, `Διοργάνωση: ${event.organizer}`)}</p>
            </div>
            <div className="flex gap-1 shrink-0">
             <button type="button" aria-pressed={bookmarkedEvents.includes(event.id)} aria-label={bookmarkedEvents.includes(event.id) ? t("Remove saved event", "Αφαίρεση αποθηκευμένης εκδήλωσης") : t("Save event", "Αποθήκευση εκδήλωσης")} title={bookmarkedEvents.includes(event.id) ? t("Remove saved event", "Αφαίρεση αποθηκευμένης εκδήλωσης") : t("Save event", "Αποθήκευση εκδήλωσης")} onClick={() => toggleBookmark(event.id)} className={cn("p-1.5 hover:bg-stone-50 rounded-lg transition-all", bookmarkedEvents.includes(event.id) ? "text-stone-900" : "text-stone-300 hover:text-stone-700")}>
              <Bookmark className={cn("w-3.5 h-3.5", bookmarkedEvents.includes(event.id) && "fill-current")} />
             </button>
             <button
              type="button"
              aria-label={t('Add to my calendar', 'Προσθήκη στο ημερολόγιό μου')}
              title={event.startsAt ? t('Add to my calendar', 'Προσθήκη στο ημερολόγιό μου') : t('Nothing to export yet', 'Δεν υπάρχει τίποτα για εξαγωγή ακόμη')}
              disabled={!event.startsAt}
              onClick={() => exportEvent(event)}
              className="p-1.5 text-stone-300 hover:text-stone-700 hover:bg-stone-50 rounded-lg transition-all disabled:opacity-40"
             >
              <CalendarPlus className="w-3.5 h-3.5" />
             </button>
             <button type="button" aria-label={t("Copy event title", "Αντιγραφή τίτλου εκδήλωσης")} title={t("Copy event title", "Αντιγραφή τίτλου εκδήλωσης")} onClick={() => { void navigator.clipboard?.writeText(event.title); }} className="p-1.5 text-stone-300 hover:text-stone-700 hover:bg-stone-50 rounded-lg transition-all">
              <Share2 className="w-3.5 h-3.5" />
             </button>
            </div>
           </div>
           <p className="text-sm text-stone-500 leading-relaxed line-clamp-2">{t(event.description, event.descriptionEl ?? event.description)}</p>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-stone-500">
           <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-stone-400" />
            <span>{t(event.date, event.dateEl)}</span>
           </div>
           <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span>{t(event.time, event.timeEl)}</span>
           </div>
           <div className="flex items-center gap-1.5">
            {event.isOnline ? <Video className="w-3.5 h-3.5 text-stone-400" /> : <MapPin className="w-3.5 h-3.5 text-stone-400" />}
            <span className="truncate max-w-[140px]">{t(event.location, event.locationEl ?? event.location)}</span>
           </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-stone-50">
           {event.attendees > 0 ? (
            <span className="flex items-center gap-1.5 text-xs text-stone-400">
             <Users className="w-3.5 h-3.5" />
             {event.attendees} {t('going', 'θα πάνε')}
            </span>
           ) : (
            <span className="text-xs text-stone-300">{t('Be the first to register', 'Κάνε την πρώτη εγγραφή')}</span>
           )}
           <button
            onClick={() => toggleRegistration(event.id)}
            className={cn(
             "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
             registeredEvents.includes(event.id)
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-stone-900 text-white hover:bg-stone-800"
            )}
           >
            {registeredEvents.includes(event.id) ? t("✓ Registered", "✓ Εγγραφήκατε") : t("Register Now", "Εγγραφή")}
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
     {/* Featured Event — the next real event, or the demo pick in demo mode */}
     {featured && (
     <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
      <p className="text-xs font-semibold text-stone-400 tracking-wider mb-3">{t('Featured Event', 'Επιλεγμένη εκδήλωση')}</p>
      <div className="h-40 rounded-xl overflow-hidden relative group cursor-pointer mb-3">
       {featured.image ? (
        <img
         src={featured.image}
         alt={featured.title}
         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
         referrerPolicy="no-referrer"
        />
       ) : (
        <div className="w-full h-full bg-stone-900 flex items-center justify-center" aria-hidden>
         <CalendarIcon className="w-8 h-8 text-stone-600" />
        </div>
       )}
       <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 to-transparent"></div>
       <div className="absolute bottom-3 left-3 right-3">
        <span className="text-xs font-semibold text-white tracking-wider bg-amber-500 px-2 py-0.5 rounded mb-1 inline-block">{t('Recommended', 'Προτείνεται')}</span>
        <p className="text-white text-sm font-semibold leading-tight">{t(featured.title, featured.titleEl ?? featured.title)}</p>
       </div>
      </div>
      <p className="text-sm text-stone-500 leading-relaxed mb-3">
       {t(featured.description, featured.descriptionEl ?? featured.description)}
      </p>
      <button
       type="button"
       onClick={() => document.getElementById('event-list')?.scrollIntoView({ behavior: 'smooth' })}
       className="w-full py-2 rounded-lg text-sm font-medium text-stone-600 bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-all"
      >
       {t('Learn More', 'Περισσότερα')}
      </button>
     </div>
     )}

     {/* Categories */}
     <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
      <p className="text-xs font-semibold text-stone-400 tracking-wider mb-3">{t('Event Categories', 'Κατηγορίες εκδηλώσεων')}</p>
      <div className="space-y-1">
       {[
        { name: "Workshops", nameEl: "Εργαστήρια", type: 'Workshop' as const, icon: Rocket },
        { name: "Networking", nameEl: "Δικτύωση", type: 'Networking' as const, icon: Users },
        { name: "Pitch Nights", nameEl: "Βραδιές pitch", type: 'Pitch Night' as const, icon: Zap },
        { name: "Webinars", nameEl: "Διαδικτυακά σεμινάρια", type: 'Webinar' as const, icon: Video },
        { name: "Conferences", nameEl: "Συνέδρια", type: 'Conference' as const, icon: Globe }
       ].map((cat) => (
        <button key={cat.name} type="button" onClick={() => { setTypeFilter(cat.type); setShowTypes(true); document.getElementById('event-list')?.scrollIntoView({ behavior: 'smooth' }); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-stone-50 transition-all group">
         <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-stone-50 flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all">
           <cat.icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-medium text-stone-600 group-hover:text-stone-900 transition-colors">{t(cat.name, cat.nameEl)}</span>
         </div>
         <span className="text-xs font-semibold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{typeCounts.get(cat.type) ?? 0}</span>
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
       <p className="text-sm font-semibold text-stone-900">{t('Host Your Own Event', 'Διοργάνωσε τη δική σου εκδήλωση')}</p>
       <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
        {t('Share your expertise or host a networking session for the community.', 'Μοιράσου την εμπειρία σου ή διοργάνωσε μια συνάντηση δικτύωσης για την κοινότητα.')}
       </p>
      </div>
      <button
       type="button"
       onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'Schedule a new event on my calendar' } }))}
       className="w-full py-2 rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-all text-sm font-semibold"
      >
       {t('Create Event', 'Δημιουργία εκδήλωσης')}
      </button>
     </div>
    </aside>
   </div>
  </PageShell>
 );
}
