import { useState, useEffect } from "react";
import { Globe, ShieldCheck, AlertCircle, CheckCircle2, ExternalLink, Plus, Trash2, RefreshCw, Copy, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { TenantDomain, DomainVerification } from "../../types";
import { useT } from "../../lib/language";
import { labelOf } from "../../lib/labels";

export default function DomainSettings() {
 const t = useT();
 const [domains, setDomains] = useState<TenantDomain[]>([]);
 const [loading, setLoading] = useState(true);
 const [showAddModal, setShowAddModal] = useState(false);
 const [newDomain, setNewDomain] = useState("");
 const [domainType, setDomainType] = useState<'Subdomain' | 'Custom'>('Custom');

 useEffect(() => {
  // Mock fetch domains
  const fetchDomains = async () => {
   setLoading(true);
   // Simulate API call
   setTimeout(() => {
    setDomains([
     {
      id: "dom_1",
      tenantId: "techstars",
      domainType: "Subdomain",
      domain: "techstars.cofounderbay.com",
      domainName: "techstars.cofounderbay.com",
      isCustom: false,
      isPrimary: true,
      status: "Verified",
      sslStatus: "Active",
      verificationStatus: "Verified",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
     },
     {
      id: "dom_2",
      tenantId: "techstars",
      domainType: "Custom",
      domain: "founders.techstars.com",
      domainName: "founders.techstars.com",
      isCustom: true,
      isPrimary: false,
      status: "Pending",
      sslStatus: "Pending",
      verificationStatus: "Pending",
      verificationToken: "cfb-verification=xyz123abc789",
      dnsInstructions: "Add a TXT record to your DNS settings with the value provided.",
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
     }
    ]);
    setLoading(false);
   }, 800);
  };
  fetchDomains();
 }, []);

 const handleAddDomain = () => {
  if (!newDomain) return;
  const domain: TenantDomain = {
   id: `dom_${Math.random().toString(36).substr(2, 9)}`,
   tenantId: "techstars",
   domain: domainType === 'Subdomain' ? `${newDomain}.cofounderbay.com` : newDomain,
   domainName: domainType === 'Subdomain' ? `${newDomain}.cofounderbay.com` : newDomain,
   isCustom: domainType === 'Custom',
   domainType,
   isPrimary: false,
   status: "Pending",
   sslStatus: "Pending",
   verificationStatus: "Pending",
   verificationToken: domainType === 'Custom' ? `cfb-verification=${Math.random().toString(36).substr(2, 12)}` : undefined,
   isActive: false,
   createdAt: new Date().toISOString(),
   updatedAt: new Date().toISOString(),
  };
  setDomains([...domains, domain]);
  setNewDomain("");
  setShowAddModal(false);
 };

 const handleVerify = (id: string) => {
  setDomains(domains.map(d => d.id === id ? { ...d, verificationStatus: 'Verified', sslStatus: 'Active', isActive: true } : d));
 };

 const handleDelete = (id: string) => {
  setDomains(domains.filter(d => d.id !== id));
 };

 const handleSetPrimary = (id: string) => {
  setDomains(domains.map(d => ({ ...d, isPrimary: d.id === id })));
 };

 return (
  <div className="space-y-6 max-w-5xl mx-auto">
   <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
    <div>
     <h2 className="section-header">{t('Domain Management', 'Τομείς')}</h2>
     <p className="text-sm text-stone-500 mt-1">{t('Configure how users access your ecosystem via subdomains or custom domains.', 'Ρύθμισε πώς τα μέλη μπαίνουν στο οικοσύστημα μέσω υποτομέων ή προσαρμοσμένων τομέων.')}</p>
    </div>
    <Button onClick={() => setShowAddModal(true)} className="gap-2 h-10 px-5 text-xs font-medium">
     <Plus className="w-3.5 h-3.5" /> {t('Add Domain', 'Προσθήκη τομέα')}
    </Button>
   </div>

   {loading ? (
    <div className="flex items-center justify-center h-64">
     <RefreshCw className="w-6 h-6 text-stone-300 animate-spin" />
    </div>
   ) : (
    <div className="space-y-4">
     {domains.map((domain) => (
      <Card key={domain.id} className={`p-5 transition-all border ${domain.isPrimary ? 'border-stone-900 ring-4 ring-stone-900/5' : 'border-stone-100'}`}>
       <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-4">
         <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
           <div className={`p-2 rounded-lg ${domain.isPrimary ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500'}`}>
            <Globe className="w-4 h-4" />
           </div>
           <div>
            <h3 className="text-base font-medium flex items-center gap-2">
             {domain.domainName}
             {domain.isPrimary && (
              <span className="px-2 py-0.5 bg-stone-900 text-white text-xs font-medium tracking-wide rounded-full">{t('Primary', 'Κύριος')}</span>
             )}
            </h3>
            <p className="text-xs text-stone-400 font-medium tracking-wide">{domain.domainType === 'Subdomain' ? t('Subdomain domain', 'Υποτομέας') : t('Custom domain', 'Προσαρμοσμένος τομέας')}</p>
           </div>
          </div>
          <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
            <span className="text-micro">{t('SSL', 'SSL')}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium tracking-wider ${
             domain.sslStatus === 'Active' ? 'text-green-700' : 'text-amber-700'
            }`}>
             {labelOf(domain.sslStatus)}
            </span>
           </div>
           <div className="flex items-center gap-2">
            <span className="text-micro">{t('Status', 'Κατάσταση')}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium tracking-wider ${
             domain.verificationStatus === 'Verified' ? 'text-green-700' : 'text-stone-500'
            }`}>
             {labelOf(domain.verificationStatus)}
            </span>
           </div>
          </div>
         </div>

         {domain.verificationStatus === 'Pending' && domain.domainType === 'Custom' && (
          <div className="p-4 bg-stone-50/50 rounded-xl border border-stone-100 space-y-4">
           <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
             <p className="text-xs font-medium text-stone-900">{t('Verification Required', 'Απαιτείται επαλήθευση')}</p>
             <p className="text-xs text-stone-500 leading-relaxed">
              {t('To activate this custom domain, you must verify ownership by adding a TXT record to your DNS provider.', 'Για να ενεργοποιηθεί αυτός ο προσαρμοσμένος τομέας, επαλήθευσε την ιδιοκτησία με εγγραφή TXT στον πάροχο DNS.')}
             </p>
            </div>
           </div>
           <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-stone-200">
            <code className="flex-1 text-xs font-mono text-stone-900 break-all">{domain.verificationToken}</code>
            <button className="p-1.5 hover:bg-stone-100 rounded-md transition-colors text-stone-400 hover:text-stone-900">
             <Copy className="w-3.5 h-3.5" />
            </button>
           </div>
           <div className="flex gap-2">
            <Button onClick={() => handleVerify(domain.id)} variant="primary" size="sm" className="text-xs h-8 font-medium tracking-wider">{t('Check DNS Records', 'Έλεγχος εγγραφών DNS')}</Button>
            <Button variant="outline" size="sm" className="text-xs h-8 font-medium tracking-wider">{t('View DNS Instructions', 'Οδηγίες DNS')}</Button>
           </div>
          </div>
         )}

         <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" size="sm" className="text-xs h-8 font-medium tracking-wider gap-1.5" onClick={() => window.open(`https://${domain.domainName}?tenant_preview=techstars`, '_blank')}>
           <ExternalLink className="w-3 h-3" /> {t('Preview Routing', 'Προεπισκόπηση δρομολόγησης')}
          </Button>
          {!domain.isPrimary && domain.verificationStatus === 'Verified' && (
           <Button variant="outline" size="sm" className="text-xs h-8 font-medium tracking-wider" onClick={() => handleSetPrimary(domain.id)}>{t('Set as Primary', 'Ορισμός ως κύριου')}</Button>
          )}
          {!domain.isPrimary && (
           <Button variant="outline" size="sm" className="text-xs h-8 font-medium tracking-wider text-red-500 hover:text-red-600 border-red-50 hover:border-red-100" onClick={() => handleDelete(domain.id)}>
            <Trash2 className="w-3 h-3 mr-1" /> {t('Remove', 'Αφαίρεση')}
           </Button>
          )}
         </div>
        </div>
       </div>
      </Card>
     ))}
    </div>
   )}

   {/* Add Domain Modal */}
   <AnimatePresence>
    {showAddModal && (
     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/20 backdrop-blur-[2px]">
      <motion.div
       initial={{ opacity: 0, scale: 0.98 }}
       animate={{ opacity: 1, scale: 1 }}
       exit={{ opacity: 0, scale: 0.98 }}
       className="bg-white rounded-2xl shadow-sm w-full max-w-md overflow-hidden border border-stone-100"
      >
       <div className="p-6 space-y-5">
        <div className="space-y-1">
         <h3 className="text-lg font-medium tracking-tight">{t('Add New Domain', 'Προσθήκη τομέα')}</h3>
         <p className="text-stone-500 text-xs">{t('Choose between a platform subdomain or your own custom domain.', 'Διάλεξε υποτομέα πλατφόρμας ή δικό σου προσαρμοσμένο τομέα.')}</p>
        </div>

        <div className="flex p-1 bg-stone-100/80 rounded-lg">
         <button
          onClick={() => setDomainType('Subdomain')}
          className={`flex-1 min-h-11 py-2 text-sm font-medium rounded-md transition-all ${domainType === 'Subdomain' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
         >
          {t('Subdomain', 'Υποτομέας')}
         </button>
         <button
          onClick={() => setDomainType('Custom')}
          className={`flex-1 min-h-11 py-2 text-sm font-medium rounded-md transition-all ${domainType === 'Custom' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
         >
          {t('Custom Domain', 'Προσαρμοσμένος τομέας')}
         </button>
        </div>

        <div className="space-y-4">
         <div className="space-y-1.5">
          <label className="text-micro">{t('Domain Name', 'Όνομα τομέα')}</label>
          <div className="relative">
           <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder={domainType === 'Subdomain' ? "your-org" : "founders.yourdomain.com"}
            className="w-full pl-3 pr-12 py-2.5 bg-stone-50/50 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all"
           />
           {domainType === 'Subdomain' && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-stone-400">.cofounderbay.com</span>
           )}
          </div>
         </div>

         {domainType === 'Custom' && (
          <div className="p-3 bg-stone-50/50 rounded-lg border border-stone-100 flex gap-3">
           <ShieldCheck className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
           <p className="text-xs text-stone-500 leading-relaxed font-medium">
            {t('Custom domains require DNS verification. You will be provided with a TXT record after adding the domain.', 'Οι προσαρμοσμένοι τομείς χρειάζονται επαλήθευση DNS. Μετά την προσθήκη θα λάβεις μια εγγραφή TXT.')}
           </p>
          </div>
         )}
        </div>

        <div className="flex gap-2 pt-2">
         <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1 h-10 text-xs font-medium">{t('Cancel', 'Ακύρωση')}</Button>
         <Button onClick={handleAddDomain} className="flex-1 h-10 text-xs font-medium">{t('Add Domain', 'Προσθήκη τομέα')}</Button>
        </div>
       </div>
      </motion.div>
     </div>
    )}
   </AnimatePresence>
  </div>
 );
}
