import { Search, Bell, User as UserIcon, Menu, Zap, Plus, Command } from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

import { useState, useEffect } from "react";

import { User } from "../../types";

import { useTenant } from "../../context/TenantContext";

import { cn } from "../../lib/utils";



interface NavbarProps {

 user: User;

 onMenuClick?: () => void;

}



export default function Navbar({ user, onMenuClick }: NavbarProps) {

 const { tenant } = useTenant();

 const [isSearchFocused, setIsSearchFocused] = useState(false);

 const [scrolled, setScrolled] = useState(false);



 useEffect(() => {

  const handleScroll = () => setScrolled(window.scrollY > 10);

  window.addEventListener("scroll", handleScroll);

  return () => window.removeEventListener("scroll", handleScroll);

 }, []);



 return (

  <header className={cn(

   "h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40 transition-all duration-300",

   scrolled 

    ? "bg-white/80 backdrop-blur-xl border-b border-stone-200/60 shadow-sm" 

    : "bg-transparent border-b border-transparent"

  )}>

   {/* Left: Search Bar */}

   <div className="flex items-center gap-3 md:gap-6 flex-1 max-w-xl">

    <div className="flex items-center gap-3">

     <button 

      onClick={onMenuClick}

      className="lg:hidden p-2 hover:bg-stone-100 rounded-lg text-stone-500 transition-colors"

     >

      <Menu className="w-5 h-5" />

     </button>

     

     <motion.div 

      whileHover={{ scale: 1.02 }}

      className="hidden md:flex w-9 h-9 bg-stone-900 rounded-xl items-center justify-center shadow-sm"

     >

      {tenant?.branding?.logoUrl ? (

       <img src={tenant.branding.logoUrl} alt={tenant.displayName} className="h-5 w-auto" />

      ) : (

       <Zap className="w-4.5 h-4.5 text-white fill-current" />

      )}

     </motion.div>

    </div>

    

    <div className="relative w-full group">

     <div className={cn(

      "relative flex items-center bg-stone-100/50 border transition-all duration-300 rounded-xl overflow-hidden",

      isSearchFocused 

       ? "border-stone-900 bg-white shadow-[0_0_0_4px_rgba(0,0,0,0.03)]" 

       : "border-transparent hover:bg-stone-100 hover:border-stone-200"

     )}>

      <Search className={cn(

       "ml-3.5 w-4 h-4 transition-colors duration-200",

       isSearchFocused ? "text-stone-900" : "text-stone-400"

      )} />

      <input

       type="text"

       placeholder={`Search ${tenant?.content?.communityNamingConvention || 'communities'}...`}

       onFocus={() => setIsSearchFocused(true)}

       onBlur={() => setIsSearchFocused(false)}

       className="w-full py-2 pl-2.5 pr-4 text-sm font-medium focus:outline-none bg-transparent text-stone-900 placeholder:text-stone-400"

      />

      <div className="mr-3 flex items-center gap-1 px-1.5 py-0.5 bg-stone-200/50 rounded text-xs font-medium text-stone-400 tracking-wider">

       <Command className="w-2.5 h-2.5" />

       <span>K</span>

      </div>

     </div>

    </div>

   </div>



   {/* Right: Actions & Profile */}

   <div className="flex items-center gap-4 ml-8">

    <motion.button 

     whileHover={{ scale: 1.02, backgroundColor: "#1c1917" }}

     whileTap={{ scale: 0.97 }}

     className="hidden lg:flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-medium tracking-wider shadow-md shadow-stone-900/10 transition-all"

    >

     <Plus className="w-3.5 h-3.5" />

     Quick Action

    </motion.button>



    <div className="flex items-center gap-1">

     <motion.button 

      whileHover={{ backgroundColor: "rgba(0,0,0,0.03)" }}

      className="p-2.5 text-stone-500 rounded-xl relative transition-all"

     >

      <Bell className="w-5 h-5" />

      <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-stone-900 rounded-full border-2 border-white"></span>

     </motion.button>

     

     <div className="h-6 w-px bg-stone-200 mx-2"></div>



     <motion.div 

      whileHover={{ x: 2, scale: 1.01 }}

      whileTap={{ scale: 0.98 }}

      className="flex items-center gap-3 cursor-pointer group pl-1 transition-transform"

     >

      <div className="text-right hidden sm:block">

       <p className="text-xs font-semibold text-stone-900 group-hover:text-stone-600 transition-colors">{user.fullName}</p>

       <p className="text-xs font-medium text-stone-400 tracking-wider">{user.roles[0]}</p>

      </div>

      <div className="relative">

       <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center overflow-hidden relative z-10 shadow-sm group-hover:border-stone-400 transition-all">

        <img 

         src={`https://picsum.photos/seed/${user.id}/100/100`} 

         alt={user.fullName}

         className="w-full h-full object-cover"

         referrerPolicy="no-referrer"

        />

       </div>

      </div>

     </motion.div>

    </div>

   </div>

  </header>

 );

}

