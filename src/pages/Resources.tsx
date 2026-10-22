import {
 useEffect,
 useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/ui/PageShell";
import { 
 Briefcase,
 Star,
 Search,
 SlidersHorizontal,
 Clock,
 Plus,
 ChevronRight,
 GraduationCap,
 Wrench,
 HelpCircle,
 PlayCircle
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import FactLine from "../components/ui/FactLine";
import EmptyHint, { AskLink, ClearFiltersButton } from "../components/ui/EmptyHint";
import { usePageControls } from "../lib/pageControls";
import { User } from "../types";
import { cn } from "../lib/utils";
import { motion } from "motion/react";
import { useT } from "../lib/language";
import { labelOf } from "../lib/labels";
import { useAuth } from "../App";
import { usePeople } from "../lib/directory";
import { avatarOf } from "../lib/peopleSource";
import { avatarFor } from "../data/cast";
import { coverFor } from "../data/photos";
import { onCatalog, postJob, str, num, type CatalogDoc } from "../lib/catalog";
import { useOptionalMessaging } from "../context/MessagingContext";
import { logActivity } from "../lib/localLists";

const RESOURCE_TAB_EL: Record<string, string> = {
 learning: 'Μάθηση',
 services: 'Υπηρεσίες',
 jobs: 'Θέσεις',
 support: 'Υποστήριξη',
};

const FAQ_EL: Record<string, string> = {
 "How do I find a co-founder?": "Πώς βρίσκω συνιδρυτή;",
 "What is the Readiness Score?": "Τι είναι ο δείκτης ετοιμότητας;",
 "How to apply for programs?": "Πώς κάνω αίτηση σε προγράμματα;",
 "Managing your subscription": "Διαχείριση της συνδρομής σου",
};

const SERVICE_NAME_EL: Record<string, string> = {
 "Legal Review": "Νομικός έλεγχος",
 "Pitch Deck Design": "Σχεδιασμός pitch deck",
 "Cloud Infrastructure Audit": "Έλεγχος υποδομής cloud",
};

const COURSE_TITLE_EL: Record<string, string> = {
 "Foundations of Fundraising": "Βασικές αρχές χρηματοδότησης",
 "Building a Scalable Sales Engine": "Δημιουργία κλιμακούμενης μηχανής πωλήσεων",
 "Legal Essentials for Startups": "Νομικά βασικά για startups",
 "Product-Market Fit Workshop": "Εργαστήριο product-market fit",
};

const JOB_TITLE_EL: Record<string, string> = {
 "Lead Full-Stack Engineer": "Επικεφαλής ανάπτυξης full-stack",
 "Growth Marketing Manager": "Manager growth marketing",
 "Product Design Intern": "Πρακτική σε product design",
};

interface ResourcesProps {
 user: User;
}

type Course = { id: string; title: string; instructor: string; duration: string; level: 'Beginner' | 'Intermediate' | 'Advanced'; rating: number; image: string };
type Service = { id: string; name: string; provider: string; price: string; rating: number; type: string };
type Job = { id: string; title: string; company: string; type: string; location: string; salary: string; authorId?: string; mine?: boolean };

export default function Resources({ user: _user }: ResourcesProps) {
 const t = useT();
 const navigate = useNavigate();
 const { user: authUser, isDemoMode } = useAuth();
 const { people: directory } = usePeople(authUser?.uid);
 const [activeTab, setActiveTab] = useState<'learning' | 'services' | 'jobs' | 'support'>('learning');
 const [courseQuery, setCourseQuery] = useState('');
 const [courseLevel, setCourseLevel] = useState<'All' | 'Beginner' | 'Intermediate' | 'Advanced'>('All');
 const [jobModalOpen, setJobModalOpen] = useState(false);
 const ask = (prompt: string) => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt } }));
 usePageControls(() => [
  { id: 'tab-learning', en: 'Show learning', el: 'Εμφάνιση μάθησης', run: () => setActiveTab('learning') },
  { id: 'tab-services', en: 'Show services', el: 'Εμφάνιση υπηρεσιών', run: () => setActiveTab('services') },
  { id: 'tab-jobs', en: 'Show jobs', el: 'Εμφάνιση θέσεων', run: () => setActiveTab('jobs') },
  { id: 'tab-support', en: 'Show support', el: 'Εμφάνιση υποστήριξης', run: () => setActiveTab('support') },
  { id: 'clear-course-filters', en: 'Clear course filters', el: 'Καθάρισε τα φίλτρα μαθημάτων', run: () => { setCourseQuery(''); setCourseLevel('All'); } },
 ], []);

 // Real accounts read platform-published catalogues; demo keeps the samples.
 const [liveCourses, setLiveCourses] = useState<Course[] | null>(null);
 const [liveServices, setLiveServices] = useState<Service[] | null>(null);
 const [liveJobs, setLiveJobs] = useState<Job[] | null>(null);
 useEffect(() => {
  if (isDemoMode) { setLiveCourses(null); setLiveServices(null); setLiveJobs(null); return; }
  const stops = [
   onCatalog('learningResources', (docs) => setLiveCourses(docs.map((doc) => ({
    id: doc.id, title: str(doc.title, 'Course'), instructor: str(doc.instructor ?? doc.author, 'CoFounderBay'),
    duration: str(doc.duration, '—'), level: (['Beginner', 'Intermediate', 'Advanced'] as const).includes(doc.level as Course['level']) ? doc.level as Course['level'] : 'Beginner',
    rating: num(doc.rating) ?? 0, image: str(doc.image ?? doc.imageUrl),
   }))), () => setLiveCourses([])),
   onCatalog('services', (docs) => setLiveServices(docs.map((doc) => ({
    id: doc.id, name: str(doc.name ?? doc.title, 'Service'), provider: str(doc.provider ?? doc.providerName, 'Partner'),
    price: str(doc.price, '—'), rating: num(doc.rating) ?? 0, type: str(doc.type, 'Other'),
   }))), () => setLiveServices([])),
   onCatalog('jobs', (docs) => setLiveJobs(docs.map((doc) => ({
    id: doc.id, title: str(doc.title, 'Role'), company: str(doc.company, ''), type: str(doc.type, 'Full-time'),
    location: str(doc.location, ''), salary: str(doc.salary, ''), authorId: str(doc.authorId), mine: doc.authorId === authUser?.uid,
   }))), () => setLiveJobs([])),
  ];
  return () => { stops.forEach((stop) => stop()); };
 }, [isDemoMode, authUser?.uid]);

 // A real mentor from the live directory powers the coaching card.
 const coach = directory.find((person) => person.role === 'Mentor') ?? null;

 const mockCourses: Course[] = [
  { id: "c1", title: "Foundations of Fundraising", instructor: "Naval Ravikant", duration: "4h 20m", level: "Beginner", rating: 4.9, image: coverFor("course-1", ["Foundations of Fundraising", "course"], 800, 450) },
  { id: "c2", title: "Building a Scalable Sales Engine", instructor: "Aaron Ross", duration: "6h 15m", level: "Intermediate", rating: 4.8, image: coverFor("course-2", ["Building a Scalable Sales Engine", "course", "sales"], 800, 450) },
  { id: "c3", title: "Legal Essentials for Startups", instructor: "Sarah Chen", duration: "2h 45m", level: "Beginner", rating: 4.7, image: coverFor("course-3", ["Legal Essentials for Startups", "course", "legal"], 800, 450) },
  { id: "c4", title: "Product-Market Fit Workshop", instructor: "Marc Andreessen", duration: "8h 00m", level: "Advanced", rating: 5.0, image: coverFor("course-4", ["Product-Market Fit Workshop", "course", "workshop"], 800, 450) }
 ];

 const mockServices: Service[] = [
  { id: "s1", name: "Legal Review", provider: "StartupLaw LLP", price: "$499", rating: 4.9, type: "Legal" },
  { id: "s2", name: "Pitch Deck Design", provider: "PixelPerfect", price: "$750", rating: 4.8, type: "Design" },
  { id: "s3", name: "Cloud Infrastructure Audit", provider: "DevOps Pros", price: "$1,200", rating: 4.7, type: "Tech" }
 ];

 const mockJobs: Job[] = [
  { id: "j1", title: "Lead Full-Stack Engineer", company: "EcoFlow Systems", type: "Full-time", location: "Remote", salary: "$120k - $160k" },
  { id: "j2", title: "Growth Marketing Manager", company: "Finly", type: "Full-time", location: "NYC", salary: "$90k - $130k" },
  { id: "j3", title: "Product Design Intern", company: "Healthify", type: "Internship", location: "SF", salary: "$30/hr" }
 ];

 const courses = isDemoMode ? mockCourses : (liveCourses ?? []);
 const services = isDemoMode ? mockServices : (liveServices ?? []);
 const jobs = isDemoMode ? mockJobs : (liveJobs ?? []);

 const messaging = useOptionalMessaging();

 /** Applying to a member-posted role opens a direct conversation with its author. */
 const applyForJob = async (job: Job) => {
  if (!isDemoMode && job.authorId && job.authorId !== authUser?.uid && messaging) {
   const conversationId = await messaging.openConversationWith(job.authorId);
   if (conversationId) {
    logActivity({ kind: 'application', title: `Applied for ${job.title}${job.company ? ` at ${job.company}` : ''}`, titleEl: `Αίτηση για ${job.title}${job.company ? ` στην ${job.company}` : ''}`, href: '/messages' });
    navigate('/messages');
    return;
   }
  }
  ask(`How do I apply for ${job.title} at ${job.company}?`);
 };

 return (
  <PageShell sample={isDemoMode} title={t("Resources", "Πόροι")} description={t("Curated learning materials, professional services, and strategic growth tools.", "Επιλεγμένο εκπαιδευτικό υλικό, επαγγελματικές υπηρεσίες και εργαλεία στρατηγικής ανάπτυξης.")}>
   <div className="space-y-6">
    <div className="scroll-tabs bg-stone-50 p-1 rounded-xl border border-stone-100">
     {(['learning', 'services', 'jobs', 'support'] as const).map((tab) => (
      <button
       key={tab}
       onClick={() => setActiveTab(tab)}
       className={cn(
        "px-4 py-2 text-sm font-medium rounded-lg transition-all capitalize",
        activeTab === tab 
         ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200"
         : "text-stone-500 hover:text-stone-900 hover:bg-white"
       )}
      >
       {t(tab, RESOURCE_TAB_EL[tab] ?? tab)}
      </button>
     ))}
    </div>

   {activeTab === 'learning' && (
    <div className="space-y-10">
     <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="space-y-1">
       <h3 className="text-base font-semibold tracking-tight text-stone-900">{t('Learning Hub', 'Κέντρο μάθησης')}</h3>
       <p className="text-base text-stone-400 font-light">{t('Master the art of building and scaling with world-class instructors.', 'Μάθε να χτίζεις και να κλιμακώνεις με κορυφαίους διδάσκοντες.')}</p>
      </div>
      <div className="flex items-center gap-3">
       <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
        <input 
         type="text"
         value={courseQuery}
         onChange={(e) => setCourseQuery(e.target.value)}
         placeholder={t('Search courses…', 'Αναζήτηση μαθημάτων…')} 
         className="bg-stone-50 border border-stone-200/60 rounded-2xl py-3 pl-12 pr-6 text-base focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:bg-white transition-all w-full md:w-[300px] font-light"
        />
       </div>
       <Button type="button" variant="outline" className="h-10 px-6 rounded-2xl border-stone-200/60 hover:bg-stone-50 text-sm font-medium tracking-wide" onClick={() => {
        const levels = ['All', 'Beginner', 'Intermediate', 'Advanced'] as const;
        const index = levels.indexOf(courseLevel);
        setCourseLevel(levels[(index + 1) % levels.length] ?? 'All');
       }}>
        <SlidersHorizontal className="w-4 h-4 mr-2" /> {courseLevel === 'All' ? t('Filters', 'Φίλτρα') : labelOf(courseLevel)}
       </Button>
      </div>
     </div>

     {(() => {
      const visibleCourses = courses.filter((course) => {
        const q = courseQuery.trim().toLowerCase();
        const matchesQuery = !q || course.title.toLowerCase().includes(q) || course.instructor.toLowerCase().includes(q);
        const matchesLevel = courseLevel === 'All' || course.level === courseLevel;
        return matchesQuery && matchesLevel;
      });
      if (visibleCourses.length === 0) {
        return (
         <EmptyHint title={courses.length === 0 && !courseQuery
          ? t('The learning library is being curated.', 'Η βιβλιοθήκη μάθησης ετοιμάζεται.')
          : t("No courses match this filter.", "Δεν υπάρχουν μαθήματα με αυτό το φίλτρο.")}
          detail={t("Clear the search, or ask the assistant which program to start.", "Καθάρισε την αναζήτηση, ή ρώτα τον βοηθό ποιο πρόγραμμα να ξεκινήσεις.")}>
          <ClearFiltersButton onClick={() => { setCourseQuery(''); setCourseLevel('All'); }} />
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
        <Card className="group hover:shadow-sm transition-all duration-200 border-stone-200/60 hover:border-stone-900 h-full p-4 rounded-xl bg-white overflow-hidden" contentClassName="flex flex-col">
         <div className="aspect-video bg-stone-100 rounded-xl mb-6 overflow-hidden relative">
          {course.image ? (
           <img
            src={course.image}
            alt={course.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
           />
          ) : (
           <div className="w-full h-full flex items-center justify-center" aria-hidden>
            <GraduationCap className="w-8 h-8 text-stone-300" />
           </div>
          )}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
           <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-stone-900 border border-stone-200">
            <PlayCircle className="w-6 h-6" />
           </div>
          </div>
          <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-sm font-medium tracking-wide shadow-sm border border-white/20">
           {labelOf(course.level)}
          </div>
         </div>
         <div className="space-y-4 flex-1 px-2">
          <div className="space-y-1">
           <h4 className="font-medium text-base leading-tight text-stone-900 group-hover:text-stone-900 transition-colors">{t(course.title, COURSE_TITLE_EL[course.title] ?? course.title)}</h4>
           <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-stone-400 tracking-wide">{t('Instructor', 'Εισηγητής')}</span>
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
          {t('Start Learning', 'Ξεκίνα τη μάθηση')}
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
       <h3 className="text-base font-semibold tracking-tight text-stone-900">{t('Partner Services', 'Υπηρεσίες συνεργατών')}</h3>
       <p className="text-base text-stone-400 font-light">{t('Exclusive deals and vetted services for our ecosystem members.', 'Αποκλειστικές προσφορές και ελεγμένες υπηρεσίες για τα μέλη του οικοσυστήματος.')}</p>
      </div>
      <Button type="button" variant="outline" className="h-10 px-6 rounded-2xl border-stone-200/60 hover:bg-stone-50 text-sm font-medium tracking-wide" onClick={() => ask('How do I list a partner service?')}>
       <Plus className="w-4 h-4 mr-2" /> {t('List Your Service', 'Καταχώρισε την υπηρεσία σου')}
      </Button>
     </div>

     {services.length === 0 && (
      <EmptyHint
       title={t('No partner services are listed yet.', 'Δεν υπάρχουν ακόμη υπηρεσίες συνεργατών.')}
       detail={t('The marketplace opens as partners join. Ask the assistant to notify you.', 'Η αγορά ανοίγει καθώς προστίθενται συνεργάτες. Ζήτα από τον βοηθό να σε ενημερώσει.')}
      >
       <AskLink prompt="Notify me when partner services open" />
      </EmptyHint>
     )}
     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {services.map((service, idx) => (
       <motion.div
        key={service.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: idx * 0.1 }}
       >
        <Card className="group hover:shadow-sm transition-all duration-200 border-stone-200/60 hover:border-stone-900 p-5 sm:p-8 rounded-xl bg-white relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <Wrench className="w-32 h-32 -mr-12 -mt-12" />
         </div>
         <div className="flex items-start justify-between mb-8 relative z-10">
          <div className="w-16 h-16 bg-stone-50 rounded-xl flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all border border-stone-100 shadow-sm">
           <Wrench className="w-8 h-8" />
          </div>
          <div className="text-right">
           <p className="text-lg font-semibold text-stone-900 tracking-tight">{service.price}</p>
           <p className="text-sm text-stone-400 font-medium tracking-wider">{t('Starting at', 'Από')}</p>
          </div>
         </div>
         <div className="space-y-4 relative z-10">
          <div className="space-y-1">
           <h4 className="font-semibold text-base tracking-tight text-stone-900">{t(service.name, SERVICE_NAME_EL[service.name] ?? service.name)}</h4>
           <p className="text-base text-stone-500 font-light">{t(`by ${service.provider}`, `Από: ${service.provider}`)}</p>
          </div>
          <div className="flex items-center gap-4 pt-4 border-t border-stone-50">
           <FactLine className="text-sm" items={[labelOf(service.type)]} label={t('Service type', 'Είδος υπηρεσίας')} />
           <div className="flex items-center gap-1.5 text-sm font-mono font-medium text-amber-500 tracking-wide">
            <Star className="w-4 h-4 fill-amber-500" /> {service.rating}
           </div>
          </div>
         </div>
         <Button type="button" variant="primary" className="w-full mt-10 h-11 rounded-2xl text-sm font-medium tracking-wider shadow-sm" onClick={() => ask(`Tell me about ${service.name}`)}>
          {t('View Details', 'Λεπτομέρειες')}
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
       <h3 className="text-base font-semibold tracking-tight text-stone-900">{t('Jobs & Roles', 'Θέσεις και ρόλοι')}</h3>
       <p className="text-base text-stone-400 font-light">{t('Find your next co-founder or early-stage hire.', 'Βρες συνιδρυτή ή πρόσληψη σε πρώιμο στάδιο.')}</p>
      </div>
      <Button type="button" variant="primary" className="h-10 px-8 rounded-2xl text-sm font-medium tracking-wide shadow-lg shadow-stone-900/10" onClick={() => (isDemoMode ? ask('How do I post a job?') : setJobModalOpen(true))}>
       <Plus className="w-4 h-4 mr-2" /> {t('Post a Job', 'Καταχώριση θέσης')}
      </Button>
     </div>

     {jobs.length === 0 && (
      <EmptyHint
       title={t('No open roles yet.', 'Δεν υπάρχουν ακόμη ανοιχτές θέσεις.')}
       detail={t('Post the first role for your startup, or ask the assistant for help.', 'Καταχώρισε την πρώτη θέση για το startup σου ή ζήτα βοήθεια από τον βοηθό.')}
      >
       <button type="button" onClick={() => setJobModalOpen(true)} className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-all">
        {t('Post a Job', 'Καταχώριση θέσης')}
       </button>
      </EmptyHint>
     )}
     <div className="space-y-6">
      {jobs.map((job, idx) => (
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
            <h4 className="font-semibold text-base tracking-tight text-stone-900">{t(job.title, JOB_TITLE_EL[job.title] ?? job.title)}</h4>
            <div className="flex items-center gap-3">
             <span className="text-base text-stone-600 font-medium">{job.company}</span>
             <div className="w-1 h-1 rounded-full bg-stone-200"></div>
             <span className="text-base text-stone-400 font-light">{labelOf(job.location)}</span>
            </div>
           </div>
          </div>
          <div className="flex items-center gap-10">
           <div className="text-right hidden md:block space-y-1">
            <p className="text-base font-medium text-stone-900 tracking-tight">{job.salary}</p>
            <p className="text-sm text-stone-400 font-medium tracking-wider">{labelOf(job.type)}</p>
           </div>
           {job.mine ? (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">{t('Your listing', 'Δική σου αγγελία')}</span>
           ) : (
            <Button type="button" variant="outline" className="h-11 px-10 rounded-2xl text-sm font-medium tracking-wider border-stone-200 hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-all" onClick={() => void applyForJob(job)}>
             {t('Apply Now', 'Κάνε αίτηση')}
            </Button>
           )}
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
       <h3 className="text-base font-semibold tracking-tight text-stone-900">{t('Help &', 'Βοήθεια και')} <span className="text-stone-300 italic serif">{t('Support', 'υποστήριξη')}</span></h3>
       <p className="text-stone-500 text-base font-light">{t('Get answers to your questions and resolve issues quickly.', 'Πάρε απαντήσεις και λύσε ζητήματα γρήγορα.')}</p>
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
         <p className="text-base font-medium text-stone-900">{t(q, FAQ_EL[q] ?? q)}</p>
         <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-300 group-hover:bg-stone-900 group-hover:text-white transition-all">
          <ChevronRight className="w-5 h-5" />
         </div>
        </motion.div>
       ))}
      </div>
      <Button type="button" variant="outline" className="w-full h-16 rounded-xl text-sm font-medium tracking-wider border-stone-200 hover:bg-stone-50" onClick={() => ask('what can you do')}>
       {t('Visit Full Help Center', 'Πλήρες κέντρο βοήθειας')}
      </Button>
     </div>

     <div className="lg:col-span-5 space-y-10">
      <Card className="p-5 sm:p-8 rounded-xl border-stone-200/60 shadow-xl bg-white relative overflow-hidden group">
       <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <GraduationCap className="w-40 h-40 -mr-16 -mt-16" />
       </div>
       <div className="space-y-8 relative z-10">
        <div className="space-y-1">
         <h3 className="text-base font-semibold tracking-tight text-stone-900">{t('Expert Coaching', 'Καθοδήγηση από ειδικούς')}</h3>
         <p className="text-base text-stone-400 font-light">{t('Book a session with a startup veteran', 'Κλείσε συνεδρία με έμπειρο ιδρυτή')}</p>
        </div>
        <div className="space-y-6">
         {(coach || isDemoMode) && (
         <div className="p-6 sm:p-8 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 space-y-6 shadow-sm relative overflow-hidden">

          <div className="flex items-center gap-4 sm:gap-6">
           <div className="w-16 h-16 rounded-xl bg-white border border-stone-200 overflow-hidden shadow-xl flex items-center justify-center">
            {(() => {
             const name = isDemoMode ? 'Sarah Chen' : coach?.fullName;
             const src = isDemoMode ? avatarFor('sarah-chen', 150) : coach ? avatarOf(coach) : '';
             return src ? (
              <img src={src} alt={t('Coach', 'Σύμβουλος')} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
             ) : (
              <span className="text-lg font-semibold text-stone-600">{(name ?? '?').split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span>
             );
            })()}
           </div>
           <div className="space-y-1">
            <p className="text-base font-medium">{isDemoMode ? 'Sarah Chen' : coach?.fullName}</p>
            <p className="text-sm text-stone-600 font-medium tracking-wide">{isDemoMode ? t('Fundraising Expert', 'Ειδικός στη χρηματοδότηση') : (coach?.headline || t('Mentor', 'Μέντορας'))}</p>
           </div>
          </div>
          <p className="text-base text-stone-700 italic serif leading-relaxed">
           {isDemoMode
            ? t('"I help founders refine their pitch deck and strategy to close their Seed and Series A rounds faster."', '"Βοηθώ ιδρυτές να βελτιώσουν το pitch deck και τη στρατηγική τους ώστε να κλείσουν γρηγορότερα γύρους Seed και Series A."')
            : t('"Book a working session — bring your deck, your numbers, or your roadmap."', '"Κλείσε συνεδρία εργασίας — φέρε το deck, τους αριθμούς ή το roadmap σου."')}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-200">
           <div className="space-y-0.5">
            <p className="text-lg font-semibold text-stone-900">{isDemoMode ? '$150' : t('1:1', '1:1')}</p>
            <p className="text-sm text-stone-600 font-medium tracking-wide">{t('per session', 'ανά συνεδρία')}</p>
           </div>
           <Button type="button" className="h-10 px-8 rounded-xl bg-stone-900 text-white hover:bg-stone-800 transition-all font-medium text-sm tracking-wider" onClick={() => ask(isDemoMode ? 'book Sarah Chen' : `Book a mentoring session with ${coach?.fullName}`)}>
            {t('Book Now', 'Κράτηση')}
           </Button>
          </div>
         </div>
         )}
         <Button type="button" variant="ghost" className="w-full h-11 rounded-2xl text-sm font-medium tracking-wider text-stone-400 hover:text-stone-900 hover:bg-stone-50 border border-transparent hover:border-stone-100 transition-all" onClick={() => navigate('/mentors')}>
          {t('View All Coaches', 'Όλοι οι σύμβουλοι')}
         </Button>
        </div>
       </div>
      </Card>

      <Card className="bg-stone-50 border-stone-200/60 p-5 sm:p-8 rounded-xl shadow-sm relative overflow-hidden group">
       <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <HelpCircle className="w-32 h-32 -mr-12 -mt-12" />
       </div>
       <div className="space-y-6 relative z-10">
        <div className="flex items-center gap-3 text-stone-900">
         <HelpCircle className="w-5 h-5" />
         <h4 className="font-medium text-base tracking-wider">{t('Live Support', 'Ζωντανή υποστήριξη')}</h4>
        </div>
        <p className="text-base text-stone-500 leading-relaxed font-light">
         {t('Need immediate assistance? Our support team is available 24/7 for premium members.', 'Χρειάζεσαι άμεση βοήθεια; Η ομάδα υποστήριξης είναι διαθέσιμη όλο το 24ωρο για μέλη premium.')}
        </p>
        <Button type="button" variant="outline" className="w-full h-11 rounded-2xl border-stone-200 hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-all font-medium text-sm tracking-wider" onClick={() => ask('what can you do')}>
         {t('Start Chat', 'Έναρξη συνομιλίας')}
        </Button>
       </div>
      </Card>
     </div>
    </div>
   )}
  </div>

  <PostJobModal open={jobModalOpen} uid={authUser?.uid ?? ''} authorName={authUser?.displayName ?? ''} onClose={() => setJobModalOpen(false)} />
  </PageShell>
 );
}

function PostJobModal({ open, uid, authorName, onClose }: { open: boolean; uid: string; authorName: string; onClose: () => void }) {
 const t = useT();
 const [title, setTitle] = useState('');
 const [company, setCompany] = useState('');
 const [type, setType] = useState('Full-time');
 const [location, setLocation] = useState('');
 const [salary, setSalary] = useState('');
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState('');

 const submit = async () => {
  if (!title.trim() || !uid) return;
  setSaving(true);
  setError('');
  try {
   await postJob({ authorId: uid, authorName, title, company, type, location, salary });
   logActivity({ kind: 'post', title: `Posted role: ${title.trim()}`, titleEl: `Καταχώρηση θέσης: ${title.trim()}`, href: '/resources' });
   onClose();
  } catch {
   setError(t('Could not post the role. Try again.', 'Η καταχώρηση απέτυχε. Δοκίμασε ξανά.'));
  } finally {
   setSaving(false);
  }
 };

 const inputCls = "mt-1.5 w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-stone-900";
 return (
  <Modal open={open} onClose={onClose} title={t('Post a job', 'Καταχώριση θέσης')}>
   <div className="space-y-4">
    <div>
     <label className="text-xs font-semibold text-stone-500">{t('Role title', 'Τίτλος θέσης')}</label>
     <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={t('e.g. Founding Engineer', 'π.χ. Founding Engineer')} className={inputCls} />
    </div>
    <div className="grid grid-cols-2 gap-3">
     <div>
      <label htmlFor="job-company" className="text-xs font-semibold text-stone-500">{t('Company', 'Εταιρεία')}</label>
      <input id="job-company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} className={inputCls} />
     </div>
     <div>
      <label htmlFor="job-type" className="text-xs font-semibold text-stone-500">{t('Type', 'Τύπος')}</label>
      <select id="job-type" value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
       {['Full-time', 'Part-time', 'Contract', 'Internship', 'Co-founder'].map((option) => (
        <option key={option} value={option}>{option}</option>
       ))}
      </select>
     </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
     <div>
      <label className="text-xs font-semibold text-stone-500">{t('Location', 'Τοποθεσία')}</label>
      <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} placeholder={t('Remote, Athens…', 'Remote, Αθήνα…')} className={inputCls} />
     </div>
     <div>
      <label className="text-xs font-semibold text-stone-500">{t('Compensation', 'Αποζημίωση')}</label>
      <input value={salary} onChange={(e) => setSalary(e.target.value)} maxLength={60} placeholder={t('e.g. €40k–€60k + equity', 'π.χ. €40k–€60k + μετοχές')} className={inputCls} />
     </div>
    </div>
    {error && <p className="text-xs text-red-600">{error}</p>}
    <div className="flex justify-end gap-2">
     <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-all">{t('Cancel', 'Άκυρο')}</button>
     <button type="button" onClick={() => void submit()} disabled={!title.trim() || saving} className="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-all disabled:opacity-50">
      {saving ? t('Posting…', 'Καταχώρηση…') : t('Post', 'Καταχώρηση')}
     </button>
    </div>
   </div>
  </Modal>
 );
}
