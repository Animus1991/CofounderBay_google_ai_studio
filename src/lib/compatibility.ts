/**
 * Co-founder compatibility, computed the same way on every page.
 *
 * Five dimensions, each 0–100, combined with fixed weights:
 *   skills       0.35  how much each side covers what the other is looking for
 *   market       0.25  same industry, otherwise overlap of interests (Jaccard)
 *   stage        0.15  distance between start-up stages
 *   commitment   0.15  full-time / part-time / advisory alignment
 *   hours        0.10  overlap of working hours from the two time zones
 *
 * A dimension without data on either side is left out and the remaining
 * weights are rescaled, so a missing field never counts as a bad match.
 * When every dimension is missing the score is null and the UI asks for
 * profile details instead of showing a number.
 */

export type Bilingual = { en: string; el: string };

export type CompatibilityInput = {
  skills?: unknown;
  interests?: unknown;
  industry?: unknown;
  stage?: string | null;
  commitment?: string | null;
  city?: string | null;
  timezone?: string | null;
  lookingFor?: unknown;
};

export type DimensionKey = 'skills' | 'market' | 'stage' | 'commitment' | 'hours';

export type Dimension = {
  key: DimensionKey;
  label: Bilingual;
  weight: number;
  score: number | null;
  reason: Bilingual | null;
};

export type Compatibility = {
  score: number | null;
  dimensions: Dimension[];
  /** The strongest reason, for one-line summaries on cards. */
  headline: Bilingual | null;
};

export const WEIGHTS: Record<DimensionKey, number> = {
  skills: 0.35,
  market: 0.25,
  stage: 0.15,
  commitment: 0.15,
  hours: 0.1,
};

const LABELS: Record<DimensionKey, Bilingual> = {
  skills: { en: 'Skills', el: 'Δεξιότητες' },
  market: { en: 'Market', el: 'Αγορά' },
  stage: { en: 'Stage', el: 'Στάδιο' },
  commitment: { en: 'Commitment', el: 'Δέσμευση' },
  hours: { en: 'Working hours', el: 'Ώρες εργασίας' },
};

export const STAGE_ORDER = ['Idea', 'Pre-seed', 'Seed', 'Series A', 'Growth'];

const STAGE_ALIASES: Record<string, string> = {
  idea: 'Idea',
  ideation: 'Idea',
  mvp: 'Pre-seed',
  'pre-seed': 'Pre-seed',
  preseed: 'Pre-seed',
  seed: 'Seed',
  'series a': 'Series A',
  'series-a': 'Series A',
  growth: 'Growth',
  scale: 'Growth',
};

export function listWords(value: unknown): string[] {
  return words(value);
}

function words(value: unknown): string[] {
  const items = Array.isArray(value) ? value : value == null ? [] : [value];
  const out: string[] = [];
  for (const item of items) {
    let raw = '';
    if (typeof item === 'string') raw = item;
    else if (item && typeof item === 'object' && 'name' in item && typeof (item as { name: unknown }).name === 'string') {
      raw = (item as { name: string }).name;
    }
    const token = raw.trim().toLowerCase();
    if (token && !out.includes(token)) out.push(token);
  }
  return out;
}

function pretty(list: string[], original: unknown): string {
  const source = Array.isArray(original) ? original : [];
  const names = list.map((token) => {
    const hit = source.find((item) => typeof item === 'string' && item.toLowerCase() === token);
    return typeof hit === 'string' ? hit : token;
  });
  return names.slice(0, 3).join(', ');
}

export function normalizeStage(stage: string | null | undefined): string | null {
  if (!stage) return null;
  return STAGE_ALIASES[stage.trim().toLowerCase()] ?? (STAGE_ORDER.includes(stage) ? stage : null);
}

function normalizeCommitment(value: string | null | undefined): 'full' | 'part' | 'advisory' | null {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v.includes('full')) return 'full';
  if (v.includes('part') || v.includes('side')) return 'part';
  if (v.includes('advis')) return 'advisory';
  return null;
}

/** Minutes east of UTC for an IANA zone, or null when the runtime cannot tell. */
export function utcOffsetMinutes(timezone: string | null | undefined, at = new Date()): number | null {
  if (!timezone) return null;
  try {
    const text = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' })
      .formatToParts(at)
      .find((part) => part.type === 'timeZoneName')?.value;
    if (!text) return null;
    if (text === 'GMT' || text === 'UTC') return 0;
    const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(text);
    if (!match) return null;
    const sign = match[1] === '-' ? -1 : 1;
    return sign * (Number(match[2]) * 60 + Number(match[3] || 0));
  } catch {
    return null;
  }
}

