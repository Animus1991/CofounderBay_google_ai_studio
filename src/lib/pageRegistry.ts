/**
 * Every page of the studio, described once.
 *
 * Before this file the same route list lived in six places — the router, the
 * sidebar sections, `navMap` (icons + labels for pins and ⌘K), `navHelp` (what
 * each page is for), `RouteLifecycle` (document titles in two languages) and
 * the assistant's page table — and they had drifted: /insights was
 * «Αναλύσεις» in the menu, «Εικόνα» in the tab title and «Αναλυτικά
 * στοιχεία» on the page; the pinned-page labels had no Greek at all, so the
 * assistant named pages in English inside Greek replies.
 *
 * Each consumer now derives its view from this registry and keeps its old
 * exported API, so nothing that imports `navMap`, `navHelp` or the assistant's
 * page table had to change. `pageRegistry.test.ts` checks that every route the
 * app declares has an entry.
 */
import {
  Activity, Award, Bell, BookOpen, Briefcase, Calendar, Compass, CreditCard, DollarSign, Gem, Gift, Globe,
  GraduationCap, LayoutDashboard, MessageSquare, Rocket, Scale, Settings, Share2, Sparkles, Ticket, Trophy,
  User as UserIcon, Users, type LucideIcon,
} from 'lucide-react';

export type PageSection = 'primary' | 'find' | 'build' | 'resources' | 'account' | 'admin' | 'public';

export type PageEntry = {
  path: string;
  /** Menu label. */
  label: { en: string; el: string };
  /** Document title / breadcrumb when it differs from the menu label. */
  title?: { en: string; el: string };
  icon?: LucideIcon;
  section: PageSection;
  /** What the page is for — tooltips, ⌘K descriptions. */
  help?: { en: string; el: string };
  /** Words the assistant recognises for this page (folded, accent-free stems). */
  assistantKeys?: string[];
  /** Position in the assistant's page table; lower wins when two pages share a word. */
  assistantOrder?: number;
};

