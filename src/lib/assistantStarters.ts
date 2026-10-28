/**
 * Starter prompts for the studio assistant — the chat widget shows them on an
 * empty conversation, the dashboard question box shows this page's set.
 */
const STARTERS: { en: string; el: string }[] = [
  { en: 'Who is my best match?', el: 'Ποια είναι η καλύτερη αντιστοίχιση;' },
  { en: 'What is overdue?', el: 'Τι είναι εκπρόθεσμο;' },
  { en: 'How is my round?', el: 'Πώς πάει ο γύρος;' },
  { en: 'Find a fundraising mentor', el: 'Βρες μέντορα για χρηματοδότηση' },
];

export const PAGE_STARTERS: Record<string, { en: string; el: string }[]> = {
  '/matches': [
    { en: 'Propose three people — do not send', el: 'Πρότεινε τρεις — χωρίς αποστολή' },
    { en: 'Open 6-axis match breakdown', el: 'Άνοιξε την ανάλυση 6 αξόνων' },
    { en: 'What does my founding team still lack?', el: 'Τι λείπει ακόμα στην ιδρυτική ομάδα;' },
  ],
  '/discovery': [{ en: 'Who is my best match?', el: 'Ποια είναι η καλύτερη αντιστοίχιση;' }],
  '/mentors': [{ en: 'Find a fundraising mentor', el: 'Βρες μέντορα για χρηματοδότηση' }],
  '/fundraising': [
    { en: 'How is my round?', el: 'Πώς πάει ο γύρος;' },
    { en: 'Open deal room', el: 'Άνοιξε το Deal Room' },
    { en: 'Set monthly burn to 18k', el: 'Όρισε το burn σε 18k' },
  ],
  '/events': [{ en: 'What events are coming?', el: 'Ποιες εκδηλώσεις έρχονται;' }],
  '/programs': [{ en: 'What programs can I apply to?', el: 'Σε ποια προγράμματα μπορώ να κάνω αίτηση;' }],
  '/perks': [{ en: 'What perks can I claim?', el: 'Ποιες παροχές μπορώ να διεκδικήσω;' }],
  '/milestones': [{ en: 'What is overdue?', el: 'Τι είναι εκπρόθεσμο;' }],
  '/calendar': [{ en: 'What events are coming?', el: 'Ποιες εκδηλώσεις έρχονται;' }],
  '/insights': [{ en: 'What is my readiness score?', el: 'Ποιο είναι το readiness score μου;' }],
  '/profile': [{ en: 'What does my founding team still lack?', el: 'Τι λείπει ακόμα στην ιδρυτική ομάδα;' }, { en: 'Change my headline to Building Aegean', el: 'Άλλαξε την επικεφαλίδα μου σε Building Aegean' }],
  '/network': [{ en: 'Draft a need card for a co-founder', el: 'Γράψε κάρτα ανάγκης για συνιδρυτή' }, { en: 'Invite 3 founders', el: 'Προσκάλεσε 3 ιδρυτές' }],
  '/workspace': [
    { en: 'Show my Lean Canvas', el: 'Δείξε το Lean Canvas μου' },
    { en: 'What is overdue?', el: 'Τι είναι εκπρόθεσμο;' },
    { en: 'Give me a 7-day match plan', el: 'Δώσε μου πλάνο 7 ημερών' },
  ],
  '/dashboard': [{ en: 'What should I do first?', el: 'Τι να κάνω πρώτα;' }, { en: 'Who should I meet this week?', el: 'Ποιον να γνωρίσω αυτή την εβδομάδα;' }],
  '/legal': [{ en: 'Tell me about SAFE agreement', el: 'Πες μου για το SAFE' }],
  '/resources': [{ en: 'What programs can I apply to?', el: 'Σε ποια προγράμματα μπορώ να κάνω αίτηση;' }],
  '/messages': [{ en: 'Search my messages for intro', el: 'Ψάξε στα μηνύματα για intro' }, { en: 'How do I start a voice call?', el: 'Πώς ξεκινάω φωνητική κλήση;' }],
  '/communities': [{ en: 'How do I create a community?', el: 'Πώς δημιουργώ κοινότητα;' }],
  '/founder-tools': [
    { en: 'Show my Startup Builder progress', el: 'Δείξε την πρόοδο στο Startup Builder' },
    { en: 'What is my readiness score?', el: 'Ποιο είναι το readiness score μου;' },
    { en: 'How do I export my pitch deck?', el: 'Πώς εξάγω το pitch;' },
  ],
  '/notifications': [{ en: 'Mark all notifications read', el: 'Σήμανε όλες τις ειδοποιήσεις ως αναγνωσμένες' }, { en: 'What is overdue?', el: 'Τι είναι εκπρόθεσμο;' }],
  '/settings': [{ en: 'Hide my email', el: 'Κρύψε το email μου' }, { en: 'What am I marked open to?', el: 'Σε τι είμαι ανοιχτός;' }],
  '/quiz': [{ en: 'What is my fit check?', el: 'Ποιο είναι το fit check μου;' }],
};

