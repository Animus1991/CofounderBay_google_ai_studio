/**
 * The AI Studio's help entries, built from the same `pageRegistry` the menus,
 * ⌘K and the assistant's page table read — so when a page moves or its
 * one-line description changes, the answer here moves with it and cannot
 * drift into a stale copy (the failure mode of a hand-written FAQ).
 *
 * A few questions are about the assistant itself rather than a page; those
 * are written once below, next to the behaviour they describe.
 */
import { memberPages } from './pageRegistry';

export type HelpEntry = {
  id: string;
  q: { en: string; el: string };
  a: { en: string; el: string };
  /** A page the answer points at, when there is one. */
  href?: string;
};

/** Questions about the assistant itself — written once, next to what they describe. */
const STUDIO_ENTRIES: HelpEntry[] = [
  {
    id: 'what-changes',
    q: { en: 'What can the assistant change?', el: 'Τι μπορεί να αλλάξει ο βοηθός;' },
    a: {
      en: 'Anything in “What I can do” marked “Changes — asks first”, and only after your Confirm. Nothing changes silently.',
      el: 'Οτιδήποτε στο «Τι μπορώ να κάνω» με σήμα «Αλλάζει — ρωτά πρώτα», και μόνο μετά από επιβεβαίωσή σου. Τίποτα δεν αλλάζει σιωπηλά.',
    },
  },
  {
    id: 'undo',
    q: { en: 'How do I take a change back?', el: 'Πώς παίρνω πίσω μια αλλαγή;' },
    a: {
      en: 'Reversible changes offer Undo for a minute after Confirm, and the Action history lists what was decided — applied, undone, cancelled.',
      el: 'Οι αναστρέψιμες αλλαγές προσφέρουν «Αναίρεση» για ένα λεπτό μετά την επιβεβαίωση, και το Ιστορικό ενεργειών δείχνει τι αποφασίστηκε — εφαρμογή, αναίρεση, ακύρωση.',
    },
  },
  {
    id: 'slash-at',
    q: { en: 'What do / and @ do?', el: 'Τι κάνουν τα / και @;' },
    a: {
      en: '/ opens the commands. @ pins a person as context, so the next questions are about them.',
      el: 'Το / ανοίγει τις εντολές. Το @ καρφιτσώνει ένα άτομο ως συγκείμενο, ώστε οι επόμενες ερωτήσεις να αφορούν αυτό.',
    },
  },
  {
    id: 'where-reads',
    q: { en: 'Where does the assistant read from?', el: 'Από πού διαβάζει ο βοηθός;' },
    a: {
      en: 'The same lists the pages show — matches, milestones, your round, the calendar, messages. What you see is what it knows.',
      el: 'Από τις ίδιες λίστες που δείχνουν οι σελίδες — αντιστοιχίσεις, ορόσημα, ο γύρος, το ημερολόγιο, τα μηνύματα. Αυτό που βλέπεις είναι αυτό που ξέρει.',
    },
  },
  {
    id: 'limits',
    q: { en: 'What can’t it do?', el: 'Τι δεν μπορεί να κάνει;' },
    a: {
      en: 'It does not invent people, scores or amounts, and it never writes without your Confirm. Whatever is not an action gets an answer, not a change.',
      el: 'Δεν εφευρίσκει άτομα, σκορ ή ποσά, και δεν γράφει ποτέ χωρίς επιβεβαίωσή σου. Ό,τι δεν είναι ενέργεια παίρνει απάντηση, όχι αλλαγή.',
    },
  },
  {
    id: 'greek',
    q: { en: 'Does it understand Greek?', el: 'Καταλαβαίνει ελληνικά;' },
    a: {
      en: 'Yes — it answers in your interface language. The /lang command switches it.',
      el: 'Ναι — απαντά στη γλώσσα της γραμματοσειράς σου. Η εντολή /lang την αλλάζει.',
    },
  },
];

/** One entry per member page that carries a one-line description in the registry. */
function pageEntries(): HelpEntry[] {
  return memberPages()
    .filter((page) => page.help)
    .map((page) => ({
      id: `page-${page.path.replace(/\W+/g, '-')}`,
      q: { en: `What is ${page.label.en} for?`, el: `Σε τι χρησιμεύει η σελίδα «${page.label.el}»;` },
      a: page.help!,
      href: page.path,
    }));
}

/** The full list: the assistant's own questions first, then every page. */
export function helpEntries(): HelpEntry[] {
  return [...STUDIO_ENTRIES, ...pageEntries()];
}
