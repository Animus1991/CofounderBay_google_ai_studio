/**
 * "Describe yourself in a few lines — I'll fill the form."
 *
 * Onboarding asked for a headline, skills, industry, experience, location and
 * a bio as separate boxes, which is where most people stop. Now they can paste
 * a few lines (or their LinkedIn "About") and get the boxes filled, to review
 * before anything is kept.
 *
 * Two readers, one result shape:
 * - `extractProfile` works offline: known skills, industries, cities, years of
 *   experience, stage and commitment words, in English and Greek. It never
 *   invents — a field it cannot find stays empty.
 * - `extractProfileWithModel` asks Gemini for the same fields as JSON, then
 *   keeps only values that pass the same checks; on any failure it returns the
 *   offline reading.
 */
import { AIService } from '../services/aiService';

export const ONBOARDING_INDUSTRIES = ['Technology', 'Finance', 'Health', 'Climate', 'Education', 'Consumer'] as const;
export type OnboardingIndustry = (typeof ONBOARDING_INDUSTRIES)[number];

export type ProfileDraft = {
  headline?: string;
  skills: string[];
  industry?: OnboardingIndustry;
  experience?: string;
  location?: string;
  bio?: string;
  stage?: 'Idea' | 'MVP' | 'Revenue';
  commitment?: 'Full-time' | 'Part-time';
};

const fold = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Canonical skill → words that name it (folded). */
const SKILLS: [string, string[]][] = [
  ['React', ['react']],
  ['TypeScript', ['typescript']],
  ['JavaScript', ['javascript']],
  ['Node.js', ['node.js', 'nodejs', 'node ']],
  ['Python', ['python']],
  ['Go', ['golang']],
  ['Rust', ['rust ']],
  ['Java', ['java ']],
  ['Swift', ['swift', 'ios']],
  ['Kotlin', ['kotlin', 'android']],
  ['SQL', ['sql', 'postgres']],
  ['Machine Learning', ['machine learning', 'ml engineer', ' ml ', 'μηχανικη μαθηση']],
  ['AI', [' ai ', 'artificial intelligence', 'llm', 'τεχνητη νοημοσυνη']],
  ['Data Science', ['data science', 'data scientist', 'analytics', 'αναλυση δεδομενων']],
  ['DevOps', ['devops', 'kubernetes', 'aws', 'cloud infrastructure']],
  ['Embedded', ['embedded', 'firmware', 'hardware', 'iot']],
  ['Blockchain', ['blockchain', 'web3', 'crypto']],
  ['Product Management', ['product management', 'product manager', 'product lead', 'διαχειριση προϊοντος']],
  ['Design', ['design', 'ux', 'ui ', 'σχεδιασ']],
  ['Sales', ['sales', 'b2b sales', 'πωλησ']],
  ['Marketing', ['marketing', 'μαρκετινγκ']],
  ['Growth', ['growth', 'αναπτυξη πελατ']],
  ['Business Development', ['business development', 'bizdev', 'partnerships', 'συνεργασιες']],
  ['Operations', ['operations', 'λειτουργιες']],
  ['Finance', ['finance', 'financial model', 'cfo', 'χρηματοοικονομ']],
  ['Fundraising', ['fundraising', 'raised', 'αντλησ', 'χρηματοδοτησ']],
  ['Legal', ['legal', 'lawyer', 'νομικ']],
  ['Customer Success', ['customer success', 'support']],
  ['Content', ['content', 'copywriting', 'περιεχομεν']],
];

const INDUSTRY_WORDS: [OnboardingIndustry, string[]][] = [
  ['Finance', ['fintech', 'payments', 'banking', 'bank', 'insurance', 'insurtech', 'χρηματοοικονομ', 'πληρωμ', 'τραπεζ']],
  ['Health', ['health', 'medtech', 'clinical', 'biotech', 'patients', 'υγει', 'ιατρ']],
  ['Climate', ['climate', 'energy', 'solar', 'cleantech', 'water', 'carbon', 'sustainab', 'κλιμα', 'ενεργει', 'νερο', 'βιωσιμ']],
  ['Education', ['edtech', 'education', 'learning', 'students', 'εκπαιδευσ', 'μαθητ']],
  ['Consumer', ['consumer', 'e-commerce', 'ecommerce', 'retail', 'marketplace', 'λιανικ']],
  ['Technology', ['saas', 'software', 'developer tools', 'ai', 'platform', 'λογισμικ', 'τεχνολογ']],
];

/** City words → "City, Country". */
const CITIES: [string, string[]][] = [
  ['Athens, Greece', ['athens', 'αθηνα']],
  ['Thessaloniki, Greece', ['thessaloniki', 'θεσσαλονικη']],
  ['Patras, Greece', ['patras', 'πατρα']],
  ['Heraklion, Greece', ['heraklion', 'ηρακλειο']],
  ['Nicosia, Cyprus', ['nicosia', 'λευκωσια']],
  ['Limassol, Cyprus', ['limassol', 'λεμεσο']],
  ['London, United Kingdom', ['london', 'λονδινο']],
  ['Berlin, Germany', ['berlin', 'βερολινο']],
  ['Munich, Germany', ['munich', 'μοναχο']],
  ['Paris, France', ['paris', 'παρισι']],
  ['Amsterdam, Netherlands', ['amsterdam', 'αμστερνταμ']],
  ['Lisbon, Portugal', ['lisbon', 'λισαβονα']],
  ['Madrid, Spain', ['madrid', 'μαδριτη']],
  ['Barcelona, Spain', ['barcelona', 'βαρκελωνη']],
  ['Dublin, Ireland', ['dublin', 'δουβλινο']],
  ['Stockholm, Sweden', ['stockholm', 'στοκχολμη']],
  ['Zurich, Switzerland', ['zurich', 'ζυριχη']],
  ['New York, United States', ['new york', 'νεα υορκη']],
  ['San Francisco, United States', ['san francisco', 'σαν φρανσισκο']],
  ['Tel Aviv, Israel', ['tel aviv', 'τελ αβιβ']],
  ['Singapore', ['singapore', 'σιγκαπουρη']],
  ['Dubai, United Arab Emirates', ['dubai', 'ντουμπαι']],
];

