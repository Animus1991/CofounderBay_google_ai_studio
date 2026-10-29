/**
 * The pitch deck as data.
 *
 * Founder Tools showed eight slides with fixed "complete / in progress"
 * statuses and an empty canvas ("click Edit to add content"); Edit, Export
 * and Download only opened the assistant, one of them after a "Download
 * started" toast. Insights counted filled slides from `keys.pitch` for its
 * Pitch Master badge, but nothing ever wrote that key.
 *
 * Now each slide has text stored under `keys.pitch` (synced like every other
 * list), its status is computed from that text, and an empty slide offers a
 * draft taken from what the founder already wrote elsewhere — the Lean Canvas,
 * the Startup Builder, the venture name and the round — so the deck, the
 * canvas and Fundraising tell one story.
 */
import { readBuilderInputs } from './builder';
import { isDemoData, keys, readRound, readValue, writeValue } from './localLists';

export const PITCH_SLIDES = [
  { key: 'cover', en: 'Cover & Hook', el: 'Εξώφυλλο & άγκιστρο' },
  { key: 'problem', en: 'Problem', el: 'Πρόβλημα' },
  { key: 'solution', en: 'Solution', el: 'Λύση' },
  { key: 'market', en: 'Market Size', el: 'Μέγεθος αγοράς' },
  { key: 'model', en: 'Business Model', el: 'Επιχειρηματικό μοντέλο' },
  { key: 'traction', en: 'Traction', el: 'Έλξη' },
  { key: 'team', en: 'Team', el: 'Ομάδα' },
  { key: 'ask', en: 'Ask & Use of Funds', el: 'Αίτημα & χρήση κεφαλαίων' },
] as const;

export type PitchSlideKey = (typeof PITCH_SLIDES)[number]['key'];
export type PitchContent = Partial<Record<PitchSlideKey, string>>;
export type SlideStatus = 'complete' | 'in-progress' | 'pending';

/** Enough text to stand on a slide; shorter is a start, empty is not started. */
const COMPLETE_AT = 60;

export function readPitch(): PitchContent {
  const stored = readValue<PitchContent>(keys.pitch, {});
  return stored && typeof stored === 'object' ? stored : {};
}

export function writePitchSlide(key: PitchSlideKey, text: string): PitchContent {
  const next = { ...readPitch(), [key]: text };
  if (!text.trim()) delete next[key];
  writeValue(keys.pitch, next);
  return next;
}

export function slideStatus(text: string | undefined): SlideStatus {
  const length = (text ?? '').trim().length;
  if (length === 0) return 'pending';
  return length >= COMPLETE_AT ? 'complete' : 'in-progress';
}

const money = (value: number) => {
  if (!value) return '';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${value}`;
};

/**
 * A draft for each slide from data the founder already entered, or an empty
 * string when there is nothing to draw on. Never invents numbers.
 */
export function draftPitch(): PitchContent {
  const canvas = readValue<Record<string, string>>(keys.canvas, {});
  const builder = readBuilderInputs();
  const startup = readValue<Record<string, unknown>>(keys.startup, {});
  const round = readRound();
  const pick = (...values: (string | undefined)[]) => values.map((value) => (value ?? '').trim()).filter(Boolean).join(' ');
  const name = typeof startup.name === 'string' ? startup.name.trim() : '';
  const oneLiner = typeof startup.oneLiner === 'string' ? startup.oneLiner.trim() : '';
  const raised = round.committedAmount && round.targetAmount
    ? `${money(round.committedAmount)} of ${money(round.targetAmount)} committed.`
    : '';
  const ask = round.targetAmount
    ? `Raising ${money(round.targetAmount)} ${round.instrument === 'SAFE' ? 'on a SAFE' : 'in a priced round'}${round.valuationCap ? ` (${money(round.valuationCap)} cap)` : ''}. ${raised}${round.monthlyBurn ? ` Current burn ${money(round.monthlyBurn)}/month.` : ''}`.trim()
    : '';
  return {
    cover: pick(name, oneLiner),
    problem: pick(canvas.problem, builder['1-0'], builder['1-2']),
    solution: pick(canvas.solution, canvas.uvp, builder['2-0'], builder['2-2']),
    market: pick(builder['3-0'], builder['3-1']),
    model: pick(builder['4-0'], builder['4-1']),
    traction: pick(canvas.keyMetrics),
    team: '',
    ask,
  };
}

/** What the deck shows: the founder's text, or — in the sample account — the draft. */
export function effectivePitch(): PitchContent {
  const stored = readPitch();
  if (Object.keys(stored).length > 0 || !isDemoData()) return stored;
  return draftPitch();
}

/** The deck as a Markdown document, in one language, for Word / print / share. */
export function pitchMarkdown(content: PitchContent, lang: 'en' | 'el', title: string): string {
  const empty = lang === 'el' ? '_(κενό — συμπλήρωσέ το στα Εργαλεία ιδρυτή → Pitch)_' : '_(empty — fill it in Founder Tools → Pitch)_';
  const lines = [`# ${title}`, ''];
  PITCH_SLIDES.forEach((slide, index) => {
    lines.push(`## ${index + 1}. ${lang === 'el' ? slide.el : slide.en}`, '', (content[slide.key] ?? '').trim() || empty, '');
  });
  return lines.join('\n');
}
