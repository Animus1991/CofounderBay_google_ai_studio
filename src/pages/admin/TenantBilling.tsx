import { useState, useEffect } from "react";

import { Users, CreditCard, History, Zap, Shield, AlertCircle, CheckCircle2, ArrowRight, ExternalLink, Download, Plus, UserPlus, Settings2, LayoutGrid } from "lucide-react";

import { motion, AnimatePresence } from "motion/react";

import Button from "../../components/ui/Button";

import Card from "../../components/ui/Card";

import { Tenant, Subscription, Invoice, BillingPlan, User } from "../../types";

import { billingService, MOCK_PLANS } from "../../services/billingService";



interface TenantBillingProps {

 tenant: Tenant;

}



export default function TenantBilling({ tenant }: TenantBillingProps) {

 const [subscription, setSubscription] = useState<Subscription | null>(null);

 const [invoices, setInvoices] = useState<Invoice[]>([]);

 const [loading, setLoading] = useState(true);

 const [activeTab, setActiveTab] = useState<'overview' | 'seats' | 'history'>('overview');



 useEffect(() => {

  async function loadBillingData() {

   try {

    const [sub, invs] = await Promise.all([

     billingService.getSubscription(tenant.id, 'tenant'),

     billingService.getInvoices(tenant.id, 'tenant')

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

 }, [tenant.id]);



 const currentPlan = MOCK_PLANS.find(p => p.id === subscription?.planId);



 if (loading) {

  return (

   <div className="flex items-center justify-center h-64">

    <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin" />

   </div>

  );

 }



 return (

  <div className="space-y-8 max-w-6xl mx-auto">

   <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">

    <div>

     <h2 className="text-xl font-medium tracking-tight">Organization Billing</h2>

     <p className="text-stone-500">Manage subscriptions, seat allocations, and billing for {tenant.name}.</p>

    </div>

    <div className="flex gap-3">

     <Button variant="outline" className="gap-2">

      <Settings2 className="w-4 h-4" /> Billing Settings

     </Button>

     <Button className="gap-2">

      <Plus className="w-4 h-4" /> Add Seats

     </Button>

    </div>

   </div>



   {/* Tabs */}

   <div className="scroll-tabs p-1 bg-stone-100 rounded-2xl">

    {[

     { id: 'overview', label: 'Overview', icon: LayoutGrid },

     { id: 'seats', label: 'Seat Management', icon: Users },

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

    {activeTab === 'overview' && (

     <motion.div

      key="overview"

      initial={{ opacity: 0, y: 10 }}

      animate={{ opacity: 1, y: 0 }}

      exit={{ opacity: 0, y: -10 }}

      className="space-y-8"

     >

      {/* Plan Summary Card */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

       <Card className="lg:col-span-2 p-8 border-2 border-stone-900 relative overflow-hidden">

        <div className="absolute top-0 right-0 p-4">

         <div className="px-3 py-1 bg-stone-900 text-white text-xs font-medium tracking-wide rounded-full">

          {currentPlan?.name}

         </div>

        </div>

        

        <div className="space-y-6">

         <div className="space-y-1">

          <h3 className="text-lg font-medium">Active Subscription</h3>

          <p className="text-stone-500">Your organization is currently on the {currentPlan?.name} plan.</p>

         </div>



         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">

           <p className="text-xs font-medium text-stone-400 tracking-wide mb-1">Monthly Cost</p>

           <p className="text-lg font-semibold">${subscription?.billingCycle === 'Annual' ? (currentPlan?.priceAnnual ?? 0) / 12 : currentPlan?.priceMonthly}</p>

          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">

           <p className="text-xs font-medium text-stone-400 tracking-wide mb-1">Renewal Date</p>

           <p className="text-lg font-semibold">{new Date(subscription?.renewalDate ?? '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>

          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">

           <p className="text-xs font-medium text-stone-400 tracking-wide mb-1">Billing Cycle</p>

           <p className="text-lg font-semibold">{subscription?.billingCycle}</p>

          </div>

         </div>



         <div className="flex gap-4 pt-4">

          <Button className="gap-2">

           Upgrade Subscription <ArrowRight className="w-4 h-4" />

          </Button>

          <Button variant="outline">Manage Payment Method</Button>

         </div>

        </div>

       </Card>



       <Card className="p-8 flex flex-col justify-between">

        <div className="space-y-4">

         <h3 className="text-lg font-medium">Seat Usage</h3>

         <div className="space-y-2">

          <div className="flex justify-between text-sm font-medium">

           <span>Occupied Seats</span>

           <span>{subscription?.activeSeatCount} / {subscription?.seatLimit}</span>

          </div>

          <div className="h-3 bg-stone-100 rounded-full overflow-hidden">

           <div 

            className="h-full bg-stone-900 transition-all duration-200" 

            style={{ width: `${((subscription?.activeSeatCount ?? 0) / (subscription?.seatLimit ?? 1)) * 100}%` }} 

           />

          </div>

         </div>

         <p className="text-xs text-stone-500 leading-relaxed">

          You are using {subscription?.activeSeatCount} out of your {subscription?.seatLimit} available seats. You can add more seats at any time for ${currentPlan?.priceMonthly ? Math.floor(currentPlan.priceMonthly / (currentPlan.limits?.seats || 1)) : 10} per seat/month.

         </p>

        </div>

        <Button variant="outline" className="w-full mt-6 gap-2">

         <UserPlus className="w-4 h-4" /> Manage Seats

        </Button>

       </Card>

      </div>



      {/* Feature Gating Overview */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

       <Card title="Core Features" className="p-6">

        <ul className="space-y-3">

         {['communityModules', 'mentorModules', 'cohortModules', 'programManagement'].map(f => (

          <li key={f} className="flex items-center gap-3 text-sm">

           {currentPlan?.features[f as keyof typeof currentPlan.features] ? (

            <CheckCircle2 className="w-4 h-4 text-green-500" />

           ) : (

            <AlertCircle className="w-4 h-4 text-stone-200" />

           )}

           <span className={currentPlan?.features[f as keyof typeof currentPlan.features] ? 'text-stone-900' : 'text-stone-400'}>

            {f.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}

           </span>

          </li>

         ))}

        </ul>

       </Card>

       <Card title="Advanced Tools" className="p-6">

        <ul className="space-y-3">

         {['advancedAnalytics', 'advancedFilters', 'advancedExports', 'privateCommunities'].map(f => (

          <li key={f} className="flex items-center gap-3 text-sm">

           {currentPlan?.features[f as keyof typeof currentPlan.features] ? (

            <CheckCircle2 className="w-4 h-4 text-green-500" />

           ) : (

            <AlertCircle className="w-4 h-4 text-stone-200" />

           )}

           <span className={currentPlan?.features[f as keyof typeof currentPlan.features] ? 'text-stone-900' : 'text-stone-400'}>

            {f.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}

           </span>

          </li>

         ))}

        </ul>

       </Card>

       <Card title="Enterprise Features" className="p-6">

        <ul className="space-y-3">

         {['sso', 'whiteLabeling'].map(f => (

          <li key={f} className="flex items-center gap-3 text-sm">

           {currentPlan?.features[f as keyof typeof currentPlan.features] ? (

            <CheckCircle2 className="w-4 h-4 text-green-500" />

           ) : (

            <AlertCircle className="w-4 h-4 text-stone-200" />

           )}

           <span className={currentPlan?.features[f as keyof typeof currentPlan.features] ? 'text-stone-900' : 'text-stone-400'}>

            {f.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}

           </span>

          </li>

         ))}

        </ul>

       </Card>

      </div>

     </motion.div>

    )}



    {activeTab === 'seats' && (

     <motion.div

      key="seats"

      initial={{ opacity: 0, y: 10 }}

      animate={{ opacity: 1, y: 0 }}

      exit={{ opacity: 0, y: -10 }}

      className="space-y-6"

     >

      <Card className="overflow-hidden">

       <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">

        <div className="space-y-1">

         <h3 className="text-lg font-medium">Active Seat Allocations</h3>

         <p className="text-sm text-stone-500">Manage which users are currently assigned to your organization's seats.</p>

        </div>

        <div className="flex gap-2">

         <div className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-sm font-medium">

          {subscription?.activeSeatCount} / {subscription?.seatLimit} Seats Used

         </div>

        </div>

       </div>

       <table className="w-full text-left">

        <thead>

         <tr className="bg-stone-50 border-b border-stone-100">

          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide">User</th>

          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide">Role</th>

          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide">Assigned At</th>

          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide text-right">Action</th>

         </tr>

        </thead>

        <tbody className="divide-y divide-stone-100">

         {[1, 2, 3, 4, 5].map((i) => (

          <tr key={i} className="hover:bg-stone-50 transition-colors">

           <td className="px-4 py-2">

            <div className="flex items-center gap-3">

             <div className="w-8 h-8 bg-stone-200 rounded-full" />

             <div>

              <p className="text-sm font-medium">User {i}</p>

              <p className="text-xs text-stone-500">user{i}@example.com</p>

             </div>

            </div>

           </td>

           <td className="px-4 py-2">

            <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded text-xs font-medium tracking-wider">

             Founder

            </span>

           </td>

           <td className="px-4 py-2 text-sm text-stone-500">Jan {i}, 2024</td>

           <td className="px-4 py-2 text-right">

            <button className="text-xs font-medium text-red-500 hover:text-red-600 tracking-wide">

             Revoke Seat

            </button>

           </td>

          </tr>

         ))}

        </tbody>

       </table>

       <div className="p-6 bg-stone-50 border-t border-stone-100 text-center">

        <Button variant="outline" className="gap-2">

         <Plus className="w-4 h-4" /> Assign New User

        </Button>

       </div>

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

          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide">Date</th>

          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide">Invoice #</th>

          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide">Amount</th>

          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide">Status</th>

          <th className="px-4 py-2 text-xs font-medium text-stone-400 tracking-wide text-right">Action</th>

         </tr>

        </thead>

        <tbody className="divide-y divide-stone-100">

         {invoices.map((invoice) => (

          <tr key={invoice.id} className="hover:bg-stone-50 transition-colors">

           <td className="px-4 py-2 text-sm font-medium">{new Date(invoice.createdAt ?? 0).toLocaleDateString()}</td>

           <td className="px-4 py-2 text-sm font-mono text-stone-500">{invoice.number}</td>

           <td className="px-4 py-2 text-sm font-medium">${invoice.total}</td>

           <td className="px-4 py-2">

            <span className={`px-2 py-1 rounded text-xs font-medium tracking-wider ${

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

