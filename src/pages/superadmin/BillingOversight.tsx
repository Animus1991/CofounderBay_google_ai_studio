import {
 useState,
 useEffect,
 useMemo } from "react";
import { TrendingUp,
 Users,
 History,
 Zap,
 Download,
 Plus,
 Search,
 MoreHorizontal,
 DollarSign,
 BarChart3,
 PieChart
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell } from "recharts";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { Invoice, BillingPlan, Subscription } from "../../types";
import { billingService } from "../../services/billingService";
import { db } from "../../firebase";
import { useT } from "../../lib/language";
import { labelOf } from "../../lib/labels";
import { formatDate } from "../../lib/dates";
import { useAuth } from "../../App";

const CHART_COLORS = ['#292524', '#78716c', '#a8a29e', '#d6d3d1', '#e7e5e4'];

export default function BillingOversight() {
 const t = useT();
 const [plans, setPlans] = useState<BillingPlan[]>([]);
 const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
 const [invoices, setInvoices] = useState<Invoice[]>([]);
 const [userNames, setUserNames] = useState<Record<string, string>>({});
 const [subSearch, setSubSearch] = useState('');
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<'metrics' | 'plans' | 'subscriptions' | 'invoices'>('metrics');
 const { isDemoMode } = useAuth();

 useEffect(() => {
  let mounted = true;
  billingService.getPlans().then((p) => { if (mounted) setPlans(p); }).catch(() => {});
  // Sample account: billing collections deny signed-out reads, so the page shows
  // its honest empty states instead of opening denied listeners.
  if (isDemoMode) {
   setLoading(false);
   return () => { mounted = false; };
  }
  const unSub = onSnapshot(collection(db, 'subscriptions'), (snap) => {
   if (!mounted) return;
   setSubscriptions(snap.docs.map((d) => ({ ...(d.data() as Subscription), id: d.id })));
   setLoading(false);
  }, () => setLoading(false));
  const unInv = onSnapshot(collection(db, 'invoices'), (snap) => {
   if (mounted) setInvoices(snap.docs.map((d) => ({ ...(d.data() as Invoice), id: d.id })));
  }, () => {});
  getDocs(collection(db, 'users')).then((snap) => {
   if (!mounted) return;
   const names: Record<string, string> = {};
   snap.docs.forEach((d) => { const u = d.data() as any; names[d.id] = u.fullName || u.email || d.id; });
   setUserNames(names);
  }).catch(() => {});
  return () => { mounted = false; unSub(); unInv(); };
 }, [isDemoMode]);

 const priceOf = (planId?: string, cycle?: string) => {
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return 0;
  return cycle === 'Annual' ? (plan.priceAnnual ?? 0) / 12 : plan.priceMonthly ?? 0;
 };

 const metrics = useMemo(() => {
  const active = subscriptions.filter((s) => s.status === 'Active');
  const mrr = active.reduce((sum, s) => sum + priceOf(s.planId, s.billingCycle), 0);
  const canceled = subscriptions.filter((s) => s.status === 'Canceled').length;
  const churnShare = subscriptions.length ? (canceled / subscriptions.length) * 100 : 0;
  const arpu = active.length ? mrr / active.length : 0;
  return { mrr, active: active.length, arpu, churnShare };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [subscriptions, plans]);

 const revenueByMonth = useMemo(() => {
  const map = new Map<string, number>();
  invoices.forEach((inv) => {
   const d = new Date(inv.createdAt || inv.dueDate || 0);
   if (isNaN(d.getTime())) return;
   const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
   map.set(key, (map.get(key) || 0) + (inv.total ?? inv.amount ?? 0));
  });
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-8)
   .map(([month, total]) => ({ month, total }));
 }, [invoices]);

 const planDistribution = useMemo(() => {
  const map = new Map<string, number>();
  subscriptions.forEach((s) => map.set(s.planId, (map.get(s.planId) || 0) + 1));
  return [...map.entries()].map(([planId, count]) => ({
   name: plans.find((p) => p.id === planId)?.name || planId || 'Unknown',
   value: count,
  }));
 }, [subscriptions, plans]);

 const filteredSubs = subscriptions.filter((s) => {
  const q = subSearch.trim().toLowerCase();
  if (!q) return true;
  const name = (userNames[s.userId || s.tenantId] || s.userId || s.tenantId || '').toLowerCase();
  return name.includes(q) || s.id.toLowerCase().includes(q) || (s.planId || '').toLowerCase().includes(q);
 });

 const exportCsv = () => {
  const rows = [['id', 'customer', 'plan', 'status', 'cycle'],
   ...subscriptions.map((s) => [s.id, userNames[s.userId || s.tenantId] || s.userId || s.tenantId, s.planId, s.status, s.billingCycle || ''])];
  const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'subscriptions.csv'; a.click();
  URL.revokeObjectURL(url);
 };

 if (loading) {
  return (
   <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
   </div>
  );
 }

 return (
  <div className="space-y-8">
   <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
    <div>
     <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-stone-900">{t('Billing Oversight', 'Εποπτεία χρέωσης')}</h1>
     <p className="text-stone-500">{t('Global platform billing metrics, plan management, and subscription monitoring.', 'Καθολικά μεγέθη χρέωσης, διαχείριση πλάνων και παρακολούθηση συνδρομών.')}</p>
     {isDemoMode && <p className="text-xs text-stone-500 mt-1">{t('Sample account — billing data appears for real accounts.', 'Δοκιμαστικός λογαριασμός — τα δεδομένα χρέωσης εμφανίζονται σε πραγματικούς λογαριασμούς.')}</p>}
    </div>
    <div className="flex gap-3">
     <Button variant="outline" className="gap-2" onClick={exportCsv}>
      <Download className="w-4 h-4" /> {t('Export Report', 'Εξαγωγή αναφοράς')}
     </Button>
     <Button className="gap-2" onClick={() => setActiveTab('plans')}>
      <Plus className="w-4 h-4" /> {t('Create New Plan', 'Δημιουργία νέου πλάνου')}
     </Button>
    </div>
   </div>

   {/* Tabs */}
   <div className="scroll-tabs p-1 bg-stone-100 rounded-2xl">
    {[
     { id: 'metrics', label: t('Revenue Metrics', 'Μεγέθη εσόδων'), icon: BarChart3 },
     { id: 'plans', label: t('Plan Management', 'Διαχείριση πλάνων'), icon: Zap },
     { id: 'subscriptions', label: t('All Subscriptions', 'Όλες οι συνδρομές'), icon: Users },
     { id: 'invoices', label: t('All Invoices', 'Όλα τα τιμολόγια'), icon: History },
    ].map((tab) => (
     <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id as any)}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
       activeTab === tab.id
        ? "bg-white text-stone-900 shadow-sm"
        : "text-stone-400 hover:text-stone-600"
      }`}
     >
      <tab.icon className="w-4 h-4" />
      {tab.label}
     </button>
    ))}
   </div>

   <AnimatePresence mode="wait">
    {activeTab === 'metrics' && (
     <motion.div
      key="metrics"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
     >
      {/* KPI Grid — derived from real subscription docs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
       {[
        { label: t('Total MRR', 'Συνολικό MRR'), value: `$${metrics.mrr.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'bg-green-50 text-green-600' },
        { label: t('Active Subscriptions', 'Ενεργές συνδρομές'), value: String(metrics.active), icon: Users, color: 'bg-blue-50 text-blue-600' },
        { label: t('Average Revenue Per User', 'Μέσο έσοδο ανά μέλος'), value: `$${metrics.arpu.toFixed(2)}`, icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
        { label: t('Canceled Share', 'Ποσοστό ακυρώσεων'), value: `${metrics.churnShare.toFixed(1)}%`, icon: PieChart, color: 'bg-amber-50 text-amber-600' },
       ].map((kpi) => (
        <Card key={kpi.label} className="p-6">
         <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-xl ${kpi.color}`}>
           <kpi.icon className="w-5 h-5" />
          </div>
         </div>
         <p className="text-xs font-medium text-stone-400 tracking-wide mb-1">{kpi.label}</p>
         <p className="text-lg font-semibold">{kpi.value}</p>
        </Card>
       ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
       <Card title={t('Revenue Growth', 'Ανάπτυξη εσόδων')} className="p-6 h-80">
        {revenueByMonth.length === 0 ? (
         <div className="h-full flex items-center justify-center">
          <p className="text-stone-400 font-medium italic">{t('Revenue appears here once invoices are issued.', 'Τα έσοδα εμφανίζονται εδώ όταν εκδοθούν τιμολόγια.')}</p>
         </div>
        ) : (
         <ResponsiveContainer width="100%" height="100%">
          <BarChart data={revenueByMonth}>
           <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
           <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#78716c' }} />
           <YAxis tick={{ fontSize: 11, fill: '#78716c' }} />
           <Tooltip />
           <Bar dataKey="total" fill="#292524" radius={[6, 6, 0, 0]} />
          </BarChart>
         </ResponsiveContainer>
        )}
       </Card>
       <Card title={t('Plan Distribution', 'Κατανομή πλάνων')} className="p-6 h-80">
        {planDistribution.length === 0 ? (
         <div className="h-full flex items-center justify-center">
          <p className="text-stone-400 font-medium italic">{t('Plan distribution appears once subscriptions exist.', 'Η κατανομή εμφανίζεται όταν υπάρξουν συνδρομές.')}</p>
         </div>
        ) : (
         <ResponsiveContainer width="100%" height="100%">
          <RPieChart>
           <Pie data={planDistribution} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} label>
            {planDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
           </Pie>
           <Tooltip />
          </RPieChart>
         </ResponsiveContainer>
        )}
       </Card>
      </div>
     </motion.div>
    )}

    {activeTab === 'plans' && (
     <motion.div
      key="plans"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
     >
      {plans.map((plan) => (
        <Card key={plan.id} className="p-4 sm:p-6" contentClassName="flex flex-col justify-between gap-4">
        <div className="space-y-4">
         <div className="flex justify-between items-start">
          <div className="space-y-1">
           <h3 className="text-base font-semibold">{plan.name}</h3>
           <p className="text-xs text-stone-500">{plan.customerType === 'Individual' ? t('Individual Plan', 'Ατομικό πλάνο') : plan.customerType === 'Tenant' ? t('Organization Plan', 'Πλάνο οργανισμού') : `${plan.customerType} ${t('Plan', 'πλάνο')}`}</p>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium tracking-wider ${
           plan.isActive ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
          }`}>
           {plan.isActive ? labelOf('Active') : labelOf('Inactive')}
          </span>
         </div>
         <div className="pt-2">
          <span className="text-lg font-semibold">${plan.priceMonthly}</span>
          <span className="text-stone-400 text-sm"> {t('/ mo', '/ μήνα')}</span>
         </div>
         <div className="space-y-2">
          <p className="text-xs font-medium text-stone-400 tracking-wide">{t('Key Limits', 'Βασικά όρια')}</p>
          <div className="flex flex-wrap gap-2">
           <span className="px-2 py-1 bg-stone-50 border border-stone-100 rounded text-xs font-medium">
            {t('Seats:', 'Θέσεις:')} {plan.limits?.seats === -1 ? '∞' : plan.limits?.seats}
           </span>
           <span className="px-2 py-1 bg-stone-50 border border-stone-100 rounded text-xs font-medium">
            {t('Communities:', 'Κοινότητες:')} {plan.limits?.communities === -1 ? '∞' : plan.limits?.communities}
           </span>
          </div>
         </div>
        </div>
        <div className="pt-6 flex gap-2">
         <Button
          variant="outline"
          className="flex-1 text-xs"
          onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Draft an updated pricing plan based on ${plan.name}` } }))}
         >
          {t('Edit Plan', 'Επεξεργασία πλάνου')}
         </Button>
        </div>
       </Card>
      ))}
      <button
       type="button"
       onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'Help me design a new subscription plan' } }))}
       className="h-full min-h-[200px] border-2 border-dashed border-stone-200 rounded-3xl flex flex-col items-center justify-center gap-3 text-stone-400 hover:border-stone-900 hover:text-stone-900 transition-all group"
      >
       <div className="p-3 bg-stone-50 rounded-2xl group-hover:bg-stone-100 transition-colors">
        <Plus className="w-6 h-6" />
       </div>
       <span className="text-sm font-medium tracking-wide">{t('Create New Plan', 'Δημιουργία νέου πλάνου')}</span>
      </button>
     </motion.div>
    )}

    {activeTab === 'subscriptions' && (
     <motion.div
      key="subscriptions"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
     >
      <Card className="overflow-hidden">
       <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
        <div className="relative flex-1 max-w-md">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
         <input
          type="text"
          value={subSearch}
          onChange={(e) => setSubSearch(e.target.value)}
          placeholder={t('Search by customer, email, or ID...', 'Αναζήτηση με πελάτη, email ή ID...')}
          className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 ring-stone-900/5 transition-all"
         />
        </div>
       </div>
       <table className="w-full text-left">
        <thead>
         <tr className="bg-stone-50 border-b border-stone-100">
          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide">{t('Customer', 'Πελάτης')}</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide">{t('Plan', 'Πλάνο')}</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide">{t('Status', 'Κατάσταση')}</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide text-right">{t('Action', 'Ενέργεια')}</th>
         </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
         {filteredSubs.map((sub) => (
          <tr key={sub.id} className="hover:bg-stone-50 transition-colors">
           <td className="px-4 py-2">
            <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-stone-200 rounded-full" />
             <div>
              <p className="text-sm font-medium">{userNames[sub.userId || sub.tenantId] || sub.userId || sub.tenantId}</p>
              <p className="text-xs text-stone-500">{sub.id}</p>
             </div>
            </div>
           </td>
           <td className="px-4 py-2">
            <p className="text-sm font-medium">{plans.find((p) => p.id === sub.planId)?.name || sub.planId}</p>
            <p className="text-xs text-stone-400 font-medium tracking-wide">{sub.billingCycle === 'Annual' ? t('Annual Billing', 'Ετήσια χρέωση') : t('Monthly Billing', 'Μηνιαία χρέωση')}</p>
           </td>
           <td className="px-4 py-2">
            <span className={`px-2 py-1 rounded text-xs font-medium tracking-wider ${
             sub.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
            }`}>
             {labelOf(sub.status)}
            </span>
           </td>
           <td className="px-4 py-2 text-right">
            <button
             type="button"
             title={t('Inspect subscription', 'Έλεγχος συνδρομής')}
             onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Review subscription ${sub.id} (${sub.planId}, ${sub.status})` } }))}
             className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
            >
             <MoreHorizontal className="w-4 h-4" />
            </button>
           </td>
          </tr>
         ))}
         {filteredSubs.length === 0 && (
          <tr>
           <td colSpan={4} className="px-8 py-12 text-center text-stone-400 italic font-medium">
            {subSearch ? t('No subscriptions match that search.', 'Καμία συνδρομή δεν ταιριάζει.') : t('No subscriptions recorded yet.', 'Δεν έχουν καταγραφεί συνδρομές ακόμη.')}
           </td>
          </tr>
         )}
        </tbody>
       </table>
      </Card>
     </motion.div>
    )}

    {activeTab === 'invoices' && (
     <motion.div
      key="invoices"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
     >
      <Card className="overflow-hidden">
       <table className="w-full text-left">
        <thead>
         <tr className="bg-stone-50 border-b border-stone-100">
          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide">{t('Date', 'Ημερομηνία')}</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide">{t('Invoice #', 'Τιμολόγιο #')}</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide">{t('Customer', 'Πελάτης')}</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide">{t('Amount', 'Ποσό')}</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide">{t('Status', 'Κατάσταση')}</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide text-right">{t('Action', 'Ενέργεια')}</th>
         </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
         {invoices.map((invoice) => (
          <tr key={invoice.id} className="hover:bg-stone-50 transition-colors">
           <td className="px-4 py-2 text-sm font-medium">{invoice.createdAt ? formatDate(invoice.createdAt) : '—'}</td>
           <td className="px-4 py-2 text-sm font-mono text-stone-500">{invoice.number || invoice.id}</td>
           <td className="px-4 py-2 text-sm font-medium">{userNames[invoice.userId || ''] || invoice.userId || '—'}</td>
           <td className="px-4 py-2 text-sm font-medium">${(invoice.total ?? invoice.amount ?? 0).toFixed(2)}</td>
           <td className="px-4 py-2">
            <span className={`px-2 py-1 rounded text-xs font-medium tracking-wider ${
             invoice.status === 'Paid' ? 'text-green-700' : 'text-amber-700'
            }`}>
             {labelOf(invoice.status)}
            </span>
           </td>
           <td className="px-4 py-2 text-right">
            <button
             type="button"
             title={t('Download invoice record', 'Λήψη εγγραφής τιμολογίου')}
             onClick={() => {
              const blob = new Blob([JSON.stringify(invoice, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `${invoice.number || invoice.id}.json`; a.click();
              URL.revokeObjectURL(url);
             }}
             className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
            >
             <Download className="w-4 h-4" />
            </button>
           </td>
          </tr>
         ))}
         {invoices.length === 0 && (
          <tr>
           <td colSpan={6} className="px-8 py-12 text-center text-stone-400 italic font-medium">
            {t('No invoices issued yet.', 'Δεν έχουν εκδοθεί τιμολόγια ακόμη.')}
           </td>
          </tr>
         )}
        </tbody>
       </table>
      </Card>
     </motion.div>
    )}
   </AnimatePresence>
  </div>
 );
}
