import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { Both } from '../lib/both';
import { LanguageToggle, useLanguage } from '../lib/language';
import Sidebar from './layout/Sidebar';
import ChatWidget from './ChatWidget';
import { useAuth } from '../App';
import { UserRole } from '../types';
import { useUIStore } from '../stores/useUIStore';

export default function Layout() {
 const { isDemoMode, toggleDemoMode, user, profile } = useAuth();
 // Global UI state (Zustand) — sidebar collapse persists across reloads.
 const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
 const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
 const mobileSidebarOpen = useUIStore((s) => s.mobileSidebarOpen);
 const setMobileSidebarOpen = useUIStore((s) => s.setMobileSidebarOpen);
 const toggleMobileSidebar = useUIStore((s) => s.toggleMobileSidebar);
 const [showDemoHint, setShowDemoHint] = useState(false);
 useLanguage();

 // Build a minimal user object for the Sidebar
 const sidebarUser = {
  id: user?.uid || profile?.uid || 'demo-user',
  fullName: profile?.fullName || user?.displayName || 'Demo User',
  email: user?.email || 'demo@cofounderbay.com',
  roles: profile?.roles || [UserRole.FOUNDER],
  avatarUrl: (profile as any)?.avatarUrl || profile?.profile?.profilePhoto || user?.photoURL || '',
 };

 return (
  <div className="min-h-screen flex bg-stone-50 selection:bg-stone-900 selection:text-white">
   {/* Accessibility: lets keyboard users jump straight past the sidebar */}
   <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[110] focus:px-4 focus:py-2 focus:bg-stone-900 focus:text-white focus:rounded-lg focus:text-xs focus:font-medium"
   >
    Skip to content
   </a>
   <div className="fixed top-3 right-3 z-[80] flex items-center gap-2">
    <LanguageToggle />
   {isDemoMode && (
    <button
     type="button"
     onClick={() => toggleDemoMode(false)}
     onMouseEnter={() => setShowDemoHint(true)}
     onMouseLeave={() => setShowDemoHint(false)}
     onFocus={() => setShowDemoHint(true)}
     onBlur={() => setShowDemoHint(false)}
     className="relative inline-flex min-h-11 items-center rounded-lg bg-stone-900 px-3 text-sm font-medium text-white"
    >
     <Both en="Exit" el="Έξοδος" />
     {showDemoHint && (
      <span className="pointer-events-none absolute right-0 top-full z-[81] mt-2 w-max max-w-[min(16rem,calc(100vw-1.5rem))] rounded-lg border border-stone-200 bg-white px-3 py-2 text-left text-xs font-medium text-stone-600 shadow-sm">
       <Both en="Demo — nothing is saved" el="Δείγμα — τίποτα δεν αποθηκεύεται" />
      </span>
     )}
    </button>
   )}
   </div>
   <button
    type="button"
    onClick={toggleMobileSidebar}
    aria-label="Menu"
    className="lg:hidden fixed top-3 left-3 z-[75] flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-900"
   >
    <Menu className="w-5 h-5" />
   </button>
   <Sidebar 
    user={sidebarUser as any}
    collapsed={sidebarCollapsed}
    setCollapsed={setSidebarCollapsed}
    mobileOpen={mobileSidebarOpen}
    setMobileOpen={setMobileSidebarOpen}
    onMenuToggle={toggleMobileSidebar}
   />
   <main
    id="main-content"
    tabIndex={-1}
    className="w-full min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto min-h-screen outline-none pt-16 pb-24 lg:pt-0 lg:pb-0"
   >
    <Outlet />
   </main>
   <ChatWidget />
  </div>
 );
}
