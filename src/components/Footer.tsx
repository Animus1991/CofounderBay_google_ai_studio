import React from 'react';
import { NavLink } from 'react-router-dom';
import { Zap, Twitter, Linkedin, Github, Mail } from 'lucide-react';
import { useAuth } from '../App';
import { cn } from '../lib/utils';
import { Both } from '../lib/both';
import { useT } from '../lib/language';

export default function Footer() {
 const t = useT();
 const { user } = useAuth();
 const currentYear = new Date().getFullYear();

 const footerLinks = [
  {
   title: 'Platform',
   el: 'Πλατφόρμα',
   links: [
    { name: 'Dashboard', el: 'Πίνακας', href: '/dashboard' },
    { name: 'Matches', el: 'Αντιστοιχίσεις', href: '/matches' },
    { name: 'Mentors', el: 'Μέντορες', href: '/mentors' },
    { name: 'Communities', el: 'Κοινότητες', href: '/communities' },
   ],
  },
  {
   title: 'Company',
   el: 'Εταιρεία',
   links: [
    { name: 'About Us', el: 'Σχετικά', href: '/#how-it-works' },
    { name: 'Careers', el: 'Καριέρα', href: '/#features' },
    { name: 'Contact', el: 'Επικοινωνία', href: 'mailto:support@cofounderbay.com' },
    { name: 'Blog', el: 'Ιστολόγιο', href: '/#communities' },
   ],
  },
  {
   title: 'Legal',
   el: 'Νομικά',
   links: [
    { name: 'Privacy Policy', el: 'Πολιτική απορρήτου', href: '/legal' },
    { name: 'Terms of Service', el: 'Όροι χρήσης', href: '/legal' },
    { name: 'Cookie Policy', el: 'Πολιτική cookies', href: '/legal' },
   ],
  },
 ];

 return (
  <footer className="bg-white border-t border-stone-100 pt-20 pb-10">
   <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
     {/* Brand */}
     <div className="lg:col-span-2">
      <NavLink to="/" className="flex items-center gap-2 mb-6 group">
       <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center transition-transform">
        <Zap className="w-6 h-6 text-white" />
       </div>
       <span className="text-sm font-medium text-stone-900 tracking-tight">CoFounderBay</span>
      </NavLink>
      <p className="text-stone-500 text-sm sm:text-base leading-relaxed max-w-sm mb-8">
       {t('The premium ecosystem for founders to find co-founders, mentors, and build the next generation of startups.', 'Το premium οικοσύστημα για ιδρυτές: βρες συνιδρυτή, μέντορες και χτίσε την επόμενη γενιά startup.')}
      </p>
      <div className="flex gap-4">
       {[
        { name: 'twitter', Icon: Twitter, href: '#' },
        { name: 'linkedin', Icon: Linkedin, href: '#' },
        { name: 'github', Icon: Github, href: '#' },
        { name: 'mail', Icon: Mail, href: 'mailto:support@cofounderbay.com' },
       ].map(({ name, Icon, href }) => (
        <a 
         key={name}
         href={href}
         className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all"
        >
         <Icon className="w-5 h-5" />
        </a>
       ))}
      </div>
     </div>

     {/* Links */}
     {footerLinks.map((section) => (
      <div key={section.title}>
       <h3 className={cn(
        "font-medium text-stone-900 tracking-wide mb-6",
        user ? "text-xs" : "text-sm"
       )}>
        <Both en={section.title} el={section.el} />
       </h3>
       <ul className={cn(
        "space-y-4",
        user ? "text-sm" : "text-base"
       )}>
        {section.links.map((link) => (
         <li key={link.name}>
          {link.href.startsWith('mailto:') ? (
           <a
            href={link.href}
            className="text-stone-500 hover:text-stone-900 transition-colors font-medium"
           >
            <Both en={link.name} el={link.el} />
           </a>
          ) : (
           <NavLink 
            to={link.href} 
            className="text-stone-500 hover:text-stone-900 transition-colors font-medium"
           >
            <Both en={link.name} el={link.el} />
           </NavLink>
          )}
         </li>
        ))}
       </ul>
      </div>
     ))}
    </div>

    <div className="pt-10 border-t border-stone-100 flex flex-col md:flex-row justify-between items-center gap-6">
     <p className="text-stone-400 text-sm font-medium">
      © {currentYear} CoFounderBay. {t('All rights reserved.', 'Με επιφύλαξη παντός δικαιώματος.')}
     </p>
     <div className="flex items-center gap-2">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-stone-400 text-sm font-medium tracking-wider">{t('System Operational', 'Σύστημα σε λειτουργία')}</span>
     </div>
    </div>
   </div>
  </footer>
 );
}
