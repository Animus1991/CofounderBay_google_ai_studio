/**
 * One vocabulary for the whole product.
 *
 * Onboarding, Settings, Profile, the filters on Matches and Explore, and the
 * compatibility scorer all read these lists, so a value chosen in one place is
 * understood everywhere. Stored values stay in English; `label` gives the
 * active-language text.
 */
import { getLang } from './language';

export type Term = { value: string; el: string };

const pick = (term: Term) => (getLang() === 'el' ? term.el : term.value);

// ── Stages ────────────────────────────────────────────────────────────────

export const STAGES: (Term & { hint: string; hintEl: string })[] = [
  { value: 'Idea', el: 'Ιδέα', hint: 'Shaping the problem', hintEl: 'Διαμορφώνεις το πρόβλημα' },
  { value: 'Pre-seed', el: 'Pre-seed', hint: 'Prototype or first users', hintEl: 'Πρωτότυπο ή πρώτοι χρήστες' },
  { value: 'Seed', el: 'Seed', hint: 'Early revenue and traction', hintEl: 'Πρώτα έσοδα και απήχηση' },
  { value: 'Series A', el: 'Series A', hint: 'Scaling what already works', hintEl: 'Κλιμακώνεις ό,τι ήδη δουλεύει' },
  { value: 'Growth', el: 'Ανάπτυξη', hint: 'Established and growing', hintEl: 'Καθιερωμένη και σε ανάπτυξη' },
];

const STAGE_ALIASES: Record<string, string> = {
  idea: 'Idea',
  ideation: 'Idea',
  prototype: 'Pre-seed',
  mvp: 'Pre-seed',
  'pre-seed': 'Pre-seed',
  preseed: 'Pre-seed',
  'early traction': 'Seed',
  seed: 'Seed',
  'series a': 'Series A',
  'series-a': 'Series A',
  'series b+': 'Growth',
  scaling: 'Growth',
  scale: 'Growth',
  growth: 'Growth',
  exited: 'Growth',
};

/** Any stored stage (including older onboarding values such as "MVP") mapped onto STAGES. */
export function canonicalStage(value: string | null | undefined): string {
  if (!value) return '';
  return STAGE_ALIASES[value.trim().toLowerCase()] ?? value;
}

export function stageLabel(value: string | null | undefined): string {
  const canonical = canonicalStage(value);
  const term = STAGES.find((item) => item.value === canonical);
  return term ? pick(term) : canonical;
}

// ── Commitment ────────────────────────────────────────────────────────────

export const COMMITMENTS: (Term & { hint: string; hintEl: string })[] = [
  { value: 'Full-time', el: 'Πλήρης απασχόληση', hint: 'All in, now', hintEl: 'Πλήρης αφοσίωση, από τώρα' },
  { value: 'Part-time', el: 'Μερική απασχόληση', hint: 'Alongside other work', hintEl: 'Παράλληλα με άλλη δουλειά' },
  { value: 'Advisory', el: 'Συμβουλευτικά', hint: 'A few hours a month', hintEl: 'Λίγες ώρες τον μήνα' },
  { value: 'Exploring', el: 'Διερευνητικά', hint: 'Still deciding', hintEl: 'Ακόμη το σκέφτεσαι' },
];

export function commitmentLabel(value: string | null | undefined): string {
  if (!value) return '';
  const v = value.toLowerCase();
  const term = COMMITMENTS.find((item) => item.value.toLowerCase() === v)
    ?? (v.includes('side') ? COMMITMENTS[1] : v.includes('weekend') ? COMMITMENTS[1] : undefined);
  return term ? pick(term) : value;
}

// ── Roles a person holds on the platform ──────────────────────────────────

