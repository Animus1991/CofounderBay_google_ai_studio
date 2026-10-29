import {
 useState,
 useCallback,
 useRef,
 useMemo,
 useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { motion,
 AnimatePresence } from "motion/react";
import {
 DollarSign,
 Search,
 SlidersHorizontal,
 ArrowRight,
 Clock,
 Users,
 Briefcase,
 ChevronRight,
 Star,
 FileText,
 Zap,
 Calendar,
 ExternalLink,
 CheckCircle2,
 Building2,
 Rocket,
 BadgeDollarSign,
 Target,
 FolderOpen,
 Lock,
 Unlock,
 Video,
 Phone,
 Mail,
 Tag,
 Calculator,
 Shield,
 History,
 BarChart2,
 Download,
 Share2,
 Eye,
 Plus,
 X,
 Pencil
} from "lucide-react";
import Card from "../components/ui/Card";
import Disclosure from "../components/ui/Disclosure";
import Button from "../components/ui/Button";
import PageShell from "../components/ui/PageShell";
import { sessionFromMeetingDraft } from '../lib/meetingDraft';
import FactLine from "../components/ui/FactLine";
import { User } from "../types";
import { cn } from "../lib/utils";
import { labelOf } from "../lib/labels";
import { useT } from "../lib/language";
import { formatDate } from "../lib/dates";
import { addRoomFile, addSession, keys, listKeys, PIPELINE_STAGES, readIds, readRoomFiles, readRound, removePipelineInvestor, setPipelineStage, toggleId, trackApplication, upsertPipelineInvestor, writeRound, type RoomFile, type Round, type RoundInvestor } from "../lib/localLists";
import EmptyHint, { AskLink, ClearFiltersButton } from "../components/ui/EmptyHint";
import { usePeople } from "../lib/directory";
import { useStored } from "../lib/useStored";
import { useProtectedDraft } from "../lib/useProtectedDraft";
import DraftNotice from "../components/ui/DraftNotice";
import SaveStatus from "../components/ui/SaveStatus";
import { usePageControls } from "../lib/pageControls";
import { roundMetrics } from "../lib/roundMetrics";
import type { Person } from "../lib/peopleSource";
import { useAuth } from "../App";
import { onCatalog, str, strList, toMillis } from "../lib/catalog";
import { useUIStore } from "../stores/useUIStore";
import { askAssistant } from '../lib/assistantBus';
import { formatBytes, uploadFile, UploadError } from '../lib/files';
import { DEMO_VENTURE } from '../data/demoVenture';
import { DEMO_FUNDING_OPPORTUNITIES, DEMO_FUNDING_PROGRAMS, DEMO_INVESTOR_MEETINGS, DEMO_ROOM_FILES, demoDay } from '../data/demoCatalog';

interface FundraisingProps {
 user: User;
}

type InvestorCard = {
 id: string;
 name: string;
 type: string;
 focus: string[];
 stage: string[];
 location: string;
 checkSize: string;
 portfolio: string | number;
 person?: Person;
};

const STAGE_META: Record<string, { color: string; dot: string }> = {
 "Identified":    { color: "text-stone-500",   dot: "bg-stone-400" },
 "Contacted":     { color: "text-blue-600",    dot: "bg-blue-500" },
 "Meeting":       { color: "text-violet-600",  dot: "bg-violet-500" },
 "Due Diligence": { color: "text-amber-700",   dot: "bg-amber-500" },
 "Term Sheet":    { color: "text-emerald-700", dot: "bg-emerald-500" },
 "Closed":        { color: "text-green-700",   dot: "bg-green-500" },
 "Passed":        { color: "text-rose-500",    dot: "bg-stone-400" },
};

// Sample investors shown to the demo account only — real accounts see the live member directory.
const inputClass =
 "w-full min-h-11 bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-400";

const mockInvestors: InvestorCard[] = [
 { id: "inv_1", name: "Sequoia Capital",       type: "VC",    focus: ["SaaS", "FinTech", "AI"],              stage: ["Seed", "Series A"],              location: "Menlo Park, CA",   checkSize: "$500k–$5M",   portfolio: "312" },
 { id: "inv_2", name: "Naval Ravikant",         type: "Angel", focus: ["Crypto", "Marketplaces", "DeepTech"], stage: ["Pre-Seed", "Seed"],               location: "San Francisco, CA", checkSize: "$25k–$250k",  portfolio: "84" },
 { id: "inv_3", name: "Andreessen Horowitz",    type: "VC",    focus: ["Consumer", "Enterprise", "Bio"],       stage: ["Seed", "Series A", "Series B"],  location: "Menlo Park, CA",   checkSize: "$1M–$50M",    portfolio: "510" },
 { id: "inv_4", name: "First Round Capital",    type: "VC",    focus: ["Early Stage", "Generalist"],           stage: ["Seed"],                          location: "Philadelphia, PA",  checkSize: "$250k–$3M",   portfolio: 195 },
 { id: "inv_5", name: "Bessemer Venture",       type: "VC",    focus: ["Cloud", "Cybersecurity", "HealthTech"],stage: ["Series A", "Series B"],          location: "Redwood City, CA",  checkSize: "$5M–$25M",    portfolio: 240 },
 { id: "inv_6", name: "Index Ventures",         type: "VC",    focus: ["Fintech", "Gaming", "Marketplaces"],   stage: ["Seed", "Series A"],              location: "London / SF",       checkSize: "$1M–$15M",    portfolio: 180 },
];

/** Sample data-room files, "updated" a few days before today (data/demoCatalog). */
const seedRoomFiles = (): RoomFile[] => DEMO_ROOM_FILES.map((file) => ({ name: file.name, size: file.size, views: file.views, updated: demoDay(-file.daysAgo) }));

export default function Fundraising({ user }: FundraisingProps) {
 const t = useT();
 const { isDemoMode, profile } = useAuth();
 const navigate = useNavigate();
 const round = useStored(() => readRound(), [keys.round]);
 const { people: directoryMembers } = usePeople(user.id);
 const [toastMsg, setToastMsg] = useState<string | null>(null);
 const showToast = useCallback((msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 2500); }, []);
 const favoriteInvestors = useStored(() => new Set(readIds(listKeys.watch)), [keys.watch]);
 const meetingDraft = useProtectedDraft('fundraising-meeting', user.id, { type: 'Video Call', investor: 'inv_1', date: '', time: '', notes: '' });
 const selectedMeetingType = meetingDraft.value.type;
 const setSelectedMeetingType = (type: string) => meetingDraft.setValue(previous => ({ ...previous, type }));
 const meetingInvestor = meetingDraft.value.investor;
 const setMeetingInvestor = (investor: string) => meetingDraft.setValue(previous => ({ ...previous, investor }));
 const meetingWhen = meetingDraft.value.time;
 const setMeetingWhen = (time: string) => meetingDraft.setValue(previous => ({ ...previous, time }));
 const meetingDate = meetingDraft.value.date;
 const setMeetingDate = (date: string) => meetingDraft.setValue(previous => ({ ...previous, date }));
 const meetingNotes = meetingDraft.value.notes;
 const setMeetingNotes = (notes: string) => meetingDraft.setValue(previous => ({ ...previous, notes }));
 const [meetingError, setMeetingError] = useState('');
 const [programType, setProgramType] = useState('All');
 const [opportunityType, setOpportunityType] = useState('All');
 const [investorType, setInvestorType] = useState('All');
 const roomFileRef = useRef<HTMLInputElement>(null);
 const [roomUploading, setRoomUploading] = useState(false);
 /** Uploads the bytes (Cloud Storage, or inline for small files) before listing the file — a name alone cannot be downloaded. */
 const uploadRoomFile = async (file: File) => {
  setRoomUploading(true);
  try {
   const uploaded = await uploadFile(file, { folder: 'dataroom', uid: user.id });
   addRoomFile({ name: file.name, size: formatBytes(file.size), views: 0, updated: new Date().toISOString().slice(0, 10), folder: selectedFolder ?? undefined, url: uploaded.url, storage: uploaded.storage, path: uploaded.path });
   showToast(t(`${file.name} uploaded`, `Ανέβηκε: ${file.name}`));
  } catch (error) {
   const code = error instanceof UploadError ? error.code : 'failed';
   showToast(code === 'too-large'
    ? t('That file is over 15 MB — nothing was uploaded.', 'Το αρχείο ξεπερνά τα 15 MB — δεν ανέβηκε.')
    : t('Storage is not available for files this size — nothing was uploaded.', 'Ο χώρος αποθήκευσης δεν είναι διαθέσιμος για αυτό το μέγεθος — δεν ανέβηκε τίποτα.'));
  } finally {
   setRoomUploading(false);
  }
 };
 const extraRoom = useStored(readRoomFiles, [keys.room]);
 const roomFiles = useMemo(() => {
  if (!isDemoMode) return extraRoom;
  const names = new Set(extraRoom.map((file) => file.name));
  return [...extraRoom, ...seedRoomFiles().filter((file) => !names.has(file.name))];
 }, [extraRoom, isDemoMode]);
 const [activeTab, setActiveTab] = useState<"tracker" | "investors" | "programs" | "opportunities">("tracker");
 const [roundEditing, setRoundEditing] = useState(false);
 const roundForm = useProtectedDraft<Round>('fundraising-round', user.id, { ...round });
 const roundDraft = roundForm.value;
 const setRoundDraft = roundForm.setValue;
 const [roundError, setRoundError] = useState('');

 const openRoundEditor = () => { setActiveTab('tracker'); if (!roundForm.dirty) roundForm.reset({ ...round }); setRoundError(''); setRoundEditing(true); };
 const saveRound = () => {
  try {
  const changed = Object.fromEntries(Object.entries(roundDraft).filter(([key, value]) =>
   JSON.stringify(value) !== JSON.stringify(roundForm.baseline[key as keyof Round]))) as Partial<Round>;
  writeRound({ ...readRound(), ...changed });
  roundForm.reset({ ...readRound() });
  setRoundEditing(false);
  setRoundError('');
  showToast(t('Round updated on this device', 'Ο γύρος ενημερώθηκε στη συσκευή'));
  } catch {
   setRoundError(t('Could not save. Your draft is still here — try again.', 'Η αποθήκευση απέτυχε. Το πρόχειρο διατηρήθηκε — δοκίμασε ξανά.'));
  }
 };

 usePageControls(() => [
  { id: 'show-tracker', en: 'Show tracker', el: 'Εμφάνιση παρακολούθησης', run: () => setActiveTab('tracker') },
  { id: 'show-investors', en: 'Show investors', el: 'Εμφάνιση επενδυτών', run: () => setActiveTab('investors') },
  { id: 'show-programs', en: 'Show programs', el: 'Εμφάνιση προγραμμάτων', run: () => setActiveTab('programs') },
  { id: 'show-opportunities', en: 'Show opportunities', el: 'Εμφάνιση ευκαιριών', run: () => setActiveTab('opportunities') },
  { id: 'edit-round', en: 'Edit round', el: 'Επεξεργασία γύρου', run: openRoundEditor },
  { id: 'open-deal-room', en: 'Open Deal Room', el: 'Άνοιγμα Deal Room', run: () => useUIStore.getState().setDealRoomModalOpen(true, 'sv-my-venture') },
 ], [round]);
 const [investorSearch, setInvestorSearch] = useState("");
 const investorSearchRef = useRef<HTMLInputElement>(null);
 const [showMeetingScheduler, setShowMeetingScheduler] = useState(false);
 const [showDocumentRoom, setShowDocumentRoom] = useState(false);
 const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

 // The pipeline lives on the account's round — one source for the table, the funnel and the CRM.
 // The demo account seeds it once below; a real account starts empty and fills it from the Investors tab.
 useEffect(() => {
  if (!isDemoMode) return;
  const current = readRound();
  if (current.pipeline && current.pipeline.length > 0) return;
  writeRound({
   pipeline: [
    { investorId: "inv_1", name: "Sequoia Capital",       stage: "Due Diligence", notes: "Requested financial projections for 2027.",   updatedAt: new Date().toISOString() },
    { investorId: "inv_2", name: "Naval Ravikant",         stage: "Meeting",       notes: "Second meeting scheduled for next Tuesday.",  updatedAt: new Date().toISOString() },
    { investorId: "inv_3", name: "Andreessen Horowitz",    stage: "Contacted",     notes: "Intro sent via Alex.",                        updatedAt: new Date().toISOString() },
    { investorId: "inv_4", name: "First Round Capital",    stage: "Identified",    notes: "Fits our thesis perfectly.",                  updatedAt: new Date().toISOString() },
    { investorId: "inv_5", name: "Bessemer Venture",       stage: "Passed",        notes: "Too early for their current fund.",           updatedAt: new Date().toISOString() },
   ],
  });
 }, [isDemoMode]);

 const pipeline: RoundInvestor[] = round.pipeline ?? [];
 const stageIndex = (stage: string) => Math.max(0, PIPELINE_STAGES.indexOf(stage as (typeof PIPELINE_STAGES)[number]));

 // One source for every round number — the KPI grid, the progress bar and the
 // assistant's round answer all read from the same metrics.
 const metrics = roundMetrics(round);

 // The investors directory: sample funds in the demo, the platform's real investor members otherwise.
 const investorDirectory = useMemo<InvestorCard[]>(() => {
  if (isDemoMode) return mockInvestors;
  return directoryMembers
   .filter((person) => person.roles.concat(person.role).some((role) => /investor/i.test(role)))
   .map((person) => ({
    id: person.id,
    name: person.company ? `${person.fullName} · ${person.company}` : person.fullName,
    type: /angel/i.test(person.headline) ? 'Angel' : /venture|capital|\bvc\b|fund/i.test(`${person.headline} ${person.company}`) ? 'VC' : 'Investor',
    focus: Array.from(new Set([...person.interests, ...person.skills, person.industry].filter(Boolean))).slice(0, 5),
    stage: person.lookingFor.filter((item) => /seed|series|growth|pre/i.test(item)),
    location: person.location,
    checkSize: person.checkSize,
    portfolio: '',
    person,
   }));
 }, [isDemoMode, directoryMembers]);

 const filteredInvestors = investorDirectory.filter(inv => {
  const q = investorSearch.toLowerCase();
  const matchesQuery = !q || inv.name.toLowerCase().includes(q) || inv.focus.some((f: string) => f.toLowerCase().includes(q));
  const matchesType = investorType === 'All' || inv.type === investorType;
  return matchesQuery && matchesType;
 });

 // Real-world programs every founder can apply to; the demo keeps its seeded match
 // scores, a real account gets a score computed from its own profile's tags.
 type FundingProgram = { id: string; title: string; deadline: string; type: string; grant: string; location: string; match: number; tags: string[]; status: string };
 const mockPrograms: FundingProgram[] = DEMO_FUNDING_PROGRAMS.map(({ inDays, tags, ...program }) => ({ ...program, tags: [...tags], deadline: demoDay(inDays) }));
 const [livePrograms, setLivePrograms] = useState<typeof mockPrograms | null>(null);
 useEffect(() => {
  if (isDemoMode) { setLivePrograms(null); return; }
  return onCatalog('programs', (docs) => {
   setLivePrograms(docs.map((doc) => {
    const deadline = toMillis(doc.deadline);
    return {
     id: doc.id,
     title: str(doc.title, 'Program'),
     deadline: deadline ? new Date(deadline).toISOString().slice(0, 10) : str(doc.deadline),
     type: str(doc.type, 'Accelerator'),
     grant: str(doc.funding ?? doc.grant, '—'),
     location: str(doc.location),
     match: 0,
     tags: strList(doc.focus ?? doc.tags),
     status: 'open',
    };
   }));
  }, () => setLivePrograms([]));
 }, [isDemoMode]);
 const programs = isDemoMode ? mockPrograms : (livePrograms ?? []);

 const myTags = useMemo(() => new Set(
  [...(profile?.interests ?? []), ...(profile?.skills ?? []), ...(profile?.lookingFor ?? []), ...(profile?.industry ? [profile.industry] : [])]
   .map((item) => String(item).toLowerCase()),
 ), [profile]);
 const programMatch = (tags: string[]): number | null => {
  if (isDemoMode) return null;
  if (myTags.size === 0) return null;
  const overlap = tags.filter((tag) => myTags.has(tag.toLowerCase())).length;
  return Math.min(96, 55 + overlap * 14);
 };

 const pipelineName = (item: { investorId: string; name?: string }, index: number) =>
  item.name || investorDirectory.find((v) => v.id === item.investorId)?.name || `${t("Investor", "Επενδυτής")} ${index + 1}`;

 const startupName = (profile as { company?: string } | null)?.company || (isDemoMode ? DEMO_VENTURE.name : '');
 const roomStartup = startupName || t('your startup', 'το startup σου');

 const mockOpportunities: { id: string; title: string; org: string; type: string; amount: string; deadline: string; tags: string[]; status: string }[] = DEMO_FUNDING_OPPORTUNITIES.map(({ inDays, tags, ...opportunity }) => ({ ...opportunity, tags: [...tags], deadline: inDays === null ? 'Rolling' : demoDay(inDays) }));
 const opportunities = isDemoMode ? mockOpportunities : [];

 const stageOrder = [...PIPELINE_STAGES];
 const stageCounts = stageOrder.map(s => ({
  stage: s,
  count: pipeline.filter(p => p.stage === s).length,
 }));

 // Demo keeps its sample interest curve; a real account sees its own pipeline by stage.
 const barData = isDemoMode ? [40, 60, 45, 80, 55, 90, 70] : stageCounts.map((item) => item.count);
 const barLabels = isDemoMode ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] : stageOrder.map((s) => s === 'Due Diligence' ? 'DD' : s.slice(0, 2));
 const barMax = Math.max(1, ...barData);

 const mockCapTable = isDemoMode ? [
  { name: "Founders", shares: 8000000, pct: 80, color: "bg-stone-900" },
  { name: "Seed SAFEs", shares: 1000000, pct: 10, color: "bg-stone-400" },
  { name: "ESOP Pool", shares: 1000000, pct: 10, color: "bg-stone-200" },
 ] : [
  { name: "Founders", shares: 10000000, pct: 100, color: "bg-stone-900" },
 ];

 // A real account's checklist fills from the documents it actually uploaded; the demo keeps its seeded state.
 const DD_RULES: { id: string; label: string; match: RegExp; demoStatus: string }[] = [
  { id: "dd1", label: "Incorporation docs",      match: /incorp|articles|certificate|bylaws/i,        demoStatus: "complete" },
  { id: "dd2", label: "IP assignments",          match: /\bip\b|assign|invention/i,                    demoStatus: "complete" },
  { id: "dd3", label: "Financial projections",   match: /financ|projection|model|forecast|p&l/i,       demoStatus: "pending" },
  { id: "dd4", label: "Cap table audit",         match: /cap.?table|safe|equity/i,                     demoStatus: "pending" },
  { id: "dd5", label: "Key contracts",           match: /contract|agreement|msa|nda|offer/i,           demoStatus: "pending" },
 ];
 const dueDiligenceItems = DD_RULES.map((rule) => ({
  id: rule.id,
  label: rule.label,
  status: isDemoMode ? rule.demoStatus : roomFiles.some((file) => rule.match.test(file.name)) ? 'complete' : 'pending',
 }));

 const emailTemplates = [
  { id: "et1", name: "Cold Intro", subject: "Introduction: {{startup}} — {{sector}}" },
  { id: "et2", name: "Follow-up", subject: "Following up: {{startup}} pitch deck" },
  { id: "et3", name: "Data Room", subject: "Data room access: {{startup}}" },
 ];

 // Meeting Scheduler Data
 const upcomingMeetings: { id: string; investor: string; type: string; date: string; time: string; duration: string; status: string; notes: string }[] = isDemoMode ? DEMO_INVESTOR_MEETINGS.map(({ inDays, ...meeting }) => ({ ...meeting, date: demoDay(inDays) })) : [];

 // Folder counts come from the documents that are actually in the room — a file joins a
 // folder by the folder it was uploaded under, or by its name when none was chosen.
 const FOLDER_RULES: Record<string, RegExp> = {
  f1: /legal|incorp|articles|bylaws|\bip\b|assign|contract|nda|agreement/i,
  f2: /financ|cap.?table|model|projection|forecast|p&l|safe/i,
  f3: /product|roadmap|demo|deck|pitch|metrics/i,
  f4: /team|cv|resume|org|hiring|founder/i,
 };
 const folderOfFile = (file: RoomFile): string | null =>
  file.folder ?? (Object.keys(FOLDER_RULES).find((id) => FOLDER_RULES[id]?.test(file.name)) ?? null);
 const documentFolders = [
  { id: "f1", name: "Legal", access: "investors" },
  { id: "f2", name: "Financials", access: "investors" },
  { id: "f3", name: "Product", access: "public" },
  { id: "f4", name: "Team", access: "investors" },
 ].map((folder) => {
  const files = roomFiles.filter((file) => folderOfFile(file) === folder.id);
  const lastUpdated = files.map((file) => file.updated).sort().pop() || '';
  return { ...folder, count: files.length, lastUpdated };
 });
 const visibleRoomFiles = selectedFolder ? roomFiles.filter((file) => folderOfFile(file) === selectedFolder) : roomFiles;
 const roomViews = roomFiles.reduce((sum, file) => sum + (file.views || 0), 0);

 // The CRM sits on top of the pipeline: stage becomes tags, score and the suggested next move.
 const CRM_NEXT: Record<string, [string, string]> = {
  Identified: ["Send an intro", "Στείλε ένα πρώτο μήνυμα"],
  Contacted: ["Follow up", "Κάνε follow-up"],
  Meeting: ["Prepare the deck", "Ετοίμασε το deck"],
  "Due Diligence": ["Share the data room", "Μοίρασε το data room"],
  "Term Sheet": ["Review the terms", "Έλεγξε τους όρους"],
  Closed: ["Confirm the wire", "Επιβεβαίωσε το κλείσιμο"],
  Passed: ["Re-engage later", "Ξαναεπικοινώνησε αργότερα"],
 };
 const investorCRM = pipeline.map((item) => ({
  id: `crm-${item.investorId}`,
  investorId: item.investorId,
  tags: [stageIndex(item.stage) >= 3 && item.stage !== 'Passed' ? 'Hot Lead' : item.stage],
  lastContact: item.updatedAt.slice(0, 10),
  relationshipScore: item.stage === 'Passed' ? 15 : Math.round(((stageIndex(item.stage) + 1) / 6) * 100),
  nextAction: CRM_NEXT[item.stage] ? t(CRM_NEXT[item.stage]![0], CRM_NEXT[item.stage]![1]) : '',
  priority: stageIndex(item.stage) >= 3 && item.stage !== 'Passed' ? 'high' : 'medium',
 }));

 const tabLabel: Record<typeof activeTab, string> = {
  tracker: t("Tracker", "Παρακολούθηση"),
  investors: t("Investors", "Επενδυτές"),
  programs: t("Programs", "Προγράμματα"),
  opportunities: t("Opportunities", "Ευκαιρίες"),
 };
 const stageLabel = (stage: string) => {
  const names: Record<string, string> = {
   Identified: t("Identified", "Εντοπίστηκε"),
   Contacted: t("Contacted", "Έγινε επαφή"),
   Meeting: t("Meeting", "Συνάντηση"),
   "Due Diligence": t("Due Diligence", "Δέουσα επιμέλεια"),
   "Term Sheet": t("Term Sheet", "Βασικοί όροι συμφωνίας"),
   Closed: t("Closed", "Κλειστό"),
   Passed: t("Passed", "Απορρίφθηκε"),
  };
  return names[stage] ?? labelOf(stage);
 };
 const ddLabel = (label: string) => {
  const names: Record<string, string> = {
   "Incorporation docs": t("Incorporation docs", "Έγγραφα σύστασης"),
   "IP assignments": t("IP assignments", "Εκχωρήσεις IP"),
   "Financial projections": t("Financial projections", "Οικονομικές προβλέψεις"),
   "Cap table audit": t("Cap table audit", "Έλεγχος cap table"),
   "Key contracts": t("Key contracts", "Βασικές συμβάσεις"),
  };
  return names[label] ?? label;
 };
 const emailName = (name: string) => {
  const names: Record<string, string> = {
   "Cold Intro": t("Cold Intro", "Πρώτη επαφή"),
   "Follow-up": t("Follow-up", "Υπενθύμιση"),
   "Data Room": t("Data Room", "Αίθουσα δεδομένων"),
  };
  return names[name] ?? name;
 };
 const capName = (name: string) => {
  if (name === "Seed SAFEs") return name;
  if (name === "Founders") return t("Founders", "Ιδρυτές");
  if (name === "ESOP Pool") return t("ESOP Pool", "Δεξαμενή ESOP");
  return name;
 };
 const meetingTypeLabel = (type: string) => {
  const names: Record<string, string> = {
   "Video Call": t("Video Call", "Βιντεοκλήση"),
   Phone: t("Phone", "Τηλέφωνο"),
   Coffee: t("Coffee", "Καφές"),
   Office: t("Office", "Γραφείο"),
   "Coffee Chat": t("Coffee Chat", "Καφές"),
   Pitch: t("Pitch", "Pitch"),
  };
  return names[type] ?? type;
 };
 const tagLabel = (tag: string) => {
  const names: Record<string, string> = {
   "Hot Lead": t("Hot Lead", "Πολύ θερμή προοπτική"),
   Strategic: t("Strategic", "Στρατηγικό"),
   Advisor: t("Advisor", "Σύμβουλος"),
   Angel: t("Angel", "Angel"),
   Competition: t("Competition", "Ανταγωνισμός"),
  };
  return names[tag] ?? labelOf(tag);
 };
 const typeLabel = (value: string) => {
  if (value === "All") return t("All", "Όλα");
  const names: Record<string, string> = {
   "Intro Request": t("Intro Request", "Αίτημα σύστασης"),
   "Pitch Event": t("Pitch Event", "Εκδήλωση pitch"),
   "Non-dilutive Grant": t("Non-dilutive Grant", "Μη αραιωτική επιχορήγηση"),
   "Revenue-Based": t("Revenue-Based", "Με βάση τα έσοδα"),
   Studio: t("Studio", "Studio"),
   VC: t("VC", "VC"),
   Angel: t("Angel", "Angel"),
  };
  return names[value] ?? labelOf(value);
 };
 const moneyWords = (amount: string) =>
  amount.startsWith("up to ") ? `${t("up to", "έως")} ${amount.slice(6)}` : amount;
 const daysLeftText = (n: number) =>
  n === 2 ? t("2d left", "απομένουν 2 ημ.") : t(`${n}d left`, `απομένουν ${n} ημ.`);

 return (
  <>
  <PageShell
   sample={isDemoMode}
   title={t("Fundraising", "Χρηματοδότηση")}
   description={t("Track your round, discover investors, and apply for programs.", "Παρακολούθησε τον γύρο, βρες επενδυτές και κάνε αίτηση σε προγράμματα.")}
   maxWidth="full"
   actions={
    <button
     type="button"
     data-ui="button"
     onClick={() => useUIStore.getState().setDealRoomModalOpen(true, 'sv-my-venture')}
     title={t("What investors and candidates see: your venture, pitch deck, traction and open roles — built from this round, your canvas and need cards.", "Τι βλέπουν επενδυτές και υποψήφιοι: το venture, το pitch deck, η πρόοδος και οι ανοιχτοί ρόλοι — από αυτόν τον γύρο, το canvas και τις κάρτες ανάγκης.")}
     className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 hover:border-stone-300 hover:text-stone-900 transition-colors"
    >
     <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />
     {t("My Deal Room", "Το Deal Room μου")}
    </button>
   }
  >
   <div className="space-y-5">

    {/* Tab Bar */}
    <div className="scroll-tabs bg-stone-50 p-1 rounded-xl border border-stone-100">
     {(["tracker", "investors", "programs", "opportunities"] as const).map((tab) => (
      <button
       key={tab}
       onClick={() => setActiveTab(tab)}
       className={cn(
        "px-3 py-1.5 text-sm font-semibold tracking-wide rounded-lg transition-all",
        activeTab === tab ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200" : "text-stone-500 hover:text-stone-700"
       )}
      >
       {tabLabel[tab]}
      </button>
     ))}
    </div>

    {/* ── TRACKER TAB ─────────────────────────────────────── */}
    {activeTab === "tracker" && (
     <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

      {/* Left: Round Summary */}
      <div className="lg:col-span-1 space-y-4">
       <Card className="p-4" contentClassName="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
         <p className="text-xs font-semibold text-stone-400 tracking-wide">{`${round.name} ${t('round progress', 'πρόοδος γύρου')}`}</p>
         <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" className="min-h-11 px-2 rounded-lg" onClick={openRoundEditor} title={t('Edit round', 'Επεξεργασία γύρου')} aria-label={t('Edit round', 'Επεξεργασία γύρου')}>
           <Pencil className="w-3.5 h-3.5" />
          </Button>
          <span className="px-2 py-0.5 text-emerald-700 text-xs font-semibold rounded-md">
           {labelOf('Active')}
          </span>
         </div>
        </div>

        <SaveStatus listKey={keys.round} />
        {!roundEditing && roundForm.dirty && <button type="button" className="text-xs text-stone-600 underline underline-offset-2" onClick={openRoundEditor}>{t('Continue round draft', 'Συνέχεια πρόχειρου γύρου')}</button>}
        {roundEditing && roundDraft ? (
         <div className="space-y-3">
          <label className="block space-y-1">
           <span className="text-xs text-stone-400">{t('Round name', 'Όνομα γύρου')}</span>
           <input className={inputClass} value={roundDraft.name} onChange={(e) => setRoundDraft({ ...roundDraft, name: e.target.value })} />
          </label>
          <label className="block space-y-1">
           <span className="text-xs text-stone-400">{t('Instrument', 'Εργαλείο')}</span>
           <select className={inputClass} value={roundDraft.instrument} onChange={(e) => setRoundDraft({ ...roundDraft, instrument: e.target.value as Round['instrument'] })}>
            <option value="SAFE">SAFE</option>
            <option value="Priced">Priced</option>
           </select>
          </label>
          {([
           ['targetAmount', t('Target ($)', 'Στόχος ($)')],
           ['committedAmount', t('Committed ($)', 'Δεσμευμένα ($)')],
           ['valuationCap', t('Valuation cap ($)', 'Ανώτατη αποτίμηση ($)')],
           ['discountPct', t('Discount %', 'Έκπτωση %')],
           ['cashOnHand', t('Cash on hand ($)', 'Διαθέσιμα ($)')],
           ['monthlyBurn', t('Monthly burn ($)', 'Μηνιαίο burn ($)')],
          ] as const).map(([field, label]) => (
           <label key={field} className="block space-y-1">
            <span className="text-xs text-stone-400">{label}</span>
            <input type="number" min={0} className={inputClass} value={roundDraft[field]} onChange={(e) => setRoundDraft({ ...roundDraft, [field]: Number(e.target.value) })} />
           </label>
          ))}
          <label className="block space-y-1">
           <span className="text-xs text-stone-400">{t('Close date', 'Ημερομηνία κλεισίματος')}</span>
           <input type="date" className={inputClass} value={roundDraft.closeDate} onChange={(e) => setRoundDraft({ ...roundDraft, closeDate: e.target.value })} />
          </label>
          <div className="flex gap-2 pt-1">
           <Button type="button" className="flex-1 min-h-11 text-sm rounded-lg bg-stone-900 text-white hover:bg-stone-800" onClick={saveRound}>{t('Save', 'Αποθήκευση')}</Button>
           <Button type="button" variant="outline" className="flex-1 min-h-11 text-sm rounded-lg" onClick={() => setRoundEditing(false)}>{t('Close', 'Κλείσιμο')}</Button>
          </div>
          {roundError && <p role="alert" className="text-xs text-red-700">{roundError}</p>}
          <DraftNotice {...roundForm} onDiscard={() => { roundForm.reset({ ...round }); setRoundError(''); setRoundEditing(false); }} />
         </div>
        ) : (
        <>
        {/* Amount & Bar */}
        <div className="space-y-1.5">
         <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold text-stone-900">${(round.committedAmount / 1000).toFixed(0)}k</span>
          <span className="text-sm text-stone-400">{t("of", "από")} ${(round.targetAmount / 1000000).toFixed(1)}M</span>
         </div>
         <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div className="h-full bg-stone-900 rounded-full transition-all duration-700" style={{ width: `${metrics.pct}%` }} />
         </div>
         <div className="flex justify-between text-xs text-stone-400">
          <span>{metrics.pct}% {t("raised", "συγκεντρώθηκε")}</span>
          <span>${(metrics.remaining / 1000).toFixed(0)}k {t("remaining", "απομένουν")}</span>
         </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-100">
         {[
          { label: t("Active Leads", "Ενεργά leads"),  value: String(metrics.activeLeads),        color: "" },
          { label: t("Closes in", "Κλείνει σε"), value: metrics.daysToClose != null ? `${metrics.daysToClose} ${t('days', 'ημέρες')}` : "—",       color: "" },
          { label: t("Meetings", "Συναντήσεις"),      value: String(metrics.meetings),       color: "" },
          { label: t("Burn Rate", "Ρυθμός καύσης"),     value: round.monthlyBurn > 0 ? `$${Math.round(round.monthlyBurn / 1000)}k/mo` : "—",  color: "text-red-500" },
          { label: t("Runway Left", "Υπόλοιπο περιθώριο"),   value: metrics.runwayMonths != null ? `${metrics.runwayMonths}mo` : "—", color: metrics.runwayMonths != null && metrics.runwayMonths < 6 ? "text-amber-600" : "" },
          { label: t("Close Rate", "Ρυθμός κλεισίματος"),    value: metrics.closeRate != null ? `${Math.round(metrics.closeRate * 100)}%` : "—",      color: "" },
         ].map(({ label, value, color }) => (
          <div key={label} className="space-y-0.5 py-1.5" title={value === "—" ? t('Set it with Edit round or ask the assistant', 'Όρισέ το με την επεξεργασία γύρου ή ρώτα τον βοηθό') : undefined}>
           <p className="text-xs text-stone-400 tracking-wider">{label}</p>
           <p className={cn("text-base font-bold text-stone-900", color)}>{value}</p>
          </div>
         ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-3 pt-2 border-t border-stone-100">
         <p className="text-xs font-semibold text-stone-400 tracking-wide">{t("Quick Actions", "Γρήγορες ενέργειες")}</p>
         <Button variant="outline" className="w-full justify-start gap-2 text-sm min-h-11 rounded-lg" onClick={() => setShowDocumentRoom(true)}>
          <FileText className="w-3.5 h-3.5 shrink-0" /> {t("Update Data Room", "Ενημέρωση data room")}
         </Button>
         <Button variant="outline" className="w-full justify-start gap-2 text-sm min-h-11 rounded-lg" onClick={() => setShowMeetingScheduler(true)}>
          <Users className="w-3.5 h-3.5 shrink-0" /> {t("Log New Meeting", "Καταγραφή νέας συνάντησης")}
         </Button>
         <Button className="w-full justify-start gap-2 text-sm min-h-11 rounded-lg bg-stone-900 text-white hover:bg-stone-800" onClick={() => askAssistant('Record a $50k investment in my round')}>
          <DollarSign className="w-3.5 h-3.5 shrink-0" /> {t("Record Investment", "Καταγραφή επένδυσης")}
         </Button>
        </div>

        <Disclosure title={t("Round tools", "Εργαλεία γύρου")} hint={t("Cap table, due diligence, email templates, meetings", "Cap table, δέουσα επιμέλεια, πρότυπα email, συναντήσεις")}>
        {/* Mini Cap Table */}
        <div className="pt-2 border-t border-stone-100 space-y-2">
         <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-stone-400 tracking-wide">{t("Cap Table", "Cap table")}</p>
          <span className="text-xs text-stone-400">10M {t("shares", "μετοχές")}</span>
         </div>
         <div className="flex h-2 rounded-full overflow-hidden">
          {mockCapTable.map((row, i) => (
           <div key={i} className={cn(row.color, "first:rounded-l-full last:rounded-r-full")} style={{ width: `${row.pct}%` }} />
          ))}
         </div>
         <div className="flex gap-3">
          {mockCapTable.map((row, i) => (
           <div key={i} className="flex items-center gap-1">
            <div className={cn("w-1.5 h-1.5 rounded-full", row.color)} />
            <span className="text-xs text-stone-600">{capName(row.name)} {row.pct}%</span>
           </div>
          ))}
         </div>
        </div>

        {/* Due Diligence Checklist Mini */}
        <div className="pt-2 border-t border-stone-100 space-y-1.5">
         <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-stone-400 tracking-wide">{t("Due Diligence", "Δέουσα επιμέλεια")}</p>
          <span className="text-xs text-emerald-600 font-semibold">
           {dueDiligenceItems.filter(i => i.status === "complete").length}/{dueDiligenceItems.length}
          </span>
         </div>
         <div className="space-y-1">
          {dueDiligenceItems.slice(0, 3).map((item) => (
           <div key={item.id} className="flex items-center gap-2">
            <div className={cn(
             "w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0",
             item.status === "complete" ? "bg-emerald-100 text-emerald-600" : "bg-stone-100 text-stone-400"
            )}>
             {item.status === "complete" ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
            </div>
            <span className={cn(
             "text-xs truncate",
             item.status === "complete" ? "text-stone-500 line-through" : "text-stone-600"
            )}>{ddLabel(item.label)}</span>
           </div>
          ))}
         </div>
        </div>

        {/* Email Templates Quick Access */}
        <div className="pt-2 border-t border-stone-100 space-y-1.5">
         <p className="text-xs font-semibold text-stone-400 tracking-wide">{t("Email Templates", "Πρότυπα email")}</p>
         <div className="flex flex-wrap gap-1">
          {emailTemplates.map((et) => (
           <button key={et.id} onClick={() => { navigator.clipboard.writeText(et.subject.replace('{{startup}}', roomStartup).replace('{{sector}}', (profile?.industry && String(profile.industry)) || 'your sector')); showToast(`"${emailName(et.name)}" ${t("subject copied", "το θέμα αντιγράφηκε")}`); }} className="min-h-11 inline-flex items-center px-2 py-1 bg-stone-50 hover:bg-stone-100 border border-stone-100 rounded-md text-xs text-stone-600 transition-colors">
            {emailName(et.name)}
           </button>
          ))}
         </div>
        </div>

        {/* Meeting Scheduler Mini */}
        <div className="pt-2 border-t border-stone-100 space-y-2">
         <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-xs font-semibold text-stone-400 tracking-wide">{t("Upcoming Meetings", "Επερχόμενες συναντήσεις")}</p>
          <button 
           onClick={() => setShowMeetingScheduler(true)}
           className="min-h-11 py-1 text-xs text-stone-500 hover:text-stone-900 flex items-center gap-0.5 transition-colors"
          >
           <Plus className="w-3 h-3" /> {t("Schedule meeting", "Προγραμματισμός συνάντησης")}
          </button>
         </div>
         <div className="space-y-1.5">
          {upcomingMeetings.slice(0, 2).map((meeting) => (
           <div key={meeting.id} className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg border border-stone-100 hover:border-stone-200 transition-all cursor-pointer group">
            <div className={cn(
             "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
             meeting.status === "confirmed" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
            )}>
             {meeting.type === "Video Call" ? <Video className="w-3.5 h-3.5" /> : meeting.type === "Coffee Chat" ? <Users className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
             <p className="text-sm font-medium text-stone-900 truncate">{meeting.investor}</p>
             <p className="text-xs text-stone-400">{formatDate(meeting.date)} · {meeting.time}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-stone-500 transition-colors shrink-0" />
           </div>
          ))}
         </div>
         <button 
          onClick={() => setShowMeetingScheduler(true)}
          className="w-full min-h-11 py-1.5 text-xs text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-lg border border-stone-100 transition-all"
         >
          {t("View All", "Όλα")} {upcomingMeetings.length} {t("Meetings", "συναντήσεις")}
         </button>
        </div>
        </Disclosure>
        </>
        )}
       </Card>

       {/* Stage Funnel */}
       <Disclosure title={t("Pipeline stages", "Στάδια επενδυτών")} hint={t("See the number of investors at each stage.", "Δες πόσοι επενδυτές βρίσκονται σε κάθε στάδιο.")}>
       <Card className="p-4" contentClassName="space-y-3">
        <p className="text-xs font-semibold text-stone-400 tracking-wide">{t("Pipeline Funnel", "Απεικόνιση ροής επενδυτών")}</p>
        <div className="space-y-1.5">
         {stageCounts.filter(s => s.stage !== "Passed").concat(stageCounts.filter(s => s.stage === "Passed")).map(({ stage, count }) => {
          const meta = STAGE_META[stage] ?? { color: "text-stone-500", dot: "bg-stone-400" };
          return (
           <div key={stage} className="flex items-center gap-2">
            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", meta.dot)} />
            <div className="flex-1 flex items-center justify-between min-w-0">
             <span className="text-sm text-stone-600 truncate">{stageLabel(stage)}</span>
             <span className="text-sm font-bold text-stone-900 shrink-0 ml-2">{count}</span>
            </div>
           </div>
          );
         })}
        </div>
       </Card>

       {/* Document Room */}
       </Disclosure>
       <Disclosure title={t("Data room folders", "Φάκελοι data room")} hint={t("Browse documents, access labels and file activity.", "Δες έγγραφα, ενδείξεις πρόσβασης και δραστηριότητα αρχείων.")}>
       <Card className="p-4" contentClassName="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
         <p className="text-xs font-semibold text-stone-400 tracking-wide">{t("Data Room", "Data room")}</p>
         <button 
          onClick={() => setShowDocumentRoom(true)}
          className="min-h-11 py-1 text-xs text-stone-500 hover:text-stone-900 flex items-center gap-0.5 transition-colors"
         >
          <Eye className="w-3 h-3" /> {t("Open data room", "Άνοιγμα data room")}
         </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
         {documentFolders.map((folder) => (
          <div 
           key={folder.id} 
           onClick={() => setSelectedFolder(folder.id)}
           className="p-2.5 bg-stone-50 rounded-xl border border-stone-100 hover:border-stone-300 hover:bg-white transition-all cursor-pointer group"
          >
           <div className="flex items-start justify-between mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-stone-100 group-hover:bg-stone-900 group-hover:text-white transition-all flex items-center justify-center">
             <FolderOpen className="w-3.5 h-3.5" />
            </div>
            {folder.access === "investors" ? <Lock className="w-3 h-3 text-stone-400" /> : <Unlock className="w-3 h-3 text-stone-400" />}
           </div>
           <p className="text-sm font-medium text-stone-900">{labelOf(folder.name)}</p>
           <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-stone-400">{folder.count} {t("files", "αρχεία")}</p>
            <p className="text-xs text-stone-400">{formatDate(folder.lastUpdated)}</p>
           </div>
          </div>
         ))}
        </div>
        {(isDemoMode || roomViews > 0) && (
        <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-100">
         <div className="flex items-center gap-1.5">
          <BarChart2 className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-xs text-stone-600">{isDemoMode ? t("12 investors viewed this week", "12 επενδυτές το είδαν αυτή την εβδομάδα") : `${roomViews} ${t("views on your documents", "προβολές στα έγγραφά σου")}`}</span>
         </div>
         <button className="text-xs text-amber-700 font-semibold hover:underline" onClick={() => navigate('/insights')}>{t("View analytics", "Δες αναλυτικά")}</button>
        </div>
        )}
       </Card>
       </Disclosure>
      </div>

      {/* Right: Pipeline Table + Bottom Cards */}
      <div className="lg:col-span-2 space-y-4">

       {/* Investor Pipeline Table */}
       <Card title={t("Investor Pipeline", "Ροή επενδυτών")} subtitle={t("Manage your investor relationships and deal stages", "Διαχείριση σχέσεων με επενδυτές και σταδίων συμφωνίας")}>
        <ul className="divide-y divide-stone-100 sm:hidden">
         {(pipeline ?? []).map((item, i) => {
          const meta = STAGE_META[item.stage] ?? { color: "text-stone-500", dot: "bg-stone-400" };
          return (
           <li key={item.investorId} className="flex items-start gap-3 px-3 py-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
             <Briefcase className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
             <p className="text-sm font-semibold text-stone-900">{pipelineName(item, i)}</p>
             <p className="text-xs text-stone-400">{investorDirectory.find((v) => v.id === item.investorId) ? typeLabel(investorDirectory.find((v) => v.id === item.investorId)!.type) : t("Tracked", "Σε παρακολούθηση")}</p>
             <p className={cn("mt-1 text-sm font-semibold", meta.color)}>{stageLabel(item.stage)}</p>
             <p className="mt-1 text-sm text-stone-600">{item.notes}</p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
             {item.stage !== 'Closed' && item.stage !== 'Passed' && (
              <button type="button" aria-label={t("Move to next stage", "Επόμενο στάδιο")} title={t("Move to next stage", "Επόμενο στάδιο")}
               onClick={() => { const next = PIPELINE_STAGES[Math.min(stageIndex(item.stage) + 1, 5)] ?? 'Closed'; setPipelineStage(item.investorId, next); showToast(`${pipelineName(item, i)} → ${stageLabel(next)}`); }}
               className="min-h-8 min-w-8 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors">
               <ArrowRight className="w-3.5 h-3.5 text-stone-500" />
              </button>
             )}
             <button type="button" aria-label={t("Remove from pipeline", "Αφαίρεση από τη ροή")} title={t("Remove from pipeline", "Αφαίρεση από τη ροή")}
              onClick={() => { removePipelineInvestor(item.investorId); showToast(t("Removed from pipeline", "Αφαιρέθηκε από τη ροή")); }}
              className="min-h-8 min-w-8 rounded-lg text-stone-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors">
              <X className="w-3.5 h-3.5" />
             </button>
            </div>
           </li>
          );
         })}
         {(pipeline ?? []).length === 0 && (
          <li className="px-3 py-4">
           <EmptyHint
            title={t("No investors tracked yet.", "Δεν παρακολουθείς ακόμη επενδυτές.")}
            detail={t("Add investors from the Investors tab to build your pipeline here.", "Πρόσθεσε επενδυτές από την καρτέλα «Επενδυτές» για να χτίσεις τη ροή σου εδώ.")}
           >
            <button type="button" className="text-xs font-medium text-stone-900 hover:underline" onClick={() => setActiveTab('investors')}>{t("Open the investor directory", "Άνοιξε τον κατάλογο επενδυτών")}</button>
           </EmptyHint>
          </li>
         )}
        </ul>
        <div className="hidden overflow-x-auto sm:block">
         <table className="w-full min-w-[640px] text-left border-collapse">
          <thead>
           <tr className="bg-stone-50 border-b border-stone-100">
            <th className="px-3 py-2 text-xs font-semibold text-stone-400 tracking-wide">{t("Investor", "Επενδυτής")}</th>
            <th className="px-3 py-2 text-xs font-semibold text-stone-400 tracking-wide">{t("Stage", "Στάδιο")}</th>
            <th className="px-3 py-2 text-xs font-semibold text-stone-400 tracking-wide">{t("Latest Note", "Τελευταία σημείωση")}</th>
            <th className="px-3 py-2 text-xs font-semibold text-stone-400 tracking-wide"></th>
           </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
           {(pipeline ?? []).map((item, i) => {
            const meta = STAGE_META[item.stage] ?? { color: "text-stone-500", dot: "bg-stone-400" };
            return (
             <tr key={item.investorId} className="hover:bg-stone-50 transition-colors group">
              <td className="px-3 py-2.5">
               <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 shrink-0">
                 <Briefcase className="w-3.5 h-3.5" />
                </div>
                <div>
                 <p className="text-sm font-semibold text-stone-900">{pipelineName(item, i)}</p>
                 <p className="text-xs text-stone-400">{investorDirectory.find((v) => v.id === item.investorId) ? typeLabel(investorDirectory.find((v) => v.id === item.investorId)!.type) : t("Tracked", "Σε παρακολούθηση")}</p>
                </div>
               </div>
              </td>
              <td className="px-3 py-2.5">
               <span className={cn("px-2 py-0.5 rounded-md text-xs font-semibold tracking-wide whitespace-nowrap", meta.color)}>
                {stageLabel(item.stage)}
               </span>
              </td>
              <td className="px-3 py-2.5">
               <p className="text-sm text-stone-500 max-w-[180px] truncate">{item.notes}</p>
              </td>
              <td className="px-3 py-2.5">
               <div className="flex items-center justify-end gap-1">
                {item.stage !== 'Closed' && item.stage !== 'Passed' && (
                 <button type="button" aria-label={t("Move to next stage", "Επόμενο στάδιο")} title={t("Move to next stage", "Επόμενο στάδιο")}
                  onClick={() => { const next = PIPELINE_STAGES[Math.min(stageIndex(item.stage) + 1, 5)] ?? 'Closed'; setPipelineStage(item.investorId, next); showToast(`${pipelineName(item, i)} → ${stageLabel(next)}`); }}
                  className="min-h-8 min-w-8 rounded-lg text-stone-300 hover:text-stone-900 hover:bg-stone-100 flex items-center justify-center transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" />
                 </button>
                )}
                <button type="button" aria-label={t("Remove from pipeline", "Αφαίρεση από τη ροή")} title={t("Remove from pipeline", "Αφαίρεση από τη ροή")}
                 onClick={() => { removePipelineInvestor(item.investorId); showToast(t("Removed from pipeline", "Αφαιρέθηκε από τη ροή")); }}
                 className="min-h-8 min-w-8 rounded-lg text-stone-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors">
                 <X className="w-3.5 h-3.5" />
                </button>
               </div>
              </td>
             </tr>
            );
           })}
           {(pipeline ?? []).length === 0 && (
            <tr>
             <td colSpan={4} className="px-3 py-3">
              <EmptyHint
               title={t("No investors tracked yet.", "Δεν παρακολουθείς ακόμη επενδυτές.")}
               detail={t("Add investors from the Investors tab to build your pipeline here.", "Πρόσθεσε επενδυτές από την καρτέλα «Επενδυτές» για να χτίσεις τη ροή σου εδώ.")}
              />
             </td>
            </tr>
           )}
          </tbody>
         </table>
        </div>
        <div className="px-3 py-2.5 bg-stone-50 border-t border-stone-100 flex justify-center">
         <Button variant="ghost" size="sm" className="text-xs font-semibold tracking-wide text-stone-400 hover:text-stone-900 min-h-11" onClick={() => setActiveTab('investors')}>
          {t("View Full CRM", "Όλο το CRM")} <ChevronRight className="w-3 h-3 ml-1" />
         </Button>
        </div>
       </Card>

       {/* Secondary analysis remains available without competing with the pipeline. */}
       <Disclosure title={t("Insights and planning", "Αναλύσεις και σχεδιασμός")} hint={t("Round analytics, program deadlines and the SAFE calculator.", "Αναλύσεις γύρου, προθεσμίες προγραμμάτων και υπολογιστής SAFE.")}>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <Card title={t("Fundraising Insights", "Εικόνα χρηματοδότησης")} subtitle={isDemoMode ? t("Round analytics and benchmarks", "Αναλυτικά γύρου και σημεία αναφοράς") : t("Your pipeline at a glance", "Η ροή σου με μια ματιά")} className="p-4">
         {!isDemoMode && pipeline.length === 0 ? (
          <EmptyHint
           title={t("Nothing to chart yet.", "Δεν υπάρχει κάτι να δειχθεί ακόμη.")}
           detail={t("Track investors and this card shows where your round actually stands.", "Παρακολούθησε επενδυτές και αυτή η κάρτα δείχνει πού βρίσκεται ο γύρος σου.")}
          >
           <AskLink prompt="Which investors should I track for my round?" />
          </EmptyHint>
         ) : (
         <div className="space-y-4">
          {/* Bar chart */}
          <div className="space-y-1.5">
           <div className="flex justify-between text-xs tracking-wide">
            <span className="text-stone-400 font-semibold">{isDemoMode ? t("Investor Interest", "Ενδιαφέρον επενδυτών") : t("Pipeline by stage", "Επενδυτές ανά στάδιο")}</span>
            <span className="text-emerald-600 font-semibold">{isDemoMode ? t("+15% vs last week", "+15% έναντι προηγούμενης εβδομάδας") : `${pipeline.length} ${t("tracked", "σε ροή")}`}</span>
           </div>
           <div className="h-24 flex items-end gap-1 group/bar">
            {barData.map((h, i) => (
             <div
              key={i}
              className="flex-1 bg-stone-300 rounded-t hover:bg-stone-900 transition-all cursor-pointer relative"
              style={{ height: `${(h / barMax) * 100}%` }}
             >
              {/* Tooltip on hover */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
               {h} {isDemoMode ? t("views", "προβολές") : t("investors", "επενδυτές")}
              </div>
             </div>
            ))}
           </div>
           <div className="flex justify-between text-xs text-stone-400">
            {barLabels.map((d, i) => (
             <span key={i} className="flex-1 text-center">{isDemoMode ? t(d, { Mo: "Δε", Tu: "Τρ", We: "Τε", Th: "Πε", Fr: "Πα", Sa: "Σα", Su: "Κυ" }[d] ?? d) : (stageLabel(stageOrder[i] ?? "") || d).slice(0, 2)}</span>
            ))}
           </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-100">
           {(isDemoMode ? [
            { label: t("Avg Response", "Μέσος χρόνος απάντησης"), value: "3.2d" },
            { label: t("Open Rate", "Ποσοστό ανοίγματος"),    value: "68%" },
            { label: t("Reply Rate", "Ποσοστό απαντήσεων"),   value: "41%" },
           ] : [
            { label: t("In pipeline", "Στη ροή"), value: String(pipeline.length) },
            { label: t("In diligence", "Σε επιμέλεια"), value: String(pipeline.filter((item) => item.stage === 'Due Diligence').length) },
            { label: t("Closed", "Κλειστοί"), value: String(pipeline.filter((item) => item.stage === 'Closed').length) },
           ]).map(({ label, value }) => (
            <div key={label} className="text-center py-1.5 bg-stone-50 rounded-xl border border-stone-100">
             <p className="text-base font-bold text-stone-900">{value}</p>
             <p className="text-xs text-stone-400">{label}</p>
            </div>
           ))}
          </div>

          {/* Hot take */}
          {isDemoMode && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-2">
           <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
           <p className="text-sm text-stone-600 leading-relaxed">
            {t("Your", "Το στάδιο")} <span className="font-semibold text-stone-900">{t("Due Diligence", "δέουσα επιμέλεια")}</span> {t("stage moves 20% faster than the industry average for Seed rounds.", "κινείται 20% πιο γρήγορα από τον μέσο όρο του κλάδου για γύρους Seed.")}
           </p>
          </div>
          )}
         </div>
         )}
        </Card>

        <Card title={t("Upcoming Deadlines", "Επερχόμενες προθεσμίες")} subtitle={t("Don't miss these opportunities", "Μην χάσεις αυτές τις ευκαιρίες")} className="p-4">
         <div className="space-y-2">
          {programs.length === 0 ? (
           <EmptyHint
            title={t('No upcoming deadlines', 'Δεν υπάρχουν επερχόμενες προθεσμίες')}
            detail={t('Programs with a closing date will appear here. Open the Programs tab to browse.', 'Προγράμματα με ημερομηνία λήξης εμφανίζονται εδώ. Άνοιξε την καρτέλα Προγράμματα για να δεις τι υπάρχει.')}
           />
          ) : programs.map((p) => {
           const due = new Date(p.deadline).getTime();
           const daysLeft = Number.isFinite(due) ? Math.max(0, Math.round((due - Date.now()) / 86400000)) : 0;
           const urgent = Number.isFinite(due) && daysLeft < 14;
           return (
            <div key={p.id} className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl border border-stone-100 hover:border-stone-300 transition-all cursor-pointer group">
             <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-900 truncate">{p.title}</p>
              <p className={cn("text-xs tracking-wide mt-0.5", urgent ? "text-red-500 font-semibold" : "text-stone-400")}>
               {t("Due", "Προθεσμία")}: {p.deadline ? formatDate(p.deadline) : '—'} {urgent && `· ${daysLeftText(daysLeft)}`}
              </p>
             </div>
             <div className="text-right shrink-0 ml-2">
              <p className="text-sm font-bold text-stone-900">{p.grant}</p>
              <p className="text-xs text-stone-400">{typeLabel(p.type)}</p>
             </div>
            </div>
           );
          })}
         </div>
         <Button variant="outline" size="sm" className="w-full mt-3 text-sm min-h-11 rounded-lg" onClick={() => setActiveTab("programs")}>
          {t("Explore All Programs", "Όλα τα προγράμματα")} <ArrowRight className="w-3 h-3 ml-1.5" />
         </Button>
        </Card>

        {/* SAFE Calculator */}
        <Card className="p-4" contentClassName="space-y-3">
         <div className="flex items-center justify-between">
          <div>
           <p className="text-xs font-semibold text-stone-400 tracking-wide">{t("SAFE Calculator", "Υπολογιστής SAFE")}</p>
           <p className="text-sm font-semibold text-stone-900">{t("Valuation & Ownership", "Αποτίμηση και ιδιοκτησία")}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center">
           <Calculator className="w-4 h-4 text-stone-600" />
          </div>
         </div>

         <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
           <span className="text-xs text-stone-500">{t("Valuation Cap", "Ανώτατο όριο αποτίμησης")}</span>
           <span className="text-sm font-semibold text-stone-900">$8M</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
           <span className="text-xs text-stone-500">{t("Discount Rate", "Ποσοστό έκπτωσης")}</span>
           <span className="text-sm font-semibold text-stone-900">20%</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
           <span className="text-xs text-stone-500">{t("Investment", "Επένδυση")}</span>
           <span className="text-sm font-semibold text-stone-900">$500k</span>
          </div>
         </div>

         <div className="pt-2 border-t border-stone-100">
          <div className="flex items-center justify-between mb-1">
           <span className="text-xs text-stone-500">{t("Effective Ownership", "Πραγματική ιδιοκτησία")}</span>
           <span className="text-base font-bold text-stone-900">5.88%</span>
          </div>
          <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
           <div className="h-full bg-stone-900 w-[5.88%]" />
          </div>
         </div>

         <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="flex-1 min-h-11 text-sm rounded-lg" onClick={() => askAssistant('Tell me about SAFE agreement')}>
           <Download className="w-3 h-3 mr-1" /> SAFE
          </Button>
          <Button size="sm" className="flex-1 min-h-11 text-sm rounded-lg bg-stone-900 text-white" onClick={() => { navigator.clipboard.writeText('https://cofounderbay.app/dataroom/safe-note'); showToast(t("Share link copied!", "Ο σύνδεσμος αντιγράφηκε!")); }}>
           <Share2 className="w-3 h-3 mr-1" /> {t("Share", "Κοινοποίηση")}
          </Button>
         </div>
        </Card>

       </div>
       </Disclosure>
      </div>
     </div>
    )}

    {/* ── INVESTORS TAB ───────────────────────────────────── */}
    {activeTab === "investors" && (
     <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
       <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
        <input
         type="text"
         ref={investorSearchRef}
         placeholder={t("Search by name or focus...", "Αναζήτηση…")}
         value={investorSearch}
         onChange={(e) => setInvestorSearch(e.target.value)}
         className="w-full bg-white border border-stone-200 rounded-xl py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
        />
       </div>
       <Button variant="outline" size="sm" className="min-h-11 text-sm rounded-xl gap-1.5" onClick={() => { const types = ['All', ...Array.from(new Set(investorDirectory.map((item) => item.type)))]; const index = types.indexOf(investorType); setInvestorType(types[(index + 1) % types.length] ?? 'All'); }}>
        <SlidersHorizontal className="w-3.5 h-3.5" /> {investorType === 'All' ? t("Filters", "Φίλτρα") : typeLabel(investorType)}
       </Button>
      </div>

      {/* Investor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
       {filteredInvestors.length === 0 && (
        <EmptyHint
         className="md:col-span-2 xl:col-span-3"
         title={investorSearch || investorType !== 'All'
          ? t('No investors match these filters', 'Κανένας επενδυτής δεν ταιριάζει με αυτά τα φίλτρα')
          : t('No investors on the platform yet', 'Δεν υπάρχουν ακόμη επενδυτές στην πλατφόρμα')}
         detail={investorSearch || investorType !== 'All'
          ? t('Clear the search or type, or ask who still fits this round.', 'Καθάρισε την αναζήτηση ή τον τύπο, ή ρώτα ποιος ταιριάζει ακόμα σε αυτόν τον γύρο.')
          : t('Members with an investor role appear here. Complete your profile so they can find you, or ask the assistant who to approach.', 'Μέλη με ρόλο επενδυτή εμφανίζονται εδώ. Συμπλήρωσε το προφίλ σου για να σε βρίσκουν, ή ρώτα τον βοηθό ποιον να προσεγγίσεις.')}
        >
         {(investorSearch || investorType !== 'All') && (
          <ClearFiltersButton onClick={() => { setInvestorSearch(''); setInvestorType('All'); }} />
         )}
         <AskLink prompt="Who should I approach for this round?" />
         <button type="button" onClick={() => navigate('/profile')} className="text-xs font-medium text-stone-900 hover:underline">{t('Edit profile', 'Επεξεργασία προφίλ')}</button>
        </EmptyHint>
       )}
       {filteredInvestors.map((inv) => {
        // Find CRM data for this investor
        const crm = investorCRM.find(c => c.investorId === inv.id);
        return (
        <div key={inv.id} className="group bg-white border border-stone-100 rounded-2xl p-4 hover:border-stone-200 hover:shadow-sm transition-all flex flex-col gap-3">
         {/* Top row */}
         <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
           <div className="w-9 h-9 bg-stone-100 rounded-xl flex items-center justify-center text-stone-500 group-hover:bg-stone-900 group-hover:text-white transition-all shrink-0">
            <Building2 className="w-4 h-4" />
           </div>
           <div className="min-w-0">
            <h4 className="text-sm font-bold text-stone-900 leading-tight truncate">{inv.name}</h4>
            <FactLine className="mt-0.5" items={[typeLabel(inv.type), inv.location]} label={t("Investor facts", "Στοιχεία επενδυτή")} />
           </div>
          </div>
          <Button variant="ghost" size="icon" aria-label={t("Watch", "Παρακολούθηση")} title={t("Watch", "Παρακολούθηση")} className={cn("min-h-11 min-w-11 shrink-0 relative z-10 hover:text-amber-500", favoriteInvestors.has(inv.id) ? "text-amber-500" : "text-stone-400")} onClick={() => toggleId(listKeys.watch, inv.id)}>
           <Star className="w-3.5 h-3.5" fill={favoriteInvestors.has(inv.id) ? 'currentColor' : 'none'} />
          </Button>
         </div>

         {/* CRM Tags */}
         {crm && (
          <div className="flex flex-wrap gap-1">
           {crm.tags.map((tag: string) => (
            <span key={tag} className={cn(
             "px-1.5 py-0.5 rounded text-xs font-semibold",
             tag === "Hot Lead" ? "text-red-600" :
             tag === "Strategic" ? "text-violet-600" :
             tag === "Advisor" ? "text-blue-600" :
             tag === "Angel" ? "text-emerald-600" :
             "text-stone-600"
            )}>
             <Tag className="w-2.5 h-2.5 inline mr-0.5" />{tagLabel(tag)}
            </span>
           ))}
          </div>
         )}

         <FactLine items={inv.focus.slice(0, 3)} label={t("Focus", "Εστίαση")} />

         <FactLine
          className="pt-2 border-t border-stone-100 text-stone-600"
          items={[inv.checkSize, inv.portfolio, crm ? `${crm.relationshipScore}%` : inv.stage[0]]}
          label={crm ? t("Check, portfolio, relationship", "Check, χαρτοφυλάκιο, σχέση") : t("Check, portfolio, stage", "Check, χαρτοφυλάκιο, στάδιο")}
         />

         {/* Last Contact / Next Action */}
         {crm && (
          <div className="pt-1.5 border-t border-stone-100 space-y-1">
           <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 flex items-center gap-1">
             <History className="w-2.5 h-2.5" /> {t("Last contact", "Τελευταία επαφή")}: {formatDate(crm.lastContact)}
            </span>
           </div>
           <p className="text-xs text-stone-500 truncate">
              {t("Next", "Επόμενο")}: <span className="font-medium text-stone-700">{crm.nextAction}</span>
           </p>
          </div>
         )}

         {/* Actions */}
         <div className="flex gap-1.5 pt-1">
          <Button variant="outline" size="sm" className="flex-1 min-h-11 text-sm rounded-lg" onClick={() => navigate(inv.person ? `/messages?user=${inv.id}` : '/messages')}>
           <Mail className="w-3 h-3 mr-1" /> {t("Contact", "Επικοινωνία")}
          </Button>
          <Button
           variant="outline" size="sm"
           className={cn("flex-1 h-7 text-sm rounded-lg", pipeline.some((item) => item.investorId === inv.id) && "border-emerald-200 text-emerald-700")}
           onClick={() => {
            if (pipeline.some((item) => item.investorId === inv.id)) { removePipelineInvestor(inv.id); showToast(t("Removed from pipeline", "Αφαιρέθηκε από τη ροή")); }
            else { upsertPipelineInvestor({ investorId: inv.id, name: inv.name }); setActiveTab('tracker'); showToast(t("Added to your pipeline", "Μπήκε στη ροή σου")); }
           }}
          >
           {pipeline.some((item) => item.investorId === inv.id) ? t("In pipeline", "Στη ροή") : t("Track", "Παρακολούθηση")}
          </Button>
          <Button variant="ghost" size="icon" aria-label={t("Details", "Λεπτομέρειες")} className="min-h-11 min-w-11 rounded-lg border border-stone-100 hover:bg-stone-50" onClick={() => askAssistant(`Tell me about ${inv.name}`)}>
           <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
          </Button>
         </div>
        </div>
        );
       })}
      </div>
     </div>
    )}

    {/* ── PROGRAMS TAB ────────────────────────────────────── */}
    {activeTab === "programs" && (
     <div className="space-y-4">
      <div className="flex items-center justify-between">
       <div>
        <p className="text-xs font-semibold text-stone-400 tracking-wide">{t("Programs", "Προγράμματα")}</p>
        <h3 className="text-base font-semibold text-stone-900">{t("Accelerators, Grants & Studios", "Επιταχυντές, επιχορηγήσεις και studios")}</h3>
       </div>
       <Button variant="outline" size="sm" className="min-h-11 text-sm rounded-lg gap-1.5" onClick={() => { const types = ['All', ...Array.from(new Set(programs.map((item) => item.type)))]; const index = types.indexOf(programType); setProgramType(types[(index + 1) % types.length] ?? 'All'); }}>
        <SlidersHorizontal className="w-3.5 h-3.5" /> {programType === 'All' ? t("Filter", "Φίλτρο") : typeLabel(programType)}
       </Button>
      </div>

      {/* Programs List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
       {programs.filter((p) => programType === 'All' || p.type === programType).length === 0 && (
        <EmptyHint
         className="md:col-span-2"
         title={t('No programs published yet', 'Δεν έχουν δημοσιευτεί προγράμματα ακόμη')}
         detail={t('Accelerators and grants appear here when the catalogue has entries. Ask the assistant to watch for your stage.', 'Επιταχυντές και επιχορηγήσεις εμφανίζονται εδώ μόλις μπουν στον κατάλογο. Ζήτα από τον βοηθό να σε ενημερώσει για το στάδιό σου.')}
        >
         <AskLink prompt="What programs can I apply to?" />
         <button type="button" onClick={() => navigate('/programs')} className="text-xs font-medium text-stone-900 hover:underline">{t('Open Programs', 'Άνοιγμα Προγραμμάτων')}</button>
        </EmptyHint>
       )}
       {programs.filter((p) => programType === 'All' || p.type === programType).map((p) => {
        const daysLeft = Math.max(0, Math.round((new Date(p.deadline).getTime() - Date.now()) / 86400000));
        const urgent = daysLeft < 14;
        const typeIcon = p.type === "Accelerator" ? Rocket : p.type === "Grant" ? BadgeDollarSign : Building2;
        const TypeIcon = typeIcon;
        return (
         <div key={p.id} className="group bg-white border border-stone-100 rounded-2xl p-4 hover:border-stone-200 hover:shadow-sm transition-all">
          <div className="flex items-start gap-3">
           <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-500 shrink-0 group-hover:bg-stone-900 group-hover:text-white transition-all">
            <TypeIcon className="w-4 h-4" />
           </div>
           <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
             <h4 className="text-sm font-bold text-stone-900">{p.title}</h4>
             {(() => { const score = programMatch(p.tags) ?? (isDemoMode ? p.match : null); return score === null ? null : (
             <div className="flex items-center gap-1 shrink-0">
              <div className={cn("w-1.5 h-1.5 rounded-full", score >= 90 ? "bg-emerald-500" : score >= 75 ? "bg-amber-500" : "bg-stone-300")} />
              <span className="text-xs font-bold text-stone-600">{score}% {t("match", "ταίριασμα")}</span>
             </div>
             ); })()}
            </div>

            <FactLine
             className="mt-0.5"
             items={[p.location, `${formatDate(p.deadline)}${urgent ? ` ${daysLeftText(daysLeft)}` : ''}`]}
             label={t("Program facts", "Στοιχεία προγράμματος")}
            />

            <FactLine className="mt-2" items={p.tags} label={t("Tags", "Ετικέτες")} />
           </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
           <div className="flex items-center gap-3">
            <div>
             <p className="text-xs text-stone-400">{t("Award", "Ποσό")}</p>
             <p className="text-sm font-bold text-stone-900">{p.grant}</p>
            </div>
            <div>
             <p className="text-xs text-stone-400">{t("Type", "Τύπος")}</p>
             <p className="text-xs font-semibold text-stone-700">{typeLabel(p.type)}</p>
            </div>
           </div>
           <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="min-h-11 text-sm rounded-lg px-3" onClick={() => askAssistant(`Tell me about ${p.title}`)}>{t("Details", "Λεπτομέρειες")}</Button>
            <Button size="sm" className="min-h-11 text-sm rounded-lg px-3 bg-stone-900 text-white hover:bg-stone-800" onClick={() => { trackApplication(p.title, p.type); askAssistant(`Apply to ${p.title}`); }}>{t("Apply", "Αίτηση")}</Button>
           </div>
          </div>
         </div>
        );
       })}
      </div>
     </div>
    )}

    {/* ── OPPORTUNITIES TAB ───────────────────────────────── */}
    {activeTab === "opportunities" && (
     <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
       <div>
        <p className="text-xs font-semibold text-stone-400 tracking-wide">{t("Opportunities", "Ευκαιρίες")}</p>
        <h3 className="text-base font-semibold text-stone-900">{t("Funding & Non-Dilutive Sources", "Πηγές χρηματοδότησης και μη αραιωτικές")}</h3>
       </div>
       <Button variant="outline" size="sm" className="min-h-11 text-sm rounded-lg gap-1.5" onClick={() => { const types = ['All', ...Array.from(new Set(opportunities.map((item) => item.type)))]; const index = types.indexOf(opportunityType); setOpportunityType(types[(index + 1) % types.length] ?? 'All'); }}>
        <SlidersHorizontal className="w-3.5 h-3.5" /> {opportunityType === 'All' ? t("Filter", "Φίλτρο") : typeLabel(opportunityType)}
       </Button>
      </div>

      {/* Summary stats */}
      {isDemoMode && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
       {[
        { label: t("Open Opps", "Ανοιχτές ευκαιρίες"),   value: "5",      icon: Target,   color: "text-stone-900" },
        { label: t("Total Capital", "Συνολικό κεφάλαιο"), value: "$11M+", icon: BadgeDollarSign, color: "text-emerald-700" },
        { label: t("Avg Close", "Μέσο κλείσιμο"),   value: "28d",    icon: Clock,    color: "text-stone-900" },
       ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-white border border-stone-100 rounded-2xl p-3 flex items-center gap-2.5">
         <div className="w-8 h-8 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-stone-500" />
         </div>
         <div>
          <p className={cn("text-base font-bold", color)}>{value}</p>
          <p className="text-xs text-stone-400">{label}</p>
         </div>
        </div>
       ))}
      </div>
      )}

      {/* Opportunities list */}
      <div className="space-y-2">
       {opportunities.length === 0 && (
        <EmptyHint
         title={t("No live opportunities right now.", "Δεν υπάρχουν ενεργές ευκαιρίες αυτή τη στιγμή.")}
         detail={t("The assistant can scan programs and grants that fit your startup — or track an opportunity yourself.", "Ο βοηθός μπορεί να ψάξει προγράμματα και επιχορηγήσεις που ταιριάζουν στο startup σου — ή να καταγράψεις μια ευκαιρία μόνος σου.")}
        >
         <AskLink prompt="Find funding opportunities that fit my startup" />
        </EmptyHint>
       )}
       {opportunities.filter((opp) => opportunityType === 'All' || opp.type === opportunityType).map((opp) => (
        <div key={opp.id} className="group bg-white border border-stone-100 rounded-2xl p-4 hover:border-stone-200 hover:shadow-sm transition-all">
         <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-stone-500 shrink-0">
           <DollarSign className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
           <div className="flex items-start justify-between gap-2">
            <div>
             <h4 className="text-sm font-bold text-stone-900">{opp.title}</h4>
             <p className="text-xs text-stone-400 mt-0.5">{opp.org}</p>
            </div>
            <div className="shrink-0 text-right">
             <p className="text-sm font-bold text-stone-900">{moneyWords(opp.amount)}</p>
             <p className="text-xs text-stone-400">{typeLabel(opp.type)}</p>
            </div>
           </div>

           <div className="flex items-center gap-3 mt-2">
            <FactLine className="flex-1" items={opp.tags} label={t("Tags", "Ετικέτες")} />
            <span className={cn("text-xs font-semibold ml-auto shrink-0",
             opp.deadline === "Rolling" ? "text-emerald-600" : "text-stone-400"
            )}>
             <Calendar className="w-2.5 h-2.5 inline mr-0.5" />{opp.deadline === "Rolling" ? t("Rolling", "Συνεχής") : formatDate(opp.deadline)}
            </span>
           </div>
          </div>
         </div>

         <div className="flex gap-1.5 mt-3 pt-3 border-t border-stone-100 justify-end">
          <Button variant="outline" size="sm" className="min-h-11 text-sm rounded-lg px-3" onClick={() => askAssistant(`Tell me about ${opp.title}`)}>{t("Learn More", "Μάθετε περισσότερα")}</Button>
          <Button size="sm" className="min-h-11 text-sm rounded-lg px-3 bg-stone-900 text-white hover:bg-stone-800" onClick={() => { trackApplication(opp.title, opp.type); askAssistant(`Apply to ${opp.title}`); }}>{t("Apply Now", "Αίτηση τώρα")}</Button>
         </div>
        </div>
       ))}
      </div>
     </div>
    )}

    {/* ── MODALS ─────────────────────────────────────────── */}

    {/* Meeting Scheduler Modal */}
    {showMeetingScheduler && (
     <div className="fixed inset-0 bg-stone-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-sm">
       <div className="flex items-center justify-between">
        <div>
         <h3 className="text-base font-semibold text-stone-900">{t("Schedule Meeting", "Προγραμματισμός συνάντησης")}</h3>
         <p className="text-xs text-stone-400">{t("Book time with investors", "Κλείσε ραντεβού με επενδυτές")}</p>
        </div>
        <button 
         type="button"
         aria-label={t("Close meeting scheduler", "Κλείσιμο προγραμματισμού συνάντησης")}
         onClick={() => setShowMeetingScheduler(false)}
         className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors"
        >
         <X className="w-4 h-4 text-stone-500" />
        </button>
       </div>

       <div className="space-y-3">
        <div className="space-y-1.5">
         <label htmlFor="meeting-investor" className="text-xs font-semibold text-stone-500 tracking-wider">{t("Investor", "Επενδυτής")}</label>
         <select id="meeting-investor" value={meetingInvestor} onChange={(e) => setMeetingInvestor(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-200">
          {investorDirectory.map(inv => <option key={inv.id} value={inv.id}>{inv.name}</option>)}{investorDirectory.length === 0 && <option value="">—</option>}
         </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
         <div className="space-y-1.5">
          <label htmlFor="meeting-date" className="text-xs font-semibold text-stone-500 tracking-wider">{t("Date", "Ημερομηνία")}</label>
          <input id="meeting-date" type="date" required value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm" />
         </div>
         <div className="space-y-1.5">
          <label htmlFor="meeting-time" className="text-xs font-semibold text-stone-500 tracking-wider">{t("Time", "Ώρα")}</label>
          <input id="meeting-time" type="time" required value={meetingWhen} onChange={(e) => setMeetingWhen(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm" />
         </div>
        </div>
        <div className="space-y-1.5">
         <label className="text-xs font-semibold text-stone-500 tracking-wider">{t("Meeting Type", "Τύπος συνάντησης")}</label>
         <div className="flex flex-wrap gap-2" role="group" aria-label={t("Meeting type", "Τύπος συνάντησης")}>
          {["Video Call", "Phone", "Coffee", "Office"].map(type => (
           <button type="button" aria-pressed={selectedMeetingType === type} key={type} onClick={() => setSelectedMeetingType(type)} className={cn("min-h-11 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors", selectedMeetingType === type ? "bg-stone-200 text-stone-900 border-stone-400 font-semibold" : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100")}>
            {meetingTypeLabel(type)}
           </button>
          ))}
         </div>
        </div>
        <div className="space-y-1.5">
         <label htmlFor="meeting-notes" className="text-xs font-semibold text-stone-500 tracking-wider">{t("Notes", "Σημειώσεις")}</label>
         <textarea id="meeting-notes" value={meetingNotes} onChange={(e) => setMeetingNotes(e.target.value)} placeholder={t("Meeting agenda...", "Ατζέντα συνάντησης...")} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm h-20 resize-none" />
        </div>
       </div>

       {meetingError && <p role="alert" className="text-sm text-red-600">{meetingError}</p>}
       <DraftNotice {...meetingDraft} onDiscard={() => { meetingDraft.reset({ type: 'Video Call', investor: 'inv_1', date: '', time: '', notes: '' }); setMeetingError(''); }} />
       <div className="flex flex-wrap gap-2 pt-2">
        <Button variant="outline" className="flex-1 min-h-11 text-sm" onClick={() => setShowMeetingScheduler(false)}>{t("Close", "Κλείσιμο")}</Button>
        <Button className="flex-1 min-h-11 text-sm bg-stone-900 text-white" onClick={() => {
         const result = sessionFromMeetingDraft(
          { date: meetingDate, time: meetingWhen, type: selectedMeetingType, notes: meetingNotes },
          investorDirectory.find((item) => item.id === meetingInvestor), crypto.randomUUID(),
         );
         if (result.error) {
          setMeetingError(result.error === 'investor'
           ? t("Choose an investor before scheduling.", "Επίλεξε επενδυτή πριν προγραμματίσεις.")
           : t("Choose a valid date and time.", "Επίλεξε έγκυρη ημερομηνία και ώρα."));
          return;
         }
         try {
         addSession(result.session);
         meetingDraft.reset({ type: 'Video Call', investor: 'inv_1', date: '', time: '', notes: '' });
         setMeetingError('');
         setMeetingDate('');
         setMeetingWhen('');
         setMeetingNotes('');
         setShowMeetingScheduler(false);
         showToast(t("Meeting added to Calendar on this device.", "Η συνάντηση προστέθηκε στο Ημερολόγιο στη συσκευή."));
         } catch {
          setMeetingError(t('Could not add the meeting. Your draft is still here — try again.', 'Η συνάντηση δεν προστέθηκε. Το πρόχειρο διατηρήθηκε — δοκίμασε ξανά.'));
         }
        }}>{t("Schedule Meeting", "Προγραμματισμός συνάντησης")}</Button>
       </div>
      </div>
     </div>
    )}

    {/* Document Room Modal */}
    {showDocumentRoom && (
     <div className="fixed inset-0 bg-stone-950/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[min(92dvh,100%)] overflow-y-auto p-4 sm:p-5 space-y-4 shadow-sm">
       <div className="flex items-center justify-between">
        <div>
         <h3 className="text-base font-semibold text-stone-900">{t("Data Room", "Data room")}</h3>
         <p className="text-xs text-stone-400">{t("Manage investor documents", "Διαχείριση εγγράφων επενδυτών")}</p>
        </div>
        <button 
         type="button"
         aria-label={t("Close data room", "Κλείσιμο data room")}
         onClick={() => setShowDocumentRoom(false)}
         className="min-h-11 min-w-11 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors shrink-0"
        >
         <X className="w-4 h-4 text-stone-500" />
        </button>
       </div>

       <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 bg-stone-50 rounded-xl">
        {documentFolders.map(folder => (
         <button 
          key={folder.id}
          onClick={() => setSelectedFolder(folder.id)}
          className={cn(
           "p-3 rounded-xl border text-left transition-all",
           selectedFolder === folder.id 
            ? "bg-white border-stone-300 shadow-sm" 
            : "border-transparent hover:bg-white"
          )}
         >
          <div className="w-8 h-8 rounded-lg bg-stone-100 mb-2 flex items-center justify-center">
           <FolderOpen className="w-4 h-4 text-stone-500" />
          </div>
          <p className="text-sm font-medium text-stone-900">{labelOf(folder.name)}</p>
          <p className="text-xs text-stone-400">{folder.count} {t("files", "αρχεία")}</p>
         </button>
        ))}
       </div>

       <div className="border border-stone-100 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
         <span className="text-xs font-semibold text-stone-500 tracking-wider">
          {selectedFolder ? labelOf(documentFolders.find(f => f.id === selectedFolder)?.name ?? "") : t("All Documents", "Όλα τα έγγραφα")}
         </span>
         <Button size="sm" className="min-h-11 text-xs px-2 bg-stone-900 text-white" disabled={roomUploading} onClick={() => roomFileRef.current?.click()}>
          <Plus className="w-3 h-3 mr-1" /> {roomUploading ? t("Uploading…", "Μεταφόρτωση…") : t("Upload", "Μεταφόρτωση")}
         </Button>
         <input ref={roomFileRef} type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void uploadRoomFile(file); }} />
        </div>
        <div className="space-y-1">
         {visibleRoomFiles.map(file => (
          <div key={file.name} className="flex items-center justify-between p-2 hover:bg-stone-50 rounded-lg transition-colors">
           <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center">
             <FileText className="w-3.5 h-3.5 text-stone-500" />
            </div>
            <div>
             <p className="text-sm font-medium text-stone-900">{file.name}</p>
             <p className="text-xs text-stone-400">{file.size} · {t("Updated", "Ενημερώθηκε")} {formatDate(file.updated)}</p>
            </div>
           </div>
           <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400 flex items-center gap-1">
             <Eye className="w-3 h-3" /> {file.views}
            </span>
            {file.url ? (
             <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors" aria-label={t(`Download ${file.name}`, `Λήψη ${file.name}`)} title={t("Download", "Λήψη")}>
              <Download className="w-3.5 h-3.5 text-stone-500" />
             </a>
            ) : (
             <span className="p-1.5 rounded-lg cursor-not-allowed" title={t("Sample file — there is nothing to download", "Δοκιμαστικό αρχείο — δεν υπάρχει περιεχόμενο για λήψη")} aria-label={t("Sample file — nothing to download", "Δοκιμαστικό αρχείο — τίποτα για λήψη")}>
              <Download className="w-3.5 h-3.5 text-stone-200" />
             </span>
            )}
           </div>
          </div>
         ))}
         {visibleRoomFiles.length === 0 && (
          <p className="text-xs text-stone-400 py-3 text-center">
           {selectedFolder ? t("No files in this folder yet — upload one above.", "Δεν υπάρχουν αρχεία σε αυτόν τον φάκελο ακόμη — ανέβασε ένα παραπάνω.") : t("No documents yet — upload your first file above.", "Δεν υπάρχουν έγγραφα ακόμη — ανέβασε το πρώτο σου αρχείο παραπάνω.")}
          </p>
         )}
        </div>
       </div>

       <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2 text-xs text-stone-400">
         <Shield className="w-3.5 h-3.5" />
         <span>{t("Stored with your account. Share a file by sending its link — there is no per-investor access log yet.", "Αποθηκεύεται στον λογαριασμό σου. Μοιράσου ένα αρχείο στέλνοντας τον σύνδεσμό του — δεν υπάρχει ακόμη καταγραφή πρόσβασης ανά επενδυτή.")}</span>
        </div>
        <Button variant="outline" className="min-h-11 text-sm" onClick={() => setShowDocumentRoom(false)}>{t("Close", "Κλείσιμο")}</Button>
       </div>
      </div>
     </div>
    )}

   </div>
  </PageShell>
  <AnimatePresence>
   {toastMsg && (
    <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     exit={{ opacity: 0, y: 20 }}
     className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-md px-5 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-xl shadow-xl text-center"
    >
     {toastMsg}
    </motion.div>
   )}
  </AnimatePresence>
  </>
 );
}
