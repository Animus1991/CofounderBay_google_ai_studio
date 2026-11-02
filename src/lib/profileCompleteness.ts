/**
 * How complete a profile is — one definition for the dashboard card, the
 * profile page, Insights and the "finish your profile" banner.
 *
 * Three numbers used to disagree for the same person: the dashboard weighed
 * ten fields (95% in the sample account), Insights counted eight booleans, and
 * the profile page showed a stored `profileCompletionScore` (40 in the sample).
 * The dashboard also looked only at `socialLinks`, so a founder who filled
 * LinkedIn on the profile page was still told "Missing: Social links".
 *
 * Weights favour what matching reads (skills and looking-for 15 each; industry,
 * stage, commitment, location 10 each), then what a person reads first (name,
 * bio 10 each), then role and links (5 each). They sum to 100.
 */
export type Bilingual = { en: string; el: string };

type ProfileLike = {
  fullName?: string | null;
  bio?: string | null;
  role?: string | null;
  roles?: readonly unknown[] | null;
  industry?: unknown;
  skills?: readonly unknown[] | null;
  lookingFor?: readonly unknown[] | null;
  stage?: string | null;
  commitment?: string | null;
  location?: string | null;
  socialLinks?: Record<string, unknown> | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  twitterUrl?: string | null;
  portfolioUrl?: string | null;
};

export type ProfileField = {
  key: 'fullName' | 'bio' | 'role' | 'industry' | 'skills' | 'lookingFor' | 'stage' | 'commitment' | 'location' | 'links';
  weight: number;
  label: Bilingual;
  addLabel: Bilingual;
  /** Where the field is edited. */
  href: string;
};

const filled = (value: unknown) => (typeof value === 'string' ? value.trim().length > 0 : value != null && value !== false);
const nonEmpty = (list: readonly unknown[] | null | undefined) => Array.isArray(list) && list.some(filled);

export const PROFILE_FIELDS: readonly (ProfileField & { has: (profile: ProfileLike) => boolean })[] = [
  { key: 'fullName', weight: 10, label: { en: 'Full Name', el: 'Ονοματεπώνυμο' }, addLabel: { en: 'full name', el: 'ονοματεπώνυμο' }, href: '/profile', has: (p) => filled(p.fullName) },
  { key: 'bio', weight: 10, label: { en: 'Bio', el: 'Βιογραφικό' }, addLabel: { en: 'bio', el: 'βιογραφικό' }, href: '/profile', has: (p) => filled(p.bio) },
  { key: 'role', weight: 5, label: { en: 'Role', el: 'Ρόλος' }, addLabel: { en: 'role', el: 'ρόλο' }, href: '/profile', has: (p) => filled(p.role) || nonEmpty(p.roles) },
  { key: 'industry', weight: 10, label: { en: 'Industry', el: 'Κλάδος' }, addLabel: { en: 'industry', el: 'κλάδο' }, href: '/profile', has: (p) => (Array.isArray(p.industry) ? nonEmpty(p.industry) : filled(p.industry)) },
  { key: 'skills', weight: 15, label: { en: 'Skills', el: 'Δεξιότητες' }, addLabel: { en: 'skills', el: 'δεξιότητες' }, href: '/profile', has: (p) => nonEmpty(p.skills) },
  { key: 'lookingFor', weight: 15, label: { en: 'Looking for', el: 'Τι ψάχνεις' }, addLabel: { en: 'what you are looking for', el: 'τι ψάχνεις' }, href: '/profile', has: (p) => nonEmpty(p.lookingFor) },
  { key: 'stage', weight: 10, label: { en: 'Stage', el: 'Στάδιο' }, addLabel: { en: 'stage', el: 'στάδιο' }, href: '/profile', has: (p) => filled(p.stage) },
  { key: 'commitment', weight: 10, label: { en: 'Commitment', el: 'Δέσμευση' }, addLabel: { en: 'commitment', el: 'δέσμευση' }, href: '/profile', has: (p) => filled(p.commitment) },
  { key: 'location', weight: 10, label: { en: 'Location', el: 'Τοποθεσία' }, addLabel: { en: 'location', el: 'τοποθεσία' }, href: '/profile', has: (p) => filled(p.location) },
  {
    key: 'links',
    weight: 5,
    label: { en: 'Social Links', el: 'Σύνδεσμοι' },
    addLabel: { en: 'social links', el: 'συνδέσμους' },
    href: '/settings',
    has: (p) =>
      Object.values(p.socialLinks ?? {}).some(filled) || [p.linkedinUrl, p.githubUrl, p.twitterUrl, p.portfolioUrl].some(filled),
  },
];

export type Completeness = {
  /** 0–100, the sum of the weights of the filled fields. */
  score: number;
  /** Missing fields, most valuable first. */
  missing: ProfileField[];
  filled: number;
  total: number;
};

export function profileCompleteness(profile: ProfileLike | null | undefined): Completeness {
  if (!profile) {
    return { score: 0, missing: PROFILE_FIELDS.map(strip).sort(byWeight), filled: 0, total: PROFILE_FIELDS.length };
  }
  let score = 0;
  const missing: ProfileField[] = [];
  for (const field of PROFILE_FIELDS) {
    if (field.has(profile)) score += field.weight;
    else missing.push(strip(field));
  }
  return { score, missing: missing.sort(byWeight), filled: PROFILE_FIELDS.length - missing.length, total: PROFILE_FIELDS.length };
}

function strip(field: ProfileField & { has: unknown }): ProfileField {
  return { key: field.key, weight: field.weight, label: field.label, addLabel: field.addLabel, href: field.href };
}

const byWeight = (a: ProfileField, b: ProfileField) => b.weight - a.weight;