export const PERSON_ROLES: (Term & { hint: string; hintEl: string })[] = [
  { value: 'Founder', el: 'Ιδρυτής', hint: 'Building or about to build a startup', hintEl: 'Χτίζεις ή ετοιμάζεσαι να χτίσεις startup' },
  { value: 'Co-Founder Candidate', el: 'Υποψήφιος συνιδρυτής', hint: 'Looking to join a founding team', hintEl: 'Θέλεις να μπεις σε ιδρυτική ομάδα' },
  { value: 'Mentor', el: 'Μέντορας', hint: 'Sharing experience with founders', hintEl: 'Μοιράζεσαι εμπειρία με ιδρυτές' },
  { value: 'Investor', el: 'Επενδυτής', hint: 'Backing early-stage teams', hintEl: 'Στηρίζεις ομάδες σε πρώιμο στάδιο' },
  { value: 'Advisor', el: 'Σύμβουλος', hint: 'Advising on a specific area', hintEl: 'Συμβουλεύεις σε συγκεκριμένο τομέα' },
];

export function roleLabel(value: string | null | undefined): string {
  if (!value) return '';
  const term = PERSON_ROLES.find((item) => item.value.toLowerCase() === value.toLowerCase());
  return term ? pick(term) : value;
}

// ── Industries ────────────────────────────────────────────────────────────

export const INDUSTRIES: Term[] = [
  { value: 'AI', el: 'Τεχνητή νοημοσύνη' },
  { value: 'FinTech', el: 'FinTech' },
  { value: 'SaaS', el: 'SaaS' },
  { value: 'HealthTech', el: 'Υγεία (HealthTech)' },
  { value: 'CleanTech', el: 'Κλίμα και ενέργεια' },
  { value: 'EdTech', el: 'Εκπαίδευση (EdTech)' },
  { value: 'E-commerce', el: 'Ηλεκτρονικό εμπόριο' },
  { value: 'Marketplaces', el: 'Πλατφόρμες αγοράς' },
  { value: 'Deep Tech', el: 'Deep tech' },
  { value: 'Consumer', el: 'Καταναλωτικά προϊόντα' },
  { value: 'Developer tools', el: 'Εργαλεία προγραμματιστών' },
  { value: 'Cybersecurity', el: 'Κυβερνοασφάλεια' },
  { value: 'Mobility', el: 'Κινητικότητα' },
  { value: 'PropTech', el: 'Ακίνητα (PropTech)' },
  { value: 'AgriFood', el: 'Αγροδιατροφή' },
  { value: 'Tourism', el: 'Τουρισμός' },
  { value: 'Shipping', el: 'Ναυτιλία' },
  { value: 'Logistics', el: 'Εφοδιαστική αλυσίδα' },
  { value: 'Media', el: 'Μέσα και περιεχόμενο' },
  { value: 'Gaming', el: 'Gaming' },
  { value: 'Web3', el: 'Web3' },
  { value: 'Biotech', el: 'Βιοτεχνολογία' },
  { value: 'Hardware & IoT', el: 'Hardware και IoT' },
  { value: 'Social impact', el: 'Κοινωνικός αντίκτυπος' },
  { value: 'Other', el: 'Άλλο' },
];

const INDUSTRY_ALIASES: Record<string, string> = {
  technology: 'SaaS',
  tech: 'SaaS',
  finance: 'FinTech',
  fintech: 'FinTech',
  health: 'HealthTech',
  healthtech: 'HealthTech',
  climate: 'CleanTech',
  sustainability: 'CleanTech',
  cleantech: 'CleanTech',
  education: 'EdTech',
  edtech: 'EdTech',
  consumer: 'Consumer',
  'ai/ml': 'AI',
  ai: 'AI',
  'artificial intelligence': 'AI',
  'e-commerce': 'E-commerce',
  ecommerce: 'E-commerce',
  marketplace: 'Marketplaces',
  marketplaces: 'Marketplaces',
  'deep tech': 'Deep Tech',
  deeptech: 'Deep Tech',
  web3: 'Web3',
  crypto: 'Web3',
  iot: 'Hardware & IoT',
};

export function canonicalIndustry(value: string | null | undefined): string {
  if (!value) return '';
  const hit = INDUSTRIES.find((item) => item.value.toLowerCase() === value.trim().toLowerCase());
  if (hit) return hit.value;
  return INDUSTRY_ALIASES[value.trim().toLowerCase()] ?? value;
}

