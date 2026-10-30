/**
 * Buttons that ask the assistant for something used English prompts in every
 * language, so a Greek reader saw "What programs can I apply to?" appear in
 * their own chat. `localizePrompt` gives the Greek sentence the router
 * understands the same way; `promptLanguage.test.ts` proves each pair reaches
 * the same tool. Prompts it does not know pass through unchanged.
 */
type Rule = [RegExp, (match: RegExpExecArray) => string];

const EXACT: Record<string, string> = {
  'What programs can I apply to?': 'Σε ποια προγράμματα μπορώ να κάνω αίτηση;',
  'Find a fundraising mentor': 'Βρες μου μέντορα για χρηματοδότηση',
  'How do I become a mentor?': 'Πώς γίνομαι μέντορας;',
  'I want to learn about the Enterprise plan': 'Θέλω να μάθω για το πλάνο Enterprise',
  'Schedule a new event on my calendar': 'Κλείσε συνάντηση στο ημερολόγιο',
  'Record a $50k investment in my round': 'Κατάγραψε επένδυση $50k στον γύρο',
  'Tell me about SAFE agreement': 'Πες μου για το SAFE',
  'Invite 3 founders': 'Προσκάλεσε 3 ιδρυτές',
  'What does my founding team still lack?': 'Τι λείπει ακόμη από την ιδρυτική μου ομάδα;',
  'What is overdue?': 'Τι είναι εκπρόθεσμο;',
  'Give me a 7-day match plan': 'Φτιάξε μου πλάνο 7 ημερών',
  'add milestone': 'πρόσθεσε ορόσημο',
  'Can you help me refine my Lean Canvas?': 'Βοήθησέ με να βελτιώσω τον Lean canvas μου',
  'Tell me about readiness score': 'Πες μου για τον δείκτη ετοιμότητας',
  'What follow-ups are due?': 'Ποια follow-ups λήγουν;',
  'Walk me through setting up SSO for my organization': 'Δείξε μου βήμα-βήμα πώς στήνω SSO για τον οργανισμό μου',
  'Explain the scoring weights on this page': 'Εξήγησε τα βάρη βαθμολογίας αυτής της σελίδας',
  'Help me design a new subscription plan': 'Βοήθησέ με να σχεδιάσω νέο πλάνο συνδρομής',
  'Fill in my lean canvas': 'Συμπλήρωσε τα κενά στον καμβά μου',
  'Show my pipeline': 'Δείξε τη ροή επενδυτών μου',
  'What is still open in due diligence?': 'Τι εκκρεμεί στη δέουσα επιμέλεια;',
};

const PATTERNS: Rule[] = [
  [/^Apply to (.+)$/, (m) => `Κάνε αίτηση στο ${m[1]}`],
  [/^Tell me about readiness score and the (.+) achievement$/, (m) => `Πες μου για τον δείκτη ετοιμότητας και τη διάκριση ${m[1]}`],
  [/^Tell me about (.+)$/, (m) => `Πες μου για ${m[1]}`],
  [/^Why do I match with (.+)\?$/, (m) => `Γιατί ταιριάζω με ${m[1]};`],
  [/^What should I do about (.+)\?$/, (m) => `Τι να κάνω για το «${m[1]}»;`],
  [/^Draft a follow-up email to (.+)$/, (m) => `Γράψε follow-up email για ${m[1]}`],
  [/^Write my (.+) slides$/, (m) => `Γράψε τις διαφάνειες ${m[1]}`],
  [/^Draft my startup builder (\w+) module$/, (m) => `Γράψε την ενότητα ${m[1]} του startup builder`],
  [/^Share due diligence with (.+)$/, (m) => `Μοιράσου τη δέουσα επιμέλεια με ${m[1]}`],
];

export function localizePrompt(prompt: string, lang: 'en' | 'el'): string {
  if (lang !== 'el') return prompt;
  const exact = EXACT[prompt.trim()];
  if (exact) return exact;
  for (const [pattern, toGreek] of PATTERNS) {
    const match = pattern.exec(prompt.trim());
    if (match) return toGreek(match);
  }
  return prompt;
}

export const LOCALIZED_PROMPTS = EXACT;
