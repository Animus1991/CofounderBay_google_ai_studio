/**
 * Studio areas the operator could not see before: the pitch deck slides,
 * the Legal Hub checklist, today's focus time and saved Discovery searches.
 * Same lists the pages read; writes return proposals with an exact undo.
 */
import { PITCH_SLIDES, effectivePitch, readPitch, slideStatus, writePitchSlide, type PitchSlideKey } from '../lib/pitch';
import { LEGAL_CHECKLIST, isLegalDone, legalProgress, readLegalChecklist, setLegalItem } from '../lib/legalChecklist';
import { readFocusToday } from '../lib/focusStats';
import { keys, logActivity, readSavedSearches, writeValue } from '../lib/localLists';
import type { AssistantLink, AssistantProposal, AssistantResult } from './assistantOps';

type Proposer = (plan: AssistantProposal, base: { tool: string; href?: string; links: AssistantLink[] }) => AssistantResult;

const PITCH_LINK: AssistantLink = { href: '/founder-tools?tab=pitch', en: 'Open pitch deck', el: 'Άνοιγμα pitch deck' };
const slideLink = (key: PitchSlideKey): AssistantLink => ({ href: `/founder-tools?tab=pitch&slide=${key}`, en: 'Open this slide', el: 'Άνοιγμα της διαφάνειας' });
const LEGAL_LINK: AssistantLink = { href: '/legal', en: 'Open legal hub', el: 'Άνοιγμα νομικών' };

const SLIDE_ALIASES: Record<PitchSlideKey, string[]> = {
  cover: ['cover', 'hook', 'εξωφυλλ'],
  problem: ['problem', 'προβλημ'],
  solution: ['solution', 'λυση'],
  market: ['market', 'tam', 'αγορ'],
  model: ['model', 'business model', 'revenue', 'μοντελ'],
  traction: ['traction', 'ελξη'],
  team: ['team', 'ομαδ'],
  ask: ['ask', 'use of funds', 'αιτημ', 'κεφαλαι'],
};