export function industryLabel(value: string | null | undefined): string {
  const canonical = canonicalIndustry(value);
  const term = INDUSTRIES.find((item) => item.value === canonical);
  return term ? pick(term) : canonical;
}

// ── Skills (what you cover, and what you look for) ────────────────────────

export const SKILL_GROUPS: { id: string; en: string; el: string; skills: Term[] }[] = [
  {
    id: 'build',
    en: 'Engineering',
    el: 'Τεχνολογία',
    skills: [
      { value: 'TypeScript', el: 'TypeScript' },
      { value: 'React', el: 'React' },
      { value: 'Node.js', el: 'Node.js' },
      { value: 'Python', el: 'Python' },
      { value: 'Mobile development', el: 'Εφαρμογές κινητού' },
      { value: 'Machine learning', el: 'Μηχανική μάθηση' },
      { value: 'MLOps', el: 'MLOps' },
      { value: 'Data engineering', el: 'Μηχανική δεδομένων' },
      { value: 'Cloud & DevOps', el: 'Cloud και DevOps' },
      { value: 'Security', el: 'Ασφάλεια πληροφοριών' },
      { value: 'Embedded systems', el: 'Ενσωματωμένα συστήματα' },
      { value: 'Blockchain', el: 'Blockchain' },
    ],
  },
  {
    id: 'product',
    en: 'Product and design',
    el: 'Προϊόν και σχεδιασμός',
    skills: [
      { value: 'Product strategy', el: 'Στρατηγική προϊόντος' },
      { value: 'Product management', el: 'Διαχείριση προϊόντος' },
      { value: 'UX research', el: 'Έρευνα χρηστών' },
      { value: 'Product design', el: 'Σχεδιασμός προϊόντος' },
      { value: 'Figma', el: 'Figma' },
      { value: 'Prototyping', el: 'Πρωτοτυποποίηση' },
      { value: 'Branding', el: 'Εταιρική ταυτότητα' },
    ],
  },
  {
    id: 'market',
    en: 'Go-to-market',
    el: 'Αγορά και πωλήσεις',
    skills: [
      { value: 'Sales', el: 'Πωλήσεις' },
      { value: 'Enterprise sales', el: 'Εταιρικές πωλήσεις' },
      { value: 'Growth', el: 'Growth' },
      { value: 'Marketing', el: 'Μάρκετινγκ' },
      { value: 'Lifecycle marketing', el: 'Lifecycle marketing' },
      { value: 'SEO', el: 'SEO' },
      { value: 'Content', el: 'Περιεχόμενο' },
      { value: 'Partnerships', el: 'Συνεργασίες' },
      { value: 'Community', el: 'Κοινότητα' },
      { value: 'Pricing', el: 'Τιμολόγηση' },
    ],
  },
  {
    id: 'operate',
    en: 'Operations and finance',
    el: 'Λειτουργία και οικονομικά',
    skills: [
      { value: 'Operations', el: 'Επιχειρησιακά' },
      { value: 'Finance', el: 'Οικονομικά' },
      { value: 'Fundraising', el: 'Άντληση κεφαλαίων' },
      { value: 'Legal', el: 'Νομικά' },
      { value: 'Regulatory', el: 'Κανονιστική συμμόρφωση' },
      { value: 'Hiring', el: 'Προσλήψεις' },
      { value: 'Supply chain', el: 'Εφοδιαστική αλυσίδα' },
      { value: 'Customer success', el: 'Εξυπηρέτηση πελατών' },
    ],
  },
  {
    id: 'domain',
    en: 'Domain',
    el: 'Γνώση κλάδου',
    skills: [
      { value: 'Research', el: 'Έρευνα' },
      { value: 'Industry expertise', el: 'Γνώση κλάδου' },
      { value: 'Statistics', el: 'Στατιστική' },
      { value: 'Clinical trials', el: 'Κλινικές μελέτες' },
    ],
  },
];

