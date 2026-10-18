import { bothText, withEl } from './labels';

/** What a page is for. Hover and the command list say this before the page opens. */
const PAGE_HELP: Record<string, readonly [string, string]> = {
  '/dashboard': ['Your next step, matches and what changed', 'Το επόμενο βήμα σου, αντιστοιχίσεις και τι άλλαξε'],
  '/founder-tools': ['Diagnostic, pitch deck and practical tools', 'Διάγνωση, pitch deck και πρακτικά εργαλεία'],
  '/fundraising': ['Your round, investors and data room', 'Ο γύρος σου, οι επενδυτές και ο χώρος εγγράφων'],
  '/workspace': ['Tasks, focus timer and Lean Canvas', 'Εργασίες, χρονόμετρο εστίασης και Lean Canvas'],
  '/milestones': ['Goals with progress and due dates', 'Στόχοι με πρόοδο και προθεσμίες'],
  '/calendar': ['Meetings, events and deadlines', 'Συναντήσεις, εκδηλώσεις και προθεσμίες'],
  '/discovery': ['People, communities, programs and events', 'Άτομα, κοινότητες, προγράμματα και εκδηλώσεις'],
  '/explore': ['People, communities, programs and events', 'Άτομα, κοινότητες, προγράμματα και εκδηλώσεις'],
  '/matches': ['People ranked by how well you fit', 'Άτομα ταξινομημένα κατά συμβατότητα'],
  '/mentors': ['Experienced people who can guide you', 'Έμπειροι άνθρωποι που μπορούν να σε καθοδηγήσουν'],
  '/communities': ['Groups to discuss, ask and share', 'Ομάδες για συζήτηση, ερωτήσεις και ανταλλαγή γνώσης'],
  '/community': ['Groups to discuss, ask and share', 'Ομάδες για συζήτηση, ερωτήσεις και ανταλλαγή γνώσης'],
  '/events': ['Meetups, workshops and pitch nights', 'Συναντήσεις, εργαστήρια και βραδιές pitch'],
  '/programs': ['Accelerators, grants and competitions', 'Επιταχυντές, επιχορηγήσεις και διαγωνισμοί'],
  '/network': ['Connections, saved people and looking-for posts', 'Συνδέσεις, αποθηκευμένα άτομα και αγγελίες αναζήτησης'],
  '/messages': ['Private conversations', 'Ιδιωτικές συνομιλίες'],
  '/resources': ['Guides, services and jobs', 'Οδηγοί, υπηρεσίες και θέσεις εργασίας'],
  '/insights': ['How your profile and network are doing', 'Πώς πάνε το προφίλ και το δίκτυό σου'],
  '/legal': ['Templates and checklists for the legal basics', 'Πρότυπα και λίστες ελέγχου για τα νομικά'],
  '/perks': ['Startup programs with credits and discounts', 'Προγράμματα για startups με πιστώσεις και εκπτώσεις'],
  '/profile': ['How others see you', 'Πώς σε βλέπουν οι άλλοι'],
  '/notifications': ['Everything that needs your attention', 'Ό,τι χρειάζεται την προσοχή σου'],
  '/settings': ['Account, privacy, notifications and plan', 'Λογαριασμός, απόρρητο, ειδοποιήσεις και πλάνο'],
  '/pricing': ['Plans and what each one includes', 'Τα πλάνα και τι περιλαμβάνει το καθένα'],
  '/admin': ['Platform health and moderation', 'Κατάσταση πλατφόρμας και εποπτεία'],
  '/admin/users': ['Search and manage member accounts', 'Αναζήτηση και διαχείριση λογαριασμών'],
  '/admin/automation': ['Rules that run automatically', 'Κανόνες που εκτελούνται αυτόματα'],
  '/admin/branding': ['Name, logo, colors and landing text', 'Όνομα, λογότυπο, χρώματα και κείμενα αρχικής'],
  '/logout': ['Sign out of this device', 'Αποσύνδεση από αυτή τη συσκευή'],
};

export function pageHelp(path: string): string | undefined {
  const help = PAGE_HELP[path];
  return help ? bothText(help[0], help[1]) : undefined;
}

/** Label plus what the page does, for a tooltip that works before the page opens. */
export function navTitle(label: string, path: string): string {
  const name = withEl(label);
  const help = pageHelp(path);
  return help ? `${name} — ${help}` : name;
}
