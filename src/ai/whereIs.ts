/**
 * "Where do I …?" — the assistant points to the exact place.
 *
 * Help used to stop at the page ("open Settings"). Each entry here names the
 * page, the tab or section, and the control as the page labels it, with a
 * link that opens that tab (pages that keep their tab in the URL:
 * Settings, Network, Fundraising, Founder Tools). Entries were checked against
 * the pages' own controls; `whereIs.test.ts` checks every link is a real route.
 */
import { fold, hasStem } from '../services/assistantText';
import type { AssistantResult } from '../services/assistantOps';

type Spot = {
  id: string;
  /** Folded stems in either language; the entry with the most hits wins. */
  keys: string[];
  /** Absent when the control is on every page (theme, language, search, pins). */
  href?: string;
  where: { en: string; el: string };
};

export const WHERE_IS: readonly Spot[] = [
  { id: 'pitch-export', keys: ['pitch', 'deck', 'export', 'download', 'print', 'pdf', 'share', 'εξαγωγ', 'κατεβασ', 'εκτυπωσ', 'λημψη'], href: '/founder-tools?tab=pitch', where: { en: 'Founder Tools → Pitch: the download icon above the slides gives a .doc outline; “Export PDF” and “Share” sit under the deck.', el: 'Εργαλεία ιδρυτή → Pitch: το εικονίδιο λήψης πάνω από τις διαφάνειες δίνει περίγραμμα .doc· τα «Export PDF» και «Share» είναι κάτω από το deck.' } },
  { id: 'pitch-edit', keys: ['pitch', 'deck', 'slide', 'edit', 'write', 'διαφανει', 'επεξεργασ'], href: '/founder-tools?tab=pitch', where: { en: 'Founder Tools → Pitch: pick a slide on the left, then “Edit” on the slide.', el: 'Εργαλεία ιδρυτή → Pitch: διάλεξε διαφάνεια αριστερά, μετά «Επεξεργασία» στη διαφάνεια.' } },
  { id: 'templates', keys: ['template', 'nda', 'safe', 'financial model', 'cap table', 'προτυπ', 'υποδειγμ', 'οικονομικο μοντελο'], href: '/founder-tools?tab=templates', where: { en: 'Founder Tools → Templates: each template downloads as a real file (the financial model as .csv).', el: 'Εργαλεία ιδρυτή → Πρότυπα: κάθε πρότυπο κατεβαίνει ως αρχείο (το οικονομικό μοντέλο ως .csv).' } },
  { id: 'builder', keys: ['startup builder', 'builder', 'module', 'δημιουργ', 'builder'], href: '/founder-tools?tab=builder', where: { en: 'Founder Tools → Builder: the six modules, from problem to go-to-market.', el: 'Εργαλεία ιδρυτή → Builder: οι έξι ενότητες, από το πρόβλημα ως το go-to-market.' } },
  { id: 'readiness', keys: ['readiness', 'score', 'ετοιμοτητ', 'δεικτ'], href: '/founder-tools', where: { en: 'Founder Tools → Dashboard: the readiness score is at the top.', el: 'Εργαλεία ιδρυτή → Πίνακας: ο δείκτης ετοιμότητας είναι στην κορυφή.' } },
  { id: 'data-room', keys: ['data room', 'dataroom', 'upload', 'document', 'file', 'ανεβασ', 'εγγραφ', 'αρχει'], href: '/fundraising', where: { en: 'Fundraising → Tracker → “Data room folders” → “Open data room” → Upload.', el: 'Χρηματοδότηση → Παρακολούθηση → «Φάκελοι data room» → «Άνοιγμα data room» → Ανέβασμα.' } },
  { id: 'round', keys: ['round', 'target', 'valuation', 'cap', 'burn', 'runway', 'cash', 'γυρο', 'αποτιμησ', 'στοχο'], href: '/fundraising', where: { en: 'Fundraising → Tracker: the pencil (“Edit round”) next to the round figures.', el: 'Χρηματοδότηση → Παρακολούθηση: το μολύβι («Επεξεργασία γύρου») δίπλα στα στοιχεία του γύρου.' } },
  { id: 'pipeline', keys: ['pipeline', 'investor', 'next step', 'follow', 'stage', 'crm', 'επενδυτ', 'ροη', 'σταδιο', 'επομενο βημα'], href: '/fundraising?tab=tracker', where: { en: 'Fundraising → Tracker → Investor pipeline: each row has its stage, its next step (pencil to edit) and the → to move it on.', el: 'Χρηματοδότηση → Παρακολούθηση → Ροή επενδυτών: κάθε γραμμή έχει στάδιο, επόμενο βήμα (μολύβι για αλλαγή) και → για το επόμενο στάδιο.' } },
  { id: 'investors', keys: ['find investors', 'investor directory', 'vc', 'angel', 'κατάλογ', 'βρες επενδυτ'], href: '/fundraising?tab=investors', where: { en: 'Fundraising → Investors: filter by type and press “Track” to add one to your pipeline.', el: 'Χρηματοδότηση → Επενδυτές: φίλτραρε κατά τύπο και πάτα «Παρακολούθηση» για να μπει στη ροή.' } },
  { id: 'programs', keys: ['program', 'accelerator', 'grant', 'apply', 'αιτησ', 'προγραμμ', 'επιχορηγησ'], href: '/programs', where: { en: 'Programs: each program has “Apply”; your applications are tracked in Founder Tools → Applications.', el: 'Προγράμματα: κάθε πρόγραμμα έχει «Αίτηση»· οι αιτήσεις σου φαίνονται στα Εργαλεία ιδρυτή → Αιτήσεις.' } },
  { id: 'theme', keys: ['theme', 'colour', 'color', 'dark mode', 'palette', 'θεμα', 'χρωμα', 'παλετ', 'σκουρο'], where: { en: 'Top right of every page: the palette button next to EN/EL. You can also say “/theme dark”.', el: 'Πάνω δεξιά σε κάθε σελίδα: το κουμπί παλέτας δίπλα στο EN/EL. Μπορείς και να πεις «/theme dark».' } },
  { id: 'language', keys: ['language', 'greek', 'english', 'γλωσσ', 'ελληνικ', 'αγγλικ'], where: { en: 'Top right of every page: the EN/EL button switches the language.', el: 'Πάνω δεξιά σε κάθε σελίδα: το κουμπί EN/EL αλλάζει τη γλώσσα.' } },
  { id: 'notifications', keys: ['notification', 'email', 'quiet hours', 'digest', 'ειδοποιησ', 'email', 'ωρες ησυχιας'], href: '/settings?tab=notifications', where: { en: 'Settings → Notifications: channels, digest frequency and quiet hours.', el: 'Ρυθμίσεις → Ειδοποιήσεις: κανάλια, συχνότητα σύνοψης και ώρες ησυχίας.' } },
  { id: 'privacy', keys: ['privacy', 'visible', 'who can see', 'hide', 'απορρητ', 'ορατ', 'κρυψ'], href: '/settings?tab=privacy', where: { en: 'Settings → Privacy: who sees your profile, contact details and activity.', el: 'Ρυθμίσεις → Απόρρητο: ποιος βλέπει το προφίλ, τα στοιχεία επικοινωνίας και τη δραστηριότητά σου.' } },
  { id: 'billing', keys: ['billing', 'plan', 'invoice', 'subscription', 'upgrade', 'payment', 'χρεωσ', 'συνδρομ', 'πληρωμ', 'τιμολογ'], href: '/settings?tab=billing', where: { en: 'Settings → Billing for your plan and invoices; Pricing compares plans.', el: 'Ρυθμίσεις → Χρέωση για το πλάνο και τα τιμολόγια· η Τιμολόγηση συγκρίνει πλάνα.' } },
  { id: 'account', keys: ['export my data', 'delete account', 'sign out', 'log out', 'password', 'εξαγωγη δεδομενων', 'διαγραφη λογαριασμ', 'αποσυνδεσ', 'κωδικ'], href: '/settings', where: { en: 'Settings → Account: “Export my data”, “Delete account” and “Sign out” are at the bottom.', el: 'Ρυθμίσεις → Λογαριασμός: «Εξαγωγή των δεδομένων μου», «Διαγραφή λογαριασμού» και «Αποσύνδεση» είναι στο κάτω μέρος.' } },
  { id: 'profile', keys: ['profile', 'photo', 'headline', 'bio', 'skills', 'προφιλ', 'φωτογραφ', 'δεξιοτητ'], href: '/profile', where: { en: 'Profile → “Edit profile” (photo, headline, skills, what you look for).', el: 'Προφίλ → «Επεξεργασία προφίλ» (φωτογραφία, τίτλος, δεξιότητες, τι ψάχνεις).' } },
  { id: 'canvas', keys: ['lean canvas', 'canvas', 'καμβα'], href: '/workspace', where: { en: 'Workspace → Lean Canvas card; “Edit” opens each box.', el: 'Χώρος εργασίας → κάρτα Lean canvas· η «Επεξεργασία» ανοίγει κάθε κουτί.' } },
  { id: 'tasks', keys: ['task', 'todo', 'to-do', 'εργασι', 'καθηκον'], href: '/workspace', where: { en: 'Workspace → Dashboard: the task board (or say “add task …”).', el: 'Χώρος εργασίας → Πίνακας: ο πίνακας εργασιών (ή πες «πρόσθεσε εργασία …»).' } },
  { id: 'milestones', keys: ['milestone', 'roadmap', 'deadline', 'οροσημ', 'προθεσμ'], href: '/milestones', where: { en: 'Milestones → “New milestone”; overdue ones are marked on the board.', el: 'Ορόσημα → «Νέο ορόσημο»· τα εκπρόθεσμα σημειώνονται στον πίνακα.' } },
  { id: 'calendar-export', keys: ['calendar', 'ics', 'google calendar', 'outlook', 'ημερολογ'], href: '/calendar', where: { en: 'Calendar → “Export calendar (.ics)” for Google Calendar or Outlook; “New session” adds one.', el: 'Ημερολόγιο → «Εξαγωγή ημερολογίου (.ics)» για Google Calendar ή Outlook· η «Νέα συνάντηση» προσθέτει.' } },
  { id: 'need-cards', keys: ['need card', 'need wall', 'καρτα αναγκ', 'αναγκ'], href: '/network?tab=needs', where: { en: 'Network → Need cards: what you need, the outcome and who is missing.', el: 'Δίκτυο → Κάρτες ανάγκης: τι χρειάζεσαι, το αποτέλεσμα και ποιος λείπει.' } },
  { id: 'saved', keys: ['saved', 'bookmark', 'watchlist', 'αποθηκευμεν'], href: '/network?tab=saved', where: { en: 'Network → Saved: people you saved from Matches or Explore.', el: 'Δίκτυο → Αποθηκευμένα: όσοι αποθήκευσες από Αντιστοιχίσεις ή Εξερεύνηση.' } },
  { id: 'match-filters', keys: ['filter', 'match', 'co-founder', 'cofounder', 'φιλτρ', 'αντιστοιχ', 'συνιδρυτ'], href: '/matches', where: { en: 'Matches: the filters (role, stage, location, skills) are above the list.', el: 'Αντιστοιχίσεις: τα φίλτρα (ρόλος, στάδιο, τοποθεσία, δεξιότητες) είναι πάνω από τη λίστα.' } },
  { id: 'messages', keys: ['message', 'inbox', 'chat', 'unread', 'new message', 'μηνυμ', 'συνομιλ', 'αδιαβαστ'], href: '/messages', where: { en: 'Messages → “New message”; the filter switches between all, unread and archived.', el: 'Μηνύματα → «Νέο μήνυμα»· το φίλτρο αλλάζει ανάμεσα σε όλα, αδιάβαστα και αρχειοθετημένα.' } },
  { id: 'specialists', keys: ['specialist', 'agent', 'pitch reviewer', 'advisor', 'ειδικ', 'συμβουλ'], href: '/messages', where: { en: 'Messages → Specialists: the pitch reviewer, the co-founder coach and the other AI specialists.', el: 'Μηνύματα → Ειδικοί: ο αξιολογητής pitch, ο σύμβουλος συνιδρυτών και οι άλλοι ειδικοί AI.' } },
  { id: 'perks', keys: ['perk', 'credit', 'aws', 'stripe', 'discount', 'παροχ', 'εκπτωσ'], href: '/perks', where: { en: 'Perks: “Claim” on each offer; claimed perks stay listed.', el: 'Παροχές: «Διεκδίκηση» σε κάθε προσφορά· όσες διεκδίκησες μένουν στη λίστα.' } },
  { id: 'legal', keys: ['legal', 'lawyer', 'incorporat', 'νομικ', 'δικηγορ', 'συσταση εταιρει'], href: '/legal', where: { en: 'Legal: templates by category and legal office hours (they go to your calendar).', el: 'Νομικά: πρότυπα ανά κατηγορία και νομικές ώρες γραφείου (μπαίνουν στο ημερολόγιο).' } },
  { id: 'pins', keys: ['pin', 'favourite', 'favorite', 'shortcut', 'home page', 'καρφιτσ', 'αγαπημεν', 'αρχικη σελιδα'], where: { en: 'The star in any page header pins it to the sidebar; “/home matches” makes a page your start page.', el: 'Το αστέρι στον τίτλο κάθε σελίδας την καρφιτσώνει στο πλαϊνό μενού· το «/home matches» την κάνει αρχική.' } },
  { id: 'search', keys: ['search', 'command', 'shortcut', 'cmd k', 'ctrl k', 'αναζητησ', 'συντομευσ'], where: { en: 'The search box at the top of every page (⌘K / Ctrl+K) finds pages, people and tools.', el: 'Το πεδίο αναζήτησης πάνω σε κάθε σελίδα (⌘K / Ctrl+K) βρίσκει σελίδες, ανθρώπους και εργαλεία.' } },
  { id: 'assistant', keys: ['assistant', 'ai studio', 'what can you do', 'βοηθ', 'τι μπορεις'], href: '/assistant', where: { en: 'AI Studio (top of the sidebar): the full conversation and the list of everything the assistant can do.', el: 'AI Studio (πάνω στο πλαϊνό μενού): όλη η συνομιλία και η λίστα με όσα μπορεί να κάνει ο βοηθός.' } },
  { id: 'fit-check', keys: ['fit check', 'quiz', 'archetype', 'κουιζ', 'αρχετυπ'], href: '/quiz', where: { en: 'Fit check (/quiz): five questions; the answers feed your match scores.', el: 'Fit check (/quiz): πέντε ερωτήσεις· οι απαντήσεις τροφοδοτούν τα σκορ αντιστοίχισης.' } },
  { id: 'insights', keys: ['insight', 'analytics', 'stats', 'badge', 'αναλυσ', 'στατιστικ'], href: '/insights', where: { en: 'Insights: your activity, progress and badges.', el: 'Αναλύσεις: δραστηριότητα, πρόοδος και διακρίσεις.' } },
];

