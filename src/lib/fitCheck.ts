/**
 * Public 60-second fit check. Answers write the same fields Matches already
 * scores (role cover, stage, commitment, looking-for, working hours), so the
 * result is an input to ranking — not a personality brand.
 */
import { dataScope, keys, readValue, writeValue } from './localLists';

export type FitAnswer = {
  roleCover: 'builder' | 'gtm' | 'operator' | 'domain';
  stage: 'Idea' | 'Pre-seed' | 'Seed' | 'Series A';
  commitment: 'Part-time' | 'Full-time' | 'Advisory';
  lookingFor: string[];
  hours: 'city' | 'overlap' | 'async' | 'either';
};

export type FitResult = FitAnswer & {
  archetype: { en: string; el: string };
  why: { en: string; el: string };
  at: string;
};

type Option<T> = { id: T; en: string; el: string; lookingFor?: string[] };

export type FitQuestion = {
  id: keyof FitAnswer;
  en: string;
  el: string;
  why: { en: string; el: string };
  options: Option<string>[];
};

const LEGACY = 'cfb.fitCheck';

export const FIT_QUESTIONS: FitQuestion[] = [
  {
    id: 'roleCover',
    en: 'What do you already cover on a founding team?',
    el: 'Τι καλύπτεις ήδη σε μια ιδρυτική ομάδα;',
    why: { en: 'Skills weight is 35% of the match score.', el: 'Οι δεξιότητες είναι το 35% του σκορ.' },
    options: [
      { id: 'builder', en: 'Product and engineering', el: 'Προϊόν και μηχανική' },
      { id: 'gtm', en: 'Sales, growth and storytelling', el: 'Πωλήσεις, ανάπτυξη και αφήγηση' },
      { id: 'operator', en: 'Ops, finance and delivery', el: 'Λειτουργίες, οικονομικά και εκτέλεση' },
      { id: 'domain', en: 'Deep domain knowledge', el: 'Βαθιά γνώση του κλάδου' },
    ],
  },
  {
    id: 'stage',
    en: 'Where is the venture today?',
    el: 'Πού βρίσκεται το εγχείρημα σήμερα;',
    why: { en: 'Stage distance is 15% of the match score.', el: 'Η απόσταση σταδίου είναι το 15% του σκορ.' },
    options: [
      { id: 'Idea', en: 'Idea — still shaping the problem', el: 'Ιδέα — ακόμα σχηματίζω το πρόβλημα' },
      { id: 'Pre-seed', en: 'Prototype or first users', el: 'Πρωτότυπο ή πρώτοι χρήστες' },
      { id: 'Seed', en: 'Early revenue', el: 'Πρώτα έσοδα' },
      { id: 'Series A', en: 'Scaling what already works', el: 'Κλιμακώνω αυτό που ήδη δουλεύει' },
    ],
  },
  {
    id: 'commitment',
    en: 'How much time can you put in now?',
    el: 'Πόσο χρόνο μπορείς να βάλεις τώρα;',
    why: { en: 'Full-time vs part-time is scored, not guessed.', el: 'Πλήρης vs μερική απασχόληση βαθμολογείται, δεν εικάζεται.' },
    options: [
      { id: 'Part-time', en: 'Evenings and weekends', el: 'Απογεύματα και σαββατοκύριακα' },
      { id: 'Part-time', en: 'Part-time, a few weekdays', el: 'Μερική απασχόληση, μερικές καθημερινές' },
      { id: 'Full-time', en: 'Full-time now', el: 'Πλήρης απασχόληση τώρα' },
      { id: 'Advisory', en: 'Advisory until the team is set', el: 'Συμβουλευτικά μέχρι να κλείσει η ομάδα' },
    ],
  },
  {
    id: 'lookingFor',
    en: 'Who do you still need beside you?',
    el: 'Ποιον χρειάζεσαι ακόμα δίπλα σου;',
    why: { en: 'Matches rank people who cover what you still lack.', el: 'Οι αντιστοιχίσεις βαθμολογούν όσους καλύπτουν αυτό που λείπει.' },
    options: [
      { id: 'tech', en: 'A technical co-founder', el: 'Τεχνικό συνιδρυτή', lookingFor: ['TypeScript', 'React', 'Node.js'] },
      { id: 'gtm', en: 'A commercial co-founder', el: 'Εμπορικό συνιδρυτή', lookingFor: ['Sales', 'Growth', 'Partnerships'] },
      { id: 'ops', en: 'An operator', el: 'Operator', lookingFor: ['Operations', 'Finance', 'Delivery'] },
      { id: 'domain', en: 'A domain expert', el: 'Ειδικό του κλάδου', lookingFor: ['Research', 'Industry', 'Product strategy'] },
      { id: 'capital', en: 'Someone who opens investor doors', el: 'Κάποιον που ανοίγει πόρτες επενδυτών', lookingFor: ['Fundraising', 'Growth'] },
    ],
  },
  {
    id: 'hours',
    en: 'How should working hours line up?',
    el: 'Πώς πρέπει να ευθυγραμμίζονται οι ώρες εργασίας;',
    why: { en: 'Working hours are 10% of the score, from city and time zone.', el: 'Οι ώρες είναι το 10% του σκορ, από πόλη και ζώνη.' },
    options: [
      { id: 'city', en: 'Same city, same hours', el: 'Ίδια πόλη, ίδιες ώρες' },
      { id: 'overlap', en: 'Remote, with overlapping hours', el: 'Απομακρυσμένα, με κοινές ώρες' },
      { id: 'async', en: 'Remote and mostly async', el: 'Απομακρυσμένα και κυρίως ασύγχρονα' },
      { id: 'either', en: 'Either — the work matters more', el: 'Ό,τι να ’ναι — μετράει η δουλειά' },
    ],
  },
];

