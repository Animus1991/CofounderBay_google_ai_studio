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
  '/matches': [{ en: 'Propose three people — do not send', el: 'Πρότεινε τρεις — χωρίς αποστολή' }, { en: 'What does my founding team still lack?', el: 'Τι λείπει ακόμα στην ιδρυτική ομάδα;' }],
  '/discovery': [{ en: 'Who is my best match?', el: 'Ποια είναι η καλύτερη αντιστοίχιση;' }],
  '/mentors': [{ en: 'Find a fundraising mentor', el: 'Βρες μέντορα για χρηματοδότηση' }],
  '/fundraising': [{ en: 'How is my round?', el: 'Πώς πάει ο γύρος;' }, { en: 'What programs can I apply to?', el: 'Σε ποια προγράμματα μπορώ να κάνω αίτηση;' }],
  '/events': [{ en: 'What events are coming?', el: 'Ποιες εκδηλώσεις έρχονται;' }],
  '/programs': [{ en: 'What programs can I apply to?', el: 'Σε ποια προγράμματα μπορώ να κάνω αίτηση;' }],
  '/perks': [{ en: 'What perks can I claim?', el: 'Ποιες παροχές μπορώ να διεκδικήσω;' }],
  '/milestones': [{ en: 'What is overdue?', el: 'Τι είναι εκπρόθεσμο;' }],
  '/calendar': [{ en: 'What events are coming?', el: 'Ποιες εκδηλώσεις έρχονται;' }],
  '/insights': [{ en: 'Tell me about readiness score', el: 'Πες μου για το readiness score' }],
  '/profile': [{ en: 'What does my founding team still lack?', el: 'Τι λείπει ακόμα στην ιδρυτική ομάδα;' }],
  '/network': [{ en: 'Draft a need card for a co-founder', el: 'Γράψε κάρτα ανάγκης για συνιδρυτή' }, { en: 'Invite 3 founders', el: 'Προσκάλεσε 3 ιδρυτές' }],
  '/workspace': [{ en: 'What is overdue?', el: 'Τι είναι εκπρόθεσμο;' }, { en: 'Give me a 7-day match plan', el: 'Δώσε μου πλάνο 7 ημερών' }],
  '/dashboard': [{ en: 'What should I do first?', el: 'Τι να κάνω πρώτα;' }, { en: 'Who should I meet this week?', el: 'Ποιον να γνωρίσω αυτή την εβδομάδα;' }],
  '/legal': [{ en: 'Tell me about SAFE agreement', el: 'Πες μου για το SAFE' }],
  '/resources': [{ en: 'What programs can I apply to?', el: 'Σε ποια προγράμματα μπορώ να κάνω αίτηση;' }],
  '/messages': [{ en: 'Search my messages for intro', el: 'Ψάξε στα μηνύματα για intro' }, { en: 'How do I start a voice call?', el: 'Πώς ξεκινάω φωνητική κλήση;' }],
  '/communities': [{ en: 'How do I create a community?', el: 'Πώς δημιουργώ κοινότητα;' }],
  '/founder-tools': [{ en: 'How do I export my pitch deck?', el: 'Πώς εξάγω το pitch;' }],
  '/notifications': [{ en: 'What is overdue?', el: 'Τι είναι εκπρόθεσμο;' }],
  '/settings': [{ en: 'What am I marked open to?', el: 'Σε τι είμαι ανοιχτός;' }],
  '/quiz': [{ en: 'What is my fit check?', el: 'Ποιο είναι το fit check μου;' }],
};

export function startersFor(pathname: string): { en: string; el: string }[] {
  const path = pathname.split('?')[0]?.replace(/\/+$/, '') || '/dashboard';
  const page = PAGE_STARTERS[path] ?? PAGE_STARTERS[path.split('/').slice(0, 2).join('/')] ?? [];
  const rest = STARTERS.filter((item) => !page.some((p) => p.en === item.en));
  return [...page, ...rest].slice(0, 4);
}
