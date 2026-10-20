import { useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from "motion/react";
import { 
 Rocket, 
 Target, 
 FileText, 
 Trophy, 
 BarChart3, 
 Plus, 
 ArrowRight, 
 CheckCircle2, 
 Clock,
 Lightbulb,
 Layers,
 X,
 Activity,
 Cpu,
 ShieldCheck,
 Zap,
 Presentation,
 Send,
 Edit3,
 Eye,
 Download,
 Star,
 Calendar,
 ChevronRight,
 AlertCircle,
 Check,
 Circle,
 TrendingUp,
 Users,
 DollarSign,
 Globe,
 Map,
 Briefcase,
 Wrench,
 FileCode,
 Scale,
 CreditCard,
 ShoppingCart,
 Headphones,
 Sparkles,
 Pin,
 History,
 Search,
 Copy,
 ExternalLink,
 Bookmark,
 BookOpen
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageShell from "../components/ui/PageShell";
import { User, Startup, FounderStage } from "../types";
import { cn } from "../lib/utils";
import { labelOf } from "../lib/labels";
import { useT } from "../lib/language";
import { keys, readTracked, writeTracked, readValue, writeValue, logActivity, type TrackedApplication } from "../lib/localLists";
import { useStored } from "../lib/useStored";
import { BUILDER_CONTENT, BUILDER_MODULES, builderStatus, readBuilderInputs } from "../lib/builder";
import { useAuth } from "../App";

interface FounderToolsProps {
 user: User;
}

/** The founder's own venture draft — persisted per account (cloud-synced when signed in). */
type StartupDraft = Startup & { dimensions?: Record<string, number> };

export default function FounderTools({ user }: FounderToolsProps) {
 const t = useT();
 const navigate = useNavigate();
 const { profile, isDemoMode } = useAuth();
 const tabLabel = (tab: string) => ({
  dashboard: t('Dashboard', 'Πίνακας ελέγχου'),
  builder: t('Builder', 'Δημιουργός'),
  pitch: t('Pitch', 'Παρουσίαση'),
  applications: t('Applications', 'Αιτήσεις'),
  tools: t('Tools', 'Εργαλεία'),
  templates: t('Templates', 'Πρότυπα'),
 }[tab] ?? tab);
 const moduleName = (en: string) => t(en, ({
  'Problem Definition': 'Ορισμός προβλήματος',
  'Solution & Value Prop': 'Λύση και πρόταση αξίας',
  'Market Analysis': 'Ανάλυση αγοράς',
  'Business Model': 'Επιχειρηματικό μοντέλο',
  'Go-to-Market Strategy': 'Στρατηγική go-to-market',
 } as Record<string, string>)[en] ?? en);
 const dimensionName = (en: string) => t(en, ({
  'Team Composition': 'Σύνθεση ομάδας',
  'Market Validation': 'Επικύρωση αγοράς',
  'Product/Tech': 'Προϊόν/τεχνολογία',
  'Financial Planning': 'Οικονομικός σχεδιασμός',
  'Pitch Readiness': 'Ετοιμότητα pitch',
 } as Record<string, string>)[en] ?? en);
 const slideTitle = (en: string) => t(en, ({
  'Cover & Hook': 'Εξώφυλλο και εισαγωγή',
  Problem: 'Πρόβλημα',
  Solution: 'Λύση',
  'Market Size': 'Μέγεθος αγοράς',
  'Business Model': 'Επιχειρηματικό μοντέλο',
  Traction: 'Traction',
  Team: 'Ομάδα',
  'Ask & Use of Funds': 'Αίτημα και χρήση κεφαλαίων',
 } as Record<string, string>)[en] ?? en);
 const typeLabel = (type: string) => {
  if (type === 'VC Intro') return t('VC Intro', 'Σύσταση σε VC');
  if (type === 'Program') return t('Program', 'Πρόγραμμα');
  return labelOf(type);
 };
 const whenLabel = (value: string) => {
  const el: Record<string, string> = {
   'Jan 15, 2027': '15 Ιαν 2027',
   'Mar 2027': 'Μαρ 2027',
   'Aug 1, 2026': '1 Αυγ 2026',
   'Oct 2026': 'Οκτ 2026',
   'Jun 10, 2026': '10 Ιουν 2026',
   'Sep 2026': 'Σεπ 2026',
   'N/A': 'Δ/Υ',
   'Apr 2026': 'Απρ 2026',
   'May 30, 2026': '30 Μαΐ 2026',
   'Jul 2026': 'Ιουλ 2026',
   'Apr 15': '15 Απρ',
   'May 20': '20 Μαΐ',
   '2 days ago': 'πριν από 2 ημέρες',
   '1 week ago': 'πριν από 1 εβδομάδα',
  };
  return el[value] ? t(value, el[value]) : value;
 };
 const noteLabel = (note: string) => {
  const el: Record<string, string> = {
   'Strong product-market fit narrative. Weakness: team completeness.': 'Ισχυρή αφήγηση product-market fit. Αδυναμία: πληρότητα ομάδας.',
   'Application under review. Interview scheduled.': 'Η αίτηση είναι σε έλεγχο. Η συνέντευξη προγραμματίστηκε.',
   'Complete technical commercialization section.': 'Συμπλήρωσε την ενότητα τεχνικής εμπορευματοποίησης.',
   'Revisit after first revenue milestone. Keep in pipeline.': 'Επανεξέτασε μετά το πρώτο ορόσημο εσόδων. Κράτα το στη ροή.',
   'Requires product demo video and 1-pager.': 'Χρειάζεται video επίδειξης προϊόντος και one pager.',
  };
  return el[note] ? t(note, el[note]) : note;
 };
 const statusWord = (status: string) => {
  if (status === 'submitted' || status === 'Submitted') return t('Submitted', 'Υποβλήθηκε');
  if (status === 'in-review' || status === 'In Review') return t('In Review', 'Σε έλεγχο');
  if (status === 'rejected' || status === 'Rejected') return t('Rejected', 'Απορρίφθηκε');
  if (status === 'accepted' || status === 'Accepted') return t('Accepted', 'Έγινε αποδεκτή');
  return labelOf(status) || status;
 };
 const [toastMsg, setToastMsg] = useState<string | null>(null);
 const showToast = useCallback((msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 2500); }, []);
 const [searchParams] = useSearchParams();
 const [activeTab, setActiveTab] = useState<'dashboard' | 'builder' | 'pitch' | 'applications' | 'tools' | 'templates'>(() => (searchParams.get('step') ? 'builder' : 'dashboard'));
 // Pinned tools and builder drafts are account-scoped (and cloud-synced for real accounts).
 const pinnedTools = useStored(() => readValue<string[]>('cfb.pinnedTools', []), ['cfb.pinnedTools']);
 const setPinnedTools = (next: string[]) => writeValue('cfb.pinnedTools', next);
 const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
 const [searchQuery, setSearchQuery] = useState('');
 const [showAssessment, setShowAssessment] = useState(false);
 const builderInputs = useStored(readBuilderInputs, [keys.builderInputs]);
 const setBuilderInputs = (updater: (prev: Record<string, string>) => Record<string, string>) => {
  writeValue(keys.builderInputs, updater(readBuilderInputs()));
 };
 const [templateSearch, setTemplateSearch] = useState('');
 const [showNewAppModal, setShowNewAppModal] = useState(false);
 const [expandedAppId, setExpandedAppId] = useState<number | null>(null);
 const [assessmentStep, setAssessmentStep] = useState(0);

 // The founder's venture draft: demo sees the sample startup, real accounts see
 // their own (seeded from the profile) and every edit is persisted per account.
 const savedStartup = useStored(() => readValue<Partial<StartupDraft>>('cfb.startup', {}), ['cfb.startup']);
 const mockStartup: StartupDraft = useMemo(() => {
  const stageValues = Object.values(FounderStage) as string[];
  const profileStage = profile?.stage && stageValues.includes(profile.stage) ? (profile.stage as FounderStage) : undefined;
  const fallbackName = isDemoMode ? 'EcoFlow Systems' : '';
  return {
   id: savedStartup.id ?? 'startup',
   ownerId: user.id,
   name: savedStartup.name ?? profile?.company ?? fallbackName,
   oneLiner: savedStartup.oneLiner ?? (isDemoMode ? 'Next-gen water purification for urban environments.' : ''),
   description: savedStartup.description ?? (isDemoMode ? 'EcoFlow uses proprietary bio-filters to recycle gray water in high-density residential buildings.' : ''),
   industry: savedStartup.industry ?? (isDemoMode ? ['Sustainability', 'CleanTech', 'PropTech'] : (profile?.industry ? [String(profile.industry)] : [])),
   stage: savedStartup.stage ?? profileStage ?? (isDemoMode ? FounderStage.PROTOTYPE : FounderStage.IDEA),
   readinessScore: savedStartup.readinessScore ?? (isDemoMode ? 68 : 0),
   createdAt: savedStartup.createdAt ?? new Date().toISOString(),
   updatedAt: savedStartup.updatedAt ?? new Date().toISOString(),
   dimensions: savedStartup.dimensions,
  };
 }, [savedStartup, profile, isDemoMode, user.id]);
 const setMockStartup = (updater: (prev: StartupDraft) => StartupDraft) => {
  writeValue('cfb.startup', updater(mockStartup));
 };

 const READINESS_DIMENSIONS = ['Team Composition', 'Market Validation', 'Product/Tech', 'Financial Planning', 'Pitch Readiness'];
 const demoReadinessMetrics = [
  { label: "Team Composition", score: 85, status: "Strong", next: t("Keep the team page current.", "Κράτα τη σελίδα ομάδας ενημερωμένη.") },
  { label: "Market Validation", score: 45, status: "In-Progress", next: t("Add one customer conversation this week.", "Πρόσθεσε μία συζήτηση με πελάτη αυτή την εβδομάδα.") },
  { label: "Product/Tech", score: 70, status: "Good", next: t("Ship the next milestone on Workspace.", "Παράδωσε το επόμενο ορόσημο στον χώρο εργασίας.") },
  { label: "Financial Planning", score: 30, status: "Critical", next: t("Open Fundraising and fill the 12-month model.", "Άνοιξε τη Χρηματοδότηση και συμπλήρωσε το μοντέλο 12 μηνών.") },
  { label: "Pitch Readiness", score: 60, status: "Improving", next: t("Export the pitch from Founder Tools.", "Εξήγαγε το pitch από τα Εργαλεία ιδρυτή.") }
 ];
 const nextSteps: Record<string, string> = {
  'Team Composition': t("Add a co-founder or key hire.", "Πρόσθεσε συνιδρυτή ή βασική πρόσληψη."),
  'Market Validation': t("Add one customer conversation this week.", "Πρόσθεσε μία συζήτηση με πελάτη αυτή την εβδομάδα."),
  'Product/Tech': t("Ship the next milestone on Workspace.", "Παράδωσε το επόμενο ορόσημο στον χώρο εργασίας."),
  'Financial Planning': t("Open Fundraising and fill the 12-month model.", "Άνοιξε τη Χρηματοδότηση και συμπλήρωσε το μοντέλο 12 μηνών."),
  'Pitch Readiness': t("Export the pitch from Founder Tools.", "Εξήγαγε το pitch από τα Εργαλεία ιδρυτή."),
 };
 // Real accounts see scores only from assessments they actually ran.
 const readinessMetrics = isDemoMode
  ? demoReadinessMetrics
  : READINESS_DIMENSIONS.map((label) => {
     const score = mockStartup.dimensions?.[label];
     return {
      label,
      score: score ?? 0,
      status: score == null ? 'Planned' : score < 40 ? 'Critical' : score < 70 ? 'In-Progress' : 'Strong',
      next: nextSteps[label] ?? '',
      assessed: score != null,
     };
    });

 const builderSteps = BUILDER_MODULES.map((module, index) => ({
  ...module,
  status: builderStatus(module.id, builderInputs).status,
  icon: [Lightbulb, Layers, Target, BarChart3, Rocket][index] ?? Lightbulb,
 }));

 const assessmentQuestions = [
  {
   dim: 'Market Validation',
   category: dimensionName("Market Validation"),
   question: t("How many potential customers have you interviewed?", "Με πόσους δυνητικούς πελάτες έχεις μιλήσει;"),
   options: ["0-5", "6-20", "21-50", "50+"],
   impact: 15
  },
  {
   dim: 'Product/Tech',
   category: dimensionName("Product/Tech"),
   question: t("What is the current state of your product?", "Σε τι στάδιο είναι το προϊόν σου;"),
   options: [t("Idea only", "Μόνο ιδέα"), t("Mockups/Wireframes", "Mockups/wireframes"), t("Functional Prototype", "Λειτουργικό πρωτότυπο"), t("MVP in Market", "MVP στην αγορά")],
   impact: 20
  },
  {
   dim: 'Financial Planning',
   category: dimensionName("Financial Planning"),
   question: t("Do you have a detailed 12-month financial projection?", "Έχεις αναλυτική οικονομική πρόβλεψη 12 μηνών;"),
   options: [t("No", "Όχι"), t("Basic estimates", "Βασικές εκτιμήσεις"), t("Detailed model", "Αναλυτικό μοντέλο"), t("Verified by advisor", "Επαληθευμένο από σύμβουλο")],
   impact: 25
  }
 ];

 const [assessmentAnswers, setAssessmentAnswers] = useState<Record<number, number>>({});

 const handleCompleteAssessment = () => {
  // Answers → per-dimension scores → overall readiness. Persisted per account.
  const dims: Record<string, number> = { ...(mockStartup.dimensions ?? {}) };
  let weighted = 0;
  let totalImpact = 0;
  assessmentQuestions.forEach((q, i) => {
   totalImpact += q.impact;
   const picked = assessmentAnswers[i];
   const frac = picked == null ? 0 : (q.options.length > 1 ? picked / (q.options.length - 1) : 1);
   dims[q.dim] = Math.round(frac * 100);
   weighted += frac * q.impact;
  });
  const score = totalImpact ? Math.min(100, Math.round((weighted / totalImpact) * 100)) : mockStartup.readinessScore ?? 0;
  setMockStartup(prev => ({ ...prev, readinessScore: score, dimensions: dims, updatedAt: new Date().toISOString() }));
  logActivity({ kind: 'milestone', title: `Readiness diagnostic: ${score}/100`, titleEl: `Διάγνωση ετοιμότητας: ${score}/100`, href: '/founder-tools' });
  setAssessmentAnswers({});
  setShowAssessment(false);
  setAssessmentStep(0);
 };

 const [builderStep, setBuilderStep] = useState(() => {
  const step = Number(searchParams.get('step'));
  return step >= 1 && step <= BUILDER_MODULES.length ? step : 1;
 });
 const [pitchSlide, setPitchSlide] = useState(1);

 const builderContent: Record<number, { title: string; description: string; questions: string[] }> = Object.fromEntries(
  Object.entries(BUILDER_CONTENT).map(([id, content]) => [id, {
   title: t(content.title.en, content.title.el),
   description: t(content.description.en, content.description.el),
   questions: content.questions.map((question) => t(question.en, question.el)),
  }])
 );

 const pitchSlides = [
  { id: 1, title: "Cover & Hook", icon: Presentation, status: "complete", tip: t("Lead with a bold statement that captures the problem's magnitude.", "Ξεκίνα με μια τολμηρή δήλωση που δείχνει το μέγεθος του προβλήματος.") },
  { id: 2, title: "Problem", icon: AlertCircle, status: "complete", tip: t("Use real data points — customer quotes and market research strengthen credibility.", "Χρησιμοποίησε πραγματικά δεδομένα — αποφθέγματα πελατών και έρευνα αγοράς δίνουν αξιοπιστία.") },
  { id: 3, title: "Solution", icon: Lightbulb, status: "complete", tip: t("One clear diagram beats 200 words. Show, don't tell.", "Ένα καθαρό διάγραμμα κερδίζει 200 λέξεις. Δείξε, μην εξηγείς.") },
  { id: 4, title: "Market Size", icon: Globe, status: "in-progress", tip: t("TAM → SAM → SOM funnel. Investors want to see a $1B+ TAM.", "Χωνί TAM → SAM → SOM. Οι επενδυτές θέλουν να δουν TAM $1B+.") },
  { id: 5, title: "Business Model", icon: DollarSign, status: "in-progress", tip: t("Keep it to one revenue stream in early stage — complexity signals confusion.", "Μείνε σε μία ροή εσόδων στο early stage — η πολυπλοκότητα δείχνει σύγχυση.") },
  { id: 6, title: "Traction", icon: TrendingUp, status: "pending", tip: t("Show week-over-week growth. Even small numbers with strong growth rate impress.", "Δείξε week-over-week ανάπτυξη. Ακόμα και μικροί αριθμοί με δυνατό ρυθμό εντυπωσιάζουν.") },
  { id: 7, title: "Team", icon: Users, status: "pending", tip: t("Highlight unfair advantages — why is YOUR team the one to win this?", "Ανάδειξε τα unfair advantages — γιατί η δική σου ομάδα θα το κερδίσει;") },
  { id: 8, title: "Ask & Use of Funds", icon: Target, status: "pending", tip: t("Be specific: '$1.2M to hire 3 engineers and reach $500K ARR by Q4'.", "Πες το συγκεκριμένα: «$1.2M για 3 μηχανικούς και $500K ARR μέχρι το Q4».") },
 ];

 const starterApplications: TrackedApplication[] = [
  { id: 1, program: "Y Combinator W27", type: "Accelerator", status: "submitted", deadline: "Jan 15, 2027", decision: "Mar 2027", match: 91, note: "Strong product-market fit narrative. Weakness: team completeness." },
  { id: 2, program: "Techstars NYC 2026", type: "Accelerator", status: "in-review", deadline: "Aug 1, 2026", decision: "Oct 2026", match: 78, note: "Application under review. Interview scheduled." },
  { id: 3, program: "NSF SBIR Phase I", type: "Grant", status: "draft", deadline: "Jun 10, 2026", decision: "Sep 2026", match: 65, note: "Complete technical commercialization section." },
  { id: 4, program: "First Round Capital", type: "VC Intro", status: "rejected", deadline: "N/A", decision: "Apr 2026", match: 55, note: "Revisit after first revenue milestone. Keep in pipeline." },
  { id: 5, program: "Sequoia Arc", type: "Program", status: "draft", deadline: "May 30, 2026", decision: "Jul 2026", match: 82, note: "Requires product demo video and 1-pager." },
 ];
 const [applications, setApplications] = useState<TrackedApplication[]>(() => [...readTracked(), ...(isDemoMode ? starterApplications : [])]);
 const [trackingName, setTrackingName] = useState<string | null>(null);

 // Tool Categories with icons and descriptions
 const toolCategories = [
  {
   id: 'legal',
   name: labelOf('Legal'),
   icon: Scale,
   description: t('Incorporation, contracts, IP protection', 'Ίδρυση εταιρείας, συμβάσεις, προστασία IP'),
   color: 'bg-blue-50 border-blue-100 text-blue-700',
   tools: [
    { id: 'incorporation', name: t('Incorporation Wizard', 'Οδηγός ίδρυσης εταιρείας'), desc: t('Delaware C-Corp formation guide', 'Οδηγός ίδρυσης Delaware C-Corp'), icon: FileText },
    { id: 'nda', name: t('NDA Generator', 'Γεννήτρια NDA'), desc: t('Mutual NDA template', 'Πρότυπο αμοιβαίου NDA'), icon: ShieldCheck },
    { id: 'ip', name: t('IP Assignment', 'Εκχώρηση IP'), desc: t('Founder IP assignment agreement', 'Συμφωνία εκχώρησης IP ιδρυτή'), icon: Scale },
    { id: 'terms', name: t('Terms of Service', 'Όροι χρήσης'), desc: t('Website/app ToS template', 'Πρότυπο ToS για site/app'), icon: FileCode },
    { id: 'privacy', name: t('Privacy Policy', 'Πολιτική απορρήτου'), desc: t('GDPR/CCPA compliant policy', 'Πολιτική συμβατή με GDPR/CCPA'), icon: ShieldCheck },
   ]
  },
  {
   id: 'finance',
   name: labelOf('Finance'),
   icon: CreditCard,
   description: t('Financial modeling, cap table, fundraising', 'Οικονομικά μοντέλα, cap table, fundraising'),
   color: 'bg-emerald-50 border-emerald-100 text-emerald-700',
   tools: [
    { id: 'model', name: t('Financial Model', 'Οικονομικό μοντέλο'), desc: t('3-year revenue forecast template', 'Πρότυπο πρόβλεψης εσόδων 3 ετών'), icon: BarChart3 },
    { id: 'captable', name: t('Cap Table', 'Cap table'), desc: t('Equity distribution tracker', 'Παρακολούθηση κατανομής μετοχών'), icon: Users },
    { id: 'safe', name: t('SAFE Note', 'SAFE Note'), desc: t('YC SAFE generator', 'Γεννήτρια YC SAFE'), icon: FileText },
    { id: 'valuation', name: t('Valuation Calculator', 'Υπολογιστής αποτίμησης'), desc: t('Pre-money valuation estimator', 'Εκτιμητής pre-money αποτίμησης'), icon: DollarSign },
    { id: 'burn', name: t('Burn Rate', 'Burn rate'), desc: t('Cash runway calculator', 'Υπολογιστής runway'), icon: TrendingUp },
   ]
  },
  {
   id: 'product',
   name: labelOf('Product'),
   icon: Rocket,
   description: t('Roadmap, PRDs, user research', 'Roadmap, PRD, έρευνα χρηστών'),
   color: 'bg-amber-50 border-amber-100 text-amber-700',
   tools: [
    { id: 'roadmap', name: t('Product Roadmap', 'Product roadmap'), desc: t('Quarterly planning template', 'Πρότυπο τριμηνιαίου πλάνου'), icon: Map },
    { id: 'prd', name: t('PRD Template', 'Πρότυπο PRD'), desc: t('Product requirements doc', 'Έγγραφο απαιτήσεων προϊόντος'), icon: FileText },
    { id: 'user-research', name: t('User Research', 'Έρευνα χρηστών'), desc: t('Interview script & tracker', 'Σενάριο συνέντευξης και παρακολούθηση'), icon: Headphones },
    { id: 'specs', name: t('Tech Specs', 'Τεχνικές προδιαγραφές'), desc: t('Engineering spec template', 'Πρότυπο τεχνικών προδιαγραφών'), icon: FileCode },
    { id: 'launch', name: t('Launch Checklist', 'Λίστα ελέγχου launch'), desc: t('Go-to-market checklist', 'Λίστα ελέγχου go-to-market'), icon: CheckCircle2 },
   ]
  },
  {
   id: 'marketing',
   name: labelOf('Marketing'),
   icon: ShoppingCart,
   description: t('GTM strategy, content, growth', 'Στρατηγική GTM, περιεχόμενο, ανάπτυξη'),
   color: 'bg-rose-50 border-rose-100 text-rose-700',
   tools: [
    { id: 'gtm', name: t('GTM Strategy', 'Στρατηγική GTM'), desc: t('Go-to-market playbook', 'Playbook go-to-market'), icon: Map },
    { id: 'content', name: t('Content Calendar', 'Ημερολόγιο περιεχομένου'), desc: t('Social media content planner', 'Πλάνο περιεχομένου στα social'), icon: Calendar },
    { id: 'pitch-deck', name: t('Pitch Deck', 'Pitch deck'), desc: t('Investor deck builder', 'Κατασκευή investor deck'), icon: Presentation },
    { id: 'one-pager', name: t('One Pager', 'One pager'), desc: t('Executive summary template', 'Πρότυπο executive summary'), icon: FileText },
    { id: 'metrics', name: t('Growth Metrics', 'Μετρικές ανάπτυξης'), desc: t('North Star metric tracker', 'Παρακολούθηση North Star metric'), icon: TrendingUp },
   ]
  },
  {
   id: 'hr',
   name: t('HR & Team', 'HR και ομάδα'),
   icon: Users,
   description: t('Hiring, equity, culture', 'Προσλήψεις, equity, κουλτούρα'),
   color: 'bg-purple-50 border-purple-100 text-purple-700',
   tools: [
    { id: 'hiring', name: t('Hiring Plan', 'Πλάνο προσλήψεων'), desc: t('12-month hiring roadmap', 'Roadmap προσλήψεων 12 μηνών'), icon: Users },
    { id: 'offer', name: t('Offer Letter', 'Επιστολή προσφοράς'), desc: t('Employee offer template', 'Πρότυπο προσφοράς εργασίας'), icon: FileText },
    { id: 'equity', name: t('Equity Grant', 'Equity grant'), desc: t('ESOP grant calculator', 'Υπολογιστής ESOP grant'), icon: CreditCard },
    { id: 'handbook', name: t('Employee Handbook', 'Εγχειρίδιο εργαζομένων'), desc: t('Culture & policy template', 'Πρότυπο κουλτούρας και πολιτικής'), icon: BookOpen },
    { id: 'reviews', name: t('Performance Reviews', 'Αξιολογήσεις απόδοσης'), desc: t('Review cycle template', 'Πρότυπο κύκλου αξιολόγησης'), icon: Star },
   ]
  },
 ];

 // Templates Library
 const templates = [
  { id: 1, name: t('YC Application', 'Αίτηση YC'), category: 'Accelerator', format: 'Google Docs', downloads: 12450, pinned: true, icon: FileText },
  { id: 2, name: t('Pitch Deck - Series A', 'Pitch deck — Series A'), category: 'Fundraising', format: 'Keynote/PPT', downloads: 8320, pinned: true, icon: Presentation },
  { id: 3, name: t('SAFE Note Template', 'Πρότυπο SAFE Note'), category: 'Legal', format: 'Word', downloads: 6780, pinned: false, icon: Scale },
  { id: 4, name: t('Financial Model v2', 'Οικονομικό μοντέλο v2'), category: 'Finance', format: 'Excel', downloads: 5430, pinned: false, icon: BarChart3 },
  { id: 5, name: t('Product Roadmap Q4', 'Product roadmap Q4'), category: 'Product', format: 'Notion', downloads: 4210, pinned: false, icon: Map },
  { id: 6, name: t('Employee Offer Letter', 'Επιστολή προσφοράς'), category: 'HR', format: 'Word', downloads: 3890, pinned: false, icon: Users },
  { id: 7, name: t('Go-to-Market Playbook', 'Playbook go-to-market'), category: 'Marketing', format: 'PDF', downloads: 3150, pinned: false, icon: ShoppingCart },
  { id: 8, name: t('Technical Spec Template', 'Πρότυπο τεχνικών προδιαγραφών'), category: 'Product', format: 'Notion', downloads: 2980, pinned: false, icon: FileCode },
 ];

 // AI Suggestions based on startup stage
 const aiSuggestions = [
  { id: 1, title: t('Refine your pitch narrative', 'Βελτίωσε την αφήγηση του pitch'), reason: t('Based on your stage: Prototype', 'Με βάση το στάδιό σου: Πρωτότυπο'), icon: Sparkles, action: t('Open Pitch Builder', 'Άνοιξε τον Pitch Builder') },
  { id: 2, title: t('Create a financial model', 'Φτιάξε οικονομικό μοντέλο'), reason: t('Readiness score: Financial Planning at 30%', 'Readiness score: οικονομικός σχεδιασμός στο 30%'), icon: BarChart3, action: t('Open Financial Tool', 'Άνοιξε το οικονομικό εργαλείο') },
  { id: 3, title: t('Draft team hiring plan', 'Σχεδίασε πλάνο προσλήψεων'), reason: t('Team Composition is strong but small', 'Η σύνθεση ομάδας είναι ισχυρή αλλά μικρή'), icon: Users, action: t('Open HR Tools', 'Άνοιξε τα εργαλεία HR') },
 ];

 const togglePin = (toolId: string) => {
  const newPinned = pinnedTools.includes(toolId)
   ? pinnedTools.filter(id => id !== toolId)
   : [...pinnedTools, toolId];
  setPinnedTools(newPinned);
 };

 const markToolUsed = (toolId: string) => {
  setRecentlyUsed(prev => [toolId, ...prev.filter(id => id !== toolId)].slice(0, 5));
 };

 return (
  <>
  <PageShell title={t("Founder Tools", "Εργαλεία ιδρυτή")} description={t("Diagnostic and construction suite — from concept to scale.", "Σουίτα διάγνωσης και κατασκευής — από την ιδέα στην κλίμακα.")} maxWidth="full">
   <div className="space-y-6">
    {/* Assessment Modal */}
   <AnimatePresence>
    {showAssessment && (
     <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-xl z-50 flex items-center justify-center p-4 md:p-6">
      <motion.div 
       initial={{ opacity: 0, scale: 0.9, y: 40 }}
       animate={{ opacity: 1, scale: 1, y: 0 }}
       exit={{ opacity: 0, scale: 0.9, y: 40 }}
       className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-sm border border-stone-200 relative"
      >
       {/* Scanning Effect Overlay */}
       <motion.div 
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute left-0 right-0 h-[2px] bg-amber-500/20 blur-sm z-20 pointer-events-none"
       />

       <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80 backdrop-blur-md relative z-10">
        <div className="space-y-0.5">
         <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <h3 className="text-base font-semibold text-stone-900 flex items-center gap-2">
           {t("Venture Diagnostic", "Διάγνωση εγχειρήματος")} <span className="text-stone-300 font-mono text-xs">v4.2.0</span>
          </h3>
         </div>
         <div className="flex items-center gap-3">
          <p className="text-xs font-mono text-stone-400 tracking-wider">{t("Module", "Ενότητα")} {assessmentStep + 1} / {assessmentQuestions.length}</p>
          <div className="h-1 w-1 rounded-full bg-stone-200" />
          <p className="text-xs font-mono text-amber-600 tracking-wider">{t("Analyzing", "Ανάλυση")}</p>
         </div>
        </div>
        <button
         onClick={() => setShowAssessment(false)}
         className="w-8 h-8 rounded-xl hover:bg-stone-200 flex items-center justify-center transition-all group"
        >
         <X className="w-4 h-4 text-stone-400 group-hover:text-stone-900" />
        </button>
       </div>

       <div className="p-5 space-y-5 relative z-10">
        <div className="space-y-3">
         <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 bg-stone-900 rounded-lg">
           <span className="text-xs font-semibold text-white tracking-wide">
            {assessmentQuestions[assessmentStep]?.category}
           </span>
          </div>
          <div className="h-px flex-1 bg-stone-100" />
          <div className="flex gap-1">
           {assessmentQuestions.map((_, i) => (
            <div key={i} className={cn(
             "h-1 rounded-full transition-all duration-200",
             i === assessmentStep ? "bg-stone-900 w-8" : i < assessmentStep ? "bg-stone-400 w-5" : "bg-stone-100 w-5"
            )} />
           ))}
          </div>
         </div>
         <h4 className="text-base font-semibold text-stone-900 leading-snug">
          {assessmentQuestions[assessmentStep]?.question}
         </h4>
        </div>

        <div className="grid grid-cols-1 gap-2">
         {assessmentQuestions[assessmentStep]?.options.map((option, i) => (
          <motion.button
           key={i}
           initial={{ opacity: 0, x: -10 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: i * 0.07 }}
           onClick={() => {
            setAssessmentAnswers(prev => ({ ...prev, [assessmentStep]: i }));
            if (assessmentStep < assessmentQuestions.length - 1) {
             setAssessmentStep(prev => prev + 1);
            } else {
             handleCompleteAssessment();
            }
           }}
           className="p-3 text-left border border-stone-200 rounded-xl hover:border-stone-900 hover:bg-stone-50 transition-all group flex items-center justify-between"
          >
           <div className="flex items-center gap-3">
            <span className="text-stone-300 font-mono text-xs font-semibold">{String(i + 1).padStart(2,'0')}</span>
            <span className="text-sm font-medium text-stone-600 group-hover:text-stone-900 transition-colors">{option}</span>
           </div>
           <div className="w-5 h-5 rounded-full border-2 border-stone-200 group-hover:border-stone-900 transition-all flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-stone-900 scale-0 group-hover:scale-100 transition-transform" />
           </div>
          </motion.button>
         ))}
        </div>
       </div>

       <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-2.5">
         <div className="w-7 h-7 bg-white rounded-lg border border-stone-200 flex items-center justify-center">
          <Cpu className="w-3.5 h-3.5 text-stone-500" />
         </div>
         <div>
          <p className="text-xs text-stone-600 font-semibold">{t("Self-assessment", "Αυτοαξιολόγηση")}</p>
          <p className="text-xs text-stone-400 font-mono tracking-wider">{t("Saved to your account", "Αποθηκεύεται στον λογαριασμό σου")}</p>
         </div>
        </div>
        <p className="text-xs text-stone-500">
         {t("Your answers update the Readiness Index.", "Οι απαντήσεις σου ενημερώνουν τον δείκτη ετοιμότητας.")}
        </p>
       </div>
      </motion.div>
     </div>
    )}
   </AnimatePresence>

   <div className="scroll-tabs bg-stone-50 p-1 rounded-xl border border-stone-100">
    {(["dashboard", "builder", "pitch", "applications", "tools", "templates"] as const).map((tab) => (
     <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={cn(
       "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize tracking-wide",
       activeTab === tab ? "bg-stone-900 text-white shadow" : "text-stone-400 hover:text-stone-700"
      )}
     >
      {tabLabel(tab)}
     </button>
    ))}
   </div>

   {activeTab === 'dashboard' && (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
     {/* Readiness Score Card */}
     <Card className="lg:col-span-4 space-y-5 p-5 rounded-2xl bg-white border-stone-100 shadow-sm">
      <div className="flex items-center justify-between">
       <div>
        <h3 className="text-base font-semibold text-stone-900">{t("Readiness Index", "Δείκτης ετοιμότητας")}</h3>
        <p className="text-sm text-stone-400 mt-0.5">{t("Venture assessment score", "Βαθμός αξιολόγησης")}</p>
       </div>
       <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-semibold text-emerald-600 tracking-wider">{mockStartup.stage === "Prototype" ? t("Prototype", "Πρωτότυπο") : labelOf(mockStartup.stage)}</span>
       </div>
      </div>

      <div className="flex items-center justify-center py-2">
       <div className="relative w-36 h-36">
        <svg className="w-full h-full transform -rotate-90">
         <circle cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-stone-100" />
         <motion.circle
          cx="72" cy="72" r="60"
          stroke="currentColor" strokeWidth="8" fill="transparent"
          strokeDasharray={2 * Math.PI * 60}
          initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
          animate={{ strokeDashoffset: 2 * Math.PI * 60 * (1 - (mockStartup.readinessScore ?? 0) / 100) }}
          transition={{ duration: 1.5, ease: "circOut" }}
          strokeLinecap="round"
          className="text-stone-900"
         />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
         <span className="text-lg font-semibold text-stone-900 tracking-tight leading-none tabular-nums">{mockStartup.readinessScore}</span>
         <span className="text-sm text-stone-400 tracking-wider mt-1">/ 100</span>
        </div>
       </div>
      </div>

      <div className="space-y-2.5 pt-3 border-t border-stone-100">
       {readinessMetrics.map((m, i) => (
        <div key={i} className="space-y-1">
         <div className="flex justify-between items-center">
          <span className="text-sm text-stone-500">{dimensionName(m.label)}</span>
          {'assessed' in m && m.assessed === false ? (
           <span className="text-sm font-medium text-stone-300">{t('Not assessed', 'Δεν αξιολογήθηκε')}</span>
          ) : (
           <span className={cn(
            "text-sm font-semibold",
            m.score < 40 ? "text-red-500" : m.score < 70 ? "text-amber-500" : "text-emerald-600"
           )}>{labelOf(m.status)}</span>
          )}
         </div>
         <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
          <motion.div
           initial={{ width: 0 }}
           animate={{ width: `${m.score}%` }}
           transition={{ duration: 1.2, delay: i * 0.08, ease: "circOut" }}
           className={cn(
            "h-full rounded-full",
            m.score < 40 ? "bg-red-400" : m.score < 70 ? "bg-amber-400" : "bg-emerald-500"
           )}
          />
         </div>
         <p className="text-xs leading-snug text-stone-400">{t('Next', 'Επόμενο')} · {m.next}</p>
        </div>
       ))}
      </div>

      <Button
       className="w-full h-8 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-medium flex items-center justify-center gap-2 group/btn mt-[15px]"
       onClick={() => setShowAssessment(true)}
      >
       {t("Run diagnostic", "Διάγνωση")}
       <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
      </Button>
     </Card>

     {/* Startup Builder Overview */}
     <div className="lg:col-span-8 space-y-4">
      <Card className="p-4 sm:p-6 rounded-2xl border-stone-100 shadow-sm bg-white">
       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
         <h3 className="text-base font-semibold text-stone-900">{t("Startup Builder Progress", "Πρόοδος κατασκευής startup")}</h3>
         <p className="text-sm text-stone-400 mt-0.5">{t("Complete core modules to optimize your venture architecture", "Ολοκλήρωσε τις βασικές ενότητες για να βελτιώσεις την αρχιτεκτονική του εγχειρήματος")}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 rounded-lg border border-stone-100">
         <Activity className="w-3.5 h-3.5 text-stone-400" />
         <span className="text-xs font-mono text-stone-500 tracking-wider">{t("System Active", "Σύστημα ενεργό")}</span>
        </div>
       </div>

       <div className="space-y-2">
        {builderSteps.map((step) => {
         const status = step.status;
         return (
         <div key={step.id} className="flex items-center gap-4 group cursor-pointer p-2.5 rounded-xl hover:bg-stone-50 transition-all" onClick={() => { setBuilderStep(step.id); setActiveTab('builder'); }}>
          <div className={cn(
           "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 border",
           status === "Completed" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
           status === "In-Progress" ? "bg-amber-50 text-amber-600 border-amber-100" :
           "bg-stone-50 text-stone-300 border-stone-100"
          )}>
           <step.icon className="w-4.5 h-4.5" style={{ width: '18px', height: '18px' }} />
          </div>
          <div className="flex-1 space-y-1.5 min-w-0">
           <div className="flex items-center justify-between gap-2">
            <h4 className="min-w-0 text-sm font-semibold text-stone-900">{moduleName(step.title)}</h4>
            <span className={cn(
             "text-xs font-medium tracking-wider px-2 py-0.5 rounded-full border shrink-0",
             status === "Completed" ? "text-emerald-600 border-transparent" :
             status === "In-Progress" ? "text-amber-600 border-transparent" :
             "text-stone-400 border-transparent"
            )}>{labelOf(status)}</span>
           </div>
           <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
            <motion.div
             initial={{ width: 0 }}
             animate={{ width: status === "Completed" ? "100%" : status === "In-Progress" ? "55%" : "0%" }}
             transition={{ duration: 1, ease: "circOut" }}
             className={cn(
              "h-full rounded-full",
              status === "Completed" ? "bg-emerald-500" :
              status === "In-Progress" ? "bg-amber-400" :
              "bg-stone-200"
             )}
            />
           </div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-200 group-hover:text-stone-500 transition-colors shrink-0" />
         </div>
         );
        })}
       </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
       <Card className="p-5 rounded-2xl border-stone-100 shadow-sm bg-white">
        <h3 className="text-sm font-semibold text-stone-900 mb-1">{t("Recent Achievements", "Πρόσφατα επιτεύγματα")}</h3>
        <p className="text-xs text-stone-400 mb-4">{t("Verified venture milestones", "Επαληθευμένα ορόσημα")}</p>
        <div className="space-y-3">
         {[
          { title: "First 10 Interviews", date: "2 days ago", icon: Trophy, color: "text-amber-500", bg: "bg-amber-50 border-amber-100", nav: '/milestones' },
          { title: "Pitch Deck v1.0", date: "1 week ago", icon: FileText, color: "text-blue-500", bg: "bg-blue-50 border-blue-100", nav: '/founder-tools' },
         ].map((ach, i) => (
          <div key={i} className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate(ach.nav)}>
           <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border shrink-0", ach.bg, ach.color)}>
            <ach.icon className="w-4 h-4" />
           </div>
           <div>
            <p className="text-sm font-semibold text-stone-900">{ach.title}</p>
            <p className="text-xs text-stone-400">{whenLabel(ach.date)}</p>
           </div>
          </div>
         ))}
        </div>
       </Card>

       <Card className="p-5 rounded-2xl border-stone-100 shadow-sm bg-white">
        <h3 className="text-sm font-semibold text-stone-900 mb-1">{t("Upcoming Deadlines", "Επερχόμενες προθεσμίες")}</h3>
        <p className="text-xs text-stone-400 mb-4">{t("Critical ecosystem windows", "Κρίσιμα παράθυρα οικοσυστήματος")}</p>
        <div className="space-y-3">
         {[
          { title: "YC Summer Application", date: "Apr 15", icon: Clock, color: "text-red-500", bg: "bg-red-50 border-red-100", urgent: true },
          { title: "Techstars Demo Day", date: "May 20", icon: Clock, color: "text-amber-500", bg: "bg-amber-50 border-amber-100", urgent: false },
         ].map((dl, i) => (
          <div key={i} className="flex items-center gap-3 group cursor-pointer" onClick={() => { setActiveTab('applications'); }}>
           <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border shrink-0", dl.bg, dl.color)}>
            <dl.icon className="w-4 h-4" />
           </div>
           <div className="flex-1">
            <p className="text-sm font-semibold text-stone-900">{dl.title}</p>
            <p className={cn("text-xs", dl.urgent ? "text-red-500 font-medium" : "text-stone-400")}>{t("Due", "Λήξη")} {whenLabel(dl.date)}</p>
           </div>
           {dl.urgent && <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full tracking-wider">{t("Soon", "Σύντομα")}</span>}
          </div>
         ))}
        </div>
       </Card>
      </div>
     </div>
    </div>
   )}

   {activeTab === 'builder' && (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
     {/* Steps Sidebar - Systematic Style */}
     <div className="lg:col-span-4 space-y-4">
      <Card className="p-4 border-stone-100 rounded-2xl space-y-1">
       <p className="text-xs font-semibold text-stone-400 tracking-wider px-2 pb-2 border-b border-stone-100 mb-2">{t("Modules", "Ενότητες")}</p>
       {builderSteps.map((step) => (
        <button
         key={step.id}
         onClick={() => setBuilderStep(step.id)}
         className={cn(
          "w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 group",
          builderStep === step.id
           ? "bg-stone-900 border-stone-900 text-white shadow-sm"
           : "bg-white border-stone-100 text-stone-700 hover:border-stone-300 hover:bg-stone-50"
         )}
        >
         <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0",
          builderStep === step.id ? "bg-white/10 text-white" : "bg-stone-50 text-stone-400 border border-stone-100 group-hover:text-stone-700"
         )}>
          <step.icon className="w-3.5 h-3.5" />
         </div>
         <div className="flex-1 min-w-0">
          <p className={cn(
           "text-xs tracking-wider mb-0.5",
           builderStep === step.id ? "text-stone-400" : "text-stone-400"
          )}>{t("Module", "Ενότητα")} {step.id}</p>
          <h4 className={cn("min-w-0 text-sm font-semibold", builderStep === step.id ? "text-white" : "text-stone-900")}>{moduleName(step.title)}</h4>
         </div>
         {step.status === "Completed" ? (
          <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
           <Check className="w-2.5 h-2.5 text-white" />
          </div>
         ) : step.status === "In-Progress" ? (
          <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
           <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
         ) : null}
        </button>
       ))}
      </Card>
     </div>

     {/* Step Content */}
     <div className="lg:col-span-8 space-y-4">
      <AnimatePresence mode="wait">
       <motion.div
        key={builderStep}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -12 }}
        transition={{ duration: 0.25 }}
       >
        <Card className="p-6 rounded-2xl border-stone-100 shadow-sm bg-white">
         <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
           <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 flex items-center justify-center shrink-0">
             <span className="text-white font-mono font-semibold text-sm">{String(builderStep).padStart(2, '0')}</span>
            </div>
            <div>
             <p className="text-xs font-mono text-stone-400 tracking-wider">{t("Module Architecture", "Αρχιτεκτονική ενότητας")}</p>
             <h3 className="text-base font-semibold text-stone-900">
              {builderContent[builderStep as keyof typeof builderContent]?.title || t("Coming Soon", "Έρχεται σύντομα")}
             </h3>
            </div>
           </div>
           <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 rounded-lg border border-stone-100 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-mono text-stone-500 tracking-wider">{t("Secure", "Ασφαλές")}</span>
           </div>
          </div>
          <p className="text-sm text-stone-500 leading-relaxed">
           {builderContent[builderStep as keyof typeof builderContent]?.description}
          </p>

          <div className="space-y-5 pt-4 border-t border-stone-100">
           {builderContent[builderStep as keyof typeof builderContent]?.questions.map((q, i) => (
            <div key={i} className="space-y-2 group">
             <label className="text-sm font-medium text-stone-700 flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-stone-100 text-stone-400 text-xs flex items-center justify-center font-mono group-focus-within:bg-stone-900 group-focus-within:text-white transition-all shrink-0">{String(i + 1).padStart(2, '0')}</span>
              {q}
             </label>
             <textarea 
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all min-h-[90px] leading-relaxed placeholder:text-stone-300 resize-none"
              placeholder={t("Enter your analysis...", "Γράψε την ανάλυσή σου…")}
              value={builderInputs[`${builderStep}-${i}`] || ''}
              onChange={(e) => setBuilderInputs(prev => ({ ...prev, [`${builderStep}-${i}`]: e.target.value }))}
             />
            </div>
           ))}
          </div>

          <div className="flex items-center justify-between pt-2">
           <Button 
            variant="ghost" 
            className="h-9 px-4 rounded-xl text-sm text-stone-400 hover:text-stone-900"
            disabled={builderStep === 1}
            onClick={() => setBuilderStep(prev => prev - 1)}
           >
            ← {t("Previous", "Προηγούμενο")}
           </Button>
           <Button 
            variant="primary"
            className="h-9 px-5 rounded-xl text-sm font-semibold bg-stone-900 text-white hover:bg-stone-800 flex items-center gap-2"
            onClick={() => { if (builderStep < builderSteps.length) { showToast(t('Progress saved', 'Η πρόοδος αποθηκεύτηκε')); setBuilderStep(prev => prev + 1); } else { showToast(t('Module finalized!', 'Η ενότητα οριστικοποιήθηκε!')); } }}
           >
            {builderStep === builderSteps.length ? t("Finalize", "Οριστικοποίηση") : t("Save & Next", "Αποθήκευση και επόμενο")}
            <ArrowRight className="w-3.5 h-3.5" />
           </Button>
          </div>
         </div>
        </Card>
       </motion.div>
      </AnimatePresence>

      <Card className="bg-amber-50 border-amber-100 p-4 rounded-2xl flex gap-4 items-start">
       <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-amber-600 shrink-0 border border-amber-100">
        <Lightbulb className="w-4 h-4" />
       </div>
       <div>
        <div className="flex items-center gap-2 mb-1">
         <h4 className="text-sm font-semibold text-amber-900">{t("Strategic Advisory", "Στρατηγική συμβουλή")}</h4>
         <span className="text-xs font-mono text-amber-600 tracking-wider">{t("Priority:", "Προτεραιότητα:")} {labelOf("High")}</span>
        </div>
        <p className="text-sm text-amber-800/80 leading-relaxed">
         {t("Precision is more valuable than speed at this stage. Ensure your", "Σε αυτό το στάδιο η ακρίβεια μετράει περισσότερο από την ταχύτητα. Βεβαιώσου ότι η")} <span className="font-semibold text-amber-900">{t("Value Proposition", "πρόταση αξίας")}</span> {t("is explicitly linked to a verified market pain point before proceeding.", "συνδέεται ρητά με ένα επαληθευμένο πρόβλημα της αγοράς πριν προχωρήσεις.")}
        </p>
       </div>
      </Card>
     </div>
    </div>
   )}

   {activeTab === 'pitch' && (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
     {/* Slide List */}
     <div className="lg:col-span-4 space-y-3">
      <div className="bg-white border border-stone-100 rounded-2xl p-4 space-y-1.5">
       <p className="text-xs font-mono text-stone-400 tracking-wider px-2 pb-2 border-b border-stone-100">{t("Pitch Deck Slides", "Διαφάνειες pitch deck")}</p>
       {pitchSlides.map((slide) => (
        <button
         key={slide.id}
         onClick={() => setPitchSlide(slide.id)}
         className={cn(
          "w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 group",
          pitchSlide === slide.id
           ? "bg-stone-900 border-stone-900 text-white shadow-sm"
           : "bg-white border-stone-100 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
         )}
        >
         <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
          pitchSlide === slide.id ? "bg-white/10 text-white" : "bg-stone-50 text-stone-500"
         )}>
          <slide.icon className="w-3.5 h-3.5" />
         </div>
         <div className="flex-1 min-w-0">
          <p className={cn("text-xs font-mono mb-0.5", pitchSlide === slide.id ? "text-white/60" : "text-stone-400")}>{t("Slide", "Διαφάνεια")} {String(slide.id).padStart(2,'0')}</p>
          <p className="text-sm font-semibold truncate">{slideTitle(slide.title)}</p>
         </div>
         <div className={cn(
          "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
          slide.status === "complete" ? "bg-emerald-500" : slide.status === "in-progress" ? "bg-amber-400" : "bg-stone-200"
         )}>
          {slide.status === "complete" ? <Check className="w-2.5 h-2.5 text-white" /> : slide.status === "in-progress" ? <div className="w-1 h-1 rounded-full bg-white" /> : null}
         </div>
        </button>
       ))}
      </div>
     </div>

     {/* Slide Editor */}
     <div className="lg:col-span-8 space-y-4">
      <AnimatePresence mode="wait">
       <motion.div
        key={pitchSlide}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
       >
        <Card className="p-6 border-stone-100 shadow-sm bg-white">
         <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
           <div className="w-9 h-9 rounded-xl bg-stone-900 flex items-center justify-center">
            <span className="text-white font-mono text-sm font-medium">{String(pitchSlide).padStart(2, '0')}</span>
           </div>
           <div>
            <p className="text-sm text-stone-400 font-mono tracking-wider">{t("Slide", "Διαφάνεια")}</p>
            <h3 className="text-base font-semibold text-stone-900">{slideTitle(pitchSlides[pitchSlide - 1]?.title ?? "")}</h3>
           </div>
          </div>
          <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" title={t("Preview this slide with the studio assistant.", "Προεπισκόπηση της διαφάνειας με τον βοηθό.")} aria-label={t("Preview this slide with the studio assistant.", "Προεπισκόπηση της διαφάνειας με τον βοηθό.")} className="rounded-lg text-stone-400 hover:text-stone-900" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Tell me about pitch slide ${pitchSlides[pitchSlide - 1]?.title || pitchSlide}` } }))}><Eye className="w-4 h-4" /></Button>
           <Button variant="ghost" size="icon" aria-label={t("Edit this slide", "Επεξεργασία διαφάνειας")} className="rounded-lg text-stone-400 hover:text-stone-900" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Help me edit pitch slide ${pitchSlides[pitchSlide - 1]?.title || pitchSlide}` } }))}><Edit3 className="w-4 h-4" /></Button>
           <Button variant="ghost" size="icon" aria-label={t("Download this deck", "Λήψη του deck")} className="rounded-lg text-stone-400 hover:text-stone-900" onClick={() => { showToast(t('Download started', 'Η λήψη ξεκίνησε')); window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'How do I export my pitch deck?' } })); }}><Download className="w-4 h-4" /></Button>
          </div>
         </div>

         {/* Slide Canvas Preview */}
         <div className="aspect-video bg-stone-50 rounded-xl flex items-center justify-center border border-stone-100 relative overflow-hidden mb-5">
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #78716c 1px, transparent 0)', backgroundSize: '20px 20px' }} />
          <div className="relative z-10 text-center space-y-3 p-8">
           {(() => {
            const s = pitchSlides[pitchSlide - 1];
            if (!s) return null;
            return (
             <>
              <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto border border-stone-200">
               <s.icon className="w-6 h-6 text-stone-400" />
              </div>
              <p className="text-stone-400 text-sm font-mono tracking-wide">{t("Slide", "Διαφάνεια")} {pitchSlide} · {slideTitle(s.title)}</p>
              <p className="text-stone-300 text-sm">{t("Click", "Πάτα")} <span className="text-stone-500">{t("Edit", "Επεξεργασία")}</span> {t("to add content to this slide", "για να προσθέσεις περιεχόμενο σε αυτή τη διαφάνεια")}</p>
             </>
            );
           })()}
          </div>
         </div>

         <div className="flex items-center justify-between">
          <Button
           variant="ghost"
           className="h-9 px-4 text-sm font-medium text-stone-400 hover:text-stone-900"
           disabled={pitchSlide === 1}
           onClick={() => setPitchSlide(p => p - 1)}
          >
           ← {t("Previous", "Προηγούμενο")}
          </Button>
          <div className="flex items-center gap-1">
           {pitchSlides.map((_, i) => (
            <button key={i} onClick={() => setPitchSlide(i + 1)} className={cn("w-1.5 h-1.5 rounded-full transition-all", pitchSlide === i + 1 ? "bg-stone-900 w-4" : "bg-stone-200")} />
           ))}
          </div>
          <Button
           variant="ghost"
           className="h-9 px-4 text-sm font-medium text-stone-400 hover:text-stone-900"
           disabled={pitchSlide === pitchSlides.length}
           onClick={() => setPitchSlide(p => p + 1)}
          >
           {t("Next", "Επόμενο")} →
          </Button>
         </div>
        </Card>

        {/* AI Tip */}
        <Card className="bg-stone-50 border-stone-100 p-4 flex gap-3 items-start">
         <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
         <Zap className="w-3.5 h-3.5 text-amber-600" />
        </div>
         <div>
          <p className="text-sm font-semibold text-stone-900 mb-1">{t("Investor Insight", "Επενδυτική ματιά")}</p>
          <p className="text-sm text-stone-500 leading-relaxed">{pitchSlides[pitchSlide - 1]?.tip}</p>
         </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
         {[
          { label: "Export PDF", icon: Download },
          { label: "Share Link", icon: Globe },
          { label: "Send to Mentor", icon: Send },
         ].map((a) => (
          <button key={a.label} type="button" onClick={() => a.label === 'Send to Mentor' ? navigate('/mentors') : window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: a.label === 'Export PDF' ? 'How do I export my pitch deck?' : 'How do I share my pitch deck?' } }))} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-stone-200 hover:border-stone-400 hover:bg-stone-50 transition-all group text-center">
           <a.icon className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-900 transition-colors" />
           <span className="text-xs font-medium text-stone-500 group-hover:text-stone-900">{a.label === 'Export PDF' ? t('Export PDF', 'Εξαγωγή PDF') : a.label === 'Share Link' ? t('Share Link', 'Κοινοποίηση συνδέσμου') : t('Send to Mentor', 'Αποστολή σε μέντορα')}</span>
          </button>
         ))}
        </div>
       </motion.div>
      </AnimatePresence>
     </div>
    </div>
   )}

   {activeTab === 'applications' && (
    <div className="space-y-4">
     {/* Stats Row */}
     <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
       { label: t("Total Applied", "Σύνολο αιτήσεων"), value: String(applications.length), sub: t("Programs", "Προγράμματα"), color: "text-stone-900" },
       { label: t("In Review", "Σε έλεγχο"), value: "1", sub: t("active", "ενεργό"), color: "text-amber-600" },
       { label: t("Submitted", "Υποβλήθηκε"), value: "1", sub: t("awaiting", "σε αναμονή"), color: "text-blue-600" },
       { label: t("Success Rate", "Ποσοστό επιτυχίας"), value: "0%", sub: t("so far", "μέχρι τώρα"), color: "text-stone-400" },
      ].map((stat) => (
       <Card key={stat.label} className="p-4 border-stone-100">
        <p className="text-xs text-stone-400 font-semibold tracking-wider mb-1">{stat.label}</p>
        <p className={cn("text-base font-bold tracking-tight", stat.color)}>{stat.value}</p>
        <p className="text-xs text-stone-400 mt-0.5">{stat.sub}</p>
       </Card>
      ))}
     </div>

     {/* Applications List */}
     <div className="space-y-2">
      {applications.map((app, index) => {
       const statusConfig = {
        submitted: { label: statusWord("Submitted"), color: "text-blue-600 bg-blue-50 border-blue-100" },
        "in-review": { label: statusWord("In Review"), color: "text-amber-600 bg-amber-50 border-amber-100" },
        draft: { label: statusWord("Draft"), color: "text-stone-500 bg-stone-50 border-stone-200" },
        rejected: { label: statusWord("Rejected"), color: "text-red-500 bg-red-50 border-red-100" },
        accepted: { label: statusWord("Accepted"), color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
       }[app.status] ?? { label: statusWord(app.status), color: "text-stone-500 bg-stone-50 border-stone-200" };
       return (
        <motion.div
         key={app.id}
         initial={{ opacity: 0, y: 6 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: index * 0.04 }}
        >
         <Card className="px-5 py-4 border-stone-100 hover:border-stone-300 transition-all group cursor-pointer" onClick={() => setExpandedAppId(expandedAppId === app.id ? null : app.id)}>
          <div className="flex items-center gap-4">
           <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
             <h4 className="text-sm font-semibold text-stone-900">{app.program}</h4>
             <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", statusConfig.color)}>{statusConfig.label}</span>
             <span className="text-xs text-stone-400 px-2 py-0.5 rounded-full border border-stone-100 bg-stone-50">{typeLabel(app.type)}</span>
            </div>
            <p className="text-sm text-stone-500 leading-relaxed mb-1.5 line-clamp-1">{noteLabel(app.note)}</p>
            <div className="flex items-center gap-3">
             <span className="text-xs text-stone-400 flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> {whenLabel(app.deadline)}</span>
             <span className="text-xs text-stone-300">·</span>
             <span className="text-xs text-stone-400 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {t("Decision:", "Απόφαση:")} {whenLabel(app.decision)}</span>
            </div>
           </div>
           <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
             <p className="text-xs text-stone-400 tracking-wider mb-1">{t("Match", "Ταίριασμα")}</p>
             <div className="flex items-center gap-1.5">
              <div className="w-16 h-1 bg-stone-100 rounded-full overflow-hidden">
               <div
                className={cn("h-full rounded-full", app.match >= 80 ? "bg-emerald-500" : app.match >= 65 ? "bg-amber-400" : "bg-stone-300")}
                style={{ width: `${app.match}%` }}
               />
              </div>
              <p className={cn("text-sm font-bold", app.match >= 80 ? "text-emerald-600" : app.match >= 65 ? "text-amber-500" : "text-stone-400")}>{app.match}%</p>
             </div>
            </div>
            <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg text-stone-200 hover:text-stone-900" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setExpandedAppId(expandedAppId === app.id ? null : app.id); }}>
             <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", expandedAppId === app.id && "rotate-90")} />
            </Button>
           </div>
          </div>
         </Card>
        </motion.div>
       );
      })}
     </div>

     {/* Add New CTA */}
     {trackingName === null ? (
      <button onClick={() => setTrackingName('')} className="w-full p-4 rounded-xl border-2 border-dashed border-stone-200 hover:border-stone-400 transition-all text-stone-400 hover:text-stone-600 flex items-center justify-center gap-2 text-sm font-medium group">
       <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
       {t("Track New Application", "Καταγραφή νέας αίτησης")}
      </button>
     ) : (
      <form onSubmit={(e) => { e.preventDefault(); const raw = new FormData(e.currentTarget).get('program'); const program = typeof raw === 'string' ? raw.trim() : ''; if (!program) return; const item: TrackedApplication = { id: Date.now(), program, type: 'Program', status: 'draft', deadline: '—', decision: '—', match: 0, note: '' }; const tracked = [item, ...readTracked()]; writeTracked(tracked); setApplications([...tracked, ...(isDemoMode ? starterApplications : [])]); setTrackingName(null); }} className="w-full p-4 rounded-xl border-2 border-dashed border-stone-200 flex items-center gap-2">
       <input name="program" value={trackingName} onChange={(e) => setTrackingName(e.target.value)} placeholder={t("Program name", "Όνομα προγράμματος")} className="flex-1 bg-transparent text-sm text-stone-900 outline-none" autoFocus />
       <button type="submit" className="text-sm font-medium text-stone-900">{t("Save", "Αποθήκευση")}</button>
      </form>
     )}
    </div>
   )}

   {/* Tools Tab - Tool Categories */}
   {activeTab === 'tools' && (
    <div className="space-y-6">
     {/* Search Bar */}
     <div className="flex items-center gap-3">
      <div className="relative flex-1">
       <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
       <input
        type="text"
        placeholder={t("Search tools...", "Αναζήτηση εργαλείων…")}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400"
       />
      </div>
     </div>

     {/* Tool Categories Grid */}
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {toolCategories.map((category) => (
       <motion.div
        key={category.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
       >
        <Card className={cn("p-5 border rounded-2xl", category.color)}>
         <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center">
           <category.icon className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium opacity-60">{category.tools.length} {t("tools", "εργαλεία")}</span>
         </div>
         <h3 className="text-base font-semibold mb-1">{category.name}</h3>
         <p className="text-xs opacity-70 mb-4">{category.description}</p>

         <div className="space-y-2">
          {category.tools.slice(0, 3).map((tool) => (
           <button
            key={tool.id}
            onClick={() => markToolUsed(tool.id)}
            className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-white/60 hover:bg-white transition-all text-left group"
           >
            <tool.icon className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
            <div className="flex-1 min-w-0">
             <p className="text-xs font-medium truncate">{tool.name}</p>
             <p className="text-xs opacity-50 truncate">{tool.desc}</p>
            </div>
            <Pin 
             className={cn(
              "w-3 h-3 transition-all cursor-pointer",
              pinnedTools.includes(tool.id) ? "fill-current" : "opacity-0 group-hover:opacity-100"
             )}
             onClick={(e) => { e.stopPropagation(); togglePin(tool.id); }}
            />
           </button>
          ))}
          {category.tools.length > 3 && (
           <p className="text-xs opacity-50 text-center py-1">+{category.tools.length - 3} {t("more", "ακόμη")}</p>
          )}
         </div>
        </Card>
       </motion.div>
      ))}
     </div>
    </div>
   )}

   {/* Templates Tab */}
   {activeTab === 'templates' && (
    <div className="space-y-6">
     {/* Header */}
     <div className="flex items-center justify-between">
      <div>
       <h3 className="text-base font-semibold text-stone-900">{t("Template Library", "Βιβλιοθήκη προτύπων")}</h3>
       <p className="text-xs text-stone-400">{t("Downloadable, copyable templates for every stage", "Πρότυπα για κάθε στάδιο, έτοιμα για λήψη και αντιγραφή")}</p>
      </div>
      <div className="flex items-center gap-2">
       <div className="relative">
        <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
         type="text"
         placeholder={t("Find templates...", "Εύρεση προτύπων…")}
         value={templateSearch}
         onChange={(e) => setTemplateSearch(e.target.value)}
         className="pl-8 pr-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-stone-900/10 w-48"
        />
       </div>
      </div>
     </div>

     {/* AI Suggestions */}
     <Card className="bg-amber-50 border-amber-100 p-4">
      <div className="flex items-center gap-2 mb-3">
       <Sparkles className="w-4 h-4 text-amber-600" />
       <h4 className="text-sm font-semibold text-amber-900">{t("AI-Recommended for You", "Προτάσεις AI για σένα")}</h4>
      </div>
      <div className="space-y-2">
       {aiSuggestions.map((suggestion) => (
        <div key={suggestion.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-100/50">
         <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
           <suggestion.icon className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div>
           <p className="text-sm font-medium text-stone-900">{suggestion.title}</p>
           <p className="text-xs text-stone-400">{suggestion.reason}</p>
          </div>
         </div>
         <Button size="sm" variant="secondary" className="h-7 text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-200" onClick={() => { if (suggestion.id === 1) setActiveTab('pitch'); else if (suggestion.id === 2) setActiveTab('tools'); else setActiveTab('tools'); }}>
          {suggestion.action}
         </Button>
        </div>
       ))}
      </div>
     </Card>

     {/* Templates Grid */}
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {templates.filter(t => !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase()) || t.category.toLowerCase().includes(templateSearch.toLowerCase())).map((template) => (
       <motion.div
        key={template.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
       >
        <Card className="p-4 border-stone-100 hover:border-stone-300 transition-all group">
         <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center group-hover:bg-stone-200 transition-colors">
           <template.icon className="w-5 h-5 text-stone-500" />
          </div>
          <button 
           onClick={() => togglePin(template.id.toString())}
           className="p-1 hover:bg-stone-100 rounded-lg transition-colors"
          >
           <Bookmark 
            className={cn(
             "w-3.5 h-3.5 transition-all",
             pinnedTools.includes(template.id.toString()) ? "fill-stone-900 text-stone-900" : "text-stone-300"
            )} 
           />
          </button>
         </div>
         <h4 className="text-sm font-semibold text-stone-900 mb-1 truncate">{template.name}</h4>
         <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-1.5 py-0.5 bg-stone-100 rounded text-stone-500">{template.category === 'HR' ? t('HR', 'HR') : template.category === 'Fundraising' ? t('Fundraising', 'Χρηματοδότηση') : labelOf(template.category)}</span>
          <span className="text-xs text-stone-400">{template.format}</span>
         </div>
         <div className="flex items-center justify-between pt-3 border-t border-stone-100">
          <span className="text-xs text-stone-400">{template.downloads.toLocaleString()} {t("downloads", "λήψεις")}</span>
          <div className="flex items-center gap-1">
           <button className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors" title={t("Copy link", "Αντιγραφή συνδέσμου")} onClick={() => { navigator.clipboard.writeText(`https://cofounderbay.app/templates/${template.id}`); showToast(t('Link copied!', 'Ο σύνδεσμος αντιγράφηκε!')); }}>
            <Copy className="w-3 h-3 text-stone-400" />
           </button>
           <button type="button" className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors" title={t("Download", "Λήψη")} onClick={() => { showToast(`${t('Downloading', 'Λήψη')} ${template.name}...`); window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Tell me about ${template.name}` } })); }}>
            <Download className="w-3 h-3 text-stone-400" />
           </button>
           <button type="button" className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors" title={t("Open", "Άνοιξε")} onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Tell me about ${template.name}` } }))}>
            <ExternalLink className="w-3 h-3 text-stone-400" />
           </button>
          </div>
         </div>
        </Card>
       </motion.div>
      ))}
     </div>

     {/* Pinned Templates Section */}
     {pinnedTools.length > 0 && (
      <div className="space-y-3">
       <div className="flex items-center gap-2">
        <Pin className="w-3.5 h-3.5 text-stone-500" />
        <h4 className="text-sm font-semibold text-stone-700">{t("Pinned & Recently Used", "Καρφιτσωμένα και πρόσφατα")}</h4>
       </div>
       <div className="flex flex-wrap gap-2">
        {pinnedTools.map((toolId) => {
         const tool = toolCategories.flatMap(c => c.tools).find(t => t.id === toolId);
         if (!tool) return null;
         return (
          <button
           key={toolId}
           onClick={() => markToolUsed(toolId)}
           className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-medium text-stone-700 transition-colors"
          >
           <tool.icon className="w-3 h-3" />
           {tool.name}
          </button>
         );
        })}
       </div>
      </div>
     )}
    </div>
   )}
  </div>
  </PageShell>
  {/* Toast Notification */}
  <AnimatePresence>
   {toastMsg && (
    <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     exit={{ opacity: 0, y: 20 }}
     className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-xl shadow-xl"
    >
     {toastMsg}
    </motion.div>
   )}
  </AnimatePresence>
  </>
 );
}
