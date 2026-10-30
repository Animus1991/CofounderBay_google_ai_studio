import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Menu, Palette, Sparkles, Check, ChevronDown, Search } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { RouteErrorBoundary } from './ErrorBoundary';

// The assistant panel (and the operator behind it) is its own chunk: the frame
// paints without it, and it loads straight after. Requests sent before it is
// ready wait in lib/assistantBus.
const ChatWidget = lazy(() => import('./ChatWidget'));
import { Both } from '../lib/both';
import { LanguageToggle, useLanguage, useT } from '../lib/language';
import Sidebar from './layout/Sidebar';
import Tooltip from './ui/Tooltip';
import { useAuth } from '../App';
import { UserRole } from '../types';
import { useUIStore, PaletteTheme } from '../stores/useUIStore';
import SaveSafetyGuard from './SaveSafetyGuard';
import { OutreachWatcher } from './OutreachWatcher';
import { pageContext } from '../lib/pageRegistry';
import { openAssistant } from '../lib/assistantBus';
import { useFollowUpAlerts } from '../lib/followUpAlerts';

const PALETTES: { id: PaletteTheme; labelEn: string; labelEl: string; dot: string }[] = [
  { id: 'stone', labelEn: 'Comfort Stone', labelEl: 'Πέτρα', dot: 'bg-stone-800' },
  { id: 'dark', labelEn: 'Dark Obsidian', labelEl: 'Σκοτεινό', dot: 'bg-indigo-500' },
  { id: 'cyan', labelEn: 'Cyan Pulse', labelEl: 'Κυανό', dot: 'bg-cyan-500' },
  { id: 'mint', labelEn: 'Mint Catalyst', labelEl: 'Μέντα', dot: 'bg-emerald-600' },
  { id: 'apricot', labelEn: 'Apricot Warmth', labelEl: 'Βερίκοκο', dot: 'bg-orange-500' },
  { id: 'lilac', labelEn: 'Lilac Vision', labelEl: 'Λιλά', dot: 'bg-purple-500' },
  { id: 'burgundy', labelEn: 'Burgundy Velvet', labelEl: 'Μπορντό', dot: 'bg-[#853341]' },
];

