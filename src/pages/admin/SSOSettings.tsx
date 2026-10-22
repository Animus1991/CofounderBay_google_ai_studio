import { useEffect, useState } from "react";
import { ShieldCheck, Globe, Lock, Save, Plus, Trash2, AlertCircle, CheckCircle2, Info, ArrowRight, ExternalLink, History, Settings2, Key, Server } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, doc, getDoc, onSnapshot, orderBy, query, limit as qLimit, setDoc } from "firebase/firestore";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { User, UserRole } from "../../types";
import { db } from "../../firebase";
import { useTenant } from "../../context/TenantContext";
import { useT } from "../../lib/language";
import { labelOf } from "../../lib/labels";
import { formatDate } from "../../lib/dates";
import { useAuth } from "../../App";

interface SSOSettingsProps {
 user: User;
}

interface SsoConfig {
 enabled: boolean;
 mandatory: boolean;
 providerType: 'SAML' | 'OIDC' | 'OAuth';
 providerName: string;
 buttonLabel: string;
 defaultRole: string;
 domains: string[];
 mappingRules: { claim: string; value: string; role: string }[];
 jitProvisioning: boolean;
 jitDefaultRole: string;
 updatedAt?: string;
}

export default function SSOSettings({ user }: SSOSettingsProps) {
 const t = useT();
 const { tenant } = useTenant();
 const tenantName = tenant?.name || 'CoFounderBay';
 const { isDemoMode } = useAuth();
 const configDocId = `sso-${tenant?.id || 'default'}`;
 const [activeTab, setActiveTab] = useState<'config' | 'mapping' | 'audit'>('config');
 const [ssoEnabled, setSsoEnabled] = useState(false);
 const [ssoMandatory, setSsoMandatory] = useState(false);
 const [providerType, setProviderType] = useState<'SAML' | 'OIDC' | 'OAuth'>('SAML');
 const [providerName, setProviderName] = useState(`${tenantName} SSO`);
 const [buttonLabel, setButtonLabel] = useState(`Sign in with ${tenantName}`);
 const [defaultRole, setDefaultRole] = useState<UserRole>(UserRole.FOUNDER);
 const [domains, setDomains] = useState<string[]>([]);
 const [newDomain, setNewDomain] = useState('');
 const [mappingRules, setMappingRules] = useState<SsoConfig['mappingRules']>([]);
 const [jitProvisioning, setJitProvisioning] = useState(true);
 const [jitDefaultRole, setJitDefaultRole] = useState('Co-Founder Candidate');
 const [auditLogs, setAuditLogs] = useState<any[]>([]);
 const [loaded, setLoaded] = useState(false);
 const [loading, setLoading] = useState(false);
 const [success, setSuccess] = useState(false);

 useEffect(() => {
  // Sample account: config documents deny signed-out reads — keep the defaults.
  if (loaded || isDemoMode) { setLoaded(true); return; }
  getDoc(doc(db, 'systemConfig', configDocId)).then((snap) => {
   if (snap.exists()) {
    const cfg = snap.data() as SsoConfig;
    setSsoEnabled(cfg.enabled ?? false);
    setSsoMandatory(cfg.mandatory ?? false);
    setProviderType(cfg.providerType ?? 'SAML');
    setProviderName(cfg.providerName ?? `${tenantName} SSO`);
    setButtonLabel(cfg.buttonLabel ?? `Sign in with ${tenantName}`);
    setDefaultRole((cfg.defaultRole as UserRole) ?? UserRole.FOUNDER);
    setDomains(cfg.domains ?? []);
    setMappingRules(cfg.mappingRules ?? []);
    setJitProvisioning(cfg.jitProvisioning ?? true);
    setJitDefaultRole(cfg.jitDefaultRole ?? 'Co-Founder Candidate');
   }
   setLoaded(true);
  }).catch(() => setLoaded(true));
 }, [configDocId, loaded, tenantName, isDemoMode]);

 useEffect(() => {
  if (isDemoMode) return;
  const q = query(collection(db, 'ssoAuditLog'), orderBy('createdAt', 'desc'), qLimit(50));
  const unsub = onSnapshot(q, (snap) => {
   setAuditLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, () => {});
  return () => unsub();
 }, [isDemoMode]);

 const handleSave = async () => {
  if (isDemoMode) return;
  setLoading(true);
  try {
   await setDoc(doc(db, 'systemConfig', configDocId), {
    value: {
     enabled: ssoEnabled,
     mandatory: ssoMandatory,
     providerType,
     providerName,
     buttonLabel,
     defaultRole,
     domains,
     mappingRules,
     jitProvisioning,
     jitDefaultRole,
    } satisfies SsoConfig,
    updatedAt: new Date().toISOString(),
    updatedBy: user.id,
   });
   setSuccess(true);
   setTimeout(() => setSuccess(false), 3000);
  } catch (e) {
   console.error('SSO config save failed:', e);
  } finally {
   setLoading(false);
  }
 };

 const addDomain = () => {
  const d = newDomain.trim().toLowerCase();
  if (!d || domains.includes(d)) return;
  setDomains([...domains, d]);
  setNewDomain('');
 };

 return (
  <div className="space-y-6 max-w-6xl mx-auto">
   <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
    <div>
     <div className="flex items-center gap-2.5 mb-1.5">
      <div className="p-1.5 bg-stone-900 text-white rounded-lg">
       <ShieldCheck className="w-5 h-5" />
      </div>
      <h1 className="section-header">{t('SSO & Identity', 'SSO και ταυτότητα')}</h1>
     </div>
     <p className="text-stone-500 text-xs font-medium">{t('Configure enterprise Single Sign-On for your organization.', 'Ρύθμισε το SSO του οργανισμού.')}</p>
     {isDemoMode && <p className="text-xs text-stone-500 mt-1">{t('Sample account — SSO settings apply to real accounts.', 'Δοκιμαστικός λογαριασμός — οι ρυθμίσεις SSO ισχύουν για πραγματικούς λογαριασμούς.')}</p>}
    </div>
    <div className="flex gap-2">
     <Button variant="outline" className="gap-1.5 h-9 px-4 text-xs font-medium" onClick={() => setActiveTab('audit')}>
      <History className="w-3.5 h-3.5" /> {t('View Full Audit', 'Πλήρες αρχείο ελέγχου')}
     </Button>
     <Button onClick={handleSave} loading={loading} className="gap-1.5 h-9 px-5 text-xs font-medium min-w-[130px]">
      {success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
      {success ? t('Saved!', 'Αποθηκεύτηκε') : t('Save Changes', 'Αποθήκευση αλλαγών')}
     </Button>
    </div>
   </div>

   {/* Tabs */}
   <div className="scroll-tabs p-1 bg-stone-100/80 rounded-xl">
    {[
     { id: 'config', label: t('Configuration', 'Διαμόρφωση'), icon: Settings2 },
     { id: 'mapping', label: t('Role Mapping', 'Αντιστοίχιση ρόλων'), icon: Key },
     { id: 'audit', label: t('Auth Logs', 'Καταγραφές εισόδου'), icon: History },
    ].map((tab) => (
     <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id as any)}
      className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
       activeTab === tab.id
        ? "bg-white text-stone-900 shadow-sm"
        : "text-stone-400 hover:text-stone-600"
      }`}
     >
      <tab.icon className="w-3.5 h-3.5" />
      {tab.label}
     </button>
    ))}
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
    <div className="lg:col-span-8 space-y-6">
     <AnimatePresence mode="wait">
      {activeTab === 'config' && (
       <motion.div
        key="config"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-6"
       >
        {/* Global Toggle */}
        <Card className="p-6">
         <div className="flex items-center justify-between gap-8">
          <div className="space-y-0.5">
           <h3 className="text-sm font-medium text-stone-900">{t('Enable Single Sign-On', 'Ενεργοποίηση SSO')}</h3>
           <p className="text-xs text-stone-500">{t("Allow members to sign in using your organization's identity provider.", 'Επίτρεψε στα μέλη να μπαίνουν με τον πάροχο ταυτότητας του οργανισμού.')}</p>
          </div>
          <button
           type="button"
           role="switch"
           aria-checked={ssoEnabled}
           aria-label={t('Enable SSO', 'Ενεργοποίηση SSO')}
           onClick={() => setSsoEnabled(!ssoEnabled)}
           className={`w-11 h-6 rounded-full transition-all relative ${ssoEnabled ? 'bg-stone-900' : 'bg-stone-200'}`}
          >
           <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${ssoEnabled ? 'left-5.5' : 'left-0.5'}`}></div>
          </button>
         </div>

         {ssoEnabled && (
          <div className="mt-6 pt-6 border-t border-stone-100 space-y-5">
           <div className="flex items-center justify-between gap-8">
            <div className="space-y-0.5">
             <div className="flex items-center gap-2">
              <h4 className="text-xs font-medium text-stone-900">{t('Mandatory SSO', 'Υποχρεωτικό SSO')}</h4>
              {ssoMandatory && (
               <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[8px] font-medium tracking-wider">{t('Strict Security', 'Αυστηρή ασφάλεια')}</span>
              )}
             </div>
             <p className="text-xs text-stone-400 font-medium">{t('Require all members with your domain to use SSO. Standard login will be disabled for them.', 'Υποχρέωσε όλα τα μέλη του τομέα σου να χρησιμοποιούν SSO. Η κανονική είσοδος θα απενεργοποιηθεί για αυτά.')}</p>
            </div>
            <button
             type="button"
             role="switch"
             aria-checked={ssoMandatory}
             aria-label={t('Require SSO', 'Υποχρεωτικό SSO')}
             onClick={() => setSsoMandatory(!ssoMandatory)}
             className={`w-10 h-5 rounded-full transition-all relative ${ssoMandatory ? 'bg-stone-900' : 'bg-stone-200'}`}
            >
             <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${ssoMandatory ? 'left-5.5' : 'left-0.5'}`}></div>
            </button>
           </div>

           {ssoMandatory && (
            <motion.div
             initial={{ opacity: 0, height: 0 }}
             animate={{ opacity: 1, height: 'auto' }}
             className="p-3.5 bg-red-50/50 border border-red-100 rounded-xl flex items-start gap-3"
            >
             <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
             <p className="text-xs text-red-700 leading-relaxed">
              <strong>{t('Warning:', 'Προσοχή:')}</strong> {t("Enabling Mandatory SSO will prevent users with your organization's domains from using their email and password to log in. Ensure your SSO provider is correctly configured before enabling this.", 'Το υποχρεωτικό SSO εμποδίζει τα μέλη με τους τομείς του οργανισμού να μπαίνουν με email και κωδικό. Βεβαιώσου ότι ο πάροχος SSO είναι σωστά ρυθμισμένος πριν το ενεργοποιήσεις.')}
             </p>
            </motion.div>
           )}
          </div>
         )}
        </Card>

        {/* Provider Details */}
        {ssoEnabled && (
         <Card title={t('Provider Configuration', 'Διαμόρφωση παρόχου')} className="p-6">
          <div className="space-y-5">
           <div className="p-3.5 bg-stone-50/50 rounded-xl border border-stone-100 flex items-center gap-3 mb-2">
            <Server className="w-4 h-4 text-stone-400" />
            <div className="flex-1">
             <p className="text-micro mb-0.5">{t('Organization Context', 'Πλαίσιο οργανισμού')}</p>
             <p className="text-xs font-medium text-stone-900">{tenantName}</p>
            </div>
            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium tracking-wider">{t('Active Tenant', 'Ενεργός οργανισμός')}</span>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
             <label htmlFor="ssosettings-field-1" className="text-micro">{t('Provider Type', 'Τύπος παρόχου')}</label>
             <select id="ssosettings-field-1"
              value={providerType}
              onChange={(e) => setProviderType(e.target.value as any)}
              className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
             >
              <option value="SAML">SAML 2.0</option>
              <option value="OIDC">OpenID Connect</option>
              <option value="OAuth">OAuth 2.0</option>
             </select>
            </div>
            <div className="space-y-1.5">
             <label htmlFor="ssosettings-field-2" className="text-micro">{t('Provider Name', 'Όνομα παρόχου')}</label>
             <input id="ssosettings-field-2"
              type="text"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder={t('e.g. Okta, Azure AD, Google', 'π.χ. Okta, Azure AD, Google')}
              className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
             />
            </div>
            <div className="space-y-1.5">
             <label htmlFor="ssosettings-field-3" className="text-micro">{t('Login Button Label', 'Ετικέτα κουμπιού εισόδου')}</label>
             <input id="ssosettings-field-3"
              type="text"
              value={buttonLabel}
              onChange={(e) => setButtonLabel(e.target.value)}
              placeholder={t('e.g. Sign in with Okta', 'π.χ. Είσοδος με Okta')}
              className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
             />
            </div>
            <div className="space-y-1.5">
             <label htmlFor="ssosettings-field-4" className="text-micro">{t('Default Provisioning Role', 'Προεπιλεγμένος ρόλος παροχής')}</label>
             <select id="ssosettings-field-4"
              value={defaultRole}
              onChange={(e) => setDefaultRole(e.target.value as UserRole)}
              className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
             >
              <option value={UserRole.FOUNDER}>{labelOf(UserRole.FOUNDER)}</option>
              <option value={UserRole.CO_FOUNDER_CANDIDATE}>{labelOf(UserRole.CO_FOUNDER_CANDIDATE)}</option>
              <option value={UserRole.MENTOR}>{labelOf(UserRole.MENTOR)}</option>
              <option value={UserRole.ADVISOR}>{labelOf(UserRole.ADVISOR)}</option>
              <option value={UserRole.ORGANIZATION_MANAGER}>{labelOf(UserRole.ORGANIZATION_MANAGER)}</option>
              <option value={UserRole.ADMIN}>{labelOf(UserRole.ADMIN)}</option>
             </select>
            </div>
           </div>

           <AnimatePresence mode="wait">
            <motion.div
             key={providerType}
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -10 }}
             className="space-y-5"
            >
             {/* OIDC & OAuth Specific Fields */}
             {(providerType === 'OIDC' || providerType === 'OAuth') && (
              <>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                 <label htmlFor="ssosettings-field-5" className="text-micro">{t('Client ID', 'Client ID')}</label>
                 <input id="ssosettings-field-5"
                  type="text"
                  placeholder="your-client-id"
                  className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
                 />
                </div>
                <div className="space-y-1.5">
                 <label className="text-micro">{t('Client Secret', 'Client Secret')}</label>
                 <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-300" />
                  <input
                   aria-label={t('Client Secret', 'Client Secret')} type="password"
                   placeholder="••••••••••••••••"
                   className="w-full pl-9 pr-4 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
                  />
                 </div>
                </div>
               </div>
               <div className="space-y-1.5">
                <label htmlFor="ssosettings-field-6" className="text-micro">{t('Issuer URL', 'Issuer URL')}</label>
                <input id="ssosettings-field-6"
                 type="text"
                 placeholder="https://accounts.google.com"
                 className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
                />
               </div>
               <div className="space-y-1.5">
                <label className="text-micro">{t('Authorization URL', 'Authorization URL')}</label>
                <div className="relative">
                 <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-300" />
                 <input
                  aria-label={t('Authorization endpoint URL', 'URL endpoint εξουσιοδότησης')} type="url"
                  placeholder="https://your-idp.com/oauth/authorize"
                  className="w-full pl-9 pr-4 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
                 />
                </div>
               </div>
              </>
             )}

             {/* SAML Specific Fields */}
             {providerType === 'SAML' && (
              <>
               <div className="space-y-1.5">
                <label htmlFor="ssosettings-field-7" className="text-micro">{t('Issuer URL', 'Issuer URL')}</label>
                <input id="ssosettings-field-7"
                 type="text"
                 placeholder="urn:example:idp"
                 className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
                />
               </div>

               <div className="space-y-1.5">
                <label htmlFor="sso-endpoint-url" className="text-micro">{t('SSO Endpoint URL', 'SSO Endpoint URL')}</label>
                <div className="relative">
                 <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-300" />
                 <input
                  id="sso-endpoint-url" type="url"
                  placeholder="https://your-idp.com/sso/saml"
                  className="w-full pl-9 pr-4 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
                 />
                </div>
               </div>

               <div className="space-y-1.5">
                <label htmlFor="ssosettings-field-8" className="text-micro">{t('Metadata URL', 'Metadata URL')}</label>
                <input id="ssosettings-field-8"
                 type="url"
                 placeholder="https://your-idp.com/saml/metadata"
                 className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
                />
               </div>

               <div className="space-y-1.5">
                <label htmlFor="ssosettings-field-9" className="text-micro">{t('Certificate', 'Πιστοποιητικό')}</label>
                <textarea id="ssosettings-field-9"
                 rows={4}
                 placeholder="-----BEGIN CERTIFICATE-----"
                 className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all font-mono text-xs"
                ></textarea>
               </div>
              </>
             )}
            </motion.div>
           </AnimatePresence>
          </div>
         </Card>
        )}

        {/* Domain Restrictions */}
        {ssoEnabled && (
         <Card title={t('Domain Discovery', 'Ανακάλυψη τομέων')} className="p-6">
          <div className="space-y-4">
           <p className="text-xs text-stone-500 font-medium">
            {t('Users with these email domains will be automatically routed to your SSO provider.', 'Τα μέλη με αυτούς τους τομείς email θα οδηγούνται αυτόματα στον πάροχο SSO.')}
           </p>
           <div className="flex flex-wrap gap-2">
            {domains.map(domain => (
             <div key={domain} className="flex items-center gap-2 px-2.5 py-1 bg-stone-900 text-white rounded-lg text-xs font-medium">
              {domain}
              <button type="button" aria-label={t('Remove domain', 'Αφαίρεση τομέα')} onClick={() => setDomains(domains.filter((d) => d !== domain))} className="hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
             </div>
            ))}
            <div className="flex items-center gap-1.5">
             <input aria-label={t('Add allowed email domain', 'Προσθήκη επιτρεπόμενου τομέα email')}
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDomain()}
              placeholder="org.edu"
              className="h-7 px-2.5 bg-stone-50/50 border border-stone-200 rounded-lg text-xs font-medium outline-none focus:border-stone-400 w-32"
             />
             <Button variant="outline" size="sm" className="h-7 py-0 px-3 border-dashed text-xs font-medium tracking-wide" onClick={addDomain}>
              <Plus className="w-3 h-3 mr-1" /> {t('Add Domain', 'Προσθήκη τομέα')}
             </Button>
            </div>
            {domains.length === 0 && (
             <p className="w-full text-xs text-stone-400 font-medium">{t('No domains yet — add the email domains that should route to your IdP.', 'Κανένας τομέας ακόμη — πρόσθεσε τους τομείς email που θα οδηγούνται στον IdP.')}</p>
            )}
           </div>
          </div>
         </Card>
        )}
       </motion.div>
      )}

      {activeTab === 'mapping' && (
       <motion.div
        key="mapping"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-6"
       >
        <Card title={t('Role Mapping Rules', 'Κανόνες αντιστοίχισης ρόλων')} subtitle={t('Map IdP claims to CoFounderBay roles', 'Αντιστοίχισε claims του IdP σε ρόλους CoFounderBay')} className="p-6">
         <div className="space-y-5">
          <div className="overflow-hidden border border-stone-100 rounded-xl">
           <table className="w-full text-left border-collapse">
            <thead>
             <tr className="bg-stone-50/50 border-b border-stone-100">
              <th className="px-5 py-3 text-micro">{t('IdP Claim', 'IdP Claim')}</th>
              <th className="px-5 py-3 text-micro">{t('Claim Value', 'Τιμή claim')}</th>
              <th className="px-5 py-3 text-micro">{t('Platform Role', 'Ρόλος πλατφόρμας')}</th>
              <th className="px-5 py-3 text-micro text-right">{t('Actions', 'Ενέργειες')}</th>
             </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
             {mappingRules.map((rule, i) => (
              <tr key={i} className="hover:bg-stone-50/30 transition-colors">
               <td className="px-5 py-3 text-xs font-mono text-stone-500">{rule.claim}</td>
               <td className="px-5 py-3 text-xs font-medium text-stone-900">{rule.value}</td>
               <td className="px-5 py-3">
                <span className="px-1.5 py-0.5 bg-stone-100 text-stone-900 rounded text-xs font-medium tracking-wider">{labelOf(rule.role)}</span>
               </td>
               <td className="px-5 py-3 text-right">
                <button type="button" aria-label={t('Remove rule', 'Αφαίρεση κανόνα')} onClick={() => setMappingRules(mappingRules.filter((_, j) => j !== i))} className="text-stone-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
               </td>
              </tr>
             ))}
             {mappingRules.length === 0 && (
              <tr>
               <td colSpan={4} className="px-5 py-8 text-center text-stone-400 italic font-medium text-xs">
                {t('No mapping rules yet.', 'Κανένας κανόνας αντιστοίχισης ακόμη.')}
               </td>
              </tr>
             )}
            </tbody>
           </table>
          </div>
          <Button
           variant="outline"
           className="w-full border-dashed gap-2 h-9 text-xs font-medium"
           onClick={() => setMappingRules([...mappingRules, { claim: 'groups', value: '', role: 'Founder' }])}
          >
           <Plus className="w-3.5 h-3.5" /> {t('Add Mapping Rule', 'Προσθήκη κανόνα αντιστοίχισης')}
          </Button>
         </div>
        </Card>

        <Card title={t('Auto-Provisioning', 'Αυτόματη παροχή λογαριασμών')} className="p-6">
         <div className="space-y-5">
          <div className="flex items-center justify-between gap-8">
           <div className="space-y-0.5">
            <h4 className="text-xs font-medium text-stone-900">{t('Just-In-Time (JIT) Provisioning', 'Just-In-Time (JIT) παροχή')}</h4>
            <p className="text-xs text-stone-400 font-medium">{t('Automatically create accounts for new users when they sign in through SSO.', 'Δημιούργησε αυτόματα λογαριασμούς για νέα μέλη όταν μπαίνουν μέσω SSO.')}</p>
           </div>
           <button
            type="button"
            role="switch"
            aria-checked={jitProvisioning}
            aria-label={t('Just-In-Time (JIT) Provisioning', 'Just-In-Time (JIT) παροχή')}
            onClick={() => setJitProvisioning(!jitProvisioning)}
            className={`w-10 h-5 rounded-full relative transition-all ${jitProvisioning ? 'bg-stone-900' : 'bg-stone-200'}`}
           >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${jitProvisioning ? 'right-0.5' : 'left-0.5'}`}></div>
           </button>
          </div>
          <div className="pt-5 border-t border-stone-100">
           <div className="space-y-1.5">
            <label htmlFor="ssosettings-field-10" className="text-micro">{t('Default Role for New Users', 'Προεπιλεγμένος ρόλος για νέα μέλη')}</label>
            <select id="ssosettings-field-10"
             value={jitDefaultRole}
             onChange={(e) => setJitDefaultRole(e.target.value)}
             className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
            >
             <option value="Co-Founder Candidate">{labelOf('Co-Founder Candidate')}</option>
             <option value="Founder">{labelOf('Founder')}</option>
             <option value="Mentor">{labelOf('Mentor')}</option>
            </select>
           </div>
          </div>
         </div>
        </Card>
       </motion.div>
      )}

      {activeTab === 'audit' && (
       <motion.div
        key="audit"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-4"
       >
        <Card noPadding className="border-stone-100 shadow-sm">
         <div className="divide-y divide-stone-100">
          {auditLogs.map((log) => (
           <div key={log.id} className="p-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors">
            <div className="flex items-center gap-3.5">
             <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              log.status === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
             }`}>
              {log.status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
             </div>
             <div>
              <div className="flex items-center gap-2">
               <span className="text-xs font-medium text-stone-900">{log.user}</span>
               <span className="text-xs font-medium text-stone-400 tracking-wide">{log.event}</span>
              </div>
              <p className="text-xs text-stone-500 font-medium">
               {t('via', 'μέσω')} {log.provider} • {log.createdAt ? formatDate(log.createdAt) : ''}
               {log.reason && <span className="text-red-500 ml-2">• {log.reason}</span>}
              </p>
             </div>
            </div>
            <Button variant="ghost" size="icon" title={t('Event details', 'Λεπτομέρειες συμβάντος')} className="h-7 w-7 text-stone-400 hover:text-stone-900" onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Explain SSO event ${log.event} for ${log.user}` } }))}>
             <Info className="w-3.5 h-3.5" />
            </Button>
           </div>
          ))}
          {auditLogs.length === 0 && (
           <div className="p-10 text-center">
            <History className="w-6 h-6 text-stone-300 mx-auto mb-2" />
            <p className="text-xs text-stone-400 italic font-medium">
             {t('No SSO events recorded yet. Logins through your identity provider will appear here.', 'Δεν έχουν καταγραφεί συμβάντα SSO ακόμη. Οι είσοδοι μέσω του παρόχου θα εμφανίζονται εδώ.')}
            </p>
           </div>
          )}
         </div>
        </Card>
       </motion.div>
      )}
     </AnimatePresence>
    </div>

    {/* Sidebar Info */}
    <div className="lg:col-span-4 space-y-6">
     <Card title={t('Quick Setup Guide', 'Γρήγορος οδηγός ρύθμισης')} className="p-5 bg-stone-900 text-white border-none rounded-3xl">
      <div className="space-y-5">
       <div className="space-y-3">
        <div className="flex gap-3">
         <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium shrink-0">1</div>
         <p className="text-xs text-stone-400 leading-relaxed">{t('Register CoFounderBay in your IdP (Okta, Azure, etc.)', 'Καταχώρισε το CoFounderBay στο IdP (Okta, Azure κ.λπ.)')}</p>
        </div>
        <div className="flex gap-3">
         <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium shrink-0">2</div>
         <p className="text-xs text-stone-400 leading-relaxed">{t('Copy the SAML/OIDC endpoints and certificate to the configuration tab.', 'Αντίγραψε τα SAML/OIDC endpoints και το πιστοποιητικό στην καρτέλα διαμόρφωσης.')}</p>
        </div>
        <div className="flex gap-3">
         <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium shrink-0">3</div>
         <p className="text-xs text-stone-400 leading-relaxed">{t("Map your organization's groups to platform roles.", 'Αντιστοίχισε τις ομάδες του οργανισμού σε ρόλους πλατφόρμας.')}</p>
        </div>
       </div>
       <Button
        variant="secondary"
        className="w-full gap-2 h-9 text-xs font-medium shadow-lg shadow-black/20"
        onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: 'Walk me through setting up SSO for my organization' } }))}
       >
        <ExternalLink className="w-3.5 h-3.5" /> {t('Setup guidance', 'Καθοδήγηση ρύθμισης')}
       </Button>
      </div>
     </Card>

     <Card title={t('Service Provider Info', 'Στοιχεία παρόχου υπηρεσίας')} className="p-5">
      <div className="space-y-4">
       <div className="space-y-1.5">
        <label className="text-micro">{t('Assertion Consumer Service (ACS)', 'Υπηρεσία λήψης δήλωσης (ACS)')}</label>
        <div className="flex items-center gap-2 p-2 bg-stone-50/50 rounded-lg border border-stone-100">
         <code className="text-xs text-stone-500 truncate flex-1">https://cofounderbay.com/api/auth/sso/callback</code>
         <button type="button" title={t('Copy', 'Αντιγραφή')} onClick={() => navigator.clipboard?.writeText('https://cofounderbay.com/api/auth/sso/callback').catch(() => {})} className="text-stone-400 hover:text-stone-900 transition-colors"><Save className="w-3 h-3" /></button>
        </div>
       </div>
       <div className="space-y-1.5">
        <label className="text-micro">{t('Entity ID', 'Αναγνωριστικό οντότητας')}</label>
        <div className="flex items-center gap-2 p-2 bg-stone-50/50 rounded-lg border border-stone-100">
         <code className="text-xs text-stone-500 truncate flex-1">https://cofounderbay.com/auth/sp</code>
         <button type="button" title={t('Copy', 'Αντιγραφή')} onClick={() => navigator.clipboard?.writeText('https://cofounderbay.com/auth/sp').catch(() => {})} className="text-stone-400 hover:text-stone-900 transition-colors"><Save className="w-3 h-3" /></button>
        </div>
       </div>
      </div>
     </Card>

     <Card title={t('Test Connection', 'Δοκιμή σύνδεσης')} className="p-5">
      <div className="space-y-4">
       <p className="text-xs text-stone-500 leading-relaxed font-medium">
        {t('Safely test your SSO configuration before enabling it for all members.', 'Δοκίμασε με ασφάλεια τη διαμόρφωση SSO πριν την ενεργοποιήσεις για όλα τα μέλη.')}
       </p>
       <Button
        variant="outline"
        className="w-full gap-2 h-9 text-xs font-medium"
        disabled={!ssoEnabled}
        title={ssoEnabled ? t('Saves the configuration, then opens a test sign-in window.', 'Αποθηκεύει τη διαμόρφωση και ανοίγει δοκιμαστική είσοδο.') : t('Enable SSO above first.', 'Ενεργοποίησε πρώτα το SSO παραπάνω.')}
        onClick={async () => { await handleSave(); window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt: `Test the ${providerName} SSO connection for ${tenantName}` } })); }}
       >
        <ArrowRight className="w-3.5 h-3.5" /> {t('Run Test Login', 'Δοκιμαστική είσοδος')}
       </Button>
      </div>
     </Card>
    </div>
   </div>
  </div>
 );
}
