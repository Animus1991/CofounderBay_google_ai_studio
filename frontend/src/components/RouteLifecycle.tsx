/**
 * Route lifecycle manager — mounted once inside the Router.
 *
 * On every navigation it:
 *  1. Sets a descriptive `document.title` (UX + SEO + browser history).
 *  2. Restores scroll position to the top (window + the app's scroll container).
 *  3. Reports a page view to the analytics layer.
 *  4. Announces the new page to screen readers via a polite live region (a11y).
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPage } from '../lib/analytics';
import { trackVisit } from '../lib/usage';
import { bothText } from '../lib/labels';
import { useLanguage } from '../lib/language';
import { pageTitle } from '../lib/pageRegistry';

const APP_NAME = 'CoFounderBay';

/** Document title for a path, from the page registry (one name per page, both languages). */
export function titleForPath(pathname: string): string {
  const exact = pageTitle(pathname);
  if (exact) return bothText(exact.en, exact.el);
  if (pathname.startsWith('/profile/')) return bothText('Profile', 'Προφίλ');
  return bothText('Page Not Found', 'Η σελίδα δεν βρέθηκε');
}

export default function RouteLifecycle() {
  const { pathname } = useLocation();
  const { mode } = useLanguage();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const pageTitle = titleForPath(pathname);
    document.title = pathname === '/' ? `${APP_NAME} — ${pageTitle}` : `${pageTitle} · ${APP_NAME}`;

    // Scroll restoration: both the window and the in-app scroll container.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.getElementById('main-content')?.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    trackPage(pathname, { title: pageTitle });
    trackVisit(pathname);
    setAnnouncement(pageTitle);
  }, [pathname, mode]);

  return (
    <div aria-live="polite" role="status" className="sr-only">
      {announcement}
    </div>
  );
}