const fold = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const clean = (v: string) => v.trim().replace(/^[“"«']+|[”"»']+$/g, '').trim();

function slideFrom(text: string): PitchSlideKey | undefined {
  const folded = fold(text);
  return (Object.keys(SLIDE_ALIASES) as PitchSlideKey[]).find((key) => SLIDE_ALIASES[key].some((alias) => folded.includes(alias)));
}

export function isPitchQuery(folded: string): boolean {
  if (/\b(add|create|new)\b.{0,20}\b(task|todo)\b/.test(folded)) return false;
  return /^\/pitch\b/.test(folded) || /\bpitch\s*(deck|slides?)\b/.test(folded) || /διαφανει/.test(folded);
}

/** "/pitch problem: text", "set the problem slide to text", "όρισε τη διαφάνεια problem σε text". */
export function parsePitchSet(query: string): { slide: PitchSlideKey; text: string } | null {
  const slash = query.match(/^\/pitch\s+(\S+)\s*[:\-–]?\s+(.+)$/i);
  const verb = query.match(/(?:set|update|write|change)\s+(?:the\s+)?(?:pitch\s+(?:deck\s+)?)?(.{2,30}?)\s+slide\s+(?:to|as|:)\s+(.+)$/i)
    ?? query.match(/(?:ορισε|αλλαξε|γραψε)\s+(?:τη|την)?\s*διαφανει\S*\s+(.{2,30}?)\s+(?:σε|ως|:)\s+(.+)$/i)
    ?? query.match(/(?:όρισε|άλλαξε|γράψε)\s+(?:τη|την)?\s*διαφάνει\S*\s+(.{2,30}?)\s+(?:σε|ως|:)\s+(.+)$/i);
  const hit = slash ?? verb;
  if (!hit) return null;
  const slide = slideFrom(hit[1] ?? '');
  const text = clean(hit[2] ?? '');
  return slide && text ? { slide, text: text.slice(0, 1200) } : null;
}

export function pitchReadResult(): AssistantResult {
  const deck = effectivePitch();
  const rows = PITCH_SLIDES.map((slide) => ({ slide, status: slideStatus(deck[slide.key]) }));
  const complete = rows.filter((row) => row.status === 'complete').length;
  const nextGap = rows.find((row) => row.status !== 'complete');
  const mark = (status: string) => (status === 'complete' ? '✓' : status === 'in-progress' ? '…' : '○');
  return {
    tool: 'pitch',
    en: `Pitch deck: ${complete}/${rows.length} slides complete — same deck Founder Tools shows.\n${rows.map((row) => `${mark(row.status)} ${row.slide.en}`).join('\n')}${nextGap ? `\nNext: say “set the ${nextGap.slide.key} slide to …”.` : ''}`,
    el: `Pitch deck: ${complete}/${rows.length} διαφάνειες ολοκληρωμένες — το ίδιο deck με τα Εργαλεία Ιδρυτή.\n${rows.map((row) => `${mark(row.status)} ${row.slide.el}`).join('\n')}${nextGap ? `\nΕπόμενο: πες «όρισε τη διαφάνεια ${nextGap.slide.key} σε …».` : ''}`,
    href: PITCH_LINK.href,
    links: [PITCH_LINK],
  };
}

export function pitchSetResult(set: { slide: PitchSlideKey; text: string }, propose: boolean, proposalResult: Proposer): AssistantResult {
  const slide = PITCH_SLIDES.find((item) => item.key === set.slide)!;
  const before = readPitch()[set.slide];
  const apply = (): AssistantResult => {
    writePitchSlide(set.slide, set.text);
    logActivity({ kind: 'milestone', title: `Updated pitch slide ${slide.en}`, titleEl: `Ενημερώθηκε η διαφάνεια ${slide.el}`, href: PITCH_LINK.href, byAssistant: true });
    return {
      tool: 'pitch-set',
      en: `Saved the ${slide.en} slide (${slideStatus(set.text)}). Founder Tools → Pitch shows the same text.`,
      el: `Αποθηκεύτηκε η διαφάνεια ${slide.el} (${slideStatus(set.text)}). Τα Εργαλεία Ιδρυτή → Pitch δείχνουν το ίδιο κείμενο.`,
      href: slideLink(set.slide).href,
      links: [slideLink(set.slide), PITCH_LINK],
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `Set the ${slide.en} slide to “${set.text}”?`, el: `Ορισμός της διαφάνειας ${slide.el} σε «${set.text}»;` },
      reversal: 'full',
      apply,
      undo: () => { writePitchSlide(set.slide, before ?? ''); },
    },
    { tool: 'pitch-set', href: slideLink(set.slide).href, links: [slideLink(set.slide), PITCH_LINK] },
  );
}

export function isLegalChecklistQuery(folded: string): boolean {
  return /^\/legal\b/.test(folded) || /\b(legal|compliance)\s+(checklist|progress|status)\b/.test(folded) || /(νομικ|συμμορφωσ).{0,12}(λιστ|προοδ|checklist)/.test(folded);
}

/** "mark EIN done", "untick vesting", "σημείωσε το EIN ως ολοκληρωμένο". */
export function parseLegalToggle(query: string): { id: string; done: boolean } | null {
  const folded = fold(query);
  if (/\b(milestones?|tasks?|todo)\b|οροσημ|εργασι/.test(folded)) return null;
  const doneVerb = /\b(mark|tick|check off|complete)\b.{1,60}\b(done|complete|completed|finished)\b/.test(folded) || /\btick\b|\bcheck off\b/.test(folded) || /σημειωσ.{1,60}(ολοκληρωμ|εγινε|τελειωσ)/.test(folded);
  const undoVerb = /\b(untick|uncheck|mark .{1,60} (not done|undone|open|pending))\b/.test(folded) || /(ξετσεκαρ|σημειωσ.{1,60}(εκκρεμ|ανοιχτ))/.test(folded);
  if (!doneVerb && !undoVerb) return null;
  const item = LEGAL_CHECKLIST.find((row) => row.aliases.some((alias) => new RegExp(`(?:^|[^a-z0-9α-ω])${alias}`).test(folded)));
  return item ? { id: item.id, done: !undoVerb } : null;
}

export function legalChecklistResult(): AssistantResult {
  const stored = readLegalChecklist();
  const progress = legalProgress();
  const lines = LEGAL_CHECKLIST.map((item) => ({ item, done: isLegalDone(item.id, stored) }));
  return {
    tool: 'legal-checklist',
    en: `Compliance checklist: ${progress.done}/${progress.total} done — same list as the Legal Hub.\n${lines.map(({ item, done }) => `${done ? '✓' : '○'} ${item.en}`).join('\n')}${progress.next ? `\nNext: “mark ${progress.next.aliases[0]} done”.` : ''}`,
    el: `Λίστα συμμόρφωσης: ${progress.done}/${progress.total} ολοκληρωμένα — η ίδια λίστα με τα Νομικά.\n${lines.map(({ item, done }) => `${done ? '✓' : '○'} ${item.el}`).join('\n')}${progress.next ? `\nΕπόμενο: «mark ${progress.next.aliases[0]} done».` : ''}`,
    href: LEGAL_LINK.href,
    links: [LEGAL_LINK],
  };
}

export function legalToggleResult(toggle: { id: string; done: boolean }, propose: boolean, proposalResult: Proposer): AssistantResult {
  const item = LEGAL_CHECKLIST.find((row) => row.id === toggle.id)!;
  const before = readLegalChecklist();
  if (isLegalDone(item.id, before) === toggle.done) {
    return {
      tool: 'legal-check',
      en: `“${item.en}” is already ${toggle.done ? 'done' : 'open'} — nothing to change.`,
      el: `Το «${item.el}» είναι ήδη ${toggle.done ? 'ολοκληρωμένο' : 'σε εκκρεμότητα'} — δεν χρειάζεται αλλαγή.`,
      href: LEGAL_LINK.href,
      links: [LEGAL_LINK],
    };
  }
  const apply = (): AssistantResult => {
    setLegalItem(item.id, toggle.done);
    const progress = legalProgress();
    logActivity({ kind: 'milestone', title: `${toggle.done ? 'Completed' : 'Reopened'}: ${item.en}`, titleEl: `${toggle.done ? 'Ολοκληρώθηκε' : 'Άνοιξε ξανά'}: ${item.el}`, href: LEGAL_LINK.href, byAssistant: true });
    return {
      tool: 'legal-check',
      en: `${item.en} is now ${toggle.done ? 'done' : 'open'}. Checklist ${progress.done}/${progress.total} on the Legal Hub.`,
      el: `${item.el}: ${toggle.done ? 'ολοκληρώθηκε' : 'ξανά σε εκκρεμότητα'}. Λίστα ${progress.done}/${progress.total} στα Νομικά.`,
      href: LEGAL_LINK.href,
      links: [LEGAL_LINK],
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `Mark “${item.en}” as ${toggle.done ? 'done' : 'not done'}?`, el: `Σήμανση «${item.el}» ως ${toggle.done ? 'ολοκληρωμένο' : 'σε εκκρεμότητα'};` },
      reversal: 'full',
      apply,
      undo: () => { writeValue(keys.legalChecklist, before); },
    },
    { tool: 'legal-check', href: LEGAL_LINK.href, links: [LEGAL_LINK] },
  );
}

