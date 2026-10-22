import { useState, useMemo, useEffect } from "react";
import {
 Plus,
 ChevronLeft, ChevronRight, MoreVertical,
 Bell, Search, Download, CalendarPlus
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageShell from "../components/ui/PageShell";
import FactLine from "../components/ui/FactLine";
import EmptyHint, { AskLink, ClearFiltersButton } from "../components/ui/EmptyHint";
import { cn } from "../lib/utils";
import { keys, readSessions, readValue, removeSession, writeValue } from "../lib/localLists";
import { usePageControls } from "../lib/pageControls";
import { useStored } from "../lib/useStored";
import { motion } from "framer-motion";
import { useT } from "../lib/language";
import { useAuth } from "../App";
import { labelOf } from "../lib/labels";
import { formatDate, formatTime, formatWeekRange, formatWhen } from "../lib/dates";
import { downloadIcs, slugify, type CalendarEntry } from "../lib/download";
import { useToast } from "../context/ToastContext";

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
 const t = useT();
 const { isDemoMode } = useAuth();
 const toast = useToast();
 const [currentDate, setCurrentDate] = useState(new Date());
 const [selectedDate, setSelectedDate] = useState(() => new Date());
 const [view, setView] = useState('Month');
 const [searchQuery, setSearchQuery] = useState('');
 const [openMenuId, setOpenMenuId] = useState<string | null>(null);
 const [dismissedStarterIds, setDismissedStarterIds] = useState<string[]>([]);
 const briefingEnabled = useStored(() => readValue<boolean>(keys.calendarBriefing, false), [keys.calendarBriefing]);

 useEffect(() => {
  if (!openMenuId) return;
  const handleClickOutside = () => setOpenMenuId(null);
  window.addEventListener('click', handleClickOutside);
  return () => window.removeEventListener('click', handleClickOutside);
 }, [openMenuId]);

 const ask = (prompt: string) => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt } }));

 const navigateCalendar = (delta: number) => {
  if (view === 'Month') {
   setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
   return;
  }
  const step = view === 'Week' ? delta * 7 : delta;
  setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + step));
 };

 const monthLabel = useMemo(() => {
  const locale = t("en-US", "el-GR");
  const formatted = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(currentDate);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
 }, [currentDate, t]);

 const viewLabel = (value: string) =>
  value === "Week" ? t("Week", "Εβδομάδα")
   : value === "Day" ? t("Day", "Ημέρα")
    : t("Month", "Μήνας");

 const clockOf = (time: string) => {
  if (/^\d{4}-\d{2}-\d{2}/.test(time) || time.endsWith("Z")) return formatWhen(time);
  return time;
 };
 const durationOf = (duration: string) => duration === "All Day" ? t("All Day", "Όλη την ημέρα") : duration;
 const peopleOf = (people?: string[]) => people?.map((person) => person === "120+ attendees" ? t("120+ attendees", "120+ συμμετέχοντες") : person);

 const today = useMemo(() => new Date(), []);
 const tomorrow = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1), [today]);

 const isSameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

 const parseEventDate = (timeStr: string): Date | null => {
  if (!timeStr) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(timeStr) || timeStr.endsWith("Z")) {
   const d = new Date(timeStr);
   return isNaN(d.getTime()) ? null : d;
  }
  return null;
 };

 const eventsOn = (date: Date) =>
  events.filter((e) => {
   const d = parseEventDate(e.time);
   return d ? isSameDay(d, date) : false;
  });

 const weekStart = useMemo(() => {
  const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
 }, [selectedDate]);

 const weekDates = useMemo(
  () => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)),
  [weekStart],
 );

 const chipClass = (type: Event["type"]) =>
  type === 'Meeting' ? "bg-blue-50 text-blue-700 border border-blue-200" :
  type === 'Deadline' ? "bg-red-50 text-red-700 border border-red-200" :
  type === 'Mentorship' ? "bg-purple-50 text-purple-700 border border-purple-200" :
  "bg-stone-900 text-white";

 const headerLabel =
  view === 'Month' ? monthLabel
  : view === 'Week' ? formatWeekRange(weekStart)
  : formatDate(selectedDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

 // An .ics entry per session — stable uid, real Date, duration parsed from "45m"/"2h"/"All Day".
 const entryFor = (event: Event): CalendarEntry | null => {
  const start = parseEventDate(event.time);
  if (!start) return null;
  const allDay = event.duration === 'All Day';
  const minutes = /^(\d+)\s*m/.exec(event.duration)?.[1];
  const hours = /^(\d+)\s*h/.exec(event.duration)?.[1];
  const end = allDay
   ? new Date(start.getTime() + 86_400_000)
   : minutes
     ? new Date(start.getTime() + Number(minutes) * 60_000)
     : hours
       ? new Date(start.getTime() + Number(hours) * 3_600_000)
       : undefined;
  return {
   uid: `session-${event.id}`,
   title: event.title,
   start,
   end,
   allDay,
   description: [event.description, event.participants?.join(', ')].filter(Boolean).join(' — ') || undefined,
   location: event.location,
  };
 };

 const exportSession = (event: Event) => {
  const entry = entryFor(event);
  if (!entry) return;
  downloadIcs(`${slugify(event.title)}.ics`, [entry]);
  toast.success(t('Calendar file downloaded', 'Το αρχείο ημερολογίου κατέβηκε'));
 };

 const exportAll = () => {
  if (!upcomingEntries.length) return;
  downloadIcs('cofounderbay-calendar.ics', upcomingEntries);
  toast.success(t('Calendar file downloaded', 'Το αρχείο ημερολογίου κατέβηκε'));
 };

 const starterEvents: Event[] = useMemo(() => {
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  return [
   {
    id: "1",
    title: "Co-founder Sync",
    type: 'Meeting',
    time: new Date(y, m, d, 10, 0).toISOString(),
    duration: "45m",
    location: "Google Meet",
    participants: ["Sarah Chen", "Alex Rivera"],
    priority: 'High'
   },
   {
    id: "2",
    title: "MVP Beta Deadline",
    type: 'Deadline',
    time: new Date(y, m, d, 23, 59).toISOString(),
    duration: "All Day",
    priority: 'High'
   },
   {
    id: "3",
    title: "Startup Networking Event",
    type: 'Event',
    time: new Date(y, m, d + 1, 18, 0).toISOString(),
    duration: "2h",
    location: "Tech Hub, London",
    participants: ["120+ attendees"],
    priority: 'Medium'
   },
   {
    id: "4",
    title: "Mentorship Session",
    type: 'Mentorship',
    time: new Date(y, m, d + 1, 14, 0).toISOString(),
    duration: "1h",
    location: "Zoom",
    participants: ["David Miller"],
    priority: 'Medium'
   }
  ];
 }, [today]);

 const storedSessions = useStored(readSessions, [keys.sessions]);
 const events: Event[] = [
  ...storedSessions,
  ...(isDemoMode ? starterEvents.filter((e) => !dismissedStarterIds.includes(e.id)) : [])
 ].filter((event) => {
  const q = searchQuery.trim().toLowerCase();
  return !q || event.title.toLowerCase().includes(q) || event.type.toLowerCase().includes(q);
 });

 const handleDeleteEvent = (id: string) => {
  removeSession(id);
  setDismissedStarterIds((prev) => [...prev, id]);
 };

 const tomorrowEventsCount = useMemo(() => {
  return events.filter((e) => {
   const d = parseEventDate(e.time);
   return d ? isSameDay(d, tomorrow) : false;
  }).length;
 }, [events, tomorrow]);

 const dayEvents = useMemo(
  () => eventsOn(selectedDate).sort((a, b) => (parseEventDate(a.time)?.getTime() ?? 0) - (parseEventDate(b.time)?.getTime() ?? 0)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [selectedDate, events],
 );

 const upcomingEntries = useMemo(
  () => events
   .filter((event) => {
    const d = parseEventDate(event.time);
    return d ? d.getTime() >= new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() : false;
   })
   .map(entryFor)
   .filter((entry): entry is CalendarEntry => entry !== null),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [events, today],
 );

 const toggleBriefing = () => {
  writeValue(keys.calendarBriefing, !briefingEnabled);
 };

 usePageControls(() => [
  { id: 'new-session', en: 'New session', el: 'Νέα συνάντηση', run: () => ask('schedule a session') },
  { id: 'toggle-briefing', en: briefingEnabled ? 'Disable briefing' : 'Enable briefing', el: briefingEnabled ? 'Απενεργοποίηση ενημέρωσης' : 'Ενεργοποίηση ενημέρωσης', run: toggleBriefing },
  { id: 'export-ics', en: 'Export calendar (.ics)', el: 'Εξαγωγή ημερολογίου (.ics)', run: exportAll },
 ], [briefingEnabled, upcomingEntries.length]);

 const calendarCells = useMemo(() => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
   if (i < firstDayIndex) {
    const dayNum = daysInPrevMonth - firstDayIndex + i + 1;
    const date = new Date(year, month - 1, dayNum);
    cells.push({ dayNum, date, isCurrentMonth: false });
   } else if (i < firstDayIndex + daysInMonth) {
    const dayNum = i - firstDayIndex + 1;
    const date = new Date(year, month, dayNum);
    cells.push({ dayNum, date, isCurrentMonth: true });
   } else {
    const dayNum = i - firstDayIndex - daysInMonth + 1;
    const date = new Date(year, month + 1, dayNum);
    cells.push({ dayNum, date, isCurrentMonth: false });
   }
  }
  return cells;
 }, [currentDate]);

 const weekDays = [
  t("Sun", "Κυρ"),
  t("Mon", "Δευ"),
  t("Tue", "Τρί"),
  t("Wed", "Τετ"),
  t("Thu", "Πέμ"),
  t("Fri", "Παρ"),
  t("Sat", "Σάβ"),
 ];

 return (
  <PageShell
   sample={isDemoMode}
   title={t("Schedule", "Πρόγραμμα")}
   description={t("Manage meetings, track deadlines, and stay aligned with your objectives.", "Διαχειρίσου συναντήσεις και προθεσμίες και μείνε σε ευθυγράμμιση με τους στόχους σου.")}
   actions={
    <div className="flex items-center gap-2 flex-wrap">
     <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400" />
      <input
       type="text"
       value={searchQuery}
       onChange={(e) => setSearchQuery(e.target.value)}
       placeholder={t("Search…", "Αναζήτηση…")}
       className="pl-8 pr-3 py-1.5 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-400 w-36 transition-all"
      />
     </div>
     <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!upcomingEntries.length}
      title={upcomingEntries.length ? t("Export upcoming sessions (.ics)", "Εξαγωγή προσεχών συναντήσεων (.ics)") : t("Nothing to export yet", "Δεν υπάρχει τίποτα για εξαγωγή ακόμη")}
      onClick={exportAll}
      className="h-8 px-3 rounded-lg border-stone-200 text-sm whitespace-nowrap"
     >
      <Download className="w-3.5 h-3.5 mr-1.5" /> {t("Export .ics", "Εξαγωγή .ics")}
     </Button>
     <Button type="button" onClick={() => ask('Schedule a meeting on my calendar')} className="h-8 px-3 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-sm">
      <Plus className="w-3.5 h-3.5 mr-1.5" /> {t("Schedule", "Προγραμματισμός")}
     </Button>
    </div>
   }
  >
   <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
    {/* Main Calendar Grid */}
    <div className="lg:col-span-8">
     <Card noPadding className="rounded-2xl border-stone-100 overflow-hidden bg-white">
      <div className="px-3 py-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:px-5">
       <div className="flex items-center gap-3">
        <h3 className="text-base font-semibold text-stone-900">{headerLabel}</h3>
        <div className="flex items-center gap-1">
         <Button type="button" variant="ghost" size="icon" aria-label={t("Previous", "Προηγούμενο")} className="rounded-lg border border-stone-100 hover:bg-stone-50" onClick={() => navigateCalendar(-1)}>
          <ChevronLeft className="w-4 h-4" />
         </Button>
         <Button variant="ghost" size="icon" aria-label={t("Next", "Επόμενο")} className="rounded-lg border border-stone-100 hover:bg-stone-50" onClick={() => navigateCalendar(1)}>
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
           view === v
            ? "bg-white text-stone-900 shadow-sm border border-stone-200"
            : "text-stone-400 hover:text-stone-600"
          )}
         >
          {viewLabel(v)}
         </button>
        ))}
       </div>
      </div>

      <div className="p-2 sm:p-4">
       {view !== 'Day' && (
        <div className="grid grid-cols-7 mb-2">
         {weekDays.map((day, i) => (
          <div key={day} className="text-center text-xs font-semibold text-stone-400 py-2">
           <span className="sm:hidden">{view === 'Week' ? `${day.slice(0, 1)} ${weekDates[i]?.getDate() ?? ''}` : day.slice(0, 1)}</span>
           <span className="hidden sm:inline">{view === 'Week' ? `${day} ` : ''}
            {view === 'Week' && weekDates[i] && isSameDay(weekDates[i], today) ? (
             <span className="inline-flex w-4 h-4 rounded-full bg-stone-900 text-white items-center justify-center text-[10px] align-middle">{weekDates[i]?.getDate() ?? ''}</span>
            ) : view === 'Week' ? (weekDates[i]?.getDate() ?? '') : day}
           </span>
          </div>
         ))}
        </div>
       )}

       {view === 'Month' && (
        <div className="grid grid-cols-7 gap-px bg-stone-100 border border-stone-100 rounded-xl overflow-hidden">
         {calendarCells.map((cell, i) => {
          const isToday = isSameDay(cell.date, today);
          const isSelected = isSameDay(cell.date, selectedDate);
          const cellEvents = eventsOn(cell.date);
          const dayNum = cell.dayNum;
          const isCurrentMonth = cell.isCurrentMonth;

          return (
           <div
            key={i}
            onClick={() => setSelectedDate(cell.date)}
            className={cn(
             "min-h-14 h-16 sm:h-20 lg:h-28 bg-white p-1 sm:p-2 transition-all hover:bg-stone-50 cursor-pointer group relative",
             !isCurrentMonth && "bg-stone-50/60",
             isSelected && "ring-1 ring-inset ring-stone-300"
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

            {cellEvents.length > 0 && (
             <div className="mt-1 space-y-0.5 relative z-10">
              {cellEvents.slice(0, 2).map((ev) => (
               <div
                key={ev.id}
                title={ev.title}
                className={cn("text-xs font-medium px-1.5 py-0.5 rounded-md truncate", chipClass(ev.type))}
               >
                {ev.title}
               </div>
              ))}
              {cellEvents.length > 2 && (
               <div className="text-xs text-stone-400 font-medium pl-1">
                +{cellEvents.length - 2} {t("more", "ακόμη")}
               </div>
              )}
             </div>
            )}

            <button type="button" aria-label={t("Schedule", "Προγραμματισμός")} className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-all w-6 h-6 bg-white border border-stone-200 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-900" onClick={(e) => { e.stopPropagation(); ask(`Schedule an event on ${cell.date.toLocaleDateString()}`); }}>
             <Plus className="w-3 h-3" />
            </button>
           </div>
          );
         })}
        </div>
       )}

       {view === 'Week' && (
        <div className="grid grid-cols-7 gap-px bg-stone-100 border border-stone-100 rounded-xl overflow-hidden">
         {weekDates.map((date) => {
          const dayItems = eventsOn(date);
          return (
           <div
            key={date.toISOString()}
            onClick={() => setSelectedDate(date)}
            className={cn(
             "min-h-32 bg-white p-1.5 sm:p-2 cursor-pointer transition-all hover:bg-stone-50",
             isSameDay(date, selectedDate) && "ring-1 ring-inset ring-stone-300"
            )}
           >
            <div className="mt-1 space-y-1">
             {dayItems.map((ev) => {
              const d = parseEventDate(ev.time);
              return (
               <div
                key={ev.id}
                title={ev.title}
                className={cn("text-xs font-medium px-1.5 py-0.5 rounded-md truncate", chipClass(ev.type))}
               >
                {d && ev.duration !== 'All Day' ? `${formatTime(d)} ` : ''}{ev.title}
               </div>
              );
             })}
            </div>
           </div>
          );
         })}
        </div>
       )}

       {view === 'Day' && (
        <div className="space-y-2">
         {dayEvents.length === 0 ? (
          <EmptyHint
           title={t("Nothing scheduled for this day.", "Δεν υπάρχει τίποτα προγραμματισμένο για αυτή την ημέρα.")}
           detail={t("Ask the studio assistant to add a session.", "Ρώτα τον βοηθό να προσθέσει μια συνάντηση.")}
          >
           <AskLink prompt="schedule a session" />
          </EmptyHint>
         ) : (
          dayEvents.map((ev) => {
           const d = parseEventDate(ev.time);
           return (
            <div key={ev.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
             <span className={cn("w-2 h-2 rounded-full shrink-0",
              ev.type === 'Meeting' ? "bg-blue-500" :
              ev.type === 'Deadline' ? "bg-red-500" :
              ev.type === 'Mentorship' ? "bg-purple-500" :
              "bg-emerald-500"
             )} />
             <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-900 break-words">{ev.title}</p>
              <p className="text-xs text-stone-400">
               {d ? (ev.duration === 'All Day' ? t("All Day", "Όλη την ημέρα") : `${formatTime(d)} · ${ev.duration}`) : ev.time}
               {' · '}{labelOf(ev.type)}
               {ev.location ? ` · ${ev.location}` : ''}
              </p>
             </div>
             <button
              type="button"
              aria-label={t("Add to my calendar", "Προσθήκη στο ημερολόγιό μου")}
              title={t("Add to my calendar", "Προσθήκη στο ημερολόγιό μου")}
              onClick={() => exportSession(ev)}
              className="p-1.5 text-stone-400 hover:text-stone-900 rounded-lg transition-colors"
             >
              <CalendarPlus className="w-4 h-4" />
             </button>
            </div>
           );
          })
         )}
        </div>
       )}
      </div>
     </Card>
    </div>

    {/* Upcoming Events Sidebar */}
    <div className="lg:col-span-4 space-y-4">
     <Card className="rounded-2xl border-stone-100 p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
       <div>
        <h4 className="text-sm font-semibold text-stone-900">{t("Upcoming Today", "Σημερινό πρόγραμμα")}</h4>
        <p className="text-xs text-stone-400 mt-0.5">{formatDate(today, { weekday: "long", month: "long", day: "numeric" })}</p>
       </div>
       <Button type="button" variant="outline" className="h-7 px-3 text-sm rounded-lg border-stone-200" onClick={() => ask('what events are coming')}>
        {t("Full Agenda", "Πλήρες πρόγραμμα")}
       </Button>
      </div>
      <div className="space-y-2">
       {events.length === 0 && (
        <EmptyHint title={t("No events match this search.", "Δεν υπάρχουν εκδηλώσεις για αυτή την αναζήτηση.")} detail={t("Ask the studio assistant to schedule one, or clear the search.", "Ρώτα τον βοηθό να προγραμματίσει μία, ή καθάρισε την αναζήτηση.")}>
         {searchQuery ? <ClearFiltersButton onClick={() => setSearchQuery('')}>{t('Clear search', 'Καθάρισε την αναζήτηση')}</ClearFiltersButton> : null}
         <AskLink prompt="Schedule a meeting on my calendar" />
        </EmptyHint>
       )}
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
           <span className="text-xs font-semibold text-stone-400 tracking-wider">{labelOf(event.type)}</span>
          </div>
          <div className="relative flex items-center gap-0.5">
           <button
            type="button"
            aria-label={t("Add to my calendar", "Προσθήκη στο ημερολόγιό μου")}
            title={t("Add to my calendar", "Προσθήκη στο ημερολόγιό μου")}
            onClick={(e) => {
             e.stopPropagation();
             exportSession(event);
            }}
            className="text-stone-400 hover:text-stone-900 transition-colors p-0.5 rounded"
           >
            <CalendarPlus className="w-3.5 h-3.5" />
           </button>
           <button
            type="button"
            aria-label={t("More", "Περισσότερα")}
            onClick={(e) => {
             e.stopPropagation();
             setOpenMenuId(openMenuId === event.id ? null : event.id);
            }}
            className="text-stone-400 hover:text-stone-900 transition-colors p-0.5 rounded"
           >
            <MoreVertical className="w-3.5 h-3.5" />
           </button>
           {openMenuId === event.id && (
            <div className="absolute right-0 top-6 z-20 w-44 bg-white rounded-xl shadow-lg border border-stone-100 py-1 text-xs">
             <button
              type="button"
              className="w-full text-left px-3 py-1.5 hover:bg-stone-50 text-stone-700 flex items-center gap-1.5"
              onClick={(e) => {
               e.stopPropagation();
               setOpenMenuId(null);
               ask(`Reschedule ${event.title}`);
              }}
             >
              {t("Reschedule", "Επαναπρογραμματισμός")}
             </button>
             <button
              type="button"
              className="w-full text-left px-3 py-1.5 hover:bg-stone-50 text-stone-700 flex items-center gap-1.5"
              onClick={(e) => {
               e.stopPropagation();
               setOpenMenuId(null);
               ask(`Tell me more about ${event.title}`);
              }}
             >
              {t("Event Details", "Λεπτομέρειες εκδήλωσης")}
             </button>
             <button
              type="button"
              className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-1.5"
              onClick={(e) => {
               e.stopPropagation();
               setOpenMenuId(null);
               handleDeleteEvent(event.id);
              }}
             >
              {t("Delete Event", "Διαγραφή εκδήλωσης")}
             </button>
            </div>
           )}
          </div>
         </div>

         <h4 className="text-sm font-semibold text-stone-900 mb-2 leading-tight">{event.title}</h4>
         <FactLine items={[clockOf(event.time), durationOf(event.duration), event.location, peopleOf(event.participants)?.join(', ')]} label={t("When and where", "Πότε και πού")} />
        </motion.div>
       ))}
      </div>
     </Card>

     {/* Event Reminders — light version */}
     <Card noPadding className="studio-nudge rounded-2xl border-stone-100 bg-amber-50 border-amber-100">
      <div className="flex gap-3 items-start">
       <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-amber-500 border border-amber-100 shrink-0">
        <Bell className="w-4 h-4" />
       </div>
       <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-stone-900 mb-1">{t("Event Reminders", "Υπενθυμίσεις εκδηλώσεων")}</h4>
        <p className="text-xs text-stone-500 leading-relaxed mb-3">
         {tomorrowEventsCount === 1
          ? t("1 event scheduled for tomorrow. Enable morning briefings?", "1 εκδήλωση είναι προγραμματισμένη για αύριο. Να ενεργοποιηθούν οι πρωινές ενημερώσεις;")
          : t(`${tomorrowEventsCount} events scheduled for tomorrow. Enable morning briefings?`, `${tomorrowEventsCount} εκδηλώσεις είναι προγραμματισμένες για αύριο. Να ενεργοποιηθούν οι πρωινές ενημερώσεις;`)}
        </p>
        <Button type="button" onClick={toggleBriefing} className="w-full h-7 rounded-lg bg-stone-900 text-white hover:bg-stone-800 text-sm">
         {briefingEnabled ? t("Briefing Enabled ✓", "Ενημέρωση ενεργή ✓") : t("Enable Briefing", "Ενεργοποίηση ενημέρωσης")}
        </Button>
       </div>
      </div>
     </Card>
    </div>
   </div>
  </PageShell>
 );
}
