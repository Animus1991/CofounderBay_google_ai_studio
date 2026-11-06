import {
 useEffect,
 useMemo,
 useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageShell from "../components/ui/PageShell";
import FactLine from "../components/ui/FactLine";
import EmptyHint,
 { AskLink,
 ClearFiltersButton } from "../components/ui/EmptyHint";
import { 
 Rocket,
 Star,
 Users,
 Target,
 TrendingUp,
 Award,
 DollarSign,
 Share2,
 ClipboardList,
 Trash2
} from "lucide-react";
import Card from "../components/ui/Card";
import CoverImage from "../components/ui/CoverImage";
import Button from "../components/ui/Button";
import { cn } from "../lib/utils";
import { SEGMENT_TRACK, segmentItem } from "../lib/segmented";
import { User } from "../types";
import { motion } from "framer-motion";
import { useT } from "../lib/language";
import { labelOf } from "../lib/labels";
import { formatDate } from "../lib/dates";
import { useAuth } from "../App";
import { usePageControls } from "../lib/pageControls";
import { onCatalog, str, strList, toMillis } from "../lib/catalog";
import { keys, readIds, readTracked, toggleId, untrackApplication, writeTracked, type TrackedApplication } from "../lib/localLists";
import { useStored } from "../lib/useStored";
import { coverFor } from "../data/photos";
import { askAssistant } from "../lib/assistantBus";
import { DEMO_PROGRAM_DEADLINES } from "../data/demoCatalog";
import { absoluteUrl, shareLink } from "../lib/download";
import { useToast } from "../context/ToastContext";

const TAB_EL: Record<string, string> = {
 All: 'Όλα',
 Accelerators: 'Επιταχυντές',
 Grants: 'Επιχορηγήσεις',
 Bootcamps: 'Εντατικά προγράμματα',
 Mine: 'Τα δικά μου',
};

/** An ISO date `days` from today, so demo deadlines stay in the future. */
function ahead(days: number): string {
 const d = new Date();
 d.setDate(d.getDate() + days);
 return d.toISOString();
}

const PROGRAM_TITLE_EL: Record<string, string> = {
 "1": "Επιταχυντής FinTech Q3 2026",
 "2": "Επιχορήγηση Καινοτομίας CleanTech",
 "3": "Bootcamp Ανάπτυξης SaaS",
};

const PROGRAM_DESC_EL: Record<string, string> = {
 "1": "Εντατικό πρόγραμμα 3 μηνών για fintech startups σε πρώιμο στάδιο. Περιλαμβάνει χρηματοδότηση $120k και καθοδήγηση από κορυφαίους ειδικούς του κλάδου.",
 "2": "Χρηματοδότηση χωρίς αραίωση μετοχών για startups με καινοτόμες λύσεις καθαρής ενέργειας. Έμφαση στην κλιμάκωση και τον αντίκτυπο.",
 "3": "Εντατικό πρόγραμμα 4 εβδομάδων για κλιμάκωση του SaaS προϊόντος σου, βελτιστοποίηση απόκτησης χρηστών και καλύτερη διατήρηση.",
};

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
 /** Deadline in millis when known — drives the "open only" filter. */
 deadlineAt: number | null;
 focus: string[];
 image: string;
 organizer: string;
}

function programFromDoc(doc: { id: string } & Record<string, unknown>): Program {
 const deadline = toMillis(doc.deadline);
 return {
  id: doc.id,
  title: str(doc.title, 'Program'),
  description: str(doc.description),
  type: (['Accelerator', 'Incubator', 'Grant', 'Bootcamp'] as const).includes(doc.type as Program['type']) ? doc.type as Program['type'] : 'Accelerator',
  funding: str(doc.funding, 'N/A'),
  duration: str(doc.duration, 'N/A'),
  deadline: deadline ? formatDate(new Date(deadline)) : str(doc.deadline, 'N/A'),
  deadlineAt: deadline,
  focus: strList(doc.focus),
  image: str(doc.image ?? doc.imageUrl),
  organizer: str(doc.organizer ?? doc.organizerName, 'CoFounderBay'),
 };
}