export type Starter = { en: string; el: string };

/** Mentor also serves Advisor accounts; Founder keeps the default set. */
const ROLE_STARTERS: Record<'mentor' | 'investor', Starter[]> = {
  mentor: [
    { en: 'Who booked a session with me?', el: 'Ποιος έκλεισε συνεδρία μαζί μου;' },
    { en: 'What should I prepare for my next session?', el: 'Τι να ετοιμάσω για την επόμενη συνεδρία;' },
    { en: 'Which founders match my expertise?', el: 'Ποια ιδρυτικά μέλη ταιριάζουν στην εμπειρία μου;' },
  ],
  investor: [
    { en: 'Which founders match my thesis?', el: 'Ποια ιδρυτικά μέλη ταιριάζουν στη θέση μου;' },
    { en: 'What changed in my watchlist?', el: 'Τι άλλαξε στη λίστα παρακολούθησης;' },
    { en: 'Which rounds are open now?', el: 'Ποιοι γύροι είναι ανοιχτοί τώρα;' },
  ],
};

export function roleStarters(role?: string | null): Starter[] {
  const key = (role || '').toLowerCase();
  if (key.includes('investor')) return ROLE_STARTERS.investor;
  if (key.includes('mentor') || key.includes('advisor')) return ROLE_STARTERS.mentor;
  return [];
}

export function startersFor(pathname: string, role?: string | null): { en: string; el: string }[] {
  const path = pathname.split('?')[0]?.replace(/\/+$/, '') || '/dashboard';
  const page = PAGE_STARTERS[path] ?? PAGE_STARTERS[path.split('/').slice(0, 2).join('/')] ?? [];
  const roleList = roleStarters(role);
  const rest = STARTERS.filter((item) => !page.some((p) => p.en === item.en) && !roleList.some((r) => r.en === item.en));
  return [...roleList, ...page, ...rest].slice(0, 4);
}

const foldText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** The slash-menu query: a leading '/', a single token, lower-cased. */
export function slashQuery(input: string): string {
  const query = input.startsWith('/') ? input.trim().toLowerCase() : '';
  return query && !query.includes(' ') ? query : '';
}

/**
 * Accent-insensitive slash filtering shared by the chat input and the
 * dashboard ask box: '/' alone lists everything, otherwise the token must
 * prefix the command or appear in the EN/EL label.
 */
export function filterSlash<T extends { cmd?: string; en: string; el: string }>(items: T[], input: string): T[] {
  const query = slashQuery(input);
  if (!query) return [];
  if (query === '/') return items;
  const needle = foldText(query.slice(1));
  return items.filter((item) =>
    (item.cmd ? item.cmd.startsWith(query) : false)
    || foldText(item.en).includes(needle)
    || foldText(item.el).includes(needle));
}
