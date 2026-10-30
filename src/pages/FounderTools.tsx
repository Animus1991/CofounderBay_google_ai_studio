import {
 useState,
 useCallback,
 useMemo, useEffect } from "react";
import { useNavigate,
 useSearchParams } from 'react-router-dom';
import { motion,
 AnimatePresence } from "motion/react";
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
 TrendingUp,
 Users,
 DollarSign,
 Globe,
 Map,
 FileCode,
 Scale,
 CreditCard,
 ShoppingCart,
 Headphones,
 Sparkles,
 Pin,
 Search,
 Copy,
 Bookmark,
 BookOpen
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageShell from "../components/ui/PageShell";
import EmptyHint, { ClearFiltersButton } from "../components/ui/EmptyHint";
import { usePageControls } from "../lib/pageControls";
import { User, Startup, FounderStage } from "../types";
import { cn } from "../lib/utils";
import { labelOf } from "../lib/labels";
import { useT } from "../lib/language";
import { keys, readTracked, writeTracked, readValue, writeValue, logActivity, readMilestones, effectiveStatus, type TrackedApplication } from "../lib/localLists";
import { DEMO_APPLICATIONS, DEMO_TOOL_DEADLINES, SOON_DAYS, demoDay } from "../data/demoCatalog";
import { DEMO_VENTURE } from "../data/demoVenture";
import { monthFromToday, shortDay } from "../data/demoClock";
import { formatDate } from "../lib/dates";
import { useStored } from "../lib/useStored";
import { BUILDER_CONTENT, BUILDER_MODULES, builderStatus, readBuilderInputs } from "../lib/builder";
import { useAuth } from "../App";
import { useUIStore } from "../stores/useUIStore";
import { askAssistant } from "../lib/assistantBus";
import { PITCH_SLIDES, draftPitch, effectivePitch, pitchMarkdown, slideStatus, writePitchSlide, type PitchSlideKey } from "../lib/pitch";
import { FOUNDER_TEMPLATES } from "../data/templates";
import { copyText, downloadCsv, downloadWord, markdownToHtml, openPrintable, slugify } from "../lib/download";
import { useLanguage } from "../lib/language";

interface FounderToolsProps {
 user: User;
}

/** The founder's own venture draft — persisted per account (cloud-synced when signed in). */
type StartupDraft = Startup & { dimensions?: Record<string, number> };