function ThemePalettePicker({
  paletteTheme,
  setPaletteTheme,
}: {
  paletteTheme: PaletteTheme;
  setPaletteTheme: (theme: PaletteTheme) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activePalette = PALETTES.find((p) => p.id === paletteTheme) || PALETTES[0]!;

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        data-ui="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t(`Theme: ${activePalette.labelEn}`, `Θέμα: ${activePalette.labelEl}`)}
        title={t(`Theme: ${activePalette.labelEn}`, `Θέμα: ${activePalette.labelEl}`)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2 sm:px-2.5 text-xs font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors"
      >
        <Palette className="w-3.5 h-3.5 text-stone-500 shrink-0" />
        <span
          className={`w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-offset-1 ring-stone-900/25 ${activePalette.dot}`}
        />
        <ChevronDown
          className={`w-3 h-3 text-stone-400 shrink-0 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('Themes', 'Θέματα')}
          className="absolute right-0 top-full mt-1.5 z-[120] w-56 rounded-xl border border-stone-200 bg-white p-2.5 shadow-xl"
        >
          <div className="px-1.5 pb-1.5 text-xs font-medium text-stone-500">
            {t('Theme', 'Θέμα')}
          </div>
          <div className="flex flex-col gap-0.5">
            {PALETTES.map((p) => {
              const isSelected = paletteTheme === p.id;
              return (
                <button
                  key={`vert-${p.id}`}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  onClick={() => {
                    setPaletteTheme(p.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors text-left ${
                    isSelected
                      ? 'bg-stone-100 text-stone-900 font-semibold'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${p.dot}`} />
                    <span className="truncate">{t(p.labelEn, p.labelEl)}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-stone-900 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { isDemoMode, toggleDemoMode, user, profile } = useAuth();
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const mobileSidebarOpen = useUIStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useUIStore((s) => s.setMobileSidebarOpen);
  const toggleMobileSidebar = useUIStore((s) => s.toggleMobileSidebar);

  const paletteTheme = useUIStore((s) => s.paletteTheme);
  const setPaletteTheme = useUIStore((s) => s.setPaletteTheme);

  const navigate = useNavigate();
  const location = useLocation();
  useLanguage();
  const t = useT();
  const currentPage = pageContext(location.pathname);
  const onAssistantPage = location.pathname.replace(/\/+$/, '') === '/assistant';
  // The messages hub is a full-height app surface: no bottom gutter under the thread.
  const onMessagesPage = /^\/messages(\/|$)/.test(location.pathname);

  const isGuest = !user && !isDemoMode;
  // An investor follow-up that slipped is announced once (toast + Notifications).
  useFollowUpAlerts(!isGuest);
  const sidebarUser = {
    id: user?.uid || profile?.uid || (isGuest ? 'guest' : 'demo-user'),
    fullName:
      profile?.fullName ||
      user?.displayName ||
      (isGuest ? t('Guest', 'Επισκέπτης') : t('Demo User', 'Δοκιμαστικός χρήστης')),
    email: user?.email || (isGuest ? '' : 'demo@cofounderbay.com'),
    roles: profile?.roles || [UserRole.FOUNDER],
    avatarUrl:
      profile?.avatarUrl ||
      profile?.profile?.profilePhoto ||
      user?.photoURL ||
      '',
  };

  const exitButton = isDemoMode ? (
    <Tooltip
      content={t(
        'Demo — sample data, kept only in this browser',
        'Demo — δοκιμαστικά δεδομένα, μένουν μόνο σε αυτόν τον περιηγητή'
      )}
      side="bottom"
      delay={0}
    >
      <button
        type="button"
        data-ui="button"
        onClick={() => toggleDemoMode(false)}
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-200 bg-white px-2.5 sm:px-3 text-xs sm:text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900 shrink-0"
      >
        <Both en="Exit" el="Έξοδος" />
      </button>
    </Tooltip>
  ) : !user ? (
    <button
      type="button"
      data-ui="button"
      onClick={() => navigate('/login')}
      className="inline-flex min-h-11 items-center rounded-lg bg-stone-900 px-2.5 sm:px-3 text-xs sm:text-sm font-medium text-white shrink-0"
    >
      <Both en="Sign in" el="Είσοδος" />
    </button>
  ) : null;

  /*
   * The top bar only carries what applies on every page: search, the assistant,
   * preferences and session. The whole bar is filled with the palette accent
   * already used by primary buttons. Page-specific tools sit on the pages they
   * belong to (Matches, Fundraising, Network → Needs).
   */
  const studioChrome = (
    <div
      role="group"
      aria-label={t('Search, assistant and preferences', 'Αναζήτηση, βοηθός και προτιμήσεις')}
      className="flex items-center gap-1 sm:gap-1.5 shrink-0"
    >
      <button
        type="button"
        data-ui="button"
        onClick={() => window.dispatchEvent(new CustomEvent('OPEN_COMMAND_PALETTE'))}
        aria-label={t('Search pages, people and tools', 'Αναζήτηση σελίδων, ατόμων και εργαλείων')}
        title={t('Search (Ctrl K)', 'Αναζήτηση (Ctrl K)')}
        className="inline-flex min-h-9 items-center justify-center rounded-lg border border-stone-200 bg-white px-2.5 text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors"
      >
        <Search className="w-4 h-4" />
      </button>

      <button
        type="button"
        data-ui="button"
        onClick={() => openAssistant()}
        className="inline-flex min-h-9 items-center gap-1 sm:gap-1.5 rounded-lg border border-stone-300 bg-stone-100/80 px-2 sm:px-2.5 text-xs font-semibold text-stone-900 hover:bg-stone-200/80 transition-colors"
        title={t('Open Studio AI Co-Pilot (Reads & edits every module)', 'Άνοιγμα Studio AI Co-Pilot (Διαβάζει & ενημερώνει κάθε ενότητα)')}
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span className="hidden min-[380px]:inline">AI</span>
        <span className="hidden sm:inline">Co-Pilot</span>
      </button>
      <ThemePalettePicker paletteTheme={paletteTheme} setPaletteTheme={setPaletteTheme} />
      <LanguageToggle />
    </div>
  );

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-stone-50 selection:bg-stone-900 selection:text-white lg:flex-row">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[110] focus:px-4 focus:py-2 focus:bg-stone-900 focus:text-white focus:rounded-lg focus:text-xs focus:font-medium"
      >
        {t('Skip to content', 'Μετάβαση στο περιεχόμενο')}
      </a>
      <header className="theme-chrome-frame z-[80] flex min-h-[3.395rem] shrink-0 items-center justify-between gap-1.5 border-b px-2.5 sm:px-3 py-1.5 lg:hidden">
        <button
          type="button"
          data-ui="button"
          onClick={toggleMobileSidebar}
          aria-label={t('Menu', 'Μενού')}
          aria-expanded={mobileSidebarOpen}
          aria-controls="primary-navigation"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-900"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center justify-end gap-1 sm:gap-1.5 min-w-0">
          {studioChrome}
          {exitButton}
        </div>
      </header>
      <div className="flex min-h-0 min-w-0 flex-1">
        <SaveSafetyGuard />
        {/* Share-link opens and the digest snapshot — only for someone with a studio (member or sample). */}
        {!isGuest && <OutreachWatcher />}
        <Sidebar
          user={sidebarUser}
          guest={isGuest}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          setMobileOpen={setMobileSidebarOpen}
          onMenuToggle={toggleMobileSidebar}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="theme-chrome-frame hidden shrink-0 items-center justify-between gap-3 border-b px-6 py-[0.485rem] lg:flex">
            <div className="flex items-center gap-2 text-xs min-w-0 text-white">
              <span className="font-semibold shrink-0">CoFounderBay Studio</span>
              <span>·</span>
              <span className="theme-chrome-chip inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium shrink-0">
                {t(currentPage.en, currentPage.el)}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {studioChrome}
              {exitButton && (
                <>
                  <span aria-hidden="true" className="theme-chrome-rule h-5 w-px" />
                  {exitButton}
                </>
              )}
            </div>
          </div>
          <main
            id="main-content"
            tabIndex={-1}
            className={`flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-auto outline-none ${onMessagesPage ? 'pb-20 sm:pb-24 lg:pb-0' : onAssistantPage ? 'pb-4' : 'pb-20 sm:pb-24'}`}
          >
            <RouteErrorBoundary>
              {/* Pages load as their own chunks; the frame (sidebar, header, assistant) stays put meanwhile. */}
              <Suspense
                fallback={
                  <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-live="polite">
                    <div className="w-7 h-7 border-[3px] border-stone-200 border-t-stone-900 rounded-full animate-spin" aria-hidden="true" />
                    <span className="sr-only">{t('Loading page', 'Φόρτωση σελίδας')}</span>
                  </div>
                }
              >
                <Outlet />
              </Suspense>
            </RouteErrorBoundary>
          </main>
        </div>
      </div>
      {/* The full-page AI Studio hosts the same conversation inline. */}
      {!onAssistantPage && (
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
      )}
    </div>
  );
}
