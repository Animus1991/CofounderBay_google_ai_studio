import { useState, useEffect } from "react";
import { TrendingUp, Users, CreditCard, History, Zap, Shield, AlertCircle, CheckCircle2, ArrowRight, ExternalLink, Download, Plus, Search, Filter, MoreHorizontal, DollarSign, BarChart3, PieChart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { Subscription, Invoice, BillingPlan, Tenant } from "../../types";
import { billingService, MOCK_PLANS } from "../../services/billingService";

export default function BillingOversight() {
 const [plans, setPlans] = useState<BillingPlan[]>([]);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<'metrics' | 'plans' | 'subscriptions' | 'invoices'>('metrics');

 useEffect(() => {
  async function loadData() {
   try {
    const p = await billingService.getPlans();
    setPlans(p);
   } catch (error) {
    console.error("Error loading plans:", error);
   } finally {
    setLoading(false);
   }
  }
  loadData();
 }, []);

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
     <h2 className="text-xl font-medium tracking-tight">Billing Oversight</h2>
     <p className="text-stone-500">Global platform billing metrics, plan management, and subscription monitoring.</p>
    </div>
    <div className="flex gap-3">
     <Button variant="outline" className="gap-2">
      <Download className="w-4 h-4" /> Export Report
     </Button>
     <Button className="gap-2">
      <Plus className="w-4 h-4" /> Create New Plan
     </Button>
    </div>
   </div>

   {/* Tabs */}
   <div className="flex gap-1 p-1 bg-stone-100 rounded-2xl w-fit">
    {[
     { id: 'metrics', label: 'Revenue Metrics', icon: BarChart3 },
     { id: 'plans', label: 'Plan Management', icon: Zap },
     { id: 'subscriptions', label: 'All Subscriptions', icon: Users },
     { id: 'invoices', label: 'All Invoices', icon: History },
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
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
       {[
        { label: 'Total MRR', value: '$142,500', trend: '+12.5%', icon: DollarSign, color: 'bg-green-50 text-green-600' },
        { label: 'Active Subscriptions', value: '1,240', trend: '+8.2%', icon: Users, color: 'bg-blue-50 text-blue-600' },
        { label: 'Average Revenue Per User', value: '$114.92', trend: '+2.1%', icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
        { label: 'Churn Rate (30d)', value: '2.4%', trend: '-0.5%', icon: PieChart, color: 'bg-amber-50 text-amber-600' },
       ].map((kpi) => (
        <Card key={kpi.label} className="p-6">
         <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-xl ${kpi.color}`}>
           <kpi.icon className="w-5 h-5" />
          </div>
          <span className={`text-xs font-medium ${kpi.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
           {kpi.trend}
          </span>
         </div>
         <p className="text-xs font-medium text-stone-400 uppercase tracking-widest mb-1">{kpi.label}</p>
         <p className="text-xl sm:text-2xl xl:text-3xl font-medium">{kpi.value}</p>
        </Card>
       ))}
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
       <Card title="Revenue Growth" className="p-6 h-80 flex items-center justify-center bg-stone-50/50">
        <p className="text-stone-400 font-medium italic">Revenue chart visualization would go here</p>
       </Card>
       <Card title="Plan Distribution" className="p-6 h-80 flex items-center justify-center bg-stone-50/50">
        <p className="text-stone-400 font-medium italic">Plan distribution pie chart would go here</p>
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
       <Card key={plan.id} className="p-6 flex flex-col justify-between">
        <div className="space-y-4">
         <div className="flex justify-between items-start">
          <div className="space-y-1">
           <h3 className="text-lg font-medium">{plan.name}</h3>
           <p className="text-xs text-stone-500">{plan.customerType} Plan</p>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider ${
           plan.isActive ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
          }`}>
           {plan.isActive ? 'Active' : 'Inactive'}
          </span>
         </div>
         <div className="pt-2">
          <span className="text-xl sm:text-2xl xl:text-3xl font-medium">${plan.priceMonthly}</span>
          <span className="text-stone-400 text-sm"> / mo</span>
         </div>
         <div className="space-y-2">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">Key Limits</p>
          <div className="flex flex-wrap gap-2">
           <span className="px-2 py-1 bg-stone-50 border border-stone-100 rounded text-xs font-medium">
            Seats: {plan.limits.seats === -1 ? '∞' : plan.limits.seats}
           </span>
           <span className="px-2 py-1 bg-stone-50 border border-stone-100 rounded text-xs font-medium">
            Communities: {plan.limits.communities === -1 ? '∞' : plan.limits.communities}
           </span>
          </div>
         </div>
        </div>
        <div className="pt-6 flex gap-2">
         <Button variant="outline" className="flex-1 text-xs">Edit Plan</Button>
         <Button variant="outline" className="px-3">
          <MoreHorizontal className="w-4 h-4" />
         </Button>
        </div>
       </Card>
      ))}
      <button className="h-full min-h-[200px] border-2 border-dashed border-stone-200 rounded-3xl flex flex-col items-center justify-center gap-3 text-stone-400 hover:border-stone-900 hover:text-stone-900 transition-all group">
       <div className="p-3 bg-stone-50 rounded-2xl group-hover:bg-stone-100 transition-colors">
        <Plus className="w-6 h-6" />
       </div>
       <span className="text-sm font-medium uppercase tracking-widest">Create New Plan</span>
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
          placeholder="Search by customer, email, or ID..." 
          className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 ring-stone-900/5 transition-all"
         />
        </div>
        <Button variant="outline" className="gap-2">
         <Filter className="w-4 h-4" /> Filter
        </Button>
       </div>
       <table className="w-full text-left">
        <thead>
         <tr className="bg-stone-50 border-b border-stone-100">
          <th className="px-4 py-2 text-xs font-medium text-stone-400 uppercase tracking-widest">Customer</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 uppercase tracking-widest">Plan</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 uppercase tracking-widest">Status</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 uppercase tracking-widest text-right">Action</th>
         </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
         {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <tr key={i} className="hover:bg-stone-50 transition-colors">
           <td className="px-4 py-2">
            <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-stone-200 rounded-full" />
             <div>
              <p className="text-sm font-medium">Customer {i}</p>
              <p className="text-xs text-stone-500">customer{i}@example.com</p>
             </div>
            </div>
           </td>
           <td className="px-4 py-2">
            <p className="text-sm font-medium">Organization Standard</p>
            <p className="text-xs text-stone-400 font-medium uppercase tracking-widest">Annual Billing</p>
           </td>
           <td className="px-4 py-2">
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium uppercase tracking-wider">
             Active
            </span>
           </td>
           <td className="px-4 py-2 text-right">
            <button className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
             <MoreHorizontal className="w-4 h-4" />
            </button>
           </td>
          </tr>
         ))}
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
          <th className="px-4 py-2 text-xs font-medium text-stone-400 uppercase tracking-widest">Date</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 uppercase tracking-widest">Invoice #</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 uppercase tracking-widest">Customer</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 uppercase tracking-widest">Amount</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 uppercase tracking-widest">Status</th>
          <th className="px-4 py-2 text-xs font-medium text-stone-400 uppercase tracking-widest text-right">Action</th>
         </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
         {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <tr key={i} className="hover:bg-stone-50 transition-colors">
           <td className="px-4 py-2 text-sm font-medium">Mar {25 - i}, 2026</td>
           <td className="px-4 py-2 text-sm font-mono text-stone-500">INV-2026-00{i}</td>
           <td className="px-4 py-2 text-sm font-medium">Customer {i}</td>
           <td className="px-4 py-2 text-sm font-medium">$190.00</td>
           <td className="px-4 py-2">
            <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider ${
             i % 3 === 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
            }`}>
             {i % 3 === 0 ? 'Open' : 'Paid'}
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
