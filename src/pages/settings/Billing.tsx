import { useState, useEffect } from "react";
import { CreditCard, History, Zap, Shield, AlertCircle, CheckCircle2, ArrowRight, ExternalLink, Download, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { User, Subscription, Invoice, BillingPlan } from "../../types";
import { billingService, MOCK_PLANS } from "../../services/billingService";

interface BillingProps {
 user: User;
}

export default function Billing({ user }: BillingProps) {
 const [subscription, setSubscription] = useState<Subscription | null>(null);
 const [invoices, setInvoices] = useState<Invoice[]>([]);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<'plan' | 'payment' | 'history'>('plan');

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
     <h2 className="text-xl font-medium tracking-tight">Billing & Subscription</h2>
     <p className="text-stone-500">Manage your plan, payment methods, and billing history.</p>
    </div>
   </div>

   {/* Tabs */}
   <div className="flex gap-1 p-1 bg-stone-100 rounded-2xl w-fit">
    {[
     { id: 'plan', label: 'Current Plan', icon: Zap },
     { id: 'payment', label: 'Payment Method', icon: CreditCard },
     { id: 'history', label: 'Billing History', icon: History },
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
      <Card className="p-8 border-2 border-stone-900 relative overflow-hidden">
       <div className="absolute top-0 right-0 p-4">
        <div className="px-3 py-1 bg-stone-900 text-white text-xs font-medium uppercase tracking-widest rounded-full">
         Active Plan
        </div>
       </div>
       
       <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="flex-1 space-y-4">
         <div className="space-y-1">
          <h3 className="text-xl sm:text-2xl xl:text-3xl font-medium">{currentPlan?.name}</h3>
          <p className="text-stone-500">{currentPlan?.description}</p>
         </div>
         
         <div className="flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl xl:text-3xl font-medium">${subscription?.billingCycle === 'Annual' ? (currentPlan?.priceAnnual ?? 0) / 12 : currentPlan?.priceMonthly}</span>
          <span className="text-stone-400 text-sm font-medium">/ month</span>
          {subscription?.billingCycle === 'Annual' && (
           <span className="text-xs text-green-600 font-medium uppercase tracking-wider ml-2">Billed Annually</span>
          )}
         </div>

         <div className="pt-4 flex flex-wrap gap-4">
          <div className="px-4 py-2 bg-stone-50 rounded-xl border border-stone-100">
           <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">Next Renewal</p>
           <p className="text-sm font-medium">{new Date(subscription?.renewalDate ?? '').toLocaleDateString()}</p>
          </div>
          <div className="px-4 py-2 bg-stone-50 rounded-xl border border-stone-100">
           <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">Payment Status</p>
           <p className="text-sm font-medium text-green-600">Healthy</p>
          </div>
         </div>
        </div>

        <div className="w-full md:w-64 space-y-3">
         <Button className="w-full gap-2">
          Upgrade Plan <ArrowRight className="w-4 h-4" />
         </Button>
         <Button variant="outline" className="w-full">
          Change Billing Cycle
         </Button>
         <button className="w-full text-center text-xs text-stone-400 font-medium uppercase tracking-widest hover:text-red-500 transition-colors pt-2">
          Cancel Subscription
         </button>
        </div>
       </div>
      </Card>

      {/* Feature Access List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
       <Card title="Included Features" className="p-6">
        <ul className="space-y-3">
         {Object.entries(currentPlan?.features ?? {}).map(([key, value]) => (
          <li key={key} className="flex items-center gap-3 text-sm">
           {value ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
           ) : (
            <AlertCircle className="w-4 h-4 text-stone-200" />
           )}
           <span className={value ? 'text-stone-900' : 'text-stone-400 line-through'}>
            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
           </span>
          </li>
         ))}
        </ul>
       </Card>

       <Card title="Usage & Limits" className="p-6">
        <div className="space-y-6">
         <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
           <span>Communities</span>
           <span>3 / {currentPlan?.limits.communities}</span>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
           <div className="h-full bg-stone-900 w-[30%]" />
          </div>
         </div>
         <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
           <span>Monthly Mentorships</span>
           <span>1 / {currentPlan?.limits.mentorships}</span>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
           <div className="h-full bg-stone-900 w-[100%]" />
          </div>
         </div>
         <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
           You've reached your mentorship limit for this month. Upgrade to Premium for unlimited mentorship sessions.
          </p>
         </div>
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
      <Card className="p-8">
       <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
         <h3 className="text-lg font-medium">Default Payment Method</h3>
         <p className="text-sm text-stone-500">This card will be used for all recurring charges.</p>
        </div>
        <Button variant="outline" className="gap-2">
         <Plus className="w-4 h-4" /> Add Method
        </Button>
       </div>

       <div className="p-6 border-2 border-stone-100 rounded-2xl flex items-center gap-6">
        <div className="w-16 h-10 bg-stone-900 rounded-lg flex items-center justify-center text-white font-medium italic">
         VISA
        </div>
        <div className="flex-1">
         <p className="font-medium text-stone-900">•••• •••• •••• 4242</p>
         <p className="text-xs text-stone-500 uppercase tracking-widest font-medium">Expires 12/26</p>
        </div>
        <div className="flex gap-2">
         <Button variant="outline" className="text-xs px-3 py-1.5">Edit</Button>
         <Button variant="outline" className="text-xs px-3 py-1.5 text-red-500 hover:text-red-600">Remove</Button>
        </div>
       </div>
      </Card>

      <Card className="p-8">
       <div className="space-y-1 mb-6">
        <h3 className="text-lg font-medium">Billing Address</h3>
        <p className="text-sm text-stone-500">Used for generating tax-compliant invoices.</p>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
         <label className="text-xs font-medium text-stone-400 uppercase tracking-widest">Legal Name</label>
         <input type="text" defaultValue="Alex Stanford" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none" />
        </div>
        <div className="space-y-2">
         <label className="text-xs font-medium text-stone-400 uppercase tracking-widest">Country</label>
         <select className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none">
          <option>United States</option>
          <option>United Kingdom</option>
          <option>Germany</option>
         </select>
        </div>
       </div>
       <Button className="mt-8">Update Billing Info</Button>
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
          <th className="px-4 py-2 text-xs font-medium text-stone-400 uppercase tracking-widest">Date</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 uppercase tracking-widest">Invoice #</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 uppercase tracking-widest">Amount</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 uppercase tracking-widest">Status</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 uppercase tracking-widest text-right">Action</th>
         </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
         {invoices.map((invoice) => (
          <tr key={invoice.id} className="hover:bg-stone-50 transition-colors">
           <td className="px-4 py-2 text-sm font-medium">{new Date(invoice.createdAt).toLocaleDateString()}</td>
           <td className="px-4 py-2 text-sm font-mono text-stone-500">{invoice.number}</td>
           <td className="px-4 py-2 text-sm font-medium">${invoice.total}</td>
           <td className="px-4 py-2">
            <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider ${
             invoice.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
             {invoice.status}
            </span>
           </td>
           <td className="px-4 py-2 text-right">
            <button className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
             <Download className="w-4 h-4" />
            </button>
           </td>
          </tr>
         ))}
        </tbody>
       </table>
      </Card>
     </motion.div>
    )}
   </AnimatePresence>
  </div>
 );
}
