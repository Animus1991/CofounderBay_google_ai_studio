/**
 * The assistant's fundraising pipeline tools.
 *
 * Before: "show my pipeline" returned a fixed sentence listing the stage
 * names, and nothing about investors could be changed from the chat. Now the
 * assistant reads the same pipeline as Fundraising (lib/localLists → round)
 * and proposes the same writes the page's buttons make:
 *
 * - `pipeline`       read   — who is at which stage, with check size and next step
 * - `followups`      read   — overdue and due-this-week follow-ups
 * - `followup-set`   write  — "next step with Sequoia: send the deck by Friday"
 * - `pipeline-move`  write  — "move Naval to Term Sheet", "Naval moved to Meeting"
 * - `pipeline-add`   write  — "add Index Ventures to my pipeline (at Contacted)"
 *
 * Slash forms work too: `/pipeline`, `/investor add X at Stage`,
 * `/investor move X to Stage`, `/investor next X: step by day`.
 *
 * Every write is a proposal whose undo puts that one investor back exactly as
 * it was (stage history included), so batched writes never undo each other.
 * Dates are understood in English and Greek ("tomorrow", "Friday", "in 3 days",
 * "15 Nov", «αύριο», «Παρασκευή», «σε 3 μέρες», «15 Νοεμβρίου», 2026-11-15).
 */
import {
  followUps,
  isDemoData,
  localDay,
  logActivity,
  readRound,
  restorePipelineEntry,
  setPipelineFollowUp,
  setPipelineStage,
  upsertPipelineInvestor,
  PIPELINE_STAGES,
  type RoundInvestor,
} from '../lib/localLists';
import { DEMO_INVESTOR_NAMES } from '../data/demoCatalog';
import { escapeRegExp, fold, hasStem } from './assistantText';
import type { AssistantLink, AssistantProposal, AssistantResult } from './assistantOps';

/** The investor CRM board — where every pipeline answer and change can be seen. */
export const CRM_HREF = '/fundraising?tab=crm';
const FUNDRAISING_LINK: AssistantLink = { href: CRM_HREF, en: 'Open the investor CRM', el: 'Άνοιγμα CRM επενδυτών' };
const SOURCE = { kind: 'round', en: 'Investor CRM · Fundraising', el: 'CRM επενδυτών · Χρηματοδότηση', href: CRM_HREF };

// ── Stages ─────────────────────────────────────────────────────────────────

export const STAGE_LABEL_EL: Record<string, string> = {
  Identified: 'Εντοπίστηκε',
  Contacted: 'Έγινε επαφή',
  Meeting: 'Συνάντηση',
  'Due Diligence': 'Δέουσα επιμέλεια',
  'Term Sheet': 'Βασικοί όροι συμφωνίας',
  Closed: 'Κλειστό',
  Passed: 'Απορρίφθηκε',
};

const STAGE_STEMS: [string, string[]][] = [
  ['Due Diligence', ['due diligence', 'dd', 'δεουσα', 'επιμελει']],
  ['Term Sheet', ['term sheet', 'termsheet', 'βασικους ορους', 'βασικοι οροι', 'ορους συμφωνιας']],
  ['Identified', ['identified', 'εντοπ']],
  ['Contacted', ['contacted', 'reached out', 'επαφη', 'επικοινωνι']],
  ['Meeting', ['meeting', 'συναντησ', 'ραντεβου']],
  ['Closed', ['closed', 'won', 'signed', 'κλειστ', 'εκλεισε', 'κλεισιμο', 'υπογραφ']],
  ['Passed', ['passed', 'declined', 'rejected', 'lost', 'απορριφθ', 'απερριψ', 'απορριψ', 'αρνηθ']],
];

/** The stage a sentence names after "to/into/as/in" (or «σε/στο/στη»), if any. */
export function parseStage(folded: string): string | null {
  const tail = folded.match(/(?:\b(?:to|into|as|at|in)\b|\bσε\b|\bστο\b|\bστη\b|\bστην\b|\bως\b)\s+(.+)$/)?.[1] ?? folded;
  for (const [stage, stems] of STAGE_STEMS) if (hasStem(tail, ...stems)) return stage;
  return null;
}

// ── Days ───────────────────────────────────────────────────────────────────