const ARCHETYPE: Record<FitAnswer['roleCover'], Record<string, { en: string; el: string }>> = {
  builder: {
    tech: { en: 'Builder seeking another builder', el: 'Builder που ψάχνει άλλον builder' },
    gtm: { en: 'Builder seeking a go-to-market partner', el: 'Builder που ψάχνει εμπορικό συνιδρυτή' },
    ops: { en: 'Builder seeking an operator', el: 'Builder που ψάχνει operator' },
    domain: { en: 'Builder seeking domain depth', el: 'Builder που ψάχνει βάθος κλάδου' },
    capital: { en: 'Builder seeking a fundraising partner', el: 'Builder που ψάχνει συνιδρυτή για κεφάλαια' },
  },
  gtm: {
    tech: { en: 'Commercial founder seeking a builder', el: 'Εμπορικός ιδρυτής που ψάχνει builder' },
    gtm: { en: 'Go-to-market pair looking to specialise', el: 'Δίδυμο GTM που θέλει να εξειδικευτεί' },
    ops: { en: 'Commercial founder seeking an operator', el: 'Εμπορικός ιδρυτής που ψάχνει operator' },
    domain: { en: 'Commercial founder seeking domain depth', el: 'Εμπορικός ιδρυτής που ψάχνει βάθος κλάδου' },
    capital: { en: 'Commercial founder seeking investor access', el: 'Εμπορικός ιδρυτής που ψάχνει πρόσβαση σε επενδυτές' },
  },
  operator: {
    tech: { en: 'Operator seeking a builder', el: 'Operator που ψάχνει builder' },
    gtm: { en: 'Operator seeking a go-to-market partner', el: 'Operator που ψάχνει εμπορικό συνιδρυτή' },
    ops: { en: 'Operator seeking a delivery pair', el: 'Operator που ψάχνει σύντροφο εκτέλεσης' },
    domain: { en: 'Operator seeking domain depth', el: 'Operator που ψάχνει βάθος κλάδου' },
    capital: { en: 'Operator seeking a fundraising partner', el: 'Operator που ψάχνει συνιδρυτή για κεφάλαια' },
  },
  domain: {
    tech: { en: 'Domain expert seeking a builder', el: 'Ειδικός κλάδου που ψάχνει builder' },
    gtm: { en: 'Domain expert seeking a go-to-market partner', el: 'Ειδικός κλάδου που ψάχνει εμπορικό συνιδρυτή' },
    ops: { en: 'Domain expert seeking an operator', el: 'Ειδικός κλάδου που ψάχνει operator' },
    domain: { en: 'Domain pair looking to ship', el: 'Δίδυμο κλάδου που θέλει να παραδώσει' },
    capital: { en: 'Domain expert seeking investor access', el: 'Ειδικός κλάδου που ψάχνει πρόσβαση σε επενδυτές' },
  },
};

