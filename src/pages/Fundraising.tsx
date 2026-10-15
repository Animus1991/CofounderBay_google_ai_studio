import { useState, useCallback, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from "motion/react";
import {
 DollarSign,
 Search,
 SlidersHorizontal,
 ArrowRight,
 Clock,
 TrendingUp,
 Users,
 Briefcase,
 ChevronRight,
 Star,
 FileText,
 Zap,
 MapPin,
 Calendar,
 ExternalLink,
 CheckCircle2,
 AlertCircle,
 Building2,
 Rocket,
 Globe,
 BadgeDollarSign,
 Target,
 Activity,
 FolderOpen,
 Lock,
 Unlock,
 Video,
 Phone,
 Mail,
 Tag,
 Calculator,
 Scale,
 Shield,
 History,
 BarChart2,
 Download,
 Share2,
 Eye,
 MoreHorizontal,
 Plus,
 X,
 ChevronLeft,
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageShell from "../components/ui/PageShell";
import { User, FundraisingTracker } from "../types";
import { cn } from "../lib/utils";
import { bothText } from "../lib/labels";
import { addRoomFile, addSession, listKeys, readIds, readRoomFiles, toggleId, trackApplication, type RoomFile } from "../lib/localLists";

interface FundraisingProps {
 user: User;
}

const STAGE_META: Record<string, { color: string; dot: string }> = {
 "Identified":    { color: "text-stone-500",   dot: "bg-stone-400" },
 "Contacted":     { color: "text-blue-600",    dot: "bg-blue-500" },
 "Meeting":       { color: "text-violet-600",  dot: "bg-violet-500" },
 "Due Diligence": { color: "text-amber-700",   dot: "bg-amber-500" },
 "Term Sheet":    { color: "text-emerald-700", dot: "bg-emerald-500" },
 "Closed":        { color: "text-green-700",   dot: "bg-green-500" },
 "Passed":        { color: "text-rose-500",    dot: "bg-stone-400" },
};

export default function Fundraising({ user }: FundraisingProps) {
 const navigate = useNavigate();
 const [toastMsg, setToastMsg] = useState<string | null>(null);
 const showToast = useCallback((msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 2500); }, []);
 const [favoriteInvestors, setFavoriteInvestors] = useState<Set<string>>(() => new Set(readIds(listKeys.watch)));
 const [selectedMeetingType, setSelectedMeetingType] = useState('Video Call');
 const [meetingInvestor, setMeetingInvestor] = useState('inv_1');
 const [meetingWhen, setMeetingWhen] = useState('');
 const [programType, setProgramType] = useState('All');
 const [opportunityType, setOpportunityType] = useState('All');
 const [investorType, setInvestorType] = useState('All');
 const roomFileRef = useRef<HTMLInputElement>(null);
 const seedRoomFiles: RoomFile[] = [
  { name: "Pitch_Deck_v3.pdf", size: "4.2 MB", views: 24, updated: "2026-04-20" },
  { name: "Financial_Projections_2026.xlsx", size: "1.8 MB", views: 12, updated: "2026-04-18" },
  { name: "Cap_Table_Safe.v2.pdf", size: "890 KB", views: 8, updated: "2026-04-15" },
  { name: "IP_Assignments.zip", size: "12.4 MB", views: 3, updated: "2026-04-12" },
 ];
 const [roomFiles, setRoomFiles] = useState<RoomFile[]>(() => {
  const extra = readRoomFiles();
  const names = new Set(extra.map((file) => file.name));
  return [...extra, ...seedRoomFiles.filter((file) => !names.has(file.name))];
 });
 const [activeTab, setActiveTab] = useState<"tracker" | "investors" | "programs" | "opportunities">("tracker");
 const [investorSearch, setInvestorSearch] = useState("");
 const investorSearchRef = useRef<HTMLInputElement>(null);
 const [showMeetingScheduler, setShowMeetingScheduler] = useState(false);
 const [showDocumentRoom, setShowDocumentRoom] = useState(false);
 const [showSAFECalc, setShowSAFECalc] = useState(false);
 const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

 const mockTracker: FundraisingTracker = {
  id: "tracker_1",
  startupId: "startup_1",
  targetAmount: 1500000,
  raisedAmount: 450000,
  currency: "USD",
  stage: "Seed",
  investors: ["inv_1", "inv_2"],
  status: "Active",
  investorPipeline: [
   { investorId: "inv_1", stage: "Due Diligence", notes: "Requested financial projections for 2027." },
   { investorId: "inv_2", stage: "Meeting",       notes: "Second meeting scheduled for next Tuesday." },
   { investorId: "inv_3", stage: "Contacted",     notes: "Intro sent via Alex." },
   { investorId: "inv_4", stage: "Identified",    notes: "Fits our thesis perfectly." },
   { investorId: "inv_5", stage: "Passed",        notes: "Too early for their current fund." },
  ],
 };

 const pct = Math.round((mockTracker.raisedAmount / mockTracker.targetAmount) * 100);
 const runway = Math.round((mockTracker.targetAmount - mockTracker.raisedAmount) / 12000); // months at $12k/mo burn

 const investorNames = ["Sequoia Capital", "Naval Ravikant", "Andreessen Horowitz", "First Round Capital",
                        "Bessemer Venture", "Index Ventures", "Lightspeed", "Accel Partners"];

 const mockInvestors: any[] = [
  { id: "inv_1", name: "Sequoia Capital",       type: "VC",    focus: ["SaaS", "FinTech", "AI"],              stage: ["Seed", "Series A"],              location: "Menlo Park, CA",   checkSize: "$500k–$5M",   portfolio: 312 },
  { id: "inv_2", name: "Naval Ravikant",         type: "Angel", focus: ["Crypto", "Marketplaces", "DeepTech"], stage: ["Pre-Seed", "Seed"],               location: "San Francisco, CA", checkSize: "$25k–$250k",  portfolio: 84 },
  { id: "inv_3", name: "Andreessen Horowitz",    type: "VC",    focus: ["Consumer", "Enterprise", "Bio"],       stage: ["Seed", "Series A", "Series B"],  location: "Menlo Park, CA",   checkSize: "$1M–$50M",    portfolio: 510 },
  { id: "inv_4", name: "First Round Capital",    type: "VC",    focus: ["Early Stage", "Generalist"],           stage: ["Seed"],                          location: "Philadelphia, PA",  checkSize: "$250k–$3M",   portfolio: 195 },
  { id: "inv_5", name: "Bessemer Venture",       type: "VC",    focus: ["Cloud", "Cybersecurity", "HealthTech"],stage: ["Series A", "Series B"],          location: "Redwood City, CA",  checkSize: "$5M–$25M",    portfolio: 240 },
  { id: "inv_6", name: "Index Ventures",         type: "VC",    focus: ["Fintech", "Gaming", "Marketplaces"],   stage: ["Seed", "Series A"],              location: "London / SF",       checkSize: "$1M–$15M",    portfolio: 180 },
 ];

 const filteredInvestors = mockInvestors.filter(inv => {
  const q = investorSearch.toLowerCase();
  const matchesQuery = !q || inv.name.toLowerCase().includes(q) || inv.focus.some((f: string) => f.toLowerCase().includes(q));
  const matchesType = investorType === 'All' || inv.type === investorType;
  return matchesQuery && matchesType;
 });

 const mockPrograms = [
  { id: "prog_1", title: "Y Combinator S26",       deadline: "2026-04-19", type: "Accelerator", grant: "$500k",  location: "Remote / SF",  match: 96, tags: ["AI", "B2B", "Global"],     status: "open" },
  { id: "prog_2", title: "Techstars Sustainability", deadline: "2026-05-01", type: "Accelerator", grant: "$120k",  location: "NYC",          match: 88, tags: ["CleanTech", "Impact"],    status: "open" },
  { id: "prog_3", title: "NSF SBIR Phase I",         deadline: "2026-06-18", type: "Grant",       grant: "$275k",  location: "US Only",      match: 72, tags: ["R&D", "DeepTech"],        status: "open" },
  { id: "prog_4", title: "Founders Factory EU",      deadline: "2026-07-10", type: "Studio",      grant: "€150k",  location: "London / Paris", match: 81, tags: ["B2B SaaS", "Series A"], status: "upcoming" },
 ];

 const mockOpportunities = [
  { id: "opp_1", title: "Series A Scout Network",     org: "Sequoia Capital",       type: "Intro Request",    amount: "$5M+",    deadline: "Rolling",     tags: ["AI", "SaaS"],      status: "active" },
  { id: "opp_2", title: "Impact Investor Roundtable", org: "Impact Capital Forum",  type: "Pitch Event",      amount: "$1–3M",   deadline: "2026-05-12",  tags: ["Impact", "ESG"],   status: "active" },
  { id: "opp_3", title: "Founder Grant — Q2 2026",    org: "Stripe Foundation",     type: "Non-dilutive Grant",amount: "$50k",   deadline: "2026-05-30",  tags: ["Fintech", "SMB"],  status: "active" },
  { id: "opp_4", title: "EU Horizon Innovation Fund", org: "European Commission",   type: "Grant",            amount: "€250k",   deadline: "2026-06-01",  tags: ["DeepTech", "EU"],  status: "active" },
  { id: "opp_5", title: "Debt Facility — Revenue-Based",org: "Clearco",             type: "Revenue-Based",    amount: "up to $2M",deadline: "Rolling",   tags: ["SaaS", "MRR>$30k"],status: "active" },
 ];

 const stageOrder = ["Identified", "Contacted", "Meeting", "Due Diligence", "Term Sheet", "Closed", "Passed"];
 const stageCounts = stageOrder.map(s => ({
  stage: s,
  count: (mockTracker.investorPipeline ?? []).filter(p => p.stage === s).length,
 }));

 const barData = [40, 60, 45, 80, 55, 90, 70];
 const barMax = Math.max(...barData);

 const mockCapTable = [
  { name: "Founders", shares: 8000000, pct: 80, color: "bg-stone-900" },
  { name: "Seed SAFEs", shares: 1000000, pct: 10, color: "bg-stone-400" },
  { name: "ESOP Pool", shares: 1000000, pct: 10, color: "bg-stone-200" },
 ];

 const dueDiligenceItems = [
  { id: "dd1", label: "Incorporation docs", status: "complete" },
  { id: "dd2", label: "IP assignments", status: "complete" },
  { id: "dd3", label: "Financial projections", status: "pending" },
  { id: "dd4", label: "Cap table audit", status: "pending" },
  { id: "dd5", label: "Key contracts", status: "pending" },
 ];

 const emailTemplates = [
  { id: "et1", name: "Cold Intro", subject: "Introduction: {{startup}} — {{sector}}" },
  { id: "et2", name: "Follow-up", subject: "Following up: {{startup}} pitch deck" },
  { id: "et3", name: "Data Room", subject: "Data room access: {{startup}}" },
 ];

 // Meeting Scheduler Data
 const upcomingMeetings = [
  { id: "m1", investor: "Sequoia Capital", type: "Video Call", date: "2026-04-28", time: "10:00 AM", duration: "45 min", status: "confirmed", notes: "Partnership discussion" },
  { id: "m2", investor: "Naval Ravikant", type: "Coffee Chat", date: "2026-04-30", time: "2:00 PM", duration: "30 min", status: "pending", notes: "Advisory role" },
  { id: "m3", investor: "First Round", type: "Pitch", date: "2026-05-02", time: "11:00 AM", duration: "60 min", status: "confirmed", notes: "Seed round pitch" },
 ];

 // Document Room Data
 const documentFolders = [
  { id: "f1", name: "Legal", count: 8, access: "investors", lastUpdated: "2026-04-20" },
  { id: "f2", name: "Financials", count: 12, access: "investors", lastUpdated: "2026-04-18" },
  { id: "f3", name: "Product", count: 5, access: "public", lastUpdated: "2026-04-15" },
  { id: "f4", name: "Team", count: 6, access: "investors", lastUpdated: "2026-04-22" },
 ];

 // Enhanced Investor CRM with tags and relationship data
 const investorCRM = [
  { id: "crm1", investorId: "inv_1", tags: ["Hot Lead", "Strategic"], lastContact: "2026-04-20", relationshipScore: 85, nextAction: "Send updated projections", priority: "high" },
  { id: "crm2", investorId: "inv_2", tags: ["Advisor", "Angel"], lastContact: "2026-04-15", relationshipScore: 72, nextAction: "Schedule follow-up", priority: "medium" },
  { id: "crm3", investorId: "inv_3", tags: ["Competition"], lastContact: "2026-04-10", relationshipScore: 45, nextAction: "Re-engage with milestone", priority: "low" },
 ];

 // SAFE Calculator State (mock)
 const safeCalcData = {
  valuationCap: 8000000,
  discountRate: 20,
  investmentAmount: 500000,
  proRata: true,
  mostFavoredNation: true,
 };

 return (
  <>
  <PageShell title="Fundraising" description="Track your round, discover investors, and apply for programs." maxWidth="full">
   <div className="space-y-5">

    {/* Tab Bar */}
    <div className="scroll-tabs bg-stone-50 p-1 rounded-xl border border-stone-100">
     {(["tracker", "investors", "programs", "opportunities"] as const).map((tab) => (
      <button
       key={tab}
       onClick={() => setActiveTab(tab)}
       className={cn(
        "px-3 py-1.5 text-sm font-semibold tracking-wide rounded-lg transition-all",
        activeTab === tab ? "bg-stone-900 text-white shadow" : "text-stone-400 hover:text-stone-700"
       )}
      >
       {tab.charAt(0).toUpperCase() + tab.slice(1)}
      </button>
     ))}
    </div>

    {/* ── TRACKER TAB ─────────────────────────────────────── */}
    {activeTab === "tracker" && (
     <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

      {/* Left: Round Summary */}
      <div className="lg:col-span-1 space-y-4">
       <Card className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
         <p className="text-xs font-semibold text-stone-400 tracking-wide">Seed Round Progress</p>
         <span className="px-2 py-0.5 text-emerald-700 text-xs font-semibold rounded-md">
          {mockTracker.status}
         </span>
        </div>

        {/* Amount & Bar */}
        <div className="space-y-1.5">
         <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-stone-900">${(mockTracker.raisedAmount / 1000).toFixed(0)}k</span>
          <span className="text-sm text-stone-400">of ${(mockTracker.targetAmount / 1000000).toFixed(1)}M</span>
         </div>
         <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div className="h-full bg-stone-900 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
         </div>
         <div className="flex justify-between text-xs text-stone-400">
          <span>{pct}% raised</span>
          <span>${((mockTracker.targetAmount - mockTracker.raisedAmount) / 1000).toFixed(0)}k remaining</span>
         </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-100">
         {[
          { label: "Active Leads",  value: "3",        color: "" },
          { label: "Days in Round", value: "42",       color: "" },
          { label: "Meetings",      value: "18",       color: "" },
          { label: "Burn Rate",     value: "$12k/mo",  color: "text-red-500" },
          { label: "Runway Left",   value: `${runway}mo`, color: runway < 6 ? "text-amber-600" : "" },
          { label: "Close Rate",    value: "38%",      color: "" },
         ].map(({ label, value, color }) => (
          <div key={label} className="space-y-0.5 py-1.5">
           <p className="text-xs text-stone-400 tracking-wider">{label}</p>
           <p className={cn("text-base font-bold text-stone-900", color)}>{value}</p>
          </div>
         ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-3 pt-2 border-t border-stone-100">
         <p className="text-xs font-semibold text-stone-400 tracking-wide">Quick Actions</p>
         <Button variant="outline" className="w-full justify-start gap-2 text-sm h-9 rounded-lg" onClick={() => setShowDocumentRoom(true)}>
          <FileText className="w-3.5 h-3.5 shrink-0" /> Update Data Room
         </Button>
         <Button variant="outline" className="w-full justify-start gap-2 text-sm h-9 rounded-lg" onClick={() => setShowMeetingScheduler(true)}>
          <Users className="w-3.5 h-3.5 shrink-0" /> Log New Meeting
         </Button>
         <Button className="w-full justify-start gap-2 text-sm h-9 rounded-lg bg-stone-900 text-white hover:bg-stone-800" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'Record a $50k investment in my round' } }))}>
          <DollarSign className="w-3.5 h-3.5 shrink-0" /> Record Investment
         </Button>
        </div>

        {/* Mini Cap Table */}
        <div className="pt-2 border-t border-stone-100 space-y-2">
         <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-stone-400 tracking-wide">Cap Table</p>
          <span className="text-xs text-stone-400">10M shares</span>
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
            <span className="text-xs text-stone-600">{row.name} {row.pct}%</span>
           </div>
          ))}
         </div>
        </div>

        {/* Due Diligence Checklist Mini */}
        <div className="pt-2 border-t border-stone-100 space-y-1.5">
         <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-stone-400 tracking-wide">Due Diligence</p>
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
            )}>{item.label}</span>
           </div>
          ))}
         </div>
        </div>

        {/* Email Templates Quick Access */}
        <div className="pt-2 border-t border-stone-100 space-y-1.5">
         <p className="text-xs font-semibold text-stone-400 tracking-wide">Email Templates</p>
         <div className="flex flex-wrap gap-1">
          {emailTemplates.map((et) => (
           <button key={et.id} onClick={() => { navigator.clipboard.writeText(et.subject.replace('{{startup}}', 'EcoFlow Systems').replace('{{sector}}', 'CleanTech')); showToast(`"${et.name}" subject copied`); }} className="px-2 py-1 bg-stone-50 hover:bg-stone-100 border border-stone-100 rounded-md text-xs text-stone-600 transition-colors">
            {et.name}
           </button>
          ))}
         </div>
        </div>

        {/* Meeting Scheduler Mini */}
        <div className="pt-2 border-t border-stone-100 space-y-2">
         <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-stone-400 tracking-wide">Upcoming Meetings</p>
          <button 
           onClick={() => setShowMeetingScheduler(true)}
           className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-0.5 transition-colors"
          >
           <Plus className="w-3 h-3" /> Schedule
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
             <p className="text-xs text-stone-400">{meeting.date} · {meeting.time}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-stone-500 transition-colors shrink-0" />
           </div>
          ))}
         </div>
         <button 
          onClick={() => setShowMeetingScheduler(true)}
          className="w-full py-1.5 text-xs text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-lg border border-stone-100 transition-all"
         >
          View All {upcomingMeetings.length} Meetings
         </button>
        </div>
       </Card>

       {/* Stage Funnel */}
       <Card className="p-4 space-y-3">
        <p className="text-xs font-semibold text-stone-400 tracking-wide">Pipeline Funnel</p>
        <div className="space-y-1.5">
         {stageCounts.filter(s => s.stage !== "Passed").concat(stageCounts.filter(s => s.stage === "Passed")).map(({ stage, count }) => {
          const meta = STAGE_META[stage] ?? { color: "text-stone-500", dot: "bg-stone-400" };
          return (
           <div key={stage} className="flex items-center gap-2">
            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", meta.dot)} />
            <div className="flex-1 flex items-center justify-between min-w-0">
             <span className="text-sm text-stone-600 truncate">{stage}</span>
             <span className="text-sm font-bold text-stone-900 shrink-0 ml-2">{count}</span>
            </div>
           </div>
          );
         })}
        </div>
       </Card>

       {/* Document Room */}
       <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
         <p className="text-xs font-semibold text-stone-400 tracking-wide">Data Room</p>
         <button 
          onClick={() => setShowDocumentRoom(true)}
          className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-0.5 transition-colors"
         >
          <Eye className="w-3 h-3" /> View
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
           <p className="text-sm font-medium text-stone-900">{folder.name}</p>
           <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-stone-400">{folder.count} files</p>
            <p className="text-xs text-stone-400">{folder.lastUpdated.slice(5)}</p>
           </div>
          </div>
         ))}
        </div>
        <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-100">
         <div className="flex items-center gap-1.5">
          <BarChart2 className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-xs text-stone-600">12 investors viewed this week</span>
         </div>
         <button className="text-xs text-amber-700 font-semibold hover:underline" onClick={() => navigate('/insights')}>Analytics</button>
        </div>
       </Card>
      </div>

      {/* Right: Pipeline Table + Bottom Cards */}
      <div className="lg:col-span-2 space-y-4">

       {/* Investor Pipeline Table */}
       <Card title="Investor Pipeline" subtitle="Manage your investor relationships and deal stages">
        <div className="overflow-x-auto">
         <table className="w-full text-left border-collapse">
          <thead>
           <tr className="bg-stone-50 border-b border-stone-100">
            <th className="px-3 py-2 text-xs font-semibold text-stone-400 tracking-wide">Investor</th>
            <th className="px-3 py-2 text-xs font-semibold text-stone-400 tracking-wide">Stage</th>
            <th className="px-3 py-2 text-xs font-semibold text-stone-400 tracking-wide">Latest Note</th>
            <th className="px-3 py-2 text-xs font-semibold text-stone-400 tracking-wide"></th>
           </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
           {(mockTracker.investorPipeline ?? []).map((item, i) => {
            const meta = STAGE_META[item.stage] ?? { color: "text-stone-500", dot: "bg-stone-400" };
            return (
             <tr key={i} className="hover:bg-stone-50 transition-colors group">
              <td className="px-3 py-2.5">
               <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 shrink-0">
                 <Briefcase className="w-3.5 h-3.5" />
                </div>
                <div>
                 <p className="text-sm font-semibold text-stone-900">{investorNames[i] ?? `Investor ${i + 1}`}</p>
                 <p className="text-xs text-stone-400">Lead investor</p>
                </div>
               </div>
              </td>
              <td className="px-3 py-2.5">
               <span className={cn("px-2 py-0.5 rounded-md text-xs font-semibold tracking-wide whitespace-nowrap", meta.color)}>
                {item.stage}
               </span>
              </td>
              <td className="px-3 py-2.5">
               <p className="text-sm text-stone-500 max-w-[180px] truncate">{item.notes}</p>
              </td>
              <td className="px-3 py-2.5">
               <ChevronRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-stone-600 transition-colors" />
              </td>
             </tr>
            );
           })}
          </tbody>
         </table>
        </div>
        <div className="px-3 py-2.5 bg-stone-50 border-t border-stone-100 flex justify-center">
         <Button variant="ghost" size="sm" className="text-xs font-semibold tracking-wide text-stone-400 hover:text-stone-900 h-7" onClick={() => setActiveTab('investors')}>
          View Full CRM <ChevronRight className="w-3 h-3 ml-1" />
         </Button>
        </div>
       </Card>

       {/* Bottom: Insights + Deadlines */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <Card title="Fundraising Insights" subtitle="Round analytics and benchmarks" className="p-4">
         <div className="space-y-4">
          {/* Bar chart */}
          <div className="space-y-1.5">
           <div className="flex justify-between text-xs tracking-wide">
            <span className="text-stone-400 font-semibold">Investor Interest</span>
            <span className="text-emerald-600 font-semibold">+15% vs last week</span>
           </div>
           <div className="h-24 flex items-end gap-1 group/bar">
            {barData.map((h, i) => (
             <div
              key={i}
              className="flex-1 bg-stone-100 rounded-t hover:bg-stone-800 transition-all cursor-pointer relative"
              style={{ height: `${(h / barMax) * 100}%` }}
             >
              {/* Tooltip on hover */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
               {h} views
              </div>
             </div>
            ))}
           </div>
           <div className="flex justify-between text-xs text-stone-400">
            {["Mo","Tu","We","Th","Fr","Sa","Su"].map(d => (
             <span key={d} className="flex-1 text-center">{d}</span>
            ))}
           </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-100">
           {[
            { label: "Avg Response", value: "3.2d" },
            { label: "Open Rate",    value: "68%" },
            { label: "Reply Rate",   value: "41%" },
           ].map(({ label, value }) => (
            <div key={label} className="text-center py-1.5 bg-stone-50 rounded-xl border border-stone-100">
             <p className="text-base font-bold text-stone-900">{value}</p>
             <p className="text-xs text-stone-400">{label}</p>
            </div>
           ))}
          </div>

          {/* Hot take */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-2">
           <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
           <p className="text-sm text-stone-600 leading-relaxed">
            Your <span className="font-semibold text-stone-900">Due Diligence</span> stage moves 20% faster than the industry average for Seed rounds.
           </p>
          </div>
         </div>
        </Card>

        <Card title="Upcoming Deadlines" subtitle="Don't miss these opportunities" className="p-4">
         <div className="space-y-2">
          {mockPrograms.map((p) => {
           const daysLeft = Math.max(0, Math.round((new Date(p.deadline).getTime() - Date.now()) / 86400000));
           const urgent = daysLeft < 14;
           return (
            <div key={p.id} className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl border border-stone-100 hover:border-stone-300 transition-all cursor-pointer group">
             <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-900 truncate">{p.title}</p>
              <p className={cn("text-xs tracking-wide mt-0.5", urgent ? "text-red-500 font-semibold" : "text-stone-400")}>
               Due: {p.deadline} {urgent && `· ${daysLeft}d left`}
              </p>
             </div>
             <div className="text-right shrink-0 ml-2">
              <p className="text-sm font-bold text-stone-900">{p.grant}</p>
              <p className="text-xs text-stone-400">{p.type}</p>
             </div>
            </div>
           );
          })}
         </div>
         <Button variant="outline" size="sm" className="w-full mt-3 text-sm h-7 rounded-lg" onClick={() => setActiveTab("programs")}>
          Explore All Programs <ArrowRight className="w-3 h-3 ml-1.5" />
         </Button>
        </Card>

        {/* SAFE Calculator */}
        <Card className="p-4 space-y-3">
         <div className="flex items-center justify-between">
          <div>
           <p className="text-xs font-semibold text-stone-400 tracking-wide">SAFE Calculator</p>
           <p className="text-sm font-semibold text-stone-900">Valuation & Ownership</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center">
           <Calculator className="w-4 h-4 text-stone-600" />
          </div>
         </div>

         <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
           <span className="text-xs text-stone-500">Valuation Cap</span>
           <span className="text-sm font-semibold text-stone-900">$8M</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
           <span className="text-xs text-stone-500">Discount Rate</span>
           <span className="text-sm font-semibold text-stone-900">20%</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
           <span className="text-xs text-stone-500">Investment</span>
           <span className="text-sm font-semibold text-stone-900">$500k</span>
          </div>
         </div>

         <div className="pt-2 border-t border-stone-100">
          <div className="flex items-center justify-between mb-1">
           <span className="text-xs text-stone-500">Effective Ownership</span>
           <span className="text-base font-bold text-stone-900">5.88%</span>
          </div>
          <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
           <div className="h-full bg-stone-900 w-[5.88%]" />
          </div>
         </div>

         <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="flex-1 h-7 text-sm rounded-lg" onClick={() => showToast('Downloading SAFE note...')}>
           <Download className="w-3 h-3 mr-1" /> SAFE
          </Button>
          <Button size="sm" className="flex-1 h-7 text-sm rounded-lg bg-stone-900 text-white" onClick={() => { navigator.clipboard.writeText('https://cofounderbay.app/dataroom/safe-note'); showToast('Share link copied!'); }}>
           <Share2 className="w-3 h-3 mr-1" /> Share
          </Button>
         </div>
        </Card>

       </div>
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
         placeholder={bothText("Search by name or focus...", "Όνομα ή τομέας...")}
         value={investorSearch}
         onChange={(e) => setInvestorSearch(e.target.value)}
         className="w-full bg-white border border-stone-200 rounded-xl py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
        />
       </div>
       <Button variant="outline" size="sm" className="h-8 text-sm rounded-xl gap-1.5" onClick={() => { const types = ['All', ...Array.from(new Set(mockInvestors.map((item) => item.type)))]; const index = types.indexOf(investorType); setInvestorType(types[(index + 1) % types.length] ?? 'All'); }}>
        <SlidersHorizontal className="w-3.5 h-3.5" /> {investorType === 'All' ? 'Filters' : investorType}
       </Button>
      </div>

      {/* Investor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
             <span className="px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded text-xs font-semibold tracking-wide">{inv.type}</span>
             <span className="text-xs text-stone-400 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{inv.location}</span>
            </div>
           </div>
          </div>
          <Button variant="ghost" size="icon" aria-label="Watch" title="Watch" className={cn("h-7 w-7 shrink-0 relative z-10 hover:text-amber-500", favoriteInvestors.has(inv.id) ? "text-amber-500" : "text-stone-400")} onClick={() => setFavoriteInvestors(new Set(toggleId(listKeys.watch, inv.id)))}>
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
             <Tag className="w-2.5 h-2.5 inline mr-0.5" />{tag}
            </span>
           ))}
          </div>
         )}

         {/* Focus tags */}
         <div className="flex flex-wrap gap-1">
          {inv.focus.slice(0, 3).map((f: string) => (
           <span key={f} className="px-2 py-0.5 bg-stone-50 border border-stone-100 text-stone-600 rounded-md text-xs font-medium">{f}</span>
          ))}
         </div>

         {/* Stats + CRM */}
         <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-100">
          <div>
           <p className="text-xs text-stone-400">Check</p>
           <p className="text-xs font-semibold text-stone-700">{inv.checkSize}</p>
          </div>
          <div>
           <p className="text-xs text-stone-400">Portfolio</p>
           <p className="text-xs font-semibold text-stone-700">{inv.portfolio}</p>
          </div>
          <div>
           <p className="text-xs text-stone-400">{crm ? "Relationship" : "Stage"}</p>
           <p className={cn(
            "text-xs font-semibold",
            crm ? (crm.relationshipScore >= 80 ? "text-emerald-600" : crm.relationshipScore >= 60 ? "text-amber-600" : "text-stone-600") : "text-stone-700"
           )}>
            {crm ? `${crm.relationshipScore}%` : inv.stage[0]}
           </p>
          </div>
         </div>

         {/* Last Contact / Next Action */}
         {crm && (
          <div className="pt-1.5 border-t border-stone-100 space-y-1">
           <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 flex items-center gap-1">
             <History className="w-2.5 h-2.5" /> Last contact: {crm.lastContact.slice(5)}
            </span>
           </div>
           <p className="text-xs text-stone-500 truncate">
              Next: <span className="font-medium text-stone-700">{crm.nextAction}</span>
           </p>
          </div>
         )}

         {/* Actions */}
         <div className="flex gap-1.5 pt-1">
          <Button variant="outline" size="sm" className="flex-1 h-7 text-sm rounded-lg" onClick={() => navigate('/messages')}>
           <Mail className="w-3 h-3 mr-1" /> Contact
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg border border-stone-100 hover:bg-stone-50" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Tell me about ${inv.name}` } }))}>
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
        <p className="text-xs font-semibold text-stone-400 tracking-wide">Programs</p>
        <h3 className="text-base font-semibold text-stone-900">Accelerators, Grants & Studios</h3>
       </div>
       <Button variant="outline" size="sm" className="h-7 text-sm rounded-lg gap-1.5" onClick={() => { const types = ['All', ...Array.from(new Set(mockPrograms.map((item) => item.type)))]; const index = types.indexOf(programType); setProgramType(types[(index + 1) % types.length] ?? 'All'); }}>
        <SlidersHorizontal className="w-3.5 h-3.5" /> {programType === 'All' ? 'Filter' : programType}
       </Button>
      </div>

      {/* Programs List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
       {mockPrograms.filter((p) => programType === 'All' || p.type === programType).map((p) => {
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
             <div className="flex items-center gap-1 shrink-0">
              <div className={cn("w-1.5 h-1.5 rounded-full", p.match >= 90 ? "bg-emerald-500" : p.match >= 75 ? "bg-amber-500" : "bg-stone-300")} />
              <span className="text-xs font-bold text-stone-600">{p.match}% match</span>
             </div>
            </div>

            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
             <span className="text-xs text-stone-400 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{p.location}</span>
             <span className={cn("text-xs font-semibold", urgent ? "text-red-500" : "text-stone-400")}>
              <Calendar className="w-2.5 h-2.5 inline mr-0.5" />
              {p.deadline} {urgent && `· ${daysLeft}d left`}
             </span>
            </div>

            <div className="flex flex-wrap gap-1 mt-2">
             {p.tags.map((tag: string) => (
              <span key={tag} className="text-xs bg-stone-50 border border-stone-100 text-stone-500 px-1.5 py-0.5 rounded-md font-medium">{tag}</span>
             ))}
            </div>
           </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
           <div className="flex items-center gap-3">
            <div>
             <p className="text-xs text-stone-400">Award</p>
             <p className="text-sm font-bold text-stone-900">{p.grant}</p>
            </div>
            <div>
             <p className="text-xs text-stone-400">Type</p>
             <p className="text-xs font-semibold text-stone-700">{p.type}</p>
            </div>
           </div>
           <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-sm rounded-lg px-3" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Tell me about ${p.title}` } }))}>Details</Button>
            <Button size="sm" className="h-7 text-sm rounded-lg px-3 bg-stone-900 text-white hover:bg-stone-800" onClick={() => { trackApplication(p.title, p.type); window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Apply to ${p.title}` } })); }}>Apply</Button>
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
        <p className="text-xs font-semibold text-stone-400 tracking-wide">Opportunities</p>
        <h3 className="text-base font-semibold text-stone-900">Funding & Non-Dilutive Sources</h3>
       </div>
       <Button variant="outline" size="sm" className="h-7 text-sm rounded-lg gap-1.5" onClick={() => { const types = ['All', ...Array.from(new Set(mockOpportunities.map((item) => item.type)))]; const index = types.indexOf(opportunityType); setOpportunityType(types[(index + 1) % types.length] ?? 'All'); }}>
        <SlidersHorizontal className="w-3.5 h-3.5" /> {opportunityType === 'All' ? 'Filter' : opportunityType}
       </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
       {[
        { label: "Open Opps",   value: "5",      icon: Target,   color: "text-stone-900" },
        { label: "Total Capital", value: "$11M+", icon: BadgeDollarSign, color: "text-emerald-700" },
        { label: "Avg Close",   value: "28d",    icon: Clock,    color: "text-stone-900" },
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

      {/* Opportunities list */}
      <div className="space-y-2">
       {mockOpportunities.filter((opp) => opportunityType === 'All' || opp.type === opportunityType).map((opp) => (
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
             <p className="text-sm font-bold text-stone-900">{opp.amount}</p>
             <p className="text-xs text-stone-400">{opp.type}</p>
            </div>
           </div>

           <div className="flex items-center gap-3 mt-2">
            <div className="flex flex-wrap gap-1">
             {opp.tags.map((tag: string) => (
              <span key={tag} className="text-xs bg-stone-50 border border-stone-100 text-stone-500 px-1.5 py-0.5 rounded-md font-medium">{tag}</span>
             ))}
            </div>
            <span className={cn("text-xs font-semibold ml-auto shrink-0",
             opp.deadline === "Rolling" ? "text-emerald-600" : "text-stone-400"
            )}>
             <Calendar className="w-2.5 h-2.5 inline mr-0.5" />{opp.deadline}
            </span>
           </div>
          </div>
         </div>

         <div className="flex gap-1.5 mt-3 pt-3 border-t border-stone-100 justify-end">
          <Button variant="outline" size="sm" className="h-7 text-sm rounded-lg px-3" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Tell me about ${opp.title}` } }))}>Learn More</Button>
          <Button size="sm" className="h-7 text-sm rounded-lg px-3 bg-stone-900 text-white hover:bg-stone-800" onClick={() => { trackApplication(opp.title, opp.type); window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Apply to ${opp.title}` } })); }}>Apply Now</Button>
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
         <h3 className="text-base font-semibold text-stone-900">Schedule Meeting</h3>
         <p className="text-xs text-stone-400">Book time with investors</p>
        </div>
        <button 
         onClick={() => setShowMeetingScheduler(false)}
         className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors"
        >
         <X className="w-4 h-4 text-stone-500" />
        </button>
       </div>

       <div className="space-y-3">
        <div className="space-y-1.5">
         <label className="text-xs font-semibold text-stone-500 tracking-wider">Investor</label>
         <select value={meetingInvestor} onChange={(e) => setMeetingInvestor(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-200">
          {mockInvestors.map(inv => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
         </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
         <div className="space-y-1.5">
          <label className="text-xs font-semibold text-stone-500 tracking-wider">Date</label>
          <input type="date" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm" />
         </div>
         <div className="space-y-1.5">
          <label className="text-xs font-semibold text-stone-500 tracking-wider">Time</label>
          <input type="time" value={meetingWhen} onChange={(e) => setMeetingWhen(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm" />
         </div>
        </div>
        <div className="space-y-1.5">
         <label className="text-xs font-semibold text-stone-500 tracking-wider">Meeting Type</label>
         <div className="flex gap-2">
          {["Video Call", "Phone", "Coffee", "Office"].map(type => (
           <button key={type} onClick={() => setSelectedMeetingType(type)} className={cn("px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors", selectedMeetingType === type ? "bg-stone-900 text-white border-stone-900" : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100")}>
            {type}
           </button>
          ))}
         </div>
        </div>
        <div className="space-y-1.5">
         <label className="text-xs font-semibold text-stone-500 tracking-wider">Notes</label>
         <textarea placeholder="Meeting agenda..." className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm h-20 resize-none" />
        </div>
       </div>

       <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1 h-8 text-sm" onClick={() => setShowMeetingScheduler(false)}>Cancel</Button>
        <Button className="flex-1 h-8 text-sm bg-stone-900 text-white" onClick={() => { const investor = mockInvestors.find((item) => item.id === meetingInvestor); addSession({ id: String(Date.now()), title: `${selectedMeetingType} · ${investor?.name || 'Investor'}`, type: 'Meeting', time: meetingWhen || 'TBD', duration: '30m', location: selectedMeetingType, participants: [investor?.name || 'Investor'], priority: 'Medium' }); setShowMeetingScheduler(false); showToast('Meeting scheduled!'); }}>Schedule Meeting</Button>
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
         <h3 className="text-base font-semibold text-stone-900">Data Room</h3>
         <p className="text-xs text-stone-400">Manage investor documents</p>
        </div>
        <button 
         type="button"
         aria-label="Close data room"
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
          <p className="text-sm font-medium text-stone-900">{folder.name}</p>
          <p className="text-xs text-stone-400">{folder.count} files</p>
         </button>
        ))}
       </div>

       <div className="border border-stone-100 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
         <span className="text-xs font-semibold text-stone-500 tracking-wider">
          {selectedFolder ? documentFolders.find(f => f.id === selectedFolder)?.name : "All Documents"}
         </span>
         <Button size="sm" className="h-6 text-xs px-2 bg-stone-900 text-white" onClick={() => roomFileRef.current?.click()}>
          <Plus className="w-3 h-3 mr-1" /> Upload
         </Button>
         <input ref={roomFileRef} type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const size = file.size > 1_000_000 ? `${(file.size / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1000))} KB`; const next = addRoomFile({ name: file.name, size, views: 0, updated: new Date().toISOString().slice(0, 10) }); const names = new Set(next.map((item) => item.name)); setRoomFiles([...next, ...seedRoomFiles.filter((item) => !names.has(item.name))]); e.target.value = ''; }} />
        </div>
        <div className="space-y-1">
         {roomFiles.map(file => (
          <div key={file.name} className="flex items-center justify-between p-2 hover:bg-stone-50 rounded-lg transition-colors">
           <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center">
             <FileText className="w-3.5 h-3.5 text-stone-500" />
            </div>
            <div>
             <p className="text-sm font-medium text-stone-900">{file.name}</p>
             <p className="text-xs text-stone-400">{file.size} · Updated {file.updated.slice(5)}</p>
            </div>
           </div>
           <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400 flex items-center gap-1">
             <Eye className="w-3 h-3" /> {file.views}
            </span>
            <button className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Tell me about workspace assets and ${file.name}` } }))}>
             <Download className="w-3.5 h-3.5 text-stone-400" />
            </button>
           </div>
          </div>
         ))}
        </div>
       </div>

       <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2 text-xs text-stone-400">
         <Shield className="w-3.5 h-3.5" />
         <span>End-to-end encrypted. Access logged.</span>
        </div>
        <Button variant="outline" className="h-8 text-sm" onClick={() => setShowDocumentRoom(false)}>Close</Button>
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
