import { isDemoData, keys, readValue } from './localLists';
import { getLang } from './language';

export interface BuilderModule {
  id: number;
  title: string;
  titleEl: string;
}

export const BUILDER_MODULES: BuilderModule[] = [
  { id: 1, title: 'Problem Definition', titleEl: 'Ορισμός προβλήματος' },
  { id: 2, title: 'Solution & Value Prop', titleEl: 'Λύση και πρόταση αξίας' },
  { id: 3, title: 'Market Analysis', titleEl: 'Ανάλυση αγοράς' },
  { id: 4, title: 'Business Model', titleEl: 'Επιχειρηματικό μοντέλο' },
  { id: 5, title: 'Go-to-Market Strategy', titleEl: 'Στρατηγική go-to-market' },
];

type Pair = { en: string; el: string };
export interface BuilderModuleContent {
  title: Pair;
  description: Pair;
  questions: Pair[];
}

export const BUILDER_CONTENT: Record<number, BuilderModuleContent> = {
  1: {
    title: { en: 'Problem Definition', el: 'Ορισμός προβλήματος' },
    description: { en: 'What is the core problem you are solving? Who suffers from it most?', el: 'Ποιο είναι το βασικό πρόβλημα που λύνεις; Ποιος το ζει πιο έντονα;' },
    questions: [
      { en: 'Describe the problem in one sentence.', el: 'Περίγραψε το πρόβλημα σε μία πρόταση.' },
      { en: 'How do people solve this today?', el: 'Πώς το λύνουν σήμερα;' },
      { en: 'What is the cost of the problem (time, money, health)?', el: 'Ποιο είναι το κόστος του προβλήματος (χρόνος, χρήμα, υγεία);' },
    ],
  },
  2: {
    title: { en: 'Solution & Value Prop', el: 'Λύση και πρόταση αξίας' },
    description: { en: 'How does your product solve the problem? What makes it unique?', el: 'Πώς το προϊόν σου λύνει το πρόβλημα; Τι το κάνει μοναδικό;' },
    questions: [
      { en: 'What is your unique solution?', el: 'Ποια είναι η μοναδική σου λύση;' },
      { en: 'What are the top 3 features?', el: 'Ποια είναι τα 3 βασικά χαρακτηριστικά;' },
      { en: 'Why will customers choose you over alternatives?', el: 'Γιατί θα σε διαλέξουν οι πελάτες αντί για εναλλακτικές;' },
    ],
  },
  3: {
    title: { en: 'Market Analysis', el: 'Ανάλυση αγοράς' },
    description: { en: 'How big is the opportunity? Who are your competitors?', el: 'Πόσο μεγάλη είναι η ευκαιρία; Ποιοι είναι οι ανταγωνιστές σου;' },
    questions: [
      { en: 'What is your TAM, SAM, and SOM?', el: 'Ποιο είναι το TAM, SAM και SOM σου;' },
      { en: 'Who are your top 3 competitors?', el: 'Ποιοι είναι οι 3 βασικοί ανταγωνιστές σου;' },
      { en: 'What is your market entry strategy?', el: 'Ποια είναι η στρατηγική εισόδου στην αγορά;' },
    ],
  },
  4: {
    title: { en: 'Business Model', el: 'Επιχειρηματικό μοντέλο' },
    description: { en: 'How does your startup generate revenue and sustain growth?', el: 'Πώς το startup σου βγάζει έσοδα και στηρίζει την ανάπτυξη;' },
    questions: [
      { en: 'What is your primary revenue model (subscription, transactional, freemium)?', el: 'Ποιο είναι το βασικό μοντέλο εσόδων (subscription, transactional, freemium);' },
      { en: 'What is your projected LTV:CAC ratio?', el: 'Ποιος είναι ο προβλεπόμενος λόγος LTV:CAC;' },
      { en: 'What are your unit economics at scale?', el: 'Ποια είναι τα unit economics σε κλίμακα;' },
    ],
  },
  5: {
    title: { en: 'Go-to-Market Strategy', el: 'Στρατηγική go-to-market' },
    description: { en: 'How will you acquire your first 100, then 1,000 customers?', el: 'Πώς θα αποκτήσεις τους πρώτους 100, και μετά τους 1.000 πελάτες;' },
    questions: [
      { en: 'What are your primary acquisition channels?', el: 'Ποια είναι τα βασικά κανάλια απόκτησης;' },
      { en: 'Who is your ideal customer profile (ICP)?', el: 'Ποιο είναι το ideal customer profile (ICP) σου;' },
      { en: 'What is your 90-day launch plan?', el: 'Ποιο είναι το πλάνο launch 90 ημερών;' },
    ],
  },
};

export type BuilderStatus = 'Not started' | 'In-Progress' | 'Completed';

/** Saved-answer status for one module plus its fill count. */
export function builderStatus(id: number, inputs: Record<string, string>): { status: BuilderStatus; filled: number; total: number } {
  const total = BUILDER_CONTENT[id]?.questions.length ?? 0;
  const filled = Array.from({ length: total }, (_, i) => (inputs[`${id}-${i}`] ?? '').trim()).filter(Boolean).length;
  const status: BuilderStatus = filled === 0 ? 'Not started' : filled >= total ? 'Completed' : 'In-Progress';
  return { status, filled, total };
}

/** Demo answers — modules 1–2 filled, module 3 started — so the staged look is real data. */
export const DEMO_BUILDER_INPUTS: Record<'en' | 'el', Record<string, string>> = {
  en: {
    '1-0': 'Founders jump between five tools to find a co-founder.',
    '1-1': 'They ask their network, post in forums, or cold-message strangers.',
    '1-2': 'Weeks of searching before a first real conversation.',
    '2-0': 'One place that matches founders on skills, goals and stage.',
    '2-1': 'Match score, fit check and a direct intro.',
    '2-2': 'The match is explained — never a black box.',
    '3-0': 'Founders actively looking for a co-founder right now.',
  },
  el: {
    '1-0': 'Τα ιδρυτικά μέλη πηγαίνουν από εργαλείο σε εργαλείο για να βρουν συνιδρυτή.',
    '1-1': 'Ρωτούν το δίκτυό τους, γράφουν σε forum ή στέλνουν κρύα μηνύματα.',
    '1-2': 'Εβδομάδες αναζήτησης πριν την πρώτη ουσιαστική συζήτηση.',
    '2-0': 'Ένα μέρος που ταιριάζει ιδρυτικά μέλη σε δεξιότητες, στόχους και στάδιο.',
    '2-1': 'Σκορ αντιστοίχισης, fit check και απευθείας γνωριμία.',
    '2-2': 'Η αντιστοίχιση εξηγείται — ποτέ μαύρο κουτί.',
    '3-0': 'Ιδρυτικά μέλη που ψάχνουν ενεργά συνιδρυτή αυτή τη στιγμή.',
  },
};

export function readBuilderInputs(): Record<string, string> {
  const stored = readValue<Record<string, string>>(keys.builderInputs, {});
  if (Object.keys(stored).length === 0 && isDemoData()) return DEMO_BUILDER_INPUTS[getLang()];
  return stored;
}