export const PAGE_REGISTRY: readonly PageEntry[] = [
  // Public
  { path: '/', section: 'public', label: { en: 'Home', el: 'Αρχική' }, title: { en: 'Find Your Co-Founder', el: 'Βρες τον συνιδρυτή σου' } },
  { path: '/login', section: 'public', label: { en: 'Sign In', el: 'Είσοδος' } },
  { path: '/signup', section: 'public', label: { en: 'Create Account', el: 'Εγγραφή' } },
  { path: '/quiz', section: 'public', label: { en: 'Fit check', el: 'Fit check' }, help: { en: '60-second compatibility archetype check', el: 'Έλεγχος συμβατότητας 60 δευτερολέπτων' }, assistantKeys: ['quiz', 'fit check', 'fit-check', 'αρχετυπ'], assistantOrder: 22 },
  { path: '/onboarding', section: 'public', label: { en: 'Onboarding', el: 'Εισαγωγή' } },

  // Primary
  { path: '/dashboard', section: 'primary', icon: LayoutDashboard, label: { en: 'Dashboard', el: 'Πίνακας ελέγχου' }, help: { en: 'Your next step, matches and what changed', el: 'Το επόμενο βήμα σου, αντιστοιχίσεις και τι άλλαξε' }, assistantKeys: ['dashboard', 'home', 'πινακ', 'αρχικ'], assistantOrder: 1 },
  { path: '/messages', section: 'primary', icon: MessageSquare, label: { en: 'Messages', el: 'Μηνύματα' }, help: { en: 'Private conversations', el: 'Ιδιωτικές συνομιλίες' }, assistantKeys: ['message', 'chat', 'inbox', 'μηνυμ', 'συνομιλ'], assistantOrder: 5 },
  { path: '/assistant', section: 'primary', icon: Sparkles, label: { en: 'AI Studio', el: 'AI Studio' }, help: { en: 'The assistant full-page, with everything it can read and change', el: 'Ο βοηθός σε πλήρη σελίδα, με όλα όσα διαβάζει και αλλάζει' }, assistantKeys: ['ai studio', 'assistant page', 'full-page assistant'], assistantOrder: 23 },

  // Find
  { path: '/matches', section: 'find', icon: Users, label: { en: 'Matches', el: 'Αντιστοιχίσεις' }, help: { en: 'People ranked by how well you fit', el: 'Άτομα ταξινομημένα κατά συμβατότητα' }, assistantKeys: ['match', 'cofounder', 'co-founder', 'συνιδρυτ', 'αντιστοιχ'], assistantOrder: 2 },
  { path: '/discovery', section: 'find', icon: Compass, label: { en: 'Explore', el: 'Εξερεύνηση' }, help: { en: 'People, communities, programs and events', el: 'Άτομα, κοινότητες, προγράμματα και εκδηλώσεις' }, assistantKeys: ['discover', 'explore', 'εξερευ'], assistantOrder: 3 },
  { path: '/network', section: 'find', icon: Share2, label: { en: 'Network', el: 'Δίκτυο' }, help: { en: 'Connections, saved people and looking-for posts', el: 'Συνδέσεις, αποθηκευμένα άτομα και αγγελίες αναζήτησης' }, assistantKeys: ['network', 'δικτυ'], assistantOrder: 9 },
  { path: '/mentors', section: 'find', icon: GraduationCap, label: { en: 'Mentors', el: 'Μέντορες' }, help: { en: 'Experienced people who can guide you', el: 'Έμπειροι άνθρωποι που μπορούν να σε καθοδηγήσουν' }, assistantKeys: ['mentor', 'μεντορ'], assistantOrder: 4 },
  { path: '/communities', section: 'find', icon: Globe, label: { en: 'Communities', el: 'Κοινότητες' }, help: { en: 'Groups to discuss, ask and share', el: 'Ομάδες για συζήτηση, ερωτήσεις και ανταλλαγή γνώσης' }, assistantKeys: ['communit', 'κοινοτ'], assistantOrder: 10 },
  { path: '/events', section: 'find', icon: Ticket, label: { en: 'Events', el: 'Εκδηλώσεις' }, help: { en: 'Meetups, workshops and pitch nights', el: 'Συναντήσεις, εργαστήρια και βραδιές pitch' }, assistantKeys: ['event', 'εκδηλ'], assistantOrder: 11 },
  { path: '/programs', section: 'find', icon: Award, label: { en: 'Programs', el: 'Προγράμματα' }, help: { en: 'Accelerators, grants and competitions', el: 'Επιταχυντές, επιχορηγήσεις και διαγωνισμοί' }, assistantKeys: ['program', 'accelerator', 'πρόγραμ', 'προγραμ'], assistantOrder: 12 },

  // Build
  { path: '/workspace', section: 'build', icon: Briefcase, label: { en: 'Workspace', el: 'Χώρος εργασίας' }, help: { en: 'Tasks, focus timer and Lean Canvas', el: 'Εργασίες, χρονόμετρο εστίασης και Lean Canvas' }, assistantKeys: ['workspace', 'venture builder', 'χωροσ εργασ'], assistantOrder: 20 },
  { path: '/founder-tools', section: 'build', icon: Rocket, label: { en: 'Founder Tools', el: 'Εργαλεία ιδρυτή' }, help: { en: 'Diagnostic, pitch deck and practical tools', el: 'Διάγνωση, pitch deck και πρακτικά εργαλεία' }, assistantKeys: ['founder tool', 'εργαλει ιδρυτ'], assistantOrder: 19 },
  { path: '/fundraising', section: 'build', icon: DollarSign, label: { en: 'Fundraising', el: 'Χρηματοδότηση' }, help: { en: 'Your round, investors and data room', el: 'Ο γύρος σου, οι επενδυτές και ο χώρος εγγράφων' }, assistantKeys: ['fund', 'investor', 'round', 'raise', 'χρηματοδ', 'επενδυτ', 'γύρ'], assistantOrder: 7 },
  { path: '/milestones', section: 'build', icon: Trophy, label: { en: 'Milestones', el: 'Ορόσημα' }, help: { en: 'Goals with progress and due dates', el: 'Στόχοι με πρόοδο και προθεσμίες' }, assistantKeys: ['milestone', 'οροσημ', 'στόχ'], assistantOrder: 6 },
  { path: '/calendar', section: 'build', icon: Calendar, label: { en: 'Calendar', el: 'Ημερολόγιο' }, help: { en: 'Meetings, events and deadlines', el: 'Συναντήσεις, εκδηλώσεις και προθεσμίες' }, assistantKeys: ['calendar', 'ημερολ', 'ραντεβ'], assistantOrder: 8 },

  // Resources
  { path: '/resources', section: 'resources', icon: BookOpen, label: { en: 'Resources', el: 'Πόροι' }, help: { en: 'Guides, services and jobs', el: 'Οδηγοί, υπηρεσίες και θέσεις εργασίας' }, assistantKeys: ['resource', 'course', 'learning hub', 'πορο'], assistantOrder: 21 },
  { path: '/insights', section: 'resources', icon: Activity, label: { en: 'Insights', el: 'Αναλύσεις' }, help: { en: 'How your profile and network are doing', el: 'Πώς πάνε το προφίλ και το δίκτυό σου' }, assistantKeys: ['insight', 'στατιστ'], assistantOrder: 15 },
  { path: '/legal', section: 'resources', icon: Scale, label: { en: 'Legal Hub', el: 'Νομικά' }, help: { en: 'Templates and checklists for the legal basics', el: 'Πρότυπα και λίστες ελέγχου για τα νομικά' }, assistantKeys: ['legal', 'νομικ'], assistantOrder: 17 },
  { path: '/perks', section: 'resources', icon: Gift, label: { en: 'Perks', el: 'Παροχές' }, help: { en: 'Startup programs with credits and discounts', el: 'Προγράμματα για startups με πιστώσεις και εκπτώσεις' }, assistantKeys: ['perk', 'παροχ'], assistantOrder: 18 },

  // Account
  { path: '/notifications', section: 'account', icon: Bell, label: { en: 'Notifications', el: 'Ειδοποιήσεις' }, help: { en: 'Everything that needs your attention', el: 'Ό,τι χρειάζεται την προσοχή σου' }, assistantKeys: ['notification', 'ειδοποι'], assistantOrder: 16 },
  { path: '/profile', section: 'account', icon: UserIcon, label: { en: 'My Profile', el: 'Το προφίλ μου' }, title: { en: 'Profile', el: 'Προφίλ' }, help: { en: 'How others see you', el: 'Πώς σε βλέπουν οι άλλοι' }, assistantKeys: ['profile', 'προφιλ'], assistantOrder: 13 },
  { path: '/settings', section: 'account', icon: Settings, label: { en: 'Settings', el: 'Ρυθμίσεις' }, help: { en: 'Account, privacy, notifications and plan', el: 'Λογαριασμός, απόρρητο, ειδοποιήσεις και πλάνο' }, assistantKeys: ['setting', 'ρυθμισ'], assistantOrder: 14 },
  { path: '/settings/billing', section: 'account', icon: CreditCard, label: { en: 'Billing', el: 'Χρέωση' }, help: { en: 'Subscription, seats, invoices and payment methods', el: 'Συνδρομή, θέσεις, τιμολόγια και κάρτες' } },
  { path: '/pricing', section: 'account', icon: Gem, label: { en: 'Pricing', el: 'Τιμές' }, help: { en: 'Plans and what each one includes', el: 'Τα πλάνα και τι περιλαμβάνει το καθένα' } },

  // Admin
  { path: '/admin', section: 'admin', label: { en: 'Admin Dashboard', el: 'Πίνακας διαχείρισης' }, help: { en: 'Platform health and moderation', el: 'Κατάσταση πλατφόρμας και εποπτεία' } },
  { path: '/admin/users', section: 'admin', label: { en: 'User Management', el: 'Διαχείριση μελών' }, help: { en: 'Search and manage member accounts', el: 'Αναζήτηση και διαχείριση λογαριασμών' } },
  { path: '/admin/automation', section: 'admin', label: { en: 'Automation', el: 'Αυτοματισμοί' }, help: { en: 'Rules that run automatically', el: 'Κανόνες που εκτελούνται αυτόματα' } },
  { path: '/admin/branding', section: 'admin', label: { en: 'Branding Settings', el: 'Ταυτότητα οργανισμού' }, help: { en: 'Name, logo, colors and landing text', el: 'Όνομα, λογότυπο, χρώματα και κείμενα αρχικής' } },
  { path: '/admin/sso', section: 'admin', label: { en: 'SSO Settings', el: 'Ρυθμίσεις SSO' }, help: { en: 'Single sign-on and identity providers', el: 'Single sign-on και πάροχοι ταυτότητας' } },
  { path: '/admin/taxonomy', section: 'admin', label: { en: 'Taxonomy Settings', el: 'Ταξινομίες πλατφόρμας' }, help: { en: 'Skills, industries and role tags', el: 'Δεξιότητες, κλάδοι και ετικέτες ρόλων' } },
  { path: '/admin/domains', section: 'admin', label: { en: 'Domain Settings', el: 'Τομείς' }, help: { en: 'Custom domains and DNS verification', el: 'Προσαρμοσμένα domains και επαλήθευση DNS' } },
  { path: '/admin/billing', section: 'admin', label: { en: 'Tenant Billing', el: 'Χρέωση' }, help: { en: 'Organization subscription and seat limits', el: 'Συνδρομή οργανισμού και όρια θέσεων' } },
  { path: '/admin/billing-oversight', section: 'admin', label: { en: 'Billing Oversight', el: 'Εποπτεία χρέωσης' }, help: { en: 'Platform-wide MRR, subscriptions and plans', el: 'Συνολικά έσοδα MRR, συνδρομές και πλάνα' } },
];

