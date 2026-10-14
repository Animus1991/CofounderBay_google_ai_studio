import { useState } from "react";
import { ShieldCheck, Globe, Lock, Save, Plus, Trash2, AlertCircle, CheckCircle2, Info, ArrowRight, ExternalLink, History, Settings2, Key, Server } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { User, IdentityProvider, TenantSSOConfig, UserRole } from "../../types";

interface SSOSettingsProps {
 user: User;
}

export default function SSOSettings({ user }: SSOSettingsProps) {
 const [activeTab, setActiveTab] = useState<'config' | 'mapping' | 'audit'>('config');
 const [ssoEnabled, setSsoEnabled] = useState(true);
 const [ssoMandatory, setSsoMandatory] = useState(false);
 const [providerType, setProviderType] = useState<'SAML' | 'OIDC' | 'OAuth'>('SAML');
 const [providerName, setProviderName] = useState('Techstars SSO');
 const [buttonLabel, setButtonLabel] = useState('Sign in with Techstars');
 const [defaultRole, setDefaultRole] = useState<UserRole>(UserRole.FOUNDER);
 const [loading, setLoading] = useState(false);
 const [success, setSuccess] = useState(false);

 const handleSave = async () => {
  setLoading(true);
  // Mock save
  setTimeout(() => {
   setLoading(false);
   setSuccess(true);
   setTimeout(() => setSuccess(false), 3000);
  }, 1500);
 };

 const auditLogs = [
  { id: 1, event: "LoginSuccess", user: "alex@stanford.edu", provider: "Stanford SAML", time: "2 mins ago", status: "success" },
  { id: 2, event: "LoginFailure", user: "unknown@stanford.edu", provider: "Stanford SAML", time: "15 mins ago", status: "failure", reason: "Invalid claim mapping" },
  { id: 3, event: "Provisioned", user: "sarah@stanford.edu", provider: "Stanford SAML", time: "1h ago", status: "success" },
  { id: 4, event: "SSOInitiated", user: "mike@stanford.edu", provider: "Stanford SAML", time: "2h ago", status: "success" },
 ];

 return (
  <div className="space-y-6 max-w-6xl mx-auto">
   <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
    <div>
     <div className="flex items-center gap-2.5 mb-1.5">
      <div className="p-1.5 bg-stone-900 text-white rounded-lg">
       <ShieldCheck className="w-5 h-5" />
      </div>
      <h2 className="section-header">SSO & Identity</h2>
     </div>
     <p className="text-stone-500 text-xs font-medium">Configure enterprise Single Sign-On for your organization.</p>
    </div>
    <div className="flex gap-2">
     <Button variant="outline" className="gap-1.5 h-9 px-4 text-xs font-medium">
      <History className="w-3.5 h-3.5" /> View Full Audit
     </Button>
     <Button onClick={handleSave} loading={loading} className="gap-1.5 h-9 px-5 text-xs font-medium min-w-[130px]">
      {success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
      {success ? 'Saved!' : 'Save Changes'}
     </Button>
    </div>
   </div>

   {/* Tabs */}
   <div className="scroll-tabs p-1 bg-stone-100/80 rounded-xl">
    {[
     { id: 'config', label: 'Configuration', icon: Settings2 },
     { id: 'mapping', label: 'Role Mapping', icon: Key },
     { id: 'audit', label: 'Auth Logs', icon: History },
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
           <h3 className="text-sm font-medium text-stone-900">Enable Single Sign-On</h3>
           <p className="text-xs text-stone-500">Allow members to sign in using your organization's identity provider.</p>
          </div>
          <button 
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
              <h4 className="text-xs font-medium text-stone-900">Mandatory SSO</h4>
              {ssoMandatory && (
               <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[8px] font-medium tracking-wider">Strict Security</span>
              )}
             </div>
             <p className="text-xs text-stone-400 font-medium">Require all members with your domain to use SSO. Standard login will be disabled for them.</p>
            </div>
            <button 
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
              <strong>Warning:</strong> Enabling Mandatory SSO will prevent users with your organization's domains from using their email and password to log in. Ensure your SSO provider is correctly configured before enabling this.
             </p>
            </motion.div>
           )}
          </div>
         )}
        </Card>

        {/* Provider Details */}
        {ssoEnabled && (
         <Card title="Provider Configuration" className="p-6">
          <div className="space-y-5">
           <div className="p-3.5 bg-stone-50/50 rounded-xl border border-stone-100 flex items-center gap-3 mb-2">
            <Server className="w-4 h-4 text-stone-400" />
            <div className="flex-1">
             <p className="text-micro mb-0.5">Organization Context</p>
             <p className="text-xs font-medium text-stone-900">Techstars Ecosystem</p>
            </div>
            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium tracking-wider">Active Tenant</span>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
             <label className="text-micro">Provider Type</label>
             <select 
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
             <label className="text-micro">Provider Name</label>
             <input 
              type="text" 
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder="e.g. Okta, Azure AD, Google"
              className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
             />
            </div>
            <div className="space-y-1.5">
             <label className="text-micro">Login Button Label</label>
             <input 
              type="text" 
              value={buttonLabel}
              onChange={(e) => setButtonLabel(e.target.value)}
              placeholder="e.g. Sign in with Okta"
              className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
             />
            </div>
            <div className="space-y-1.5">
             <label className="text-micro">Default Provisioning Role</label>
             <select 
              value={defaultRole}
              onChange={(e) => setDefaultRole(e.target.value as UserRole)}
              className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
             >
              <option value={UserRole.FOUNDER}>Founder</option>
              <option value={UserRole.CO_FOUNDER_CANDIDATE}>Co-Founder Candidate</option>
              <option value={UserRole.MENTOR}>Mentor</option>
              <option value={UserRole.ADVISOR}>Advisor</option>
              <option value={UserRole.ORGANIZATION_MANAGER}>Organization Manager</option>
              <option value={UserRole.ADMIN}>Admin</option>
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
                 <label className="text-micro">Client ID</label>
                 <input 
                  type="text" 
                  placeholder="your-client-id"
                  className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
                 />
                </div>
                <div className="space-y-1.5">
                 <label className="text-micro">Client Secret</label>
                 <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-300" />
                  <input 
                   type="password" 
                   placeholder="••••••••••••••••"
                   className="w-full pl-9 pr-4 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
                  />
                 </div>
                </div>
               </div>
               <div className="space-y-1.5">
                <label className="text-micro">Issuer URL</label>
                <input 
                 type="text" 
                 placeholder="https://accounts.google.com"
                 className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
                />
               </div>
               <div className="space-y-1.5">
                <label className="text-micro">Authorization URL</label>
                <div className="relative">
                 <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-300" />
                 <input 
                  type="url" 
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
                <label className="text-micro">Issuer URL</label>
                <input 
                 type="text" 
                 placeholder="urn:example:idp"
                 className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
                />
               </div>

               <div className="space-y-1.5">
                <label className="text-micro">SSO Endpoint URL</label>
                <div className="relative">
                 <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-300" />
                 <input 
                  type="url" 
                  placeholder="https://your-idp.com/sso/saml"
                  className="w-full pl-9 pr-4 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
                 />
                </div>
               </div>

               <div className="space-y-1.5">
                <label className="text-micro">Metadata URL</label>
                <input 
                 type="url" 
                 placeholder="https://your-idp.com/saml/metadata"
                 className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium"
                />
               </div>

               <div className="space-y-1.5">
                <label className="text-micro">Certificate</label>
                <textarea 
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
         <Card title="Domain Discovery" className="p-6">
          <div className="space-y-4">
           <p className="text-xs text-stone-500 font-medium">
            Users with these email domains will be automatically routed to your SSO provider.
           </p>
           <div className="flex flex-wrap gap-2">
            {['stanford.edu', 'alumni.stanford.edu'].map(domain => (
             <div key={domain} className="flex items-center gap-2 px-2.5 py-1 bg-stone-900 text-white rounded-lg text-xs font-medium">
              {domain}
              <button className="hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
             </div>
            ))}
            <Button variant="outline" size="sm" className="h-7 py-0 px-3 border-dashed text-xs font-medium tracking-wide">
             <Plus className="w-3 h-3 mr-1" /> Add Domain
            </Button>
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
        <Card title="Role Mapping Rules" subtitle="Map IdP claims to CoFounderBay roles" className="p-6">
         <div className="space-y-5">
          <div className="overflow-hidden border border-stone-100 rounded-xl">
           <table className="w-full text-left border-collapse">
            <thead>
             <tr className="bg-stone-50/50 border-b border-stone-100">
              <th className="px-5 py-3 text-micro">IdP Claim</th>
              <th className="px-5 py-3 text-micro">Claim Value</th>
              <th className="px-5 py-3 text-micro">Platform Role</th>
              <th className="px-5 py-3 text-micro text-right">Actions</th>
             </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
             {[
              { claim: "groups", value: "faculty", role: "Mentor" },
              { claim: "groups", value: "student", role: "Founder" },
              { claim: "groups", value: "founders", role: "Founder" },
             ].map((rule, i) => (
              <tr key={i} className="hover:bg-stone-50/30 transition-colors">
               <td className="px-5 py-3 text-xs font-mono text-stone-500">{rule.claim}</td>
               <td className="px-5 py-3 text-xs font-medium text-stone-900">{rule.value}</td>
               <td className="px-5 py-3">
                <span className="px-1.5 py-0.5 bg-stone-100 text-stone-900 rounded text-xs font-medium tracking-wider">{rule.role}</span>
               </td>
               <td className="px-5 py-3 text-right">
                <button className="text-stone-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
               </td>
              </tr>
             ))}
            </tbody>
           </table>
          </div>
          <Button variant="outline" className="w-full border-dashed gap-2 h-9 text-xs font-medium">
           <Plus className="w-3.5 h-3.5" /> Add Mapping Rule
          </Button>
         </div>
        </Card>

        <Card title="Auto-Provisioning" className="p-6">
         <div className="space-y-5">
          <div className="flex items-center justify-between gap-8">
           <div className="space-y-0.5">
            <h4 className="text-xs font-medium text-stone-900">Just-In-Time (JIT) Provisioning</h4>
            <p className="text-xs text-stone-400 font-medium">Automatically create accounts for new users when they sign in through SSO.</p>
           </div>
           <button className="w-10 h-5 bg-stone-900 rounded-full relative">
            <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full"></div>
           </button>
          </div>
          <div className="pt-5 border-t border-stone-100">
           <div className="space-y-1.5">
            <label className="text-micro">Default Role for New Users</label>
            <select className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-lg outline-none focus:ring-2 ring-stone-900/5 focus:border-stone-400 transition-all text-xs font-medium">
             <option>Co-Founder Candidate</option>
             <option>Founder</option>
             <option>Mentor</option>
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
               via {log.provider} • {log.time}
               {log.reason && <span className="text-red-500 ml-2">• {log.reason}</span>}
              </p>
             </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-stone-400 hover:text-stone-900">
             <Info className="w-3.5 h-3.5" />
            </Button>
           </div>
          ))}
         </div>
        </Card>
       </motion.div>
      )}
     </AnimatePresence>
    </div>

    {/* Sidebar Info */}
    <div className="lg:col-span-4 space-y-6">
     <Card title="Quick Setup Guide" className="p-5 bg-stone-900 text-white border-none rounded-3xl">
      <div className="space-y-5">
       <div className="space-y-3">
        <div className="flex gap-3">
         <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium shrink-0">1</div>
         <p className="text-xs text-stone-400 leading-relaxed">Register CoFounderBay in your IdP (Okta, Azure, etc.)</p>
        </div>
        <div className="flex gap-3">
         <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium shrink-0">2</div>
         <p className="text-xs text-stone-400 leading-relaxed">Copy the SAML/OIDC endpoints and certificate to the configuration tab.</p>
        </div>
        <div className="flex gap-3">
         <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium shrink-0">3</div>
         <p className="text-xs text-stone-400 leading-relaxed">Map your organization's groups to platform roles.</p>
        </div>
       </div>
       <Button variant="secondary" className="w-full gap-2 h-9 text-xs font-medium shadow-lg shadow-black/20">
        <ExternalLink className="w-3.5 h-3.5" /> Documentation
       </Button>
      </div>
     </Card>

     <Card title="Service Provider Info" className="p-5">
      <div className="space-y-4">
       <div className="space-y-1.5">
        <label className="text-micro">Assertion Consumer Service (ACS)</label>
        <div className="flex items-center gap-2 p-2 bg-stone-50/50 rounded-lg border border-stone-100">
         <code className="text-xs text-stone-500 truncate flex-1">https://cofounderbay.com/api/auth/sso/callback</code>
         <button className="text-stone-400 hover:text-stone-900 transition-colors"><Save className="w-3 h-3" /></button>
        </div>
       </div>
       <div className="space-y-1.5">
        <label className="text-micro">Entity ID</label>
        <div className="flex items-center gap-2 p-2 bg-stone-50/50 rounded-lg border border-stone-100">
         <code className="text-xs text-stone-500 truncate flex-1">https://cofounderbay.com/auth/sp</code>
         <button className="text-stone-400 hover:text-stone-900 transition-colors"><Save className="w-3 h-3" /></button>
        </div>
       </div>
      </div>
     </Card>

     <Card title="Test Connection" className="p-5">
      <div className="space-y-4">
       <p className="text-xs text-stone-500 leading-relaxed font-medium">
        Safely test your SSO configuration before enabling it for all members.
       </p>
       <Button variant="outline" className="w-full gap-2 h-9 text-xs font-medium">
        <ArrowRight className="w-3.5 h-3.5" /> Run Test Login
       </Button>
      </div>
     </Card>
    </div>
   </div>
  </div>
 );
}