function firstSentence(text: string): string {
  const sentence = text.split(/(?<=[.!?;])\s+|\n+/).map((part) => part.trim()).find((part) => part.length > 8) ?? '';
  const cleaned = sentence.replace(/^(?:hi|hello|γεια)[,!.\s]+/i, '').replace(/^(?:i am|i'm|είμαι|ειμαι)\s+(?:an?\s+|ο\s+|η\s+)?/i, '');
  const headline = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return headline.length > 90 ? `${headline.slice(0, 87).replace(/\s+\S*$/, '')}…` : headline.replace(/[.;]$/, '');
}

/** Reads what it can from a free description, offline. Never invents. */
export function extractProfile(text: string): ProfileDraft {
  const raw = text.trim();
  if (!raw) return { skills: [] };
  const folded = ` ${fold(raw).replace(/[,;()/]/g, ' ')} `;
  const skills = SKILLS.filter(([, words]) => words.some((word) => folded.includes(word))).map(([skill]) => skill).slice(0, 10);
  const industry = INDUSTRY_WORDS.find(([, words]) => words.some((word) => folded.includes(word)))?.[0];
  const location = CITIES.find(([, words]) => words.some((word) => folded.includes(word)))?.[0];
  const years = /(\d{1,2})\+?\s*(?:years?|yrs|χρονια|ετη)/.exec(folded);
  const field = years ? /(?:in|σε|στο|στη|στην)\s+([a-zα-ω0-9 .&-]{3,40}?)(?=\s(?:and|και|at|στην|στο|,)|\s*$|\.)/.exec(folded.slice(years.index + years[0].length)) : null;
  const experience = years ? `${years[1]} years${field?.[1] ? ` in ${field[1].trim()}` : ''}` : undefined;
  // Greek letters are not word characters for \b, so Greek stems are matched as substrings.
  const stage = /\b(?:revenue|paying customers)\b/.test(folded) || /πελατες που πληρωνουν|εσοδα/.test(folded) ? 'Revenue'
    : /\b(?:mvp|prototype|beta)\b/.test(folded) || folded.includes('πρωτοτυπ') ? 'MVP'
      : /\bidea\b/.test(folded) || folded.includes('ιδεα') ? 'Idea' : undefined;
  const commitment = /full[\s-]?time|πληρους απασχολησ|αποκλειστικα/.test(folded) ? 'Full-time' : /part[\s-]?time|μερικης απασχολησ/.test(folded) ? 'Part-time' : undefined;
  return {
    headline: firstSentence(raw) || undefined,
    skills,
    industry,
    experience,
    location,
    bio: raw.length > 600 ? `${raw.slice(0, 597).replace(/\s+\S*$/, '')}…` : raw,
    stage,
    commitment,
  };
}

function clean(value: unknown, max: number): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined;
}

/** Model reading, checked against the same rules; the offline reading when the model is not there. */
export async function extractProfileWithModel(text: string, lang: 'en' | 'el'): Promise<{ draft: ProfileDraft; by: 'model' | 'offline' }> {
  const offline = extractProfile(text);
  try {
    const status = await AIService.status();
    if (!status.configured || AIService.coolingDown) return { draft: offline, by: 'offline' };
    const json = await AIService.extractJson(
      `Read this founder's self-description and return only what it states. Language for the headline: ${lang === 'el' ? 'Greek' : 'English'}.\n\n${text.slice(0, 2000)}`,
      {
        type: 'OBJECT',
        properties: {
          headline: { type: 'STRING', description: 'One line, under 90 characters, in the person’s own terms.' },
          skills: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Up to 10 concrete skills they state.' },
          industry: { type: 'STRING', enum: [...ONBOARDING_INDUSTRIES] },
          experience: { type: 'STRING', description: 'Years and field, only if stated.' },
          location: { type: 'STRING', description: 'City, Country — only if stated.' },
          stage: { type: 'STRING', enum: ['Idea', 'MVP', 'Revenue'] },
          commitment: { type: 'STRING', enum: ['Full-time', 'Part-time'] },
        },
      },
    );
    const record = (json ?? {}) as Record<string, unknown>;
    const skills = Array.isArray(record.skills) ? record.skills.filter((item): item is string => typeof item === 'string' && item.trim().length > 1).map((item) => item.trim().slice(0, 40)).slice(0, 10) : [];
    const industry = ONBOARDING_INDUSTRIES.find((item) => item === record.industry);
    const draft: ProfileDraft = {
      headline: clean(record.headline, 90) ?? offline.headline,
      skills: skills.length ? skills : offline.skills,
      industry: industry ?? offline.industry,
      experience: clean(record.experience, 120) ?? offline.experience,
      location: clean(record.location, 80) ?? offline.location,
      bio: offline.bio,
      stage: record.stage === 'Idea' || record.stage === 'MVP' || record.stage === 'Revenue' ? record.stage : offline.stage,
      commitment: record.commitment === 'Full-time' || record.commitment === 'Part-time' ? record.commitment : offline.commitment,
    };
    return { draft, by: 'model' };
  } catch {
    return { draft: offline, by: 'offline' };
  }
}
