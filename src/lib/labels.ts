import { getLang } from './language';

const EL: Record<string, string> = {
  Dashboard: 'Πίνακας',
  Build: 'Δουλειά',
  Find: 'Εύρεση',
  Explore: 'Εξερεύνηση',
  'Founder Tools': 'Εργαλεία ιδρυτή',
  Fundraising: 'Χρηματοδότηση',
  Workspace: 'Χώρος εργασίας',
  Milestones: 'Ορόσημα',
  Calendar: 'Ημερολόγιο',
  Discovery: 'Εξερεύνηση',
  Matches: 'Αντιστοιχίσεις',
  Mentors: 'Μέντορες',
  Communities: 'Κοινότητες',
  Events: 'Εκδηλώσεις',
  Programs: 'Προγράμματα',
  Network: 'Δίκτυο',
  Communication: 'Επικοινωνία',
  Messages: 'Μηνύματα',
  Resources: 'Πόροι',
  Insights: 'Εικόνα',
  'Legal Hub': 'Νομικά',
  'Startup Perks': 'Παροχές',
  Account: 'Λογαριασμός',
  'My Profile': 'Το προφίλ μου',
  Administration: 'Διαχείριση',
  'Admin Dashboard': 'Πίνακας διαχείρισης',
  'User Management': 'Μέλη',
  'Automation Engine': 'Αυτοματισμοί',
  Founder: 'Ιδρυτής',
  Alerts: 'Ειδοποιήσεις',
  Logout: 'Έξοδος',
  Notifications: 'Ειδοποιήσεις',
  Settings: 'Ρυθμίσεις',
  'Expand sidebar': 'Άνοιγμα πλευρικής στήλης',
  'Collapse sidebar': 'Κλείσιμο πλευρικής στήλης',
};

/** The active language only. */
export function bothText(en: string, el: string): string {
  return getLang() === 'el' ? el : en;
}

/** Translate a known label. An unknown key, including a tenant name, stays English. */
export function withEl(en: string): string {
  const el = EL[en];
  if (!el) return en;
  return bothText(en, el);
}
