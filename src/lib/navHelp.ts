import { bothText, withEl } from './labels';

/** What a page is for. Hover and the command list say this before the page opens. */
const PAGE_HELP: Record<string, readonly [string, string]> = {
  '/dashboard': ['Next step, matches, and what changed today', 'Επόμενο βήμα, αντιστοιχίσεις και τι άλλαξε σήμερα'],
  '/founder-tools': ['Diagnostics from an idea to a pitch you can share', 'Διάγνωση από την ιδέα ως μια παρουσίαση που μοιράζεστε'],
  '/fundraising': ['Your round, investors, and programs you can apply to', 'Ο γύρος σας, επενδυτές και προγράμματα για αίτηση'],
  '/workspace': ['Tasks, canvas, milestones, and the calendar in one place', 'Εργασίες, καμβάς, ορόσημα και ημερολόγιο μαζί'],
  '/milestones': ['Goals on a board, with progress and due dates', 'Στόχοι σε πίνακα, με πρόοδο και προθεσμίες'],
  '/calendar': ['Calls, sessions, and events on your days', 'Κλήσεις, συναντήσεις και εκδηλώσεις στις μέρες σας'],
  '/discovery': ['Founders, communities, opportunities, and events', 'Ιδρυτές, κοινότητες, ευκαιρίες και εκδηλώσεις'],
  '/matches': ['People ranked by shared skills and industry', 'Άνθρωποι με σειρά από κοινές δεξιότητες και κλάδο'],
  '/mentors': ['Mentors you can read and contact', 'Μέντορες που διαβάζετε και τους στέλνετε μήνυμα'],
  '/communities': ['Groups you can read and post in', 'Ομάδες που διαβάζετε και δημοσιεύετε'],
  '/community': ['Groups you can read and post in', 'Ομάδες που διαβάζετε και δημοσιεύετε'],
  '/events': ['Meetups and deadlines you can open', 'Συναντήσεις και προθεσμίες που ανοίγετε'],
  '/programs': ['Accelerators, grants, and cohorts', 'Επιταχυντές, επιχορηγήσεις και ομάδες'],
  '/network': ['Connections, endorsements, and saved profiles', 'Συνδέσεις, συστάσεις και αποθηκευμένα προφίλ'],
  '/messages': ['Conversations with one person at a time', 'Συνομιλίες με ένα άτομο κάθε φορά'],
  '/resources': ['Guides and services for the work in front of you', 'Οδηγοί και υπηρεσίες για τη δουλειά μπροστά σας'],
  '/insights': ['Charts of how your profile and matches move', 'Γραφήματα για το προφίλ και τις αντιστοιχίσεις'],
  '/legal': ['Templates and notes for the legal work', 'Πρότυπα και σημειώσεις για τα νομικά'],
  '/perks': ['Partner discounts and credits', 'Εκπτώσεις και πιστώσεις συνεργατών'],
  '/profile': ['How other people see you, and what is still missing', 'Πώς σας βλέπουν οι άλλοι, και τι λείπει ακόμη'],
  '/notifications': ['Alerts that wait for you', 'Ειδοποιήσεις που σας περιμένουν'],
  '/settings': ['Account, privacy, and billing', 'Λογαριασμός, απόρρητο και χρεώσεις'],
  '/pricing': ['Plans and what each one includes', 'Πλάνα και τι περιλαμβάνει το καθένα'],
  '/admin': ['Platform health and what waits on an admin', 'Υγεία της πλατφόρμας και τι περιμένει τον διαχειριστή'],
  '/admin/users': ['Search and review member accounts', 'Αναζήτηση και έλεγχος λογαριασμών'],
  '/admin/automation': ['Rules that run without a manual click', 'Κανόνες που τρέχουν χωρίς χειροκίνητο κλικ'],
  '/admin/branding': ['Logo, colors, and the name members see', 'Λογότυπο, χρώματα και το όνομα που βλέπουν τα μέλη'],
  '/logout': ['Leaves this account and returns to the start', 'Αφήνει αυτόν τον λογαριασμό και γυρίζει στην αρχή'],
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
