/**
 * Phone and tablet tab bar — the four places a founder returns to most, plus
 * the full menu, within thumb reach.
 *
 * Until now every destination on a phone was behind the menu button in the top
 * corner. A bottom bar of four to five destinations is the standard mobile
 * pattern (Material navigation bar, iOS tab bar); the fifth slot opens the
 * whole navigation, because the studio has far more than five pages. Labels
 * and icons come from the page registry, so they match the sidebar.
 *
 * Pages that own the bottom of the screen with a composer (the full-page AI
 * Studio) hide the bar; everything else gets padding for it through
 * `--bottom-nav-offset` (index.css), which the assistant button and the toasts
 * also use to sit above it.
 */
import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { cn } from '../../lib/utils';
import { navIcon, navLabel } from '../../lib/navMap';
import { useT } from '../../lib/language';
import { useOptionalMessaging } from '../../context/MessagingContext';
import { useUIStore } from '../../stores/useUIStore';

const TAB_BAR_PATHS = ['/dashboard', '/matches', '/messages', '/events'] as const;

/** Short labels that fit five to a phone row; the registry's longer names stay in the menu. */
const SHORT_LABELS: Record<string, { en: string; el: string }> = {
  '/dashboard': { en: 'Home', el: 'Αρχική' },
  '/matches': { en: 'Matches', el: 'Συνιδρυτές' },
};

/** Routes that hide the bar because their own composer sits at the bottom. */
function hidesTabBar(pathname: string): boolean {
  return /^\/assistant\/?$/.test(pathname);
}

export default function MobileTabBar() {
  const t = useT();
  const location = useLocation();
  const messaging = useOptionalMessaging();
  const unread = messaging?.totalUnread ?? 0;
  const mobileOpen = useUIStore((s) => s.mobileSidebarOpen);
  const toggleMobileSidebar = useUIStore((s) => s.toggleMobileSidebar);
  const hidden = hidesTabBar(location.pathname);

  // The offset variable is only set while the bar is on screen.
  useEffect(() => {
    const root = document.documentElement;
    if (hidden) delete root.dataset.bottomNav;
    else root.dataset.bottomNav = 'on';
    return () => {
      delete root.dataset.bottomNav;
    };
  }, [hidden]);

  if (hidden) return null;

  const item = 'relative flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-medium transition-colors';

  return (
    <nav
      aria-label={t('Main', 'Κύρια πλοήγηση')}
      data-testid="mobile-tab-bar"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-stone-200 bg-white/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mx-auto flex max-w-xl items-stretch px-1.5">
        {TAB_BAR_PATHS.map((path) => {
          const Icon = navIcon(path);
          const label = SHORT_LABELS[path] ?? navLabel(path);
          const badge = path === '/messages' && unread > 0 ? unread : 0;
          return (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                cn(item, isActive ? 'text-stone-900 font-semibold' : 'text-stone-500 hover:text-stone-900')
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span aria-hidden="true" className="absolute top-0 h-0.5 w-8 rounded-full bg-stone-900" />}
                  <span className="relative">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {badge > 0 && (
                      <span className="absolute -right-2 -top-1.5 min-w-4 rounded-full bg-stone-900 px-1 text-center text-[10px] leading-4 text-white tabular-nums">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </span>
                  <span className="max-w-full truncate">{t(label.en, label.el)}</span>
                  {badge > 0 && <span className="sr-only">{t(`, ${badge} unread`, `, ${badge} αδιάβαστα`)}</span>}
                </>
              )}
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={toggleMobileSidebar}
          aria-expanded={mobileOpen}
          aria-controls="primary-navigation"
          className={cn(item, mobileOpen ? 'text-stone-900 font-semibold' : 'text-stone-500 hover:text-stone-900')}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          <span>{t('Menu', 'Μενού')}</span>
        </button>
      </div>
    </nav>
  );
}
