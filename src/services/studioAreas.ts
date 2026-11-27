/**
 * Studio areas the operator could not see before: the pitch deck slides,
 * the Legal Hub checklist, today's focus time and saved Discovery searches.
 * Same lists the pages read; writes return proposals with an exact undo.
 */
import { PITCH_SLIDES, effectivePitch, readPitch, slideStatus, writePitchSlide, type PitchSlideKey } from '../lib/pitch';
import { LEGAL_CHECKLIST, isLegalDone, legalProgress, readLegalChecklist, setLegalItem } from '../lib/legalChecklist';
import { addFocusSession, readFocusToday } from '../lib/focusStats';
import { addLocalEndorsement, addSavedSearch, keys, logActivity, readDiscoveryFilters, readEndorsements, readIds, readSavedSearches, removeLocalEndorsement, removeSavedSearch, writeValue } from '../lib/localLists';
import { directoryPeople, findPerson, type Person } from '../lib/peopleSource';
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

/** "/focus log 25", "Log a 25-minute focus session", "Κατάγραψε συνεδρία συγκέντρωσης 25 λεπτών". */
export function parseFocusLog(query: string): number | null {
  const folded = fold(query);
  const slash = folded.match(/^\/focus\s+(?:log|add)(?:\s+(\d{1,3}))?\b/);
  const en = folded.match(/\b(?:log|record|add)\s+(?:a\s+)?(?:(\d{1,3})[\s-]*(?:min(?:ute)?s?|m)\s+)?focus\s+(?:session|block|timer)(?:\s+(?:of|for)\s+(\d{1,3})\s*(?:min(?:ute)?s?|m))?/);
  const el = folded.match(/(?:καταγραψ\S*|προσθεσ\S*)\s+(?:μια\s+)?συνεδρια\s+(?:συγκεντρωσ\S*|focus)(?:\s+(\d{1,3})\s*(?:λεπτ\S*|m))?/);
  const hit = slash ?? en ?? el;
  if (!hit) return null;
  const raw = Number(hit[1] || hit[2] || 25);
  return Math.max(5, Math.min(180, Number.isFinite(raw) ? raw : 25));
}