const WEEKDAYS: [number, string[]][] = [
  [0, ['sunday', 'sun', 'κυριακη']],
  [1, ['monday', 'mon', 'δευτερα']],
  [2, ['tuesday', 'tue', 'τριτη']],
  [3, ['wednesday', 'wed', 'τεταρτη']],
  [4, ['thursday', 'thu', 'πεμπτη']],
  [5, ['friday', 'fri', 'παρασκευη']],
  [6, ['saturday', 'sat', 'σαββατο']],
];

const MONTHS: string[][] = [
  ['january', 'jan', 'ιανουαριου', 'ιαν'],
  ['february', 'feb', 'φεβρουαριου', 'φεβ'],
  ['march', 'mar', 'μαρτιου', 'μαρ'],
  ['april', 'apr', 'απριλιου', 'απρ'],
  ['may', 'μαιου', 'μαι'],
  ['june', 'jun', 'ιουνιου', 'ιουν'],
  ['july', 'jul', 'ιουλιου', 'ιουλ'],
  ['august', 'aug', 'αυγουστου', 'αυγ'],
  ['september', 'sept', 'sep', 'σεπτεμβριου', 'σεπ'],
  ['october', 'oct', 'οκτωβριου', 'οκτ'],
  ['november', 'nov', 'νοεμβριου', 'νοε'],
  ['december', 'dec', 'δεκεμβριου', 'δεκ'],
];

/** An optional "by / on / until / μέχρι / την …" before a date, never cut out of a longer word. */
const PREPOSITION = String.raw`(?:(?<![a-zα-ω])(?:by|on|until|before|due|for|μεχρι|εως την|εως|ως|την|τη|στις|για)\s+)?`;
/** The date words themselves must start a word. */
const START = String.raw`(?<![a-zα-ω0-9])`;

function dayAfter(now: Date, days: number): string {
  return localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days));
}

function monthIndex(word: string): number {
  return MONTHS.findIndex((names) => names.includes(word));
}

function isoDay(year: number, month: number, day: number): string | null {
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return localDay(date);
}

type DayMatch = { day: string; start: number; end: number };

/** A due day named in the sentence: the day, and where its words are (so they can be cut from a title). */
export function parseDay(folded: string, now: Date = new Date()): DayMatch | null {
  const year = now.getFullYear();
  const rules: [RegExp, (m: RegExpExecArray) => string | null][] = [
    [new RegExp(`${PREPOSITION}${START}(\\d{4})-(\\d{2})-(\\d{2})(?![0-9])`, 'g'), (m) => isoDay(Number(m[1]), Number(m[2]), Number(m[3]))],
    [new RegExp(`${PREPOSITION}${START}(?:today|σημερα)(?![a-zα-ω])`, 'g'), () => dayAfter(now, 0)],
    [new RegExp(`${PREPOSITION}${START}(?:tomorrow|αυριο)(?![a-zα-ω])`, 'g'), () => dayAfter(now, 1)],
    [new RegExp(`${START}(?:in|σε)\\s+(\\d{1,3})\\s+(?:days?|μερες|ημερες|μερα|ημερα)(?![a-zα-ω])`, 'g'), (m) => dayAfter(now, Number(m[1]))],
    [new RegExp(`${START}(?:in a week|next week|την επομενη εβδομαδα|επομενη εβδομαδα|σε μια εβδομαδα)(?![a-zα-ω])`, 'g'), () => dayAfter(now, 7)],
    [
      new RegExp(`${PREPOSITION}${START}(\\d{1,2})\\s+([a-zα-ω]{3,11})\\.?(?:\\s+(\\d{4}))?(?![a-zα-ω])`, 'g'),
      (m) => {
        const month = monthIndex(m[2] ?? '');
        return month < 0 ? null : isoDay(m[3] ? Number(m[3]) : year, month + 1, Number(m[1]));
      },
    ],
    [
      new RegExp(`${PREPOSITION}${START}([a-z]{3,9})\\.?\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?(?![0-9])`, 'g'),
      (m) => {
        const month = monthIndex(m[1] ?? '');
        return month < 0 ? null : isoDay(m[3] ? Number(m[3]) : year, month + 1, Number(m[2]));
      },
    ],
    [
      new RegExp(`${PREPOSITION}${START}(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?(?![0-9])`, 'g'),
      (m) => {
        const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : year;
        return isoDay(y, Number(m[2]), Number(m[1]));
      },
    ],
  ];
  for (const [pattern, toDay] of rules) {
    for (const match of folded.matchAll(pattern)) {
      const day = toDay(match as RegExpExecArray);
      if (day) return { day, start: match.index ?? 0, end: (match.index ?? 0) + match[0].length };
    }
  }
  for (const [weekday, names] of WEEKDAYS) {
    for (const name of names) {
      const pattern = new RegExp(`${PREPOSITION}${START}(?:next\\s+|this\\s+|την\\s+|τη\\s+)?${escapeRegExp(name)}(?![a-zα-ω])`);
      const match = pattern.exec(folded);
      if (!match) continue;
      const ahead = (weekday - now.getDay() + 7) % 7 || 7;
      return { day: dayAfter(now, ahead), start: match.index, end: match.index + match[0].length };
    }
  }
  return null;
}

