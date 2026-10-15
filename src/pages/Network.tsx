import { useState, useMemo } from "react";
import { 
 Users, 
 UserPlus, 
 Search, 
 Filter, 
 SlidersHorizontal, 
 ArrowRight, 
 CheckCircle2, 
 Clock, 
 TrendingUp, 
 Target, 
 BarChart3, 
 Plus, 
 ChevronRight, 
 MoreVertical, 
 Layers, 
 Lightbulb, 
 FileText, 
 Globe, 
 PieChart, 
 Zap, 
 Star, 
 AlertCircle, 
 Briefcase, 
 Heart, 
 MessageSquare, 
 ShieldCheck, 
 Award,
 Cpu,
 Fingerprint,
 Terminal,
 Activity,
 ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { readRequests, readSaved, removeSaved, type ConnectionRequest, type SavedProfile } from "../lib/localLists";
import { rememberPerson } from "../lib/people";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PageShell from "../components/ui/PageShell";
import { avatarFor } from "../data/cast";
import { User, Endorsement, UserRole } from "../types";
import { cn } from "../lib/utils";

interface NetworkProps {
 user: User;
}

export default function Network({ user }: NetworkProps) {
 const navigate = useNavigate();
 const [activeTab, setActiveTab] = useState<'connections' | 'saved' | 'endorsements' | 'compare'>('connections');
 const [saved, setSaved] = useState<SavedProfile[]>(() => readSaved());
 const [requests] = useState<ConnectionRequest[]>(() => readRequests());
 const [networkQuery, setNetworkQuery] = useState('');
 const [statusFilter, setStatusFilter] = useState<'All' | 'Connected' | 'Pending'>('All');
 const [picked, setPicked] = useState<string[]>([]);
 const [compared, setCompared] = useState(false);

 const mockConnections = [
  { id: "sarah-chen", fullName: "Sarah Chen", role: UserRole.FOUNDER, industry: "FinTech", status: "Connected", location: "New York" },
  { id: "alex-rivera", fullName: "Alex Rivera", role: UserRole.FOUNDER, industry: "AI", status: "Connected", location: "San Francisco" },
  { id: "james-wilson", fullName: "James Wilson", role: UserRole.ADVISOR, industry: "SaaS", status: "Pending", location: "London" },
  { id: "elena-rodriguez", fullName: "Elena Rodriguez", role: UserRole.CO_FOUNDER_CANDIDATE, industry: "CleanTech", status: "Connected", location: "Barcelona" }
 ];
 const visibleConnections = [...mockConnections, ...requests.filter((item) => !mockConnections.some((conn) => conn.id === item.id))].filter((conn) => {
  const q = networkQuery.trim().toLowerCase();
  const matchesQuery = !q || conn.fullName.toLowerCase().includes(q) || String(conn.role).toLowerCase().includes(q) || String(conn.industry ?? '').toLowerCase().includes(q);
  const status = 'status' in conn ? String(conn.status) : 'Pending';
  const matchesStatus = statusFilter === 'All' || status === statusFilter;
  return matchesQuery && matchesStatus;
 });

 const mockEndorsements: Endorsement[] = [
  { id: "e1", endorserId: "sarah-chen", recipientId: user.id, skillId: "Product Strategy", comment: "One of the most focused founders I've worked with.", createdAt: "2026-03-15" },
  { id: "e2", endorserId: "alex-rivera", recipientId: user.id, skillId: "Full-Stack Dev", comment: "Incredible technical depth and speed.", createdAt: "2026-03-20" }
 ];

 const systemMetadata = useMemo(() => ({
  nodeCount: "4.2k",
  syncStatus: "OPTIMAL",
  latency: "14ms",
  version: "v4.2.0"
 }), []);

 return (
  <PageShell title="Network" description="Manage connections, endorsements, and saved profiles.">
   <div className="space-y-6">
    <div className="scroll-tabs bg-stone-50 p-1 rounded-xl border border-stone-100">
     {(['connections', 'saved', 'endorsements', 'compare'] as const).map((tab) => (
      <button
       key={tab}
       onClick={() => setActiveTab(tab)}
       className={cn(
        "px-4 py-2 text-sm font-medium rounded-lg transition-all capitalize",
        activeTab === tab
         ? "bg-stone-900 text-white shadow-sm"
         : "text-stone-400 hover:text-stone-900 hover:bg-white"
       )}
      >
       {tab}
      </button>
     ))}
    </div>

   {activeTab === 'connections' && (
    <div className="space-y-4">
     <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-xs">
       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
       <input
        type="text"
        placeholder="Search network..."
        value={networkQuery}
        onChange={(e) => setNetworkQuery(e.target.value)}
        className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300 transition-all"
       />
      </div>
      <Button
       type="button"
       variant="outline"
       className="h-8 px-3 text-sm rounded-lg border-stone-200"
       onClick={() => setStatusFilter((prev) => prev === 'All' ? 'Connected' : prev === 'Connected' ? 'Pending' : 'All')}
      >
       <SlidersHorizontal className="w-3 h-3 mr-1.5" /> {statusFilter === 'All' ? 'Filter' : statusFilter}
      </Button>
      <span className="text-sm text-stone-400 ml-auto">{visibleConnections.length} connections</span>
     </div>

     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {visibleConnections.map((conn, i) => (
       <motion.div
        key={conn.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.06, duration: 0.4 }}
       >
        <Card className="group hover:border-stone-300 hover:shadow-md transition-all p-5 border-stone-100">
         <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
           <div className="w-16 h-16 rounded-2xl bg-stone-100 overflow-hidden border border-stone-200">
            <img src={avatarFor(conn.id, 200)} alt={conn.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
           </div>
           <div className={cn(
            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
            conn.status === "Connected" ? "bg-emerald-500" : "bg-amber-400"
           )} />
          </div>
          <div className="space-y-1">
           <h4 className="text-base font-semibold text-stone-900">{conn.fullName}</h4>
           <div className="flex flex-wrap items-center justify-center gap-1">
            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-sm text-stone-500">{conn.role}</span>
            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-sm text-stone-500">{conn.industry}</span>
           </div>
           <p className="text-sm text-stone-400 flex items-center justify-center gap-1"><Globe className="w-3 h-3" />{conn.location}</p>
          </div>
          <div className="flex items-center gap-2 w-full pt-1">
           <Button onClick={() => navigate(`/messages?user=${conn.id}`)} className="flex-1 h-8 rounded-lg bg-stone-900 text-white hover:bg-stone-700 text-sm font-medium transition-all">
            Message
           </Button>
           <Button onClick={() => { rememberPerson({ id: conn.id, fullName: conn.fullName, headline: String(conn.role), role: String(conn.role), industry: conn.industry, location: conn.location }); navigate(`/profile/${conn.id}`); }} variant="outline" size="icon" className="h-11 w-11 sm:h-8 sm:w-8 rounded-lg border-stone-200 text-stone-400 hover:text-stone-900">
            <ChevronRight className="w-3.5 h-3.5" />
           </Button>
          </div>
         </div>
        </Card>
       </motion.div>
      ))}
     </div>
    </div>
   )}

   {activeTab === 'saved' && (
    <div className="space-y-4">
     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {saved.map((p, i) => (
       <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
        <Card className="p-5 border-stone-100 hover:border-stone-300 transition-all group">
         <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-stone-100 overflow-hidden border border-stone-200 shrink-0">
           <img src={avatarFor(p.id, 200)} alt={p.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="flex-1 min-w-0">
           <h4 className="text-base font-semibold text-stone-900">{p.fullName}</h4>
           <p className="text-sm text-stone-400">{p.role} · {p.industry} · {p.location}</p>
           <p className="text-sm text-stone-500 mt-1 italic">{p.note}</p>
          </div>
          <Button variant="ghost" size="icon" title="Remove from saved" onClick={() => setSaved(removeSaved(p.id))} className="w-7 h-7 rounded-lg text-stone-300 hover:text-stone-900 shrink-0">
           <Star className="w-3.5 h-3.5 fill-current" />
          </Button>
         </div>
         <div className="flex gap-2 mt-4">
          <Button onClick={() => navigate(`/messages?user=${p.id}`)} className="flex-1 h-7 text-sm rounded-lg bg-stone-900 text-white hover:bg-stone-700">Connect</Button>
          <Button onClick={() => { rememberPerson({ id: p.id, fullName: p.fullName, headline: p.role, role: p.role, industry: p.industry, location: p.location, bio: p.note }); navigate(`/profile/${p.id}`); }} variant="outline" className="flex-1 h-11 sm:h-7 text-sm rounded-lg border-stone-200">View Profile</Button>
         </div>
        </Card>
       </motion.div>
      ))}
     </div>
     <button type="button" onClick={() => navigate('/matches')} className="w-full p-4 rounded-xl border-2 border-dashed border-stone-200 hover:border-stone-400 transition-all text-stone-400 hover:text-stone-700 flex items-center justify-center gap-2 text-sm font-medium">
      <UserPlus className="w-3.5 h-3.5" /> Browse to save more profiles
     </button>
    </div>
   )}

   {activeTab === 'endorsements' && (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
     <div className="lg:col-span-7 space-y-4">
      {mockEndorsements.map((e, i) => (
       <motion.div
        key={e.id}
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.1 }}
       >
        <Card className="p-4 border-stone-100 hover:border-stone-200 transition-all group">
         <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-100 overflow-hidden border border-stone-200 shrink-0">
           <img src={avatarFor(e.endorserId, 200)} alt={e.endorserId === 'sarah-chen' ? 'Sarah Chen' : 'Alex Rivera'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="flex-1">
           <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-stone-900">Endorsed for</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-semibold">{e.skillId}</span>
           </div>
           <p className="text-xs text-stone-400 mb-1.5">by {e.endorserId === 'sarah-chen' ? 'Sarah Chen' : 'Alex Rivera'} · {new Date(e.createdAt).toLocaleDateString()}</p>
           <p className="text-sm text-stone-500 italic leading-relaxed">"{e.comment}"</p>
          </div>
         </div>
        </Card>
       </motion.div>
      ))}
      <button type="button" onClick={() => navigate('/messages')} className="w-full p-4 rounded-xl border-2 border-dashed border-stone-200 hover:border-stone-400 transition-all text-stone-400 hover:text-stone-700 flex items-center justify-center gap-2 text-sm font-medium">
       <Plus className="w-3.5 h-3.5" /> Request New Endorsement
      </button>
     </div>

     <div className="lg:col-span-5 space-y-4">
      <Card className="p-4 border-stone-100">
       <h3 className="text-xs font-semibold text-stone-500 tracking-wider mb-3">Skill Distribution</h3>
       <div className="space-y-2.5">
        {[
         { skill: "Product Strategy", count: 12 },
         { skill: "Full-Stack Dev",    count: 8 },
         { skill: "UI/UX Design",      count: 5 },
         { skill: "Growth Marketing",  count: 3 },
        ].map((item, i) => (
         <div key={i} className="space-y-1">
          <div className="flex items-center justify-between">
           <span className="text-sm text-stone-600">{item.skill}</span>
           <span className="text-xs font-semibold text-stone-400">{item.count}</span>
          </div>
          <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
           <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(item.count / 12) * 100}%` }}
            transition={{ duration: 1, delay: i * 0.1 }}
            className="h-full rounded-full bg-stone-900"
           />
          </div>
         </div>
        ))}
       </div>
      </Card>

      <div className="studio-nudge bg-amber-50 border border-amber-100 rounded-2xl space-y-2.5">
       <div className="flex items-center gap-2">
        <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
        <span className="text-sm font-semibold text-stone-900">Expert Badge</span>
       </div>
       <p className="text-sm text-stone-600 leading-relaxed">
        You are in the <span className="font-semibold text-stone-900">top 5%</span> of founders endorsed for Product Strategy this month.
       </p>
       <Button onClick={() => { void navigator.clipboard?.writeText('Endorsed for Product Strategy on CoFounderBay'); }} className="w-full h-7 rounded-lg bg-stone-900 text-white text-sm hover:bg-stone-700">
        Share Achievement
       </Button>
      </div>
     </div>
    </div>
   )}

   {activeTab === 'compare' && (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
     <Card className="p-6 text-center space-y-5 border-stone-100">
      <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto text-stone-400">
       <BarChart3 className="w-8 h-8" />
      </div>
      <div className="max-w-md mx-auto space-y-2">
       <h3 className="text-base font-semibold text-stone-900">Compare Profiles</h3>
       <p className="text-sm text-stone-500 leading-relaxed">
        Select up to 3 connections to compare skills, experience, and co-founder compatibility side-by-side.
       </p>
      </div>
      <div className="flex items-center justify-center gap-4">
       {[0, 1, 2].map((i) => {
        const person = mockConnections.find((conn) => conn.id === picked[i]);
        return (
         <button
          key={i}
          type="button"
          onClick={() => {
           setCompared(false);
           if (person) {
            setPicked((prev) => prev.filter((id) => id !== person.id));
            return;
           }
           const next = mockConnections.find((conn) => !picked.includes(conn.id));
           if (next) setPicked((prev) => [...prev, next.id]);
          }}
          className="w-24 h-24 rounded-2xl border-2 border-dashed border-stone-200 flex items-center justify-center text-stone-300 hover:border-stone-400 hover:text-stone-500 transition-all cursor-pointer group"
         >
          {person ? <span className="text-xs font-medium text-stone-900 px-2">{person.fullName.split(' ')[0]}</span> : <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />}
         </button>
        );
       })}
      </div>
      <Button onClick={() => picked.length >= 2 && setCompared(true)} className="h-9 px-6 rounded-xl bg-stone-900 text-white text-sm hover:bg-stone-700">
       Start Comparison
      </Button>
      {compared && picked.length >= 2 && (
       <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
        {picked.map((id) => {
         const person = mockConnections.find((conn) => conn.id === id);
         if (!person) return null;
         return (
          <div key={id} className="rounded-xl border border-stone-100 p-3 space-y-1">
           <p className="text-sm font-semibold text-stone-900">{person.fullName}</p>
           <p className="text-sm text-stone-400">{person.role}</p>
           <p className="text-sm text-stone-400">{person.industry}</p>
           <p className="text-sm text-stone-400">{person.location}</p>
           <p className="text-xs text-stone-500">{person.status}</p>
          </div>
         );
        })}
       </div>
      )}
     </Card>
    </motion.div>
   )}
  </div>
  </PageShell>
 );
}
