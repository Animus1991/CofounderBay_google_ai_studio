import {
 useEffect,
 useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/ui/PageShell";
import FactLine from "../components/ui/FactLine";
import EmptyHint,
 { AskLink,
 ClearFiltersButton } from "../components/ui/EmptyHint";
import { 
 Rocket,
 Star,
 Users,
 Zap,
 Target,
 TrendingUp,
 Award,
 DollarSign
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { cn } from "../lib/utils";
import { User } from "../types";
import { motion } from "framer-motion";
import { useT } from "../lib/language";
import { labelOf } from "../lib/labels";
import { formatDate } from "../lib/dates";
import { useAuth } from "../App";
import { usePageControls } from "../lib/pageControls";
import { onCatalog, str, strList, toMillis } from "../lib/catalog";
import { keys, readIds, readTracked, toggleId } from "../lib/localLists";
import { useStored } from "../lib/useStored";
import { coverFor } from "../data/photos";

const TAB_EL: Record<string, string> = {
 All: 'Όλα',
 Accelerators: 'Επιταχυντές',
 Grants: 'Επιχορηγήσεις',
 Bootcamps: 'Εντατικά προγράμματα',
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
  focus: strList(doc.focus),
  image: str(doc.image ?? doc.imageUrl),
  organizer: str(doc.organizer ?? doc.organizerName, 'CoFounderBay'),
 };
}

export default function Programs({ user: _user }: ProgramsProps) {
 const t = useT();
 const navigate = useNavigate();
 const { isDemoMode } = useAuth();
 const [activeTab, setActiveTab] = useState('All');
 usePageControls(() => [
  { id: 'tab-all', en: 'All programs', el: 'Όλα τα προγράμματα', run: () => setActiveTab('All') },
  { id: 'tab-accelerators', en: 'Accelerators', el: 'Επιταχυντές', run: () => setActiveTab('Accelerators') },
  { id: 'tab-grants', en: 'Grants', el: 'Επιχορηγήσεις', run: () => setActiveTab('Grants') },
  { id: 'find-programs', en: 'Find programs', el: 'Εύρεση προγραμμάτων', run: () => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'What programs can I apply to?' } })) },
 ], []);
 const savedPrograms = useStored(() => readIds(keys.savedPrograms), [keys.savedPrograms]);
 const tracked = useStored(() => readTracked(), [keys.tracked]);

 const mockPrograms: Program[] = [
  {
   id: "1",
   title: "FinTech Accelerator Q3 2026",
   description: "A 3-month intensive program for early-stage fintech startups. Includes $120k funding and mentorship from top industry experts.",
   type: 'Accelerator',
   funding: "$120,000",
   duration: "12 Weeks",
   deadline: ahead(14),
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
   deadline: ahead(30),
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
   deadline: ahead(45),
   focus: ["SaaS", "Growth", "Marketing"],
   image: coverFor("prog-3", ["SaaS Growth Bootcamp", 'Bootcamp', "SaaS", "Growth"], 800, 400),
   organizer: "Founders Academy"
  }
 ];

 // Real accounts see programs published by the platform; demo keeps the samples.
 const [livePrograms, setLivePrograms] = useState<Program[] | null>(null);
 useEffect(() => {
  if (isDemoMode) { setLivePrograms(null); return; }
  return onCatalog('programs', (docs) => setLivePrograms(docs.map(programFromDoc)), () => setLivePrograms([]));
 }, [isDemoMode]);

 const programs = isDemoMode ? mockPrograms : (livePrograms ?? []);
 const visiblePrograms = programs.filter((program) => {
  if (activeTab === 'All') return true;
  if (activeTab === 'Accelerators') return program.type === 'Accelerator';
  if (activeTab === 'Grants') return program.type === 'Grant';
  if (activeTab === 'Bootcamps') return program.type === 'Bootcamp';
  return true;
 });

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
  <PageShell sample={isDemoMode} title={t("Programs", "Προγράμματα")} description={t("Curated accelerators, grants, and strategic opportunities for every stage.", "Επιλεγμένοι επιταχυντές, επιχορηγήσεις και στρατηγικές ευκαιρίες για κάθε στάδιο.")}>
   <div className="space-y-6">
    <div className="flex flex-wrap items-center gap-2">
     <Button type="button" variant="primary" className="h-8 rounded-xl px-4 text-sm bg-stone-900 hover:bg-stone-800 text-white" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'What programs can I apply to?' } }))}>
      {t('Find Programs', 'Εύρεση προγραμμάτων')}
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
        {t(tab, TAB_EL[tab] ?? tab)}
       </button>
      ))}
     </div>

     <div className="space-y-3">
      {visiblePrograms.length === 0 && (
       <EmptyHint title={t(`No programs in the ${activeTab} filter.`, `Δεν υπάρχουν προγράμματα στο φίλτρο «${TAB_EL[activeTab] ?? activeTab}».`)} detail={t("Ask the assistant which programs you can apply to, or switch the tab.", "Ρώτα τον βοηθό για ποια προγράμματα μπορείς να κάνεις αίτηση, ή άλλαξε καρτέλα.")}>
        {activeTab !== 'All' && <ClearFiltersButton onClick={() => setActiveTab('All')} />}
        <AskLink prompt="What programs can I apply to?" />
       </EmptyHint>
      )}
      {visiblePrograms.map((program, idx) => (
       <motion.div
        key={program.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.1 }}
       >
        <Card noPadding className="overflow-hidden group hover:border-stone-300 hover:shadow-md transition-all border-stone-100 rounded-2xl">
         <div className="flex flex-col md:flex-row">
          <div className="md:w-48 h-40 md:h-auto overflow-hidden relative shrink-0">
           {program.image ? (
            <img
             src={program.image}
             alt={program.title}
             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
             referrerPolicy="no-referrer"
            />
           ) : (
            <div className="w-full h-full bg-stone-100 flex items-center justify-center" aria-hidden>
             <Rocket className="w-7 h-7 text-stone-300" />
            </div>
           )}
           <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-white/95 backdrop-blur-sm rounded-md text-xs font-semibold tracking-wider border border-stone-100 shadow-sm">
            {labelOf(program.type)}
           </div>
          </div>
          <div className="flex-1 p-4 space-y-3">
           <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
             <h3 className="text-sm font-semibold text-stone-900 leading-snug">{t(program.title, PROGRAM_TITLE_EL[program.id] ?? program.title)}</h3>
             <p className="text-xs text-stone-400">{t(`by ${program.organizer}`, `Διοργάνωση: ${program.organizer}`)}</p>
            </div>
            <button
             type="button"
             aria-label={t('Save program', 'Αποθήκευση προγράμματος')}
             onClick={() => toggleId(keys.savedPrograms, program.id)}
             className={cn("p-1 transition-colors shrink-0", savedPrograms.includes(program.id) ? "text-amber-500" : "text-stone-300 hover:text-amber-500")}
            >
             <Star className={cn("w-3.5 h-3.5", savedPrograms.includes(program.id) && "fill-amber-500")} />
            </button>
           </div>
           <p className="text-sm text-stone-500 leading-relaxed line-clamp-2">{t(program.description, PROGRAM_DESC_EL[program.id] ?? program.description)}</p>
           <FactLine items={[program.funding, program.duration === 'N/A' ? 'N/A' : t(program.duration, program.duration.replace('Weeks', 'εβδομάδες')), formatDate(program.deadline), ...program.focus.slice(0, 2)]} label={t('Program facts', 'Στοιχεία προγράμματος')} />
           <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="primary" className="h-7 rounded-lg px-4 text-sm bg-stone-900 hover:bg-stone-800 text-white whitespace-nowrap shrink-0" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Apply to ${program.title}` } }))}>
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
     <Card className="rounded-2xl border-stone-100 p-4" contentClassName="space-y-3">
      <div>
       <h4 className="text-sm font-semibold text-stone-900">{t('Program Finder', 'Εύρεση προγραμμάτων')}</h4>
       <p className="text-xs text-stone-400 mt-0.5">{t('AI-matched to your stage, industry, and goals.', 'Με AI, με βάση το στάδιο, τον κλάδο και τους στόχους σου.')}</p>
      </div>
      <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex items-center gap-2.5">
       <div className="w-7 h-7 rounded-lg bg-stone-900 flex items-center justify-center text-white shrink-0">
        <Zap className="w-3.5 h-3.5" />
       </div>
       <span className="text-sm font-semibold text-stone-700">{t('AI-Powered Matching', 'Αντιστοίχιση με AI')}</span>
      </div>
      <Button type="button" variant="outline" className="w-full h-8 rounded-xl text-sm border-stone-200 hover:bg-white transition-all" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'What programs can I apply to?' } }))}>
       {t('Start Finder', 'Έναρξη εύρεσης')}
      </Button>
     </Card>

     <Card className="rounded-2xl border-stone-100 p-4" contentClassName="space-y-3">
      <div className="flex items-center justify-between">
       <h4 className="text-sm font-semibold text-stone-900">{t('Ecosystem Stats', 'Στατιστικά οικοσυστήματος')}</h4>
       <TrendingUp className="w-3.5 h-3.5 text-stone-400" />
      </div>
      <div className="grid grid-cols-2 gap-2">
       {ecosystemStats.map((stat, idx) => (
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