/** "where…", "how do I find…", «πού…» — not "where are you from". */
const ASKS_WHERE = /^(?:where(?:'s| is| are| do| can| to)?|how (?:do|can) i (?:find|get to|open|change|export|download|turn)|how to (?:find|change|export|download)|που (?:ειναι|βρισκ|αλλαζ|κανω|μπορω|θα βρω|βρισκω)|που\s|πως (?:αλλαζ|βρισκ|κανω εξαγωγ|κατεβαζ))/;

export function whereIsResult(query: string): AssistantResult | null {
  const folded = fold(query.trim()).replace(/[?;]+$/, '');
  if (!ASKS_WHERE.test(folded)) return null;
  let best: { spot: Spot; hits: number } | null = null;
  for (const spot of WHERE_IS) {
    const hits = spot.keys.filter((key) => hasStem(folded, key)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { spot, hits };
  }
  if (!best) return null;
  const { spot } = best;
  return {
    tool: 'where-is',
    en: spot.where.en,
    el: spot.where.el,
    href: spot.href,
    links: spot.href ? [{ href: spot.href, en: 'Take me there', el: 'Πήγαινέ με εκεί' }] : [],
    sources: [{ kind: 'page', en: 'Studio map', el: 'Χάρτης του studio', href: '/assistant' }],
  };
}