const COVER_SKILLS: Record<FitAnswer['roleCover'], string[]> = {
  builder: ['TypeScript', 'React', 'Node.js', 'Product strategy'],
  gtm: ['Sales', 'Growth', 'Partnerships'],
  operator: ['Operations', 'Finance', 'Delivery'],
  domain: ['Research', 'Industry', 'Product strategy'],
};

export function scoreFit(answers: FitAnswer, lookingKey: string): FitResult {
  const byCover = ARCHETYPE[answers.roleCover];
  const archetype = byCover[lookingKey] ?? byCover.gtm ?? { en: 'Founder seeking a complement', el: 'Ιδρυτής που ψάχνει συμπλήρωμα' };
  return {
    ...answers,
    archetype,
    why: {
      en: `Matching will read skills as ${COVER_SKILLS[answers.roleCover].join(', ')}, looking-for as ${answers.lookingFor.join(', ')}, stage ${answers.stage}, commitment ${answers.commitment}.`,
      el: `Η αντιστοίχιση θα διαβάσει δεξιότητες ${COVER_SKILLS[answers.roleCover].join(', ')}, «τι ψάχνεις» ${answers.lookingFor.join(', ')}, στάδιο ${answers.stage}, δέσμευση ${answers.commitment}.`,
    },
    at: new Date().toISOString(),
  };
}

export function fitToProfilePatch(result: FitResult) {
  return {
    skills: COVER_SKILLS[result.roleCover],
    lookingFor: result.lookingFor,
    stage: result.stage,
    commitment: result.commitment,
    location: result.hours === 'city' ? 'Same city preferred' : result.hours === 'async' ? 'Remote async' : 'Remote',
  };
}

function asFit(value: unknown): FitResult | null {
  if (!value || typeof value !== 'object') return null;
  const parsed = value as FitResult;
  return parsed.archetype ? parsed : null;
}

/**
 * Older builds wrote the quiz to the unscoped key `cfb.fitCheck`. A signed-in
 * account now stores under `cfb.fitCheck@uid`; if this account has no scoped
 * copy yet, we move the legacy answers across once so they are not inherited
 * by the next account on this browser.
 */
function migrateLegacyFit(): FitResult | null {
  if (!dataScope()) return null;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LEGACY) : null;
    if (!raw) return null;
    const parsed = asFit(JSON.parse(raw));
    if (!parsed) return null;
    writeValue(keys.fitCheck, parsed);
    localStorage.removeItem(LEGACY);
    return parsed;
  } catch {
    return null;
  }
}

export function readFitCheck(): FitResult | null {
  const stored = asFit(readValue<FitResult | null>(keys.fitCheck, null));
  if (stored) return stored;
  return migrateLegacyFit();
}

export function writeFitCheck(result: FitResult): FitResult {
  writeValue(keys.fitCheck, result);
  if (dataScope()) {
    try { localStorage.removeItem(LEGACY); } catch { /* scoped copy is the record */ }
  }
  return result;
}

export function mergeFitIntoViewer<T extends { skills?: unknown; lookingFor?: unknown; stage?: string | null; commitment?: string | null; location?: string | null }>(profile: T | null): T | null {
  const fit = readFitCheck();
  if (!profile && !fit) return profile;
  if (!fit) return profile;
  const patch = fitToProfilePatch(fit);
  const base = profile ?? ({} as T);
  const hasSkills = Array.isArray(base.skills) && base.skills.length > 0;
  const hasLooking = Array.isArray(base.lookingFor) && base.lookingFor.length > 0;
  return {
    ...base,
    skills: hasSkills ? base.skills : patch.skills,
    lookingFor: hasLooking ? base.lookingFor : patch.lookingFor,
    stage: base.stage || patch.stage,
    commitment: base.commitment || patch.commitment,
    location: base.location || patch.location,
  };
}
