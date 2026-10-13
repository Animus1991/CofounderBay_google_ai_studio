import React from 'react';

import { NavLink } from 'react-router-dom';

import { Zap, Twitter, Linkedin, Github, Mail } from 'lucide-react';

import { useAuth } from '../App';

import { cn } from '../lib/utils';



export default function Footer() {

 const { user } = useAuth();

 const currentYear = new Date().getFullYear();



 const footerLinks = [

  {

   title: 'Platform',

   links: [

    { name: 'Dashboard', href: '/dashboard' },

    { name: 'Matches', href: '/matches' },

    { name: 'Mentors', href: '/mentors' },

    { name: 'Communities', href: '/communities' },

   ],

  },

  {

   title: 'Company',

   links: [

    { name: 'About Us', href: '/#about' },

    { name: 'Careers', href: '/#careers' },

    { name: 'Contact', href: '/#contact' },

    { name: 'Blog', href: '/#blog' },

   ],

  },

  {

   title: 'Legal',

   links: [

    { name: 'Privacy Policy', href: '/#privacy' },

    { name: 'Terms of Service', href: '/#terms' },

    { name: 'Cookie Policy', href: '/#cookies' },

   ],

  },

 ];



 return (

  <footer className="bg-white border-t border-stone-100 pt-20 pb-10">

   <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">

     {/* Brand */}

     <div className="lg:col-span-2">

      <NavLink to="/" className="flex items-center gap-2 mb-6 group">

       <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">

        <Zap className="w-6 h-6 text-white" />

       </div>

       <span className="text-[13px] sm:text-[14px] font-medium text-stone-900 tracking-tight">CoFounderBay</span>

      </NavLink>

      <p className="text-stone-500 text-[15px] sm:text-lg leading-relaxed max-w-sm mb-8">

       The premium ecosystem for founders to find co-founders, mentors, and build the next generation of startups.

      </p>

      <div className="flex gap-4">

       {[Twitter, Linkedin, Github, Mail].map((Icon, i) => (

        <a 

         key={i}

         href="#" 

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

        "font-medium text-stone-900 tracking-widest mb-6",

        user ? "text-xs" : "text-sm"

       )}>

        {section.title}

       </h3>

       <ul className={cn(

        "space-y-4",

        user ? "text-sm" : "text-base"

       )}>

        {section.links.map((link) => (

         <li key={link.name}>

          <NavLink 

           to={link.href} 

           className="text-stone-500 hover:text-stone-900 transition-colors font-medium"

          >

           {link.name}

          </NavLink>

         </li>

        ))}

       </ul>

      </div>

     ))}

    </div>



    <div className="pt-10 border-t border-stone-100 flex flex-col md:flex-row justify-between items-center gap-6">

     <p className="text-stone-400 text-sm font-medium">

      © {currentYear} CoFounderBay. All rights reserved.

     </p>

     <div className="flex items-center gap-2">

      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />

      <span className="text-stone-400 text-sm font-medium tracking-wider">System Operational</span>

     </div>

    </div>

   </div>

  </footer>

 );

}