export default function Programs({ user: _user }: ProgramsProps) {
 const t = useT();
 const navigate = useNavigate();
 const { isDemoMode } = useAuth();
 const { toast: toastWithAction } = useToast();
 const [activeTab, setActiveTab] = useState('All');
 const [openOnly, setOpenOnly] = useState(false);
 const [highlighted, setHighlighted] = useState<string | null>(null);
 // ?program= deep-links a card: share links and assistant navigation land on
 // it highlighted instead of the top of the list (parity: /programs/:id).
 const [params] = useSearchParams();
 const requestedProgram = params.get('program');
 usePageControls(() => [
  { id: 'tab-all', en: 'All programs', el: 'Όλα τα προγράμματα', run: () => setActiveTab('All') },
  { id: 'tab-accelerators', en: 'Accelerators', el: 'Επιταχυντές', run: () => setActiveTab('Accelerators') },
  { id: 'tab-grants', en: 'Grants', el: 'Επιχορηγήσεις', run: () => setActiveTab('Grants') },
  { id: 'tab-mine', en: 'My applications', el: 'Τα δικά μου', run: () => setActiveTab('Mine') },
  { id: 'open-only', en: 'Show open programs only', el: 'Μόνο ανοιχτά προγράμματα', run: () => { setActiveTab('All'); setOpenOnly(true); } },
  { id: 'find-programs', en: 'Find programs', el: 'Εύρεση προγραμμάτων', run: () => askAssistant('What programs can I apply to?') },
 ], []);
 const savedPrograms = useStored(() => readIds(keys.savedPrograms), [keys.savedPrograms]);
 const tracked = useStored(() => readTracked(), [keys.tracked]);

 const mockPrograms: Program[] = useMemo(() => [
  {
   id: "1",
   title: "FinTech Accelerator Q3 2026",
   description: "A 3-month intensive program for early-stage fintech startups. Includes $120k funding and mentorship from top industry experts.",
   type: 'Accelerator',
   funding: "$120,000",
   duration: "12 Weeks",
   deadline: ahead(DEMO_PROGRAM_DEADLINES["FinTech Accelerator Q3 2026"] ?? 14),
   deadlineAt: Date.parse(ahead(DEMO_PROGRAM_DEADLINES["FinTech Accelerator Q3 2026"] ?? 14)),
   focus: ["FinTech", "Blockchain", "SaaS"],
   image: coverFor("prog-1", ["FinTech Accelerator Q3 2026", 'Accelerator', "FinTech"], 800, 400),
   organizer: "Finly Ventures"
  },
  {
   id: "2",
   title: "CleanTech Innovation Grant",
   description: "Non-dilutive funding for startups working on breakthrough clean energy solutions. Focus on scalability and impact.",
   type: 'Grant',
   funding: "$50,000",
   duration: "N/A",
   deadline: ahead(DEMO_PROGRAM_DEADLINES["CleanTech Innovation Grant"] ?? 30),
   deadlineAt: Date.parse(ahead(DEMO_PROGRAM_DEADLINES["CleanTech Innovation Grant"] ?? 30)),
   focus: ["CleanTech", "Energy", "Sustainability"],
   image: coverFor("prog-2", ["CleanTech Innovation Grant", 'Grant', "CleanTech", "Energy"], 800, 400),
   organizer: "Green Earth Foundation"
  },
  {
   id: "3",
   title: "SaaS Growth Bootcamp",
   description: "Intensive 4-week program focused on scaling your SaaS product, optimizing user acquisition, and improving retention.",
   type: 'Bootcamp',
   funding: "N/A",
   duration: "4 Weeks",
   deadline: ahead(DEMO_PROGRAM_DEADLINES["SaaS Growth Bootcamp"] ?? 45),
   deadlineAt: Date.parse(ahead(DEMO_PROGRAM_DEADLINES["SaaS Growth Bootcamp"] ?? 45)),
   focus: ["SaaS", "Growth", "Marketing"],
   image: coverFor("prog-3", ["SaaS Growth Bootcamp", 'Bootcamp', "SaaS", "Growth"], 800, 400),
   organizer: "Founders Academy"
  }
 ], []);

 // Real accounts see programs published by the platform; demo keeps the samples.
 const [livePrograms, setLivePrograms] = useState<Program[] | null>(null);
 useEffect(() => {
  if (isDemoMode) { setLivePrograms(null); return; }
  return onCatalog('programs', (docs) => setLivePrograms(docs.map(programFromDoc)), () => setLivePrograms([]));
 }, [isDemoMode]);

 const programs = useMemo(() => (isDemoMode ? mockPrograms : (livePrograms ?? [])), [isDemoMode, mockPrograms, livePrograms]);
 // "Open only" keeps rolling programs (no deadline) and anything whose
 // deadline has not passed yet — parity: the sibling's status filter.
 const isOpen = (p: Program) => p.deadlineAt == null || p.deadlineAt >= Date.now();
 const visiblePrograms = programs.filter((program) => {
  if (activeTab === 'Mine') return false; // Mine lists the tracked applications, not the catalog.
  if (openOnly && !isOpen(program)) return false;
  if (activeTab === 'All') return true;
  if (activeTab === 'Accelerators') return program.type === 'Accelerator';
  if (activeTab === 'Grants') return program.type === 'Grant';
  if (activeTab === 'Bootcamps') return program.type === 'Bootcamp';
  return true;
 });

 // ?program= once the list is known: clear the filters, highlight the card
 // and scroll it into view — the same shared link anyone can paste.
 useEffect(() => {
  if (!requestedProgram) return;
  if (!programs.some((program) => program.id === requestedProgram)) return;
  setActiveTab('All');
  setOpenOnly(false);
  setHighlighted(requestedProgram);
  requestAnimationFrame(() => document.getElementById(`program-${requestedProgram}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  const clear = window.setTimeout(() => setHighlighted((current) => (current === requestedProgram ? null : current)), 2400);
  return () => window.clearTimeout(clear);
 }, [programs, requestedProgram]);

 // Share copies the program's own link (parity: the sibling shares /programs/:id).
 const shareProgram = async (program: Program) => {
  const title = t(program.title, PROGRAM_TITLE_EL[program.id] ?? program.title);
  const details = `${title} — ${t(`by ${program.organizer}`, `Διοργάνωση: ${program.organizer}`)} — ${t('Deadline', 'Προθεσμία')}: ${program.deadline}`;
  const result = await shareLink({ title, text: details, url: absoluteUrl(`/programs?program=${encodeURIComponent(program.id)}`) });
  if (result === 'copied') toastWithAction({ type: 'success', title: t('Program link copied', 'Ο σύνδεσμος του προγράμματος αντιγράφηκε') });
  else if (result === 'failed') toastWithAction({ type: 'error', title: t('Copy did not work in this browser', 'Η αντιγραφή δεν λειτούργησε σε αυτόν τον περιηγητή') });
 };

 // Removing a tracked application writes the same list Fundraising and
 // Founder Tools read; Undo restores the snapshot exactly.
 const removeTracked = (item: TrackedApplication) => {
  const before = readTracked();
  untrackApplication(item.program);
  toastWithAction({
   type: 'info',
   title: t(`${item.program} removed`, `Αφαίρεση: ${item.program}`),
   duration: 8000,
   action: { label: t('Undo', 'Αναίρεση'), run: () => writeTracked(before) },
  });
 };

 // Honest sidebar stats for real accounts; the demo keeps its dressed-up numbers.
 const totalFunding = programs.reduce((sum, p) => {
  const parsed = parseFloat(String(p.funding).replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? sum + parsed : sum;
 }, 0);
 const ecosystemStats = isDemoMode
  ? [
   { label: t("Active Programs", "Ενεργά προγράμματα"), value: "24", icon: Rocket },
   { label: t("Total Funding", "Συνολική χρηματοδότηση"), value: "$2.4M", icon: DollarSign },
   { label: t("Applications", "Αιτήσεις"), value: "1.2k", icon: Users },
   { label: t("Success Rate", "Ποσοστό επιτυχίας"), value: "85%", icon: Target },
  ]
  : [
   { label: t("Active Programs", "Ενεργά προγράμματα"), value: String(programs.length), icon: Rocket },
   { label: t("Total Funding", "Συνολική χρηματοδότηση"), value: totalFunding > 0 ? `$${Math.round(totalFunding / 1000)}k` : '—', icon: DollarSign },
   { label: t("My Applications", "Οι αιτήσεις μου"), value: String(tracked.length), icon: Users },
   { label: t("Saved", "Αποθηκευμένα"), value: String(savedPrograms.length), icon: Target },
  ];

 return (
  <PageShell
   title={t("Programs", "Προγράμματα")}
   description={t('Accelerators and grants for your stage.', 'Επιταχυντές και επιχορηγήσεις για το στάδιό σου.')}
   actions={
    <Button
     type="button"
     variant="primary"
     className="h-8 rounded-xl px-4 text-sm bg-stone-900 hover:bg-stone-800 text-white"
     title={t('Ask the assistant which programs fit your stage and profile', 'Ρώτα τον βοηθό ποια προγράμματα ταιριάζουν στο στάδιο και το προφίλ σου')}
     onClick={() => askAssistant('What programs can I apply to?')}
    >
     {t('Find Programs', 'Εύρεση προγραμμάτων')}
    </Button>
   }
  >
   <div className="space-y-6">

   <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
    {/* Main Programs List */}
    <div className="lg:col-span-8 space-y-4">
     {/* Tab Switcher + open-only filter (sibling parity: type + status + mine) */}
     <div className={SEGMENT_TRACK}>
      {['All', 'Accelerators', 'Grants', 'Bootcamps', 'Mine'].map((tab) => (
       <button
        key={tab}
        type="button"
        aria-pressed={activeTab === tab}
        onClick={() => setActiveTab(tab)}
        className={cn("px-3 py-1.5 text-sm font-semibold rounded-lg transition-all",
         segmentItem(activeTab === tab)
        )}
       >
        {t(tab, TAB_EL[tab] ?? tab)}
        {tab === 'Mine' && tracked.length > 0 && <span className="ml-1.5 text-[10px] font-bold text-stone-400">{tracked.length}</span>}
       </button>
      ))}
      {activeTab !== 'Mine' && (
       <>
        <span className="w-px h-5 bg-stone-200 mx-1 shrink-0" aria-hidden="true" />
        <button
         type="button"
         aria-pressed={openOnly}
         onClick={() => setOpenOnly((v) => !v)}
         className={cn("px-3 py-1.5 text-sm font-semibold rounded-lg transition-all",
          segmentItem(openOnly)
         )}
        >
         {t('Open only', 'Μόνο ανοιχτά')}
        </button>
       </>
      )}
     </div>

     <div className="space-y-3">
      {activeTab === 'Mine' && (
       tracked.length === 0 ? (
        <EmptyHint title={t('No applications yet.', 'Καμία αίτηση ακόμα.')} detail={t('"Apply Now" on a program adds a draft to the same tracking list Fundraising and Founder Tools read.', 'Το «Κάνε αίτηση» σε ένα πρόγραμμα προσθέτει προσχέδιο στην ίδια λίστα παρακολούθησης που διαβάζουν η Χρηματοδότηση και τα Εργαλεία ιδρυτή.')}>
         <ClearFiltersButton onClick={() => setActiveTab('All')}>{t('Browse programs', 'Περιήγηση προγραμμάτων')}</ClearFiltersButton>
        </EmptyHint>
       ) : (
        tracked.map((item) => {
         const match = programs.find((p) => p.title.toLowerCase() === item.program.toLowerCase());
         return (
          <Card key={item.id} className="rounded-2xl border-stone-100 p-4" contentClassName="flex flex-wrap items-center gap-3">
           <div className="w-8 h-8 bg-stone-50 border border-stone-100 rounded-xl flex items-center justify-center shrink-0">
            <ClipboardList className="w-4 h-4 text-stone-400" />
           </div>
           <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-900 truncate">{t(item.program, PROGRAM_TITLE_EL[match?.id ?? ''] ?? item.program)}</p>
            <p className="text-xs text-stone-400">
             {item.type}
             {item.deadline && item.deadline !== '—' && <> · {t('Deadline', 'Προθεσμία')}: {item.deadline}</>}
             {item.decision && item.decision !== '—' && <> · {t('Decision', 'Απόφαση')}: {item.decision}</>}
            </p>
           </div>
           <span className="px-2 py-0.5 bg-stone-50 border border-stone-100 rounded-md text-[11px] font-semibold text-stone-500 capitalize shrink-0">{item.status}</span>
           <div className="flex items-center gap-1 shrink-0">
            {match && (
             <Button type="button" variant="ghost" className="h-7 rounded-lg px-3 text-xs" onClick={() => { setActiveTab('All'); setOpenOnly(false); setHighlighted(match.id); requestAnimationFrame(() => document.getElementById(`program-${match.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })); window.setTimeout(() => setHighlighted((c) => (c === match.id ? null : c)), 2400); }}>
              {t('Open', 'Άνοιγμα')}
             </Button>
            )}
            <button type="button" aria-label={t(`Remove ${item.program}`, `Αφαίρεση ${item.program}`)} onClick={() => removeTracked(item)} className="p-1.5 text-stone-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
             <Trash2 className="w-3.5 h-3.5" />
            </button>
           </div>
          </Card>
         );
        })
       )
      )}
      {activeTab !== 'Mine' && visiblePrograms.length === 0 && (
       <EmptyHint title={openOnly ? t('No open programs in this filter.', 'Δεν υπάρχουν ανοιχτά προγράμματα σε αυτό το φίλτρο.') : t(`No programs in the ${activeTab} filter.`, `Δεν υπάρχουν προγράμματα στο φίλτρο «${TAB_EL[activeTab] ?? activeTab}».`)} detail={t("Ask the assistant which programs you can apply to, or switch the tab.", "Ρώτα τον βοηθό για ποια προγράμματα μπορείς να κάνεις αίτηση, ή άλλαξε καρτέλα.")}>
        {(activeTab !== 'All' || openOnly) && <ClearFiltersButton onClick={() => { setActiveTab('All'); setOpenOnly(false); }} />}
        <AskLink prompt="What programs can I apply to?" />
       </EmptyHint>
      )}
      {activeTab !== 'Mine' && visiblePrograms.map((program, idx) => (
       <motion.div
        key={program.id}
        id={`program-${program.id}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.1 }}
        className="scroll-mt-24"
       >
        <Card noPadding className={cn("overflow-hidden group hover:border-stone-300 hover:shadow-md transition-all border-stone-100 rounded-2xl", highlighted === program.id && "ring-2 ring-stone-900/60 border-stone-300")}>
         <div className="flex flex-col md:flex-row">
          <div className="md:w-48 h-40 md:h-auto overflow-hidden relative shrink-0">
           <CoverImage src={program.image} alt="" icon={Rocket} className="h-full w-full" imgClassName="group-hover:scale-105 transition-transform duration-200" />
           <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-white/95 backdrop-blur-sm rounded-md text-xs font-semibold border border-stone-100 shadow-sm">
            {labelOf(program.type)}
           </div>
          </div>
          <div className="flex-1 p-4 space-y-3">
           <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
             <h3 className="text-sm font-semibold text-stone-900 leading-snug">{t(program.title, PROGRAM_TITLE_EL[program.id] ?? program.title)}</h3>
             <p className="text-xs text-stone-400">{t(`by ${program.organizer}`, `Διοργάνωση: ${program.organizer}`)}</p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
             <button
              type="button"
              aria-label={t('Share program', 'Κοινοποίηση προγράμματος')}
              title={t('Copy the program link', 'Αντιγραφή συνδέσμου προγράμματος')}
              onClick={() => { void shareProgram(program); }}
              className="p-1 text-stone-300 hover:text-stone-700 hover:bg-stone-50 rounded-lg transition-all"
             >
              <Share2 className="w-3.5 h-3.5" />
             </button>
             <button
              type="button"
              aria-label={t('Save program', 'Αποθήκευση προγράμματος')}
              onClick={() => toggleId(keys.savedPrograms, program.id)}
              className={cn("p-1 transition-colors", savedPrograms.includes(program.id) ? "text-amber-500" : "text-stone-300 hover:text-amber-500")}
             >
              <Star className={cn("w-3.5 h-3.5", savedPrograms.includes(program.id) && "fill-amber-500")} />
             </button>
            </div>
           </div>
           <p className="text-sm text-stone-500 leading-relaxed line-clamp-2">{t(program.description, PROGRAM_DESC_EL[program.id] ?? program.description)}</p>
           <FactLine items={[program.funding, program.duration === 'N/A' ? 'N/A' : t(program.duration, program.duration.replace('Weeks', 'εβδομάδες')), formatDate(program.deadline), ...program.focus.slice(0, 2)]} label={t('Program facts', 'Στοιχεία προγράμματος')} />
           <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="primary" className="h-7 rounded-lg px-4 text-sm bg-stone-900 hover:bg-stone-800 text-white whitespace-nowrap shrink-0" onClick={() => askAssistant(`Apply to ${program.title}`)}>
             {t('Apply Now', 'Κάνε αίτηση')}
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
     {/* The "Program Finder" card repeated the header's "Find programs" button (same assistant question,
         same words) — one entry point, at the top, is enough. */}
     <Card className="rounded-2xl border-stone-100 p-4" contentClassName="space-y-3">
      <div className="flex items-center justify-between">
       <h4 className="text-sm font-semibold text-stone-900">{t('Ecosystem Stats', 'Στατιστικά οικοσυστήματος')}</h4>
       <TrendingUp className="w-3.5 h-3.5 text-stone-400" />
      </div>
      <div className="grid grid-cols-2 gap-2">
       {ecosystemStats.map((stat, idx) => (
        <div key={idx} className="p-2.5 bg-stone-50 border border-stone-100 rounded-xl space-y-1">
         <div className="flex items-center gap-1 text-xs text-stone-400">
          <stat.icon className="w-2.5 h-2.5" />{stat.label}
         </div>
         <p className="text-base font-semibold text-stone-900">{stat.value}</p>
        </div>
       ))}
      </div>
     </Card>

     {/* Premium — light amber instead of dark */}
     <div className="studio-nudge bg-amber-50 border border-amber-100 rounded-2xl space-y-3">
      <div className="w-8 h-8 bg-white border border-amber-100 rounded-xl flex items-center justify-center">
       <Award className="w-4 h-4 text-amber-600" />
      </div>
      <div>
       <h4 className="text-sm font-semibold text-stone-900">{t('Premium Opportunities', 'Προνομιακές ευκαιρίες')}</h4>
       <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
        {t('Upgrade to Pro for early access to exclusive grants and accelerators before they go public.', 'Αναβάθμισε σε Pro για πρώιμη πρόσβαση σε αποκλειστικές επιχορηγήσεις και επιταχυντές πριν γίνουν δημόσια.')}
       </p>
      </div>
      <Button onClick={() => navigate('/pricing')} className="w-full h-8 rounded-xl text-sm font-semibold bg-stone-900 text-white hover:bg-stone-800">
       {t('Upgrade Now', 'Αναβάθμιση τώρα')}
      </Button>
     </div>
    </aside>
   </div>
  </div>
  </PageShell>
 );
}
