import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, ArrowRight, Shield, Globe, Sparkles, ZapIcon } from "lucide-react";
import { motion } from "motion/react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { MOCK_PLANS, hasPlanFeature } from "../services/billingService";
import { useT } from "../lib/language";

export default function Pricing() {
 const t = useT();
 const navigate = useNavigate();
 const [billingCycle, setBillingCycle] = useState<'Monthly' | 'Annual'>('Annual');

 const plans = MOCK_PLANS;

 const features = [
  { key: 'communityModules', label: t('Community & Hubs', 'Κοινότητα και κόμβοι') },
  { key: 'advancedFilters', label: t('Advanced Matching Filters', 'Σύνθετα φίλτρα αντιστοίχισης') },
  { key: 'mentorModules', label: t('Mentor Discovery', 'Εύρεση μεντόρων') },
  { key: 'privateCommunities', label: t('Private Communities', 'Ιδιωτικές κοινότητες') },
  { key: 'advancedAnalytics', label: t('Advanced Analytics', 'Σύνθετα αναλυτικά') },
  { key: 'sso', label: t('Single Sign-On (SSO)', 'Ενιαία σύνδεση (SSO)') },
  { key: 'whiteLabeling', label: t('White-Labeling', 'Προσαρμοσμένο branding') },
  { key: 'programManagement', label: t('Program Management', 'Διαχείριση προγραμμάτων') },
  { key: 'advancedExports', label: t('Advanced Data Exports', 'Σύνθετες εξαγωγές δεδομένων') },
 ];
 const planName = (id: string, name: string) => ({
  'free-individual': t('Individual Free', 'Δωρεάν ατομικό'),
  'premium-individual': t('Individual Premium', 'Premium ατομικό'),
  'organization-standard': t('Organization', 'Οργανισμός'),
  'tenant-multi-seat': t('Multi-Seat Tenant', 'Οργανισμός πολλών θέσεων'),
  'enterprise-custom': t('Enterprise', 'Enterprise'),
 }[id] ?? name);
 const planDescription = (id: string, description: string) => ({
  'free-individual': t('Essential tools for finding your next co-founder.', 'Βασικά εργαλεία για να βρεις συνιδρυτή.'),
  'premium-individual': t('Advanced matching and exclusive community access.', 'Σύνθετη αντιστοίχιση και αποκλειστική πρόσβαση σε κοινότητες.'),
  'organization-standard': t('Perfect for small incubators and accelerators.', 'Ιδανικό για μικρές θερμοκοιτίδες και επιταχυντές.'),
  'tenant-multi-seat': t('Scale your ecosystem with advanced management tools.', 'Κλιμάκωσε το οικοσύστημα με σύνθετα εργαλεία διαχείρισης.'),
  'enterprise-custom': t('Custom solutions for large-scale institutions.', 'Προσαρμοσμένες λύσεις για οργανισμούς μεγάλης κλίμακας.'),
 }[id] ?? description);

 return (
  <div className="w-full min-w-0 py-10 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto space-y-10 sm:space-y-20">
   {/* Header */}
   <div className="text-center space-y-6 max-w-3xl mx-auto">
    <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-medium tracking-wide"
    >
     <Sparkles className="w-3 h-3" /> {t('Pricing Plans', 'Πακέτα τιμών')}
    </motion.div>
    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-stone-900">
     {t('Scale your ecosystem with confidence.', 'Κλιμάκωσε το οικοσύστημά σου με σιγουριά.')}
    </h1>
    <p className="text-sm sm:text-base text-stone-500 break-words">
     {t('Choose the plan that fits your stage, from individual founders to global institutions.', 'Διάλεξε το πακέτο που ταιριάζει στο στάδιό σου, από μεμονωμένους ιδρυτές έως παγκόσμιους οργανισμούς.')}
    </p>

    {/* Billing Toggle */}
    <div className="flex items-center justify-center gap-4 pt-8">
     <span className={`text-sm font-medium ${billingCycle === 'Monthly' ? 'text-stone-900' : 'text-stone-400'}`}>{t('Monthly', 'Μηνιαία')}</span>
     <button
      type="button"
      role="switch"
      aria-checked={billingCycle === 'Annual'}
      aria-label={t('Annual billing', 'Ετήσια χρέωση')}
      onClick={() => setBillingCycle(billingCycle === 'Monthly' ? 'Annual' : 'Monthly')}
      className="w-14 h-8 bg-stone-200 rounded-full p-1 relative transition-colors hover:bg-stone-300"
     >
      <motion.div
       animate={{ x: billingCycle === 'Annual' ? 24 : 0 }}
       className="w-6 h-6 bg-white rounded-full shadow-sm"
      />
     </button>
     <div className="flex items-center gap-2">
      <span className={`text-sm font-medium ${billingCycle === 'Annual' ? 'text-stone-900' : 'text-stone-400'}`}>{t('Annual', 'Ετήσια')}</span>
      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium tracking-wider rounded">{t('Save 20%', 'Εξοικονόμηση 20%')}</span>
     </div>
    </div>
   </div>

   {/* Pricing Grid */}
   <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-6">
    {plans.filter(p => p.customerType !== 'Enterprise').map((plan, idx) => (
     <motion.div
      key={plan.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.1 }}
     >
      <Card className={`h-full p-4 sm:p-6 relative overflow-hidden ${plan.id === 'organization-standard' ? 'border-2 border-stone-900 ring-4 ring-stone-900/5' : ''}`} contentClassName="flex flex-col">
       {plan.id === 'organization-standard' && (
        <div className="absolute top-0 right-0 bg-stone-900 text-white px-4 py-1 text-xs font-medium tracking-wide rounded-bl-xl">
         {t('Most Popular', 'Το πιο δημοφιλές')}
        </div>
       )}

       <div className="space-y-3 mb-5">
        <h3 className="text-base font-semibold">{planName(plan.id, plan.name)}</h3>
        <p className="text-sm text-stone-500 sm:min-h-10">{planDescription(plan.id, plan.description ?? '')}</p>
        <div className="flex flex-wrap items-baseline gap-x-1 pt-2">
         <span className="text-lg font-semibold">
          ${billingCycle === 'Monthly' ? (plan.priceMonthly || plan.price) : Math.floor((plan.priceAnnual || (plan.price * 12)) / 12)}
         </span>
         <span className="text-stone-400 text-xs font-medium">{t(' / month', ' / μήνα')}</span>
        </div>
        {billingCycle === 'Annual' && (plan.priceAnnual || (plan.price * 12)) > 0 && (
         <p className="text-xs text-stone-400 font-medium">{t('Billed annually', 'Ετήσια χρέωση')} (${plan.priceAnnual || (plan.price * 12)})</p>
        )}
       </div>

       <div className="flex-1 space-y-3 mb-5">
        <p className="text-xs font-medium text-stone-400 tracking-wide">{t("What's included", 'Τι περιλαμβάνεται')}</p>
        <ul className="space-y-3">
         <li className="flex items-start gap-3 text-sm">
          <Check className="w-4 h-4 text-green-500 mt-0.5" />
          <span>{(plan.limits?.seats === -1 || !plan.limits?.seats) ? t('Unlimited', 'Απεριόριστες') : plan.limits.seats} {plan.customerType === 'Individual' ? t('User', 'χρήστης') : t('Seats', 'θέσεις')}</span>
         </li>
         {features.map(f => {
          const included = hasPlanFeature(plan.features, f.key);
          return (
           <li key={f.key} className={`flex items-start gap-3 text-sm ${included ? 'text-stone-900' : 'text-stone-500'}`}>
            {included ? (
             <Check className="w-4 h-4 text-green-500 mt-0.5" />
            ) : (
             <X className="w-4 h-4 mt-0.5" />
            )}
            <span>{f.label}</span>
           </li>
          );
         })}
        </ul>
       </div>

       <Button 
        variant={plan.id === 'organization-standard' ? 'primary' : 'outline'} 
        className="w-full group"
        onClick={() => navigate('/signup?plan=' + plan.id)}
       >
        {t('Get Started', 'Ξεκίνα')} <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
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
     <Card className="h-full p-4 sm:p-6 bg-stone-50 text-stone-900 border-stone-200" contentClassName="flex flex-col">
      <div className="space-y-3 mb-5">
       <h3 className="text-base font-semibold">{t('Enterprise', 'Enterprise')}</h3>
       <p className="text-sm text-stone-600 sm:min-h-10">{t('Custom solutions for global institutions and large-scale ecosystems.', 'Προσαρμοσμένες λύσεις για παγκόσμιους οργανισμούς και οικοσυστήματα μεγάλης κλίμακας.')}</p>
       <div className="pt-2">
        <span className="text-lg font-semibold">{t('Custom', 'Προσαρμοσμένο')}</span>
       </div>
      </div>

      <div className="flex-1 space-y-3 mb-5">
       <p className="text-xs font-medium text-stone-500 tracking-wide">{t('Everything in Multi-Seat, plus', 'Όλα του Multi-Seat, συν')}</p>
       <ul className="space-y-3">
        {[
         t('Unlimited Seats & Communities', 'Απεριόριστες θέσεις και κοινότητες'),
         t('Dedicated Success Manager', 'Αποκλειστικός υπεύθυνος επιτυχίας'),
         t('Custom Security Review', 'Προσαρμοσμένος έλεγχος ασφαλείας'),
         t('SLA & Priority Support', 'SLA και υποστήριξη προτεραιότητας'),
         t('Custom Integration Support', 'Υποστήριξη προσαρμοσμένων ενσωματώσεων'),
         t('Institutional Procurement', 'Θεσμικές προμήθειες')
        ].map(f => (
         <li key={f} className="flex items-start gap-3 text-sm">
          <Check className="w-4 h-4 shrink-0 text-stone-500 mt-0.5" />
          <span>{f}</span>
         </li>
        ))}
       </ul>
      </div>

      <Button
       variant="outline"
       className="w-full"
       onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'I want to learn about the Enterprise plan' } }))}
      >
       {t('Contact Sales', 'Επικοινωνία με πωλήσεις')}
      </Button>
     </Card>
    </motion.div>
   </div>

   {/* Feature Comparison Table (Simplified for brevity) */}
   <div className="pt-20 space-y-12">
    <div className="text-center space-y-4">
     <h2 className="text-base font-semibold">{t('Compare all features', 'Σύγκριση όλων των δυνατοτήτων')}</h2>
     <p className="text-sm text-stone-500">{t('Compare every plan. On smaller screens, swipe or scroll the table horizontally to see more plans.', 'Σύγκρινε όλα τα πακέτα. Σε μικρότερες οθόνες, σύρε ή κύλησε τον πίνακα οριζόντια για να δεις περισσότερα πακέτα.')}</p>
    </div>

    <div role="region" aria-label={t('Feature comparison — scroll horizontally for more plans', 'Σύγκριση δυνατοτήτων — οριζόντια κύλιση για περισσότερα πακέτα')} tabIndex={0} className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-stone-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500">
     <table className="w-full min-w-[56rem] text-left border-collapse">
      <thead>
       <tr className="border-b border-stone-200">
        <th scope="col" className="sticky left-0 z-20 w-48 bg-stone-50 py-6 px-4 text-sm font-medium text-stone-600 tracking-wide">{t('Feature', 'Δυνατότητα')}</th>
        {plans.map(p => (
         <th scope="col" key={p.id} className="py-6 px-4 text-sm font-medium text-center">{planName(p.id, p.name)}</th>
        ))}
       </tr>
      </thead>
      <tbody>
       {features.map(f => (
        <tr key={f.key} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
         <th scope="row" className="sticky left-0 z-10 bg-stone-50 py-4 px-4 text-sm font-medium text-stone-600">{f.label}</th>
         {plans.map(p => {
          const included = hasPlanFeature(p.features, f.key);
          return (
           <td key={p.id} aria-label={included ? t('Included', 'Περιλαμβάνεται') : t('Not included', 'Δεν περιλαμβάνεται')} className="py-4 px-4 text-center">
            {included ? (
             <Check aria-hidden="true" className="w-5 h-5 text-green-500 mx-auto" />
            ) : (
             <X aria-hidden="true" className="w-5 h-5 text-stone-500 mx-auto" />
            )}
           </td>
          );
         })}
        </tr>
       ))}
       <tr className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
        <th scope="row" className="sticky left-0 z-10 bg-stone-50 py-4 px-4 text-sm font-medium text-stone-600">{t('Included Seats', 'Θέσεις που περιλαμβάνονται')}</th>
        {plans.map(p => (
         <td key={p.id} className="py-4 px-4 text-center text-sm font-medium">
          {(p.limits?.seats === -1 || !p.limits?.seats) ? t('Unlimited', 'Απεριόριστες') : p.limits.seats}
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
     <h3 className="text-base font-semibold">{t('Enterprise Security', 'Ασφάλεια enterprise')}</h3>
     <p className="text-stone-500 text-xs sm:text-sm md:text-base leading-relaxed">
      {t("We employ bank-grade encryption and follow strict data privacy protocols to ensure your organization's data is always protected.", "Χρησιμοποιούμε κρυπτογράφηση τραπεζικού επιπέδου και αυστηρά πρωτόκολλα ιδιωτικότητας ώστε τα δεδομένα του οργανισμού σου να είναι πάντα προστατευμένα.")}
     </p>
    </div>
    <div className="space-y-4">
     <div className="p-3 bg-stone-100 rounded-2xl w-fit">
      <Globe className="w-6 h-6 text-stone-900" />
     </div>
     <h3 className="text-base font-semibold">{t('Global Compliance', 'Παγκόσμια συμμόρφωση')}</h3>
     <p className="text-stone-500 text-xs sm:text-sm md:text-base leading-relaxed">
      {t('Fully GDPR and CCPA compliant. We support data residency requirements for our institutional partners.', 'Πλήρης συμμόρφωση με GDPR και CCPA. Υποστηρίζουμε απαιτήσεις διαμονής δεδομένων για θεσμικούς συνεργάτες.')}
     </p>
    </div>
    <div className="space-y-4">
     <div className="p-3 bg-stone-100 rounded-2xl w-fit">
      <ZapIcon className="w-6 h-6 text-stone-900" />
     </div>
     <h3 className="text-base font-semibold">{t('Instant Provisioning', 'Άμεση ενεργοποίηση')}</h3>
     <p className="text-stone-500 text-xs sm:text-sm md:text-base leading-relaxed">
      {t('Get your community up and running in minutes. Our automated onboarding ensures a seamless experience for your members.', 'Η κοινότητά σου είναι έτοιμη σε λίγα λεπτά. Η αυτοματοποιημένη ένταξη δίνει ομαλή εμπειρία στα μέλη σου.')}
     </p>
    </div>
   </div>
  </div>
 );
}