/** Paths that redirect or alias another entry. */
export const PAGE_ALIASES: Record<string, string> = {
  '/community': '/communities',
  '/explore': '/discovery',
  '/admin/taxonomies': '/admin/taxonomy',
};

/** Help for entries that are actions, not pages. */
const EXTRA_HELP: Record<string, { en: string; el: string }> = {
  '/logout': { en: 'Sign out of this device', el: 'Αποσύνδεση από αυτή τη συσκευή' },
};

const byPath = new Map(PAGE_REGISTRY.map((entry) => [entry.path, entry]));

export function pageEntry(path: string): PageEntry | undefined {
  return byPath.get(path) ?? byPath.get(PAGE_ALIASES[path] ?? '');
}

export function pageTitle(path: string): { en: string; el: string } | undefined {
  const entry = pageEntry(path);
  return entry ? entry.title ?? entry.label : undefined;
}

export function pageHelpPair(path: string): { en: string; el: string } | undefined {
  return pageEntry(path)?.help ?? EXTRA_HELP[path];
}

/** Member navigation, in menu order (what pins, ⌘K and the coach can point at). */
export function memberPages(): PageEntry[] {
  return PAGE_REGISTRY.filter((entry) => entry.section !== 'public' && entry.section !== 'admin' && entry.icon);
}

/** The assistant's page table, in its matching order. */
export function assistantPages(): { keys: string[]; href: string; en: string; el: string }[] {
  return PAGE_REGISTRY
    .filter((entry) => entry.assistantKeys?.length)
    .sort((a, b) => (a.assistantOrder ?? 99) - (b.assistantOrder ?? 99))
    .map((entry) => {
      const name = entry.title ?? entry.label;
      return { keys: entry.assistantKeys!, href: entry.path, en: name.en, el: name.el };
    });
}
