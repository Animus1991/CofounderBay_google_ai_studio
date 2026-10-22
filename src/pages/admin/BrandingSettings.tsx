import React, { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { User } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Palette, Layout, Globe, Check, RefreshCcw, Save, Zap } from 'lucide-react';
import { useT } from '../../lib/language';

interface BrandingSettingsProps {
 user: User;
}

export default function BrandingSettings({ user: _user }: BrandingSettingsProps) {
 const t = useT();
 const { tenant, updateBranding, updateContent } = useTenant();
 const [activeTab, setActiveTab] = useState<'theme' | 'content' | 'preview'>('theme');
 const [saving, setSaving] = useState(false);
 const [success, setSuccess] = useState(false);

 const [brandingForm, setBrandingForm] = useState(tenant?.branding);
 const [contentForm, setContentForm] = useState(tenant?.content);
 // Sync local form state once the tenant config loads. Hooks must run
 // unconditionally (before any early return) per the Rules of Hooks.
 useEffect(() => {
  if (tenant) {
   setBrandingForm(tenant.branding);
   setContentForm(tenant.content);
  }
 }, [tenant]);

 if (!tenant || !brandingForm || !contentForm) return null;

 const handleSave = async () => {
  setSaving(true);
  try {
   await Promise.all([
    updateBranding(brandingForm),
    updateContent(contentForm)
   ]);
   setSuccess(true);
   setTimeout(() => setSuccess(false), 3000);
  } catch (err) {
   console.error(err);
  } finally {
   setSaving(false);
  }
 };

 const handleReset = () => {
  setBrandingForm(tenant.branding);
  setContentForm(tenant.content);
 };

 return (
  <div className="max-w-5xl mx-auto space-y-6">
   <div className="flex items-center justify-between">
    <div>
     <h1 className="section-header">{t('Tenant Branding', 'Ταυτότητα οργανισμού')}</h1>
     <p className="text-sm text-stone-500 mt-1">{t('Customize the visual identity and content of your ecosystem.', 'Προσάρμοσε την οπτική ταυτότητα και το περιεχόμενο του οικοσυστήματος.')}</p>
    </div>
    <div className="flex gap-2">
     <Button variant="outline" size="sm" onClick={handleReset} className="h-9 px-4 text-xs font-medium">
      <RefreshCcw className="w-3.5 h-3.5 mr-2" />
      {t('Reset', 'Επαναφορά')}
     </Button>
     <Button size="sm" onClick={handleSave} loading={saving} className="h-9 px-4 text-xs font-medium">
      {success ? <Check className="w-3.5 h-3.5 mr-2" /> : <Save className="w-3.5 h-3.5 mr-2" />}
      {success ? t('Saved', 'Αποθηκεύτηκε') : t('Save Changes', 'Αποθήκευση αλλαγών')}
     </Button>
    </div>
   </div>

   <div className="scroll-tabs p-1 bg-stone-100/80 rounded-lg">
    <button
     onClick={() => setActiveTab('theme')}
     className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
      activeTab === 'theme' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
     }`}
    >
     <Palette className="w-3.5 h-3.5" />
     {t('Theme & Colors', 'Θέμα και χρώματα')}
    </button>
    <button
     onClick={() => setActiveTab('content')}
     className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
      activeTab === 'content' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
     }`}
    >
     <Layout className="w-3.5 h-3.5" />
     {t('Landing Content', 'Περιεχόμενο αρχικής')}
    </button>
    <button
     onClick={() => setActiveTab('preview')}
     className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
      activeTab === 'preview' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
     }`}
    >
     <Globe className="w-3.5 h-3.5" />
     {t('Live Preview', 'Ζωντανή προεπισκόπηση')}
    </button>
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
    <div className="lg:col-span-8 space-y-6">
     {activeTab === 'theme' && (
      <Card title={t('Visual Identity', 'Οπτική ταυτότητα')} subtitle={t('Define your brand colors and logo.', 'Όρισε τα χρώματα και το λογότυπο.')}>
       <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
         <div className="space-y-1.5">
          <label htmlFor="brandingsettings-field-1" className="text-micro">{t('Logo URL', 'URL λογοτύπου')}</label>
          <input id="brandingsettings-field-1"
           type="text"
           value={brandingForm.logoUrl}
           onChange={e => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
           className="w-full bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-400 transition-all"
           placeholder="https://example.com/logo.png"
          />
         </div>
         <div className="space-y-1.5">
          <label htmlFor="brandingsettings-field-2" className="text-micro">{t('Hero Image URL', 'URL εικόνας hero')}</label>
          <input id="brandingsettings-field-2"
           type="text"
           value={brandingForm.heroImageUrl || ''}
           onChange={e => setBrandingForm({ ...brandingForm, heroImageUrl: e.target.value })}
           className="w-full bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-400 transition-all"
           placeholder="https://example.com/hero.jpg"
          />
         </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
         <div className="space-y-1.5">
          <label className="text-micro">{t('Primary Color', 'Κύριο χρώμα')}</label>
          <div className="flex gap-2">
           <input
            aria-label={t('Primary color picker', 'Επιλογέας κύριου χρώματος')}
            type="color"
            value={brandingForm.primaryColor}
            onChange={e => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
            className="w-9 h-9 rounded border border-stone-200 cursor-pointer p-0.5 bg-white"
           />
           <input
            aria-label={t('Primary color hex value', 'Κωδικός hex κύριου χρώματος')}
            type="text"
            value={brandingForm.primaryColor}
            onChange={e => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
            className="flex-1 bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-xs font-mono"
           />
          </div>
         </div>
         <div className="space-y-1.5">
          <label className="text-micro">{t('Secondary Color', 'Δευτερεύον χρώμα')}</label>
          <div className="flex gap-2">
           <input
            aria-label={t('Secondary color picker', 'Επιλογέας δευτερεύοντος χρώματος')}
            type="color"
            value={brandingForm.secondaryColor}
            onChange={e => setBrandingForm({ ...brandingForm, secondaryColor: e.target.value })}
            className="w-9 h-9 rounded border border-stone-200 cursor-pointer p-0.5 bg-white"
           />
           <input
            aria-label={t('Secondary color hex value', 'Κωδικός hex δευτερεύοντος χρώματος')}
            type="text"
            value={brandingForm.secondaryColor}
            onChange={e => setBrandingForm({ ...brandingForm, secondaryColor: e.target.value })}
            className="flex-1 bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-xs font-mono"
           />
          </div>
         </div>
         <div className="space-y-1.5">
          <label className="text-micro">{t('Accent Color', 'Χρώμα έμφασης')}</label>
          <div className="flex gap-2">
           <input
            aria-label={t('Accent color picker', 'Επιλογέας χρώματος έμφασης')}
            type="color"
            value={brandingForm.accentColor}
            onChange={e => setBrandingForm({ ...brandingForm, accentColor: e.target.value })}
            className="w-9 h-9 rounded border border-stone-200 cursor-pointer p-0.5 bg-white"
           />
           <input
            aria-label={t('Accent color hex value', 'Κωδικός hex χρώματος έμφασης')}
            type="text"
            value={brandingForm.accentColor}
            onChange={e => setBrandingForm({ ...brandingForm, accentColor: e.target.value })}
            className="flex-1 bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-xs font-mono"
           />
          </div>
         </div>
        </div>

        <div className="space-y-2">
         <label className="text-micro">{t('Background Style', 'Στυλ φόντου')}</label>
         <div className="flex gap-3">
          {['solid', 'gradient', 'mesh'].map(style => (
           <button
            key={style}
            onClick={() => setBrandingForm({ ...brandingForm, backgroundStyle: style as any })}
            className={`flex-1 py-2 rounded-md border text-xs font-medium transition-all capitalize ${
             brandingForm.backgroundStyle === style 
              ? 'border-stone-900 bg-stone-900 text-white shadow-sm' 
              : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300'
            }`}
           >
            {style === 'solid' ? t('solid', 'συμπαγές') : style === 'gradient' ? t('gradient', 'ντεγκραντέ') : t('mesh', 'πλέγμα')}
           </button>
          ))}
         </div>
        </div>
       </div>
      </Card>
     )}

     {activeTab === 'content' && (
      <Card title={t('Landing Page Content', 'Περιεχόμενο αρχικής σελίδας')} subtitle={t('Customize the text and labels on your public landing page.', 'Προσάρμοσε τα κείμενα και τις ετικέτες στην δημόσια αρχική σελίδα.')}>
       <div className="space-y-5">
        <div className="space-y-1.5">
         <label htmlFor="brandingsettings-field-3" className="text-micro">{t('Hero Title', 'Τίτλος hero')}</label>
         <input id="brandingsettings-field-3"
          type="text"
          value={contentForm.heroTitle}
          onChange={e => setContentForm({ ...contentForm, heroTitle: e.target.value })}
          className="w-full bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-400 transition-all"
         />
        </div>
        <div className="space-y-1.5">
         <label htmlFor="brandingsettings-field-4" className="text-micro">{t('Hero Subtitle', 'Υπότιτλος hero')}</label>
         <textarea id="brandingsettings-field-4"
          rows={3}
          value={contentForm.heroSubtitle}
          onChange={e => setContentForm({ ...contentForm, heroSubtitle: e.target.value })}
          className="w-full bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-400 transition-all"
         />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
         <div className="space-y-1.5">
          <label htmlFor="brandingsettings-field-5" className="text-micro">{t('Call to Action Label', 'Ετικέτα πρόσκλησης σε ενέργεια')}</label>
          <input id="brandingsettings-field-5"
           type="text"
           value={contentForm.ctaLabel}
           onChange={e => setContentForm({ ...contentForm, ctaLabel: e.target.value })}
           className="w-full bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-400 transition-all"
          />
         </div>
         <div className="space-y-1.5">
          <label htmlFor="brandingsettings-field-6" className="text-micro">{t('Community Naming Convention', 'Ονομασία κοινοτήτων')}</label>
          <input id="brandingsettings-field-6"
           type="text"
           value={contentForm.communityNamingConvention}
           onChange={e => setContentForm({ ...contentForm, communityNamingConvention: e.target.value })}
           className="w-full bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-400 transition-all"
           placeholder={t('e.g. Communities, Hubs, Circles', 'π.χ. Κοινότητες, κόμβοι, κύκλοι')}
          />
         </div>
        </div>
        <div className="space-y-1.5">
         <label htmlFor="brandingsettings-field-7" className="text-micro">{t('Dashboard Welcome Text', 'Κείμενο καλωσορίσματος στον πίνακα ελέγχου')}</label>
         <input id="brandingsettings-field-7"
          type="text"
          value={contentForm.dashboardWelcomeText}
          onChange={e => setContentForm({ ...contentForm, dashboardWelcomeText: e.target.value })}
          className="w-full bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-400 transition-all"
         />
         <p className="text-xs text-stone-400 font-medium">{t('Use {score} as a placeholder for profile completion score.', 'Χρησιμοποίησε το {score} ως σύμβολο για το ποσοστό ολοκλήρωσης προφίλ.')}</p>
        </div>
        <div className="space-y-1.5">
         <label htmlFor="brandingsettings-field-8" className="text-micro">{t('Email Signature', 'Υπογραφή email')}</label>
         <input id="brandingsettings-field-8"
          type="text"
          value={contentForm.emailSignature}
          onChange={e => setContentForm({ ...contentForm, emailSignature: e.target.value })}
          className="w-full bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-400 transition-all"
          placeholder={t('e.g. The CoFounderBay Team', 'π.χ. The CoFounderBay Team')}
         />
         <p className="text-xs text-stone-400 font-medium">{t('This closing line will be used in all automated outgoing emails.', 'Αυτή η γραμμή κλεισίματος θα μπαίνει σε όλα τα αυτοματοποιημένα εξερχόμενα email.')}</p>
        </div>
       </div>
      </Card>
     )}

     {activeTab === 'preview' && (
      <div className="space-y-6">
       <Card title={t('Button Preview', 'Προεπισκόπηση κουμπιών')} noPadding>
        <div className="p-8 flex flex-wrap gap-4 items-center justify-center bg-stone-50/50">
         <Button variant="primary" size="sm">{t('Primary Action', 'Κύρια ενέργεια')}</Button>
         <Button variant="secondary" size="sm">{t('Secondary Action', 'Δευτερεύουσα ενέργεια')}</Button>
         <Button variant="outline" size="sm">{t('Outline Action', 'Ενέργεια περιγράμματος')}</Button>
         <Button variant="ghost" size="sm">{t('Ghost Action', 'Διάφανη ενέργεια')}</Button>
        </div>
       </Card>

       <Card title={t('Sidebar Preview', 'Προεπισκόπηση πλευρικής στήλης')} noPadding>
        <div className="flex h-64 border border-stone-100 rounded-lg overflow-hidden">
         <div className="w-40 bg-white border-r border-stone-100 p-4 space-y-4">
          <div className="flex items-center gap-2 mb-4">
           <div className="w-5 h-5 bg-stone-900 rounded flex items-center justify-center">
            <Zap className="w-2.5 h-2.5 text-white fill-current" />
           </div>
           <span className="text-xs font-medium tracking-wider">{tenant.displayName}</span>
          </div>
          <div className="space-y-1">
           <div className="bg-stone-900 text-white px-3 py-1.5 rounded-md text-xs font-medium tracking-wider">{t('Dashboard', 'Πίνακας')}</div>
           <div className="text-stone-400 px-3 py-1.5 text-xs font-medium tracking-wider">{t('Matches', 'Αντιστοιχίσεις')}</div>
           <div className="text-stone-400 px-3 py-1.5 text-xs font-medium tracking-wider">{contentForm.communityNamingConvention}</div>
          </div>
         </div>
         <div className="flex-1 bg-stone-50/50 p-6">
          <div className="h-3 w-24 bg-stone-200 rounded mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
           <div className="h-20 bg-white rounded-lg border border-stone-100 shadow-sm"></div>
           <div className="h-20 bg-white rounded-lg border border-stone-100 shadow-sm"></div>
          </div>
         </div>
        </div>
       </Card>
      </div>
     )}
    </div>

    <div className="lg:col-span-4 space-y-6">
     <Card title={t('Current Theme', 'Τρέχον θέμα')}>
      <div className="space-y-4">
       <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-stone-500 tracking-wider">{t('Primary', 'Κύριο')}</span>
        <div className="w-10 h-5 rounded-full shadow-inner border border-stone-200/50" style={{ backgroundColor: brandingForm.primaryColor }}></div>
       </div>
       <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-stone-500 tracking-wider">{t('Secondary', 'Δευτερεύον')}</span>
        <div className="w-10 h-5 rounded-full shadow-inner border border-stone-200/50" style={{ backgroundColor: brandingForm.secondaryColor }}></div>
       </div>
       <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-stone-500 tracking-wider">{t('Accent', 'Έμφαση')}</span>
        <div className="w-10 h-5 rounded-full shadow-inner border border-stone-200/50" style={{ backgroundColor: brandingForm.accentColor }}></div>
       </div>
       <div className="pt-4 border-t border-stone-100">
        <p className="text-xs text-stone-400 font-medium leading-relaxed italic">
         {t('Branding changes are applied instantly to the dashboard and internal pages. Landing page changes require a publish action.', 'Οι αλλαγές ταυτότητας εφαρμόζονται αμέσως στον πίνακα ελέγχου και στις εσωτερικές σελίδες. Οι αλλαγές αρχικής σελίδας θέλουν δημοσίευση.')}
        </p>
       </div>
      </div>
     </Card>

     <Card title={t('Organization Info', 'Στοιχεία οργανισμού')}>
      <div className="space-y-4">
       <div>
        <label className="text-micro">{t('Slug', 'Αναγνωριστικό')}</label>
        <p className="text-sm font-mono text-stone-900 bg-stone-50 p-2 rounded border border-stone-100 mt-1">{tenant.slug}</p>
       </div>
       <div>
        <label className="text-micro">{t('Support Email', 'Email υποστήριξης')}</label>
        <p className="text-sm text-stone-900 mt-1">{tenant.supportEmail}</p>
       </div>
       <Button variant="outline" size="sm" className="w-full text-xs font-medium h-10">
        {t('View Public Page', 'Δημόσια σελίδα')}
       </Button>
      </div>
     </Card>
    </div>
   </div>
  </div>
 );
}
