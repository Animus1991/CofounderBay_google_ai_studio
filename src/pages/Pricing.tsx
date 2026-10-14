import { useState } from "react";
import { Check, X, ArrowRight, Shield, Zap, Building2, Globe, Sparkles, ZapIcon } from "lucide-react";
import { motion } from "motion/react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { MOCK_PLANS } from "../services/billingService";

export default function Pricing() {
 const [billingCycle, setBillingCycle] = useState<'Monthly' | 'Annual'>('Annual');

 const plans = MOCK_PLANS;

 const features = [
  { key: 'communityModules', label: 'Community & Hubs' },
  { key: 'advancedFilters', label: 'Advanced Matching Filters' },
  { key: 'mentorModules', label: 'Mentor Discovery' },
  { key: 'privateCommunities', label: 'Private Communities' },
  { key: 'advancedAnalytics', label: 'Advanced Analytics' },
  { key: 'sso', label: 'Single Sign-On (SSO)' },
  { key: 'whiteLabeling', label: 'White-Labeling' },
  { key: 'programManagement', label: 'Program Management' },
  { key: 'advancedExports', label: 'Advanced Data Exports' },
 ];

 return (
  <div className="py-20 px-4 max-w-7xl mx-auto space-y-20">
   {/* Header */}
   <div className="text-center space-y-6 max-w-3xl mx-auto">
    <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-medium tracking-wide"
    >
     <Sparkles className="w-3 h-3" /> Pricing Plans
    </motion.div>
    <h1 className="text-lg font-medium tracking-tight text-stone-900">
     Scale your ecosystem with confidence.
    </h1>
    <p className="text-sm sm:text-base lg:text-lg text-stone-500">
     Choose the plan that fits your stage, from individual founders to global institutions.
    </p>

    {/* Billing Toggle */}
    <div className="flex items-center justify-center gap-4 pt-8">
     <span className={`text-sm font-medium ${billingCycle === 'Monthly' ? 'text-stone-900' : 'text-stone-400'}`}>Monthly</span>
     <button
      onClick={() => setBillingCycle(billingCycle === 'Monthly' ? 'Annual' : 'Monthly')}
      className="w-14 h-8 bg-stone-200 rounded-full p-1 relative transition-colors hover:bg-stone-300"
     >
      <motion.div
       animate={{ x: billingCycle === 'Annual' ? 24 : 0 }}
       className="w-6 h-6 bg-white rounded-full shadow-sm"
      />
     </button>
     <div className="flex items-center gap-2">
      <span className={`text-sm font-medium ${billingCycle === 'Annual' ? 'text-stone-900' : 'text-stone-400'}`}>Annual</span>
      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium tracking-wider rounded">Save 20%</span>
     </div>
    </div>
   </div>

   {/* Pricing Grid */}
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
    {plans.filter(p => p.customerType !== 'Enterprise').map((plan, idx) => (
     <motion.div
      key={plan.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.1 }}
     >
      <Card className={`h-full flex flex-col p-8 relative overflow-hidden ${plan.id === 'organization-standard' ? 'border-2 border-stone-900 ring-4 ring-stone-900/5' : ''}`}>
       {plan.id === 'organization-standard' && (
        <div className="absolute top-0 right-0 bg-stone-900 text-white px-4 py-1 text-xs font-medium tracking-wide rounded-bl-xl">
         Most Popular
        </div>
       )}

       <div className="space-y-4 mb-8">
        <h3 className="text-lg font-medium">{plan.name}</h3>
        <p className="text-sm text-stone-500 h-10">{plan.description}</p>
        <div className="pt-4">
         <span className="text-lg font-semibold">
          ${billingCycle === 'Monthly' ? (plan.priceMonthly || plan.price) : Math.floor((plan.priceAnnual || (plan.price * 12)) / 12)}
         </span>
         <span className="text-stone-400 text-xs font-medium"> / month</span>
        </div>
        {billingCycle === 'Annual' && (plan.priceAnnual || (plan.price * 12)) > 0 && (
         <p className="text-xs text-stone-400 font-medium">Billed annually (${plan.priceAnnual || (plan.price * 12)})</p>
        )}
       </div>

       <div className="flex-1 space-y-4 mb-8">
        <p className="text-xs font-medium text-stone-400 tracking-wide">What's included</p>
        <ul className="space-y-3">
         <li className="flex items-start gap-3 text-sm">
          <Check className="w-4 h-4 text-green-500 mt-0.5" />
          <span>{(plan.limits?.seats === -1 || !plan.limits?.seats) ? 'Unlimited' : plan.limits.seats} {plan.customerType === 'Individual' ? 'User' : 'Seats'}</span>
         </li>
         {features.map(f => (
          <li key={f.key} className={`flex items-start gap-3 text-sm ${plan.features.includes(f.key) ? 'text-stone-900' : 'text-stone-300'}`}>
           {plan.features.includes(f.key) ? (
            <Check className="w-4 h-4 text-green-500 mt-0.5" />
           ) : (
            <X className="w-4 h-4 mt-0.5" />
           )}
           <span>{f.label}</span>
          </li>
         ))}
        </ul>
       </div>

       <Button 
        variant={plan.id === 'organization-standard' ? 'primary' : 'outline'} 
        className="w-full group"
       >
        Get Started <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
       </Button>
      </Card>
     </motion.div>
    ))}

    {/* Enterprise Card */}
    <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ delay: 0.4 }}
    >
     <Card className="h-full flex flex-col p-8 bg-stone-900 text-white border-none">
      <div className="space-y-4 mb-8">
       <h3 className="text-lg font-medium">Enterprise</h3>
       <p className="text-sm text-stone-400 h-10">Custom solutions for global institutions and large-scale ecosystems.</p>
       <div className="pt-4">
        <span className="text-lg font-semibold">Custom</span>
       </div>
      </div>

      <div className="flex-1 space-y-4 mb-8">
       <p className="text-xs font-medium text-stone-500 tracking-wide">Everything in Multi-Seat, plus</p>
       <ul className="space-y-3">
        {[
         'Unlimited Seats & Communities',
         'Dedicated Success Manager',
         'Custom Security Review',
         'SLA & Priority Support',
         'Custom Integration Support',
         'Institutional Procurement'
        ].map(f => (
         <li key={f} className="flex items-start gap-3 text-sm">
          <Check className="w-4 h-4 text-stone-400 mt-0.5" />
          <span>{f}</span>
         </li>
        ))}
       </ul>
      </div>

      <Button variant="outline" className="w-full border-stone-700 text-white hover:bg-stone-800">
       Contact Sales
      </Button>
     </Card>
    </motion.div>
   </div>

   {/* Feature Comparison Table (Simplified for brevity) */}
   <div className="pt-20 space-y-12">
    <div className="text-center space-y-4">
     <h2 className="text-xl font-medium">Compare all features</h2>
     <p className="text-sm text-stone-500">A detailed breakdown of what each plan offers.</p>
    </div>

    <div className="overflow-x-auto">
     <table className="w-full text-left border-collapse">
      <thead>
       <tr className="border-b border-stone-200">
        <th className="py-6 px-4 text-sm font-medium text-stone-400 tracking-wide">Feature</th>
        {plans.map(p => (
         <th key={p.id} className="py-6 px-4 text-sm font-medium text-center">{p.name}</th>
        ))}
       </tr>
      </thead>
      <tbody>
       {features.map(f => (
        <tr key={f.key} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
         <td className="py-4 px-4 text-sm font-medium text-stone-600">{f.label}</td>
         {plans.map(p => (
          <td key={p.id} className="py-4 px-4 text-center">
           {p.features.includes(f.key) ? (
            <Check className="w-5 h-5 text-green-500 mx-auto" />
           ) : (
            <X className="w-5 h-5 text-stone-200 mx-auto" />
           )}
          </td>
         ))}
        </tr>
       ))}
       <tr className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
        <td className="py-4 px-4 text-sm font-medium text-stone-600">Included Seats</td>
        {plans.map(p => (
         <td key={p.id} className="py-4 px-4 text-center text-sm font-medium">
          {(p.limits?.seats === -1 || !p.limits?.seats) ? 'Unlimited' : p.limits.seats}
         </td>
        ))}
       </tr>
      </tbody>
     </table>
    </div>
   </div>

   {/* FAQ / Trust Section */}
   <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-20 border-t border-stone-200">
    <div className="space-y-4">
     <div className="p-3 bg-stone-100 rounded-2xl w-fit">
      <Shield className="w-6 h-6 text-stone-900" />
     </div>
     <h3 className="text-lg font-medium">Enterprise Security</h3>
     <p className="text-stone-500 text-xs sm:text-sm md:text-base leading-relaxed">
      We employ bank-grade encryption and follow strict data privacy protocols to ensure your organization's data is always protected.
     </p>
    </div>
    <div className="space-y-4">
     <div className="p-3 bg-stone-100 rounded-2xl w-fit">
      <Globe className="w-6 h-6 text-stone-900" />
     </div>
     <h3 className="text-lg font-medium">Global Compliance</h3>
     <p className="text-stone-500 text-xs sm:text-sm md:text-base leading-relaxed">
      Fully GDPR and CCPA compliant. We support data residency requirements for our institutional partners.
     </p>
    </div>
    <div className="space-y-4">
     <div className="p-3 bg-stone-100 rounded-2xl w-fit">
      <ZapIcon className="w-6 h-6 text-stone-900" />
     </div>
     <h3 className="text-lg font-medium">Instant Provisioning</h3>
     <p className="text-stone-500 text-xs sm:text-sm md:text-base leading-relaxed">
      Get your community up and running in minutes. Our automated onboarding ensures a seamless experience for your members.
     </p>
    </div>
   </div>
  </div>
 );
}
