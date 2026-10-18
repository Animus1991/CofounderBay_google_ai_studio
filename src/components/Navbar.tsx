import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
 Zap, 
 Menu, 
 X, 
 User as UserIcon, 
 LogOut, 
 Settings, 
 ShieldCheck, 
 LayoutDashboard, 
 Users, 
 MessageSquare, 
 Target, 
 TrendingUp,
 Search,
 Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { useAuth } from '../App';
import { cn } from '../lib/utils';
import { useT } from '../lib/language';
import { labelOf } from '../lib/labels';

interface NavbarProps {
 onMenuToggle?: () => void;
}

export default function Navbar({ onMenuToggle }: NavbarProps) {
 const t = useT();
 const [isMenuOpen, setIsMenuOpen] = useState(false);
 const [isProfileOpen, setIsProfileOpen] = useState(false);
 const { user, isAdmin, profile, isDemoMode, toggleDemoMode } = useAuth();
 const navigate = useNavigate();

 const handleLogout = async () => {
  try {
   if (isDemoMode) {
    toggleDemoMode(false);
   } else {
    await auth.signOut();
   }
   navigate('/');
  } catch (error) {
   console.error('Error logging out:', error);
  }
 };

 const navLinks: { name: string; href: string; icon?: React.ComponentType<{ className?: string }> }[] = user ? [
  { name: t('Dashboard', 'Πίνακας'), href: '/dashboard', icon: LayoutDashboard },
  { name: t('Matches', 'Αντιστοιχίσεις'), href: '/matches', icon: Search },
  { name: t('Mentors', 'Μέντορες'), href: '/mentors', icon: Users },
  { name: t('Communities', 'Κοινότητες'), href: '/communities', icon: TrendingUp },
  { name: t('Messages', 'Μηνύματα'), href: '/messages', icon: MessageSquare },
  { name: t('Milestones', 'Ορόσημα'), href: '/milestones', icon: Target },
 ] : [
  { name: t('Features', 'Λειτουργίες'), href: '/#features' },
  { name: t('How it Works', 'Πώς λειτουργεί'), href: '/#how-it-works' },
  { name: t('Communities', 'Κοινότητες'), href: '/#communities' },
  { name: t('Pricing', 'Τιμές'), href: '/#pricing' },
 ];

 return (
  <nav className="relative z-50 bg-white/80 backdrop-blur-xl border-b border-stone-100">
   <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
    <div className="flex justify-between h-20">
     {/* Logo */}
     <div className="flex items-center">
      <NavLink to={user ? "/dashboard" : "/"} className="flex items-center gap-2 group">
       <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center transition-transform">
        <Zap className="w-6 h-6 text-white" />
       </div>
       <span className="text-base sm:text-lg font-medium text-stone-900 tracking-tight">CoFounderBay</span>
      </NavLink>
     </div>

     {/* Desktop Navigation */}
     <div className="hidden md:flex items-center gap-1">
      {navLinks.map((link) => (
       <NavLink
        key={link.name}
        to={link.href}
        className={({ isActive }) => cn(
         "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
         isActive 
          ? "bg-stone-900 text-white shadow-lg shadow-stone-900/10" 
          : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
        )}
       >
        {link.icon && <link.icon className="w-4 h-4" />}
        {link.name}
       </NavLink>
      ))}
     </div>

     {/* Desktop Right Actions */}
     <div className="hidden md:flex items-center gap-4">
      {user && (
       <button
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-stone-400 bg-stone-50 border border-stone-200 rounded-xl hover:border-stone-300 hover:text-stone-600 transition-all"
        title={t('Search (Ctrl+K)', 'Αναζήτηση (Ctrl+K)')}
       >
        <Search className="w-4 h-4" />
        <span className="text-xs">{t('Search...', 'Αναζήτηση…')}</span>
        <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-white border border-stone-200 rounded-md">⌘K</kbd>
       </button>
      )}
      {user ? (
       <div className="flex items-center gap-4">
        {isAdmin && (
         <NavLink 
          to="/admin" 
          className="p-2.5 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all"
          title={t('Admin Dashboard', 'Πίνακας διαχείρισης')}
         >
          <ShieldCheck className="w-6 h-6" />
         </NavLink>
        )}
        
        <div className="relative">
         <button 
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className="flex items-center gap-2 p-1.5 pr-3 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-all border border-stone-100"
         >
          <img 
           src={`https://picsum.photos/seed/${user.uid}/100/100`} 
           alt={user.displayName || t('User', 'Χρήστης')} 
           className="w-8 h-8 rounded-xl object-cover shadow-sm"
           referrerPolicy="no-referrer"
          />
          <span className="text-sm font-medium text-stone-900">{user.displayName?.split(' ')[0] || labelOf('Founder')}</span>
         </button>

         {/* Profile Dropdown */}
         <AnimatePresence>
          {isProfileOpen && (
           <>
            <div 
             className="fixed inset-0 z-10" 
             onClick={() => setIsProfileOpen(false)} 
            />
            <motion.div 
             initial={{ opacity: 0, scale: 0.95, y: 10 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             exit={{ opacity: 0, scale: 0.95, y: 10 }}
             className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-sm border border-stone-100 p-2 z-20"
            >
             <NavLink 
              to="/profile" 
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all"
              onClick={() => setIsProfileOpen(false)}
             >
              <UserIcon className="w-5 h-5" />
              {t('My Profile', 'Το προφίλ μου')}
             </NavLink>
             <NavLink 
              to="/settings" 
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all"
              onClick={() => setIsProfileOpen(false)}
             >
              <Settings className="w-5 h-5" />
              {t('Settings', 'Ρυθμίσεις')}
             </NavLink>
             <div className="h-px bg-stone-100 my-2" />
             <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-all"
             >
              <LogOut className="w-5 h-5" />
              {t('Log Out', 'Αποσύνδεση')}
             </button>
            </motion.div>
           </>
          )}
         </AnimatePresence>
        </div>
       </div>
      ) : (
       <div className="flex items-center gap-3">
        <NavLink 
         to="/login" 
         className="px-6 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 transition-all"
        >
         {t('Log In', 'Είσοδος')}
        </NavLink>
        <NavLink 
         to="/signup" 
         className="px-6 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-all shadow-sm"
        >
         {t('Sign Up', 'Εγγραφή')}
        </NavLink>
       </div>
      )}
     </div>

     {/* Mobile Menu Button */}
     <div className="flex items-center gap-2">
      {user && onMenuToggle && (
       <button 
        onClick={onMenuToggle}
        className="lg:hidden p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all"
        title={t('Toggle Sidebar', 'Εναλλαγή πλευρικής στήλης')}
       >
        <Menu className="w-6 h-6" />
       </button>
      )}
      <button 
       onClick={() => setIsMenuOpen(!isMenuOpen)}
       className="md:hidden p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all"
      >
       {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
     </div>
    </div>
   </div>

   {/* Mobile Menu */}
   <AnimatePresence>
    {isMenuOpen && (
     <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="md:hidden bg-white border-t border-stone-100 overflow-hidden"
     >
      <div className="px-4 py-6 space-y-2">
       {navLinks.map((link) => (
        <NavLink
         key={link.name}
         to={link.href}
         onClick={() => setIsMenuOpen(false)}
         className={({ isActive }) => cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all",
          isActive 
           ? "bg-stone-900 text-white shadow-lg" 
           : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
         )}
        >
         {link.icon && <link.icon className="w-5 h-5" />}
         {link.name}
        </NavLink>
       ))}
       {!user && (
        <div className="pt-4 flex flex-col gap-3">
         <NavLink 
          to="/login" 
          onClick={() => setIsMenuOpen(false)}
          className="w-full py-3 text-center font-medium text-stone-600 hover:bg-stone-50 rounded-xl transition-all"
         >
          {t('Log In', 'Είσοδος')}
         </NavLink>
         <NavLink 
          to="/signup" 
          onClick={() => setIsMenuOpen(false)}
          className="w-full py-3 bg-stone-900 text-white text-center font-medium rounded-xl shadow-sm"
         >
          {t('Sign Up', 'Εγγραφή')}
         </NavLink>
        </div>
       )}
       {user && (
        <div className="pt-4 border-t border-stone-100">
         <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-base font-medium text-red-500 hover:bg-red-50 rounded-xl transition-all"
         >
          <LogOut className="w-5 h-5" />
          {t('Log Out', 'Αποσύνδεση')}
         </button>
        </div>
       )}
      </div>
     </motion.div>
    )}
   </AnimatePresence>
  </nav>
 );
}
