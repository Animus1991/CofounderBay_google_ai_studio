import { Menu } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { RouteErrorBoundary } from './ErrorBoundary';
import { Both } from '../lib/both';
import { LanguageToggle, useLanguage, useT } from '../lib/language';
import Sidebar from './layout/Sidebar';
import ChatWidget from './ChatWidget';
import Tooltip from './ui/Tooltip';
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
 const navigate = useNavigate();
 useLanguage();
 const t = useT();

 // Build a minimal user object for the Sidebar
 const isGuest = !user && !isDemoMode;
 const sidebarUser = {
  id: user?.uid || profile?.uid || (isGuest ? 'guest' : 'demo-user'),
  fullName: profile?.fullName || user?.displayName || (isGuest ? t('Guest', 'Επισκέπτης') : t('Demo User', 'Δοκιμαστικός χρήστης')),
  email: user?.email || (isGuest ? '' : 'demo@cofounderbay.com'),
  roles: profile?.roles || [UserRole.FOUNDER],
  avatarUrl: (profile as any)?.avatarUrl || profile?.profile?.profilePhoto || user?.photoURL || '',
 };

 const exitButton = isDemoMode ? (
  <Tooltip content={t('Demo — sample data, kept only in this browser', 'Demo — δοκιμαστικά δεδομένα, μένουν μόνο σε αυτόν τον περιηγητή')} side="bottom" delay={0}>
   <button
    type="button"
    onClick={() => toggleDemoMode(false)}
    className="inline-flex min-h-11 items-center rounded-lg bg-stone-900 px-3 text-sm font-medium text-white"
   >
    <Both en="Exit" el="Έξοδος" />
   </button>
  </Tooltip>
 ) : !user ? (
  <button
   type="button"
   onClick={() => navigate('/login')}
   className="inline-flex min-h-11 items-center rounded-lg bg-stone-900 px-3 text-sm font-medium text-white"
  >
   <Both en="Sign in" el="Είσοδος" />
  </button>
 ) : null;

 return (
  <div className="flex h-dvh min-h-0 flex-col bg-stone-50 selection:bg-stone-900 selection:text-white lg:flex-row">
   <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[110] focus:px-4 focus:py-2 focus:bg-stone-900 focus:text-white focus:rounded-lg focus:text-xs focus:font-medium"
   >
    {t('Skip to content', 'Μετάβαση στο περιεχόμενο')}
   </a>
   <header className="z-[80] flex h-14 shrink-0 items-center justify-between gap-2 border-b border-stone-200 bg-stone-50 px-3 lg:hidden">
    <button
     type="button"
     onClick={toggleMobileSidebar}
     aria-label={t('Menu', 'Μενού')}
     className="flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-900"
    >
     <Menu className="w-5 h-5" />
    </button>
    <div className="flex items-center gap-2">
     <LanguageToggle />
     {exitButton}
    </div>
   </header>
   <div className="fixed top-3 right-3 z-[80] hidden items-center gap-2 lg:flex">
    <LanguageToggle />
    {exitButton}
   </div>
   <div className="flex min-h-0 min-w-0 flex-1">
    <Sidebar
     user={sidebarUser as any}
     guest={isGuest}
     collapsed={sidebarCollapsed}
     setCollapsed={setSidebarCollapsed}
     mobileOpen={mobileSidebarOpen}
     setMobileOpen={setMobileSidebarOpen}
     onMenuToggle={toggleMobileSidebar}
    />
    <main
     id="main-content"
     tabIndex={-1}
     className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-auto outline-none sm:pb-28 lg:pb-0"
    >
     <RouteErrorBoundary>
      <Outlet />
     </RouteErrorBoundary>
    </main>
   </div>
   {/* Phone-only strip. The assistant button is fixed into this band, so page controls scroll above it. */}
   <div className="h-20 shrink-0 sm:hidden" aria-hidden="true" />
   <ChatWidget />
  </div>
 );
}