export function isFocusQuery(folded: string): boolean {
  return /^\/focus\b/.test(folded) || /\bfocus\s*(time|today|sessions?|stats|minutes)\b/.test(folded) || /\bhow (long|much) did i focus\b/.test(folded) || /(χρονο|ωρες|λεπτα).{0,15}(συγκεντρωσ|focus)|focus.{0,10}σημερα/.test(folded);
}

export function focusResult(): AssistantResult {
  const stats = readFocusToday();
  const minutes = Math.round(stats.seconds / 60);
  const link: AssistantLink = { href: '/workspace', en: 'Open workspace', el: 'Άνοιγμα χώρου εργασίας' };
  return {
    tool: 'focus',
    en: stats.sessions === 0
      ? 'No focus sessions yet today. Start the 25-minute timer in Workspace — each finished block counts here.'
      : `Today: ${stats.sessions} focus session${stats.sessions === 1 ? '' : 's'}, ${minutes} minutes — same counter Workspace shows.`,
    el: stats.sessions === 0
      ? 'Καμία συνεδρία συγκέντρωσης σήμερα. Ξεκίνα το χρονόμετρο 25 λεπτών στον Χώρο Εργασίας — κάθε ολοκληρωμένο μπλοκ μετρά εδώ.'
      : `Σήμερα: ${stats.sessions} συνεδρίες συγκέντρωσης, ${minutes} λεπτά — ο ίδιος μετρητής με τον Χώρο Εργασίας.`,
    href: '/workspace',
    links: [link],
  };
}

export function isSavedSearchQuery(folded: string): boolean {
  return /^\/searches\b/.test(folded) || /\bsaved\s+searches?\b/.test(folded) || /αποθηκευμεν.{0,6}αναζητησ/.test(folded);
}

export function savedSearchesResult(): AssistantResult {
  const list = readSavedSearches();
  const link: AssistantLink = { href: '/discovery', en: 'Open discovery', el: 'Άνοιγμα εξερεύνησης' };
  return {
    tool: 'saved-searches',
    en: list.length === 0
      ? 'No saved searches yet. Filter Discovery and press Save search — it shows up here and on Discovery.'
      : `Saved searches (${list.length}), same as Discovery:\n${list.map((item) => item.label).join('\n')}`,
    el: list.length === 0
      ? 'Δεν υπάρχουν αποθηκευμένες αναζητήσεις. Φίλτραρε την Εξερεύνηση και πάτα Αποθήκευση — θα εμφανιστεί εδώ και εκεί.'
      : `Αποθηκευμένες αναζητήσεις (${list.length}), ίδιες με την Εξερεύνηση:\n${list.map((item) => item.label).join('\n')}`,
    href: '/discovery',
    links: [link],
  };
}
