import React, { useEffect, useState } from 'react';

import { useTenant } from '../../context/TenantContext';

import { User } from '../../types';

import Card from '../../components/ui/Card';

import Button from '../../components/ui/Button';

import { Palette, Layout, Type, Globe, Check, RefreshCcw, Save, Zap } from 'lucide-react';



interface BrandingSettingsProps {

 user: User;

}



export default function BrandingSettings({ user }: BrandingSettingsProps) {

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

     <h1 className="section-header">Tenant Branding</h1>

     <p className="text-sm text-stone-500 mt-1">Customize the visual identity and content of your ecosystem.</p>

    </div>

    <div className="flex gap-2">

     <Button variant="outline" size="sm" onClick={handleReset} className="h-9 px-4 text-xs font-medium">

      <RefreshCcw className="w-3.5 h-3.5 mr-2" />

      Reset

     </Button>

     <Button size="sm" onClick={handleSave} loading={saving} className="h-9 px-4 text-xs font-medium">

      {success ? <Check className="w-3.5 h-3.5 mr-2" /> : <Save className="w-3.5 h-3.5 mr-2" />}

      {success ? "Saved" : "Save Changes"}

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

     Theme & Colors

    </button>

    <button

     onClick={() => setActiveTab('content')}

     className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${

      activeTab === 'content' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'

     }`}

    >

     <Layout className="w-3.5 h-3.5" />

     Landing Content

    </button>

    <button

     onClick={() => setActiveTab('preview')}

     className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${

      activeTab === 'preview' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'

     }`}

    >

     <Globe className="w-3.5 h-3.5" />

     Live Preview

    </button>

   </div>



   <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

    <div className="lg:col-span-8 space-y-6">

     {activeTab === 'theme' && (

      <Card title="Visual Identity" subtitle="Define your brand colors and logo.">

       <div className="space-y-5">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

         <div className="space-y-1.5">

          <label className="text-micro">Logo URL</label>

          <input

           type="text"

           value={brandingForm.logoUrl}

           onChange={e => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}

           className="w-full bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-400 transition-all"

           placeholder="https://example.com/logo.png"

          />

         </div>

         <div className="space-y-1.5">

          <label className="text-micro">Hero Image URL</label>

          <input

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

          <label className="text-micro">Primary Color</label>

          <div className="flex gap-2">

           <input

            type="color"

            value={brandingForm.primaryColor}

            onChange={e => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}

            className="w-9 h-9 rounded border border-stone-200 cursor-pointer p-0.5 bg-white"

           />

           <input

            type="text"

            value={brandingForm.primaryColor}

            onChange={e => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}

            className="flex-1 bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-xs font-mono"

           />

          </div>

         </div>

         <div className="space-y-1.5">

          <label className="text-micro">Secondary Color</label>

          <div className="flex gap-2">

           <input

            type="color"

            value={brandingForm.secondaryColor}

            onChange={e => setBrandingForm({ ...brandingForm, secondaryColor: e.target.value })}

            className="w-9 h-9 rounded border border-stone-200 cursor-pointer p-0.5 bg-white"

           />

           <input

            type="text"

            value={brandingForm.secondaryColor}

            onChange={e => setBrandingForm({ ...brandingForm, secondaryColor: e.target.value })}

            className="flex-1 bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-xs font-mono"

           />

          </div>

         </div>

         <div className="space-y-1.5">

          <label className="text-micro">Accent Color</label>

          <div className="flex gap-2">

           <input

            type="color"

            value={brandingForm.accentColor}

            onChange={e => setBrandingForm({ ...brandingForm, accentColor: e.target.value })}

            className="w-9 h-9 rounded border border-stone-200 cursor-pointer p-0.5 bg-white"

           />

           <input

            type="text"

            value={brandingForm.accentColor}

            onChange={e => setBrandingForm({ ...brandingForm, accentColor: e.target.value })}

            className="flex-1 bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-xs font-mono"

           />

          </div>

         </div>

        </div>



        <div className="space-y-2">

         <label className="text-micro">Background Style</label>

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

            {style}

           </button>

          ))}

         </div>

        </div>

       </div>

      </Card>

     )}



     {activeTab === 'content' && (

      <Card title="Landing Page Content" subtitle="Customize the text and labels on your public landing page.">

       <div className="space-y-5">

        <div className="space-y-1.5">

         <label className="text-micro">Hero Title</label>

         <input

          type="text"

          value={contentForm.heroTitle}

          onChange={e => setContentForm({ ...contentForm, heroTitle: e.target.value })}

          className="w-full bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-400 transition-all"

         />

        </div>

        <div className="space-y-1.5">

         <label className="text-micro">Hero Subtitle</label>

         <textarea

          rows={3}

          value={contentForm.heroSubtitle}

          onChange={e => setContentForm({ ...contentForm, heroSubtitle: e.target.value })}

          className="w-full bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-400 transition-all"

         />

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

         <div className="space-y-1.5">

          <label className="text-micro">Call to Action Label</label>

          <input

           type="text"

           value={contentForm.ctaLabel}

           onChange={e => setContentForm({ ...contentForm, ctaLabel: e.target.value })}

           className="w-full bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-400 transition-all"

          />

         </div>

         <div className="space-y-1.5">

          <label className="text-micro">Community Naming Convention</label>

          <input

           type="text"

           value={contentForm.communityNamingConvention}

           onChange={e => setContentForm({ ...contentForm, communityNamingConvention: e.target.value })}

           className="w-full bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-400 transition-all"

           placeholder="e.g. Communities, Hubs, Circles"

          />

         </div>

        </div>

        <div className="space-y-1.5">

         <label className="text-micro">Dashboard Welcome Text</label>

         <input

          type="text"

          value={contentForm.dashboardWelcomeText}

          onChange={e => setContentForm({ ...contentForm, dashboardWelcomeText: e.target.value })}

          className="w-full bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-400 transition-all"

         />

         <p className="text-xs text-stone-400 font-medium">Use {'{score}'} as a placeholder for profile completion score.</p>

        </div>

        <div className="space-y-1.5">

         <label className="text-micro">Email Signature</label>

         <input

          type="text"

          value={contentForm.emailSignature}

          onChange={e => setContentForm({ ...contentForm, emailSignature: e.target.value })}

          className="w-full bg-stone-50/50 border border-stone-200 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-400 transition-all"

          placeholder="e.g. The CoFounderBay Team"

         />

         <p className="text-xs text-stone-400 font-medium">This closing line will be used in all automated outgoing emails.</p>

        </div>

       </div>

      </Card>

     )}



     {activeTab === 'preview' && (

      <div className="space-y-6">

       <Card title="Button Preview" noPadding>

        <div className="p-8 flex flex-wrap gap-4 items-center justify-center bg-stone-50/50">

         <Button variant="primary" size="sm">Primary Action</Button>

         <Button variant="secondary" size="sm">Secondary Action</Button>

         <Button variant="outline" size="sm">Outline Action</Button>

         <Button variant="ghost" size="sm">Ghost Action</Button>

        </div>

       </Card>



       <Card title="Sidebar Preview" noPadding>

        <div className="flex h-64 border border-stone-100 rounded-lg overflow-hidden">

         <div className="w-40 bg-white border-r border-stone-100 p-4 space-y-4">

          <div className="flex items-center gap-2 mb-4">

           <div className="w-5 h-5 bg-stone-900 rounded flex items-center justify-center">

            <Zap className="w-2.5 h-2.5 text-white fill-current" />

           </div>

           <span className="text-xs font-medium tracking-wider">{tenant.displayName}</span>

          </div>

          <div className="space-y-1">

           <div className="bg-stone-900 text-white px-3 py-1.5 rounded-md text-xs font-medium tracking-wider">Dashboard</div>

           <div className="text-stone-400 px-3 py-1.5 text-xs font-medium tracking-wider">Matches</div>

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

     <Card title="Current Theme">

      <div className="space-y-4">

       <div className="flex items-center justify-between">

        <span className="text-xs font-medium text-stone-500 tracking-wider">Primary</span>

        <div className="w-10 h-5 rounded-full shadow-inner border border-stone-200/50" style={{ backgroundColor: brandingForm.primaryColor }}></div>

       </div>

       <div className="flex items-center justify-between">

        <span className="text-xs font-medium text-stone-500 tracking-wider">Secondary</span>

        <div className="w-10 h-5 rounded-full shadow-inner border border-stone-200/50" style={{ backgroundColor: brandingForm.secondaryColor }}></div>

       </div>

       <div className="flex items-center justify-between">

        <span className="text-xs font-medium text-stone-500 tracking-wider">Accent</span>

        <div className="w-10 h-5 rounded-full shadow-inner border border-stone-200/50" style={{ backgroundColor: brandingForm.accentColor }}></div>

       </div>

       <div className="pt-4 border-t border-stone-100">

        <p className="text-xs text-stone-400 font-medium leading-relaxed italic">

         Branding changes are applied instantly to the dashboard and internal pages. Landing page changes require a publish action.

        </p>

       </div>

      </div>

     </Card>



     <Card title="Organization Info">

      <div className="space-y-4">

       <div>

        <label className="text-micro">Slug</label>

        <p className="text-sm font-mono text-stone-900 bg-stone-50 p-2 rounded border border-stone-100 mt-1">{tenant.slug}</p>

       </div>

       <div>

        <label className="text-micro">Support Email</label>

        <p className="text-sm text-stone-900 mt-1">{tenant.supportEmail}</p>

       </div>

       <Button variant="outline" size="sm" className="w-full text-xs font-medium h-10">

        View Public Page

       </Button>

      </div>

     </Card>

    </div>

   </div>

  </div>

 );

}