export default function FounderTools({ user }: FounderToolsProps) {
 const t = useT();
 const navigate = useNavigate();
 const { profile, isDemoMode } = useAuth();
 const { mode } = useLanguage();
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
 // The tab lives in the URL (?tab=pitch); ?step=… still opens the builder at that step.
 const [searchParams, setSearchParams] = useSearchParams();
 const TOOL_TABS = ['dashboard', 'builder', 'pitch', 'applications', 'tools', 'templates'] as const;
 type ToolTab = (typeof TOOL_TABS)[number];
 const rawToolTab = searchParams.get('tab');
 const activeTab: ToolTab = TOOL_TABS.includes(rawToolTab as ToolTab) ? (rawToolTab as ToolTab) : searchParams.get('step') ? 'builder' : 'dashboard';
 const setActiveTab = (tab: ToolTab) => {
  const next = new URLSearchParams(searchParams);
  if (tab === 'dashboard') next.delete('tab');
  else next.set('tab', tab);
  if (tab !== 'builder') next.delete('step');
  if (tab !== 'pitch') next.delete('slide');
  setSearchParams(next, { replace: true });
 };
 // Pinned tools and builder drafts are account-scoped (and cloud-synced for real accounts).
 const pinnedTools = useStored(() => readValue<string[]>('cfb.pinnedTools', []), ['cfb.pinnedTools']);
 const setPinnedTools = (next: string[]) => writeValue('cfb.pinnedTools', next);
 // Recents are account-scoped like the pins above, so the quick-access strip
 // survives a reload instead of resetting on every visit.
 const recentlyUsed = useStored(() => readValue<string[]>('cfb.recentTools', []), ['cfb.recentTools']);
 const [searchQuery, setSearchQuery] = useState('');
 usePageControls(() => [
  { id: 'tab-dashboard', en: 'Show tools dashboard', el: 'Πίνακας εργαλείων', run: () => setActiveTab('dashboard') },
  { id: 'tab-builder', en: 'Open builder', el: 'Άνοιγμα δημιουργού', run: () => setActiveTab('builder') },
  { id: 'tab-pitch', en: 'Open pitch', el: 'Άνοιγμα pitch', run: () => setActiveTab('pitch') },
  { id: 'tab-applications', en: 'Open applications', el: 'Άνοιγμα αιτήσεων', run: () => setActiveTab('applications') },
  { id: 'tab-tools', en: 'Open tool library', el: 'Βιβλιοθήκη εργαλείων', run: () => setActiveTab('tools') },
  { id: 'tab-templates', en: 'Open templates', el: 'Πρότυπα', run: () => setActiveTab('templates') },
  { id: 'open-deal-room', en: 'Open Deal Room', el: 'Άνοιγμα Deal Room', run: () => useUIStore.getState().setDealRoomModalOpen(true, 'sv-my-venture') },
  { id: 'open-need-wall', en: 'Open Need Wall', el: 'Πίνακας Αναγκών', run: () => useUIStore.getState().setNeedCardWallOpen(true) },
  { id: 'clear-tool-search', en: 'Clear tool search', el: 'Καθάρισε την αναζήτηση εργαλείων', run: () => setSearchQuery('') },
 ], []);
 const [showAssessment, setShowAssessment] = useState(false);
 const builderInputs = useStored(readBuilderInputs, [keys.builderInputs]);
 const setBuilderInputs = (updater: (prev: Record<string, string>) => Record<string, string>) => {
  writeValue(keys.builderInputs, updater(readBuilderInputs()));
 };
 const [templateSearch, setTemplateSearch] = useState('');
 const [expandedAppId, setExpandedAppId] = useState<number | null>(null);
 const [assessmentStep, setAssessmentStep] = useState(0);

 // The founder's venture draft: demo sees the sample startup, real accounts see
 // their own (seeded from the profile) and every edit is persisted per account.
 const savedStartup = useStored(() => readValue<Partial<StartupDraft>>('cfb.startup', {}), ['cfb.startup']);
 const mockStartup: StartupDraft = useMemo(() => {
  const stageValues = Object.values(FounderStage) as string[];
  const profileStage = profile?.stage && stageValues.includes(profile.stage) ? (profile.stage as FounderStage) : undefined;
  const fallbackName = isDemoMode ? DEMO_VENTURE.name : '';
  return {
   id: savedStartup.id ?? 'startup',
   ownerId: user.id,
   name: savedStartup.name ?? profile?.company ?? fallbackName,
   oneLiner: savedStartup.oneLiner ?? (isDemoMode ? t(DEMO_VENTURE.oneLiner, DEMO_VENTURE.oneLinerEl) : ''),
   description: savedStartup.description ?? (isDemoMode ? DEMO_VENTURE.description : ''),
   industry: savedStartup.industry ?? (isDemoMode ? ['Sustainability', 'CleanTech', 'PropTech'] : (profile?.industry ? [String(profile.industry)] : [])),
   stage: savedStartup.stage ?? profileStage ?? (isDemoMode ? FounderStage.PROTOTYPE : FounderStage.IDEA),
   readinessScore: savedStartup.readinessScore ?? (isDemoMode ? DEMO_VENTURE.readinessScore : 0),
   createdAt: savedStartup.createdAt ?? new Date().toISOString(),
   updatedAt: savedStartup.updatedAt ?? new Date().toISOString(),
   dimensions: savedStartup.dimensions,
  };
 }, [savedStartup, profile, isDemoMode, user.id, t]);
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
 const [pitchSlide, setPitchSlide] = useState(() => {
  const index = PITCH_SLIDES.findIndex((slide) => slide.key === searchParams.get('slide'));
  return index >= 0 ? index + 1 : 1;
 });
 const slideParam = searchParams.get('slide');
 useEffect(() => {
  const index = PITCH_SLIDES.findIndex((slide) => slide.key === slideParam);
  if (index >= 0) setPitchSlide(index + 1);
 }, [slideParam]);

 const builderContent: Record<number, { title: string; description: string; questions: string[] }> = Object.fromEntries(
  Object.entries(BUILDER_CONTENT).map(([id, content]) => [id, {
   title: t(content.title.en, content.title.el),
   description: t(content.description.en, content.description.el),
   questions: content.questions.map((question) => t(question.en, question.el)),
  }])
 );

 // Slide text lives in the account's pitch list; status is computed from it, never fixed.
 const pitchContent = useStored(effectivePitch, [keys.pitch, keys.canvas, keys.builderInputs, keys.startup, keys.round]);
 const pitchDraft = useMemo(() => draftPitch(), [pitchContent]); // eslint-disable-line react-hooks/exhaustive-deps -- re-derive when any source list changes
 const PITCH_ICONS: Record<PitchSlideKey, typeof Presentation> = { cover: Presentation, problem: AlertCircle, solution: Lightbulb, market: Globe, model: DollarSign, traction: TrendingUp, team: Users, ask: Target };
 const PITCH_TIPS: Record<PitchSlideKey, string> = {
  cover: t("Lead with a bold statement that captures the problem's magnitude.", "Ξεκίνα με μια τολμηρή δήλωση που δείχνει το μέγεθος του προβλήματος."),
  problem: t("Use real data points — customer quotes and market research strengthen credibility.", "Χρησιμοποίησε πραγματικά δεδομένα — αποφθέγματα πελατών και έρευνα αγοράς δίνουν αξιοπιστία."),
  solution: t("One clear diagram beats 200 words. Show, don't tell.", "Ένα καθαρό διάγραμμα κερδίζει 200 λέξεις. Δείξε, μην εξηγείς."),
  market: t("TAM → SAM → SOM funnel. Investors want to see a $1B+ TAM.", "Χωνί TAM → SAM → SOM. Οι επενδυτές θέλουν να δουν TAM $1B+."),
  model: t("Keep it to one revenue stream in early stage — complexity signals confusion.", "Μείνε σε μία ροή εσόδων στο early stage — η πολυπλοκότητα δείχνει σύγχυση."),
  traction: t("Show week-over-week growth. Even small numbers with strong growth rate impress.", "Δείξε week-over-week ανάπτυξη. Ακόμα και μικροί αριθμοί με δυνατό ρυθμό εντυπωσιάζουν."),
  team: t("Highlight unfair advantages — why is YOUR team the one to win this?", "Ανάδειξε τα unfair advantages — γιατί η δική σου ομάδα θα το κερδίσει;"),
  ask: t("Be specific: '$1.2M to hire 3 engineers and reach $500K ARR by Q4'.", "Πες το συγκεκριμένα: «$1.2M για 3 μηχανικούς και $500K ARR μέχρι το Q4»."),
 };
 const pitchSlides = PITCH_SLIDES.map((slide, index) => ({
  id: index + 1,
  key: slide.key,
  title: slide.en,
  icon: PITCH_ICONS[slide.key],
  status: slideStatus(pitchContent[slide.key]),
  tip: PITCH_TIPS[slide.key],
 }));
 const [editingSlide, setEditingSlide] = useState<PitchSlideKey | null>(null);
 const [slideDraft, setSlideDraft] = useState('');
 const startEditingSlide = (key: PitchSlideKey) => { setEditingSlide(key); setSlideDraft(pitchContent[key] ?? pitchDraft[key] ?? ''); };
 const saveSlide = () => {
  if (!editingSlide) return;
  writePitchSlide(editingSlide, slideDraft.trim());
  logActivity({ kind: 'profile', title: `Pitch slide updated: ${editingSlide}`, titleEl: `Ενημερώθηκε διαφάνεια pitch: ${editingSlide}`, href: '/founder-tools' });
  setEditingSlide(null);
  showToast(t('Slide saved', 'Η διαφάνεια αποθηκεύτηκε'));
 };
 const deckTitle = () => `${(readValue<Record<string, unknown>>(keys.startup, {}).name as string | undefined)?.trim() || t('Pitch deck', 'Pitch deck')}`;
 const deckMarkdown = () => pitchMarkdown(pitchContent, mode, deckTitle());
 const downloadDeck = () => {
  downloadWord(`${slugify(deckTitle()) || 'pitch-deck'}-pitch`, deckTitle(), deckMarkdown());
  showToast(t('Pitch outline downloaded (.doc)', 'Το περίγραμμα pitch κατέβηκε (.doc)'));
 };
 const printDeck = () => {
  if (!openPrintable(deckTitle(), markdownToHtml(deckMarkdown()))) showToast(t('Allow pop-ups to print or save as PDF', 'Επίτρεψε τα αναδυόμενα για εκτύπωση ή αποθήκευση PDF'));
 };
 const shareDeck = async () => {
  const text = deckMarkdown();
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
   try { await navigator.share({ title: deckTitle(), text }); return; } catch { /* fall through to copy */ }
  }
  showToast((await copyText(text)) ? t('Pitch outline copied', 'Το περίγραμμα pitch αντιγράφηκε') : t('Copy did not work in this browser', 'Η αντιγραφή δεν λειτούργησε σε αυτόν τον περιηγητή'));
 };

 // Sample applications keep their place in time relative to today (data/demoCatalog).
 const starterApplications: TrackedApplication[] = DEMO_APPLICATIONS.map((app) => ({
  id: app.id,
  program: app.program,
  type: app.type,
  status: app.status,
  deadline: app.deadlineInDays === null ? t('N/A', 'Δ/Υ') : shortDay(demoDay(app.deadlineInDays), mode),
  decision: monthFromToday(app.decisionInDays, mode),
  match: app.match,
  note: app.note,
 }));
 // Recent achievements and deadlines come from the account's milestones; the sample account keeps its samples.
 const milestoneList = useStored(readMilestones, [keys.milestones]);
 const recentAchievements = isDemoMode
  ? [
    { title: t("First 10 Interviews", "Πρώτες 10 συνεντεύξεις"), date: t("2 days ago", "πριν από 2 ημέρες"), icon: Trophy, color: "text-amber-500", bg: "bg-amber-50 border-amber-100", nav: '/milestones' },
    { title: t("Pitch Deck v1.0", "Pitch deck v1.0"), date: t("1 week ago", "πριν από 1 εβδομάδα"), icon: FileText, color: "text-blue-500", bg: "bg-blue-50 border-blue-100", nav: '/founder-tools' },
   ]
  : milestoneList
   .filter((item) => effectiveStatus(item) === 'Completed')
   .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
   .slice(0, 2)
   .map((item) => ({ title: item.title, date: formatDate(item.updatedAt ?? item.targetDate), icon: Trophy, color: "text-amber-500", bg: "bg-amber-50 border-amber-100", nav: '/milestones' }));
 const dayDiff = (iso: string) => Math.round((new Date(`${iso.slice(0, 10)}T12:00:00`).getTime() - new Date(`${demoDay(0)}T12:00:00`).getTime()) / 86_400_000);
 const deadlineRow = (title: string, inDays: number, nav?: string) => ({
  title,
  date: shortDay(demoDay(inDays), mode),
  icon: Clock,
  urgent: inDays <= SOON_DAYS,
  color: inDays <= SOON_DAYS ? "text-red-500" : "text-amber-500",
  bg: inDays <= SOON_DAYS ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100",
  nav,
 });
 const upcomingDeadlines = isDemoMode
  ? DEMO_TOOL_DEADLINES.map((item) => deadlineRow(item.title, item.inDays))
  : milestoneList
   .filter((item) => effectiveStatus(item) !== 'Completed' && item.targetDate && dayDiff(item.targetDate) >= 0)
   .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
   .slice(0, 2)
   .map((item) => deadlineRow(item.title, dayDiff(item.targetDate), '/milestones'));
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
   color: 'bg-red-50 border-red-100 text-red-700',
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
   color: 'bg-violet-50 border-violet-100 text-violet-700',
   tools: [
    { id: 'hiring', name: t('Hiring Plan', 'Πλάνο προσλήψεων'), desc: t('12-month hiring roadmap', 'Roadmap προσλήψεων 12 μηνών'), icon: Users },
    { id: 'offer', name: t('Offer Letter', 'Επιστολή προσφοράς'), desc: t('Employee offer template', 'Πρότυπο προσφοράς εργασίας'), icon: FileText },
    { id: 'equity', name: t('Equity Grant', 'Equity grant'), desc: t('ESOP grant calculator', 'Υπολογιστής ESOP grant'), icon: CreditCard },
    { id: 'handbook', name: t('Employee Handbook', 'Εγχειρίδιο εργαζομένων'), desc: t('Culture & policy template', 'Πρότυπο κουλτούρας και πολιτικής'), icon: BookOpen },
    { id: 'reviews', name: t('Performance Reviews', 'Αξιολογήσεις απόδοσης'), desc: t('Review cycle template', 'Πρότυπο κύκλου αξιολόγησης'), icon: Star },
   ]
  },
 ];

 // Templates Library — real starter files, built in the reader's language.
 const TEMPLATE_ICONS: Record<string, typeof FileText> = { Accelerator: FileText, Fundraising: Presentation, Legal: Scale, Finance: BarChart3, Product: Map, HR: Users, Marketing: ShoppingCart };
 const templates = FOUNDER_TEMPLATES.map((template) => ({
  ...template,
  name: t(template.name.en, template.name.el),
  icon: template.id === 8 ? FileCode : TEMPLATE_ICONS[template.category] ?? FileText,
  formatLabel: template.format === 'csv' ? t('Spreadsheet (.csv)', 'Λογιστικό φύλλο (.csv)') : t('Word outline (.doc)', 'Περίγραμμα Word (.doc)'),
 }));
 const downloadTemplate = (template: (typeof templates)[number]) => {
  const built = template.build(mode);
  const file = slugify(template.name) || `template-${template.id}`;
  if (built.rows) downloadCsv(`${file}.csv`, built.rows);
  else downloadWord(file, template.name, built.markdown ?? '');
  showToast(t(`${template.name} downloaded`, `Κατέβηκε: ${template.name}`));
 };
 const copyTemplate = async (template: (typeof templates)[number]) => {
  const built = template.build(mode);
  const text = built.markdown ?? (built.rows ?? []).map((row) => row.join('\t')).join('\n');
  showToast((await copyText(text)) ? t('Outline copied', 'Το περίγραμμα αντιγράφηκε') : t('Copy did not work in this browser', 'Η αντιγραφή δεν λειτούργησε σε αυτόν τον περιηγητή'));
 };

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
  writeValue('cfb.recentTools', [toolId, ...readValue<string[]>('cfb.recentTools', []).filter(id => id !== toolId)].slice(0, 5));
 };

 const findTool = (toolId: string) => toolCategories.flatMap(c => c.tools).find(tool => tool.id === toolId);

 // The search box filters both the categories and the tools inside them, and a
 // query also expands each category past its default three entries.
 const toolQuery = searchQuery.trim().toLowerCase();
 const visibleCategories = toolQuery
  ? toolCategories
    .map((category) => ({
     ...category,
     tools: category.tools.filter((tool) =>
      tool.name.toLowerCase().includes(toolQuery) || tool.desc.toLowerCase().includes(toolQuery)),
    }))
    .filter((category) =>
     category.tools.length > 0 || category.name.toLowerCase().includes(toolQuery))
  : toolCategories;

 return (
  <>
  <PageShell
   title={t("Founder Tools", "Εργαλεία ιδρυτή")}
   description={t('From idea to scale.', 'Από την ιδέα στην κλίμακα.')}
   maxWidth="full"
   actions={
    <button
     type="button"
     data-ui="button"
     onClick={() => useUIStore.getState().setDealRoomModalOpen(true, 'sv-my-venture')}
     title={t("Preview how your builder answers, pitch and readiness appear to investors and candidates.", "Προεπισκόπηση του πώς εμφανίζονται σε επενδυτές και υποψήφιους οι απαντήσεις του builder, το pitch και η ετοιμότητα.")}
     className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 hover:border-stone-300 hover:text-stone-900 transition-colors"
    >
     <Eye className="w-3.5 h-3.5" aria-hidden="true" />
     {t("Preview Deal Room", "Προεπισκόπηση Deal Room")}
    </button>
   }
  >
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
         type="button"
         aria-label={t("Close venture diagnostic", "Κλείσιμο διάγνωσης εγχειρήματος")}
         onClick={() => setShowAssessment(false)}
         className="w-8 h-8 rounded-xl hover:bg-stone-200 flex items-center justify-center transition-all group"
        >
         <X className="w-4 h-4 text-stone-400 group-hover:text-stone-900" />
        </button>
       </div>

       <div className="p-5 space-y-5 relative z-10">
        <div className="space-y-3">
         <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 bg-stone-200 rounded-lg">
           <span className="text-xs font-semibold text-stone-900 tracking-wide">
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
       activeTab === tab ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200" : "text-stone-500 hover:text-stone-700"
      )}
     >
      {tabLabel(tab)}
     </button>
    ))}
   </div>

   {activeTab === 'dashboard' && (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
     {/* Readiness Score Card */}
     <Card className="lg:col-span-4 p-5 rounded-2xl bg-white border-stone-100 shadow-sm" contentClassName="space-y-5">
      <div className="flex items-center justify-between">
       <div>
        <h3 className="text-base font-semibold text-stone-900">{t("Readiness Index", "Δείκτης ετοιμότητας")}</h3>
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
        <div className="mb-4" />
        <div className="space-y-3">
         {recentAchievements.length === 0 && (
          <p className="text-xs text-stone-500">{t('Complete a milestone and it shows here.', 'Ολοκλήρωσε ένα ορόσημο και θα εμφανιστεί εδώ.')}</p>
         )}
         {recentAchievements.map((ach, i) => (
          <div key={i} className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate(ach.nav)}>
           <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border shrink-0", ach.bg, ach.color)}>
            <ach.icon className="w-4 h-4" />
           </div>
           <div>
            <p className="text-sm font-semibold text-stone-900">{ach.title}</p>
            <p className="text-xs text-stone-400">{ach.date}</p>
           </div>
          </div>
         ))}
        </div>
       </Card>

       <Card className="p-5 rounded-2xl border-stone-100 shadow-sm bg-white">
        <h3 className="text-sm font-semibold text-stone-900 mb-1">{t("Upcoming Deadlines", "Επερχόμενες προθεσμίες")}</h3>
        <div className="mb-4" />
        <div className="space-y-3">
         {upcomingDeadlines.length === 0 && (
          <p className="text-xs text-stone-500">{t('No dated milestones ahead. Give a milestone a target date and it shows here.', 'Κανένα ορόσημο με ημερομηνία μπροστά. Δώσε ημερομηνία-στόχο σε ένα ορόσημο και θα εμφανιστεί εδώ.')}</p>
         )}
         {upcomingDeadlines.map((dl, i) => (
          <div key={i} className="flex items-center gap-3 group cursor-pointer" onClick={() => { if (dl.nav) navigate(dl.nav); else setActiveTab('applications'); }}>
           <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border shrink-0", dl.bg, dl.color)}>
            <dl.icon className="w-4 h-4" />
           </div>
           <div className="flex-1">
            <p className="text-sm font-semibold text-stone-900">{dl.title}</p>
            <p className={cn("text-xs", dl.urgent ? "text-red-500 font-medium" : "text-stone-400")}>{t("Due", "Λήξη")} {dl.date}</p>
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
      <Card className="p-4 border-stone-100 rounded-2xl" contentClassName="space-y-1">
       <p className="text-xs font-semibold text-stone-400 tracking-wider px-2 pb-2 border-b border-stone-100 mb-2">{t("Modules", "Ενότητες")}</p>
       {builderSteps.map((step) => (
        <button
         key={step.id}
         onClick={() => setBuilderStep(step.id)}
         className={cn(
          "w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 group",
          builderStep === step.id
           ? "bg-stone-200 border-stone-400 text-stone-900 shadow-sm"
           : "bg-white border-stone-100 text-stone-700 hover:border-stone-300 hover:bg-stone-50"
         )}
        >
         <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0",
          builderStep === step.id ? "bg-white border border-stone-300/80 text-stone-900 shadow-2xs" : "bg-stone-50 text-stone-500 border border-stone-100 group-hover:text-stone-700"
         )}>
          <step.icon className="w-3.5 h-3.5" />
         </div>
         <div className="flex-1 min-w-0">
          <p className={cn(
           "text-xs tracking-wider mb-0.5",
           builderStep === step.id ? "text-stone-600 font-medium" : "text-stone-400"
          )}>{t("Module", "Ενότητα")} {step.id}</p>
          <h4 className={cn("min-w-0 text-sm font-semibold", builderStep === step.id ? "text-stone-900" : "text-stone-900")}>{moduleName(step.title)}</h4>
         </div>
         {step.status === "Completed" ? (
          <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
           <Check className="w-2.5 h-2.5 text-white" />
          </div>
         ) : step.status === "In-Progress" ? (
          <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
           <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
         ) : null}
        </button>
       ))}
       {(() => {
        // Drafts the open module from the venture's own data; the result is a card to confirm.
        const step = builderSteps.find((item) => item.id === builderStep);
        if (!step || step.status === 'Completed') return null;
        const key = (['problem', 'solution', 'market', 'model', 'gtm'] as const)[step.id - 1] ?? 'problem';
        return (
         <button
          type="button"
          data-testid="builder-draft-with-assistant"
          onClick={() => askAssistant(`Draft my startup builder ${key} module`)}
          className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-3 text-xs font-medium text-stone-700 transition-colors hover:border-stone-500 hover:text-stone-900"
         >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {t('Draft this module with the assistant', 'Γράψε αυτή την ενότητα με τον βοηθό')}
         </button>
        );
       })()}
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
            <div className="w-9 h-9 rounded-xl bg-stone-200 flex items-center justify-center shrink-0">
             <span className="text-stone-900 font-mono font-semibold text-sm">{String(builderStep).padStart(2, '0')}</span>
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

      <Card className="bg-amber-50 border-amber-100 p-4 rounded-2xl" contentClassName="flex gap-4 items-start">
       <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-amber-600 shrink-0 border border-amber-100">
        <Lightbulb className="w-4 h-4" />
       </div>
       <div>
        <div className="flex items-center gap-2 mb-1">
         <h4 className="text-sm font-semibold text-amber-900">{t("Strategic Advisory", "Στρατηγική συμβουλή")}</h4>
         <span className="text-xs font-mono text-amber-600 tracking-wider">{t("Priority:", "Προτεραιότητα:")} {labelOf("High")}</span>
        </div>
        <p className="text-sm text-stone-700 leading-relaxed">
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
           ? "bg-stone-200 border-stone-400 text-stone-900 shadow-sm"
           : "bg-white border-stone-100 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
         )}
        >
         <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
          pitchSlide === slide.id ? "bg-white border border-stone-300/80 text-stone-900 shadow-2xs" : "bg-stone-50 text-stone-500 border border-stone-100"
         )}>
          <slide.icon className="w-3.5 h-3.5" />
         </div>
         <div className="flex-1 min-w-0">
          <p className={cn("text-xs font-mono mb-0.5", pitchSlide === slide.id ? "text-stone-600 font-medium" : "text-stone-400")}>{t("Slide", "Διαφάνεια")} {String(slide.id).padStart(2,'0')}</p>
          <p className="text-sm font-semibold text-stone-900 truncate">{slideTitle(slide.title)}</p>
         </div>
         <div className={cn(
          "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
          slide.status === "complete" ? "bg-emerald-500" : slide.status === "in-progress" ? "bg-amber-500" : "bg-stone-200"
         )}>
          {slide.status === "complete" ? <Check className="w-2.5 h-2.5 text-white" /> : slide.status === "in-progress" ? <div className="w-1.5 h-1.5 rounded-full bg-white" /> : null}
         </div>
        </button>
       ))}
       {(() => {
        // The assistant drafts every slide that is not complete; each draft is a card to confirm.
        const open = pitchSlides.filter((slide) => slide.status !== 'complete');
        if (open.length === 0) return null;
        return (
         <button
          type="button"
          data-testid="pitch-draft-with-assistant"
          onClick={() => askAssistant(`Write my ${open.map((slide) => slide.key).join(', ')} slides`)}
          className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-3 text-xs font-medium text-stone-700 transition-colors hover:border-stone-500 hover:text-stone-900"
         >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {t(`Draft the ${open.length} unfinished slide${open.length === 1 ? '' : 's'} with the assistant`, `Γράψε με τον βοηθό ${open.length === 1 ? 'τη διαφάνεια που λείπει' : `τις ${open.length} διαφάνειες που λείπουν`}`)}
         </button>
        );
       })()}
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
           <div className="w-9 h-9 rounded-xl bg-stone-200 flex items-center justify-center">
            <span className="text-stone-900 font-mono text-sm font-medium">{String(pitchSlide).padStart(2, '0')}</span>
           </div>
           <div>
            <p className="text-sm text-stone-400 font-mono tracking-wider">{t("Slide", "Διαφάνεια")}</p>
            <h3 className="text-base font-semibold text-stone-900">{slideTitle(pitchSlides[pitchSlide - 1]?.title ?? "")}</h3>
           </div>
          </div>
          <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" title={t("Ask the assistant to review this slide", "Ζήτα από τον βοηθό να ελέγξει τη διαφάνεια")} aria-label={t("Ask the assistant to review this slide", "Ζήτα από τον βοηθό να ελέγξει τη διαφάνεια")} className="rounded-lg text-stone-400 hover:text-stone-900" onClick={() => { const s = pitchSlides[pitchSlide - 1]; askAssistant(`Review my ${s?.title ?? 'pitch'} slide: ${(s && pitchContent[s.key]) || 'empty'}`, { agentId: 'a2' }); }}><Eye className="w-4 h-4" /></Button>
           <Button variant="ghost" size="icon" title={t("Edit this slide", "Επεξεργασία διαφάνειας")} aria-label={t("Edit this slide", "Επεξεργασία διαφάνειας")} aria-pressed={editingSlide !== null} className="rounded-lg text-stone-400 hover:text-stone-900" onClick={() => { const s = pitchSlides[pitchSlide - 1]; if (s) startEditingSlide(s.key); }}><Edit3 className="w-4 h-4" /></Button>
           <Button variant="ghost" size="icon" title={t("Download the deck outline (.doc)", "Λήψη περιγράμματος deck (.doc)")} aria-label={t("Download the deck outline (.doc)", "Λήψη περιγράμματος deck (.doc)")} className="rounded-lg text-stone-400 hover:text-stone-900" onClick={downloadDeck}><Download className="w-4 h-4" /></Button>
          </div>
         </div>

         {/* Slide canvas: the slide's own text, an editor, or a draft from the founder's data */}
         {(() => {
          const s = pitchSlides[pitchSlide - 1];
          if (!s) return null;
          const text = (pitchContent[s.key] ?? '').trim();
          const draft = (pitchDraft[s.key] ?? '').trim();
          if (editingSlide === s.key) {
           return (
            <div className="mb-5 space-y-2">
             <label htmlFor="pitch-slide-editor" className="text-xs font-medium text-stone-500">{t(`What this slide says (${slideTitle(s.title)})`, `Τι λέει η διαφάνεια (${slideTitle(s.title)})`)}</label>
             <textarea
              id="pitch-slide-editor"
              value={slideDraft}
              onChange={(event) => setSlideDraft(event.target.value)}
              rows={6}
              maxLength={1200}
              className="w-full rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-800 focus:border-stone-400 focus:outline-none"
              placeholder={s.tip}
             />
             <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-stone-400">{slideDraft.trim().length}/1200 · {t('60+ characters marks the slide complete', '60+ χαρακτήρες = ολοκληρωμένη διαφάνεια')}</span>
              <div className="flex flex-wrap gap-2">
               {draft && draft !== slideDraft.trim() && (
                <Button type="button" variant="outline" size="sm" className="text-sm" onClick={() => setSlideDraft(draft)}>{t('Use the draft from your data', 'Χρήση πρόχειρου από τα δεδομένα σου')}</Button>
               )}
               <Button type="button" variant="outline" size="sm" className="text-sm" onClick={() => setEditingSlide(null)}>{t('Cancel', 'Ακύρωση')}</Button>
               <Button type="button" size="sm" className="text-sm bg-stone-900 text-white" onClick={saveSlide}>{t('Save slide', 'Αποθήκευση διαφάνειας')}</Button>
              </div>
             </div>
            </div>
           );
          }
          return (
           <div className="aspect-video bg-stone-50 rounded-xl flex items-center justify-center border border-stone-100 relative overflow-hidden mb-5">
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #78716c 1px, transparent 0)', backgroundSize: '20px 20px' }} />
            <div className="relative z-10 max-w-xl space-y-3 p-6 sm:p-8 text-center">
             <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto border border-stone-200">
              <s.icon className="w-6 h-6 text-stone-400" />
             </div>
             <p className="text-stone-500 text-sm font-mono tracking-wide">{t("Slide", "Διαφάνεια")} {pitchSlide} · {slideTitle(s.title)}</p>
             {text ? (
              <p className="text-stone-800 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">{text}</p>
             ) : draft ? (
              <div className="space-y-2">
               <p className="text-stone-500 text-sm leading-relaxed">{t('Draft from your canvas, builder and round:', 'Πρόχειρο από τον καμβά, το builder και τον γύρο σου:')}</p>
               <p className="text-stone-700 text-sm italic leading-relaxed break-words">{draft}</p>
               <Button type="button" variant="outline" size="sm" className="text-sm" onClick={() => startEditingSlide(s.key)}>{t('Edit from this draft', 'Επεξεργασία από το πρόχειρο')}</Button>
              </div>
             ) : (
              <Button type="button" variant="outline" size="sm" className="text-sm" onClick={() => startEditingSlide(s.key)}>{t('Write this slide', 'Γράψε τη διαφάνεια')}</Button>
             )}
            </div>
           </div>
          );
         })()}

         <div className="flex items-center justify-between">
          <Button
           variant="ghost"
           className="h-9 px-4 text-sm font-medium text-stone-400 hover:text-stone-900"
           disabled={pitchSlide === 1}
           onClick={() => setPitchSlide(p => p - 1)}
          >
           ← {t("Previous", "Προηγούμενο")}
          </Button>
          <div className="flex min-w-0 flex-wrap items-center justify-center gap-1">
           {pitchSlides.map((_, i) => (
            <button type="button" aria-label={t(`Go to slide ${i + 1}`, `Μετάβαση στη διαφάνεια ${i + 1}`)} aria-pressed={pitchSlide === i + 1} key={i} onClick={() => setPitchSlide(i + 1)} className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900">
             <span aria-hidden="true" className={cn("h-1.5 rounded-full transition-all", pitchSlide === i + 1 ? "bg-stone-900 w-4" : "bg-stone-200 w-1.5")} />
            </button>
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
        <Card className="bg-stone-50 border-stone-100 p-4" contentClassName="flex gap-3 items-start">
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
          <button key={a.label} type="button" onClick={() => { if (a.label === 'Send to Mentor') navigate('/mentors'); else if (a.label === 'Export PDF') printDeck(); else void shareDeck(); }} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-stone-200 hover:border-stone-400 hover:bg-stone-50 transition-all group text-center">
           <a.icon className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-900 transition-colors" />
           <span className="text-xs font-medium text-stone-500 group-hover:text-stone-900">{a.label === 'Export PDF' ? t('Print / PDF', 'Εκτύπωση / PDF') : a.label === 'Share Link' ? t('Share outline', 'Κοινοποίηση περιγράμματος') : t('Send to Mentor', 'Αποστολή σε μέντορα')}</span>
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
            <Button variant="ghost" size="icon" aria-label={expandedAppId === app.id ? t("Collapse application details", "Σύμπτυξη στοιχείων αίτησης") : t("Expand application details", "Ανάπτυξη στοιχείων αίτησης")} aria-expanded={expandedAppId === app.id} className="w-7 h-7 rounded-lg text-stone-200 hover:text-stone-900" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setExpandedAppId(expandedAppId === app.id ? null : app.id); }}>
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
       <button type="submit" className="text-sm font-medium text-stone-900">{t("Track application", "Καταγραφή αίτησης")}</button>
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
      {toolQuery && (
       <button type="button" onClick={() => setSearchQuery('')} className="text-xs font-medium text-stone-500 hover:text-stone-900">
        {t('Clear', 'Καθάρισε')}
       </button>
      )}
     </div>

     {/* Quick access: the tools this account opened most recently */}
     {recentlyUsed.length > 0 && !toolQuery && (
      <div className="space-y-2">
       <h4 className="text-xs font-semibold text-stone-500 tracking-wider">{t("Recently used", "Πρόσφατα")}</h4>
       <div className="flex flex-wrap gap-2">
        {recentlyUsed.map((toolId) => {
         const tool = findTool(toolId);
         if (!tool) return null;
         return (
          <button
           key={toolId}
           type="button"
           onClick={() => markToolUsed(toolId)}
           className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 hover:border-stone-400 rounded-lg text-xs font-medium text-stone-700 transition-colors"
          >
           <tool.icon className="w-3 h-3 text-stone-400" />
           {tool.name}
          </button>
         );
        })}
       </div>
      </div>
     )}

     {/* Tool Categories Grid */}
     {visibleCategories.length === 0 ? (
      <EmptyHint
       title={t('No tool matches that search', 'Κανένα εργαλείο δεν ταιριάζει με την αναζήτηση')}
       detail={t('Try a shorter word, or clear the search to see every category.', 'Δοκίμασε μια πιο σύντομη λέξη, ή καθάρισε την αναζήτηση για να δεις όλες τις κατηγορίες.')}
      >
       <ClearFiltersButton onClick={() => setSearchQuery('')}>{t('Clear search', 'Καθάρισε την αναζήτηση')}</ClearFiltersButton>
      </EmptyHint>
     ) : (
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {visibleCategories.map((category) => (
       <motion.div
        key={category.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
       >
        <Card className={cn("p-5 border rounded-2xl", category.color)}>
         <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-white border border-stone-200/70 flex items-center justify-center shadow-2xs">
           <category.icon className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-stone-600">{category.tools.length} {t("tools", "εργαλεία")}</span>
         </div>
         <h3 className="text-base font-semibold text-stone-900 mb-1">{category.name}</h3>
         <p className="text-xs text-stone-600 mb-4">{category.description}</p>

         <div className="space-y-2">
          {(toolQuery ? category.tools : category.tools.slice(0, 3)).map((tool) => (
           <button
            key={tool.id}
            onClick={() => markToolUsed(tool.id)}
            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-stone-200/60 hover:border-stone-300 hover:shadow-2xs transition-all text-left group"
           >
            <tool.icon className="w-4 h-4 shrink-0 opacity-85 group-hover:opacity-100" />
            <div className="flex-1 min-w-0">
             <p className="text-xs font-semibold text-stone-900 truncate">{tool.name}</p>
             <p className="text-xs text-stone-500 truncate">{tool.desc}</p>
            </div>
            <Pin 
             className={cn(
              "w-3.5 h-3.5 shrink-0 transition-all cursor-pointer",
              pinnedTools.includes(tool.id) ? "fill-current text-stone-900" : "text-stone-400 opacity-0 group-hover:opacity-100"
             )}
             onClick={(e) => { e.stopPropagation(); togglePin(tool.id); }}
            />
           </button>
          ))}
          {!toolQuery && category.tools.length > 3 && (
           <p className="text-xs font-medium text-stone-600 text-center py-1">+{category.tools.length - 3} {t("more", "ακόμη")}</p>
          )}
         </div>
        </Card>
       </motion.div>
      ))}
     </div>
     )}
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
      <div className="space-y-2.5">
       {aiSuggestions.map((suggestion) => (
        <div key={suggestion.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-amber-200/60">
         <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200/70 flex items-center justify-center shrink-0">
           <suggestion.icon className="w-3.5 h-3.5 text-amber-700" />
          </div>
          <div className="min-w-0">
           <p className="text-sm font-semibold text-stone-900">{suggestion.title}</p>
           <p className="text-xs text-stone-500 leading-relaxed">{suggestion.reason}</p>
          </div>
         </div>
         <Button size="sm" variant="secondary" className="h-8 px-3.5 text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 shrink-0 self-start sm:self-center" onClick={() => { if (suggestion.id === 1) setActiveTab('pitch'); else if (suggestion.id === 2) setActiveTab('tools'); else setActiveTab('tools'); }}>
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
           type="button"
           aria-label={t("Toggle saved template", "Αλλαγή αποθήκευσης προτύπου")}
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
          <span className="text-xs text-stone-400">{template.formatLabel}</span>
         </div>
         <div className="flex items-center justify-between pt-3 border-t border-stone-100">
          <button type="button" className="text-xs font-medium text-stone-500 hover:text-stone-900 hover:underline" onClick={() => askAssistant(`Tell me about ${template.name}`)}>
           {t("Ask about it", "Ρώτα γι’ αυτό")}
          </button>
          <div className="flex items-center gap-1">
           <button type="button" className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors" title={t("Copy the outline", "Αντιγραφή περιγράμματος")} aria-label={t(`Copy the ${template.name} outline`, `Αντιγραφή περιγράμματος: ${template.name}`)} onClick={() => { void copyTemplate(template); }}>
            <Copy className="w-3 h-3 text-stone-400" />
           </button>
           <button type="button" className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors" title={t("Download", "Λήψη")} aria-label={t(`Download ${template.name}`, `Λήψη: ${template.name}`)} onClick={() => downloadTemplate(template)}>
            <Download className="w-3 h-3 text-stone-400" />
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
        <h4 className="text-sm font-semibold text-stone-700">{t("Pinned", "Καρφιτσωμένα")}</h4>
       </div>
       <div className="flex flex-wrap gap-2">
        {pinnedTools.map((toolId) => {
         // Pins hold library tools and saved templates (by template id); both show here.
         const tool = findTool(toolId);
         const template = tool ? undefined : templates.find((item) => String(item.id) === toolId);
         if (!tool && !template) return null;
         const Icon = tool ? tool.icon : template!.icon;
         return (
          <button
           key={toolId}
           type="button"
           onClick={() => (tool ? markToolUsed(toolId) : downloadTemplate(template!))}
           title={template ? t(`Download ${template.name}`, `Λήψη: ${template.name}`) : undefined}
           className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-medium text-stone-700 transition-colors"
          >
           <Icon className="w-3 h-3" />
           {tool ? tool.name : template!.name}
           {template && <Download className="w-3 h-3 text-stone-400" aria-hidden="true" />}
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
