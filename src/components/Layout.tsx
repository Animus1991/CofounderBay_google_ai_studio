import { Outlet } from 'react-router-dom';

import { Both } from '../lib/both';

import Sidebar from './layout/Sidebar';

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

   {isDemoMode && (

    <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-xs font-medium py-1.5 px-4 flex flex-wrap items-center justify-center gap-4 z-[80]">

     <span><Both en="Demo — nothing is saved" el="Δείγμα — τίποτα δεν αποθηκεύεται" /></span>

     <button 

      onClick={() => toggleDemoMode(false)}

      className="underline hover:opacity-80 transition-opacity"

     >

      <Both en="Exit Demo" el="Έξοδος" />

     </button>

    </div>

   )}

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
    className={`flex-1 overflow-y-auto min-h-screen outline-none${isDemoMode ? ' pt-8' : ''}`}
   >

    <Outlet />

   </main>

  </div>

 );

}