export function focusLogResult(minutes: number, propose: boolean, proposalResult: Proposer): AssistantResult {
  const before = readFocusToday();
  const link: AssistantLink = { href: '/workspace', en: 'Open workspace', el: 'Άνοιγμα χώρου εργασίας' };
  const apply = (): AssistantResult => {
    const next = addFocusSession(minutes);
    const totalMinutes = Math.round(next.seconds / 60);
    logActivity({ kind: 'task', title: `Logged ${minutes}m focus session`, titleEl: `Καταγράφηκε συνεδρία συγκέντρωσης ${minutes} λεπτών`, href: '/workspace', byAssistant: true });
    return {
      tool: 'focus-log',
      en: `Logged a ${minutes}-minute focus session. Today: ${next.sessions} session${next.sessions === 1 ? '' : 's'} (${totalMinutes} minutes) — same counter Workspace shows.`,
      el: `Καταγράφηκε συνεδρία συγκέντρωσης ${minutes} λεπτών. Σήμερα: ${next.sessions} συνεδρίες (${totalMinutes} λεπτά) — ο ίδιος μετρητής με τον Χώρο Εργασίας.`,
      href: '/workspace',
      links: [link],
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `Log a ${minutes}-minute focus session for today?`, el: `Καταγραφή συνεδρίας συγκέντρωσης ${minutes} λεπτών για σήμερα;` },
      reversal: 'full',
      apply,
      undo: () => { writeValue(keys.focus, before); },
    },
    { tool: 'focus-log', href: '/workspace', links: [link] },
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

/** "/searches save Fintech CTO", "Save search Fintech CTO", "Αποθήκευσε αναζήτηση Fintech CTO". */
export function parseSaveSearch(query: string): string | null {
  const slash = query.match(/^\/searches\s+(?:save|add)\s+(.+)$/i);
  const en = query.match(/^(?:save|bookmark)\s+(?:a\s+|my\s+|the\s+)?(?:discovery\s+)?search(?:\s+(?:for|as|called|:))?\s+(.+)$/i);
  const el = query.match(/^(?:αποθηκευσε|αποθήκευσε)\s+(?:την\s+|μια\s+)?(?:αναζητηση|αναζήτηση)(?:\s+(?:για|ως|:))?\s+(.+)$/i);
  const hit = slash ?? en ?? el;
  if (!hit) return null;
  const label = clean(hit[1] ?? '').slice(0, 80);
  return label || null;
}

export function saveSearchResult(label: string, propose: boolean, proposalResult: Proposer): AssistantResult {
  const link: AssistantLink = { href: '/discovery', en: 'Open discovery', el: 'Άνοιγμα εξερεύνησης' };
  let createdId = '';
  const apply = (): AssistantResult => {
    const current = readDiscoveryFilters();
    const item = addSavedSearch({ ...current, q: label }, label);
    createdId = item.id;
    const total = readSavedSearches().length;
    logActivity({ kind: 'tool', title: `Saved search: ${label}`, titleEl: `Αποθηκεύτηκε αναζήτηση: ${label}`, href: '/discovery', byAssistant: true });
    return {
      tool: 'save-search',
      en: `Saved search “${label}” (${total} total) — same list Discovery shows.`,
      el: `Αποθηκεύτηκε η αναζήτηση «${label}» (${total} συνολικά) — η ίδια λίστα με την Εξερεύνηση.`,
      href: '/discovery',
      links: [link],
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `Save Discovery search “${label}”?`, el: `Αποθήκευση αναζήτησης Εξερεύνησης «${label}»;` },
      reversal: 'full',
      apply,
      undo: () => { if (createdId) removeSavedSearch(createdId); },
    },
    { tool: 'save-search', href: '/discovery', links: [link] },
  );
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

export function isUnhidePeopleQuery(folded: string): boolean {
  return /^\/unhide\b/.test(folded)
    || /\b(unhide|restore|show)\s+(all\s+)?hidden\s+(members?|people|profiles?|founders?)\b/.test(folded)
    || /\bunhide\s+(everyone|all\s+members|all\s+people)\b/.test(folded)
    || /(επαναφορ|εμφανισ|ξεκρυψ).{0,20}κρυμμεν.{0,15}(μελ|προφιλ|ανθρωπ)/.test(folded);
}

export function unhidePeopleResult(propose: boolean, proposalResult: Proposer): AssistantResult {
  const before = readIds(keys.hiddenPeople);
  const link: AssistantLink = { href: '/matches', en: 'Open matches', el: 'Άνοιγμα αντιστοιχίσεων' };
  const apply = (): AssistantResult => {
    writeValue(keys.hiddenPeople, []);
    logActivity({ kind: 'settings', title: 'Restored hidden members', titleEl: 'Επαναφορά κρυμμένων μελών', href: '/matches', byAssistant: true });
    return {
      tool: 'unhide-people',
      en: before.length === 0
        ? 'No members were hidden — Matches and Explore already show everyone.'
        : `Restored ${before.length} hidden member${before.length === 1 ? '' : 's'}. They appear in Matches and Explore again.`,
      el: before.length === 0
        ? 'Κανένα μέλος δεν ήταν κρυμμένο — οι Αντιστοιχίσεις και η Εξερεύνηση δείχνουν ήδη όλους.'
        : `Επανήλθαν ${before.length} κρυμμένα μέλη. Εμφανίζονται ξανά στις Αντιστοιχίσεις και την Εξερεύνηση.`,
      href: '/matches',
      links: [link],
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: {
        en: before.length > 0 ? `Restore ${before.length} hidden member${before.length === 1 ? '' : 's'} to Matches and Explore?` : 'Restore hidden members to Matches and Explore?',
        el: before.length > 0 ? `Επαναφορά ${before.length} κρυμμένων μελών στις Αντιστοιχίσεις και την Εξερεύνηση;` : 'Επαναφορά κρυμμένων μελών στις Αντιστοιχίσεις και την Εξερεύνηση;',
      },
      reversal: 'full',
      apply,
      undo: () => { writeValue(keys.hiddenPeople, before); },
    },
    { tool: 'unhide-people', href: '/matches', links: [link] },
  );
}

function matchPerson(text: string): Person | undefined {
  const folded = fold(text);
  const pool = directoryPeople();
  return (
    pool.find((p) => folded.includes(fold(p.fullName))) ??
    pool.find((p) => {
      const first = fold(p.fullName.split(' ')[0] ?? '');
      return first.length >= 3 && new RegExp(`(?:^|[^a-zα-ω])${first}(?:$|[^a-zα-ω])`).test(folded);
    })
  );
}

/** "/endorse Sarah Chen: React", "Endorse Sarah Chen for React", "Verify Sarah Chen for React", "Κάνε σύσταση στη Sarah Chen για React". */
export function parseEndorseSkill(query: string): { person: Person; skill: string; comment?: string } | null {
  const slash = query.match(/^\/endorse(?:ment)?\s+([^:–-]+?)\s*[:–-]\s*([^|]+?)(?:\s*\|\s*(.+))?$/i);
  if (slash) {
    const person = matchPerson(slash[1] ?? '');
    const skill = clean(slash[2] ?? '').slice(0, 60);
    const comment = slash[3] ? clean(slash[3]).slice(0, 240) : undefined;
    if (person && skill) return { person, skill, comment };
  }
  const en = query.match(/^(?:endorse|verify)\s+(.{2,45}?)\s+(?:for|in|on)\s+([A-Za-z0-9+#./&\s-]{2,45}?)(?:\s*[:–-]\s*(.+))?$/i);
  if (en) {
    const person = matchPerson(en[1] ?? '');
    const skill = clean(en[2] ?? '').slice(0, 60);
    const comment = en[3] ? clean(en[3]).slice(0, 240) : undefined;
    if (person && skill) return { person, skill, comment };
  }
  const el = query.match(/^(?:κανε\s+συσταση|κάνε\s+σύσταση|επαληθευσε|επαλήθευσε|συστησε|σύστησε)\s+(?:τον|την|το|στ\S+)?\s*(.{2,45}?)\s+(?:για|σε)\s+(.{2,45}?)(?:\s*[:–-]\s*(.+))?$/i);
  if (el) {
    const person = matchPerson(el[1] ?? '');
    const skill = clean(el[2] ?? '').slice(0, 60);
    const comment = el[3] ? clean(el[3]).slice(0, 240) : undefined;
    if (person && skill) return { person, skill, comment };
  }
  return null;
}

export function endorseSkillResult(
  input: { person: Person; skill: string; comment?: string },
  propose: boolean,
  proposalResult: Proposer,
): AssistantResult {
  const href = `/profile/${input.person.id}`;
  const link: AssistantLink = { href, en: `Open ${input.person.fullName}'s profile`, el: `Άνοιγμα προφίλ ${input.person.fullName}` };
  let createdId = '';
  const apply = (): AssistantResult => {
    const entry = addLocalEndorsement({
      endorserId: 'demo-user',
      endorserName: 'Demo Founder',
      endorserRole: 'Founder',
      recipientId: input.person.id,
      recipientName: input.person.fullName,
      skillId: input.skill,
      relationship: 'Collaborator',
      comment: input.comment,
    });
    createdId = entry.id;
    const totalForPerson = readEndorsements(input.person.id).length;
    logActivity({
      kind: 'profile',
      title: `Verified ${input.person.fullName} for ${input.skill}`,
      titleEl: `Επαληθεύτηκε η δεξιότητα ${input.skill} για ${input.person.fullName}`,
      href,
      byAssistant: true,
    });
    return {
      tool: 'endorse-skill',
      en: `Verified ${input.person.fullName} for ${input.skill} (${totalForPerson} verified skill badge${totalForPerson === 1 ? '' : 's'} on their profile).`,
      el: `Επαληθεύτηκε η δεξιότητα ${input.skill} για ${input.person.fullName} (${totalForPerson} επαληθευμένες δεξιότητες στο προφίλ).`,
      href,
      links: [link],
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: {
        en: `Verify ${input.person.fullName}'s skill “${input.skill}” as a collaborator?`,
        el: `Επαλήθευση της δεξιότητας «${input.skill}» για ${input.person.fullName} ως συνεργάτης;`,
      },
      reversal: 'full',
      apply,
      undo: () => { if (createdId) removeLocalEndorsement(createdId); },
    },
    { tool: 'endorse-skill', href, links: [link] },
  );
}

export function isEndorsementsReadQuery(folded: string): boolean {
  return (
    /^\/endorsements?\b/.test(folded) ||
    /\b(my\s+|skill\s+|verified\s+|collaborator\s+)?endorsements?\b/.test(folded) ||
    /\bverified\s+skills?\b/.test(folded) ||
    /(συστασ\S*|επαληθευμ\S*\s+δεξιοτ\S*)/.test(folded)
  );
}

export function endorsementsReadResult(query: string): AssistantResult {
  const person = matchPerson(query);
  const recipientId = person ? person.id : 'demo-user';
  const items = readEndorsements(recipientId);
  const href = person ? `/profile/${person.id}` : '/profile';
  const link: AssistantLink = person
    ? { href, en: `Open ${person.fullName}'s profile`, el: `Άνοιγμα προφίλ ${person.fullName}` }
    : { href: '/profile', en: 'Open your profile', el: 'Άνοιγμα του προφίλ σου' };
  if (items.length === 0) {
    return {
      tool: 'endorsements',
      en: person
        ? `${person.fullName} has no collaborator-verified skills yet. Say “Endorse ${person.fullName} for ${person.skills[0] || 'Product Strategy'}” to add the first verification.`
        : 'No collaborator skill endorsements yet. Collaborators can verify your skills on your Profile page.',
      el: person
        ? `Δεν υπάρχουν ακόμη επαληθευμένες δεξιότητες για ${person.fullName}. Πες «Κάνε σύσταση στη ${person.fullName} για ${person.skills[0] || 'Product Strategy'}».`
        : 'Δεν υπάρχουν ακόμη επαληθεύσεις δεξιοτήτων. Οι συνεργάτες σου μπορούν να επαληθεύσουν τις δεξιότητές σου στη σελίδα Προφίλ.',
      href,
      links: [link],
    };
  }
  const linesEn = items.slice(0, 6).map((item) => {
    const who = findPerson(item.endorserId)?.fullName || item.endorserName || 'Collaborator';
    const rel = item.relationship ? ` (${item.relationship})` : '';
    return `✓ ${item.skillId} — verified by ${who}${rel}${item.comment ? `: “${item.comment}”` : ''}`;
  });
  const linesEl = items.slice(0, 6).map((item) => {
    const who = findPerson(item.endorserId)?.fullName || item.endorserName || 'Συνεργάτης';
    const rel = item.relationship ? ` (${item.relationship})` : '';
    return `✓ ${item.skillId} — επαληθεύτηκε από ${who}${rel}${item.comment ? `: «${item.comment}»` : ''}`;
  });
  const subjectEn = person ? `${person.fullName}'s verified skills` : 'Your verified skills & endorsements';
  const subjectEl = person ? `Επαληθευμένες δεξιότητες (${person.fullName})` : 'Οι επαληθευμένες δεξιότητες & συστάσεις σου';
  return {
    tool: 'endorsements',
    en: `${subjectEn} (${items.length}), shown as badges on Profile:\n${linesEn.join('\n')}`,
    el: `${subjectEl} (${items.length}), εμφανίζονται ως σήματα στο Προφίλ:\n${linesEl.join('\n')}`,
    href,
    links: [link],
  };
}

