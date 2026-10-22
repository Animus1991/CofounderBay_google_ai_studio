import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CreditCard, History, Zap, AlertCircle, CheckCircle2, ArrowRight, Download, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { User, Subscription, Invoice } from "../../types";
import { billingService, MOCK_PLANS } from "../../services/billingService";
import { keys, readIds, readSessions, readValue, writeValue } from "../../lib/localLists";
import { useT } from "../../lib/language";
import { labelOf } from "../../lib/labels";
import { formatDate } from "../../lib/dates";
import { useStored } from "../../lib/useStored";
import { useAuth } from "../../App";

type PayCard = { id: string; brand: string; last4: string; expiry: string };

interface BillingProps {
 user: User;
}

export default function Billing({ user }: BillingProps) {
 const t = useT();
 const [subscription, setSubscription] = useState<Subscription | null>(null);
 const [invoices, setInvoices] = useState<Invoice[]>([]);
 const cards = useStored(() => readValue<PayCard[]>(keys.paymentCards, []), [keys.paymentCards]);
 const [billingInfo, setBillingInfo] = useState<{ name: string; country: string }>(() => {
  const stored = readValue<{ billingName?: string; billingCountry?: string }>(keys.accountForm, {});
  return { name: stored.billingName || user.fullName || '', country: stored.billingCountry || '' };
 });
 const [requestNote, setRequestNote] = useState('');
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<'plan' | 'payment' | 'history'>('plan');
 const { isDemoMode } = useAuth();

 useEffect(() => {
  async function loadBillingData() {
   try {
    const [sub, invs] = await Promise.all([
     billingService.getSubscription(user.id, 'user'),
     billingService.getInvoices(user.id, 'user')
    ]);
    setSubscription(sub);
    setInvoices(invs);
   } catch (error) {
    console.error("Error loading billing data:", error);
   } finally {
    setLoading(false);
   }
  }
  loadBillingData();
 }, [user.id]);

 const currentPlan = MOCK_PLANS.find(p => p.id === subscription?.planId);
 const communityIds = useStored(() => readIds(keys.communities), [keys.communities]);
 const sessions = useStored(readSessions, [keys.sessions]);
 const communityCount = communityIds.length;
 const mentorshipsThisMonth = sessions.filter((s) => {
  const d = new Date(s.time);
  if (!Number.isFinite(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
 }).length;
 const commLimit = Number(currentPlan?.limits?.communities) || 0;
 const mentorLimit = Number(currentPlan?.limits?.mentorships) || 0;
 const requestBilling = async (kind: 'upgrade' | 'cancel', note: string) => {
  try {
   await billingService.requestChange(kind, { subscriptionId: subscription?.id, planId: subscription?.planId });
   setRequestNote(note);
   setTimeout(() => setRequestNote(''), 2500);
  } catch {
   setRequestNote(t('Sign in to send a billing request.', 'Συνδέσου για να στείλεις αίτημα χρέωσης.'));
  }
 };
 const planName = (id: string | undefined, name: string | undefined) => ({
  'free-individual': t('Individual Free', 'Δωρεάν ατομικό'),
  'premium-individual': t('Individual Premium', 'Premium ατομικό'),
  'organization-standard': t('Organization', 'Οργανισμός'),
  'tenant-multi-seat': t('Multi-Seat Tenant', 'Οργανισμός πολλών θέσεων'),
  'enterprise-custom': t('Enterprise', 'Enterprise'),
 }[id ?? ''] ?? name);
 const planDescription = (id: string | undefined, description: string | undefined) => ({
  'free-individual': t('Essential tools for finding your next co-founder.', 'Βασικά εργαλεία για να βρεις συνιδρυτή.'),
  'premium-individual': t('Advanced matching and exclusive community access.', 'Σύνθετη αντιστοίχιση και αποκλειστική πρόσβαση σε κοινότητες.'),
  'organization-standard': t('Perfect for small incubators and accelerators.', 'Ιδανικό για μικρές θερμοκοιτίδες και επιταχυντές.'),
  'tenant-multi-seat': t('Scale your ecosystem with advanced management tools.', 'Κλιμάκωσε το οικοσύστημα με σύνθετα εργαλεία διαχείρισης.'),
  'enterprise-custom': t('Custom solutions for large-scale institutions.', 'Προσαρμοσμένες λύσεις για οργανισμούς μεγάλης κλίμακας.'),
 }[id ?? ''] ?? description);
 const featureLabel = (key: string) => {
  const map: Record<string, [string, string]> = {
   communityModules: ['Community modules', 'Ενότητες κοινότητας'],
   advancedFilters: ['Advanced filters', 'Σύνθετα φίλτρα'],
   mentorModules: ['Mentor modules', 'Ενότητες μεντόρων'],
   privateCommunities: ['Private communities', 'Ιδιωτικές κοινότητες'],
   advancedAnalytics: ['Advanced analytics', 'Σύνθετα αναλυτικά'],
   sso: ['SSO', 'SSO'],
   whiteLabeling: ['White-labeling', 'Λευκή ετικέτα'],
   programManagement: ['Program management', 'Διαχείριση προγραμμάτων'],
   advancedExports: ['Advanced exports', 'Σύνθετες εξαγωγές'],
   cohortModules: ['Cohort modules', 'Ενότητες cohort'],
  };
  const pair = map[key];
  return pair ? t(pair[0], pair[1]) : key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
 };

 if (loading) {
  return (
   <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
   </div>
  );
 }

 return (
  <div className="space-y-8 max-w-4xl mx-auto">
   <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
    <div>
     <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-stone-900">{t('Billing & Subscription', 'Χρέωση και συνδρομή')}</h1>
     <p className="text-stone-500">{t('Manage your plan, payment methods, and billing history.', 'Διαχείριση πακέτου, μεθόδων πληρωμής και ιστορικού χρέωσης.')}</p>
     {isDemoMode && <p className="text-xs text-stone-500 mt-1">{t('Sample account — billing data appears for real accounts.', 'Δοκιμαστικός λογαριασμός — τα δεδομένα χρέωσης εμφανίζονται σε πραγματικούς λογαριασμούς.')}</p>}
    </div>
   </div>

   {/* Tabs */}
   <div className="scroll-tabs p-1 bg-stone-100 rounded-2xl">
    {[
     { id: 'plan', label: t('Current Plan', 'Τρέχον πακέτο'), icon: Zap },
     { id: 'payment', label: t('Payment Method', 'Μέθοδος πληρωμής'), icon: CreditCard },
     { id: 'history', label: t('Billing History', 'Ιστορικό χρέωσης'), icon: History },
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
    {activeTab === 'plan' && (
     <motion.div
      key="plan"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
     >
      {/* Active Plan Card */}
     <Card className="p-4 sm:p-6 border-2 border-stone-900 relative overflow-hidden">
       <div className="absolute top-0 right-0 p-4">
        <div className="px-3 py-1 bg-stone-900 text-white text-xs font-medium tracking-wide rounded-full">
         {t('Active Plan', 'Ενεργό πακέτο')}
        </div>
       </div>

       <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="flex-1 space-y-4">
         <div className="space-y-1">
          <h3 className="text-base font-semibold">{planName(currentPlan?.id, currentPlan?.name)}</h3>
          <p className="text-stone-500">{planDescription(currentPlan?.id, currentPlan?.description)}</p>
         </div>

         <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold">${subscription?.billingCycle === 'Annual' ? (currentPlan?.priceAnnual ?? 0) / 12 : currentPlan?.priceMonthly}</span>
          <span className="text-stone-400 text-sm font-medium">{t('/ month', '/ μήνα')}</span>
          {subscription?.billingCycle === 'Annual' && (
           <span className="text-xs text-green-600 font-medium tracking-wider ml-2">{t('Billed Annually', 'Ετήσια χρέωση')}</span>
          )}
         </div>

         <div className="pt-4 flex flex-wrap gap-4">
          <div className="px-4 py-2 bg-stone-50 rounded-xl border border-stone-100">
           <p className="text-xs font-medium text-stone-400 tracking-wide">{t('Next Renewal', 'Επόμενη ανανέωση')}</p>
           <p className="text-sm font-medium">{subscription?.renewalDate ? formatDate(subscription.renewalDate) : '—'}</p>
          </div>
          <div className="px-4 py-2 bg-stone-50 rounded-xl border border-stone-100">
           <p className="text-xs font-medium text-stone-400 tracking-wide">{t('Payment Status', 'Κατάσταση πληρωμής')}</p>
           <p className="text-sm font-medium text-green-600">{subscription?.status ? labelOf(subscription.status) : '—'}</p>
          </div>
          {requestNote && (
           <div className="px-4 py-2 bg-green-50 rounded-xl border border-green-100">
            <p className="text-sm font-medium text-green-700">{requestNote}</p>
           </div>
          )}
         </div>
        </div>

        <div className="w-full md:w-64 space-y-3">
         <Button className="w-full gap-2" onClick={() => requestBilling('upgrade', t('Upgrade request sent to the platform team.', 'Το αίτημα αναβάθμισης στάλθηκε στην ομάδα.'))}>
          {t('Upgrade Plan', 'Αναβάθμιση πακέτου')} <ArrowRight className="w-4 h-4" />
         </Button>
         <Button variant="outline" className="w-full" onClick={() => requestBilling('upgrade', t('Billing cycle change request sent.', 'Το αίτημα αλλαγής κύκλου στάλθηκε.'))}>
          {t('Change Billing Cycle', 'Αλλαγή κύκλου χρέωσης')}
         </Button>
         <button
          type="button"
          onClick={() => requestBilling('cancel', t('Cancellation request sent.', 'Το αίτημα ακύρωσης στάλθηκε.'))}
          className="w-full text-center text-xs text-stone-400 font-medium tracking-wide hover:text-red-500 transition-colors pt-2"
         >
          {t('Cancel Subscription', 'Ακύρωση συνδρομής')}
         </button>
        </div>
       </div>
      </Card>

      {/* Feature Access List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
       <Card title={t("Included Features", "Δυνατότητες που περιλαμβάνονται")} className="p-6">
        <ul className="space-y-3">
         {Object.entries(currentPlan?.features ?? {}).map(([key, value]) => (
          <li key={key} className="flex items-center gap-3 text-sm">
           {value ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
           ) : (
            <AlertCircle className="w-4 h-4 text-stone-200" />
           )}
           <span className={value ? 'text-stone-900' : 'text-stone-400 line-through'}>
            {featureLabel(typeof value === 'string' ? value : key)}
           </span>
          </li>
         ))}
        </ul>
       </Card>

       <Card title={t("Usage & Limits", "Χρήση και όρια")} className="p-6">
        <div className="space-y-6">
         <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
           <span>{t('Communities', 'Κοινότητες')}</span>
           <span>{communityCount} / {commLimit > 0 ? commLimit : t('Unlimited', 'Απεριόριστο')}</span>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
           <div className="h-full bg-stone-900" style={{ width: `${commLimit > 0 ? Math.min(100, (communityCount / commLimit) * 100) : 0}%` }} />
          </div>
         </div>
         <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
           <span>{t('Monthly Mentorships', 'Μηνιαίες καθοδηγήσεις')}</span>
           <span>{mentorshipsThisMonth} / {mentorLimit > 0 ? mentorLimit : t('Unlimited', 'Απεριόριστο')}</span>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
           <div className="h-full bg-stone-900" style={{ width: `${mentorLimit > 0 ? Math.min(100, (mentorshipsThisMonth / mentorLimit) * 100) : 0}%` }} />
          </div>
         </div>
         {mentorLimit > 0 && mentorshipsThisMonth >= mentorLimit && (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
           <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
           <p className="text-xs text-amber-800 leading-relaxed">
            {t("You've reached your mentorship limit for this month. Upgrade to Premium for unlimited mentorship sessions.", "Έφτασες το όριο καθοδήγησης για αυτόν τον μήνα. Αναβάθμισε σε Premium για απεριόριστες συνεδρίες.")}
           </p>
          </div>
         )}
        </div>
       </Card>
      </div>
     </motion.div>
    )}

    {activeTab === 'payment' && (
     <motion.div
      key="payment"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
     >
      <Card className="p-4 sm:p-6">
       <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
         <h3 className="text-base font-semibold">{t('Default Payment Method', 'Προεπιλεγμένη μέθοδος πληρωμής')}</h3>
         <p className="text-sm text-stone-500">{t('This card will be used for all recurring charges.', 'Αυτή η κάρτα θα χρησιμοποιείται για όλες τις επαναλαμβανόμενες χρεώσεις.')}</p>
        </div>
        <Link to="/settings" className="inline-flex items-center gap-2 px-4 py-2 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors">
          <Plus className="w-4 h-4" /> {t('Add Method', 'Προσθήκη μεθόδου')}
         </Link>
       </div>

       {cards.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-stone-200 rounded-2xl">
         <p className="text-sm text-stone-500 mb-3">{t('No payment method saved yet.', 'Δεν έχει αποθηκευτεί μέθοδος πληρωμής ακόμη.')}</p>
         <Link to="/settings" className="text-sm font-medium text-stone-900 underline underline-offset-2">
          {t('Add a card in Account Settings', 'Πρόσθεσε κάρτα στις ρυθμίσεις λογαριασμού')}
         </Link>
        </div>
       ) : (
        <div className="space-y-4">
         {cards.map((card, idx) => (
          <div key={card.id} className="p-6 border-2 border-stone-100 rounded-2xl flex items-center gap-6">
           <div className="w-16 h-10 bg-stone-900 rounded-lg flex items-center justify-center text-white font-medium italic text-xs">
            {card.brand}
           </div>
           <div className="flex-1">
            <p className="font-medium text-stone-900">•••• •••• •••• {card.last4}</p>
            <p className="text-xs text-stone-500 tracking-wide font-medium">{t('Expires', 'Λήξη')} {card.expiry}</p>
           </div>
           <div className="flex gap-2">
            {idx === 0 && <span className="self-center text-xs text-green-700 bg-green-50 px-2 py-1 rounded-lg font-medium">{t('Default', 'Προεπιλογή')}</span>}
            <Button
             variant="outline"
             className="text-xs px-3 py-1.5 text-red-500 hover:text-red-600"
             onClick={() => {
              const next = cards.filter((item) => item.id !== card.id);
              writeValue(keys.paymentCards, next);
             }}
            >
             {t('Remove', 'Αφαίρεση')}
            </Button>
           </div>
          </div>
         ))}
        </div>
       )}
      </Card>

      <Card className="p-4 sm:p-6">
       <div className="space-y-1 mb-6">
        <h3 className="text-base font-semibold">{t('Billing Address', 'Διεύθυνση χρέωσης')}</h3>
        <p className="text-sm text-stone-500">{t('Used for generating tax-compliant invoices.', 'Για την έκδοση φορολογικά συμμορφωμένων τιμολογίων.')}</p>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
         <label className="text-xs font-medium text-stone-400 tracking-wide">{t('Legal Name', 'Νομική επωνυμία')}</label>
         <input
          type="text"
          value={billingInfo.name}
          onChange={(e) => setBillingInfo((prev) => ({ ...prev, name: e.target.value }))}
          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none"
         />
        </div>
        <div className="space-y-2">
         <label htmlFor="billing-country" className="text-xs font-medium text-stone-400 tracking-wide">{t('Country', 'Χώρα')}</label>
         <select id="billing-country"
          value={billingInfo.country}
          onChange={(e) => setBillingInfo((prev) => ({ ...prev, country: e.target.value }))}
          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none"
         >
          <option value="">{t('Select country', 'Επίλεξε χώρα')}</option>
          <option value="US">{t('United States', 'Ηνωμένες Πολιτείες')}</option>
          <option value="UK">{t('United Kingdom', 'Ηνωμένο Βασίλειο')}</option>
          <option value="DE">{t('Germany', 'Γερμανία')}</option>
          <option value="GR">{t('Greece', 'Ελλάδα')}</option>
         </select>
        </div>
       </div>
       <Button
        className="mt-8"
        onClick={() => {
         const stored = readValue<Record<string, any>>(keys.accountForm, {});
         const next = { ...stored, billingName: billingInfo.name, billingCountry: billingInfo.country };
         writeValue(keys.accountForm, next);
         setRequestNote(t('Billing info saved.', 'Τα στοιχεία χρέωσης αποθηκεύτηκαν.'));
         setTimeout(() => setRequestNote(''), 2500);
        }}
       >
        {requestNote || t('Update Billing Info', 'Ενημέρωση στοιχείων χρέωσης')}
       </Button>
      </Card>
     </motion.div>
    )}

    {activeTab === 'history' && (
     <motion.div
      key="history"
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
          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide">{t('Amount', 'Ποσό')}</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide">{t('Status', 'Κατάσταση')}</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide text-right">{t('Action', 'Ενέργεια')}</th>
         </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
         {invoices.map((invoice) => (
          <tr key={invoice.id} className="hover:bg-stone-50 transition-colors">
           <td className="px-4 py-2 text-sm font-medium">{formatDate(invoice.createdAt ?? 0)}</td>
           <td className="px-4 py-2 text-sm font-mono text-stone-500">{invoice.number}</td>
           <td className="px-4 py-2 text-sm font-medium">${invoice.total}</td>
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
             aria-label={t('Download', 'Λήψη')}
             onClick={() => {
              const blob = new Blob([JSON.stringify(invoice, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${invoice.number || invoice.id}.json`;
              a.click();
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
           <td colSpan={5} className="px-8 py-12 text-center text-stone-400 italic font-medium">
            {t('No invoices yet. They appear here once billing runs.', 'Δεν υπάρχουν τιμολόγια ακόμη.')}
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