function skillsDimension(me: CompatibilityInput, them: CompatibilityInput): Dimension {
  const mySkills = words(me.skills);
  const theirSkills = words(them.skills);
  const myNeeds = words(me.lookingFor);
  const theirNeeds = words(them.lookingFor);
  const base = { key: 'skills' as const, label: LABELS.skills, weight: WEIGHTS.skills };
  if (mySkills.length === 0 || theirSkills.length === 0) return { ...base, score: null, reason: null };

  const theyCover = myNeeds.filter((need) => theirSkills.includes(need));
  const iCover = theirNeeds.filter((need) => mySkills.includes(need));
  const different = theirSkills.filter((skill) => !mySkills.includes(skill));
  const complement = different.length / theirSkills.length;

  let score: number;
  if (myNeeds.length > 0 && theirNeeds.length > 0) {
    score = 0.5 * (theyCover.length / myNeeds.length) + 0.3 * (iCover.length / theirNeeds.length) + 0.2 * complement;
  } else if (myNeeds.length > 0) {
    score = 0.7 * (theyCover.length / myNeeds.length) + 0.3 * complement;
  } else if (theirNeeds.length > 0) {
    score = 0.6 * (iCover.length / theirNeeds.length) + 0.4 * complement;
  } else {
    score = complement;
  }

  let reason: Bilingual;
  if (theyCover.length > 0) {
    const names = pretty(theyCover, them.skills);
    reason = {
      en: `Covers ${theyCover.length} of the ${myNeeds.length} skills you look for (${names})`,
      el: `Καλύπτει ${theyCover.length} από τις ${myNeeds.length} δεξιότητες που ψάχνεις (${names})`,
    };
  } else if (iCover.length > 0) {
    reason = {
      en: `You cover what they look for (${pretty(iCover, me.skills)})`,
      el: `Καλύπτεις ό,τι ψάχνει (${pretty(iCover, me.skills)})`,
    };
  } else if (complement >= 0.75) {
    reason = { en: 'Different skills from yours', el: 'Διαφορετικές δεξιότητες από τις δικές σου' };
  } else {
    reason = { en: 'Similar skills to yours', el: 'Παρόμοιες δεξιότητες με τις δικές σου' };
  }
  return { ...base, score: Math.round(score * 100), reason };
}

function marketDimension(me: CompatibilityInput, them: CompatibilityInput): Dimension {
  const base = { key: 'market' as const, label: LABELS.market, weight: WEIGHTS.market };
  const myIndustry = words(me.industry);
  const theirIndustry = words(them.industry);
  const mine = [...new Set([...myIndustry, ...words(me.interests)])];
  const theirs = [...new Set([...theirIndustry, ...words(them.interests)])];
  if (mine.length === 0 || theirs.length === 0) return { ...base, score: null, reason: null };

  const sameIndustry = myIndustry.length > 0 && theirIndustry.some((item) => myIndustry.includes(item));
  const shared = mine.filter((item) => theirs.includes(item));
  const union = new Set([...mine, ...theirs]).size;
  const jaccard = union === 0 ? 0 : shared.length / union;
  const score = sameIndustry ? 100 : Math.round(Math.min(1, jaccard * 2) * 100);
  const names = pretty(shared, Array.isArray(them.interests) ? [...(them.interests as unknown[]), them.industry] : [them.industry]);
  const reason: Bilingual = sameIndustry
    ? { en: 'Same industry', el: 'Ίδιος κλάδος' }
    : shared.length > 0
      ? { en: `Shared interests: ${names}`, el: `Κοινά ενδιαφέροντα: ${names}` }
      : { en: 'Different markets', el: 'Διαφορετικές αγορές' };
  return { ...base, score, reason };
}

function stageDimension(me: CompatibilityInput, them: CompatibilityInput): Dimension {
  const base = { key: 'stage' as const, label: LABELS.stage, weight: WEIGHTS.stage };
  const a = normalizeStage(me.stage);
  const b = normalizeStage(them.stage);
  if (!a || !b) return { ...base, score: null, reason: null };
  const distance = Math.abs(STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b));
  const score = [100, 70, 40][distance] ?? 10;
  const reason: Bilingual =
    distance === 0
      ? { en: `Both at ${a}`, el: `Και οι δύο στο στάδιο ${a}` }
      : { en: `${b} vs your ${a}`, el: `${b} έναντι ${a} για σένα` };
  return { ...base, score, reason };
}

function commitmentDimension(me: CompatibilityInput, them: CompatibilityInput): Dimension {
  const base = { key: 'commitment' as const, label: LABELS.commitment, weight: WEIGHTS.commitment };
  const a = normalizeCommitment(me.commitment);
  const b = normalizeCommitment(them.commitment);
  if (!a || !b) return { ...base, score: null, reason: null };
  if (a === b) {
    const word = { full: ['full-time', 'πλήρη απασχόληση'], part: ['part-time', 'μερική απασχόληση'], advisory: ['advisory', 'συμβουλευτικά'] }[a];
    return { ...base, score: 100, reason: { en: `Both ${word[0]}`, el: `Και οι δύο σε ${word[1]}` } };
  }
  const pair = [a, b].sort().join('+');
  const score = pair === 'full+part' ? 50 : pair === 'advisory+part' ? 40 : 20;
  return { ...base, score, reason: { en: 'Different time commitment', el: 'Διαφορετικός χρόνος δέσμευσης' } };
}

