import { useEffect, useRef, useState } from 'react';
import { Menu, Palette, Sparkles, Check, ChevronDown, Search } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { RouteErrorBoundary } from './ErrorBoundary';
import { Both } from '../lib/both';
import { LanguageToggle, useLanguage, useT } from '../lib/language';
import Sidebar from './layout/Sidebar';
import ChatWidget from './ChatWidget';
import Tooltip from './ui/Tooltip';
import { useAuth } from '../App';
import { UserRole } from '../types';
import { useUIStore, PaletteTheme } from '../stores/useUIStore';
import SaveSafetyGuard from './SaveSafetyGuard';
import { pageContext } from '../services/assistantOps';
import { openAssistant } from '../lib/assistantBus';

const PALETTES: { id: PaletteTheme; labelEn: string; labelEl: string; dot: string }[] = [
  { id: 'stone', labelEn: 'Comfort Stone', labelEl: 'Comfort Stone', dot: 'bg-stone-800' },
  { id: 'dark', labelEn: 'Dark Obsidian', labelEl: 'Dark Obsidian', dot: 'bg-indigo-500' },
  { id: 'cyan', labelEn: 'Cyan Pulse', labelEl: 'Cyan Pulse', dot: 'bg-cyan-500' },
  { id: 'mint', labelEn: 'Mint Catalyst', labelEl: 'Mint Catalyst', dot: 'bg-emerald-600' },
  { id: 'apricot', labelEn: 'Apricot Warmth', labelEl: 'Apricot Warmth', dot: 'bg-orange-500' },
  { id: 'lilac', labelEn: 'Lilac Vision', labelEl: 'Lilac Vision', dot: 'bg-purple-500' },
  { id: 'burgundy', labelEn: 'Burgundy Velvet', labelEl: 'Burgundy Velvet', dot: 'bg-[#853341]' },
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
        aria-haspopup="true"
        aria-label={t('Switch Comfort / 5-Palette Theme', 'Εναλλαγή Χρωματικής Παλέτας')}
        title={t(
          `Theme: ${activePalette.labelEn} (Click to choose color)`,
          `Θέμα: ${activePalette.labelEl} (Κλικ για επιλογή χρώματος)`
        )}
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
          aria-label={t('Theme Palettes', 'Χρωματικές Παλέτες')}
          className="absolute right-0 top-full mt-1.5 z-[120] w-56 rounded-xl border border-stone-200 bg-white p-2.5 shadow-xl"
        >
          <div className="px-1.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            {t('Quick Swatches (Horizontal)', 'Γρήγορη Επιλογή (Οριζόντια)')}
          </div>
          <div className="flex items-center justify-between gap-1.5 rounded-lg bg-stone-50 px-2.5 py-2 mb-2 border border-stone-100">
            {PALETTES.map((p) => (
              <button
                key={`horiz-${p.id}`}
                type="button"
                onClick={() => {
                  setPaletteTheme(p.id);
                  setOpen(false);
                }}
                title={t(p.labelEn, p.labelEl)}
                aria-label={t(p.labelEn, p.labelEl)}
                className={`w-5 h-5 rounded-full transition-transform flex items-center justify-center ${
                  p.dot
                } ${
                  paletteTheme === p.id
                    ? 'ring-2 ring-offset-2 ring-stone-900 scale-110'
                    : 'opacity-75 hover:opacity-100 hover:scale-105'
                }`}
              />
            ))}
          </div>

          <div className="px-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            {t('All Themes (Vertical)', 'Όλα τα Θέματα (Κάθετα)')}
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

  const isGuest = !user && !isDemoMode;
  const sidebarUser = {
    id: user?.uid || profile?.uid || (isGuest ? 'guest' : 'demo-user'),
    fullName:
      profile?.fullName ||
      user?.displayName ||
      (isGuest ? t('Guest', 'Επισκέπτης') : t('Demo User', 'Δοκιμαστικός χρήστης')),
    email: user?.email || (isGuest ? '' : 'demo@cofounderbay.com'),
    roles: profile?.roles || [UserRole.FOUNDER],
    avatarUrl:
      (profile as any)?.avatarUrl ||
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
   * The top bar only carries what applies on every page: search (mobile; desktop has it
   * at the top of the sidebar), the assistant, preferences and session. Page-specific
   * tools sit on the pages they belong to (Matches, Fundraising, Network → Needs).
   */
  const quickStudioActions = (
    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
      <button
        type="button"
        data-ui="button"
        onClick={() => window.dispatchEvent(new CustomEvent('OPEN_COMMAND_PALETTE'))}
        aria-label={t('Search pages, people and tools', 'Αναζήτηση σελίδων, ατόμων και εργαλείων')}
        title={t('Search (Ctrl K)', 'Αναζήτηση (Ctrl K)')}
        className="inline-flex lg:hidden items-center justify-center rounded-lg border border-stone-200 bg-white px-2.5 text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors"
      >
        <Search className="w-4 h-4" />
      </button>

      <button
        type="button"
        data-ui="button"
        onClick={() => openAssistant()}
        className="inline-flex items-center gap-1 sm:gap-1.5 rounded-lg border border-stone-300 bg-stone-100/80 px-2 sm:px-2.5 text-xs font-semibold text-stone-900 hover:bg-stone-200/80 transition-colors"
        title={t('Open Studio AI Co-Pilot (Reads & edits every module)', 'Άνοιγμα Studio AI Co-Pilot (Διαβάζει & ενημερώνει κάθε ενότητα)')}
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span className="hidden min-[380px]:inline">AI</span>
        <span className="hidden sm:inline">Co-Pilot</span>
      </button>
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
      <header className="z-[80] flex min-h-[3.395rem] shrink-0 items-center justify-between gap-1.5 border-b border-stone-200 bg-stone-50 px-2.5 sm:px-3 py-1.5 lg:hidden">
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
          {quickStudioActions}
          <ThemePalettePicker paletteTheme={paletteTheme} setPaletteTheme={setPaletteTheme} />
          <LanguageToggle />
          {exitButton}
        </div>
      </header>
      <div className="flex min-h-0 min-w-0 flex-1">
        <SaveSafetyGuard />
        <Sidebar
          user={sidebarUser as any}
          guest={isGuest}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          setMobileOpen={setMobileSidebarOpen}
          onMenuToggle={toggleMobileSidebar}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="hidden shrink-0 items-center justify-between gap-3 border-b border-stone-200/60 bg-stone-50 px-6 py-[0.485rem] lg:flex">
            <div className="flex items-center gap-2 text-xs text-stone-500 min-w-0">
              <span className="font-semibold text-stone-900 shrink-0">CoFounderBay Studio</span>
              <span>·</span>
              <span className="inline-flex items-center rounded-md bg-stone-200/70 px-2 py-0.5 text-[11px] font-medium text-stone-800 shrink-0">
                {t(currentPage.en, currentPage.el)}
              </span>
              <span className="hidden 2xl:inline text-stone-400 truncate">
                {t(
                  'Unified Workspace · 6-Axis Matching · Deal Room · AI Operator',
                  'Ενιαίος Χώρος Εργασίας · 6-Axis Matching · Deal Room · AI Operator'
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {quickStudioActions}
              <span aria-hidden="true" className="h-5 w-px bg-stone-200" />
              <div role="group" aria-label={t('Preferences', 'Προτιμήσεις')} className="flex items-center gap-1.5">
                <ThemePalettePicker paletteTheme={paletteTheme} setPaletteTheme={setPaletteTheme} />
                <LanguageToggle />
              </div>
              {exitButton && (
                <>
                  <span aria-hidden="true" className="h-5 w-px bg-stone-200" />
                  {exitButton}
                </>
              )}
            </div>
          </div>
          <main
            id="main-content"
            tabIndex={-1}
            className={`flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-auto outline-none ${onAssistantPage ? 'pb-4' : 'pb-20 sm:pb-24'}`}
          >
            <RouteErrorBoundary>
              <Outlet />
            </RouteErrorBoundary>
          </main>
        </div>
      </div>
      {/* The full-page AI Studio hosts the same conversation inline. */}
      {!onAssistantPage && <ChatWidget />}
    </div>
  );
}