// ── Investors ──────────────────────────────────────────────────────────────

function nameKeys(name: string): string[] {
  const full = fold(name);
  const first = full.split(/\s+/)[0] ?? full;
  // "a16z" is how founders say Andreessen Horowitz.
  const extra = /andreessen/.test(full) ? ['a16z'] : [];
  return [full, ...(first.length >= 4 ? [first] : []), ...extra];
}

/** The pipeline investor a sentence names, and where its name sits in the folded text. */
export function findInvestor(folded: string, pipeline: RoundInvestor[]): { investor: RoundInvestor; start: number; end: number } | null {
  let best: { investor: RoundInvestor; start: number; end: number } | null = null;
  for (const investor of pipeline) {
    for (const key of nameKeys(investor.name)) {
      const match = new RegExp(`(?:^|[^a-z0-9α-ω])(${escapeRegExp(key)})(?:$|[^a-z0-9α-ω])`).exec(folded);
      if (!match) continue;
      const start = match.index + match[0].indexOf(match[1] ?? key);
      const candidate = { investor, start, end: start + key.length };
      if (!best || key.length > best.end - best.start) best = candidate;
    }
  }
  return best;
}

function shortDay(day: string, lang: 'en' | 'el'): string {
  const date = new Date(`${day}T12:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function whenWords(inDays: number, day: string): { en: string; el: string } {
  if (inDays < 0) return { en: `overdue since ${shortDay(day, 'en')}`, el: `εκπρόθεσμο από ${shortDay(day, 'el')}` };
  if (inDays === 0) return { en: 'due today', el: 'για σήμερα' };
  if (inDays === 1) return { en: 'due tomorrow', el: 'για αύριο' };
  return { en: `due ${shortDay(day, 'en')}`, el: `έως ${shortDay(day, 'el')}` };
}

// ── Reads ──────────────────────────────────────────────────────────────────

export function pipelineReadResult(now: Date = new Date()): AssistantResult {
  const pipeline = readRound().pipeline ?? [];
  if (pipeline.length === 0) {
    return {
      tool: 'pipeline',
      en: 'Your investor pipeline is empty. Add investors from Fundraising → Investors, or say “add Index Ventures to my pipeline”.',
      el: 'Η ροή επενδυτών σου είναι άδεια. Πρόσθεσε από Χρηματοδότηση → Επενδυτές ή πες «πρόσθεσε την Index Ventures στη ροή μου».',
      href: '/fundraising?tab=investors',
      links: [{ href: '/fundraising?tab=investors', en: 'Browse investors', el: 'Επενδυτές' }],
      sources: [SOURCE],
    };
  }
  const order = (stage: string) => PIPELINE_STAGES.indexOf(stage as (typeof PIPELINE_STAGES)[number]);
  const sorted = [...pipeline].sort((a, b) => order(b.stage) - order(a.stage));
  const line = (item: RoundInvestor, lang: 'en' | 'el') => {
    const stage = lang === 'el' ? STAGE_LABEL_EL[item.stage] ?? item.stage : item.stage;
    const head = `${item.name} · ${stage}${item.checkSize ? ` · ${item.checkSize}` : ''}`;
    if (!item.nextStep) return head;
    const when = item.nextDate ? ` (${whenWords(dayDiff(item.nextDate, now), item.nextDate)[lang]})` : '';
    return `${head} · ${lang === 'el' ? 'επόμενο' : 'next'}: ${item.nextStep}${when}`;
  };
  const due = followUps(readRound(), now);
  const active = pipeline.filter((item) => item.stage !== 'Passed' && item.stage !== 'Closed').length;
  return {
    tool: 'pipeline',
    en: `${pipeline.length} investors tracked, ${active} active${due.overdue.length ? `, ${due.overdue.length} follow-up overdue` : ''}:\n${sorted.map((item) => `• ${line(item, 'en')}`).join('\n')}`,
    el: `${pipeline.length} επενδυτές στη ροή, ${active} ενεργοί${due.overdue.length ? `, ${due.overdue.length} εκπρόθεσμο follow-up` : ''}:\n${sorted.map((item) => `• ${line(item, 'el')}`).join('\n')}`,
    href: CRM_HREF,
    links: [FUNDRAISING_LINK],
    sources: [SOURCE],
    followUps: due.overdue[0]
      ? [{ en: `Next step with ${due.overdue[0].name}: done, follow up again in 3 days`, el: `Επόμενο βήμα με ${due.overdue[0].name}: follow-up σε 3 μέρες` }]
      : [{ en: 'What follow-ups are due this week?', el: 'Ποια follow-ups λήγουν αυτή την εβδομάδα;' }],
  };
}

function dayDiff(day: string, now: Date): number {
  const [y, m, d] = day.split('-').map(Number);
  const target = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function followUpsResult(now: Date = new Date()): AssistantResult {
  const due = followUps(readRound(), now);
  const rows = [...due.overdue, ...due.soon];
  if (rows.length === 0) {
    const later = due.later[0];
    return {
      tool: 'followups',
      en: later
        ? `Nothing overdue or due this week. Next up: ${later.name} — ${later.nextStep} (${whenWords(later.inDays, later.nextDate).en}).`
        : 'No follow-ups are scheduled. Say “next step with <investor>: <what> by <day>” to set one.',
      el: later
        ? `Τίποτα εκπρόθεσμο ή για αυτή την εβδομάδα. Επόμενο: ${later.name} — ${later.nextStep} (${whenWords(later.inDays, later.nextDate).el}).`
        : 'Δεν υπάρχουν προγραμματισμένα follow-ups. Πες «επόμενο βήμα με <επενδυτή>: <τι> μέχρι <μέρα>».',
      href: CRM_HREF,
      links: [FUNDRAISING_LINK],
      sources: [SOURCE],
    };
  }
  const line = (item: (typeof rows)[number], lang: 'en' | 'el') => `• ${item.name}: ${item.nextStep} — ${whenWords(item.inDays, item.nextDate)[lang]}`;
  return {
    tool: 'followups',
    en: `${due.overdue.length} overdue, ${due.soon.length} due in the next 7 days:\n${rows.map((item) => line(item, 'en')).join('\n')}`,
    el: `${due.overdue.length} εκπρόθεσμα, ${due.soon.length} μέσα στις επόμενες 7 μέρες:\n${rows.map((item) => line(item, 'el')).join('\n')}`,
    href: CRM_HREF,
    links: [FUNDRAISING_LINK],
    sources: [SOURCE],
    followUps: rows[0]
      ? [{ en: `Next step with ${rows[0].name}: follow up again in 3 days`, el: `Επόμενο βήμα με ${rows[0].name}: follow-up σε 3 μέρες` }]
      : undefined,
  };
}

// ── Writes ─────────────────────────────────────────────────────────────────

function proposal(plan: AssistantProposal, tool: string): AssistantResult {
  return { tool, en: plan.summary.en, el: plan.summary.el, href: CRM_HREF, links: [FUNDRAISING_LINK], proposal: plan };
}

/** A deep copy of one investor's entry, for an undo that restores exactly that entry. */
function snapshot(investorId: string): RoundInvestor | undefined {
  const entry = (readRound().pipeline ?? []).find((item) => item.investorId === investorId);
  return entry ? { ...entry, history: entry.history ? entry.history.map((step) => ({ ...step })) : undefined } : undefined;
}

/** Cuts [start, end) from both the original and its folded twin (same length for precomposed text). */
function cut(state: { text: string; folded: string }, start: number, end: number) {
  state.text = `${state.text.slice(0, start)} ${state.text.slice(end)}`;
  state.folded = `${state.folded.slice(0, start)} ${state.folded.slice(end)}`;
}

function cutPattern(state: { text: string; folded: string }, pattern: RegExp) {
  const match = pattern.exec(state.folded);
  if (match) cut(state, match.index, match.index + match[0].length);
}

/** The words of a next step once the command, the investor and the day are taken out. */
export function stepText(query: string, investor: { start: number; end: number }, day: { start: number; end: number } | null): string {
  const state = { text: query, folded: fold(query) };
  if (state.text.length !== state.folded.length) return '';
  // Cut from the end first so earlier indices stay valid.
  const ranges = [investor, ...(day ? [day] : [])].sort((a, b) => b.start - a.start);
  for (const range of ranges) cut(state, range.start, range.end);
  cutPattern(state, /^\s*(?:please\s+)?(?:set\s+|add\s+|log\s+)?(?:the\s+|a\s+)?(?:next\s+step|follow[\s-]?up|reminder)(?:\s+is)?\s*/);
  cutPattern(state, /^\s*remind me to\s*/);
  cutPattern(state, /^\s*(?:ορισε\s+|βαλε\s+)?(?:το\s+)?(?:επομενο\s+βημα|follow[\s-]?up|υπενθυμιση)\s*/);
  cutPattern(state, /^\s*υπενθυμισε\s+μου\s+(?:να\s+)?/);
  // The preposition that introduced the investor ("with", «με τη») is left dangling.
  cutPattern(state, /(?:^|\s)(?:with|for|to|from|με\s+(?:τη|την|τον|το|τους|τις)|με|για\s+(?:τη|την|τον|το)|για|στη|στην|στον|στο)\s+(?=[\s:,—–-]*$|\s*[:—–-])/);
  cutPattern(state, /(?:^|\s)(?:with|for|με\s+(?:τη|την|τον|το)|με|για)\s*$/);
  return state.text
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s:;,—–-]+|[\s:;,—–.-]+$/g, '')
    .trim()
    .replace(/^(?:to|να)\s+/i, '');
}

export function followUpSetResult(query: string, propose: boolean, now: Date = new Date()): AssistantResult | null {
  const folded = fold(query);
  const pipeline = readRound().pipeline ?? [];
  const found = findInvestor(folded, pipeline);
  if (!found) return null;
  const day = parseDay(folded, now);
  const step = stepText(query, found, day);
  if (!day && !step) return null;
  const { investor } = found;
  const nextStep = step || investor.nextStep || 'Follow up';
  const nextDate = day?.day ?? investor.nextDate;
  const before = snapshot(investor.investorId);
  const when = nextDate ? whenWords(dayDiff(nextDate, now), nextDate) : { en: 'no date', el: 'χωρίς ημερομηνία' };
  const apply = (): AssistantResult => {
    setPipelineFollowUp(investor.investorId, { nextStep, nextDate: nextDate ?? '' });
    logActivity({ kind: 'round', title: `Next step with ${investor.name}: ${nextStep}`, titleEl: `Επόμενο βήμα με ${investor.name}: ${nextStep}`, href: CRM_HREF, byAssistant: true });
    return {
      tool: 'followup-set',
      en: `Set: ${investor.name} — ${nextStep} (${when.en}). It shows on the pipeline and in your follow-ups.`,
      el: `Ορίστηκε: ${investor.name} — ${nextStep} (${when.el}). Φαίνεται στη ροή και στα follow-ups σου.`,
      href: CRM_HREF,
      links: [FUNDRAISING_LINK],
      sources: [SOURCE],
    };
  };
  if (!propose) return apply();
  return proposal(
    {
      summary: {
        en: `Set the next step with ${investor.name} to “${nextStep}”, ${when.en}?`,
        el: `Επόμενο βήμα με ${investor.name}: «${nextStep}», ${when.el};`,
      },
      reversal: 'full',
      apply,
      undo: () => {
        restorePipelineEntry(investor.investorId, before);
        logActivity({ kind: 'round', title: `Undid: next step with ${investor.name}`, titleEl: `Αναιρέθηκε: επόμενο βήμα με ${investor.name}`, href: CRM_HREF, byAssistant: true });
      },
    },
    'followup-set',
  );
}

export function pipelineMoveResult(query: string, propose: boolean): AssistantResult | null {
  const folded = fold(query);
  const found = findInvestor(folded, readRound().pipeline ?? []);
  if (!found) return null;
  const stage = parseStage(folded.slice(found.end));
  if (!stage) return null;
  const { investor } = found;
  if (investor.stage === stage) {
    return {
      tool: 'pipeline',
      en: `${investor.name} is already at ${stage}.`,
      el: `Η/Ο ${investor.name} είναι ήδη στο στάδιο «${STAGE_LABEL_EL[stage] ?? stage}».`,
      href: CRM_HREF,
      links: [FUNDRAISING_LINK],
      sources: [SOURCE],
    };
  }
  const previous = investor.stage;
  const before = snapshot(investor.investorId);
  const apply = (): AssistantResult => {
    setPipelineStage(investor.investorId, stage);
    logActivity({ kind: 'round', title: `${investor.name} → ${stage}`, titleEl: `${investor.name} → ${STAGE_LABEL_EL[stage] ?? stage}`, href: CRM_HREF, byAssistant: true });
    return {
      tool: 'pipeline-move',
      en: `Moved ${investor.name} from ${previous} to ${stage}.`,
      el: `Η/Ο ${investor.name} πέρασε από «${STAGE_LABEL_EL[previous] ?? previous}» σε «${STAGE_LABEL_EL[stage] ?? stage}».`,
      href: CRM_HREF,
      links: [FUNDRAISING_LINK],
      sources: [SOURCE],
    };
  };
  if (!propose) return apply();
  return proposal(
    {
      summary: {
        en: `Move ${investor.name} from ${previous} to ${stage}?`,
        el: `Μετακίνηση ${investor.name} από «${STAGE_LABEL_EL[previous] ?? previous}» σε «${STAGE_LABEL_EL[stage] ?? stage}»;`,
      },
      reversal: 'full',
      apply,
      undo: () => {
        restorePipelineEntry(investor.investorId, before);
      },
    },
    'pipeline-move',
  );
}

/** The investor name (and an optional stage) in "add <name> to my pipeline at Meeting" / «πρόσθεσε τη <name> στη ροή μου». */
function nameToAdd(query: string): { name: string; stage: string | null } | null {
  const folded = fold(query);
  const en = /^(?:please\s+)?(?:add|track|put)\s+(.+?)\s+(?:to|in|into|on)\s+(?:my\s+|the\s+)?(?:investor\s+)?(?:pipeline|investor list|crm|round)\b/.exec(folded);
  const el = /^(?:προσθεσε|βαλε|παρακολουθησε)\s+(?:τη\s+|την\s+|τον\s+|το\s+|τους\s+)?(.+?)\s+(?:στη|στην|στον|στο|στους)\s+(?:ροη|αγωγο|λιστα επενδυτων|επενδυτες|crm)/.exec(folded);
  const match = en ?? el;
  if (!match || match[1] === undefined) return null;
  const start = match.index + match[0].indexOf(match[1]);
  const name = query.slice(start, start + match[1].length).trim().replace(/^["“«]|["”»]$/g, '');
  if (name.length < 2 || name.length > 80) return null;
  const rest = folded.slice(match.index + match[0].length);
  return { name, stage: /\S/.test(rest) ? parseStage(rest) : null };
}

export function pipelineAddResult(query: string, propose: boolean): AssistantResult | null {
  const parsed = nameToAdd(query);
  if (!parsed) return null;
  const { name } = parsed;
  const stage = parsed.stage ?? 'Identified';
  const stageEl = STAGE_LABEL_EL[stage] ?? stage;
  const pipeline = readRound().pipeline ?? [];
  const existing = findInvestor(fold(name), pipeline);
  if (existing) {
    return {
      tool: 'pipeline',
      en: `${existing.investor.name} is already in your pipeline (${existing.investor.stage}).`,
      el: `Η/Ο ${existing.investor.name} είναι ήδη στη ροή σου («${STAGE_LABEL_EL[existing.investor.stage] ?? existing.investor.stage}»).`,
      href: CRM_HREF,
      links: [FUNDRAISING_LINK],
      sources: [SOURCE],
    };
  }
  const known = isDemoData() ? DEMO_INVESTOR_NAMES.find((item) => fold(item.name) === fold(name) || fold(item.name).startsWith(fold(name))) : undefined;
  const investorId = known?.id ?? `inv-${fold(name).replace(/[^a-z0-9α-ω]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || Date.now().toString(36)}`;
  const display = known?.name ?? name;
  const apply = (): AssistantResult => {
    upsertPipelineInvestor({ investorId, name: display, stage });
    logActivity({ kind: 'round', title: `Added ${display} to the pipeline (${stage})`, titleEl: `Προστέθηκε στη ροή: ${display} (${stageEl})`, href: CRM_HREF, byAssistant: true });
    return {
      tool: 'pipeline-add',
      en: `Added ${display} to your pipeline as ${stage}. Set a next step: “next step with ${display}: ask for an intro by Friday”.`,
      el: `Η/Ο ${display} μπήκε στη ροή σου ως «${stageEl}». Όρισε επόμενο βήμα: «επόμενο βήμα με ${display}: ζήτα γνωριμία μέχρι Παρασκευή».`,
      href: CRM_HREF,
      links: [FUNDRAISING_LINK],
      sources: [SOURCE],
    };
  };
  if (!propose) return apply();
  return proposal(
    {
      summary: { en: `Add ${display} to your investor pipeline as ${stage}?`, el: `Προσθήκη ${display} στη ροή επενδυτών ως «${stageEl}»;` },
      reversal: 'full',
      apply,
      undo: () => {
        restorePipelineEntry(investorId, undefined);
      },
    },
    'pipeline-add',
  );
}

// ── Routing ────────────────────────────────────────────────────────────────

const QUESTION = /^(?:what|which|when|show|list|any|do i|are there|who)\b|^(?:ποια|ποιο|ποιος|ποιες|τι|δειξε|εχω|υπαρχ|ποτε)/;

/** The pipeline tool a sentence asks for, or null so the router keeps looking. */
/** "/investor add X at Y" → "add X to my pipeline at Y", and the other slash forms, into sentences the routes below read. */
export function expandSlash(query: string): string {
  const text = query.trim();
  const add = /^\/investors?\s+add\s+(.+?)(?:\s+(?:at|as|stage:?)\s+(.+))?$/i.exec(text);
  if (add) return `add ${add[1]} to my pipeline${add[2] ? ` at ${add[2]}` : ''}`;
  const move = /^\/investors?\s+move\s+(.+)$/i.exec(text);
  if (move) return `move ${move[1]}`;
  const next = /^\/investors?\s+next\s+(.+?)\s*:\s*(.+)$/i.exec(text);
  if (next) return `next step with ${next[1]}: ${next[2]}`;
  if (/^\/(?:pipeline|crm)\b/i.test(text)) return 'show my pipeline';
  if (/^\/(?:followups?|follow-ups?)\b/i.test(text)) return 'what follow-ups are due';
  return text;
}

export function routePipeline(rawQuery: string, propose: boolean, now: Date = new Date()): AssistantResult | null {
  const query = expandSlash(rawQuery);
  const folded = fold(query.trim());
  const followWords = hasStem(folded, 'follow-up', 'follow up', 'followup', 'follow-ups', 'followups');
  const nextStepWords = hasStem(folded, 'next step', 'remind me to', 'επομενο βημα', 'υπενθυμισ');
  const followUpWords = followWords || nextStepWords;
  // "What is my next step?" with no investor in it is the general next-step question, not this one.
  const aboutInvestors = hasStem(folded, 'investor', 'επενδυτ') || findInvestor(folded, readRound().pipeline ?? []) !== null;

  if (QUESTION.test(folded) && (followWords || (nextStepWords && aboutInvestors))) return followUpsResult(now);
  if (hasStem(folded, 'overdue', 'εκπροθεσμ', 'καθυστερ') && hasStem(folded, 'investor', 'follow', 'επενδυτ')) return followUpsResult(now);

  const added = hasStem(folded, 'add', 'track', 'put', 'προσθεσ', 'βαλε', 'παρακολουθησ') ? pipelineAddResult(query, propose) : null;
  if (added) return added;

  if (hasStem(folded, 'move', 'moved', 'mark', 'advance', 'bump', 'set', 'put', 'is now', 'went', 'μετακινησ', 'βαλε', 'ορισε', 'περασε', 'γυρισε')) {
    const moved = pipelineMoveResult(query, propose);
    if (moved) return moved;
  }

  if (followUpWords) {
    const set = followUpSetResult(query, propose, now);
    if (set) return set;
  }

  if (/\b(pipeline|funnel|crm|my investors)\b/.test(folded) || hasStem(folded, 'ροη επενδυτ', 'αγωγ', 'ροη μου', 'τους επενδυτες μου')) return pipelineReadResult(now);
  return null;
}
