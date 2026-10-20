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
import { bothText } from '../lib/labels';
import { useLanguage } from '../lib/language';

const APP_NAME = 'CoFounderBay';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Find Your Co-Founder',
  '/login': 'Sign In',
  '/signup': 'Create Account',
  '/quiz': 'Fit check',
  '/onboarding': 'Onboarding',
  '/dashboard': 'Dashboard',
  '/profile': 'Profile',
  '/matches': 'Matches',
  '/discovery': 'Discovery',
  '/events': 'Events',
  '/mentors': 'Mentors',
  '/communities': 'Communities',
  '/community': 'Community',
  '/messages': 'Messages',
  '/milestones': 'Milestones',
  '/founder-tools': 'Founder Tools',
  '/fundraising': 'Fundraising',
  '/workspace': 'Workspace',
  '/calendar': 'Calendar',
  '/programs': 'Programs',
  '/network': 'Network',
  '/resources': 'Resources',
  '/insights': 'Insights',
  '/legal': 'Legal Hub',
  '/perks': 'Perks',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
  '/settings/billing': 'Billing',
  '/pricing': 'Pricing',
  '/admin': 'Admin Dashboard',
  '/admin/users': 'User Management',
  '/admin/automation': 'Automation',
  '/admin/branding': 'Branding Settings',
  '/admin/sso': 'SSO Settings',
  '/admin/taxonomy': 'Taxonomy Settings',
  '/admin/domains': 'Domain Settings',
  '/admin/billing': 'Tenant Billing',
  '/admin/billing-oversight': 'Billing Oversight',
};

const EL_TITLES: Record<string, string> = {
  '/': 'Βρες τον συνιδρυτή σου',
  '/login': 'Είσοδος',
  '/signup': 'Εγγραφή',
  '/quiz': 'Fit check',
  '/onboarding': 'Εισαγωγή',
  '/dashboard': 'Πίνακας',
  '/profile': 'Προφίλ',
  '/matches': 'Αντιστοιχίσεις',
  '/discovery': 'Εξερεύνηση',
  '/events': 'Εκδηλώσεις',
  '/mentors': 'Μέντορες',
  '/communities': 'Κοινότητες',
  '/community': 'Κοινότητα',
  '/messages': 'Μηνύματα',
  '/milestones': 'Ορόσημα',
  '/founder-tools': 'Εργαλεία ιδρυτή',
  '/fundraising': 'Χρηματοδότηση',
  '/workspace': 'Χώρος εργασίας',
  '/calendar': 'Ημερολόγιο',
  '/programs': 'Προγράμματα',
  '/network': 'Δίκτυο',
  '/resources': 'Πόροι',
  '/insights': 'Εικόνα',
  '/legal': 'Νομικά',
  '/perks': 'Παροχές',
  '/notifications': 'Ειδοποιήσεις',
  '/settings': 'Ρυθμίσεις',
  '/settings/billing': 'Χρέωση',
  '/pricing': 'Τιμές',
  '/admin': 'Πίνακας διαχείρισης',
  '/admin/users': 'Διαχείριση μελών',
  '/admin/automation': 'Αυτοματισμοί',
  '/admin/branding': 'Ταυτότητα οργανισμού',
  '/admin/sso': 'Ρυθμίσεις SSO',
  '/admin/taxonomy': 'Ταξινομίες πλατφόρμας',
  '/admin/domains': 'Τομείς',
  '/admin/billing': 'Χρέωση',
  '/admin/billing-oversight': 'Εποπτεία χρέωσης',
};

export function titleForPath(pathname: string): string {
  const exact = ROUTE_TITLES[pathname];
  if (exact) return bothText(exact, EL_TITLES[pathname] ?? exact);
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
    setAnnouncement(pageTitle);
  }, [pathname, mode]);

  return (
    <div aria-live="polite" role="status" className="sr-only">
      {announcement}
    </div>
  );
}
