import {
 useState,
 useEffect } from "react";
import { 
 ShieldCheck,
 Search,
 CheckCircle2,
 Star,
 Users,
 TrendingUp,
 Zap,
 Globe,
 MessageSquare,
 AlertCircle,
 Palette,
 Tag,
 BarChart3,
 ShieldAlert,
 Briefcase,
 Download,
 Mail,
 UserPlus,
 Ban,
 Edit3,
 ChevronRight
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Avatar from "../../components/ui/Avatar";
import { User } from "../../types";
import { cn } from "../../lib/utils";
import { useT } from "../../lib/language";
import { labelOf } from "../../lib/labels";
import { formatDate } from "../../lib/dates";
import { toMillis } from "../../lib/peopleSource";
import { useAuth } from "../../App";

interface AdminProps {
 user: User;
}

const UserManagementSkeleton = () => (
 <div className="w-full px-2 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-24 space-y-6 animate-pulse">
  <div className="h-64 w-full bg-stone-100 rounded-xl"></div>
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
   {[1, 2, 3, 4].map(i => (
    <div key={i} className="h-32 bg-stone-100 rounded-xl"></div>
   ))}
  </div>
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
   <div className="lg:col-span-2 h-[600px] bg-stone-100 rounded-xl"></div>
   <div className="h-[600px] bg-stone-100 rounded-xl"></div>
  </div>
 </div>
);

interface MemberRow {
 id: string;
 fullName: string;
 email: string;
 roles: string[];
 accountStatus: string;
 verificationStatus: string;
 createdAt: string;
 company: string;
 lastActiveAt: number | null;
 avatarUrl: string;
}

interface ReportRow {
 id: string;
 targetType: string;
 targetName: string;
 targetId: string;
 targetOwnerId: string;
 reporterName: string;
 reason: string;
 details: string;
 href: string;
 status: string;
 createdAt: number | null;
}

export default function UserManagement({ user: _user }: AdminProps) {
 const t = useT();
 const navigate = useNavigate();
 const [users, setUsers] = useState<MemberRow[]>([]);
 const [reports, setReports] = useState<ReportRow[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState("");
 const [selectedTab, setSelectedTab] = useState("All Users");
 const { isDemoMode } = useAuth();
 const [busy, setBusy] = useState<string | null>(null);

 // Members come straight from Firestore — this app has no /api backend.
 useEffect(() => {
  // Sample account: member documents deny signed-out reads — show the empty state.
  if (isDemoMode) { setUsers([]); setLoading(false); return; }
  let cancelled = false;
  void (async () => {
   try {
    const { db } = await import('../../firebase');
    if (!db) { setUsers([]); setLoading(false); return; }
    const { collection, getDocs, query, limit } = await import('firebase/firestore');
    const [userSnap, profileSnap] = await Promise.all([
     getDocs(query(collection(db, 'users'), limit(500))),
     getDocs(query(collection(db, 'profiles'), limit(500))).catch(() => null),
    ]);
    const profileById = new Map<string, Record<string, unknown>>((profileSnap?.docs ?? []).map((d) => [d.id, d.data()]));
    const rows: MemberRow[] = userSnap.docs.map((entry) => {
     const u = entry.data() as Record<string, unknown>;
     const p = profileById.get(entry.id) ?? {};
     return {
      id: entry.id,
      fullName: String(u.fullName ?? p.fullName ?? u.displayName ?? String(u.email ?? '').split('@')[0] ?? 'Member'),
      email: String(u.email ?? ''),
      roles: Array.isArray(u.roles) ? (u.roles as string[]) : u.role ? [String(u.role)] : ['Founder'],
      accountStatus: String(u.accountStatus ?? 'Active'),
      verificationStatus: String(u.verificationStatus ?? p.verificationStatus ?? ''),
      createdAt: toMillis(u.createdAt) ? new Date(toMillis(u.createdAt)!).toISOString() : '',
      company: String(p.company ?? ''),
      lastActiveAt: toMillis(p.lastActiveAt ?? u.lastActiveAt),
      avatarUrl: String(p.avatarUrl ?? p.profilePhoto ?? ''),
     };
    });
    if (!cancelled) { setUsers(rows); setLoading(false); }
   } catch (err) {
    console.error('Error fetching users', err);
    if (!cancelled) { setUsers([]); setLoading(false); }
   }
  })();
  return () => { cancelled = true; };
 }, [isDemoMode]);

 // Live moderation queue from the reports collection.
 useEffect(() => {
  if (isDemoMode) { setReports([]); return; }
  let unsub: (() => void) | undefined;
  let cancelled = false;
  void (async () => {
   try {
    const { db } = await import('../../firebase');
    if (!db) { setReports([]); return; }
    const { collection, onSnapshot, query, orderBy, limit } = await import('firebase/firestore');
    const stop = onSnapshot(
     query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(50)),
     (snap) => setReports(snap.docs.map((d) => {
      const r = d.data() as Record<string, unknown>;
      return {
       id: d.id,
       targetType: String(r.targetType ?? 'user'),
       targetName: String(r.targetName ?? r.targetId ?? ''),
       targetId: String(r.targetId ?? ''),
       targetOwnerId: String(r.targetOwnerId ?? ''),
       reporterName: String(r.reporterName ?? r.reporterId ?? ''),
       reason: String(r.reason ?? ''),
       details: String(r.details ?? ''),
       href: String(r.href ?? ''),
       status: String(r.status ?? 'open'),
       createdAt: toMillis(r.createdAt),
      } satisfies ReportRow;
     })),
     () => setReports([]),
    );
    if (cancelled) { stop(); return; }
    unsub = stop;
   } catch { if (!cancelled) setReports([]); }
  })();
  return () => { cancelled = true; unsub?.(); };
 }, [isDemoMode]);

 const setUserStatus = async (id: string, status: 'Active' | 'Suspended') => {
  if (isDemoMode) return;
  setBusy(id);
  try {
   const { db } = await import('../../firebase');
   const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
   await updateDoc(doc(db, 'users', id), { accountStatus: status, updatedAt: serverTimestamp() });
   setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, accountStatus: status } : u)));
  } catch { /* keep the previous state */ }
  finally { setBusy(null); }
 };

 const setReportStatus = async (id: string, status: 'dismissed' | 'reviewing') => {
  if (isDemoMode) return;
  setBusy(id);
  try {
   const { db } = await import('../../firebase');
   const { doc, updateDoc } = await import('firebase/firestore');
   await updateDoc(doc(db, 'reports', id), { status });
   setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  } catch { /* keep state */ }
  finally { setBusy(null); }
 };

 const exportCsv = () => {
  const header = 'id,name,email,roles,status,joined\n';
  const body = users.map((u) => [u.id, u.fullName, u.email, u.roles.join('|'), u.accountStatus, u.createdAt].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([header + body], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'members.csv';
  link.click();
  URL.revokeObjectURL(link.href);
 };

 if (loading) return <UserManagementSkeleton />;

 const openReports = reports.filter((r) => r.status === 'open');
 const typeLabel = (type: string) => type === 'Profile' || type === 'user' ? t('Profile', 'Προφίλ') : type === 'Community' || type === 'community' ? t('Community', 'Κοινότητα') : type === 'job' ? t('Job', 'Θέση') : t('Message', 'Μήνυμα');
 const tabLabel = (tab: string) => tab === 'All Users' ? t('All Users', 'Όλα τα μέλη') : tab === 'Admins' ? t('Admins', 'Διαχειριστές') : tab === 'Mentors' ? t('Mentors', 'Μέντορες') : t('Founders', 'Ιδρυτές');

 const TAB_ROLE: Record<string, string | null> = { 'All Users': null, Admins: 'Admin', Mentors: 'Mentor', Founders: 'Founder' };
 const activeNow = users.filter((u) => u.lastActiveAt != null && Date.now() - u.lastActiveAt < 15 * 60 * 1000).length;
 const filteredUsers = users.filter(u =>
  (u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
  u.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
  (!TAB_ROLE[selectedTab] || u.roles.some((r) => TAB_ROLE[selectedTab] && r.toLowerCase().includes(TAB_ROLE[selectedTab]!.toLowerCase())))
 );

 const stats = [
  { label: t('Total Members', 'Σύνολο μελών'), value: String(users.length), change: '', icon: Users, color: "text-blue-600", bg: "bg-blue-50/50" },
  { label: t('Active Now', 'Ενεργά τώρα'), value: String(activeNow), change: '', icon: Zap, color: "text-amber-600", bg: "bg-amber-50/50" },
  { label: t('Verified', 'Επαληθευμένα'), value: String(users.filter((u) => u.verificationStatus === 'Verified').length), change: '', icon: Globe, color: "text-emerald-600", bg: "bg-emerald-50/50" },
  { label: t('Pending Issues', 'Εκκρεμή ζητήματα'), value: String(openReports.length), change: openReports.length ? 'Critical' : 'Stable', icon: AlertCircle, color: "text-red-600", bg: "bg-red-50/50" },
 ];

 return (
  <motion.div 
   initial={{ opacity: 0, y: 10 }}
   animate={{ opacity: 1, y: 0 }}
   className="w-full px-2 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-24 space-y-6"
  >
   {/* Premium Header */}
   <div className="relative overflow-hidden rounded-xl bg-white p-8 border border-stone-100 lg:pr-36">

    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
     <div className="space-y-4">
      <motion.div 
       initial={{ opacity: 0, x: -10 }}
       animate={{ opacity: 1, x: 0 }}
       className="flex items-center gap-5"
      >
       <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 shadow-sm">
        <Users className="w-7 h-7 text-stone-900" />
       </div>
       <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-stone-900">{t('User Management', 'Μέλη')}</h1>
        <p className="text-stone-400 text-xs font-medium tracking-wider mt-1">{t("Orchestrate your ecosystem's member base", 'Οργάνωσε τη βάση μελών του οικοσυστήματος')}</p>
        {isDemoMode && <p className="text-xs text-stone-500 mt-1">{t('Sample account — member data appears for real accounts.', 'Δοκιμαστικός λογαριασμός — τα δεδομένα μελών εμφανίζονται σε πραγματικούς λογαριασμούς.')}</p>}
       </div>
      </motion.div>
     </div>

     <div className="flex flex-wrap items-center gap-4">
      <div className="hidden lg:flex items-center gap-3 mr-4">
       <Link to="/admin/branding" className="inline-flex items-center h-11 px-6 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-50 font-medium text-xs tracking-wider transition-all">
        <Palette className="w-4 h-4 mr-2.5" /> {t('Branding', 'Ταυτότητα')}
       </Link>
       <Link to="/admin/taxonomies" className="inline-flex items-center h-11 px-6 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-50 font-medium text-xs tracking-wider transition-all">
        <Tag className="w-4 h-4 mr-2.5" /> {t('Taxonomies', 'Ταξινομίες')}
       </Link>
      </div>
      <Button variant="outline" onClick={exportCsv} className="bg-white border-stone-200 text-stone-600 hover:border-stone-900 hover:text-stone-900 rounded-xl h-11 px-6 text-xs font-medium tracking-wide transition-all shadow-sm">
       <Download className="w-3.5 h-3.5 mr-2.5" /> {t('Export', 'Εξαγωγή')}
      </Button>
      <Button onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}/signup`)} className="bg-stone-900 hover:bg-stone-800 text-white border-none rounded-xl h-11 px-8 text-xs font-medium tracking-wide shadow-xl shadow-stone-200 transition-all">
       <UserPlus className="w-3.5 h-3.5 mr-2.5" /> {t('Copy Invite Link', 'Αντιγραφή συνδέσμου πρόσκλησης')}
      </Button>
     </div>
    </div>
   </div>

   {/* Stats Grid — real counts from the member directory and open reports */}
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {stats.map((stat, i) => (
     <motion.div
      key={i}
      whileHover={{ y: -4, scale: 1.02 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, type: "spring", stiffness: 400, damping: 25 }}
     >
      <Card noPadding className="border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] transition-all overflow-hidden group rounded-xl">
       <div className="p-8 flex items-center justify-between">
        <div className="space-y-3">
         <p className="text-xs font-medium text-stone-400 tracking-wider">{stat.label}</p>
         <h4 className="text-lg font-semibold tracking-tight text-stone-900">{stat.value}</h4>
        </div>
        <div className={cn("w-14 h-11 rounded-2xl flex items-center justify-center transition-all shadow-inner border border-stone-100/50", stat.bg, stat.color)}>
         <stat.icon className="w-7 h-7" />
        </div>
       </div>
       <div className={cn(
        "stat-change-strip px-5 py-2.5 bg-stone-50/30 border-t border-stone-50 flex items-center gap-3 text-xs font-medium tracking-wider",
        stat.color
       )}>
        <TrendingUp className="w-3.5 h-3.5" /> {stat.change ? (stat.change === 'Stable' || stat.change === 'Critical' ? labelOf(stat.change) : stat.change) : t('Live', 'Ζωντανά')}
       </div>
      </Card>
     </motion.div>
    ))}
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    {/* User Management Table */}
    <div className="lg:col-span-2 space-y-6">
     <Card 
      noPadding 
      className="border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] overflow-hidden rounded-xl"
     >
      <div className="p-8 border-b border-stone-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
       <div className="flex items-center gap-8">
        {["All Users", "Admins", "Mentors", "Founders"].map((tab) => (
         <button
          key={tab}
          onClick={() => setSelectedTab(tab)}
          className={cn(
           "text-xs font-medium tracking-wider pb-3 border-b-2 transition-all relative",
           selectedTab === tab 
            ? "border-stone-900 text-stone-900" 
            : "border-transparent text-stone-400 hover:text-stone-600"
          )}
         >
          {tabLabel(tab)}
         </button>
        ))}
       </div>
       <div className="relative w-full md:w-80">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input 
         type="text"
         placeholder={t('Search members...', 'Αναζήτηση μελών...')}
         value={searchQuery}
         onChange={(e) => setSearchQuery(e.target.value)}
         className="input-minimal pl-12 text-xs font-medium tracking-wide"
        />
       </div>
      </div>

      <div className="overflow-x-auto">
       <table className="w-full text-left border-collapse">
        <thead>
         <tr className="bg-stone-50/20 border-b border-stone-50">
          <th className="px-8 py-5 text-xs font-medium text-stone-400 tracking-wider">{t('Member', 'Μέλος')}</th>
          <th className="px-8 py-5 text-xs font-medium text-stone-400 tracking-wider">{t('Role & Hub', 'Ρόλος και κόμβος')}</th>
          <th className="px-8 py-5 text-xs font-medium text-stone-400 tracking-wider">{t('Status', 'Κατάσταση')}</th>
          <th className="px-8 py-5 text-xs font-medium text-stone-400 tracking-wider">{t('Activity', 'Δραστηριότητα')}</th>
          <th className="px-8 py-5 text-xs font-medium text-stone-400 tracking-wider text-right">{t('Actions', 'Ενέργειες')}</th>
         </tr>
        </thead>
        <tbody className="divide-y divide-stone-50">
         <AnimatePresence mode="popLayout">
          {filteredUsers.map((u, i) => (
           <motion.tr 
            key={u.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: i * 0.02 }}
            className="hover:bg-stone-50/40 transition-all group cursor-pointer"
           >
            <td className="px-8 py-7">
             <div className="flex items-center gap-6">
              <div className="relative">
               <div className="w-14 h-11 rounded-2xl bg-stone-100 overflow-hidden border border-stone-100 shadow-sm transition-all group-hover:shadow-md group-hover:scale-105">
                <Avatar src={u.avatarUrl || undefined} name={u.fullName} size="lg" className="[&>*]:rounded-2xl [&>*]:border-0 [&>*]:w-full [&>*]:h-full" />
               </div>
               <div className={cn("absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full shadow-sm", u.lastActiveAt != null && Date.now() - u.lastActiveAt < 15 * 60 * 1000 ? "bg-emerald-500" : "bg-stone-300")} title={u.lastActiveAt != null && Date.now() - u.lastActiveAt < 15 * 60 * 1000 ? t('Online now', 'Σε σύνδεση τώρα') : ''}></div>
              </div>
              <div className="space-y-1">
               <p className="text-base font-medium text-stone-900 group-hover:text-stone-600 transition-colors tracking-tight">{u.fullName}</p>
               <p className="text-xs text-stone-400 font-medium tracking-wide">{u.email}</p>
              </div>
             </div>
            </td>
            <td className="px-8 py-7">
             <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
               {u.roles.map((role: string) => (
                <span key={role} className="text-xs font-medium px-2.5 py-1 bg-stone-50 text-stone-500 rounded-md tracking-wide border border-stone-100">
                 {labelOf(role)}
                </span>
               ))}
              </div>
              {u.company ? <span className="text-xs text-stone-300 font-medium tracking-wider">{u.company}</span> : null}
             </div>
            </td>
            <td className="px-8 py-7">
             <span className={cn(
              "text-xs font-medium px-3.5 py-1.5 rounded-xl tracking-wide inline-flex items-center gap-2.5 border",
              u.accountStatus === "Active" 
               ? "text-emerald-600 border-transparent" 
               : "text-red-600 border-transparent"
             )}>
              <div className={cn("w-1.5 h-1.5 rounded-full shadow-sm", u.accountStatus === "Active" ? "bg-emerald-500" : "bg-red-500")}></div>
              {labelOf(u.accountStatus)}
             </span>
            </td>
            <td className="px-8 py-7">
             <div className="space-y-1.5">
              <p className="text-xs font-medium text-stone-700 tracking-tight">{u.lastActiveAt ? t(`Last active ${new Date(u.lastActiveAt).toLocaleDateString()}`, `Τελευταία δραστηριότητα ${new Date(u.lastActiveAt).toLocaleDateString('el-GR')}`) : t('No recent activity', 'Χωρίς πρόσφατη δραστηριότητα')}</p>
              <p className="text-xs text-stone-300 font-medium tracking-wider">{t('Joined', 'Εγγραφή')} {formatDate(u.createdAt)}</p>
             </div>
            </td>
            <td className="px-8 py-7 text-right">
             <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
              <Button variant="ghost" size="icon" onClick={() => { window.location.href = `mailto:${u.email}`; }} title={t('Email member', 'Email στο μέλος')} className="h-10 w-10 rounded-2xl hover:bg-white hover:shadow-md border border-transparent hover:border-stone-100 transition-all">
               <Mail className="w-4.5 h-4.5 text-stone-400" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate(`/profile/${u.id}`)} title={t('View profile', 'Προβολή προφίλ')} className="h-10 w-10 rounded-2xl hover:bg-white hover:shadow-md border border-transparent hover:border-stone-100 transition-all">
               <Edit3 className="w-4.5 h-4.5 text-stone-400" />
              </Button>
              <Button variant="ghost" size="icon" disabled={busy === u.id} onClick={() => void setUserStatus(u.id, u.accountStatus === 'Suspended' ? 'Active' : 'Suspended')} title={u.accountStatus === 'Suspended' ? t('Reactivate member', 'Επανενεργοποίηση μέλους') : t('Suspend member', 'Αναστολή μέλους')} className="h-10 w-10 rounded-2xl hover:bg-red-50 border border-transparent hover:border-red-100 group/btn transition-all">
               <Ban className={cn("w-4.5 h-4.5", u.accountStatus === 'Suspended' ? "text-amber-500" : "text-stone-300 group-hover/btn:text-red-500")} />
              </Button>
             </div>
            </td>
           </motion.tr>
          ))}
         </AnimatePresence>
        </tbody>
       </table>
      </div>
      <div className="p-8 bg-stone-50/20 border-t border-stone-50 flex flex-col md:flex-row items-center justify-between gap-8">
       <p className="text-xs text-stone-400 font-medium tracking-wider">
        {t('Showing', 'Εμφάνιση')} <span className="text-stone-900">{filteredUsers.length}</span> {t('of', 'από')} <span className="text-stone-900">{users.length}</span> {t('members', 'μέλη')}
       </p>
      </div>
     </Card>

     {/* Moderation Queue */}
     <div className="space-y-8">
      <div className="flex items-center justify-between">
       <div className="flex items-center gap-6">
        <div className="p-4 bg-red-50 rounded-2xl border border-red-100/50 shadow-sm">
         <ShieldAlert className="w-7 h-7 text-red-500" />
        </div>
        <div className="space-y-1">
         <h2 className="text-sm font-semibold text-stone-900 tracking-wider">{t('Moderation Queue', 'Ουρά εποπτείας')}</h2>
         <p className="text-stone-400 font-medium text-xs tracking-wider mt-1">{t('Items requiring administrative review', 'Στοιχεία που χρειάζονται έλεγχο από τη διαχείριση')}</p>
        </div>
       </div>
       <span className="text-xs font-medium tracking-wider text-stone-400">
        {openReports.length === 0 ? t('No open reports', 'Καμία ανοιχτή αναφορά') : t(`${openReports.length} open`, `${openReports.length} ανοιχτές`)}
       </span>
      </div>

      <div className="grid grid-cols-1 gap-6">
       {openReports.length === 0 && (
     <Card className="border-stone-100 p-4 sm:p-6 rounded-xl">
         <p className="text-sm text-stone-400 font-medium">{t('The moderation queue is empty. Reports filed by members appear here.', 'Η ουρά εποπτείας είναι κενή. Αναφορές από μέλη εμφανίζονται εδώ.')}</p>
        </Card>
       )}
       {openReports.map((item, i) => (
        <motion.div
         key={item.id}
         whileHover={{ y: -4, scale: 1.01 }}
         initial={{ opacity: 0, x: -20 }}
         animate={{ opacity: 1, x: 0 }}
         transition={{ delay: i * 0.1, type: "spring", stiffness: 400, damping: 25 }}
        >
         <Card noPadding className="border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_40px_rgb(0,0,0,0.08)] transition-all group rounded-xl overflow-hidden">
          <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-10">
           <div className="flex items-center gap-8 w-full md:w-auto">
            <div className="w-20 h-20 rounded-xl flex items-center justify-center shadow-inner shrink-0 border border-stone-100/50 transition-all group-hover:scale-105 bg-amber-50 text-amber-500">
             {item.targetType === 'user' || item.targetType === 'Profile' ? <Users className="w-10 h-10" /> :
              item.targetType === 'community' || item.targetType === 'Community' ? <Globe className="w-10 h-10" /> :
              <MessageSquare className="w-10 h-10" />}
            </div>
            <div className="space-y-3">
             <div className="flex items-center gap-5">
              <span className="text-sm font-semibold text-stone-900">{item.targetName || t('Unnamed item', 'Ανώνυμο στοιχείο')}</span>
              <span className="px-3 py-1 bg-stone-100 text-stone-500 rounded-md text-xs font-medium tracking-wider border border-stone-200/50">
               {typeLabel(item.targetType)}
              </span>
             </div>
             <p className="text-sm text-stone-500 font-medium flex items-center gap-4">
              <span className="text-red-500 font-medium text-xs tracking-wider">{item.reason || t('Report', 'Αναφορά')}</span>
              <span className="w-1 h-1 rounded-full bg-stone-200"></span>
              <span className="text-stone-400 font-medium text-xs tracking-[0.15em]">{item.reporterName ? `${t('by', 'από')} ${item.reporterName}` : ''} {item.createdAt ? `· ${formatDate(new Date(item.createdAt).toISOString())}` : ''}</span>
             </p>
             {item.details && <p className="text-xs text-stone-400 font-medium max-w-md">{item.details}</p>}
            </div>
           </div>
           <div className="flex items-center gap-4 w-full md:w-auto">
            <Button variant="ghost" disabled={busy === item.id} onClick={() => void setReportStatus(item.id, 'dismissed')} className="flex-1 md:flex-none h-10 px-10 text-xs font-medium tracking-wide text-stone-400 hover:text-stone-900 rounded-xl transition-all">
             {t('Dismiss', 'Απόρριψη')}
            </Button>
            <Button disabled={busy === item.id} onClick={() => { void setReportStatus(item.id, 'reviewing'); if (item.href) navigate(item.href); else if (item.targetOwnerId) navigate(`/profile/${item.targetOwnerId}`); }} className="flex-1 md:flex-none h-10 px-12 text-xs font-medium tracking-wide bg-red-600 hover:bg-red-700 text-white border-none shadow-xl shadow-red-900/10 rounded-xl transition-all">
             {t('Review & Action', 'Έλεγχος και ενέργεια')}
            </Button>
           </div>
          </div>
         </Card>
        </motion.div>
       ))}
      </div>
     </div>
    </div>

    {/* Sidebar Area */}
    <div className="space-y-6">
     <div className="flex items-center gap-4 mb-4">
      <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 shadow-sm">
       <BarChart3 className="w-5 h-5 text-stone-900" />
      </div>
      <h2 className="text-base font-semibold text-stone-900 tracking-tight">{t('Ecosystem Health', 'Υγεία οικοσυστήματος')}</h2>
     </div>

     <Card className="border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] p-4 sm:p-6 rounded-xl" contentClassName="space-y-6">
      <div className="space-y-8">
       {[
        { label: t('Profile Completion', 'Ολοκλήρωση προφίλ'), value: users.length ? Math.round((users.filter((u) => u.company || u.avatarUrl).length / users.length) * 100) : 0, color: "bg-blue-500" },
        { label: t('Verified Members', 'Επαληθευμένα μέλη'), value: users.length ? Math.round((users.filter((u) => u.verificationStatus === 'Verified').length / users.length) * 100) : 0, color: "bg-emerald-500" },
        { label: t('Active Last 15 Min', 'Ενεργά τα τελευταία 15 λεπτά'), value: users.length ? Math.round((activeNow / users.length) * 100) : 0, color: "bg-amber-500" },
       ].map((metric, i) => (
        <div key={i} className="space-y-4">
         <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-stone-400 tracking-wider">{metric.label}</span>
          <span className="text-sm font-medium text-stone-900">{metric.value}%</span>
         </div>
         <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden shadow-inner border border-stone-200/20">
          <motion.div 
           initial={{ width: 0 }}
           animate={{ width: `${metric.value}%` }}
           transition={{ duration: 1.5, ease: "easeOut" }}
           className={cn("h-full rounded-full shadow-lg", metric.color)}
          ></motion.div>
         </div>
        </div>
       ))}
      </div>

      <div className="pt-8 border-t border-stone-50">
       <div className="flex items-center gap-4 p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 shadow-sm">
        <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
         <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
         <p className="text-xs font-medium text-emerald-900 tracking-wider">{t('Data live from Firestore', 'Δεδομένα ζωντανά από το Firestore')}</p>
         <p className="text-xs text-emerald-600 font-medium tracking-wide mt-0.5">{openReports.length ? t(`${openReports.length} report(s) pending`, `${openReports.length} αναφορές σε εκκρεμότητα`) : t('No pending reports', 'Καμία εκκρεμής αναφορά')}</p>
        </div>
       </div>
      </div>
     </Card>

     {/* Ecosystem Distribution */}
     <div className="space-y-4">
      <h3 className="text-xs font-medium text-stone-400 tracking-wider ml-2">{t('Member Distribution', 'Κατανομή μελών')}</h3>
     <Card className="border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] p-4 sm:p-6 rounded-xl" contentClassName="space-y-6">
       {(() => {
        const count = (re: RegExp) => users.filter((u) => u.roles.some((r) => re.test(r))).length;
        const pct = (n: number) => (users.length ? Math.round((n / users.length) * 100) : 0);
        return [
         { label: t('Founders', 'Ιδρυτές'), value: pct(count(/founder/i)), color: "bg-stone-900", icon: Zap },
         { label: t('Co-Founders', 'Συνιδρυτές'), value: pct(count(/co-?founder|cofounder/i)), color: "bg-stone-600", icon: Users },
         { label: t('Mentors', 'Μέντορες'), value: pct(count(/mentor/i)), color: "bg-stone-400", icon: Star },
         { label: t('Admins', 'Διαχειριστές'), value: pct(count(/admin/i)), color: "bg-stone-200", icon: ShieldCheck },
        ];
       })().map((item, i) => (
        <div key={i} className="space-y-3">
         <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
           <div className="p-1.5 bg-stone-50 rounded-lg border border-stone-100 shadow-sm">
            <item.icon className="w-3.5 h-3.5 text-stone-400" />
           </div>
           <span className="text-xs font-medium text-stone-500 tracking-wide">{item.label}</span>
          </div>
          <span className="text-xs font-medium text-stone-900">{item.value}%</span>
         </div>
         <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <motion.div 
           initial={{ width: 0 }}
           animate={{ width: `${item.value}%` }}
           className={cn("h-full rounded-full", item.color)}
          ></motion.div>
         </div>
        </div>
       ))}
      </Card>
     </div>

     {/* Quick Actions */}
     <div className="space-y-4">
      <h3 className="text-xs font-medium text-stone-400 tracking-wider ml-2">{t('Administrative Actions', 'Ενέργειες διαχείρισης')}</h3>
      <div className="grid grid-cols-1 gap-4">
       <motion.button
        whileHover={{ x: 6, scale: 1.01 }}
        onClick={() => navigate('/admin/branding')}
        className="w-full flex items-center gap-6 p-6 bg-white border border-stone-100 rounded-[1.75rem] hover:border-stone-900 hover:shadow-[0_10px_40px_rgb(0,0,0,0.06)] transition-all text-left group shadow-[0_4px_20px_rgb(0,0,0,0.02)]"
       >
        <div className="w-14 h-11 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all shadow-inner border border-stone-100/50">
         <Globe className="w-7 h-7" />
        </div>
        <div className="space-y-1">
         <p className="text-sm font-medium text-stone-900 tracking-tight">{t('Platform Branding', 'Ταυτότητα πλατφόρμας')}</p>
         <p className="text-xs text-stone-500 font-medium">{t('Logos, name and visual identity', 'Λογότυπο, όνομα και οπτική ταυτότητα')}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center ml-auto group-hover:bg-stone-900 group-hover:text-white transition-all shadow-sm border border-stone-100/50">
         <ChevronRight className="w-4 h-4" />
        </div>
       </motion.button>

       <motion.button
        whileHover={{ x: 6, scale: 1.01 }}
        onClick={exportCsv}
        className="w-full flex items-center gap-6 p-6 bg-white border border-stone-100 rounded-[1.75rem] hover:border-stone-900 hover:shadow-[0_10px_40px_rgb(0,0,0,0.06)] transition-all text-left group shadow-[0_4px_20px_rgb(0,0,0,0.02)]"
       >
        <div className="w-14 h-11 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all shadow-inner border border-stone-100/50">
         <Briefcase className="w-7 h-7" />
        </div>
        <div className="space-y-1">
         <p className="text-sm font-medium text-stone-900 tracking-tight">{t('Export Platform Data', 'Εξαγωγή δεδομένων πλατφόρμας')}</p>
         <p className="text-xs text-stone-500 font-medium">{t('Download members as CSV', 'Λήψη μελών σε CSV')}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center ml-auto group-hover:bg-stone-900 group-hover:text-white transition-all shadow-sm border border-stone-100/50">
         <ChevronRight className="w-4 h-4" />
        </div>
       </motion.button>
      </div>
     </div>
    </div>
   </div>
  </motion.div>
 );
}