function hoursDimension(me: CompatibilityInput, them: CompatibilityInput): Dimension {
  const base = { key: 'hours' as const, label: LABELS.hours, weight: WEIGHTS.hours };
  const sameCity = !!me.city && !!them.city && me.city.trim().toLowerCase() === them.city.trim().toLowerCase();
  if (sameCity) return { ...base, score: 100, reason: { en: `Both in ${them.city}`, el: `Και οι δύο στην πόλη ${them.city}` } };
  const a = utcOffsetMinutes(me.timezone);
  const b = utcOffsetMinutes(them.timezone);
  if (a == null || b == null) return { ...base, score: null, reason: null };
  const hours = Math.abs(a - b) / 60;
  const score = hours <= 1 ? 90 : hours <= 3 ? 70 : hours <= 6 ? 40 : 20;
  const rounded = Math.round(hours);
  const reason: Bilingual =
    rounded === 0
      ? { en: 'Same time zone', el: 'Ίδια ζώνη ώρας' }
      : { en: `${rounded} h time difference`, el: `${rounded} ώρες διαφορά ώρας` };
  return { ...base, score, reason };
}

export function fromCast(person: {
  skills?: unknown;
  lookingFor?: unknown;
  interests?: unknown;
  industry?: unknown;
  stage?: string | null;
  commitment?: string | null;
  city?: string | null;
  timezone?: string | null;
}): CompatibilityInput {
  return {
    skills: person.skills,
    lookingFor: person.lookingFor,
    interests: person.interests,
    industry: person.industry,
    stage: person.stage,
    commitment: person.commitment,
    city: person.city,
    timezone: person.timezone,
  };
}

/** Maps a signed-in profile (or any page-shaped person) onto the scorer. */
export function fromProfile(profile: {
  skills?: unknown;
  lookingFor?: unknown;
  interests?: unknown;
  industry?: unknown;
  stage?: string | null;
  commitment?: string | null;
  location?: string | null;
  city?: string | null;
  timezone?: string | null;
} | null | undefined): CompatibilityInput {
  if (!profile) return {};
  const place = cityAndZone(profile.location);
  return {
    skills: profile.skills,
    lookingFor: profile.lookingFor,
    interests: profile.interests,
    industry: profile.industry,
    stage: profile.stage,
    commitment: profile.commitment,
    city: profile.city || place.city,
    timezone: profile.timezone || place.timezone,
  };
}

export function rankPeople<T extends Parameters<typeof fromCast>[0]>(
  me: CompatibilityInput,
  people: T[],
): { person: T; fit: Compatibility }[] {
  return people
    .map((person) => ({ person, fit: compatibility(me, fromCast(person)) }))
    .sort((a, b) => (b.fit.score ?? -1) - (a.fit.score ?? -1));
}

export function compatibility(me: CompatibilityInput, them: CompatibilityInput): Compatibility {
  const dimensions = [
    skillsDimension(me, them),
    marketDimension(me, them),
    stageDimension(me, them),
    commitmentDimension(me, them),
    hoursDimension(me, them),
  ];
  const known = dimensions.filter((d) => d.score != null);
  if (known.length === 0) return { score: null, dimensions, headline: null };
  const totalWeight = known.reduce((sum, d) => sum + d.weight, 0);
  const score = Math.round(known.reduce((sum, d) => sum + d.weight * (d.score as number), 0) / totalWeight);
  const best = [...known].sort((x, y) => y.weight * (y.score as number) - x.weight * (x.score as number))[0];
  return { score, dimensions, headline: best?.reason ?? null };
}

/** Time zones for profiles that store only a city. */
const CITY_ZONES: Record<string, string> = {
  'san francisco': 'America/Los_Angeles',
  'los angeles': 'America/Los_Angeles',
  seattle: 'America/Los_Angeles',
  'new york': 'America/New_York',
  nyc: 'America/New_York',
  boston: 'America/New_York',
  toronto: 'America/Toronto',
  austin: 'America/Chicago',
  chicago: 'America/Chicago',
  london: 'Europe/London',
  dublin: 'Europe/Dublin',
  lisbon: 'Europe/Lisbon',
  paris: 'Europe/Paris',
  berlin: 'Europe/Berlin',
  vienna: 'Europe/Vienna',
  madrid: 'Europe/Madrid',
  barcelona: 'Europe/Madrid',
  milan: 'Europe/Rome',
  athens: 'Europe/Athens',
  thessaloniki: 'Europe/Athens',
  αθήνα: 'Europe/Athens',
  θεσσαλονίκη: 'Europe/Athens',
  dubai: 'Asia/Dubai',
  bengaluru: 'Asia/Kolkata',
  bangalore: 'Asia/Kolkata',
  seoul: 'Asia/Seoul',
  tokyo: 'Asia/Tokyo',
  singapore: 'Asia/Singapore',
};

/** City part of "San Francisco, CA" style locations, and its time zone when known. */
export function cityAndZone(location: string | null | undefined): { city: string | null; timezone: string | null } {
  if (!location) return { city: null, timezone: null };
  const city = location.split(',')[0]?.trim() || null;
  const timezone = city ? CITY_ZONES[city.toLowerCase()] ?? null : null;
  return { city, timezone };
}