export const ALL_SKILLS: Term[] = SKILL_GROUPS.flatMap((group) => group.skills);

export function skillLabel(value: string | null | undefined): string {
  if (!value) return '';
  const term = ALL_SKILLS.find((item) => item.value.toLowerCase() === value.trim().toLowerCase());
  return term ? pick(term) : value;
}

/** Comma, semicolon or new-line separated text → unique trimmed skills, canonical spelling where known. */
export function parseSkills(raw: string | string[] | null | undefined): string[] {
  const parts = Array.isArray(raw) ? raw : String(raw ?? '').split(/[,;\n]/);
  const out: string[] = [];
  for (const part of parts) {
    const text = String(part).trim();
    if (!text) continue;
    const known = ALL_SKILLS.find((item) => item.value.toLowerCase() === text.toLowerCase() || item.el.toLowerCase() === text.toLowerCase());
    const value = known ? known.value : text.slice(0, 40);
    if (!out.some((item) => item.toLowerCase() === value.toLowerCase())) out.push(value);
  }
  return out.slice(0, 20);
}

// ── What a person is open to ──────────────────────────────────────────────

export type OpenToId = 'cofounder' | 'joinTeam' | 'mentor' | 'mentoring' | 'investor' | 'advisor' | 'hiring';

export const OPEN_TO: { id: OpenToId; en: string; el: string }[] = [
  { id: 'cofounder', en: 'Finding a co-founder', el: 'Εύρεση συνιδρυτή' },
  { id: 'joinTeam', en: 'Joining a founding team', el: 'Ένταξη σε ιδρυτική ομάδα' },
  { id: 'mentor', en: 'Getting a mentor', el: 'Εύρεση μέντορα' },
  { id: 'mentoring', en: 'Mentoring founders', el: 'Καθοδήγηση ιδρυτών' },
  { id: 'investor', en: 'Meeting investors', el: 'Γνωριμία με επενδυτές' },
  { id: 'advisor', en: 'Advising startups', el: 'Συμβουλευτική σε startups' },
  { id: 'hiring', en: 'Hiring early team members', el: 'Προσλήψεις πρώτων μελών' },
];

export function openToLabel(id: string): string {
  const item = OPEN_TO.find((entry) => entry.id === id);
  if (!item) return id;
  return getLang() === 'el' ? item.el : item.en;
}

// ── Profile visibility ────────────────────────────────────────────────────

export type Visibility = 'Public' | 'Members' | 'Private';

export const VISIBILITY: { value: Visibility; en: string; el: string; hint: string; hintEl: string }[] = [
  { value: 'Public', en: 'Public', el: 'Δημόσιο', hint: 'Members see your profile and you can share a public link.', hintEl: 'Τα μέλη βλέπουν το προφίλ σου και μπορείς να μοιραστείς δημόσιο σύνδεσμο.' },
  { value: 'Members', en: 'Members only', el: 'Μόνο για μέλη', hint: 'Only signed-in members can see your profile.', hintEl: 'Μόνο συνδεδεμένα μέλη βλέπουν το προφίλ σου.' },
  { value: 'Private', en: 'Hidden', el: 'Κρυφό', hint: 'You do not appear in search or matches.', hintEl: 'Δεν εμφανίζεσαι σε αναζητήσεις ή αντιστοιχίσεις.' },
];

// ── Availability ──────────────────────────────────────────────────────────

export const AVAILABILITY: Term[] = [
  { value: 'Immediate', el: 'Άμεσα' },
  { value: 'Flexible', el: 'Ευέλικτα' },
  { value: '1 week notice', el: 'Σε 1 εβδομάδα' },
  { value: '2 weeks notice', el: 'Σε 2 εβδομάδες' },
  { value: '1 month notice', el: 'Σε 1 μήνα' },
];

export function availabilityLabel(value: string | null | undefined): string {
  if (!value) return '';
  const term = AVAILABILITY.find((item) => item.value === value);
  return term ? pick(term) : value;
}

export function termLabel(term: Term): string {
  return pick(term);
}
