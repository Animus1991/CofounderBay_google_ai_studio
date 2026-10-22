import React from 'react';
import { useTenant } from '../context/TenantContext';
import { Zap, ArrowRight, Users, GraduationCap, Globe } from 'lucide-react';
import Button from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { useT } from '../lib/language';
import { safeWebUrl } from '../lib/webUrl';

export default function TenantLanding() {
 const t = useT();
 const { tenant, loading, error } = useTenant();

 if (loading) {
  return (
   <div className="min-h-screen flex items-center justify-center bg-stone-50">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
   </div>
  );
 }

 if (error || !tenant) {
  return (
   <div className="min-h-screen flex items-center justify-center bg-stone-50">
    <div className="text-center">
     <h1 className="text-xl sm:text-2xl xl:text-3xl font-medium text-stone-900">{t('Tenant Not Found', 'Ο οργανισμός δεν βρέθηκε')}</h1>
     <p className="text-stone-500 mt-2">{t("The organization ecosystem you are looking for doesn't exist.", 'Το οικοσύστημα οργανισμού που ψάχνεις δεν υπάρχει.')}</p>
     <Link to="/" className="mt-4 inline-block text-primary font-medium hover:underline">{t('Go to CoFounderBay Global', 'Στο CoFounderBay Global')}</Link>
    </div>
   </div>
  );
 }

 const branding = tenant.branding ?? ({} as NonNullable<typeof tenant.branding>);
 const content = tenant.content ?? ({} as NonNullable<typeof tenant.content>);

 return (
  <div className="min-h-screen bg-white font-sans text-stone-900">
   {/* Navigation */}
   <nav className="h-20 border-b border-stone-100 flex items-center justify-between px-8 md:px-16 max-w-7xl mx-auto">
    <div className="flex items-center gap-3">
     {branding.logoUrl ? (
      <img src={branding.logoUrl} alt={tenant.displayName} className="h-8 w-auto" />
     ) : (
      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
       <Zap className="w-5 h-5 text-primary-foreground fill-current" />
      </div>
     )}
     <span className="text-xl font-medium tracking-tight">{tenant.displayName}</span>
    </div>
    <div className="flex items-center gap-6">
     <Link to="/login" className="text-sm font-medium text-stone-500 hover:text-stone-900">{t('Login', 'Είσοδος')}</Link>
     <Link to="/signup" data-ui="button" className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors">{content.ctaLabel}</Link>
    </div>
   </nav>

   {/* Hero Section */}
   <section className="relative py-24 px-8 md:px-16 overflow-hidden">
    {branding.backgroundStyle === 'mesh' && (
     <div className="absolute inset-0 -z-10 bg-stone-50" />
    )}

    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
     <div className="space-y-8">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium tracking-wider">
       <Zap className="w-3 h-3 fill-current" />
       {t('Powered by CoFounderBay', 'Με την υποστήριξη του CoFounderBay')}
      </div>
      <h1 className="text-xl sm:text-2xl xl:text-3xl font-medium tracking-tight leading-snug">
       {content.heroTitle}
      </h1>
      <p className="text-sm sm:text-base xl:text-lg text-stone-500 leading-relaxed max-w-xl">
       {content.heroSubtitle}
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
       <Link to="/signup" data-ui="button" className="inline-flex items-center justify-center gap-2 px-10 h-11 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors">
        {content.ctaLabel}
        <ArrowRight className="w-5 h-5" />
       </Link>
       <Button variant="outline" size="lg" onClick={() => document.getElementById('tenant-about')?.scrollIntoView({ behavior: 'smooth' })}>
        {t('Learn More', 'Μάθε περισσότερα')}
       </Button>
      </div>
     </div>
     <div className="relative">
      {branding.heroImageUrl ? (
       <img 
        src={branding.heroImageUrl} 
        alt={t('Hero', 'Κεντρική εικόνα')} 
        className="rounded-2xl shadow-sm border border-stone-200 w-full aspect-video object-cover"
       />
      ) : (
       <div className="aspect-video bg-stone-100 rounded-2xl border border-stone-200 flex items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
        <Zap className="w-24 h-24 text-primary/10 fill-current" />
       </div>
      )}
     </div>
    </div>
   </section>

   {/* Features */}
   <section id="tenant-about" className="py-24 bg-stone-50 px-8 md:px-16">
    <div className="max-w-7xl mx-auto">
     <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
      <h2 className="text-xl font-medium tracking-tight">{t('Everything you need to build your team', 'Ό,τι χρειάζεσαι για να φτιάξεις την ομάδα σου')}</h2>
      <p className="text-stone-500">{t(`A specialized environment for ${tenant.displayName} members to connect and grow.`, `Ένα εξειδικευμένο περιβάλλον για τα μέλη του ${tenant.displayName} να συνδεθούν και να αναπτυχθούν.`)}</p>
     </div>

     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {[
       { icon: Users, title: t("Co-Founder Matching", "Αντιστοίχιση συνιδρυτών"), desc: t("Find partners with complementary skills and shared values.", "Βρες συνεργάτες με συμπληρωματικές δεξιότητες και κοινές αξίες.") },
       { icon: GraduationCap, title: t("Expert Mentorship", "Καθοδήγηση από ειδικούς"), desc: t("Access a curated network of advisors within our ecosystem.", "Πρόσβαση σε επιλεγμένο δίκτυο συμβούλων στο οικοσύστημά μας.") },
       { icon: Globe, title: content.communityNamingConvention, desc: t("Join industry-specific hubs to share knowledge and resources.", "Μπες σε κόμβους ανά κλάδο για γνώση και πόρους.") }
      ].map((feature, i) => (
       <div key={i} className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
         <feature.icon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-xl font-medium mb-3">{feature.title}</h3>
        <p className="text-stone-500 leading-relaxed">{feature.desc}</p>
       </div>
      ))}
     </div>
    </div>
   </section>

   {/* About */}
   <section className="py-24 px-8 md:px-16">
    <div className="max-w-4xl mx-auto text-center space-y-8">
     <h2 className="text-xl font-medium tracking-tight">{t(`About ${tenant.displayName}`, `Σχετικά με ${tenant.displayName}`)}</h2>
     <p className="text-lg text-stone-600 leading-relaxed">
      {tenant.fullDescription}
     </p>
    </div>
   </section>

   {/* Footer */}
   <footer className="py-16 border-t border-stone-100 px-8 md:px-16">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
     <div className="flex items-center gap-3">
      {branding.logoUrl ? (
       <img src={branding.logoUrl} alt={tenant.displayName} className="h-6 w-auto" />
      ) : (
       <Zap className="w-5 h-5 text-primary fill-current" />
      )}
      <span className="font-medium">{tenant.displayName}</span>
     </div>
     <div className="flex gap-8 text-sm text-stone-500">
      {safeWebUrl(tenant.privacyPolicyUrl) && (
       <a href={safeWebUrl(tenant.privacyPolicyUrl)!} className="hover:text-stone-900">{t('Privacy', 'Απόρρητο')}</a>
      )}
      {safeWebUrl(tenant.termsUrl) && (
       <a href={safeWebUrl(tenant.termsUrl)!} className="hover:text-stone-900">{t('Terms', 'Όροι')}</a>
      )}
      <a href={`mailto:${tenant.supportEmail}`} className="hover:text-stone-900">{t('Support', 'Υποστήριξη')}</a>
     </div>
     <div className="text-xs text-stone-400">
      © 2026 {tenant.name}. {t('Powered by CoFounderBay.', 'Με την υποστήριξη του CoFounderBay.')}
     </div>
    </div>
   </footer>
  </div>
 );
}
