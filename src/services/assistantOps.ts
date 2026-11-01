/**
 * Deterministic studio operator. The chat panel runs this first so every
 * page, list and score the assistant mentions is the same data the rest of
 * the app already shows. Gemini only rewrites the wording.
 */
import { fold, hasStem } from './assistantText';
import { routePipeline, parseDay } from './assistantPipeline';
import { parseTime } from './assistantTime';
import { agendaFor, type AgendaItem } from '../lib/agenda';
import { setEventRegistration } from '../lib/eventRegistration';
import { atDaysFromToday } from '../data/demoClock';
import { updateStudioTask, insertStudioTask, readSessions, eventListKeys } from '../lib/localLists';
import { connectionRecords } from '../lib/social';
import { exportMyData } from '../lib/dataExport';
import { formatDate } from '../lib/dates';
import type { Milestone } from '../types';
import { whereIsResult } from '../ai/whereIs';
import { avatarOf, cofounderPool, directoryPeople, mentorPool, type Person } from '../lib/peopleSource';
import { compatibility, fromCast, fromProfile, listWords, rankPeople, type CompatibilityInput } from '../lib/compatibility';
import {
  addSession,
  addStudioTask,
  dataScope,
  isDemoData,
  seedFounderInvites,
  readInvites,
  readTasks,
  effectiveStatus,
  listKeys,
  readIds,
  logActivity,
  readActivity,
  unreadActivityCount,
  readMilestones,
  readNeeds,
  readOpenTo,
  readRound,
  readSaved,
  readTracked,
  readValue,
  writeValue,
  removeMilestone,
  removeRequest,
  removeSaved,
  removeSession,
  removeStudioTask,
  saveProfile,
  saveRequest,
  readChat,
  appendChatMessage,
  ensureChatConversation,
  searchChat,
  setId,
  trackApplication,
  untrackApplication,
  upsertMilestone,
  closeNeed,
  editNeed,
  upsertNeed,
  writeInvites,
  writeMatchFilters,
  writeNeeds,
  writeRound,
  followUps,
  readNotificationPrefs,
  writeNotificationPrefs,
  writeProfileLocal,
  keys,
  type ActivityKind,
  type NeedCard,
  type NeedField,
  type NotificationPrefs,
  type Round,
  type OpenToKind,
  type StudioTask,
  type TurnSource,
} from '../lib/localLists';
import { savedPerks, startupRecord, ventureName, ventureSummary } from '../lib/entities';
import { currentReadiness } from '../lib/readiness';
import { profileCompleteness } from '../lib/profileCompleteness';
import { formatMoney, formatPct, safeOwnershipAtCap } from '../lib/equity';
import { BUILDER_MODULES, builderStatus, readBuilderInputs } from '../lib/builder';
import { useUIStore, type PaletteTheme } from '../stores/useUIStore';
import { setGlobalLang } from '../lib/language';
import { applySwitches, readSwitches, type Switches } from '../lib/privacySwitches';
import { readAssistantPrefs, writeAssistantPrefs, type AssistantPrefs } from '../lib/assistantPrefs';
import { topPages, unvisited } from '../lib/usage';
import { readUxPrefs, writeUxPrefs, pinFavorite } from '../lib/personalization';
import { navLabel, NAV_PATHS } from '../lib/navMap';
import { assistantPages, pageContext } from '../lib/pageRegistry';
import { cloudNotificationsUnread, markAllNotificationsRead } from '../lib/notificationFeed';
import { persistProfilePatch } from '../lib/account';
import type { UserProfile } from '../types';
import { milestoneService } from './milestoneService';
import { mergeFitIntoViewer, readFitCheck } from '../lib/fitCheck';
import { roundMetrics } from '../lib/roundMetrics';
import { TEAM_AREAS, teamGaps } from '../lib/teamGaps';
import { studioNextStep, studioWaiting } from '../lib/nextStep';
import { applyQualifiers, parseQualifiers } from '../lib/searchQualifiers';
import { DEMO_EVENTS, datedKnowledge, demoEventsLine } from '../data/demoCatalog';
import { DEMO_CANVAS, DEMO_VENTURE } from '../data/demoVenture';
import { PITCH_SLIDES, effectivePitch, slideStatus } from '../lib/pitch';
import { legalProgress } from '../lib/legalChecklist';
import { ddReadResult, ddSetResult, ddShareResult, isDDReadQuery, parseDDSet, parseDDShare } from './ddOps';
import { ddProgress } from '../lib/dueDiligence';
import { investorEmailResult, parseInvestorEmail } from './investorOps';
import {
  focusResult,
  isFocusQuery,
  isLegalChecklistQuery,
  isPitchQuery,
  isSavedSearchQuery,
  legalChecklistResult,
  legalToggleResult,
  parseLegalToggle,
  parsePitchSet,
  pitchReadResult,
  pitchSetResult,
  savedSearchesResult,
} from './studioAreas';
import { daysFromToday, shortDay } from '../data/demoClock';

export type AssistantProfile = CompatibilityInput & {
  fullName?: string;
  headline?: string;
  bio?: string;
  location?: string | null;
};

export type AssistantLink = { href: string; en: string; el: string };

export type AssistantFollowUp = { en: string; el: string };

export type AssistantSource = TurnSource;

export type AssistantReversal = 'full' | 'partial' | 'none';

export type AssistantProposal = {
  /** What will change, one sentence, both languages. */
  summary: { en: string; el: string };
  reversal: AssistantReversal;
  /** Why the reversal is partial/none, shown under the card. Required unless reversal === 'full'. */
  reversalNote?: { en: string; el: string };
  /** Performs the write and returns the final result (the text that exists today). Firestore-backed writes resolve async. */
  apply: () => AssistantResult | Promise<AssistantResult>;
  /** Present iff reversal !== 'none'. Must restore exactly what apply changed. */
  undo?: () => void | Promise<void>;
};

export type AssistantResult = {
  en: string;
  el: string;
  href?: string;
  links: AssistantLink[];
  tool: string;
  followUps?: AssistantFollowUp[];
  sources?: AssistantSource[];
  proposal?: AssistantProposal;
  /**
   * True only when no studio tool matched and the router fell back to the
   * briefing. The chat uses it to hand the question to the model (or to say
   * honestly that it could not map it) instead of answering an unrelated
   * question with a status summary.
   */
  fallback?: boolean;
  /** A text the model may rewrite from these facts (e.g. an investor email); the router's version is the offline fallback. */
  draft?: { kind: 'email'; to: string; facts: string };
};

type LoggedWrite = { kind: ActivityKind; title: string; titleEl?: string; href?: string };

/** Re-logs the applied write as undone, under the same kind the apply used. */
function logUndo(logged: LoggedWrite | null) {
  if (!logged) return;
  logActivity({ kind: logged.kind, title: `Undid: ${logged.title}`, titleEl: `Αναιρέθηκε: ${logged.titleEl || logged.title}`, href: logged.href, byAssistant: true });
}

/** The result a write branch returns when it proposes instead of writing. */
function proposalResult(plan: AssistantProposal, base: { tool: string; href?: string; links: AssistantLink[] }): AssistantResult {
  return { tool: base.tool, en: plan.summary.en, el: plan.summary.el, href: base.href, links: base.links, proposal: plan };
}

const SOURCE = {
  people: { kind: 'people', en: 'People directory', el: 'Κατάλογος ανθρώπων', href: '/matches' },
  profile: { kind: 'profile', en: 'Your profile', el: 'Το προφίλ σου', href: '/profile' },
  fit: { kind: 'fit', en: 'Fit check', el: 'Fit check', href: '/quiz' },
  openTo: { kind: 'settings', en: 'Open to · Settings', el: 'Ανοιχτός σε · Ρυθμίσεις', href: '/settings' },
  milestones: { kind: 'milestones', en: 'Milestones', el: 'Ορόσημα', href: '/milestones' },
  needs: { kind: 'needs', en: 'Need cards', el: 'Κάρτες ανάγκης', href: '/network?tab=needs' },
  messages: { kind: 'messages', en: 'Messages', el: 'Μηνύματα', href: '/messages' },
  round: { kind: 'round', en: 'Fundraising round', el: 'Γύρος χρηματοδότησης', href: '/fundraising' },
  activity: { kind: 'activity', en: 'Notifications', el: 'Ειδοποιήσεις', href: '/notifications' },
  calendar: { kind: 'calendar', en: 'Calendar', el: 'Ημερολόγιο', href: '/calendar' },
  events: { kind: 'calendar', en: 'Events', el: 'Εκδηλώσεις', href: '/events' },
  programs: { kind: 'programs', en: 'Programs', el: 'Προγράμματα', href: '/programs' },
  applications: { kind: 'programs', en: 'Tracked applications', el: 'Αιτήσεις σε εξέλιξη', href: '/fundraising' },
  perks: { kind: 'perks', en: 'Perks', el: 'Παροχές', href: '/perks' },
  mentors: { kind: 'mentors', en: 'Mentors', el: 'Μέντορες', href: '/mentors' },
  communities: { kind: 'people', en: 'Communities', el: 'Κοινότητες', href: '/communities' },
  resources: { kind: 'resources', en: 'Resources', el: 'Πόροι', href: '/resources' },
  legal: { kind: 'legal', en: 'Legal Hub', el: 'Νομικά', href: '/legal' },
  tasks: { kind: 'tasks', en: 'Workspace tasks', el: 'Εργασίες', href: '/workspace' },
  invites: { kind: 'people', en: 'Founder invites', el: 'Προσκλήσεις ιδρυτών', href: '/network' },
  saved: { kind: 'people', en: 'Saved people', el: 'Αποθηκευμένα πρόσωπα', href: '/network?tab=saved' },
  requests: { kind: 'people', en: 'Connection requests', el: 'Αιτήματα σύνδεσης', href: '/network' },
  canvas: { kind: 'tasks', en: 'Lean Canvas · Workspace', el: 'Lean Canvas · Χώρος εργασίας', href: '/workspace' },
  builder: { kind: 'tasks', en: 'Startup Builder · Founder Tools', el: 'Startup Builder · Εργαλεία ιδρυτή', href: '/founder-tools?step=1' },
  readiness: { kind: 'tasks', en: 'Readiness Index · Founder Tools', el: 'Δείκτης Ετοιμότητας · Εργαλεία ιδρυτή', href: '/founder-tools' },
  pitch: { kind: 'tasks', en: 'Pitch deck · Founder Tools', el: 'Pitch deck · Εργαλεία ιδρυτή', href: '/founder-tools?tab=pitch' },
  legalChecklist: { kind: 'legal', en: 'Compliance checklist · Legal Hub', el: 'Λίστα συμμόρφωσης · Νομικά', href: '/legal' },
  focus: { kind: 'tasks', en: 'Focus timer · Workspace', el: 'Χρονόμετρο συγκέντρωσης · Χώρος εργασίας', href: '/workspace' },
  searches: { kind: 'people', en: 'Saved searches · Discovery', el: 'Αποθηκευμένες αναζητήσεις · Εξερεύνηση', href: '/discovery' },
} satisfies Record<string, AssistantSource>;

const TOOL_SOURCES: Record<string, AssistantSource[]> = {
  matches: [SOURCE.people, SOURCE.profile],
  'match-detail': [SOURCE.people, SOURCE.profile],
  'about-person': [SOURCE.people],
  'team-gap': [SOURCE.profile, SOURCE.people],
  scout: [SOURCE.people, SOURCE.profile, SOURCE.openTo],
  need: [SOURCE.needs],
  inbox: [SOURCE.messages],
  next: [SOURCE.calendar, SOURCE.tasks, SOURCE.fit, SOURCE.profile, SOURCE.milestones, SOURCE.needs, SOURCE.people],
  'open-to': [SOURCE.openTo],
  briefing: [SOURCE.people, SOURCE.milestones, SOURCE.round],
  milestones: [SOURCE.milestones],
  'milestone-add': [SOURCE.milestones],
  round: [SOURCE.round],
  pipeline: [SOURCE.round],
  'record-investment': [SOURCE.round],
  'round-set': [SOURCE.round],
  'settings-set': [SOURCE.openTo],
  'profile-set': [SOURCE.profile],
  'notifications-read': [SOURCE.activity],
  activity: [SOURCE.activity],
  events: [SOURCE.events],
  'session-add': [SOURCE.calendar],
  book: [SOURCE.mentors, SOURCE.calendar],
  programs: [SOURCE.programs],
  apply: [SOURCE.programs, SOURCE.applications],
  perks: [SOURCE.perks],
  'claim-perk': [SOURCE.perks],
  mentors: [SOURCE.mentors],
  'become-mentor': [SOURCE.mentors],
  communities: [SOURCE.communities],
  resources: [SOURCE.resources],
  legal: [SOURCE.legal],
  'task-add': [SOURCE.tasks],
  playbook: [SOURCE.tasks, SOURCE.people],
  invite: [SOURCE.invites],
  'week-meet': [SOURCE.people, SOURCE.events],
  'fit-check': [SOURCE.fit],
  save: [SOURCE.saved],
  connect: [SOURCE.requests],
  canvas: [SOURCE.canvas],
  builder: [SOURCE.builder],
  readiness: [SOURCE.readiness],
  'studio-modal': [SOURCE.people, SOURCE.round],
  pitch: [SOURCE.pitch],
  'pitch-set': [SOURCE.pitch],
  'legal-checklist': [SOURCE.legalChecklist],
  'legal-check': [SOURCE.legalChecklist],
  focus: [SOURCE.focus],
  'saved-searches': [SOURCE.searches],
  'investor-add': [SOURCE.round],
  'investor-move': [SOURCE.round],
  'investor-next': [SOURCE.round],
  'investor-email': [SOURCE.round, SOURCE.profile],
  dd: [SOURCE.round],
  'dd-set': [SOURCE.round],
  'dd-share': [SOURCE.round],
  audit: [SOURCE.profile, SOURCE.canvas, SOURCE.builder, SOURCE.pitch, SOURCE.legalChecklist, SOURCE.needs, SOURCE.milestones, SOURCE.round],
};

/** Pages the assistant recognises by name, in matching order — derived from the page registry. */
export const ASSISTANT_PAGES: { keys: string[]; href: string; en: string; el: string }[] = assistantPages();

/** Slash shortcuts in the studio chat — same tools as the natural-language router. */
export const SLASH_COMMANDS: { cmd: string; en: string; el: string }[] = [
  { cmd: '/match', en: 'Rank people on this profile', el: 'Βαθμολόγησε ανθρώπους σε αυτό το προφίλ' },
  { cmd: '/scout', en: 'Propose three people — never send', el: 'Πρότεινε τρεις — χωρίς αποστολή' },
  { cmd: '/need', en: 'List or draft a need card', el: 'Δείξε ή γράψε κάρτα ανάγκης' },
  { cmd: '/next', en: 'What to do first', el: 'Τι να κάνεις πρώτα' },
  { cmd: '/canvas', en: 'Read or update Lean Canvas sections', el: 'Διάβασε ή ενημέρωσε το Lean Canvas' },
  { cmd: '/builder', en: 'Read or fill Startup Builder modules', el: 'Διάβασε ή συμπλήρωσε το Startup Builder' },
  { cmd: '/readiness', en: 'Inspect or update Venture Readiness Index', el: 'Έλεγξε ή ενημέρωσε τον Δείκτη Ετοιμότητας' },
  { cmd: '/6axis', en: 'Open 6-Axis Match Breakdown (or /6axis Sarah)', el: 'Άνοιξε το modal Ανάλυσης 6 Αξόνων (ή /6axis Sarah)' },
  { cmd: '/dealroom', en: 'Open Startup Deal Room & Pitch Deck modal', el: 'Άνοιξε το modal Deal Room & Pitch Deck' },
  { cmd: '/needwall', en: 'Open Startup Need Cards Wall modal', el: 'Άνοιξε τον Πίνακα Αναγκών & Ρόλων Startup' },
  { cmd: '/tasks', en: 'List or add Workspace tasks', el: 'Δείξε ή πρόσθεσε εργασίες στον Χώρο Εργασίας' },
  { cmd: '/msg', en: 'Send a direct message (e.g. /msg Sarah: Hello)', el: 'Στείλε άμεσο μήνυμα (π.χ. /msg Sarah: Γεια)' },
  { cmd: '/theme', en: 'Switch theme palette (stone, dark, cyan, mint, apricot, lilac, burgundy)', el: 'Άλλαξε παλέτα θέματος (stone, dark, cyan, mint, apricot, lilac, burgundy)' },
  { cmd: '/lang', en: 'Switch language (/lang el or /lang en)', el: 'Εναλλαγή γλώσσας (/lang el ή /lang en)' },
  { cmd: '/style', en: 'How I reply: /style short | balanced | detailed, friendly | direct | formal, emoji on | off', el: 'Πώς απαντώ: /style short | balanced | detailed, friendly | direct | formal, emoji on | off' },
  { cmd: '/coach', en: 'UX coach: reads how you use the app and suggests shortcuts', el: 'UX coach: διαβάζει πώς χρησιμοποιείς την εφαρμογή και προτείνει συντομεύσεις' },
  { cmd: '/pin', en: 'Pin a page to your sidebar (/pin matches)', el: 'Καρφίτσωσε σελίδα στο μενού (/pin matches)' },
  { cmd: '/unpin', en: 'Remove a pinned page (/unpin matches)', el: 'Ξεκαρφίτσωσε σελίδα (/unpin matches)' },
  { cmd: '/home', en: 'Choose the page you land on (/home matches, /home off)', el: 'Διάλεξε σε ποια σελίδα προσγειώνεσαι (/home matches, /home off)' },
  { cmd: '/inbox', en: 'Search messages in this browser', el: 'Ψάξε μηνύματα σε αυτόν τον περιηγητή' },
  { cmd: '/plan', en: 'Write a 7-day match plan', el: 'Γράψε πλάνο 7 ημερών' },
  { cmd: '/invite', en: 'Prepare three founder invites', el: 'Ετοίμασε τρεις προσκλήσεις ιδρυτών' },
  { cmd: '/round', en: 'Read the fundraising round', el: 'Διάβασε τον γύρο χρηματοδότησης' },
  { cmd: '/quiz', en: 'Open or recall the fit check', el: 'Άνοιξε ή θυμήσου το fit check' },
  { cmd: '/overdue', en: 'List overdue milestones', el: 'Δείξε εκπρόθεσμα ορόσημα' },
  { cmd: '/pitch', en: 'Pitch deck status, or /pitch problem: text', el: 'Κατάσταση pitch deck, ή /pitch problem: κείμενο' },
  { cmd: '/audit', en: 'Studio check: every area, what is missing, how to fix it', el: 'Έλεγχος studio: κάθε περιοχή, τι λείπει, πώς διορθώνεται' },
  { cmd: '/pipeline', en: 'Investor CRM by stage; /investor add|move|next', el: 'CRM επενδυτών ανά στάδιο· /investor add|move|next' },
  { cmd: '/dd', en: 'Due diligence: status, mark items, /dd share <investor>', el: 'Δέουσα επιμέλεια: κατάσταση, σημείωση, /dd share <επενδυτής>' },
  { cmd: '/legal', en: 'Legal Hub compliance checklist', el: 'Λίστα συμμόρφωσης στα Νομικά' },
  { cmd: '/focus', en: 'Focus time logged today', el: 'Χρόνος συγκέντρωσης σήμερα' },
  { cmd: '/searches', en: 'Saved Discovery searches', el: 'Αποθηκευμένες αναζητήσεις' },
  { cmd: '/help', en: 'What this assistant can change', el: 'Τι μπορεί να αλλάξει αυτός ο βοηθός' },
];

/** Re-exported from the page registry so existing imports keep working. */
export { pageContext };

type KnowledgeCard = { keys: string[]; href: string; en: string; el: string; /** True when the card describes demo-only sample content. */ demo?: boolean };

const KNOWLEDGE: KnowledgeCard[] = [
  { keys: ['series a scout', 'scout network'], href: '/fundraising', demo: true, en: 'Series A Scout Network is a rolling Sequoia intro on Fundraising → Opportunities ($5M+, AI/SaaS). Open the tab and apply, or I can walk the round numbers.', el: 'Το Series A Scout Network είναι rolling intro της Sequoia στη Χρηματοδότηση → Ευκαιρίες ($5M+, AI/SaaS). Άνοιξε την καρτέλα ή ρώτα για τον γύρο.' },
  { keys: ['debt facility', 'clearco', 'revenue-based'], href: '/fundraising', demo: true, en: 'Debt Facility — Revenue-Based is a Clearco line up to $2M on Fundraising → Opportunities (rolling, SaaS with MRR over $30k).', el: 'Το Debt Facility — Revenue-Based είναι γραμμή Clearco έως $2M στη Χρηματοδότηση → Ευκαιρίες (rolling).' },
  { keys: ['sequoia'], href: '/fundraising', demo: true, en: 'Sequoia Capital is in the Fundraising investor list and pipeline (Due Diligence). VC, SaaS/FinTech/AI, checks $500k–$5M. Open Fundraising to move the stage or send a note.', el: 'Η Sequoia Capital είναι στη λίστα επενδυτών και στον αγωγό (Due Diligence). VC, SaaS/FinTech/AI, $500k–$5M. Άνοιξε τη Χρηματοδότηση για το στάδιο.' },
  { keys: ['andreessen', 'a16z'], href: '/fundraising', demo: true, en: 'Andreessen Horowitz is on Fundraising → Investors (Contacted). VC, Consumer/Enterprise/Bio, $1M–$50M.', el: 'Η Andreessen Horowitz είναι στη Χρηματοδότηση → Επενδυτές (Contacted). VC, $1M–$50M.' },
  { keys: ['first round'], href: '/fundraising', demo: true, en: 'First Round Capital is Identified on the Fundraising pipeline. Seed specialist, $250k–$3M.', el: 'Η First Round Capital είναι Identified στον αγωγό Χρηματοδότησης. Seed, $250k–$3M.' },
  { keys: ['global startup summit'], href: '/events', demo: true, en: 'Global Startup Summit 2026 is the featured event on Events. Scroll the list or ask me to host a session.', el: 'Το Global Startup Summit 2026 είναι το featured στις Εκδηλώσεις. Άνοιξε τη λίστα ή ρώτα να διοργανώσουμε.' },
  { keys: ['aws activate', 'amazon web services'], href: '/perks', en: 'AWS Activate is the flagship public founder program listed on Perks — apply on the provider site from that card. Open Perks to see every published perk.', el: 'Το AWS Activate είναι δημόσιο πρόγραμμα στις Παροχές — κάνε αίτηση στον πάροχο από την κάρτα. Άνοιξε Παροχές για όλες.' },
  { keys: ['readiness score', 'δεικτη ετοιμοτητας', 'δεικτης ετοιμοτητας'], href: '/insights', en: 'The Venture Readiness Index is on Founder Tools (the score and its five dimensions) and on Insights (its history). Raise it with the 5-step diagnostic, your skills, the pitch deck and the round numbers.', el: 'Ο Δείκτης Ετοιμότητας είναι στα Εργαλεία ιδρυτή (σκορ και πέντε διαστάσεις) και στα Insights (ιστορικό). Τον ανεβάζεις με τη διάγνωση 5 βημάτων, τις δεξιότητές σου, το pitch deck και τους αριθμούς του γύρου.' },
  { keys: ['articles of incorporation', 'founder stock', 'safe agreement', 'mutual nda', 'το safe', 'safe note', 'καταστατικ', 'συμφωνια εμπιστευτικοτητας'], href: '/legal', en: 'That template is on Legal Hub, same cards as Incorporation / Fundraising Legal. Download the starter draft there, or book office hours.', el: 'Αυτό το πρότυπο είναι στο Legal Hub. Κατέβασε το αρχικό draft από εκεί ή κλείσε συνεδρία.' },
  { keys: ['legal office hours', 'book legal'], href: '/legal', en: 'Legal office hours are 15-minute sessions you book on Legal Hub — the Book a Session button adds it straight to your Calendar.', el: 'Οι νομικές συνεδρίες είναι 15λεπτες συναντήσεις που κλείνεις στο Legal Hub — το κουμπί τις βάζει στο Ημερολόγιό σου.' },
  { keys: ['start a voice call', 'start a video call', 'how do i start a voice', 'how do i start a video', 'φωνητικη κλησ', 'βιντεοκλησ'], href: '/messages', en: 'Call and Video on Messages do not start a live line. They open this assistant so you can draft the first line or book a Calendar slot instead. I can also search the thread if you say “search my messages for…”.', el: 'Τα Call και Video στα Μηνύματα δεν ανοίγουν ζωντανή κλήση. Ανοίγουν αυτόν τον βοηθό για το πρώτο μήνυμα ή ένα ραντεβού στο Ημερολόγιο. Μπορώ και να ψάξω το νήμα αν πεις «ψάξε στα μηνύματα…».' },
  { keys: ['list a partner service', 'list your service'], href: '/resources', en: 'Partner services are listed on Resources → Services. Tell me the service name and price and I will point you at that tab.', el: 'Οι υπηρεσίες partners είναι στους Πόρους → Services. Πες όνομα και τιμή.' },
  { keys: ['post a job', 'post a role'], href: '/resources', en: 'Jobs sit on Resources → Jobs. Use Post a Job on that tab — the listing goes live for every member.', el: 'Οι θέσεις είναι στους Πόρους → Jobs. Πάτα Post a Job στην καρτέλα — η αγγελία βγαίνει live για όλα τα μέλη.' },
  { keys: ['foundations of fundraising', 'scalable sales engine', 'legal essentials for startups', 'product-market fit workshop'], href: '/resources', demo: true, en: 'That course is on Resources → Learning, same cards as the Learning Hub. Start Learning opens this assistant with the course title.', el: 'Αυτό το μάθημα είναι στους Πόρους → Learning.' },
  { keys: ['create a community'], href: '/communities', en: 'Create stays on Communities. Name the space, pick a category, and I will keep it next to Fintech Founders, AI & Machine Learning, SaaS Builders, and Web3 & Crypto. Open Communities and use Create — or tell me the name.', el: 'Η δημιουργία μένει στις Κοινότητες. Δώσε όνομα και κατηγορία. Άνοιξε Κοινότητες και πάτα Create — ή πες μου το όνομα.' },
  { keys: ['fintech founders', 'ai & machine learning', 'saas builders', 'web3 & crypto'], href: '/communities', en: 'That community is on the Communities page with its real member count. Join there, or tell me “join <name>” and I will do it.', el: 'Αυτή η κοινότητα είναι στη σελίδα Κοινότητες με τον πραγματικό αριθμό μελών. Κάνε Join εκεί, ή πες μου «join <όνομα>».' },
  { keys: ['export my pitch', 'share my pitch', 'pitch deck', 'pitch slide', 'cover & hook', 'εξαγω το pitch', 'μοιραστω το pitch'], href: '/founder-tools', en: 'Pitch lives on Founder Tools → Pitch: Cover & Hook, Problem, Solution, Market Size, Business Model, Traction, Team, Ask. Export, share, or send to a mentor from that tab — I can also book a mentor.', el: 'Το pitch είναι στα Εργαλεία ιδρυτή → Pitch. Export, share ή αποστολή σε μέντορα από εκεί. Μπορώ και να κλείσω μέντορα.' },
  { keys: ['lean canvas'], href: '/workspace', en: 'Lean Canvas is on Workspace → Canvas. Save keeps the draft on that page; “Fill the empty sections” has me draft what is missing (you confirm each one), and “Review with a specialist” asks the product specialist.', el: 'Το Lean Canvas είναι στο Workspace → Canvas. Το Save κρατά το draft εκεί· το «Συμπλήρωσε τα κενά» με βάζει να γράψω ό,τι λείπει (επιβεβαιώνεις το καθένα) και το «Έλεγχος από ειδικό» ρωτά τον ειδικό προϊόντος.' },
  { keys: ['workspace assets', 'project assets'], href: '/workspace', demo: true, en: 'Project assets sit on Workspace → Dashboard: Pitch Deck v2.pdf, Brand Guidelines.zip, Market Research.docx. Open Workspace to download, or Founder Tools for the live pitch.', el: 'Τα αρχεία είναι στο Workspace → Dashboard. Άνοιξε Workspace ή τα Εργαλεία ιδρυτή για το live pitch.' },
];

/**
 * Dated sample cards come from `data/demoCatalog` — the same offsets the pages
 * use — so a deadline the assistant quotes is the deadline the card shows.
 */
function knowledgeCards(): KnowledgeCard[] {
  const en = datedKnowledge('en');
  const el = datedKnowledge('el');
  const dated = en.map((card, index) => ({ keys: card.keys, href: card.href, demo: true, en: card.text, el: el[index]?.text ?? card.text }));
  return [...KNOWLEDGE, ...dated];
}


function namedPerson(text: string): Person | undefined {
  const folded = fold(text);
  const people = directoryPeople();
  return people.find((person) => folded.includes(fold(person.fullName)))
    ?? people.find((person) => folded.includes(fold(person.fullName.split(' ')[0] || '')));
}

function candidates(): Person[] {
  return cofounderPool();
}

function meInput(profile: AssistantProfile | null): CompatibilityInput {
  return fromProfile(profile);
}

function linkFor(person: Person): AssistantLink {
  return { href: `/profile/${person.id}`, en: person.fullName, el: person.fullName };
}

export function platformBriefing(profile: AssistantProfile | null) {
  const ranked = rankPeople(meInput(profile), candidates()).slice(0, 5);
  const milestones = readMilestones().map((item) => ({ ...item, status: effectiveStatus(item) }));
  const overdue = milestones.filter((item) => item.status === 'Overdue');
  const active = milestones.filter((item) => item.status === 'In Progress' || item.status === 'Planned');
  const round = readRound();
  const saved = readSaved();
  const activity = readActivity().slice(0, 5);
  return { ranked, overdue, active, round, saved, activity };
}

function briefingResult(profile: AssistantProfile | null): AssistantResult {
  const { ranked, overdue, active, round } = platformBriefing(profile);
  const top = ranked[0];
  const linesEn: string[] = [];
  const linesEl: string[] = [];
  if (top?.fit.score != null) {
    linesEn.push(`Best match: ${top.person.fullName} (${top.fit.score}%). ${top.fit.headline?.en ?? top.person.headline}`);
    linesEl.push(`Καλύτερη αντιστοίχιση: ${top.person.fullName} (${top.fit.score}%). ${top.fit.headline?.el ?? top.person.headline}`);
  } else {
    linesEn.push('Add skills and what you look for on your profile so matches get a score.');
    linesEl.push('Πρόσθεσε δεξιότητες και τι ψάχνεις στο προφίλ, ώστε οι αντιστοιχίσεις να πάρουν σκορ.');
  }
  if (overdue.length) {
    linesEn.push(`${overdue.length} milestone${overdue.length === 1 ? '' : 's'} overdue: ${overdue.map((item) => item.title).join(', ')}.`);
    linesEl.push(`${overdue.length} εκπρόθεσμ${overdue.length === 1 ? 'ο ορόσημο' : 'α ορόσημα'}: ${overdue.map((item) => item.title).join(', ')}.`);
  } else if (active.length) {
    linesEn.push(`Next milestone: ${active[0]!.title}.`);
    linesEl.push(`Επόμενο ορόσημο: ${active[0]!.title}.`);
  }
  if (round.targetAmount > 0) {
    const pct = Math.round((round.committedAmount / round.targetAmount) * 100);
    linesEn.push(`${round.name} round: ${pct}% of $${(round.targetAmount / 1_000_000).toFixed(1)}M committed.`);
    linesEl.push(`Γύρος ${round.name}: ${pct}% από $${(round.targetAmount / 1_000_000).toFixed(1)}M δεσμευμένα.`);
  }
  const investorDue = followUps(round);
  if (investorDue.overdue.length) {
    linesEn.push(`Investor follow-up overdue: ${investorDue.overdue.map((item) => `${item.name} (${item.nextStep})`).join(', ')}.`);
    linesEl.push(`Εκπρόθεσμο follow-up με επενδυτή: ${investorDue.overdue.map((item) => `${item.name} (${item.nextStep})`).join(', ')}.`);
  }
  const links: AssistantLink[] = [
    ...(top ? [linkFor(top.person)] : []),
    { href: '/matches', en: 'Open matches', el: 'Άνοιγμα αντιστοιχίσεων' },
    { href: '/milestones', en: 'Open milestones', el: 'Άνοιγμα οροσήμων' },
    ...(investorDue.overdue.length ? [{ href: '/fundraising?tab=tracker', en: 'Open follow-ups', el: 'Άνοιγμα follow-ups' }] : []),
  ];
  return { tool: 'briefing', en: linesEn.join(' '), el: linesEl.join(' '), href: '/dashboard', links };
}

function matchesResult(profile: AssistantProfile | null, query: string): AssistantResult {
  const parsed = parseQualifiers(query);
  const folded = fold(parsed.text || query);
  let pool = applyQualifiers(candidates(), parsed.filters, (person) => ({
    role: person.role,
    location: person.location,
    skills: person.skills,
    industry: person.industry,
    stage: person.stage,
  }));
  let skill = parsed.filters.skill || '';
  if (/\btech|engineer|typescript|react|τεχνικ/.test(folded)) {
    pool = pool.filter((person) => person.skills.some((item) => /typescript|react|node|python|mlops|embedded/i.test(item)));
    skill = skill || 'TypeScript';
  }
  if (/\bsales|growth|πωλησ|αναπτυξ/.test(folded)) {
    pool = pool.filter((person) => person.skills.some((item) => /sales|growth|marketing/i.test(item)));
  }
  writeMatchFilters({
    q: parsed.text,
    role: parsed.filters.role || '',
    stage: parsed.filters.stage || '',
    commitment: '',
    location: parsed.filters.location || '',
    skill,
    industry: parsed.filters.industry || '',
  });
  const ranked = rankPeople(meInput(profile), pool).slice(0, 4);
  if (ranked.length === 0) {
    return {
      tool: 'matches',
      en: 'No one in the directory fits that filter. Open Matches to adjust it.',
      el: 'Κανείς στον κατάλογο δεν ταιριάζει σε αυτό το φίλτρο. Άνοιξε τις Αντιστοιχίσεις για να το αλλάξεις.',
      href: '/matches',
      links: [{ href: '/matches', en: 'Open matches', el: 'Άνοιγμα αντιστοιχίσεων' }],
    };
  }
  const linesEn = ranked.map((row) => `${row.person.fullName} · ${row.fit.score ?? '—'}% · ${row.fit.headline?.en ?? row.person.headline}`);
  const linesEl = ranked.map((row) => `${row.person.fullName} · ${row.fit.score ?? '—'}% · ${row.fit.headline?.el ?? row.person.headline}`);
  return {
    tool: 'matches',
    en: `Ranked from the same directory the Matches page uses:\n${linesEn.join('\n')}`,
    el: `Κατάταξη από τον ίδιο κατάλογο που χρησιμοποιεί η σελίδα Αντιστοιχίσεις:\n${linesEl.join('\n')}`,
    href: '/matches',
    links: ranked.map((row) => linkFor(row.person)),
  };
}

function matchDetailResult(profile: AssistantProfile | null, person: Person): AssistantResult {
  const fit = compatibility(meInput(profile), fromCast(person));
  const known = fit.dimensions.filter((d) => d.score != null && d.reason);
  const strongest = [...known].sort((a, b) => (b.score as number) - (a.score as number))[0];
  const friction = [...known].sort((a, b) => (a.score as number) - (b.score as number))[0];
  const myNeeds = listWords(profile?.lookingFor);
  const theirSkills = listWords(person.skills);
  const covered = myNeeds.filter((need) => theirSkills.includes(need));
  const talk = covered[0] ?? theirSkills[0] ?? person.headline;
  const score = fit.score == null ? '—' : `${fit.score}%`;
  const reasonEn = strongest?.reason?.en ?? fit.headline?.en ?? person.headline;
  const reasonEl = strongest?.reason?.el ?? fit.headline?.el ?? person.headline;
  const frictionEn = friction && (friction.score as number) < 80 ? `Friction: ${friction.reason?.en}.` : 'No sharp friction on the scored dimensions.';
  const frictionEl = friction && (friction.score as number) < 80 ? `Τριβή: ${friction.reason?.el}.` : 'Δεν υπάρχει έντονη τριβή στις διαστάσεις με σκορ.';
  return {
    tool: 'match-detail',
    en: `${person.fullName} is ${score} on the same scorer Matches uses. Why: ${reasonEn}. ${frictionEn} First conversation: how they have shipped ${talk}. Same card as Profile.`,
    el: `${person.fullName} είναι ${score} στον ίδιο υπολογισμό με τις Αντιστοιχίσεις. Γιατί: ${reasonEl}. ${frictionEl} Πρώτη συζήτηση: πώς έχουν παραδώσει ${talk}. Η ίδια κάρτα με το Προφίλ.`,
    href: `/profile/${person.id}`,
    links: [linkFor(person), { href: '/matches', en: 'Open matches', el: 'Άνοιγμα αντιστοιχίσεων' }],
  };
}

function teamGapResult(profile: AssistantProfile | null): AssistantResult {
  const needs = listWords(profile?.lookingFor);
  const skills = listWords(profile?.skills);
  const areas = teamGaps(skills);
  const ranked = rankPeople(meInput(profile), candidates()).slice(0, 5);
  const gapRoles = areas.gaps.map((area) => TEAM_AREAS[area].role);
  if (needs.length === 0 && areas.gaps.length === 0) {
    return {
      tool: 'team-gap',
      en: 'Looking-for is empty on Profile, so matching cannot say what the founding team still lacks. Add Sales, Growth, or Engineering there — the same fields the scorer reads.',
      el: 'Το «τι ψάχνεις» είναι κενό στο Προφίλ, οπότε η αντιστοίχιση δεν ξέρει τι λείπει στην ομάδα. Πρόσθεσε Sales, Growth ή Engineering — τα ίδια πεδία που διαβάζει ο υπολογισμός.',
      href: '/profile',
      links: [{ href: '/profile', en: 'Open profile', el: 'Άνοιγμα προφίλ' }],
    };
  }
  const covered = needs.filter((need) =>
    ranked.some((row) => listWords(row.person.skills).includes(need)),
  );
  const lacking = needs.filter((need) => !covered.includes(need));
  const who = ranked[0]?.person;
  const areaLine = areas.gaps.length
    ? ` From your skills, the team still lacks ${gapRoles.map((r) => r.en).join(', ')}.`
    : ' Your skills already cover build, design, market and operations.';
  const areaLineEl = areas.gaps.length
    ? ` Από τις δεξιότητές σου, λείπουν ${gapRoles.map((r) => r.el).join(', ')}.`
    : ' Οι δεξιότητές σου καλύπτουν κατασκευή, σχεδιασμό, αγορά και λειτουργία.';
  const lackLine = lacking.length
    ? ` Looking-for still open: ${lacking.join(', ')}.`
    : needs.length
      ? ` The directory already covers ${needs.join(', ')}.`
      : '';
  const lackLineEl = lacking.length
    ? ` Ακόμα ανοιχτά στο «τι ψάχνεις»: ${lacking.join(', ')}.`
    : needs.length
      ? ` Ο κατάλογος ήδη καλύπτει ${needs.join(', ')}.`
      : '';
  const next = who
    ? ` Next: talk to ${who.fullName} (${who.headline}).`
    : ' Open Matches to widen the filter.';
  const nextEl = who
    ? ` Επόμενο: μίλα με ${who.fullName} (${who.headline}).`
    : ' Άνοιξε Αντιστοιχίσεις για ευρύτερο φίλτρο.';
  return {
    tool: 'team-gap',
    en: `Matching reads looking-for as ${needs.join(', ') || 'empty'}.${areaLine}${lackLine}${next}`,
    el: `Η αντιστοίχιση διαβάζει «τι ψάχνεις» ως ${needs.join(', ') || 'κενό'}.${areaLineEl}${lackLineEl}${nextEl}`,
    href: '/matches',
    links: [
      ...(who ? [linkFor(who)] : []),
      { href: '/profile', en: 'Open profile', el: 'Άνοιγμα προφίλ' },
      { href: '/matches', en: 'Open matches', el: 'Άνοιγμα αντιστοιχίσεων' },
    ],
  };
}

function scoutResult(profile: AssistantProfile | null): AssistantResult {
  const ranked = rankPeople(meInput(profile), candidates()).slice(0, 3);
  const openTo = readOpenTo();
  const needs = listWords(profile?.lookingFor);
  if (ranked.length === 0) {
    return {
      tool: 'scout',
      en: 'No proposals from the directory. Open Matches to widen the filter. I never send a message for you.',
      el: 'Δεν υπάρχουν προτάσεις στον κατάλογο. Άνοιξε Αντιστοιχίσεις. Δεν στέλνω ποτέ μήνυμα για σένα.',
      href: '/matches',
      links: [{ href: '/matches', en: 'Open matches', el: 'Άνοιγμα αντιστοιχίσεων' }],
    };
  }
  const linesEn = ranked.map((row) => {
    const cover = needs.filter((need) => listWords(row.person.skills).includes(need));
    return `${row.person.fullName} · ${row.fit.score ?? '—'}% · ${row.fit.headline?.en ?? row.person.headline}${cover.length ? ` · covers ${cover.join(', ')}` : ''}`;
  });
  const linesEl = ranked.map((row) => {
    const cover = needs.filter((need) => listWords(row.person.skills).includes(need));
    return `${row.person.fullName} · ${row.fit.score ?? '—'}% · ${row.fit.headline?.el ?? row.person.headline}${cover.length ? ` · καλύπτει ${cover.join(', ')}` : ''}`;
  });
  const first = ranked[0]!.person;
  const cover = needs.filter((need) => listWords(first.skills).includes(need));
  const noteEn = `Hi ${first.fullName.split(' ')[0]} — I'm looking for ${needs.join(', ') || 'a co-founder'}. You cover ${cover.join(', ') || first.skills.slice(0, 2).join(', ')}. Worth twenty minutes on how you've shipped that?`;
  const noteEl = `Γεια ${first.fullName.split(' ')[0]} — ψάχνω ${needs.join(', ') || 'συνιδρυτή'}. Καλύπτεις ${cover.join(', ') || first.skills.slice(0, 2).join(', ')}. Έχει νόημα ένα εικοσάλεπτο για το πώς το έχεις παραδώσει;`;
  const openLine = openTo.includes('cofounder')
    ? ' Settings already marks you open to a co-founder.'
    : ' Settings does not mark you open to a co-founder yet.';
  const openLineEl = openTo.includes('cofounder')
    ? ' Οι Ρυθμίσεις σε έχουν ήδη ανοιχτό σε συνιδρυτή.'
    : ' Οι Ρυθμίσεις δεν σε έχουν ακόμα ανοιχτό σε συνιδρυτή.';
  return {
    tool: 'scout',
    en: `Three proposals from the same directory Matches uses. I will not send anything.${openLine}\n${linesEn.join('\n')}\nFirst note (copy, do not send until you say so):\n${noteEn}`,
    el: `Τρεις προτάσεις από τον ίδιο κατάλογο με τις Αντιστοιχίσεις. Δεν στέλνω τίποτα.${openLineEl}\n${linesEl.join('\n')}\nΠρώτο σημείωμα (αντίγραψε, μην το στείλεις μέχρι να το πεις):\n${noteEl}`,
    href: `/profile/${first.id}`,
    links: ranked.map((row) => linkFor(row.person)),
  };
}

const NEED_HREF = '/network?tab=needs';
const NEED_LINK: AssistantLink = { href: NEED_HREF, en: 'Open need cards', el: 'Άνοιγμα καρτών ανάγκης' };

const NEED_FIELDS: { field: NeedField; stems: string[]; en: string; el: string }[] = [
  { field: 'outcome', stems: ['outcome', 'αποτελεσμα'], en: 'outcome', el: 'αποτέλεσμα' },
  { field: 'offer', stems: ['offer', 'προσφορα'], en: 'offer', el: 'προσφορά' },
  { field: 'exists', stems: ['exists', 'υπαρχει'], en: 'what exists', el: 'τι υπάρχει' },
  { field: 'missing', stems: ['missing', 'λειπει'], en: 'who is missing', el: 'ποιος λείπει' },
];

function needResult(query: string, propose: boolean): AssistantResult {
  const folded = fold(query);
  const closing = hasStem(folded, 'close', 'κλεισ') && hasStem(folded, 'need', 'card', 'καρτα', 'αναγκ');
  if (closing) {
    const open = readNeeds().filter((item) => item.status === 'open');
    const card = open[0];
    if (!card) {
      return {
        tool: 'need',
        en: 'No open need card to close. Say “draft a need card for a technical co-founder”.',
        el: 'Δεν υπάρχει ανοιχτή κάρτα ανάγκης. Πες «γράψε κάρτα ανάγκης για τεχνικό συνιδρυτή».',
        href: NEED_HREF,
        links: [NEED_LINK],
      };
    }
    const before = readNeeds();
    let logged: LoggedWrite | null = null;
    const apply = (): AssistantResult => {
      closeNeed(card.id);
      logged = { kind: 'profile', title: `Closed need: ${card.missing}`, titleEl: `Έκλεισε ανάγκη: ${card.missing}`, href: NEED_HREF };
      logActivity({ ...logged, byAssistant: true });
      return {
        tool: 'need',
        en: `Closed “${card.missing}”. Other cards stay as they are.`,
        el: `Έκλεισε το «${card.missing}». Οι άλλες κάρτες μένουν όπως είναι.`,
        href: NEED_HREF,
        links: [NEED_LINK],
      };
    };
    if (!propose) return apply();
    return proposalResult(
      {
        summary: { en: `Close the need card “${card.missing}”?`, el: `Κλείσιμο της κάρτας ανάγκης «${card.missing}»;` },
        reversal: 'full',
        apply,
        undo: () => { writeNeeds(before); logUndo(logged); },
      },
      { tool: 'need', href: NEED_HREF, links: [NEED_LINK] },
    );
  }
  const editing = hasStem(folded, 'set', 'change', 'update', 'edit', 'αλλαξ', 'ορισ', 'διορθωσ') && hasStem(folded, 'need', 'card', 'καρτα', 'αναγκ');
  const target = editing ? NEED_FIELDS.find((item) => hasStem(folded, ...item.stems)) : undefined;
  const value = query.split(/\s(?:to|σε)\s|:\s*/i).slice(1).join(' ').replace(/^["«“]|["»”.]$/g, '').trim();
  if (target && value) {
    const card = readNeeds().find((item) => item.status === 'open') ?? readNeeds()[0];
    if (card) {
      const before = readNeeds();
      let logged: LoggedWrite | null = null;
      const apply = (): AssistantResult => {
        const updated = editNeed(card.id, { [target.field]: value });
        logged = { kind: 'profile', title: `Need card v${updated?.version ?? 2}: ${target.en}`, titleEl: `Κάρτα ανάγκης v${updated?.version ?? 2}: ${target.el}`, href: NEED_HREF };
        logActivity({ ...logged, byAssistant: true });
        return {
          tool: 'need',
          en: `Changed the ${target.en} of “${card.missing}” to “${value}”. The card is now v${updated?.version ?? 2}; Network keeps the earlier version in its timeline.`,
          el: `Άλλαξε το πεδίο «${target.el}» της κάρτας «${card.missing}» σε «${value}». Η κάρτα είναι πλέον v${updated?.version ?? 2}· το Δίκτυο κρατά την προηγούμενη έκδοση στο χρονολόγιο.`,
          href: NEED_HREF,
          links: [NEED_LINK],
        };
      };
      if (!propose) return apply();
      return proposalResult(
        {
          summary: { en: `Change the ${target.en} of “${card.missing}” to “${value}”?`, el: `Αλλαγή του πεδίου «${target.el}» της κάρτας «${card.missing}» σε «${value}»;` },
          reversal: 'full',
          apply,
          undo: () => { writeNeeds(before); logUndo(logged); },
        },
        { tool: 'need', href: NEED_HREF, links: [NEED_LINK] },
      );
    }
  }
  const drafting = hasStem(folded, 'draft', 'write', 'create', 'new', 'γραψ', 'φτιαξ', 'δημιουργ');
  if (drafting || (hasStem(folded, 'need card', 'καρτα αναγκ') && readNeeds().length === 0)) {
    const missing = query
      .replace(/^(please\s+)?(draft|write|create|new|γραψε|φτιαξε|δημιουργησε)\s+(a\s+)?(need card|καρτα αναγκης)?\s*(for|για)?\s*/i, '')
      .trim() || 'a co-founder';
    const before = readNeeds();
    let logged: LoggedWrite | null = null;
    const apply = (): AssistantResult => {
      const card: NeedCard = {
        id: `need-${Date.now().toString(36)}`,
        exists: 'A founding team with a scored looking-for on Profile',
        outcome: 'A partner who covers the open skills on this account',
        missing,
        offer: 'Equity and a first conversation, not a cold blast',
        status: 'open',
        at: new Date().toISOString(),
      };
      upsertNeed(card);
      logged = { kind: 'profile', title: `Need card: ${missing}`, titleEl: `Κάρτα ανάγκης: ${missing}`, href: NEED_HREF };
      logActivity({ ...logged, byAssistant: true });
      return {
        tool: 'need',
        en: `Need card is open: exists — ${card.exists}. Outcome — ${card.outcome}. Missing — ${card.missing}. Same list the next-step strip and Network read. I did not notify anyone.`,
        el: `Η κάρτα ανάγκης είναι ανοιχτή: υπάρχει — ${card.exists}. Αποτέλεσμα — ${card.outcome}. Λείπει — ${card.missing}. Η ίδια λίστα με το επόμενο βήμα και το Δίκτυο. Δεν ειδοποίησα κανέναν.`,
        href: NEED_HREF,
        links: [NEED_LINK],
      };
    };
    if (!propose) return apply();
    return proposalResult(
      {
        summary: { en: `Open a need card for “${missing}”?`, el: `Άνοιγμα κάρτας ανάγκης για «${missing}»;` },
        reversal: 'full',
        apply,
        undo: () => { writeNeeds(before); logUndo(logged); },
      },
      { tool: 'need', href: NEED_HREF, links: [NEED_LINK] },
    );
  }
  const list = readNeeds();
  if (list.length === 0) {
    return {
      tool: 'need',
      en: 'No need cards yet. One card, three sentences: what exists, the outcome, who is missing. Say “draft a need card for a technical co-founder”.',
      el: 'Δεν υπάρχουν κάρτες ανάγκης. Μία κάρτα, τρεις προτάσεις: τι υπάρχει, το αποτέλεσμα, ποιος λείπει. Πες «γράψε κάρτα ανάγκης για τεχνικό συνιδρυτή».',
      href: NEED_HREF,
      links: [NEED_LINK],
    };
  }
  const linesEn = list.slice(0, 6).map((item) => `${item.status === 'open' ? 'Open' : 'Closed'} · v${item.version ?? 1} · missing ${item.missing} · ${item.outcome}`);
  const linesEl = list.slice(0, 6).map((item) => `${item.status === 'open' ? 'Ανοιχτή' : 'Κλειστή'} · v${item.version ?? 1} · λείπει ${item.missing} · ${item.outcome}`);
  return {
    tool: 'need',
    en: `Your need cards:\n${linesEn.join('\n')}\nSay “change the outcome of my need card to …” to write a new version.`,
    el: `Οι κάρτες ανάγκης σου:\n${linesEl.join('\n')}\nΠες «άλλαξε το αποτέλεσμα της κάρτας σε …» για νέα έκδοση.`,
    href: NEED_HREF,
    links: [NEED_LINK],
  };
}

function inboxResult(query: string): AssistantResult {
  const folded = fold(query);
  const needle = query
    .replace(/^(please\s+)?(search( my)? (messages?|inbox|thread)|ψαξε( στα)? μηνυμ(ατα)?)\s*(for|για)?\s*/i, '')
    .trim();
  const wasSearch = needle !== query.trim();
  const wantsUnread = /\bunread\b/.test(folded) || folded.includes('αδιαβαστ');
  const question = wantsUnread || (!wasSearch && /\b(which|what|who)\b|ποια|ποιος|ποιες/.test(folded));
  if (question) {
    const all = readChat().messages;
    const list = (wantsUnread ? all.filter((item) => !item.readStatus) : all).slice(-8);
    if (!list.length) {
      return {
        tool: 'inbox',
        en: wantsUnread
          ? 'No unread messages in this browser’s store. Open Messages to read the latest threads.'
          : 'No messages stored in this browser yet. Open Messages, then ask me to search a word in the thread.',
        el: wantsUnread
          ? 'Κανένα αδιάβαστο μήνυμα σε αυτόν τον περιηγητή. Άνοιξε τα Μηνύματα για τα τελευταία νήματα.'
          : 'Δεν υπάρχουν μηνύματα σε αυτόν τον περιηγητή. Άνοιξε τα Μηνύματα και ζήτα αναζήτηση λέξης στο νήμα.',
        href: '/messages',
        links: [{ href: '/messages', en: 'Open messages', el: 'Άνοιγμα μηνυμάτων' }],
      };
    }
    const lines = list.map((item) => `${item.senderName || item.senderId}: ${item.body.slice(0, 120)}`);
    return {
      tool: 'inbox',
      en: wantsUnread ? `Unread in this browser's store:\n${lines.join('\n')}` : `Latest messages in this browser's store:\n${lines.join('\n')}`,
      el: wantsUnread ? `Αδιάβαστα σε αυτόν τον περιηγητή:\n${lines.join('\n')}` : `Τελευταία μηνύματα σε αυτόν τον περιηγητή:\n${lines.join('\n')}`,
      href: '/messages',
      links: [{ href: '/messages', en: 'Open messages', el: 'Άνοιγμα μηνυμάτων' }],
    };
  }
  const hits = searchChat(needle || query);
  if (hits.length === 0) {
    return {
      tool: 'inbox',
      en: needle
        ? `No stored message contains “${needle}”. Open Messages to write one — Call and Video still do not start a live line.`
        : 'No messages stored in this browser yet. Open Messages, then ask me to search a word in the thread.',
      el: needle
        ? `Κανένα αποθηκευμένο μήνυμα δεν περιέχει «${needle}». Άνοιξε τα Μηνύματα — τα Call/Video δεν ανοίγουν ζωντανή κλήση.`
        : 'Δεν υπάρχουν μηνύματα σε αυτόν τον περιηγητή. Άνοιξε τα Μηνύματα και ζήτα αναζήτηση λέξης στο νήμα.',
      href: '/messages',
      links: [{ href: '/messages', en: 'Open messages', el: 'Άνοιγμα μηνυμάτων' }],
    };
  }
  const lines = hits.map((item) => `${item.senderName || item.senderId}: ${item.body.slice(0, 120)}`);
  return {
    tool: 'inbox',
    en: `Same thread store Messages uses:\n${lines.join('\n')}`,
    el: `Το ίδιο νήμα με τα Μηνύματα:\n${lines.join('\n')}`,
    href: '/messages',
    links: [{ href: '/messages', en: 'Open messages', el: 'Άνοιγμα μηνυμάτων' }],
  };
}

function nextStepAssistant(profile: AssistantProfile | null): AssistantResult {
  const waiting = studioWaiting();
  const next = studioNextStep(fromProfile(profile));
  const nextLink = { href: next.href, en: next.action?.en ?? 'Open that page', el: next.action?.el ?? 'Άνοιγμα της σελίδας' };
  if (waiting) {
    return {
      tool: 'next',
      en: `Waiting on you: ${waiting.en} Then: ${next.en}`,
      el: `Σε περιμένει: ${waiting.el} Μετά: ${next.el}`,
      href: waiting.href,
      links: [{ href: waiting.href, en: waiting.action?.en ?? 'Open that page', el: waiting.action?.el ?? 'Άνοιγμα της σελίδας' }, nextLink],
    };
  }
  return {
    tool: 'next',
    en: next.en,
    el: next.el,
    href: next.href,
    links: [nextLink],
  };
}

function openToResult(query: string, propose: boolean): AssistantResult {
  const folded = fold(query);
  const kinds: OpenToKind[] = [];
  if (/\bco-?founder|συνιδρυτ/.test(folded)) kinds.push('cofounder');
  if (/\binvestor|επενδυτ/.test(folded)) kinds.push('investor');
  if (/\badvisor|mentor|συμβουλ|μεντορ/.test(folded)) kinds.push('advisor');
  if (kinds.length && hasStem(folded, 'open', 'mark', 'set', 'ανοιχτ')) {
    const previous = readOpenTo();
    const next = [...new Set([...previous, ...kinds])];
    const ctx = () => ({ uid: dataScope() || null, demo: isDemoData() });
    let logged: LoggedWrite | null = null;
    // The shared helper writes the list, the Settings switch snapshot and the
    // profile privacy slice — identical to what Settings → Privacy toggles do.
    const apply = async (): Promise<AssistantResult> => {
      const { applyOpenTo } = await import('../lib/openTo');
      applyOpenTo(next, ctx());
      logged = { kind: 'settings', title: `Open to ${kinds.join(', ')}`, titleEl: `Ανοιχτός σε ${kinds.join(', ')}`, href: '/settings' };
      logActivity({ ...logged, byAssistant: true });
      return {
        tool: 'open-to',
        en: `Settings now marks you open to ${next.join(', ')}. Matching reads this the next time you scout.`,
        el: `Οι Ρυθμίσεις σε έχουν ανοιχτό σε ${next.join(', ')}. Η αντιστοίχιση το διαβάζει στο επόμενο scout.`,
        href: '/settings',
        links: [{ href: '/settings', en: 'Open settings', el: 'Άνοιγμα ρυθμίσεων' }],
      };
    };
    if (!propose) {
      // Non-propose mode stays synchronous: the write goes through the same
      // helper the pages use and lands in the background while the reply is
      // already on screen. apply() cannot throw for local writes.
      void apply();
      return {
        tool: 'open-to',
        en: `Settings now marks you open to ${next.join(', ')}. Matching reads this the next time you scout.`,
        el: `Οι Ρυθμίσεις σε έχουν ανοιχτό σε ${next.join(', ')}. Η αντιστοίχιση το διαβάζει στο επόμενο scout.`,
        href: '/settings',
        links: [{ href: '/settings', en: 'Open settings', el: 'Άνοιγμα ρυθμίσεων' }],
      };
    }
    return proposalResult(
      {
        summary: { en: `Mark you open to ${kinds.join(', ')} on Settings?`, el: `Σήμανση «ανοιχτός σε ${kinds.join(', ')}» στις Ρυθμίσεις;` },
        reversal: 'full',
        apply,
        undo: async () => {
          const { applyOpenTo } = await import('../lib/openTo');
          applyOpenTo(previous, ctx());
          logUndo(logged);
        },
      },
      { tool: 'open-to', href: '/settings', links: [{ href: '/settings', en: 'Open settings', el: 'Άνοιγμα ρυθμίσεων' }] },
    );
  }
  return {
    tool: 'open-to',
    en: `You are marked open to: ${readOpenTo().join(', ') || 'nothing'}. Same toggles as Settings → Privacy.`,
    el: `Είσαι ανοιχτός σε: ${readOpenTo().join(', ') || 'τίποτα'}. Τα ίδια διακόπτες με Ρυθμίσεις → Απόρρητο.`,
    href: '/settings',
    links: [{ href: '/settings', en: 'Open settings', el: 'Άνοιγμα ρυθμίσεων' }],
  };
}

function attachFollowUps(result: AssistantResult): AssistantResult {
  if (result.followUps?.length) return result;
  const person = result.links.find((link) => link.href.startsWith('/profile/'))?.en;
  const out: AssistantFollowUp[] = [];
  if (result.tool === 'matches' && person) {
    out.push({ en: `Why do I match with ${person}?`, el: `Γιατί ταιριάζω με ${person};` });
    out.push({ en: `Save ${person}`, el: `Αποθήκευσε ${person}` });
  } else if (result.tool === 'match-detail' && person) {
    out.push({ en: `Connect with ${person}`, el: `Σύνδεση με ${person}` });
    out.push({ en: 'Who is my best match?', el: 'Ποια είναι η καλύτερη αντιστοίχιση;' });
  } else if (result.tool === 'briefing') {
    out.push({ en: 'Who is my best match?', el: 'Ποια είναι η καλύτερη αντιστοίχιση;' });
    out.push({ en: 'What is overdue?', el: 'Τι είναι εκπρόθεσμο;' });
  } else if (result.tool === 'team-gap') {
    out.push({ en: 'Who is my best match?', el: 'Ποια είναι η καλύτερη αντιστοίχιση;' });
  } else if (result.tool === 'round' || result.tool === 'pipeline') {
    out.push({ en: 'Record a $50k investment in my round', el: 'Κατέγραψε επένδυση $50k στον γύρο' });
    out.push({ en: 'What programs can I apply to?', el: 'Σε ποια προγράμματα μπορώ να κάνω αίτηση;' });
  } else if (result.tool === 'events' || result.tool === 'session-add') {
    out.push({ en: 'what events are coming', el: 'ποιες εκδηλώσεις έρχονται' });
  } else if (result.tool === 'perks') {
    out.push({ en: 'Claim the Amazon Web Services perk', el: 'Διεκδίκησε το AWS perk' });
  } else if (result.tool === 'programs') {
    out.push({ en: 'Apply to Y Combinator S26', el: 'Αίτηση στο Y Combinator S26' });
  } else if (result.tool === 'playbook') {
    out.push({ en: 'Who should I meet this week?', el: 'Ποιον να γνωρίσω αυτή την εβδομάδα;' });
    out.push({ en: 'Invite 3 founders', el: 'Προσκάλεσε 3 ιδρυτές' });
  } else if (result.tool === 'invite') {
    out.push({ en: 'Give me a 7-day match plan', el: 'Δώσε μου πλάνο 7 ημερών' });
  } else if (result.tool === 'week-meet') {
    out.push({ en: 'Who is my best match?', el: 'Ποια είναι η καλύτερη αντιστοίχιση;' });
    out.push({ en: 'what events are coming', el: 'ποιες εκδηλώσεις έρχονται' });
  } else if (result.tool === 'fit-check') {
    out.push({ en: 'Who is my best match?', el: 'Ποια είναι η καλύτερη αντιστοίχιση;' });
    out.push({ en: 'What does my founding team still lack?', el: 'Τι λείπει ακόμα στην ιδρυτική ομάδα;' });
  } else if (result.tool === 'scout') {
    out.push({ en: 'Draft a need card for a co-founder', el: 'Γράψε κάρτα ανάγκης για συνιδρυτή' });
    out.push({ en: 'What should I do first?', el: 'Τι να κάνω πρώτα;' });
  } else if (result.tool === 'need') {
    out.push({ en: 'Propose three people — do not send', el: 'Πρότεινε τρεις — χωρίς αποστολή' });
    out.push({ en: 'What should I do first?', el: 'Τι να κάνω πρώτα;' });
  } else if (result.tool === 'next') {
    out.push({ en: 'Who is my best match?', el: 'Ποια είναι η καλύτερη αντιστοίχιση;' });
    out.push({ en: 'What does my founding team still lack?', el: 'Τι λείπει ακόμα στην ιδρυτική ομάδα;' });
  } else if (result.tool === 'inbox') {
    out.push({ en: 'How do I start a voice call?', el: 'Πώς ξεκινάω φωνητική κλήση;' });
  } else if (result.tool === 'open-to') {
    out.push({ en: 'Propose three people — do not send', el: 'Πρότεινε τρεις — χωρίς αποστολή' });
  }
  return out.length ? { ...result, followUps: out.slice(0, 2) } : result;
}

function saveOrConnect(kind: 'save' | 'connect', person: Person, propose: boolean): AssistantResult {
  const card = {
    id: person.id,
    fullName: person.fullName,
    role: person.role,
    industry: person.industry,
    location: person.location,
    note: person.headline,
  };
  const links = [linkFor(person), { href: '/network', en: 'Open network', el: 'Άνοιγμα δικτύου' }];
  let logged: LoggedWrite | null = null;
  if (kind === 'save') {
    const apply = (): AssistantResult => {
      saveProfile(card);
      logged = { kind: 'profile', title: `Saved ${person.fullName}`, titleEl: `Αποθηκεύτηκε ${person.fullName}`, href: `/profile/${person.id}` };
      logActivity({ ...logged, byAssistant: true });
      return {
        tool: 'save',
        en: `${person.fullName} is on your saved list. Open Network to compare notes.`,
        el: `${person.fullName} είναι στη λίστα αποθηκευμένων. Άνοιξε το Δίκτυο για τις σημειώσεις.`,
        href: '/network',
        links,
      };
    };
    if (!propose) return apply();
    return proposalResult(
      {
        summary: { en: `Save ${person.fullName} to your saved list?`, el: `Αποθήκευση ${person.fullName} στη λίστα αποθηκευμένων;` },
        reversal: 'full',
        apply,
        undo: () => { removeSaved(person.id); logUndo(logged); },
      },
      { tool: 'save', href: '/network', links },
    );
  }

  // A signed-in (non-demo) account sends through the same Firestore path the
  // pages use — sendConnectionRequest notifies the member. Demo stays local.
  const uid = dataScope() || null;
  const remote = !isDemoData() && uid !== null;
  let sent = false;

  const applyLocal = (): AssistantResult => {
    saveRequest({ ...card, status: 'pending', message: 'Sent from the studio assistant' });
    logged = { kind: 'request', title: `Requested ${person.fullName}`, titleEl: `Αίτημα προς ${person.fullName}`, href: `/profile/${person.id}` };
    logActivity({ ...logged, byAssistant: true });
    return {
      tool: 'connect',
      en: `Connection request queued for ${person.fullName}. It shows on Network.`,
      el: `Το αίτημα σύνδεσης για ${person.fullName} είναι στη λίστα. Φαίνεται στο Δίκτυο.`,
      href: '/network',
      links,
    };
  };

  const applyRemote = async (): Promise<AssistantResult> => {
    const { sendConnectionRequest } = await import('../lib/social');
    const outcome = await sendConnectionRequest({ id: person.id, fullName: person.fullName, headline: person.headline, avatarUrl: avatarOf(person) }, 'Co-Founder');
    sent = outcome === 'sent';
    logged = { kind: 'request', title: `Requested ${person.fullName}`, titleEl: `Αίτημα προς ${person.fullName}`, href: `/profile/${person.id}` };
    logActivity({ ...logged, byAssistant: true });
    if (outcome === 'accepted') {
      return {
        tool: 'connect',
        en: `${person.fullName} had already asked — you are now connected.`,
        el: `${person.fullName} είχε ήδη ζητήσει σύνδεση — η σύνδεση ολοκληρώθηκε.`,
        href: '/network',
        links,
      };
    }
    if (outcome === 'exists') {
      return {
        tool: 'connect',
        en: `A request to ${person.fullName} is already pending — nothing new was sent. Withdraw it from Network if you changed your mind.`,
        el: `Υπάρχει ήδη αίτημα σε εκκρεμότητα προς ${person.fullName} — δεν στάλθηκε νέο. Ανάκτησέ το από το Δίκτυο αν άλλαξες γνώμη.`,
        href: '/network',
        links,
      };
    }
    return {
      tool: 'connect',
      en: `Connection request sent to ${person.fullName} — they were notified. It shows on Network.`,
      el: `Το αίτημα σύνδεσης στάλθηκε σε ${person.fullName} — ειδοποιήθηκε. Φαίνεται στο Δίκτυο.`,
      href: '/network',
      links,
    };
  };

  const undoRemote = async () => {
    const { connectionStateWith, withdrawConnection } = await import('../lib/social');
    const state = connectionStateWith(person.id);
    if (sent && state.state === 'outgoing' && state.record) {
      await withdrawConnection(state.record);
    } else if (sent && state.state !== 'connected' && uid) {
      // The listener may not have delivered the record yet — its doc id is
      // deterministic, so the pending request can still be withdrawn.
      await withdrawConnection({ id: `${uid}_${person.id}` } as import('../lib/social').ConnectionRecord);
    }
    logUndo(logged);
  };

  if (!propose) {
    if (remote) {
      // Non-propose mode stays synchronous: the Firestore write is fired in
      // the background and the caller keeps the optimistic reply. A failure
      // leaves no trace, the same way the pages surface it only via toast.
      void applyRemote().catch(() => undefined);
      return {
        tool: 'connect',
        en: `Connection request sent to ${person.fullName} — they were notified. It shows on Network.`,
        el: `Το αίτημα σύνδεσης στάλθηκε σε ${person.fullName} — ειδοποιήθηκε. Φαίνεται στο Δίκτυο.`,
        href: '/network',
        links,
      };
    }
    return applyLocal();
  }

  const summary = { en: `Send a connection request to ${person.fullName}?`, el: `Αίτημα σύνδεσης σε ${person.fullName};` };
  if (remote) {
    return proposalResult(
      {
        summary,
        reversal: 'partial',
        reversalNote: {
          en: 'Can be withdrawn while pending; the member may already have been notified.',
          el: 'Μπορεί να ανακληθεί όσο εκκρεμεί· το μέλος μπορεί να έχει ήδη ειδοποιηθεί.',
        },
        apply: applyRemote,
        undo: undoRemote,
      },
      { tool: 'connect', href: '/network', links },
    );
  }
  // saveRequest only queues the card on this account's list — nobody is
  // notified — so removing it restores the exact prior state.
  return proposalResult(
    {
      summary,
      reversal: 'full',
      apply: applyLocal,
      undo: () => { removeRequest(person.id); logUndo(logged); },
    },
    { tool: 'connect', href: '/network', links },
  );
}

function mentorsResult(query: string): AssistantResult {
  const folded = fold(query);
  let mentors = mentorPool();
  if (/\bfund|pitch|raise|χρηματοδ|pitch/.test(folded)) {
    mentors = mentors.filter((person) => (person.expertise ?? []).some((item) => /fund|pitch|strategy/i.test(item)));
  } else if (/\bproduct|προϊον/.test(folded)) {
    mentors = mentors.filter((person) => (person.expertise ?? []).some((item) => /product/i.test(item)));
  } else if (/\bgrowth|market|αναπτυξ/.test(folded)) {
    mentors = mentors.filter((person) => (person.expertise ?? []).some((item) => /growth|market/i.test(item)));
  } else if (/\bengine|tech|τεχνικ/.test(folded)) {
    mentors = mentors.filter((person) => (person.expertise ?? []).some((item) => /engineering|security|team/i.test(item)));
  }
  if (mentors.length === 0) mentors = mentorPool();
  const linesEn = mentors.map((person) => `${person.fullName} · ${person.headline}`);
  const linesEl = linesEn;
  return {
    tool: 'mentors',
    en: `Mentors from the same list as the Mentors page:\n${linesEn.join('\n')}`,
    el: `Μέντορες από την ίδια λίστα με τη σελίδα Μέντορες:\n${linesEl.join('\n')}`,
    href: '/mentors',
    links: mentors.map(linkFor),
  };
}

function milestonesResult(query: string, propose: boolean): AssistantResult {
  const folded = fold(query);
  const creating = hasStem(folded, 'add', 'create', 'new', 'προσθεσ', 'δημιουργ') && hasStem(folded, 'milestone', 'οροσημ');
  if (creating) {
    // Matched on the folded text (accents stripped, same length) so «Πρόσθεσε
    // ορόσημο …» strips its verb exactly like "add milestone …".
    const lead = fold(query).match(/^(please\s+)?(add|create|new|προσθεσε|δημιουργησε)\s+(a\s+|ενα\s+)?(milestone|οροσημο)\s*(called|named|με ονομα|με τιτλο)?\s*/i)?.[0] ?? '';
    const title = query.slice(lead.length).trim() || 'New milestone';
    const createdId = `m-${Date.now().toString(36)}`;
    let logged: LoggedWrite | null = null;
    const apply = (): AssistantResult => {
      const due = new Date();
      due.setDate(due.getDate() + 14);
      const created = {
        id: createdId,
        title,
        description: 'Created from the studio assistant.',
        targetDate: due.toISOString().slice(0, 10),
        status: 'Planned' as const,
        category: 'Product' as const,
        priority: 'Medium' as const,
        progress: 0,
        tasks: [],
        ownerId: 'me',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      upsertMilestone(created);
      logged = { kind: 'milestone', title: `Added ${title}`, titleEl: `Προστέθηκε: ${title}`, href: '/milestones' };
      logActivity({ ...logged, byAssistant: true });
      return {
        tool: 'milestone-add',
        en: `Added “${title}” to Milestones, due in two weeks. Open the board to change the date.`,
        el: `Προστέθηκε το «${title}» στα Ορόσημα, σε δύο εβδομάδες. Άνοιξε τον πίνακα για την ημερομηνία.`,
        href: '/milestones',
        links: [{ href: '/milestones', en: 'Open milestones', el: 'Άνοιγμα οροσήμων' }],
      };
    };
    if (!propose) return apply();
    // milestoneService writes through upsertMilestone/removeMilestone — the
    // same local list, mirrored to the account's cloud by the write observer —
    // so removeMilestone reverts the apply on both stores.
    return proposalResult(
      {
        summary: { en: `Add “${title}” to Milestones, due in two weeks?`, el: `Προσθήκη «${title}» στα Ορόσημα, σε δύο εβδομάδες;` },
        reversal: 'full',
        apply,
        undo: () => { removeMilestone(createdId); logUndo(logged); },
      },
      { tool: 'milestone-add', href: '/milestones', links: [{ href: '/milestones', en: 'Open milestones', el: 'Άνοιγμα οροσήμων' }] },
    );
  }
  const list = milestoneService.list();
  if (list.length === 0) {
    return {
      tool: 'milestones',
      en: 'No milestones yet. Say “add milestone ship the MVP” and I will put it on the board.',
      el: 'Δεν υπάρχουν ορόσημα. Πες «πρόσθεσε ορόσημο ship the MVP» και θα μπει στον πίνακα.',
      href: '/milestones',
      links: [{ href: '/milestones', en: 'Open milestones', el: 'Άνοιγμα οροσήμων' }],
    };
  }
  const linesEn = list.slice(0, 6).map((item) => `${item.title} · ${item.status} · ${item.progress}% · due ${item.targetDate.slice(0, 10)}`);
  const linesEl = list.slice(0, 6).map((item) => `${item.title} · ${item.status} · ${item.progress}% · έως ${item.targetDate.slice(0, 10)}`);
  return {
    tool: 'milestones',
    en: `Same board as the Milestones page:\n${linesEn.join('\n')}`,
    el: `Ο ίδιος πίνακας με τη σελίδα Ορόσημα:\n${linesEl.join('\n')}`,
    href: '/milestones',
    links: [{ href: '/milestones', en: 'Open milestones', el: 'Άνοιγμα οροσήμων' }],
  };
}

type RoundSet = { field: keyof Round; value: number | string; kind: 'money' | 'date' | 'text' | 'percent'; labelEn: string; labelEl: string };

/** "set monthly burn to 12k" / "όρισε στόχο γύρου 1.5M" → the round field + parsed value, or null. */
function parseRoundSet(query: string): RoundSet | null {
  const folded = fold(query);
  const isSet = /\b(set|rename|update|change)\b/.test(folded) || hasStem(folded, 'ορισε', 'αλλαξ', 'μετονομασ');
  if (!isSet) return null;
  const rename = folded.match(/\brename(?:\s+the)?\s+round\s+(?:to|as)\s+(.+)/)
    ?? folded.match(/μετονομασ[^\s]*\s+(?:τον?\s+)?γυρο[^\s]*\s+σε\s+(.+)/);
  if (rename?.[1]) {
    const name = rename[1].trim().replace(/^["'«]|["'»]$/g, '');
    if (name) return { field: 'name', value: name[0]!.toUpperCase() + name.slice(1), kind: 'text', labelEn: 'round name', labelEl: 'το όνομα του γύρου' };
    return null;
  }
  const amount = parseMoney(folded);
  const date = folded.match(/\b(\d{4}-\d{1,2}-\d{1,2})\b/)?.[1];
  if (hasStem(folded, 'ημερομην', 'κλεισιματ') || /\b(close|closing)\b/.test(folded)) {
    return date ? { field: 'closeDate', value: date, kind: 'date', labelEn: 'close date', labelEl: 'την ημερομηνία κλεισίματος' } : null;
  }
  if (/\bburn\b|καυσ/.test(folded)) {
    return amount != null ? { field: 'monthlyBurn', value: amount, kind: 'money', labelEn: 'monthly burn', labelEl: 'το μηνιαίο burn' } : null;
  }
  if (/\bcash\b|διαθεσιμ/.test(folded)) {
    return amount != null ? { field: 'cashOnHand', value: amount, kind: 'money', labelEn: 'cash on hand', labelEl: 'τα διαθέσιμα' } : null;
  }
  if (/\btarget\b|στοχο/.test(folded)) {
    return amount != null ? { field: 'targetAmount', value: amount, kind: 'money', labelEn: 'round target', labelEl: 'τον στόχο του γύρου' } : null;
  }
  if (/\bcommitted\b|δεσμευ/.test(folded)) {
    return amount != null ? { field: 'committedAmount', value: amount, kind: 'money', labelEn: 'committed', labelEl: 'τα δεσμευμένα' } : null;
  }
  if (/\bvaluation\b|αποτιμ/.test(folded)) {
    return amount != null ? { field: 'valuationCap', value: amount, kind: 'money', labelEn: 'valuation cap', labelEl: 'την ανώτατη αποτίμηση' } : null;
  }
  if (/\bdiscount\b|εκπτωσ/.test(folded)) {
    return amount != null ? { field: 'discountPct', value: amount, kind: 'percent', labelEn: 'discount', labelEl: 'την έκπτωση' } : null;
  }
  return null;
}

const roundSetDisplay = (set: RoundSet, value: unknown): string => {
  if (set.kind === 'money') return `$${Number(value || 0).toLocaleString()}`;
  if (set.kind === 'percent') return `${value}%`;
  return String(value ?? '—');
};

function roundSetResult(set: RoundSet, propose: boolean): AssistantResult {
  const previous = readRound();
  const before = roundSetDisplay(set, previous[set.field]);
  const after = roundSetDisplay(set, set.value);
  const links: AssistantLink[] = [{ href: '/fundraising', en: 'Open fundraising', el: 'Άνοιγμα χρηματοδότησης' }];
  let logged: LoggedWrite | null = null;
  const apply = (): AssistantResult => {
    writeRound({ [set.field]: set.value });
    logged = { kind: 'round', title: `Set ${set.labelEn} ${before} → ${after}`, titleEl: `${set.labelEl}: ${before} → ${after}`, href: '/fundraising' };
    logActivity({ ...logged, byAssistant: true });
    return {
      tool: 'round-set',
      en: `${set.labelEn}: ${before} → ${after}. Same number Fundraising shows.`,
      el: `${set.labelEl}: ${before} → ${after}. Το ίδιο νούμερο με τη Χρηματοδότηση.`,
      href: '/fundraising',
      links,
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `Set ${set.labelEn} to ${after} (now ${before})?`, el: `${set.labelEl} σε ${after} (τώρα ${before});` },
      reversal: 'full',
      apply,
      undo: () => { writeRound(previous); logUndo(logged); },
    },
    { tool: 'round-set', href: '/fundraising', links },
  );
}

// ── Settings / profile / notification writes — same functions the pages use ─

type SettingsSet =
  | { kind: 'switch'; patch: Partial<Switches>; labelEn: string; labelEl: string }
  | { kind: 'notify'; key: keyof NotificationPrefs; on: boolean; labelEn: string; labelEl: string };

const NOTIFY_ROWS: { key: keyof NotificationPrefs; words: RegExp; en: string; el: string }[] = [
  { key: 'matches', words: /match|ταιριασ/, en: 'Match notifications', el: 'Ειδοποιήσεις ταιριασμάτων' },
  { key: 'messages', words: /messag|μηνυμ/, en: 'Message notifications', el: 'Ειδοποιήσεις μηνυμάτων' },
  { key: 'community', words: /communit|κοινοτ/, en: 'Community notifications', el: 'Ειδοποιήσεις κοινότητας' },
  { key: 'news', words: /\bnews\b|\bνεα\b/, en: 'News notifications', el: 'Ειδοποιήσεις νέων' },
  { key: 'events', words: /event|εκδηλωσ/, en: 'Event notifications', el: 'Ειδοποιήσεις εκδηλώσεων' },
  { key: 'mentors', words: /mentor|μεντορ/, en: 'Mentor notifications', el: 'Ειδοποιήσεις μεντόρων' },
  { key: 'fundraising', words: /fundrais|χρηματοδοτ/, en: 'Fundraising notifications', el: 'Ειδοποιήσεις χρηματοδότησης' },
  { key: 'mentions', words: /mention|αναφορ/, en: 'Mention notifications', el: 'Ειδοποιήσεις αναφορών' },
];

/** "hide my email" / «μηνύματα μόνο από συνδέσεις» / "turn off event notifications" → a Settings write, or null. */
function parseSettingsSet(query: string): SettingsSet | null {
  const f = fold(query);
  if (/notification|ειδοποιησ/.test(f)) {
    const off = /\b(off|disable|mute|stop)\b|απενεργοποι|κλεισ|σταματ/.test(f);
    const on = !off && (/\b(on|enable|unmute|start)\b|ενεργοποι|ανοιξ/.test(f));
    const row = NOTIFY_ROWS.find((item) => item.words.test(f));
    if (row && (off || on)) return { kind: 'notify', key: row.key, on, labelEn: row.en, labelEl: row.el };
    return null;
  }
  const sw = (patch: Partial<Switches>, labelEn: string, labelEl: string): SettingsSet => ({ kind: 'switch', patch, labelEn, labelEl });
  if (/messages from anyone|let anyone message|απο οποιονδηποτε/.test(f)) return sw({ messagesFrom: 'anyone' }, 'Messages from', 'Μηνύματα από');
  if (/messages from connections|only connections can message|μονο απο συνδεσει/.test(f)) return sw({ messagesFrom: 'connections' }, 'Messages from', 'Μηνύματα από');
  if (/close new chats|no one can message|κλεισε τα νεα μηνυματα|κανεις να μη|κανεις.{0,20}στελν/.test(f)) return sw({ messagesFrom: 'none' }, 'Messages from', 'Μηνύματα από');
  if (/hide me from (discovery|search|matches)|κρυψε με/.test(f)) return sw({ discoverable: false }, 'Discoverable', 'Ορατότητα στην εξερεύνηση');
  if (/show me in discovery|εμφανισε με/.test(f)) return sw({ discoverable: true }, 'Discoverable', 'Ορατότητα στην εξερεύνηση');
  if ((/stop sharing/.test(f) && /presence|online/.test(f)) || (/μην δειχνεις/.test(f) && /ποτε ειμαι|online/.test(f))) return sw({ sharePresence: false }, 'Share my presence', 'Κοινοποίηση παρουσίας');
  if (/share my presence|δειξε ποτε ειμαι/.test(f)) return sw({ sharePresence: true }, 'Share my presence', 'Κοινοποίηση παρουσίας');
  if (/hide my email|κρυψε το email/.test(f)) return sw({ showEmail: false }, 'Show my email', 'Εμφάνιση του email μου');
  if (/show my email|δειξε το email/.test(f)) return sw({ showEmail: true }, 'Show my email', 'Εμφάνιση του email μου');
  if (/open to mentoring|accept mentor requests|δεχομαι.{0,20}καθοδηγησ/.test(f)) return sw({ mentorAvailability: true }, 'Mentoring requests', 'Αιτήματα καθοδήγησης');
  if (/close mentoring|stop mentor requests|κλεισε.{0,20}καθοδηγησ/.test(f)) return sw({ mentorAvailability: false }, 'Mentoring requests', 'Αιτήματα καθοδήγησης');
  if (/make my profile public|προφιλ.{0,10}δημοσιο|δημοσιο.{0,10}προφιλ/.test(f)) return sw({ publicProfile: true }, 'Public profile', 'Δημόσιο προφίλ');
  if (/make my profile private|προφιλ.{0,10}ιδιωτικο|ιδιωτικο.{0,10}προφιλ/.test(f)) return sw({ publicProfile: false }, 'Public profile', 'Δημόσιο προφίλ');
  return null;
}

const fmtSwitch = (field: keyof Switches, value: unknown, el: boolean): string => {
  if (field === 'messagesFrom') {
    const labels: Record<string, [string, string]> = { anyone: ['anyone', 'οποιοσδήποτε'], connections: ['connections only', 'μόνο συνδέσεις'], none: ['nobody', 'κανείς'] };
    const pair = labels[value as string] ?? [String(value), String(value)];
    return el ? pair[1] : pair[0];
  }
  if (typeof value === 'boolean') return value ? (el ? 'ενεργό' : 'on') : el ? 'ανενεργό' : 'off';
  return String(value ?? '—');
};

function settingsSetResult(set: SettingsSet, propose: boolean): AssistantResult {
  const ctx = () => ({ uid: dataScope() || null, demo: isDemoData() });
  const links: AssistantLink[] = [{ href: '/settings', en: 'Open settings', el: 'Άνοιγμα ρυθμίσεων' }];
  let logged: LoggedWrite | null = null;
  if (set.kind === 'notify') {
    const previous = readNotificationPrefs();
    const next = { ...previous, [set.key]: set.on };
    const state = (on: boolean, el = false) => (on ? (el ? 'ενεργές' : 'on') : el ? 'ανενεργές' : 'off');
    const apply = (): AssistantResult => {
      writeNotificationPrefs(next);
      logged = {
        kind: 'settings',
        title: `${set.labelEn}: ${state(previous[set.key])} → ${state(set.on)}`,
        titleEl: `${set.labelEl}: ${state(previous[set.key], true)} → ${state(set.on, true)}`,
        href: '/settings',
      };
      logActivity({ ...logged, byAssistant: true });
      return {
        tool: 'settings-set',
        en: `${set.labelEn}: ${state(previous[set.key])} → ${state(set.on)}. Same toggle as Settings → Notifications.`,
        el: `${set.labelEl}: ${state(previous[set.key], true)} → ${state(set.on, true)}. Ο ίδιος διακόπτης με Ρυθμίσεις → Ειδοποιήσεις.`,
        href: '/settings',
        links,
      };
    };
    if (!propose) return apply();
    return proposalResult(
      {
        summary: { en: `${set.labelEn}: ${state(previous[set.key])} → ${state(set.on)}?`, el: `${set.labelEl}: ${state(previous[set.key], true)} → ${state(set.on, true)};` },
        reversal: 'full',
        apply,
        undo: () => { writeNotificationPrefs(previous); logUndo(logged); },
      },
      { tool: 'settings-set', href: '/settings', links },
    );
  }
  const previous = readSwitches();
  const field = Object.keys(set.patch)[0] as keyof Switches;
  const before = fmtSwitch(field, previous[field], false);
  const after = fmtSwitch(field, set.patch[field], false);
  const beforeEl = fmtSwitch(field, previous[field], true);
  const afterEl = fmtSwitch(field, set.patch[field], true);
  const apply = (): AssistantResult => {
    applySwitches(set.patch, ctx());
    logged = { kind: 'settings', title: `${set.labelEn}: ${before} → ${after}`, titleEl: `${set.labelEl}: ${beforeEl} → ${afterEl}`, href: '/settings' };
    logActivity({ ...logged, byAssistant: true });
    return {
      tool: 'settings-set',
      en: `${set.labelEn}: ${before} → ${after}. The same function the Settings switch uses — the page shows it without a reload.`,
      el: `${set.labelEl}: ${beforeEl} → ${afterEl}. Η ίδια συνάρτηση με τον διακόπτη στις Ρυθμίσεις — η σελίδα το δείχνει χωρίς ανανέωση.`,
      href: '/settings',
      links,
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `${set.labelEn}: ${before} → ${after}?`, el: `${set.labelEl}: ${beforeEl} → ${afterEl};` },
      reversal: 'full',
      apply,
      undo: () => { applySwitches(previous, ctx()); logUndo(logged); },
    },
    { tool: 'settings-set', href: '/settings', links },
  );
}

type ProfileSet =
  | { field: 'headline' | 'bio' | 'location'; value: string; en: string; el: string }
  | { field: 'skills'; value: string; add: boolean; en: string; el: string };

const PROFILE_MAX = { headline: 160, bio: 600, location: 80, skill: 40 } as const;

/** "change my headline to …" / «όρισε την τοποθεσία μου σε …» / "add skill X" → a profile write, or null. */
function parseProfileSet(query: string): ProfileSet | null {
  const f = fold(query);
  // fold() keeps indices 1:1, so the raw remainder is the tail of the query.
  const tail = (m: RegExpMatchArray): string => {
    const raw = query.slice(query.length - m[1]!.length).trim();
    return raw.length > 1 && /^["'«»“”]/.test(raw) && /["'«»“”]$/.test(raw) ? raw.slice(1, -1).trim() : raw;
  };
  let m = f.match(/(?:change|set|update)\s+my\s+headline\s+to\s+(.+)$/)
    ?? f.match(/(?:αλλαξε|ορισε)\s+(?:την\s+)?επικεφαλιδα(?:\s+μου)?\s+σε\s+(.+)$/);
  if (m?.[1]) return { field: 'headline', value: tail(m), en: 'Headline', el: 'Επικεφαλίδα' };
  m = f.match(/(?:change|set|update)\s+my\s+bio\s+to\s+(.+)$/)
    ?? f.match(/(?:αλλαξε|ορισε)\s+το\s+bio(?:\s+μου)?\s+σε\s+(.+)$/);
  if (m?.[1]) return { field: 'bio', value: tail(m), en: 'Bio', el: 'Bio' };
  m = f.match(/(?:change|set|update)\s+my\s+location\s+to\s+(.+)$/)
    ?? f.match(/(?:αλλαξε|ορισε)\s+(?:την\s+)?τοποθεσια(?:\s+μου)?\s+σε\s+(.+)$/);
  if (m?.[1]) return { field: 'location', value: tail(m), en: 'Location', el: 'Τοποθεσία' };
  m = f.match(/add\s+(?:the\s+)?skill\s+(.+)$/)
    ?? f.match(/προσθεσε\s+δεξιοτητ\S*\s+(.+)$/);
  if (m?.[1]) return { field: 'skills', value: tail(m), add: true, en: 'Skills', el: 'Δεξιότητες' };
  m = f.match(/(?:remove|delete|drop)\s+(?:the\s+)?skill\s+(.+)$/)
    ?? f.match(/αφαιρεσε\s+δεξιοτητ\S*\s+(.+)$/);
  if (m?.[1]) return { field: 'skills', value: tail(m), add: false, en: 'Skills', el: 'Δεξιότητες' };
  return null;
}

function profileSetResult(set: ProfileSet, profile: AssistantProfile | null, propose: boolean): AssistantResult {
  const links: AssistantLink[] = [{ href: '/profile', en: 'Open profile', el: 'Άνοιγμα προφίλ' }];
  const demo = isDemoData();
  const uid = dataScope() || null;
  if (!demo && !uid) {
    return { tool: 'profile-set', en: 'Sign in to update your profile.', el: 'Συνδέσου για να ενημερώσεις το προφίλ σου.', links };
  }
  const limit = set.field === 'skills' ? PROFILE_MAX.skill : PROFILE_MAX[set.field];
  if (!set.value || set.value.length > limit) {
    return { tool: 'profile-set', en: `${set.en} accepts up to ${limit} characters — that one is ${set.value.length}.`, el: `${set.el}: όριο ${limit} χαρακτήρες — αυτό έχει ${set.value.length}.`, links };
  }
  const skills = (profile?.skills as string[] | undefined) ?? [];
  let patch: Partial<UserProfile>;
  let prevPatch: Partial<UserProfile>;
  let summaryEn: string;
  let summaryEl: string;
  if (set.field === 'skills') {
    const exists = skills.some((skill) => skill.toLowerCase() === set.value.toLowerCase());
    if (set.add && exists) return { tool: 'profile-set', en: `“${set.value}” is already in your skills.`, el: `«${set.value}» είναι ήδη στις δεξιότητές σου.`, links };
    if (!set.add && !exists) return { tool: 'profile-set', en: `“${set.value}” is not in your skills.`, el: `«${set.value}» δεν είναι στις δεξιότητές σου.`, links };
    patch = { skills: set.add ? [...skills, set.value] : skills.filter((skill) => skill.toLowerCase() !== set.value.toLowerCase()) };
    prevPatch = { skills };
    summaryEn = `Skills: ${set.add ? `add “${set.value}”` : `remove “${set.value}”`}?`;
    summaryEl = `Δεξιότητες: ${set.add ? `προσθήκη «${set.value}»` : `αφαίρεση «${set.value}»`};`;
  } else {
    const before = profile?.[set.field] ?? '—';
    patch = { [set.field]: set.value } as Partial<UserProfile>;
    prevPatch = { [set.field]: profile?.[set.field] } as Partial<UserProfile>;
    summaryEn = `${set.en}: “${before}” → “${set.value}”?`;
    summaryEl = `${set.el}: «${before}» → «${set.value}»;`;
  }
  const write = async (p: Partial<UserProfile>): Promise<boolean> => {
    if (demo || !uid) {
      writeProfileLocal(p);
      return true;
    }
    try {
      await persistProfilePatch(uid, p);
      return true;
    } catch {
      return false;
    }
  };
  let logged: LoggedWrite | null = null;
  const apply = async (): Promise<AssistantResult> => {
    const ok = await write(patch);
    if (!ok) {
      return { tool: 'profile-set', en: 'The profile write did not go through — nothing changed.', el: 'Η αποθήκευση στο προφίλ απέτυχε — τίποτα δεν άλλαξε.', links };
    }
    logged = { kind: 'settings', title: `Profile ${set.en.toLowerCase()} updated`, titleEl: `Προφίλ: ενημερώθηκε ${set.el.toLowerCase()}`, href: '/profile' };
    logActivity({ ...logged, byAssistant: true });
    return {
      tool: 'profile-set',
      en: `${set.en} updated — the same write Profile → Edit does.`,
      el: `${set.el} ενημερώθηκε — η ίδια αποθήκευση με Προφίλ → Επεξεργασία.`,
      href: '/profile',
      links,
    };
  };
  const undo = async () => {
    await write(prevPatch);
    logUndo(logged);
  };
  if (!propose) {
    void apply();
    return {
      tool: 'profile-set',
      en: `${set.en} updated — the same write Profile → Edit does.`,
      el: `${set.el} ενημερώθηκε — η ίδια αποθήκευση με Προφίλ → Επεξεργασία.`,
      href: '/profile',
      links,
    };
  }
  return proposalResult(
    { summary: { en: summaryEn, el: summaryEl }, reversal: 'full', apply, undo },
    { tool: 'profile-set', href: '/profile', links },
  );
}

/** "mark all notifications read" / «καθάρισε τις ειδοποιήσεις». */
function parseNotificationsRead(query: string): boolean {
  const f = fold(query);
  if (/\bmark all notifications(?: as)? read\b/.test(f)) return true;
  return hasStem(f, 'ειδοποιησ') && hasStem(f, 'αναγνωσμεν', 'καθαρισε', 'σημανε', 'διαβασμεν');
}

function notificationsReadResult(propose: boolean): AssistantResult {
  const links: AssistantLink[] = [{ href: '/notifications', en: 'Open notifications', el: 'Άνοιγμα ειδοποιήσεων' }];
  const cloudTouched = cloudNotificationsUnread() > 0;
  let restore: (() => void) | null = null;
  const apply = (): AssistantResult => {
    const done = markAllNotificationsRead();
    restore = done.restore;
    // Logged already-read: the audit trail exists without resurrecting the badge.
    logActivity({ kind: 'settings', title: 'Marked all notifications read', titleEl: 'Σήμανση όλων των ειδοποιήσεων ως αναγνωσμένων', href: '/notifications', byAssistant: true, read: true });
    return {
      tool: 'notifications-read',
      en: 'All notifications marked as read.',
      el: 'Όλες οι ειδοποιήσεις σημειώθηκαν ως αναγνωσμένες.',
      href: '/notifications',
      links,
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: 'Mark all notifications as read?', el: 'Σήμανση όλων των ειδοποιήσεων ως αναγνωσμένων;' },
      reversal: cloudTouched ? 'partial' : 'full',
      reversalNote: cloudTouched
        ? { en: 'Notifications already synced to your account stay read', el: 'Οι ειδοποιήσεις που έχουν ήδη συγχρονιστεί με τον λογαριασμό παραμένουν αναγνωσμένες' }
        : undefined,
      apply,
      undo: () => {
        restore?.();
        logActivity({ kind: 'settings', title: 'Undid: marked all notifications read', titleEl: 'Αναιρέθηκε: σήμανση όλων των ειδοποιήσεων ως αναγνωσμένων', href: '/notifications', byAssistant: true, read: true });
      },
    },
    { tool: 'notifications-read', href: '/notifications', links },
  );
}

function roundResult(): AssistantResult {
  const round = readRound();
  const metrics = roundMetrics(round);
  const runway = metrics.runwayMonths;
  const pct = metrics.pct;
  // Post-money SAFE (lib/equity): the committed money owns amount ÷ post-money cap — the same figure as the Fundraising card.
  const safeShare = round.instrument === 'SAFE' && round.committedAmount > 0 ? safeOwnershipAtCap(round.committedAmount, round.valuationCap) : null;
  const dilutionEn = safeShare != null ? ` The committed SAFEs own ${formatPct(safeShare)} at the ${formatMoney(round.valuationCap)} post-money cap.` : '';
  const dilutionEl = safeShare != null ? ` Τα δεσμευμένα SAFE κατέχουν ${formatPct(safeShare)} στο post-money cap ${formatMoney(round.valuationCap)}.` : '';
  return {
    tool: 'round',
    en: `${round.name} ${round.instrument}: $${round.committedAmount.toLocaleString()} of $${round.targetAmount.toLocaleString()} (${pct}%).${runway != null ? ` About ${runway} months of runway.` : ''}${dilutionEn} Edit round on Fundraising, or tell me the new number.`,
    el: `${round.name} ${round.instrument}: $${round.committedAmount.toLocaleString()} από $${round.targetAmount.toLocaleString()} (${pct}%).${runway != null ? ` Περίπου ${runway} μήνες runway.` : ''}${dilutionEl} Επεξεργασία γύρου στη Χρηματοδότηση, ή πες μου το νέο νούμερο.`,
    href: '/fundraising',
    links: [
      { href: '/fundraising', en: 'Open fundraising', el: 'Άνοιγμα χρηματοδότησης' },
      { href: '/founder-tools?tab=tools&tool=captable', en: 'Model the next round', el: 'Μοντελοποίηση επόμενου γύρου' },
    ],
  };
}

function navigateResult(query: string): AssistantResult | null {
  const folded = fold(query);
  if (!hasStem(folded, 'open', 'go', 'show', 'take me', 'ανοιξ', 'πηγαιν', 'δειξ') && !ASSISTANT_PAGES.some((page) => page.keys.some((key) => folded === key))) {
    return null;
  }
  const page = ASSISTANT_PAGES.find((item) => item.keys.some((key) => folded.includes(key)));
  if (!page) return null;
  return {
    tool: 'navigate',
    en: `Opening ${page.en}.`,
    el: `Άνοιγμα: ${page.el}.`,
    href: page.href,
    links: [{ href: page.href, en: page.en, el: page.el }],
  };
}

function bookMentor(person: Person, propose: boolean): AssistantResult {
  const sessionId = `ses-${person.id}-${Date.now()}`;
  const hadMentor = readIds(listKeys.mentors).includes(person.id);
  let logged: LoggedWrite | null = null;
  const apply = (): AssistantResult => {
    const when = new Date();
    when.setDate(when.getDate() + 3);
    when.setHours(10, 0, 0, 0);
    addSession({
      id: sessionId,
      title: `Mentorship · ${person.fullName}`,
      type: 'Mentorship',
      time: when.toISOString(),
      duration: '30m',
      location: 'Video call',
      participants: [person.fullName],
      priority: 'High',
    });
    setId(listKeys.mentors, person.id, true);
    logged = { kind: 'session', title: `Booked ${person.fullName}`, titleEl: `Κλείστηκε συνάντηση με ${person.fullName}`, href: '/calendar' };
    logActivity({ ...logged, byAssistant: true });
    return {
      tool: 'book',
      en: `Booked a 30-minute session with ${person.fullName} in three days. It is on the Calendar.`,
      el: `Κλείστηκε συνάντηση 30 λεπτών με ${person.fullName} σε τρεις μέρες. Είναι στο Ημερολόγιο.`,
      href: '/calendar',
      links: [{ href: '/calendar', en: 'Open calendar', el: 'Άνοιγμα ημερολογίου' }, linkFor(person)],
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `Book a 30-minute session with ${person.fullName} in three days?`, el: `Κράτηση συνάντησης 30′ με ${person.fullName} σε τρεις μέρες;` },
      reversal: 'full',
      apply,
      undo: () => {
        removeSession(sessionId);
        if (!hadMentor) setId(listKeys.mentors, person.id, false);
        logUndo(logged);
      },
    },
    { tool: 'book', href: '/calendar', links: [{ href: '/calendar', en: 'Open calendar', el: 'Άνοιγμα ημερολογίου' }, linkFor(person)] },
  );
}

function sessionAddResult(query: string, propose: boolean): AssistantResult {
  const folded = fold(query);
  const meeting = /\bmeeting\b/.test(folded) || hasStem(folded, 'συναντησ');
  // Title: quoted text, or "with <Name>" / «με <Όνομα>»; else the old defaults.
  const quoted = query.match(/["'«»“”](.+?)["'«»“”]/)?.[1]?.trim();
  const withName = folded.match(/\bwith\s+([a-z][a-z'. -]{1,40})/)?.[1]
    ?? folded.match(/με\s+(?:τον|την|το|τη)?\s*([a-zα-ω][a-zα-ω'. -]{1,40})/)?.[1];
  const name = quoted ?? (withName ? withName.trim().replace(/\s+(on|at|σε|στις|την|τις|tomorrow|today|friday|monday|tuesday|wednesday|thursday|saturday|sunday).*/i, '').trim() : null);
  const title = quoted ?? (name ? `Meeting with ${name[0]!.toUpperCase()}${name.slice(1)}` : meeting ? 'Investor meeting' : 'Studio event');
  const participants = name && !quoted ? [name[0]!.toUpperCase() + name.slice(1)] : [];
  const sessionId = `ses-studio-${Date.now()}`;
  let logged: LoggedWrite | null = null;
  // "on 2026-11-05" (e.g. from the Calendar's empty day) schedules that day; otherwise tomorrow.
  const dayMatch = query.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  const onDay = dayMatch ? new Date(Number(dayMatch[1]), Number(dayMatch[2]) - 1, Number(dayMatch[3]), 10, 0, 0, 0) : null;
  const named = parseDay(folded);
  const clock = parseTime(folded);
  const dayLabel = onDay && !Number.isNaN(onDay.getTime()) ? onDay.toISOString().slice(0, 10) : named?.day ?? null;
  const timeLabel = clock ? `${String(clock.hours).padStart(2, '0')}:${String(clock.minutes).padStart(2, '0')}` : '10:00';
  const apply = (): AssistantResult => {
    const when = dayLabel ? new Date(`${dayLabel}T${timeLabel}:00`) : new Date();
    if (!dayLabel) when.setDate(when.getDate() + 1);
    if (!dayLabel) when.setHours(clock?.hours ?? 10, clock?.minutes ?? 0, 0, 0);
    addSession({
      id: sessionId,
      title,
      type: meeting || participants.length ? 'Meeting' : 'Event',
      time: when.toISOString(),
      duration: '30m',
      location: meeting || participants.length ? 'Video call' : 'Workspace',
      participants,
      priority: 'Medium',
    });
    logged = { kind: 'session', title: `Scheduled ${title}`, titleEl: `Προγραμματίστηκε: ${title}`, href: '/calendar' };
    logActivity({ ...logged, byAssistant: true });
    return {
      tool: 'session-add',
      en: `Put “${title}” on Calendar for ${dayLabel ?? 'tomorrow'} ${timeLabel}. Same list the Calendar page reads.`,
      el: `Μπήκε το «${title}» στο Ημερολόγιο για ${dayLabel ?? 'αύριο'} ${timeLabel}. Η ίδια λίστα με τη σελίδα Ημερολόγιο.`,
      href: '/calendar',
      links: [{ href: '/calendar', en: 'Open calendar', el: 'Άνοιγμα ημερολογίου' }],
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `Put “${title}” on Calendar for ${dayLabel ?? 'tomorrow'} ${timeLabel}?`, el: `Προσθήκη «${title}» στο Ημερολόγιο για ${dayLabel ?? 'αύριο'} ${timeLabel};` },
      reversal: 'full',
      apply,
      undo: () => { removeSession(sessionId); logUndo(logged); },
    },
    { tool: 'session-add', href: '/calendar', links: [{ href: '/calendar', en: 'Open calendar', el: 'Άνοιγμα ημερολογίου' }] },
  );
}

function becomeMentorResult(): AssistantResult {
  return {
    tool: 'become-mentor',
    en: 'To become a mentor, open Profile, add Mentor to the roles you offer, and write two lines on what you will share. Apply to Mentor on the Mentors page uses the same profile. I can also book a session with someone already listed.',
    el: 'Για να γίνεις μέντορας, άνοιξε το Προφίλ, πρόσθεσε Mentor στους ρόλους και γράψε δύο γραμμές για το τι θα μοιραστείς. Το «Αίτηση μέντορα» στη σελίδα Μέντορες χρησιμοποιεί το ίδιο προφίλ. Μπορώ και να κλείσω συνάντηση με κάποιον που ήδη υπάρχει στη λίστα.',
    href: '/profile',
    links: [
      { href: '/profile', en: 'Open profile', el: 'Άνοιγμα προφίλ' },
      { href: '/mentors', en: 'Open mentors', el: 'Άνοιγμα μεντόρων' },
    ],
  };
}

function parseMoney(folded: string): number | null {
  const match = folded.match(/\$?\s*(\d+(?:[.,]\d+)?)\s*(k|m)?\b/);
  if (!match) return null;
  const n = Number.parseFloat((match[1] ?? '0').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (match[2] === 'k') return Math.round(n * 1_000);
  if (match[2] === 'm') return Math.round(n * 1_000_000);
  return Math.round(n);
}

function applyResult(query: string, propose: boolean): AssistantResult {
  const folded = fold(query);
  const catalog = [
    { keys: ['yc', 'y combinator'], title: 'Y Combinator S26', type: 'Accelerator' },
    { keys: ['techstars'], title: 'Techstars Sustainability', type: 'Accelerator' },
    { keys: ['nsf sbir'], title: 'NSF SBIR Phase I', type: 'Grant' },
    { keys: ['founders factory'], title: 'Founders Factory EU', type: 'Studio' },
    { keys: ['fintech accelerator'], title: 'FinTech Accelerator Q3 2026', type: 'Accelerator' },
    { keys: ['cleantech innovation'], title: 'CleanTech Innovation Grant', type: 'Grant' },
    { keys: ['saas growth', 'founders academy'], title: 'SaaS Growth Bootcamp', type: 'Bootcamp' },
    { keys: ['series a scout', 'scout network'], title: 'Series A Scout Network', type: 'Opportunity' },
    { keys: ['impact investor'], title: 'Impact Investor Roundtable', type: 'Opportunity' },
    { keys: ['founder grant', 'stripe foundation'], title: 'Founder Grant — Q2 2026', type: 'Grant' },
    { keys: ['eu horizon', 'horizon innovation'], title: 'EU Horizon Innovation Fund', type: 'Grant' },
    { keys: ['debt facility', 'clearco'], title: 'Debt Facility — Revenue-Based', type: 'Debt' },
  ];
  const hit = catalog.find((item) => item.keys.some((key) => folded.includes(key)));
  const title = hit?.title ?? (query.replace(/^(please\s+)?(apply(\s+now)?(\s+to)?|applying to)\s+/i, '').trim() || 'Studio program');
  const type = hit?.type ?? 'Program';
  const alreadyTracked = readTracked().some((item) => item.program.toLowerCase() === title.toLowerCase());
  let logged: LoggedWrite | null = null;
  const apply = (): AssistantResult => {
    trackApplication(title, type);
    logged = { kind: 'application', title: `Applied to ${title}`, titleEl: `Αίτηση: ${title}`, href: '/fundraising' };
    logActivity({ ...logged, byAssistant: true });
    return {
      tool: 'apply',
      en: `Draft application for “${title}” is on the same tracking list Fundraising and Founder Tools read.`,
      el: `Η αίτηση για «${title}» είναι στην ίδια λίστα tracking με τη Χρηματοδότηση και τα Εργαλεία ιδρυτή.`,
      href: '/fundraising',
      links: [
        { href: '/fundraising', en: 'Open fundraising', el: 'Άνοιγμα χρηματοδότησης' },
        { href: '/founder-tools', en: 'Open founder tools', el: 'Άνοιγμα εργαλείων' },
      ],
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `Draft an application to “${title}”?`, el: `Προσχέδιο αίτησης για «${title}»;` },
      reversal: 'full',
      apply,
      undo: () => { if (!alreadyTracked) untrackApplication(title); logUndo(logged); },
    },
    {
      tool: 'apply',
      href: '/fundraising',
      links: [
        { href: '/fundraising', en: 'Open fundraising', el: 'Άνοιγμα χρηματοδότησης' },
        { href: '/founder-tools', en: 'Open founder tools', el: 'Άνοιγμα εργαλείων' },
      ],
    },
  );
}

function claimPerkResult(query: string, propose: boolean): AssistantResult {
  const folded = fold(query);
  const catalog = [
    { keys: ['aws', 'amazon web'], id: 'aws', name: 'Amazon Web Services' },
    { keys: ['stripe'], id: 'stripe', name: 'Stripe' },
    { keys: ['hubspot'], id: 'hubspot', name: 'HubSpot' },
    { keys: ['notion'], id: 'notion', name: 'Notion' },
    { keys: ['google cloud', 'gcp'], id: 'gcp', name: 'Google Cloud' },
    { keys: ['intercom'], id: 'intercom', name: 'Intercom' },
    { keys: ['slack'], id: 'slack', name: 'Slack' },
    { keys: ['mercury'], id: 'mercury', name: 'Mercury' },
  ];
  const hit = catalog.find((item) => item.keys.some((key) => folded.includes(key))) ?? catalog[0]!;
  if (isDemoData()) {
    const had = readIds(listKeys.perks).includes(hit.id);
    let logged: LoggedWrite | null = null;
    const apply = (): AssistantResult => {
      setId(listKeys.perks, hit.id, true);
      logged = { kind: 'perk', title: `Claimed ${hit.name}`, titleEl: `Διεκδικήθηκε: ${hit.name}`, href: '/perks' };
      logActivity({ ...logged, byAssistant: true });
      return {
        tool: 'claim-perk',
        en: `${hit.name} is marked claimed on Perks — same list the page reads.`,
        el: `Το ${hit.name} σημειώθηκε ως claimed στις Παροχές — η ίδια λίστα με τη σελίδα.`,
        href: '/perks',
        links: [{ href: '/perks', en: 'Open perks', el: 'Άνοιγμα παροχών' }],
      };
    };
    if (!propose) return apply();
    return proposalResult(
      {
        summary: { en: `Mark ${hit.name} claimed on Perks?`, el: `Σήμανση ${hit.name} ως claimed στις Παροχές;` },
        reversal: 'full',
        apply,
        undo: () => { if (!had) setId(listKeys.perks, hit.id, false); logUndo(logged); },
      },
      { tool: 'claim-perk', href: '/perks', links: [{ href: '/perks', en: 'Open perks', el: 'Άνοιγμα παροχών' }] },
    );
  }
  // Real accounts: perks are provider links, not platform claims — star the
  // card (same list the Perks star reads) and point at the apply link.
  const catalogIds: Record<string, string> = {
    aws: 'aws-activate', gcp: 'google-startups-cloud', notion: 'notion-startups',
    hubspot: 'hubspot-startups', intercom: 'intercom-early-stage',
  };
  const perkId = catalogIds[hit.id] ?? hit.id;
  const saved = savedPerks.read();
  const apply = (): AssistantResult => {
    if (!saved.includes(perkId)) savedPerks.write([...saved, perkId]);
    return {
      tool: 'claim-perk',
      en: `Starred ${hit.name} on Perks so you can track it — the card links to the provider site for the actual application.`,
      el: `Το ${hit.name} μπήκε αστεράκι στις Παροχές — η κάρτα οδηγεί στο site του παρόχου για την αίτηση.`,
      href: '/perks',
      links: [{ href: '/perks', en: 'Open perks', el: 'Άνοιγμα παροχών' }],
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `Star ${hit.name} on Perks so you can track it?`, el: `Αστεράκι στο ${hit.name} στις Παροχές;` },
      reversal: 'full',
      apply,
      undo: () => { savedPerks.write(saved); },
    },
    { tool: 'claim-perk', href: '/perks', links: [{ href: '/perks', en: 'Open perks', el: 'Άνοιγμα παροχών' }] },
  );
}

function recordInvestmentResult(query: string, propose: boolean): AssistantResult {
  const amount = parseMoney(fold(query)) ?? 50_000;
  const previous = readRound();
  let logged: LoggedWrite | null = null;
  const apply = (): AssistantResult => {
    const round = writeRound({ committedAmount: previous.committedAmount + amount });
    logged = { kind: 'round', title: `Recorded $${amount.toLocaleString()}`, titleEl: `Καταγράφηκε $${amount.toLocaleString()}`, href: '/fundraising' };
    logActivity({ ...logged, byAssistant: true });
    const pct = round.targetAmount > 0 ? Math.round((round.committedAmount / round.targetAmount) * 100) : 0;
    return {
      tool: 'record-investment',
      en: `Added $${amount.toLocaleString()} to ${round.name}. Now $${round.committedAmount.toLocaleString()} of $${round.targetAmount.toLocaleString()} (${pct}%). Same numbers Fundraising shows.`,
      el: `Προστέθηκαν $${amount.toLocaleString()} στον ${round.name}. Τώρα $${round.committedAmount.toLocaleString()} από $${round.targetAmount.toLocaleString()} (${pct}%). Τα ίδια νούμερα με τη Χρηματοδότηση.`,
      href: '/fundraising',
      links: [{ href: '/fundraising', en: 'Open fundraising', el: 'Άνοιγμα χρηματοδότησης' }],
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `Add $${amount.toLocaleString()} to the ${previous.name} round?`, el: `Προσθήκη $${amount.toLocaleString()} στον γύρο ${previous.name};` },
      reversal: 'full',
      apply,
      undo: () => { writeRound(previous); logUndo(logged); },
    },
    { tool: 'record-investment', href: '/fundraising', links: [{ href: '/fundraising', en: 'Open fundraising', el: 'Άνοιγμα χρηματοδότησης' }] },
  );
}

function addTaskResult(query: string, propose: boolean): AssistantResult {
  // Matched on the folded text (same length as the original) so «Πρόσθεσε εργασία …» strips like "add task …".
  const lead = fold(query).match(/^(please\s+)?(add|create|new|προσθεσε|δημιουργησε|νεα)\s+(a\s+|μια\s+)?(task|todo|εργασια|καθηκον)\s*(called|named|με τιτλο|:)?\s*/i)?.[0] ?? '';
  const day = parseDay(fold(query));
  // Cut the named day out of the title, like stepText does for investors.
  // day.start/day.end index into the folded string — same length as query.
  const title = (day ? (query.slice(lead.length, day.start) + ' ' + query.slice(day.end)).trim() : query.slice(lead.length).trim()) || 'New task';
  const dueLabel = day ? ` due ${day.day}` : '';
  let created: StudioTask | null = null;
  let logged: LoggedWrite | null = null;
  const apply = (): AssistantResult => {
    created = addStudioTask(title);
    if (day) updateStudioTask(created.id, { due: day.day });
    logged = { kind: 'milestone', title: `Added task ${title}`, titleEl: `Προστέθηκε εργασία: ${title}`, href: '/workspace' };
    logActivity({ ...logged, byAssistant: true });
    return {
      tool: 'task-add',
      en: `Added “${title}”${dueLabel} to Workspace → Dashboard. Same board the Task button writes.`,
      el: `Προστέθηκε το «${title}»${dueLabel} στο Workspace → Dashboard. Ο ίδιος πίνακας με το κουμπί Task.`,
      href: '/workspace',
      links: [{ href: '/workspace', en: 'Open workspace', el: 'Άνοιγμα χώρου εργασίας' }],
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `Add “${title}”${dueLabel} to Workspace → Dashboard?`, el: `Προσθήκη «${title}»${dueLabel} στο Workspace → Dashboard;` },
      reversal: 'full',
      apply,
      undo: () => { if (created) removeStudioTask(created.id); logUndo(logged); },
    },
    { tool: 'task-add', href: '/workspace', links: [{ href: '/workspace', en: 'Open workspace', el: 'Άνοιγμα χώρου εργασίας' }] },
  );
}

function activityResult(): AssistantResult {
  const items = readActivity().slice(0, 8);
  const unread = unreadActivityCount();
  if (items.length === 0) {
    return {
      tool: 'activity',
      en: 'No studio activity yet. Apply, claim a perk, add a task, or record an investment and it will show on Notifications.',
      el: 'Δεν υπάρχει ακόμα δραστηριότητα. Κάνε αίτηση, claim παροχής, πρόσθεσε εργασία ή καταγραφή επένδυσης και θα φανεί στις Ειδοποιήσεις.',
      href: '/notifications',
      links: [{ href: '/notifications', en: 'Open notifications', el: 'Άνοιγμα ειδοποιήσεων' }],
    };
  }
  const unreadEn = unread === 0 ? 'none unread' : `${unread} unread`;
  const unreadEl = unread === 0 ? 'καμία αδιάβαστη' : `${unread} αδιάβαστες`;
  return {
    tool: 'activity',
    en: `Same feed Notifications reads (${unreadEn}):\n${items.map((item) => item.title).join('\n')}`,
    el: `Το ίδιο feed με τις Ειδοποιήσεις (${unreadEl}):\n${items.map((item) => item.titleEl || item.title).join('\n')}`,
    href: '/notifications',
    links: [{ href: '/notifications', en: 'Open notifications', el: 'Άνοιγμα ειδοποιήσεων' }, { href: '/insights', en: 'Open insights', el: 'Άνοιγμα εικόνας' }],
  };
}

function eventsResult(query: string, propose: boolean): AssistantResult {
  const folded = fold(query);
  if (/\bhost|διοργανωσ|create an event|how do i host/.test(folded)) {
    return sessionAddResult('Schedule a new event on my calendar', propose);
  }
  const demoCopy = isDemoData();
  return {
    tool: 'events',
    en: demoCopy
      ? `Same list as the Events page: ${demoEventsLine('en')}.`
      : 'Events shows every session published by the platform and members — newest first, with real RSVP counts. Open Events to register; anything you register for lands on your Calendar.',
    el: demoCopy
      ? `Η ίδια λίστα με τη σελίδα Εκδηλώσεις: ${demoEventsLine('el')}.`
      : 'Οι Εκδηλώσεις δείχνουν κάθε session που δημοσίευσε η πλατφόρμα ή μέλη — με πραγματικά RSVP. Άνοιξε Εκδηλώσεις για εγγραφή· ό,τι δηλώσεις πάει στο Ημερολόγιό σου.',
    href: '/events',
    links: [{ href: '/events', en: 'Open events', el: 'Άνοιγμα εκδηλώσεων' }, { href: '/calendar', en: 'Open calendar', el: 'Άνοιγμα ημερολογίου' }],
  };
}

function programsResult(): AssistantResult {
  const demoCopy = isDemoData();
  return {
    tool: 'programs',
    en: demoCopy
      ? 'Same list as the Programs page: FinTech Accelerator Q3 2026 ($120k, 12 weeks), CleanTech Innovation Grant ($50k, non-dilutive), Founders Academy Bootcamp. Open Programs to filter Accelerators, Grants, or Bootcamps.'
      : 'Programs lists every published accelerator, grant and bootcamp, with the deadlines the admin set. Bookmark any card or tell me which one to apply to — I file the application for you.',
    el: demoCopy
      ? 'Η ίδια λίστα με τη σελίδα Προγράμματα: FinTech Accelerator Q3 2026 ($120k, 12 εβδομάδες), CleanTech Innovation Grant ($50k), Founders Academy Bootcamp. Άνοιξε Προγράμματα για φίλτρο.'
      : 'Τα Προγράμματα δείχνουν κάθε δημοσιευμένο accelerator, grant και bootcamp με τις πραγματικές προθεσμίες. Κάνε bookmark ή πες μου σε ποιο να κάνω αίτηση.',
    href: '/programs',
    links: [{ href: '/programs', en: 'Open programs', el: 'Άνοιγμα προγραμμάτων' }],
  };
}

function aboutResult(query: string): AssistantResult | null {
  const folded = fold(query);
  const asking = hasStem(folded, 'tell me about', 'what is', "what's", 'whats', 'explain', 'who is', 'πληροφορ', 'τι ειναι', 'ποιος ειναι', 'ποια ειναι', 'πες μου για', 'εξηγησε');
  const hit = knowledgeCards().find((card) => (!card.demo || isDemoData()) && card.keys.some((key) => folded.includes(key)));
  if (hit && (asking || hit.keys.some((key) => key.length >= 10 && folded.includes(key)))) {
    return {
      tool: 'about',
      en: hit.en,
      el: hit.el,
      href: hit.href,
      links: [{ href: hit.href, en: 'Open', el: 'Άνοιγμα' }],
    };
  }
  const person = namedPerson(query);
  if (person && asking) {
    return {
      tool: 'about-person',
      en: `${person.fullName} is listed as ${person.role}. ${person.headline} Same card as Profile.`,
      el: `${person.fullName} εμφανίζεται ως ${person.role}. ${person.headline} Η ίδια κάρτα με το Προφίλ.`,
      href: `/profile/${person.id}`,
      links: [linkFor(person)],
    };
  }
  return null;
}

function perksResult(): AssistantResult {
  const demoCopy = isDemoData();
  return {
    tool: 'perks',
    en: demoCopy
      ? 'Same list as Perks: AWS Activate ($100k credits), Stripe fee-free, HubSpot, Notion, Google Cloud, Intercom, Slack, Mercury. Open Perks to claim one.'
      : 'Perks lists every founder program the platform publishes, each with the provider link to apply. Star the ones you want to track.',
    el: demoCopy
      ? 'Η ίδια λίστα με τις Παροχές: AWS Activate, Stripe, HubSpot, Notion, Google Cloud, Intercom, Slack, Mercury. Άνοιξε Παροχές για claim.'
      : 'Οι Παροχές δείχνουν κάθε πρόγραμμα που δημοσιεύει η πλατφόρμα, με το link του παρόχου για αίτηση. Κάνε αστεράκι όσες θέλεις να παρακολουθείς.',
    href: '/perks',
    links: [{ href: '/perks', en: 'Open perks', el: 'Άνοιγμα παροχών' }],
  };
}

function resourcesResult(): AssistantResult {
  const demoCopy = isDemoData();
  return {
    tool: 'resources',
    en: demoCopy
      ? 'Resources has the same four tabs as the page: Learning (Fundraising, Sales, Legal, PMF), Partner Services, Jobs, and Support. Ask a course name or open Resources.'
      : 'Resources has four tabs: Learning (published courses), Partner Services, Jobs — where members post roles — and Support. Open Resources to browse what is live.',
    el: demoCopy
      ? 'Οι Πόροι έχουν τις ίδιες τέσσερις καρτέλες: Learning, Υπηρεσίες, Θέσεις, Υποστήριξη. Πες όνομα μαθήματος ή άνοιξε Πόρους.'
      : 'Οι Πόροι έχουν τέσσερις καρτέλες: Learning (δημοσιευμένα μαθήματα), Υπηρεσίες, Θέσεις — όπου τα μέλη αναρτούν roles — και Υποστήριξη.',
    href: '/resources',
    links: [{ href: '/resources', en: 'Open resources', el: 'Άνοιγμα πόρων' }],
  };
}

function legalResult(): AssistantResult {
  return {
    tool: 'legal',
    en: 'Legal Hub uses the same templates as the page: Articles of Incorporation, founder stock, PIIA, Mutual NDA, SAFE, seed term sheet. Book office hours from that page.',
    el: 'Το Legal Hub έχει τα ίδια πρότυπα: καταστατικό, founder stock, PIIA, NDA, SAFE, term sheet. Κλείσε office hours από εκεί.',
    href: '/legal',
    links: [{ href: '/legal', en: 'Open legal hub', el: 'Άνοιγμα νομικών' }],
  };
}

// Same platform spaces the Communities page renders — identical ids, so an
// assistant join lands on the same Firestore document the page streams.
export const COMMUNITY_CATALOG = [
  { id: 'fintech-founders', name: 'Fintech Founders', description: 'A space for entrepreneurs building the future of finance, banking, and payments.', category: 'Industry' },
  { id: 'ai-machine-learning', name: 'AI & Machine Learning', description: 'Discussing the latest in LLMs, computer vision, and AI-driven applications.', category: 'Technology' },
  { id: 'saas-builders', name: 'SaaS Builders', description: 'Everything about building, scaling, and selling software as a service.', category: 'Business Model' },
  { id: 'web3-crypto', name: 'Web3 & Crypto', description: 'Decentralized applications, blockchain protocols, and the future of the web.', category: 'Technology' },
];

function communitiesResult(query: string | undefined, propose: boolean): AssistantResult {
  const folded = fold(query || '');
  const joining = hasStem(folded, 'join', 'μπες', 'κανε join', 'γινε μελος', 'γινομαι μελος');
  const hit = COMMUNITY_CATALOG.find((item) => folded.includes(fold(item.name)));
  if (joining && hit) {
    const wasJoined = readIds(listKeys.communities).includes(hit.id);
    let logged: LoggedWrite | null = null;
    const apply = (): AssistantResult => {
      setId(listKeys.communities, hit.id, true);
      logged = { kind: 'community', title: `Joined ${hit.name}`, titleEl: `Έγινε join: ${hit.name}`, href: '/communities' };
      logActivity({ ...logged, byAssistant: true });
      // Persist membership the same way the page's Join button does — cloud
      // document for signed-in members, local mark in demo mode or offline.
      void import('../firebase').then(({ auth }) => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        void import('../lib/communities')
          .then(({ joinCommunity }) => joinCommunity(hit.id, uid, { name: hit.name, description: hit.description, category: hit.category }))
          .catch(() => { /* offline or permission-denied — the local mark still stands */ });
      }).catch(() => { /* Firebase not configured (tests, demo) */ });
      return {
        tool: 'communities',
        en: `You joined ${hit.name}. Same joined list the Communities page reads, and the membership is written to your account.`,
        el: `Έγινες μέλος στο ${hit.name}. Η ίδια λίστα join με τη σελίδα Κοινότητες.`,
        href: '/communities',
        links: [{ href: '/communities', en: 'Open communities', el: 'Άνοιγμα κοινοτήτων' }],
      };
    };
    if (!propose) return apply();
    // leaveCommunity exists in lib/communities and mirrors the join.
    return proposalResult(
      {
        summary: { en: `Join ${hit.name}?`, el: `Συμμετοχή στο ${hit.name};` },
        reversal: 'full',
        apply,
        undo: () => {
          if (!wasJoined) {
            setId(listKeys.communities, hit.id, false);
            void import('../firebase').then(({ auth }) => {
              const uid = auth.currentUser?.uid;
              if (!uid) return;
              void import('../lib/communities')
                .then(({ leaveCommunity }) => leaveCommunity(hit.id, uid))
                .catch(() => { /* offline — the local mark is already reverted */ });
            }).catch(() => { /* Firebase not configured (tests, demo) */ });
          }
          logUndo(logged);
        },
      },
      { tool: 'communities', href: '/communities', links: [{ href: '/communities', en: 'Open communities', el: 'Άνοιγμα κοινοτήτων' }] },
    );
  }
  const joined = COMMUNITY_CATALOG.filter((item) => readIds(listKeys.communities).includes(item.id));
  const joinedLine = joined.length ? ` You have joined ${joined.map((item) => item.name).join(', ')}.` : '';
  const joinedLineEl = joined.length ? ` Έχεις μπει σε ${joined.map((item) => item.name).join(', ')}.` : '';
  return {
    tool: 'communities',
    en: `Same list as Communities: Fintech Founders, AI & Machine Learning, SaaS Builders, Web3 & Crypto.${joinedLine} Join on that page, or say “join Fintech Founders”.`,
    el: `Η ίδια λίστα με τις Κοινότητες: Fintech Founders, AI & Machine Learning, SaaS Builders, Web3 & Crypto.${joinedLineEl} Κάνε Join εκεί, ή πες «join Fintech Founders».`,
    href: '/communities',
    links: [{ href: '/communities', en: 'Open communities', el: 'Άνοιγμα κοινοτήτων' }],
  };
}


const PLAYBOOK_TASKS = [
  'Confirm looking-for on Profile',
  'Ask why you match with your top person',
  'Save three people on Network',
  'Register for this week’s event',
  'Book a mentor session',
  'Invite three founders',
  'Ask what the founding team still lacks',
];

function playbookResult(propose: boolean): AssistantResult {
  const existing = new Set(readTasks().map((item) => item.title.toLowerCase()));
  const added = PLAYBOOK_TASKS.filter((title) => !existing.has(title.toLowerCase()));
  const links: AssistantLink[] = [
    { href: '/workspace', en: 'Open workspace', el: 'Άνοιγμα χώρου εργασίας' },
    { href: '/quiz', en: 'Open fit check', el: 'Άνοιγμα fit check' },
  ];
  const created: StudioTask[] = [];
  let logged: LoggedWrite | null = null;
  const apply = (): AssistantResult => {
    added.forEach((title) => created.push(addStudioTask(title)));
    logged = { kind: 'milestone', title: 'Started 7-day match plan', titleEl: 'Ξεκίνησε πλάνο 7 ημερών', href: '/workspace' };
    logActivity({ ...logged, byAssistant: true });
    return {
      tool: 'playbook',
      en: `Seven tasks are on Workspace → Dashboard: ${PLAYBOOK_TASKS.join('; ')}. ${added.length ? `Added ${added.length} new.` : 'They were already there.'} Same board the Task button writes.`,
      el: `Επτά εργασίες είναι στο Workspace → Dashboard: ${PLAYBOOK_TASKS.join('; ')}. ${added.length ? `Προστέθηκαν ${added.length}.` : 'Ήταν ήδη εκεί.'} Ο ίδιος πίνακας με το κουμπί Task.`,
      href: '/workspace',
      links,
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: {
        en: `Write the 7-day match plan to Workspace → Dashboard${added.length ? ` (${added.length} new tasks)` : ''}?`,
        el: `Εγγραφή πλάνου 7 ημερών στο Workspace → Dashboard${added.length ? ` (${added.length} νέες εργασίες)` : ''};`,
      },
      reversal: 'full',
      apply,
      undo: () => { created.forEach((task) => removeStudioTask(task.id)); logUndo(logged); },
    },
    { tool: 'playbook', href: '/workspace', links },
  );
}

function inviteResult(propose: boolean): AssistantResult {
  const before = readInvites();
  let logged: LoggedWrite | null = null;
  const apply = (): AssistantResult => {
    const seeded = seedFounderInvites(3);
    const href = seeded[0]?.href || '/quiz';
    logged = { kind: 'request', title: 'Prepared 3 founder invites', titleEl: 'Ετοιμάστηκαν 3 προσκλήσεις ιδρυτών', href: '/network' };
    logActivity({ ...logged, byAssistant: true });
    return {
      tool: 'invite',
      en: `Three invite slots are ready (${readInvites().length} on this account). Share ${href} — it is the same 60-second fit check, and Matches will read those fields. Copy the link and send it to three people you would actually work with.`,
      el: `Τρεις θέσεις πρόσκλησης είναι έτοιμες (${readInvites().length} σε αυτόν τον λογαριασμό). Στείλε το ${href} — είναι το ίδιο fit check 60″, και οι Αντιστοιχίσεις θα διαβάσουν αυτά τα πεδία.`,
      href: '/network',
      links: [
        { href: '/quiz', en: 'Open fit check', el: 'Άνοιγμα fit check' },
        { href: '/network', en: 'Open network', el: 'Άνοιγμα δικτύου' },
      ],
    };
  };
  if (!propose) return apply();
  // seedFounderInvites only mints generic /quiz links on the local list —
  // restoring the previous list reverts it exactly.
  return proposalResult(
    {
      summary: { en: 'Prepare 3 founder invite slots?', el: 'Προετοιμασία 3 προσκλήσεων ιδρυτών;' },
      reversal: 'full',
      apply,
      undo: () => { writeInvites(before); logUndo(logged); },
    },
    {
      tool: 'invite',
      href: '/network',
      links: [
        { href: '/quiz', en: 'Open fit check', el: 'Άνοιγμα fit check' },
        { href: '/network', en: 'Open network', el: 'Άνοιγμα δικτύου' },
      ],
    },
  );
}

function weekMeetResult(profile: AssistantProfile | null): AssistantResult {
  const ranked = rankPeople(fromProfile(profile ?? {}), cofounderPool()).slice(0, 2);
  const who = ranked[0]?.person;
  const next = DEMO_EVENTS[0];
  const eventLineEn = isDemoData()
    ? `register for ${next.title} on Events (${next.place.en}, ${shortDay(daysFromToday(next.inDays), 'en')})`
    : 'register for the next published session on Events';
  const eventLineEl = isDemoData()
    ? `εγγράψου στο ${next.title} στις Εκδηλώσεις (${next.place.el}, ${shortDay(daysFromToday(next.inDays), 'el')})`
    : 'εγγράψου στην επόμενη δημοσιευμένη συνεδρία στις Εκδηλώσεις';
  return {
    tool: 'week-meet',
    en: who
      ? `This week: talk to ${who.fullName} (${who.headline}), then ${eventLineEn}. Same people Matches ranks; same list Events shows.`
      : `This week: open Matches, then ${eventLineEn}.`,
    el: who
      ? `Αυτή την εβδομάδα: μίλα με ${who.fullName} (${who.headline}), μετά ${eventLineEl}. Τα ίδια άτομα με τις Αντιστοιχίσεις.`
      : `Αυτή την εβδομάδα: άνοιξε Αντιστοιχίσεις, μετά ${eventLineEl}.`,
    href: who ? `/profile/${who.id}` : '/matches',
    links: [
      ...(who ? [linkFor(who)] : []),
      { href: '/events', en: 'Open events', el: 'Άνοιγμα εκδηλώσεων' },
    ],
  };
}

function fitCheckResult(): AssistantResult {
  const fit = readFitCheck();
  if (!fit) {
    return {
      tool: 'fit-check',
      en: 'No fit check on this browser yet. Five questions, 60 seconds, no login. The answers write skills, looking-for, stage, commitment and hours — the same five dimensions Matches scores.',
      el: 'Δεν υπάρχει fit check σε αυτόν τον περιηγητή. Πέντε ερωτήσεις, 60″, χωρίς είσοδο. Οι απαντήσεις γράφουν τα ίδια πέντε πεδία που βαθμολογεί η Αντιστοίχιση.',
      href: '/quiz',
      links: [{ href: '/quiz', en: 'Open fit check', el: 'Άνοιγμα fit check' }],
    };
  }
  return {
    tool: 'fit-check',
    en: `Your fit check is “${fit.archetype.en}”. ${fit.why.en} Open Matches to rank people on those fields, or ask who you should meet this week.`,
    el: `Το fit check είναι «${fit.archetype.el}». ${fit.why.el} Άνοιξε Αντιστοιχίσεις ή ρώτα ποιον να γνωρίσεις αυτή την εβδομάδα.`,
    href: '/matches',
    links: [
      { href: '/quiz', en: 'Open fit check', el: 'Άνοιγμα fit check' },
      { href: '/matches', en: 'Open matches', el: 'Άνοιγμα αντιστοιχίσεων' },
    ],
  };
}

function helpResult(): AssistantResult {
  return {
    tool: 'help',
    en: `I read and write the exact same lists as every page and modal in the studio. Try: “who is my best match”, “propose three people”, “draft a need card”, “what should I do first”, “set canvas problem to …”, “set builder problem to …”, “readiness score”, “open 6-axis match”, “open deal room”, “set monthly burn to 18k”, “hide my email”, “change my headline to …”, or type /match /scout /need /next /canvas /builder /readiness /6axis /dealroom /inbox /plan /invite /round /quiz /overdue /help. Narrow people with role: location: skill: industry: stage: (Greek: ρόλος: τόπος: δεξιότητα: κλάδος: στάδιο:). Type @ to pin a person, /new to start over.`,
    el: `Διαβάζω και γράφω τις ίδιες λίστες με κάθε σελίδα και modal της πλατφόρμας. Δοκίμασε: «ποια είναι η καλύτερη αντιστοίχιση», «πρότεινε τρεις», «γράψε κάρτα ανάγκης», «τι να κάνω πρώτα», «όρισε το canvas problem σε …», «όρισε το builder problem σε …», «δείξε readiness score», «άνοιξε 6-axis match», «άνοιξε deal room», «όρισε το burn σε 18k», ή πληκτρολόγησε /match /scout /need /next /canvas /builder /readiness /6axis /dealroom /inbox /plan /help. Φίλτραρε ανθρώπους με role: location: skill: industry: stage: (ελληνικά: ρόλος: τόπος: δεξιότητα: κλάδος: στάδιο:). Πληκτρολόγησε @ για άτομο, /new για νέα συνομιλία.`,
    links: [
      { href: '/matches', en: 'Matches', el: 'Αντιστοιχίσεις' },
      { href: '/workspace', en: 'Workspace & Canvas', el: 'Χώρος Εργασίας & Canvas' },
      { href: '/founder-tools', en: 'Founder Tools & Builder', el: 'Εργαλεία Ιδρυτή & Builder' },
      { href: '/fundraising', en: 'Fundraising', el: 'Χρηματοδότηση' },
    ],
  };
}

/**
 * One pass over every area the studio keeps — profile, canvas, builder, pitch,
 * legal, needs, milestones, round — with the exact sentence that fixes each gap.
 */
export type AuditRow = { name: [string, string]; en: string; el: string; ratio: number; fix?: AssistantFollowUp; href: string };

export function studioAudit(profile: AssistantProfile | null): { score: number; rows: AuditRow[]; gaps: AuditRow[] } {
  const canvasRaw = readValue<Record<string, string>>(keys.canvas, {});
  const canvas = isDemoData() ? { ...DEMO_CANVAS_FALLBACK, ...canvasRaw } : canvasRaw;
  const canvasFilled = CANVAS_FIELDS.filter((f) => (canvas[f.key] || '').trim()).length;
  const builderInputs = readBuilderInputs();
  const builder = BUILDER_MODULES.map((m) => builderStatus(m.id, builderInputs));
  const builderFilled = builder.reduce((sum, b) => sum + b.filled, 0);
  const builderTotal = builder.reduce((sum, b) => sum + b.total, 0) || 1;
  const pitch = effectivePitch();
  const pitchDone = PITCH_SLIDES.filter((slide) => slideStatus(pitch[slide.key]) === 'complete').length;
  const legal = legalProgress();
  // The same completeness as the dashboard, the profile page and the banner (lib/profileCompleteness).
  const completeness = profileCompleteness(mergeFitIntoViewer(profile as Parameters<typeof mergeFitIntoViewer>[0]) as Parameters<typeof profileCompleteness>[0]);
  const missingEn = completeness.missing.slice(0, 2).map((field) => field.label.en.toLowerCase()).join(', ');
  const missingEl = completeness.missing.slice(0, 2).map((field) => field.label.el.toLowerCase()).join(', ');
  const openNeeds = readNeeds().filter((n) => n.status === 'open').length;
  const brief = platformBriefing(profile);
  const round = brief.round;
  const rows: AuditRow[] = [
    { name: ['Profile', 'Προφίλ'], en: `Profile ${completeness.score}%${missingEn ? ` (missing: ${missingEn})` : ''}`, el: `Προφίλ ${completeness.score}%${missingEl ? ` (λείπουν: ${missingEl})` : ''}`, ratio: completeness.score / 100, href: '/profile', fix: { en: 'What should I do first?', el: 'Τι να κάνω πρώτα;' } },
    { name: ['Lean Canvas', 'Lean Canvas'], en: `Lean Canvas ${canvasFilled}/${CANVAS_FIELDS.length}`, el: `Lean Canvas ${canvasFilled}/${CANVAS_FIELDS.length}`, ratio: canvasFilled / CANVAS_FIELDS.length, href: '/workspace', fix: { en: '/canvas', el: '/canvas' } },
    { name: ['Startup Builder', 'Startup Builder'], en: `Startup Builder ${builderFilled}/${builderTotal} answers`, el: `Startup Builder ${builderFilled}/${builderTotal} απαντήσεις`, ratio: builderFilled / builderTotal, href: '/founder-tools?step=1', fix: { en: '/builder', el: '/builder' } },
    { name: ['Pitch deck', 'Pitch deck'], en: `Pitch deck ${pitchDone}/${PITCH_SLIDES.length} slides`, el: `Pitch deck ${pitchDone}/${PITCH_SLIDES.length} διαφάνειες`, ratio: pitchDone / PITCH_SLIDES.length, href: '/founder-tools?tab=pitch', fix: { en: '/pitch', el: '/pitch' } },
    { name: ['Legal checklist', 'Νομική λίστα'], en: `Legal checklist ${legal.done}/${legal.total}`, el: `Νομική λίστα ${legal.done}/${legal.total}`, ratio: legal.done / legal.total, href: '/legal', fix: { en: '/legal', el: '/legal' } },
    { name: ['Need cards', 'Κάρτες ανάγκης'], en: `Open need cards ${openNeeds}`, el: `Ανοιχτές κάρτες ανάγκης ${openNeeds}`, ratio: openNeeds > 0 ? 1 : 0, href: NEED_HREF, fix: { en: 'Draft a need card for a co-founder', el: 'Γράψε κάρτα ανάγκης για συνιδρυτή' } },
    { name: ['Milestones', 'Ορόσημα'], en: `Overdue milestones ${brief.overdue.length}`, el: `Εκπρόθεσμα ορόσημα ${brief.overdue.length}`, ratio: brief.overdue.length === 0 ? 1 : 0, href: '/milestones', fix: { en: 'What is overdue?', el: 'Τι είναι εκπρόθεσμο;' } },
    { name: ['Fundraising', 'Χρηματοδότηση'], en: `Round ${round.targetAmount > 0 ? Math.round((round.committedAmount / round.targetAmount) * 100) : 0}% committed`, el: `Γύρος ${round.targetAmount > 0 ? Math.round((round.committedAmount / round.targetAmount) * 100) : 0}% δεσμευμένος`, ratio: round.targetAmount > 0 ? Math.min(1, round.committedAmount / round.targetAmount) : 0, href: '/fundraising', fix: { en: '/round', el: '/round' } },
  ];
  const score = Math.round((rows.reduce((sum, row) => sum + row.ratio, 0) / rows.length) * 100);
  const gaps = rows.filter((row) => row.ratio < 1).sort((a, b) => a.ratio - b.ratio);
  return { score, rows, gaps };
}

function studioAuditResult(profile: AssistantProfile | null): AssistantResult {
  const { score, rows, gaps } = studioAudit(profile);
  const mark = (ratio: number) => (ratio >= 1 ? '✓' : ratio > 0 ? '…' : '○');
  return {
    tool: 'audit',
    en: `Studio check: ${score}% complete across ${rows.length} areas — read from the same lists the pages use.\n${rows.map((row) => `${mark(row.ratio)} ${row.en}`).join('\n')}${gaps.length ? `\nWeakest first: ${gaps.slice(0, 3).map((g) => g.name[0]).join(', ')}.` : '\nEverything is in place.'}`,
    el: `Έλεγχος studio: ${score}% πληρότητα σε ${rows.length} περιοχές — από τις ίδιες λίστες με τις σελίδες.\n${rows.map((row) => `${mark(row.ratio)} ${row.el}`).join('\n')}${gaps.length ? `\nΠρώτα τα πιο αδύναμα: ${gaps.slice(0, 3).map((g) => g.name[1]).join(', ')}.` : '\nΌλα είναι στη θέση τους.'}`,
    href: '/assistant',
    links: gaps.slice(0, 3).map((g) => ({ href: g.href, en: `Open ${g.name[0]}`, el: `Άνοιγμα: ${g.name[1]}` })),
    followUps: gaps.slice(0, 3).map((g) => g.fix!).filter(Boolean),
  };
}

function emailContext(profile: AssistantProfile | null) {
  const round = readRound();
  const pct = round.targetAmount > 0 ? Math.round((round.committedAmount / round.targetAmount) * 100) : 0;
  const local = readValue<{ company?: string }>(keys.profileLocal, {});
  const demo = isDemoData();
  const dd = ddProgress();
  return {
    venture: local.company || (demo ? DEMO_VENTURE.name : ''),
    oneLiner: demo ? DEMO_VENTURE.oneLiner : profile?.headline ?? '',
    founder: profile?.fullName ?? '',
    round: round.targetAmount > 0 ? `We are raising ${round.targetAmount >= 1e6 ? `$${(round.targetAmount / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `$${Math.round(round.targetAmount / 1000)}k`} on a ${round.instrument}${round.valuationCap ? ` ($${(round.valuationCap / 1e6).toFixed(1)}M cap)` : ''}, ${pct}% committed.` : '',
    dd: `${dd.done}/${dd.total} items ready`,
  };
}

function isAuditQuery(folded: string): boolean {
  return /^\/(audit|check|health)\b/.test(folded)
    || /\b(audit|check|review)\s+(my\s+)?(studio|workspace|platform|everything)\b/.test(folded)
    || /\bstudio\s+(health|check|completeness)\b/.test(folded)
    || /\bwhat\s+is\s+(still\s+)?(incomplete|missing)\b/.test(folded)
    || /(ελεγχ|πληροτητ).{0,15}(studio|πλατφορμ|ολων)|τι λειπει απο το studio/.test(folded);
}

const CANVAS_FIELDS: { key: string; en: string; el: string; aliases: string[] }[] = [
  { key: 'problem', en: 'Problem', el: 'Πρόβλημα', aliases: ['problem', 'προβλημα', 'πρόβλημα'] },
  { key: 'solution', en: 'Solution', el: 'Λύση', aliases: ['solution', 'λυση', 'λύση'] },
  { key: 'keyMetrics', en: 'Key Metrics', el: 'Βασικές Μετρικές', aliases: ['key metrics', 'metrics', 'keymetrics', 'μετρικες', 'μετρικές'] },
  { key: 'uvp', en: 'Unique Value Prop', el: 'Μοναδική Πρόταση Αξίας', aliases: ['uvp', 'value prop', 'unique value', 'προταση αξιας', 'πρόταση αξίας'] },
  { key: 'advantage', en: 'Unfair Advantage', el: 'Αθέμιτο Πλεονέκτημα', aliases: ['unfair advantage', 'advantage', 'πλεονεκτημα', 'πλεονέκτημα'] },
];

const DEMO_CANVAS_FALLBACK: Record<string, string> = { ...DEMO_CANVAS };

const cleanText = (v: string) => v.trim().replace(/^[“"«']+|[”"»'.]+$/g, '').trim();

function canvasResult(query: string, propose: boolean): AssistantResult {
  const current = readValue<Record<string, string>>(keys.canvas, {});
  const effective: Record<string, string> = isDemoData() ? { ...DEMO_CANVAS_FALLBACK, ...current } : current;
  const links: AssistantLink[] = [{ href: '/workspace', en: 'Open Workspace Canvas', el: 'Άνοιγμα Lean Canvas' }];

  const writeMatch = query.match(/(?:set|update|change|write|fill|ορισε|όρισε|αλλαξε|άλλαξε|γραψε|γράψε)\s+(?:the\s+)?(?:lean\s+)?(?:canvas\s+)?(problem|solution|key\s*metrics|metrics|uvp|value\s*prop|unfair\s*advantage|advantage|προβλημα|πρόβλημα|λυση|λύση|μετρικες|μετρικές|προταση\s*αξιας|πρόταση\s*αξίας|πλεονεκτημα|πλεονέκτημα)\s*(?:to|as|in|σε|:|=)\s+(.+)$/i)
    || query.match(/^(?:\/canvas\s+)?(problem|solution|keymetrics|metrics|uvp|advantage|προβλημα|λυση|μετρικες|πλεονεκτημα)\s*[:=]\s*(.+)$/i);

  if (writeMatch) {
    const rawField = fold(writeMatch[1] || '');
    const nextVal = cleanText(writeMatch[2] || '');
    const target = CANVAS_FIELDS.find((f) => f.aliases.some((a) => rawField.includes(fold(a))));
    if (target && nextVal) {
      const before = { ...current };
      let logged: LoggedWrite | null = null;
      const apply = (): AssistantResult => {
        writeValue(keys.canvas, { ...before, [target.key]: nextVal });
        logged = { kind: 'milestone', title: `Updated Lean Canvas · ${target.en}`, titleEl: `Ενημερώθηκε το Lean Canvas · ${target.el}`, href: '/workspace' };
        logActivity({ ...logged, byAssistant: true });
        return {
          tool: 'canvas',
          en: `Updated Lean Canvas → ${target.en} to “${nextVal}”. Open Workspace → Canvas to inspect or edit all 5 sections.`,
          el: `Ενημερώθηκε το Lean Canvas → ${target.el} σε «${nextVal}». Άνοιξε Χώρος Εργασίας → Canvas για όλες τις 5 ενότητες.`,
          href: '/workspace',
          links,
        };
      };
      if (!propose) return apply();
      return proposalResult(
        {
          summary: {
            en: `Set Lean Canvas → ${target.en} to “${nextVal}”?`,
            el: `Ορισμός Lean Canvas → ${target.el} σε «${nextVal}»;`,
          },
          reversal: 'full',
          apply,
          undo: () => {
            writeValue(keys.canvas, before);
            logUndo(logged);
          },
        },
        { tool: 'canvas', href: '/workspace', links },
      );
    }
  }

  const filledCount = CANVAS_FIELDS.filter((f) => (effective[f.key] || '').trim().length > 0).length;
  const summaryEn = CANVAS_FIELDS.map((f) => `${f.en}: ${(effective[f.key] || 'empty').trim()}`).join(' · ');
  const summaryEl = CANVAS_FIELDS.map((f) => `${f.el}: ${(effective[f.key] || 'κενό').trim()}`).join(' · ');
  return {
    tool: 'canvas',
    en: `Lean Canvas (${filledCount}/5 sections filled on Workspace → Canvas): ${summaryEn}. To update a section right from chat, say “set canvas problem to …” or “set canvas uvp to …”.`,
    el: `Lean Canvas (${filledCount}/5 ενότητες συμπληρωμένες στο Χώρος Εργασίας → Canvas): ${summaryEl}. Για ενημέρωση από το chat, πες «όρισε το canvas problem σε …» ή «/canvas uvp: …».`,
    href: '/workspace',
    links,
  };
}

function builderResult(query: string, propose: boolean): AssistantResult {
  const inputs = readBuilderInputs();
  const rawStored = readValue<Record<string, string>>(keys.builderInputs, {});
  const links: AssistantLink[] = [
    { href: '/founder-tools?step=1', en: 'Open Startup Builder', el: 'Άνοιγμα Startup Builder' },
    { href: '/workspace', en: 'Open Workspace Builder', el: 'Άνοιγμα Builder στον Χώρο Εργασίας' },
  ];

  const writeMatch = query.match(/(?:set|update|fill|write|ορισε|όρισε|συμπληρωσε|συμπλήρωσε|γραψε|γράψε)\s+(?:the\s+)?(?:startup\s+)?(?:builder\s+)?(problem|solution|market|business\s*model|model|gtm|go-to-market|module\s*[1-5]|προβλημα|πρόβλημα|λυση|λύση|αγορα|αγορά|μοντελο|μοντέλο|στρατηγικη)\s*(?:to|as|in|σε|:|=)\s+(.+)$/i)
    || query.match(/^(?:\/builder\s+)?(problem|solution|market|model|gtm|[1-5])\s*[:=]\s*(.+)$/i);

  if (writeMatch) {
    const token = fold(writeMatch[1] || '');
    const value = cleanText(writeMatch[2] || '');
    const modId =
      /1|problem|προβλημ/.test(token) ? 1 :
      /2|solution|λυσ/.test(token) ? 2 :
      /3|market|αγορ/.test(token) ? 3 :
      /4|model|μοντελ/.test(token) ? 4 :
      /5|gtm|go-to-market|στρατηγικ/.test(token) ? 5 : 0;
    const mod = BUILDER_MODULES.find((m) => m.id === modId);
    if (mod && value) {
      const before = { ...rawStored };
      let logged: LoggedWrite | null = null;
      const apply = (): AssistantResult => {
        writeValue(keys.builderInputs, { ...before, [`${mod.id}-0`]: value });
        logged = { kind: 'milestone', title: `Updated Builder · ${mod.title}`, titleEl: `Ενημερώθηκε το Builder · ${mod.titleEl}`, href: `/founder-tools?step=${mod.id}` };
        logActivity({ ...logged, byAssistant: true });
        return {
          tool: 'builder',
          en: `Saved to Startup Builder → ${mod.title}: “${value}”. Same field Founder Tools → Builder and Workspace → Builder read.`,
          el: `Αποθηκεύτηκε στο Startup Builder → ${mod.titleEl}: «${value}». Το ίδιο πεδίο που διαβάζουν τα Εργαλεία Ιδρυτή και ο Χώρος Εργασίας.`,
          href: `/founder-tools?step=${mod.id}`,
          links,
        };
      };
      if (!propose) return apply();
      return proposalResult(
        {
          summary: {
            en: `Save “${value}” to Startup Builder → ${mod.title}?`,
            el: `Αποθήκευση «${value}» στο Startup Builder → ${mod.titleEl};`,
          },
          reversal: 'full',
          apply,
          undo: () => {
            writeValue(keys.builderInputs, before);
            logUndo(logged);
          },
        },
        { tool: 'builder', href: `/founder-tools?step=${mod.id}`, links },
      );
    }
  }

  const statuses = BUILDER_MODULES.map((m) => {
    const st = builderStatus(m.id, inputs);
    return { ...m, ...st };
  });
  const completed = statuses.filter((s) => s.status === 'Completed').length;
  const inProgress = statuses.filter((s) => s.status === 'In-Progress').length;
  const listEn = statuses.map((s) => `${s.id}. ${s.title} (${s.filled}/${s.total})`).join(', ');
  const listEl = statuses.map((s) => `${s.id}. ${s.titleEl} (${s.filled}/${s.total})`).join(', ');

  return {
    tool: 'builder',
    en: `Startup Builder has ${completed} completed and ${inProgress} in-progress modules: ${listEn}. Say “set builder problem to …” or “/builder market: …” to write directly into any module.`,
    el: `Το Startup Builder έχει ${completed} ολοκληρωμένες και ${inProgress} σε εξέλιξη ενότητες: ${listEl}. Πες «όρισε το builder problem σε …» ή «/builder market: …» για απευθείας εγγραφή.`,
    href: '/founder-tools?step=1',
    links,
  };
}

/**
 * How complete the profile is — the one measure (lib/profileCompleteness) the
 * dashboard card, the profile page, Settings and the banner show — with the
 * fields that add the most first, and the next steps the assistant can do.
 */
function completenessResult(profile: AssistantProfile | null): AssistantResult {
  const { score, missing } = profileCompleteness(mergeFitIntoViewer(profile as Parameters<typeof mergeFitIntoViewer>[0]) as Parameters<typeof profileCompleteness>[0]);
  const top = missing.slice(0, 3);
  const links: AssistantLink[] = [{ href: '/profile', en: 'Open your profile', el: 'Άνοιγμα προφίλ' }];
  if (top.some((field) => field.href === '/settings')) links.push({ href: '/settings', en: 'Open Settings (links)', el: 'Άνοιγμα Ρυθμίσεων (σύνδεσμοι)' });
  const followUps: AssistantFollowUp[] = [];
  // The fit check fills what matching reads (skills, looking-for, stage, commitment).
  if (top.some((field) => ['skills', 'lookingFor', 'stage', 'commitment'].includes(field.key))) followUps.push({ en: 'What is my fit check?', el: 'Ποιο είναι το fit check μου;' });
  if (top.some((field) => field.key === 'skills' || field.key === 'lookingFor')) followUps.push({ en: 'What does my founding team still lack?', el: 'Τι λείπει ακόμη από την ιδρυτική ομάδα;' });
  if (score >= 100) {
    return {
      tool: 'profile-completeness',
      en: 'Your profile is complete (100%) — matching reads every field it uses.',
      el: 'Το προφίλ σου είναι πλήρες (100%) — η αντιστοίχιση διαβάζει όλα τα πεδία που χρησιμοποιεί.',
      href: '/profile',
      links,
    };
  }
  const listEn = top.map((field) => `${field.label.en.toLowerCase()} (+${field.weight})`).join(', ');
  const listEl = top.map((field) => `${field.label.el.toLowerCase()} (+${field.weight})`).join(', ');
  return {
    tool: 'profile-completeness',
    en: `Your profile is ${score}% complete. Add ${listEn} first — the same measure the dashboard, your profile page and the bar at the top show. Matching reads skills, looking-for, industry, stage, commitment and location; you can say “set my location to …” or “add the skill …”.`,
    el: `Το προφίλ σου είναι ${score}% πλήρες. Πρόσθεσε πρώτα ${listEl} — η ίδια μέτρηση με τον πίνακα ελέγχου, τη σελίδα προφίλ και τη μπάρα στην κορυφή. Η αντιστοίχιση διαβάζει δεξιότητες, τι ψάχνεις, κλάδο, στάδιο, δέσμευση και τοποθεσία· μπορείς να πεις «όρισε την τοποθεσία μου σε …» ή «πρόσθεσε τη δεξιότητα …».`,
    href: top[0]?.href ?? '/profile',
    links,
    ...(followUps.length ? { followUps } : {}),
    sources: [{ kind: 'profile', en: 'Profile completeness', el: 'Πληρότητα προφίλ', href: '/profile' }],
  };
}

function readinessResult(query: string, propose: boolean, profile: AssistantProfile | null = null): AssistantResult {
  const saved = startupRecord.read();
  const name = ventureName() || 'Your Venture';
  const { oneLiner } = ventureSummary();
  // The same index Founder Tools and Insights show (lib/readiness).
  const readiness = currentReadiness(isDemoData() ? undefined : profile?.skills);
  const score = readiness.score;
  const dimensionLine = (lang: 'en' | 'el') =>
    readiness.dimensions.map((dim) => `${dim.label[lang]} ${dim.score == null ? (lang === 'el' ? 'χωρίς στοιχεία' : 'no data') : dim.score}`).join(' · ');
  const links: AssistantLink[] = [
    { href: '/founder-tools', en: 'Open Founder Tools & Readiness', el: 'Άνοιγμα Εργαλείων Ιδρυτή & Ετοιμότητας' },
    { href: '/insights', en: 'Open Insights', el: 'Άνοιγμα Στατιστικών' },
  ];

  const nameMatch = query.match(/(?:set|change|update|ορισε|όρισε|αλλαξε|άλλαξε)\s+(?:my\s+)?(?:startup|venture)\s+(?:name|ονομα|όνομα)\s+(?:to|σε)\s+(.+)$/i)
    // Greek word order: «όρισε (το) όνομα (του) startup σε …».
    ?? query.match(/(?:ορισε|όρισε|αλλαξε|άλλαξε)\s+(?:το\s+)?(?:ονομα|όνομα)\s+(?:του\s+|της\s+)?(?:startup|venture|εταιρειας|εταιρείας)\s+σε\s+(.+)$/i);
  const linerMatch = query.match(/(?:set|change|update|ορισε|όρισε|αλλαξε|άλλαξε)\s+(?:my\s+)?(?:startup\s+|venture\s+)?(?:one-?liner|pitch\s+line)\s+(?:to|σε)\s+(.+)$/i);
  if (nameMatch || linerMatch) {
    const field = nameMatch ? 'name' : 'oneLiner';
    const nextVal = cleanText((nameMatch?.[1] ?? linerMatch?.[1]) || '');
    if (nextVal) {
      const before = { ...saved };
      let logged: LoggedWrite | null = null;
      const apply = (): AssistantResult => {
        startupRecord.write({ ...before, [field]: nextVal, updatedAt: new Date().toISOString() });
        logged = { kind: 'profile', title: `Updated venture ${field === 'name' ? 'name' : 'one-liner'}`, titleEl: `Ενημερώθηκε το ${field === 'name' ? 'όνομα' : 'one-liner'} του venture`, href: '/founder-tools' };
        logActivity({ ...logged, byAssistant: true });
        return {
          tool: 'readiness',
          en: `Updated venture ${field === 'name' ? 'name' : 'one-liner'} to “${nextVal}” on Founder Tools.`,
          el: `Ενημερώθηκε το ${field === 'name' ? 'όνομα' : 'one-liner'} του venture σε «${nextVal}» στα Εργαλεία Ιδρυτή.`,
          href: '/founder-tools',
          links,
        };
      };
      if (!propose) return apply();
      return proposalResult(
        {
          summary: {
            en: `Set venture ${field === 'name' ? 'name' : 'one-liner'} to “${nextVal}”?`,
            el: `Ορισμός ${field === 'name' ? 'ονόματος' : 'one-liner'} venture σε «${nextVal}»;`,
          },
          reversal: 'full',
          apply,
          undo: () => {
            startupRecord.write(before);
            logUndo(logged);
          },
        },
        { tool: 'readiness', href: '/founder-tools', links },
      );
    }
  }

  return {
    tool: 'readiness',
    en: `${name}${oneLiner ? ` — “${oneLiner}”` : ''} has a Startup Readiness Index of ${score}/100, based on ${readiness.known} of 5 dimensions (${dimensionLine('en')}).${readiness.weakest ? ` Weakest: ${readiness.weakest.label.en} — ${readiness.weakest.next.en}` : ''} Open Founder Tools to run the 5-step diagnostic or say “set startup name to …”.`,
    el: `Το ${name}${oneLiner ? ` — «${oneLiner}»` : ''} έχει Δείκτη Ετοιμότητας ${score}/100, με βάση ${readiness.known} από 5 διαστάσεις (${dimensionLine('el')}).${readiness.weakest ? ` Πιο αδύναμη: ${readiness.weakest.label.el} — ${readiness.weakest.next.el}` : ''} Άνοιξε τα Εργαλεία Ιδρυτή για το διαγνωστικό 5 βημάτων ή πες «όρισε το startup name σε …».`,
    href: '/founder-tools',
    links,
  };
}

function studioModalResult(kind: '6axis' | 'dealroom' | 'needwall', query = '', profile?: AssistantProfile | null): AssistantResult {
  const ui = useUIStore.getState();
  if (kind === '6axis') {
    const person = query ? namedPerson(query) : undefined;
    const targetId = person ? person.id : 'fp-1';
    ui.setMatchBreakdownModalOpen(true, targetId);
    if (person) {
      const fit = compatibility(fromProfile(profile ?? null), fromCast(person));
      const scoreText = fit.score != null ? ` (${fit.score}% compatibility)` : '';
      const scoreTextEl = fit.score != null ? ` (${fit.score}% συμβατότητα)` : '';
      return {
        tool: 'studio-modal',
        en: `Opened the 6-Axis Match Breakdown modal for ${person.fullName}${scoreText} — inspecting Role Complementarity, Skills Synergy, Stage, Commitment, Location, and Verification.`,
        el: `Άνοιξε το modal Ανάλυσης Συμβατότητας 6 Αξόνων για ${person.fullName}${scoreTextEl} — έλεγχος Συμπληρωματικότητας Ρόλου, Δεξιοτήτων, Σταδίου, Δέσμευσης, Τοποθεσίας & Επαλήθευσης.`,
        href: `/profile/${person.id}`,
        links: [
          { href: `/profile/${person.id}`, en: `Open ${person.fullName}`, el: `Άνοιγμα ${person.fullName}` },
          { href: '/matches', en: 'Open Matches', el: 'Άνοιγμα Αντιστοιχίσεων' },
        ],
      };
    }
    return {
      tool: 'studio-modal',
      en: 'Opened the 6-Axis Match Breakdown modal (Skills, Stage, Industry, Commitment, Workstyle, Values Radar + Risk Flags & Icebreaker Prompts). You can also say “/6axis Sarah Chen” for any founder.',
      el: 'Άνοιξε το modal Ανάλυσης Συμβατότητας 6 Αξόνων (Δεξιότητες, Στάδιο, Κλάδος, Δέσμευση, Τρόπος Εργασίας, Αξίες + Risk Flags & Icebreakers). Μπορείς επίσης να πεις «/6axis Sarah Chen» για κάθε ιδρυτή.',
      href: '/matches',
      links: [{ href: '/matches', en: 'Open Matches', el: 'Άνοιγμα Αντιστοιχίσεων' }],
    };
  }
  if (kind === 'dealroom') {
    const folded = fold(query);
    const startupId = hasStem(folded, 'create', 'new', 'launch', 'νεα', 'δημιουργ')
      ? 'create'
      : hasStem(folded, 'browse', 'other', 'others', 'startups', 'all', 'αλλες', 'ολες')
        ? 'sv-1'
        : 'sv-my-venture';
    ui.setDealRoomModalOpen(true, startupId);
    return {
      tool: 'studio-modal',
      en: startupId === 'create'
        ? 'Opened the Startup Deal Room modal in Create Venture mode.'
        : 'Opened the Startup Deal Room & Pitch Deck modal (Overview, Pitch Deck Slides, Traction KPIs, Open Roles, and Investor Commit — synchronized with your Venture & Fundraising Round).',
      el: startupId === 'create'
        ? 'Άνοιξε το modal Startup Deal Room σε λειτουργία Δημιουργίας Νέας Startup.'
        : 'Άνοιξε το modal Startup Deal Room & Pitch Deck (Επισκόπηση, Διαφάνειες Pitch Deck, Μετρικές Traction, Ανοιχτοί Ρόλοι & Επενδυτικό Ενδιαφέρον — συγχρονισμένο με το Venture & τον Γύρο Χρηματοδότησης).',
      href: '/fundraising',
      links: [{ href: '/fundraising', en: 'Open Fundraising', el: 'Άνοιγμα Χρηματοδότησης' }],
    };
  }
  ui.setNeedWallModalOpen(true);
  return {
    tool: 'studio-modal',
    en: 'Opened the Startup Role Need Cards Wall modal (synchronized live with your /need cards and Network).',
    el: 'Άνοιξε το modal Πίνακα Αναγκών & Ρόλων Startup (συγχρονισμένο σε πραγματικό χρόνο με τις κάρτες /need και το Δίκτυο).',
    href: '/network?tab=needs',
    links: [{ href: '/network?tab=needs', en: 'Open Need Cards', el: 'Άνοιγμα Καρτών Ανάγκης' }],
  };
}

function styleResult(query: string, propose: boolean): AssistantResult {
  const folded = fold(query);
  const before = readAssistantPrefs();
  const patch: Partial<AssistantPrefs> = {};
  if (/\b(short|shorter|brief|συντομ)/.test(folded)) patch.length = 'short';
  else if (/\b(detailed|longer|thorough|αναλυτικ)/.test(folded)) patch.length = 'detailed';
  else if (/\b(balanced|normal|ισορροπ)/.test(folded)) patch.length = 'balanced';
  if (/\b(direct|plain|αμεσ)/.test(folded)) patch.tone = 'direct';
  else if (/\b(formal|επισημ)/.test(folded)) patch.tone = 'formal';
  else if (/\b(friendly|warm|φιλικ)/.test(folded)) patch.tone = 'friendly';
  if (/emoji\s*(on|yes|ναι)|with emoji|με emoji/.test(folded)) patch.emoji = true;
  else if (/emoji\s*(off|no|οχι)|no emoji|χωρις emoji/.test(folded)) patch.emoji = false;
  const links: AssistantLink[] = [{ href: '/settings', en: 'Open Settings', el: 'Άνοιγμα Ρυθμίσεων' }];
  const describe = (p: AssistantPrefs) => `${p.length} · ${p.tone} · emoji ${p.emoji ? 'on' : 'off'}`;
  if (Object.keys(patch).length === 0) {
    return {
      tool: 'settings-set',
      en: `I reply ${describe(before)}. Change it with “/style short”, “/style detailed formal” or “/style emoji on” — or in Settings → Assistant replies.`,
      el: `Απαντώ ${describe(before)}. Άλλαξέ το με «/style short», «/style detailed formal» ή «/style emoji on» — ή στις Ρυθμίσεις → Απαντήσεις βοηθού.`,
      href: '/settings',
      links,
    };
  }
  const next = { ...before, ...patch };
  const apply = (): AssistantResult => {
    writeAssistantPrefs(patch);
    logActivity({ kind: 'profile', title: `Assistant replies: ${describe(next)}`, titleEl: `Απαντήσεις βοηθού: ${describe(next)}`, href: '/settings', byAssistant: true });
    return {
      tool: 'settings-set',
      en: `From now on I reply ${describe(next)}. Same setting as Settings → Assistant replies.`,
      el: `Από τώρα απαντώ ${describe(next)}. Ίδια ρύθμιση με Ρυθμίσεις → Απαντήσεις βοηθού.`,
      href: '/settings',
      links,
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `Reply ${describe(next)} from now on?`, el: `Να απαντώ ${describe(next)} από τώρα;` },
      reversal: 'full',
      apply,
      undo: () => { writeAssistantPrefs(before); },
    },
    { tool: 'settings-set', href: '/settings', links },
  );
}

function resolvePageArg(query: string): string | undefined {
  const folded = fold(query).replace(/^\/+|\/+$/g, '').trim();
  if (!folded) return undefined;
  return NAV_PATHS.find((path) => {
    const stem = path.slice(1);
    const label = navLabel(path);
    return folded === stem || folded === fold(label.en) || folded === fold(label.el ?? '')
      || stem.endsWith(`/${folded}`) || stem.split('/').pop() === folded;
  });
}

function coachResult(propose: boolean): AssistantResult {
  const top = topPages(6);
  const ux = readUxPrefs();
  const links: AssistantLink[] = [{ href: '/dashboard', en: 'Open dashboard', el: 'Άνοιγμα πίνακα' }];
  const unpinned = top.filter((row) => row.path !== '/' && !ux.favorites.includes(row.path) && !['/dashboard', '/messages'].includes(row.path));
  if (top.length === 0) {
    return {
      tool: 'coach',
      en: 'I haven’t seen enough of how you use the app yet to coach you. Browse a few pages — after a couple of visits I can suggest shortcuts, pins and a home page based on where you actually spend time.',
      el: 'Δεν έχω δει ακόμα αρκετή χρήση για να προτείνω βελτιώσεις. Περίηγήσου λίγο — μετά από μερικές επισκέψεις μπορώ να προτείνω συντομεύσεις, καρφιτσώματα και αρχική σελίδα με βάση το πού περνάς πραγματικά χρόνο.',
      href: '/dashboard',
      links,
    };
  }
  const unseen = unvisited(NAV_PATHS).slice(0, 3);
  const unseenLine = unseen.length
    ? ` Not visited yet: ${unseen.map((path) => navLabel(path).en).join(', ')} — worth a look if relevant.`
    : '';
  const lines = [
    `Most visited: ${top.map((row) => `${navLabel(row.path).en} ×${row.count}`).join(', ')}.`,
    ux.favorites.length ? `Pinned: ${ux.favorites.map((path) => navLabel(path).en).join(', ')}.` : 'Nothing pinned yet.',
    ux.homePath ? `Home page: ${navLabel(ux.homePath).en}.` : 'Home page: landing (say “/home matches” to change it).',
  ];
  if (unpinned.length === 0) {
    return {
      tool: 'coach',
      en: `${lines.join(' ')}${unseenLine} Your frequent pages are already reachable — say “/pin <page>” or “/home <page>” to adjust.`,
      el: `${lines.join(' ')}${unseenLine} Οι συχνές σελίδες σου είναι ήδη προσβάσιμες — πες «/pin <σελίδα>» ή «/home <σελίδα>» για προσαρμογή.`,
      href: '/dashboard',
      links,
    };
  }
  const toPin = unpinned.slice(0, 2).map((row) => row.path);
  const names = toPin.map((path) => navLabel(path).en).join(' & ');
  const apply = (): AssistantResult => {
    toPin.forEach((path) => pinFavorite(path));
    logActivity({ kind: 'profile', title: `Pinned ${names}`, titleEl: `Καρφίτσωσα ${names}`, href: toPin[0], byAssistant: true });
    return {
      tool: 'coach',
      en: `Pinned ${names} to the top of your sidebar. Unpin anytime from the sidebar (the pin-off button on the pinned page) or with “/unpin”.`,
      el: `Καρφίτσωσα ${names} στην κορυφή του μενού. Ξεκαρφίτσωσε από το πλαϊνό μενού (κουμπί ξεκαρφιτσώματος στη σελίδα) ή με «/unpin».`,
      href: toPin[0],
      links,
    };
  };
  if (!propose) return apply();
  const before = [...ux.favorites];
  return proposalResult(
    {
      summary: { en: `You visit ${names} often — pin them to your sidebar?`, el: `Επισκέπτεσαι συχνά ${names} — να τα καρφιτσώσω στο μενού;` },
      reversal: 'full',
      apply,
      undo: () => { writeUxPrefs({ favorites: before }); },
    },
    { tool: 'coach', href: '/dashboard', links },
  );
}

function pinResult(query: string, propose: boolean): AssistantResult {
  const ux = readUxPrefs();
  if (!query.trim()) {
    return {
      tool: 'pin',
      en: ux.favorites.length
        ? `Pinned pages: ${ux.favorites.map((path) => navLabel(path).en).join(', ')}. Pin another with “/pin matches”.`
        : 'Nothing pinned yet. Say “/pin matches” (any page name works).',
      el: ux.favorites.length
        ? `Καρφιτσωμένες: ${ux.favorites.map((path) => navLabel(path).el).join(', ')}. Καρφίτσωσε άλλη με «/pin matches».`
        : 'Τίποτα καρφιτσωμένο. Πες «/pin matches» (λειτουργεί με κάθε σελίδα).',
      links: [],
    };
  }
  const path = resolvePageArg(query);
  if (!path) {
    return {
      tool: 'pin',
      en: `I don’t know a page called “${query.trim()}”. Try “/pin matches”, “/pin events”, “/pin fundraising”…`,
      el: `Δεν ξέρω σελίδα «${query.trim()}». Δοκίμασε «/pin matches», «/pin events», «/pin fundraising»…`,
      links: [],
    };
  }
  const label = navLabel(path);
  const pageLink: AssistantLink[] = [{ href: path, en: `Open ${label.en}`, el: `Άνοιγμα ${label.el}` }];
  if (ux.favorites.includes(path)) {
    return { tool: 'pin', en: `${label.en} is already pinned.`, el: `${label.el} είναι ήδη καρφιτσωμένη.`, href: path, links: pageLink };
  }
  const apply = (): AssistantResult => {
    pinFavorite(path);
    logActivity({ kind: 'profile', title: `Pinned ${label.en}`, titleEl: `Καρφίτσωσα ${label.el}`, href: path, byAssistant: true });
    return {
      tool: 'pin',
      en: `Pinned ${label.en} — it now sits at the top of your sidebar.`,
      el: `Καρφίτσωσα ${label.el} — βρίσκεται τώρα στην κορυφή του μενού.`,
      href: path,
      links: pageLink,
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `Pin ${label.en} to your sidebar?`, el: `Καρφίτσωμα ${label.el} στο μενού;` },
      reversal: 'full',
      apply,
      undo: () => { writeUxPrefs({ favorites: ux.favorites }); },
    },
    { tool: 'pin', href: path, links: pageLink },
  );
}

function unpinResult(query: string, propose: boolean): AssistantResult {
  const ux = readUxPrefs();
  const path = resolvePageArg(query);
  if (!path || !ux.favorites.includes(path)) {
    return {
      tool: 'pin',
      en: path ? `${navLabel(path).en} isn’t pinned.` : `Nothing pinned called “${query.trim()}”.`,
      el: path ? `${navLabel(path).el} δεν είναι καρφιτσωμένη.` : `Τίποτα καρφιτσωμένο ως «${query.trim()}».`,
      links: [],
    };
  }
  const label = navLabel(path);
  const apply = (): AssistantResult => {
    writeUxPrefs({ favorites: ux.favorites.filter((f) => f !== path) });
    return {
      tool: 'pin',
      en: `Unpinned ${label.en}.`,
      el: `Ξεκαρφίτσωσα ${label.el}.`,
      links: [],
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `Unpin ${label.en} from your sidebar?`, el: `Ξεκαρφίτσωμα ${label.el} από το μενού;` },
      reversal: 'full',
      apply,
      undo: () => { writeUxPrefs({ favorites: ux.favorites }); },
    },
    { tool: 'pin', links: [] },
  );
}

function homeResult(query: string, propose: boolean): AssistantResult {
  const ux = readUxPrefs();
  const folded = fold(query).trim();
  if (!folded) {
    return {
      tool: 'home',
      en: ux.homePath ? `You land on ${navLabel(ux.homePath).en}. Change with “/home matches”, clear with “/home off”.` : 'You land on the dashboard by default. Say “/home matches” to land somewhere else.',
      el: ux.homePath ? `Προσγειώνεσαι σε ${navLabel(ux.homePath).el}. Άλλαξε με «/home matches», καθάρισε με «/home off».` : 'Προσγειώνεσαι στον πίνακα. Πες «/home matches» για αλλαγή.',
      links: ux.homePath ? [{ href: ux.homePath, en: 'Open your home', el: 'Άνοιγμα της αρχικής σου' }] : [],
    };
  }
  const next = hasStem(folded, 'off', 'none', 'clear', 'default', 'κανενα', 'καθαρισε') ? null : resolvePageArg(folded);
  if (next === undefined) {
    return {
      tool: 'home',
      en: `I don’t know a page called “${query.trim()}”. Try “/home matches” or “/home off”.`,
      el: `Δεν ξέρω σελίδα «${query.trim()}». Δοκίμασε «/home matches» ή «/home off».`,
      links: [],
    };
  }
  const label = next ? navLabel(next) : { en: 'the dashboard', el: 'ο πίνακας' };
  const apply = (): AssistantResult => {
    writeUxPrefs({ homePath: next });
    return {
      tool: 'home',
      en: `Done — “/” now takes you to ${label.en}.`,
      el: `Έγινε — το «/» σε πηγαίνει πλέον σε ${label.el}.`,
      href: next || '/dashboard',
      links: next ? [{ href: next, en: `Open ${label.en}`, el: `Άνοιγμα ${label.el}` }] : [],
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `Land on ${label.en} when you open “/”?`, el: `Να προσγειώνεσαι σε ${label.el} όταν ανοίγεις «/»;` },
      reversal: 'full',
      apply,
      undo: () => { writeUxPrefs({ homePath: ux.homePath }); },
    },
    { tool: 'home', href: next || '/dashboard', links: next ? [{ href: next, en: `Open ${label.en}`, el: `Άνοιγμα ${label.el}` }] : [] },
  );
}

function themeResult(query: string): AssistantResult {
  const folded = fold(query);
  const ui = useUIStore.getState();
  const nextTheme: PaletteTheme =
    hasStem(folded, 'dark', 'obsidian', 'σκοτειν') ? 'dark' :
    hasStem(folded, 'cyan', 'pulse', 'κυαν') ? 'cyan' :
    hasStem(folded, 'mint', 'catalyst', 'μεντ', 'πρασιν') ? 'mint' :
    hasStem(folded, 'apricot', 'warmth', 'βερικοκ', 'πορτοκαλ') ? 'apricot' :
    hasStem(folded, 'lilac', 'vision', 'λιλα', 'μωβ') ? 'lilac' :
    hasStem(folded, 'burgundy', 'wine', 'velvet', 'maroon', 'μπορντ', 'κρασι') ? 'burgundy' : 'stone';
  ui.setPaletteTheme(nextTheme);
  const labelMap: Record<PaletteTheme, string> = {
    stone: 'Comfort Stone',
    dark: 'Dark Obsidian',
    cyan: 'Cyan Pulse',
    mint: 'Mint Catalyst',
    apricot: 'Apricot Warmth',
    lilac: 'Lilac Vision',
    burgundy: 'Burgundy Velvet',
  };
  return {
    tool: 'settings-set',
    en: `Switched platform theme palette to ${labelMap[nextTheme]}. Available themes: stone, dark, cyan, mint, apricot, lilac, burgundy.`,
    el: `Η χρωματική παλέτα της πλατφόρμας άλλαξε σε ${labelMap[nextTheme]}. Διαθέσιμα θέματα: stone, dark, cyan, mint, apricot, lilac, burgundy.`,
    href: '/settings',
    links: [{ href: '/settings', en: 'Open Settings', el: 'Άνοιγμα Ρυθμίσεων' }],
  };
}

function langResult(query: string): AssistantResult {
  const folded = fold(query);
  const next = hasStem(folded, 'el', 'greek', 'ελληνικ', 'gr') ? 'el' : 'en';
  setGlobalLang(next);
  return {
    tool: 'settings-set',
    en: next === 'el' ? 'Switched interface language to Greek (Ελληνικά).' : 'Switched interface language to English.',
    el: next === 'el' ? 'Η γλώσσα της εφαρμογής άλλαξε σε Ελληνικά.' : 'Η γλώσσα της εφαρμογής άλλαξε σε Αγγλικά (English).',
    href: '/settings',
    links: [{ href: '/settings', en: 'Open Settings', el: 'Άνοιγμα Ρυθμίσεων' }],
  };
}

function tasksListOrAddResult(query: string, propose: boolean): AssistantResult {
  const cleaned = query.replace(/^\/tasks?\b\s*/i, '').trim();
  if (cleaned && !/^(list|show|what|ποιες|δειξε|δείξε)$/i.test(cleaned)) {
    return addTaskResult(`add task ${cleaned}`, propose);
  }
  const tasks = readTasks();
  const links: AssistantLink[] = [{ href: '/workspace', en: 'Open Workspace Tasks', el: 'Άνοιγμα Εργασιών στον Χώρο Εργασίας' }];
  if (tasks.length === 0) {
    return {
      tool: 'task-add',
      en: 'No custom workspace tasks added yet. Say “/tasks Prepare investor deck” or “add task …” to add one to Workspace.',
      el: 'Δεν έχουν προστεθεί εργασίες ακόμη. Πες «/tasks Ετοιμασία investor deck» ή «add task …» για προσθήκη στον Χώρο Εργασίας.',
      href: '/workspace',
      links,
    };
  }
  const summary = tasks.slice(0, 6).map((tItem) => `• ${tItem.title} (${tItem.priority})`).join('\n');
  return {
    tool: 'task-add',
    en: `Workspace Tasks (${tasks.length}):\n${summary}\nTo add another task, say “/tasks <title>” or “add task <title>”.`,
    el: `Εργασίες Χώρου Εργασίας (${tasks.length}):\n${summary}\nΓια προσθήκη νέας εργασίας, πες «/tasks <τίτλος>» ή «add task <τίτλος>».`,
    href: '/workspace',
    links,
  };
}

function directMessageResult(query: string, propose: boolean): AssistantResult {
  const cleaned = query.replace(/^\/msg\b\s*/i, '').trim();
  const colonIdx = cleaned.indexOf(':');
  const personPart = colonIdx > 0 ? cleaned.slice(0, colonIdx).trim() : cleaned;
  const bodyPart = colonIdx > 0 ? cleanText(cleaned.slice(colonIdx + 1)) : '';
  const person = namedPerson(personPart) || namedPerson(query);
  if (!person) {
    return {
      tool: 'inbox',
      en: 'Specify a member and message, for example: “/msg Sarah Chen: Let’s review your FinTech MVP this week.”',
      el: 'Όρισε μέλος και μήνυμα, π.χ.: «/msg Sarah Chen: Ας δούμε το FinTech MVP σου αυτή την εβδομάδα.»',
      href: '/messages',
      links: [{ href: '/messages', en: 'Open Messages', el: 'Άνοιγμα Μηνυμάτων' }],
    };
  }
  const messageBody = bodyPart || `Hi ${person.fullName.split(' ')[0]}, I saw our compatibility on CoFounderBay and would love to connect!`;
  const links: AssistantLink[] = [
    { href: `/messages?user=${person.id}`, en: `Open chat with ${person.fullName}`, el: `Άνοιγμα συνομιλίας με ${person.fullName}` },
    { href: `/profile/${person.id}`, en: `View ${person.fullName}`, el: `Προβολή ${person.fullName}` },
  ];
  const beforeChat = readChat();
  let logged: LoggedWrite | null = null;
  const apply = (): AssistantResult => {
    const conv = ensureChatConversation(person.id);
    appendChatMessage({
      id: `msg-ai-${Date.now()}`,
      conversationId: conv.id,
      senderId: 'demo-user',
      senderName: 'You',
      body: messageBody,
      createdAt: new Date().toISOString(),
      readStatus: true,
    });
    logged = {
      kind: 'message',
      title: `Sent message to ${person.fullName}`,
      titleEl: `Στάλθηκε μήνυμα σε ${person.fullName}`,
      href: `/messages?user=${person.id}`,
    };
    logActivity({ ...logged, byAssistant: true });
    return {
      tool: 'inbox',
      en: `Sent to ${person.fullName}: “${messageBody}”. The conversation thread on Messages is updated.`,
      el: `Στάλθηκε σε ${person.fullName}: «${messageBody}». Η συνομιλία στα Μηνύματα ενημερώθηκε.`,
      href: `/messages?user=${person.id}`,
      links,
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: {
        en: `Send message to ${person.fullName}: “${messageBody}”?`,
        el: `Αποστολή μηνύματος σε ${person.fullName}: «${messageBody}»;`,
      },
      reversal: 'full',
      apply,
      undo: () => {
        writeValue(keys.chat, beforeChat);
        logUndo(logged);
      },
    },
    { tool: 'inbox', href: `/messages?user=${person.id}`, links },
  );
}

function attachSources(result: AssistantResult): AssistantResult {
  if (result.sources?.length) return result;
  const listed = TOOL_SOURCES[result.tool];
  if (listed?.length) return { ...result, sources: listed };
  if (result.tool === 'about' && result.href) {
    const page = pageContext(result.href);
    return { ...result, sources: [{ kind: 'page', en: page.en, el: page.el, href: page.href }] };
  }
  return result;
}

// ── Close the loop: task / milestone / session / event updates ───────────────

type TaskStatus = StudioTask['status'];
const TASK_STATUS_ROWS: [RegExp, TaskStatus][] = [
  [/done|completed|complete|finished|ολοκληρωμεν|ολοκληρωθ|ολοκληρωσ|τελειωσ/, 'Done'],
  [/in progress|σε εξελιξη|εξελιξη/, 'In Progress'],
  [/review|σε ελεγχο|ελεγχο/, 'Review'],
  [/todo|to do|προς υλοποιηση|υλοποιηση/, 'Todo'],
];

function taskStatusFor(folded: string): TaskStatus | null {
  for (const [rx, status] of TASK_STATUS_ROWS) if (rx.test(folded)) return status;
  return null;
}

/** The open task a sentence names: longest folded-title containment wins. */
function matchTask(folded: string): { task: StudioTask; ambiguous: boolean } | null {
  const open = readTasks().filter((task) => task.status !== 'Done');
  const scored: { task: StudioTask; len: number }[] = [];
  for (const task of open) {
    const title = fold(task.title);
    if (!title) continue;
    if (folded.includes(title)) scored.push({ task, len: title.length });
    else {
      const words = title.split(/\s+/).filter((word) => word.length >= 4 && folded.includes(word));
      if (words.length === title.split(/\s+/).filter((word) => word.length >= 4).length && words.length > 0) scored.push({ task, len: words.join(' ').length });
    }
  }
  if (!scored.length) return null;
  scored.sort((a, b) => b.len - a.len);
  return { task: scored[0]!.task, ambiguous: scored.length > 1 && scored[0]!.len === scored[1]!.len };
}

function taskAsk(open: StudioTask[]): AssistantResult {
  const titles = open.slice(0, 5).map((task) => task.title);
  return {
    tool: 'update_task',
    en: `Which task did you mean? Open tasks: ${titles.join(' · ') || 'none'}.`,
    el: `Ποια εργασία εννοείς; Ανοιχτές: ${titles.join(' · ') || 'καμία'}.`,
    href: '/workspace',
    links: [{ href: '/workspace', en: 'Open workspace', el: 'Άνοιγμα χώρου εργασίας' }],
  };
}

/** A create sentence ("add task X by Friday" / «πρόσθεσε εργασία X μέχρι…») belongs to the add tools, never to the updaters. */
const isCreateSentence = (folded: string) => /^(?:παρακαλω\s+|please\s+)?(?:add|create|new|make|προσθεσ|δημιουργ|νεα)/.test(folded);

function updateTaskResult(query: string, propose: boolean): AssistantResult | null {
  const folded = fold(query);
  if (isCreateSentence(folded)) return null;
  const links: AssistantLink[] = [{ href: '/workspace', en: 'Open workspace', el: 'Άνοιγμα χώρου εργασίας' }];
  const isTaskTalk = /\b(task|to-?do)\b/.test(folded) || hasStem(folded, 'εργασια', 'καθηκον');
  const removing = /\b(delete|remove|drop)\b/.test(folded) || hasStem(folded, 'διαγραψ', 'αφαιρεσ');
  const status = taskStatusFor(folded);
  const day = parseDay(folded);
  const isDueTalk = /\bdue\b|deadline|μεχρι|εως|προθεσμ/.test(folded);
  const isCompleteVerb = /\b(mark|complete|finish|close)\b/.test(folded) || hasStem(folded, 'ολοκληρωσ', 'τελειωσ');
  const isMoveVerb = /\b(move|set|put)\b/.test(folded) || hasStem(folded, 'μετακινησ', 'μεταφερ', 'ορισε');
  if (!isTaskTalk && !isCompleteVerb && !isMoveVerb && !removing && !(day && isDueTalk)) return null;
  if (!removing && !status && !(day && isDueTalk)) return null;
  const open = readTasks().filter((task) => task.status !== 'Done');
  const hit = matchTask(folded);
  // Claim only on a real title match — a bare verb like "close"/"remove" may
  // belong to the round, profile or legal routers downstream.
  if (!hit) return isTaskTalk ? taskAsk(open) : null;
  if (hit.ambiguous) return taskAsk(open);
  const task = hit.task;
  const previous = { ...task };
  const index = readTasks().findIndex((item) => item.id === task.id);
  let patch: Partial<StudioTask>;
  let actionEn: string;
  let actionEl: string;
  const statusEl: Record<TaskStatus, string> = { Todo: 'Προς υλοποίηση', 'In Progress': 'Σε εξέλιξη', Review: 'Σε έλεγχο', Done: 'Ολοκληρωμένο' };
  if (removing) {
    patch = {};
    actionEn = `delete task “${task.title}”`;
    actionEl = `διαγραφή της εργασίας «${task.title}»`;
  } else if (status) {
    patch = { status };
    actionEn = `set “${task.title}” to ${status}`;
    actionEl = `«${task.title}» σε κατάσταση ${statusEl[status]}`;
  } else {
    const friendly = formatDate(day!.day);
    patch = { due: day!.day };
    actionEn = `set “${task.title}” due ${friendly}`;
    actionEl = `«${task.title}» με προθεσμία ${friendly}`;
  }
  let logged: LoggedWrite | null = null;
  const apply = (): AssistantResult => {
    if (removing) removeStudioTask(task.id); else updateStudioTask(task.id, patch);
    logged = { kind: 'task', title: `Task: ${actionEn}`, titleEl: `Εργασία: ${actionEl}`, href: '/workspace' };
    logActivity({ ...logged, byAssistant: true });
    return {
      tool: 'update_task',
      en: `${actionEn[0]!.toUpperCase()}${actionEn.slice(1)}. Same board Workspace reads.`,
      el: `Έγινε ${actionEl}. Ο ίδιος πίνακας με το Workspace.`,
      href: '/workspace', links,
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `${actionEn[0]!.toUpperCase()}${actionEn.slice(1)}?`, el: `${actionEl};` },
      reversal: 'full',
      apply,
      undo: () => {
        if (removing) insertStudioTask(previous, index); else updateStudioTask(task.id, previous);
        logUndo(logged);
      },
    },
    { tool: 'update_task', href: '/workspace', links },
  );
}

function matchMilestone(folded: string): { milestone: Milestone; ambiguous: boolean } | null {
  const open = readMilestones().filter((m) => effectiveStatus(m) !== 'Completed');
  const scored: { milestone: Milestone; len: number }[] = [];
  for (const m of open) {
    const title = fold(m.title);
    if (title && folded.includes(title)) scored.push({ milestone: m, len: title.length });
  }
  if (!scored.length) return null;
  scored.sort((a, b) => b.len - a.len);
  return { milestone: scored[0]!.milestone, ambiguous: scored.length > 1 && scored[0]!.len === scored[1]!.len };
}

function updateMilestoneResult(query: string, propose: boolean): AssistantResult | null {
  const folded = fold(query);
  if (isCreateSentence(folded)) return null;
  const links: AssistantLink[] = [{ href: '/milestones', en: 'Open milestones', el: 'Άνοιγμα οροσήμων' }];
  const isMsTalk = /\bmilestone\b/.test(folded) || hasStem(folded, 'οροσημ');
  const pct = folded.match(/(\d{1,3})\s*%|(\d{1,3})\s*percent|(\d{1,3})\s*τοις εκατο/)?.filter(Boolean).slice(1)[0];
  const day = parseDay(folded);
  const completing = /\b(mark|complete|finish)\b.{0,30}\b(done|completed|complete|finished)\b|done\b.{0,30}\bmilestone\b/.test(folded) || hasStem(folded, 'ολοκληρωσ', 'τελειωσ');
  const moving = (/\b(move|push|postpone|reschedule|set)\b/.test(folded) && day) || (hasStem(folded, 'μετακινησ', 'μεταφερ', 'ορισε') && day);
  if (!isMsTalk && !completing && !pct && !moving) return null;
  if (!completing && !pct && !moving) return null;
  const hit = matchMilestone(folded);
  if (!hit) {
    if (!isMsTalk) return null;
    const titles = readMilestones().filter((m) => effectiveStatus(m) !== 'Completed').slice(0, 5).map((m) => m.title);
    return { tool: 'update_milestone', en: `Which milestone? Open: ${titles.join(' · ') || 'none'}.`, el: `Ποιο ορόσημο; Ανοιχτά: ${titles.join(' · ') || 'κανένα'}.`, href: '/milestones', links };
  }
  if (hit.ambiguous) {
    const titles = readMilestones().filter((m) => effectiveStatus(m) !== 'Completed').slice(0, 5).map((m) => m.title);
    return { tool: 'update_milestone', en: `Which milestone? Open: ${titles.join(' · ') || 'none'}.`, el: `Ποιο ορόσημο; Ανοιχτά: ${titles.join(' · ') || 'κανένα'}.`, href: '/milestones', links };
  }
  const m = hit.milestone;
  const previous = { ...m };
  let patch: Partial<Milestone>;
  let actionEn: string;
  let actionEl: string;
  if (completing) {
    patch = { status: 'Completed', progress: 100 };
    actionEn = `complete “${m.title}”`;
    actionEl = `ολοκλήρωση «${m.title}»`;
  } else if (pct != null) {
    // With a checklist, the page derives progress from done tasks — a flat % would change nothing visible.
    if (m.tasks && m.tasks.length > 0) {
      const done = m.tasks.filter((task) => task.completed).length;
      return {
        tool: 'update_milestone',
        en: `“${m.title}” tracks its progress from its checklist (${done} of ${m.tasks.length} done). Tick the items on Milestones and the percent follows.`,
        el: `Το «${m.title}» υπολογίζει την πρόοδό του από τη λίστα ελέγχου (${done} από ${m.tasks.length} έτοιμα). Τσέκαρε τα βήματα στα Ορόσημα και το ποσοστό ακολουθεί.`,
        href: '/milestones', links,
      };
    }
    const value = Math.min(100, Math.max(0, Number(pct)));
    patch = { progress: value };
    actionEn = `set “${m.title}” to ${value}%`;
    actionEl = `«${m.title}» στο ${value}%`;
  } else {
    const friendly = formatDate(day!.day);
    patch = { targetDate: day!.day };
    actionEn = `move “${m.title}” to ${friendly}`;
    actionEl = `«${m.title}» στις ${friendly}`;
  }
  let logged: LoggedWrite | null = null;
  const apply = (): AssistantResult => {
    upsertMilestone({ ...m, ...patch });
    logged = { kind: 'milestone', title: `Milestone: ${actionEn}`, titleEl: `Ορόσημο: ${actionEl}`, href: '/milestones' };
    logActivity({ ...logged, byAssistant: true });
    return { tool: 'update_milestone', en: `${actionEn[0]!.toUpperCase()}${actionEn.slice(1)}. Same list Milestones reads.`, el: `Έγινε ${actionEl}. Η ίδια λίστα με τα Ορόσημα.`, href: '/milestones', links };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `${actionEn[0]!.toUpperCase()}${actionEn.slice(1)}?`, el: `${actionEl};` },
      reversal: 'full',
      apply,
      undo: () => { upsertMilestone(previous); logUndo(logged); },
    },
    { tool: 'update_milestone', href: '/milestones', links },
  );
}

function agendaResult(query: string): AssistantResult {
  const folded = fold(query);
  const range: 'today' | 'tomorrow' | 'week' = /tomorrow|αυριο/.test(folded) ? 'tomorrow' : /week|εβδομαδ/.test(folded) ? 'week' : 'today';
  const items = agendaFor(range);
  const links: AssistantLink[] = [{ href: '/calendar', en: 'Open calendar', el: 'Άνοιγμα ημερολογίου' }];
  if (!items.length) {
    const label = { today: ['today', 'σήμερα'], tomorrow: ['tomorrow', 'αύριο'], week: ['this week', 'αυτή την εβδομάδα'] }[range];
    return {
      tool: 'read_agenda',
      en: `Nothing on ${label[0]}. Calendar has the full week — want me to schedule something?`,
      el: `Τίποτα για ${label[1]}. Το Ημερολόγιο έχει όλη την εβδομάδα — να προγραμματίσω κάτι;`,
      href: '/calendar', links,
    };
  }
  const kindEn: Record<AgendaItem['kind'], string> = { session: 'session', milestone: 'milestone', followup: 'follow-up', task: 'task' };
  const kindEl: Record<AgendaItem['kind'], string> = { session: 'συνάντηση', milestone: 'ορόσημο', followup: 'παρακολούθηση', task: 'εργασία' };
  const line = (item: AgendaItem, el: boolean) => {
    const when = item.allDay ? (el ? 'όλη μέρα' : 'all day') : item.at.slice(11, 16);
    return `${when} · ${el ? kindEl[item.kind] : kindEn[item.kind]} · ${item.title}`;
  };
  return {
    tool: 'read_agenda',
    en: `Agenda:\n${items.map((item) => line(item, false)).join('\n')}`,
    el: `Πρόγραμμα:\n${items.map((item) => line(item, true)).join('\n')}`,
    href: '/calendar', links,
  };
}

function updateSessionResult(query: string, propose: boolean): AssistantResult | null {
  const folded = fold(query);
  const links: AssistantLink[] = [{ href: '/calendar', en: 'Open calendar', el: 'Άνοιγμα ημερολογίου' }];
  const cancel = /\bcancel/.test(folded) || hasStem(folded, 'ακυρωσ');
  const day = parseDay(folded);
  const time = parseTime(folded);
  const move = (/\b(move|reschedule|push)\b/.test(folded) || hasStem(folded, 'μετακινησ', 'μεταφερ', 'αλλαξ')) && (day || time);
  if (!cancel && !move) return null;
  if (!/\b(meeting|session|call|event)\b/.test(folded) && !hasStem(folded, 'συναντησ', 'ραντεβου', 'συνεδρ', 'ατζεντ') && !/investor meeting|studio event|mentorship/.test(folded)) {
    // A name or known session title + cancel/move with no session word is likely
    // a person op — let other routers try it.
    const hasName = readSessions().some((s) => folded.includes(fold(s.title)) || s.participants.some((p) => fold(p) && folded.includes(fold(p))));
    if (!hasName) return null;
  }
  const hits = readSessions().filter((s) => {
    const hay = `${fold(s.title)} ${s.participants.map((p) => fold(p)).join(' ')}`;
    const words = folded.split(/[^a-zα-ω0-9]+/).filter((w) => w.length >= 4);
    return words.some((w) => hay.includes(w)) && (folded.includes(fold(s.title)) || s.participants.some((p) => fold(p).length >= 3 && folded.includes(fold(p))));
  });
  if (!hits.length) {
    return { tool: 'update_session', en: 'I cannot find that session on the calendar — tell me its title or a participant.', el: 'Δεν βρίσκω αυτή τη συνάντηση στο ημερολόγιο — πες μου τον τίτλο ή έναν συμμετέχοντα.', href: '/calendar', links };
  }
  if (hits.length > 1) {
    const titles = hits.slice(0, 5).map((s) => s.title);
    return { tool: 'update_session', en: `Which session? On the calendar: ${titles.join(' · ')}.`, el: `Ποια συνάντηση; Στο ημερολόγιο: ${titles.join(' · ')}.`, href: '/calendar', links };
  }
  const session = hits[0]!;
  let logged: LoggedWrite | null = null;
  const apply = (): AssistantResult => {
    if (cancel) {
      if (session.id.startsWith('evt-')) {
        setEventRegistration({ id: session.id.slice(4), title: session.title, date: '', time: '', location: session.location, organizer: '' }, false, { byAssistant: true });
      } else {
        removeSession(session.id);
      }
    } else {
      const at = new Date(session.time);
      if (day) { const [y, m, d] = day.day.split('-').map(Number); at.setFullYear(y!, (m ?? 1) - 1, d); }
      if (time) at.setHours(time.hours, time.minutes, 0, 0);
      if (Number.isNaN(at.getTime())) at.setTime(Date.now());
      addSession({ ...session, time: at.toISOString() });
    }
    const movedDay = formatDate(day?.day ?? session.time.slice(0, 10));
    const actionEn = cancel ? `cancelled “${session.title}”` : `moved “${session.title}” to ${movedDay} ${time ? `${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}` : session.time.slice(11, 16)}`;
    const actionEl = cancel ? `ακυρώθηκε «${session.title}»` : `μεταφέρθηκε «${session.title}» στις ${movedDay} ${time ? `${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}` : session.time.slice(11, 16)}`;
    logged = { kind: 'session', title: `Session ${actionEn}`, titleEl: `Συνάντηση ${actionEl}`, href: '/calendar' };
    logActivity({ ...logged, byAssistant: true });
    return { tool: 'update_session', en: `${actionEn[0]!.toUpperCase()}${actionEn.slice(1)}. Same list Calendar reads.`, el: `${actionEl}. Η ίδια λίστα με το Ημερολόγιο.`, href: '/calendar', links };
  };
  const sumDay = formatDate(day?.day ?? session.time.slice(0, 10));
  const sumEn = cancel ? `Cancel “${session.title}”?` : `Move “${session.title}” to ${sumDay}${time ? ` ${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}` : ''}?`;
  const sumEl = cancel ? `Ακύρωση «${session.title}»;` : `Μεταφορά «${session.title}» στις ${sumDay}${time ? ` ${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}` : ''};`;
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: sumEn, el: sumEl },
      reversal: 'full',
      apply,
      undo: () => {
        if (cancel) {
          if (session.id.startsWith('evt-')) {
            // Restore exactly: re-mark the registration and put the original session back —
            // setEventRegistration would also log a fake "Registered for …" activity.
            setId(eventListKeys.registered, session.id.slice(4), true);
          }
          addSession(session);
        } else {
          addSession(session);
        }
        logUndo(logged);
      },
    },
    { tool: 'update_session', href: '/calendar', links },
  );
}

const demoEventList = () => DEMO_EVENTS.map((e) => ({
  id: e.id,
  title: e.title,
  startsAt: atDaysFromToday(e.inDays, e.startHour).getTime(),
  date: daysFromToday(e.inDays),
  time: `${e.startHour}:00`,
  location: e.place.en,
  organizer: 'CoFounderBay',
}));

function registerEventResult(query: string, propose: boolean): AssistantResult | null {
  const folded = fold(query);
  const links: AssistantLink[] = [{ href: '/events', en: 'Open events', el: 'Άνοιγμα εκδηλώσεων' }];
  const wantsUnregister = /\b(un-?register|cancel\s+(my\s+)?registration|leave)\b/.test(folded) || hasStem(folded, 'ακυρωσ') && hasStem(folded, 'εγγραφ');
  const wantsRegister = /\b(register|sign\s?up|rsvp)\b/.test(folded) || hasStem(folded, 'εγγραφ');
  if (!wantsUnregister && !wantsRegister) return null;
  if (!isDemoData()) {
    // The live event list only exists behind the Events page's Firestore listener — no shared store yet.
    return { tool: 'register_event', en: 'I can’t see the live event list from here yet — open Events and press Register; it lands on your Calendar.', el: 'Δεν βλέπω ακόμη τη ζωντανή λίστα εκδηλώσεων από εδώ — άνοιξε τις Εκδηλώσεις και πάτα Εγγραφή· μπαίνει στο Ημερολόγιό σου.', href: '/events', links };
  }
  const events = demoEventList();
  const hit = events
    .map((e) => ({ e, len: fold(e.title).length }))
    .filter(({ e }) => folded.includes(fold(e.title)) || fold(e.title).split(/\s+/).every((w) => w.length < 4 || folded.includes(w)))
    .sort((a, b) => b.len - a.len)[0]?.e;
  if (!hit) {
    const titles = events.map((e) => e.title).join(' · ');
    return { tool: 'register_event', en: `Which event? Coming up: ${titles}.`, el: `Ποια εκδήλωση; Έρχονται: ${titles}.`, href: '/events', links };
  }
  const was = readIds(eventListKeys.registered).includes(hit.id);
  const on = !wantsUnregister;
  if (on === was) {
    return { tool: 'register_event', en: `You are ${on ? 'already registered' : 'not registered'} for ${hit.title}.`, el: `${on ? 'Είσαι ήδη εγγεγραμμένος' : 'Δεν είσαι εγγεγραμμένος'} στο ${hit.title}.`, href: '/events', links };
  }
  let logged: LoggedWrite | null = null;
  const actionEn = on ? `register for ${hit.title}` : `unregister from ${hit.title}`;
  const actionEl = on ? `εγγραφή στο ${hit.title}` : `ακύρωση εγγραφής στο ${hit.title}`;
  const apply = (): AssistantResult => {
    setEventRegistration(hit, on, { byAssistant: true });
    logged = { kind: 'event', title: `Event: ${actionEn}`, titleEl: `Εκδήλωση: ${actionEl}`, href: '/events' };
    if (!on) logActivity({ ...logged, byAssistant: true });
    return { tool: 'register_event', en: `${actionEn[0]!.toUpperCase()}${actionEn.slice(1)} — same toggle as Events.`, el: `Έγινε ${actionEl} — ο ίδιος διακόπτης με τις Εκδηλώσεις.`, href: '/events', links };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `${actionEn[0]!.toUpperCase()}${actionEn.slice(1)}?`, el: `${actionEl};` },
      reversal: 'full',
      apply,
      undo: () => { setEventRegistration(hit, was, { byAssistant: true }); logUndo(logged); },
    },
    { tool: 'register_event', href: '/events', links },
  );
}

function incomingRequests(): { record: ReturnType<typeof connectionRecords>[number]; name: string }[] {
  const uid = dataScope() || null;
  if (!uid) return [];
  return connectionRecords()
    .filter((record) => record.status === 'Pending' && record.receiverId === uid)
    .map((record) => ({ record, name: record.senderName || record.senderId }));
}

function readRequestsResult(): AssistantResult {
  const incoming = incomingRequests();
  const links: AssistantLink[] = [{ href: '/network?tab=requests', en: 'Open requests', el: 'Άνοιγμα αιτημάτων' }];
  if (!incoming.length) {
    return { tool: 'read_requests', en: 'No incoming connection requests right now. Requests land under Network → Requests.', el: 'Δεν υπάρχουν εισερχόμενα αιτήματα σύνδεσης τώρα. Τα αιτήματα φαίνονται στο Δίκτυο → Αιτήματα.', href: '/network?tab=requests', links };
  }
  return {
    tool: 'read_requests',
    en: `Waiting on you:\n${incoming.map((item) => item.name).join('\n')}`,
    el: `Σε αναμονή:\n${incoming.map((item) => item.name).join('\n')}`,
    href: '/network?tab=requests', links,
  };
}

function answerRequestResult(query: string, propose: boolean): AssistantResult | null {
  const folded = fold(query);
  const accept = /\b(accept|approve|yes to)\b/.test(folded) || hasStem(folded, 'αποδεχ', 'αποδεξ');
  const decline = /\b(decline|reject|ignore)\b/.test(folded) || hasStem(folded, 'απορριψ', 'αγνοησ');
  if (!accept && !decline) return null;
  const incoming = incomingRequests();
  const hit = incoming.find((item) => item.name && folded.includes(fold(item.name.split(' ')[0] ?? item.name))) ?? incoming.find((item) => folded.includes(fold(item.name)));
  // Only claim the sentence when it talks about requests or names someone waiting —
  // "accept mentor requests" must keep routing to the open-to switch.
  const aboutRequests = /\b(request|invite|invitation)\b/.test(folded) || hasStem(folded, 'αιτημ', 'προσκλησ');
  if (!hit && !aboutRequests) return null;
  if (!incoming.length) {
    return { tool: 'answer_request', en: 'No incoming requests to answer. They appear under Network → Requests.', el: 'Δεν υπάρχουν εισερχόμενα αιτήματα. Φαίνονται στο Δίκτυο → Αιτήματα.', href: '/network?tab=requests', links: [{ href: '/network?tab=requests', en: 'Open requests', el: 'Άνοιγμα αιτημάτων' }] };
  }
  if (!hit) {
    const names = incoming.slice(0, 5).map((item) => item.name).join(' · ');
    return { tool: 'answer_request', en: `Whose request? Waiting: ${names}.`, el: `Τίνος το αίτημα; Σε αναμονή: ${names}.`, href: '/network?tab=requests', links: [{ href: '/network?tab=requests', en: 'Open requests', el: 'Άνοιγμα αιτημάτων' }] };
  }
  const links: AssistantLink[] = [{ href: '/network?tab=requests', en: 'Open requests', el: 'Άνοιγμα αιτημάτων' }];
  const actionEn = accept ? `accept ${hit.name}'s request` : `decline ${hit.name}'s request`;
  const actionEl = accept ? `αποδοχή του αιτήματος: ${hit.name}` : `απόρριψη του αιτήματος: ${hit.name}`;
  const apply = async (): Promise<AssistantResult> => {
    const { respondToConnection } = await import('../lib/social');
    await respondToConnection(hit.record, accept);
    logActivity({ kind: 'connection', title: `Request: ${actionEn}`, titleEl: `Αίτημα: ${actionEl}`, href: '/network', byAssistant: true });
    return { tool: 'answer_request', en: `${actionEn[0]!.toUpperCase()}${actionEn.slice(1)} — same as Network → Requests.${accept ? ' They were notified; either of you can remove the connection from Network.' : ''}`, el: `Έγινε ${actionEl} — όπως στο Δίκτυο → Αιτήματα.${accept ? ' Ενημερώθηκε· η σύνδεση αφαιρείται από το Δίκτυο.' : ''}`, href: '/network?tab=requests', links };
  };
  if (!propose) { void apply(); return { tool: 'answer_request', en: `${actionEn[0]!.toUpperCase()}${actionEn.slice(1)}.`, el: `Έγινε ${actionEl}.`, href: '/network?tab=requests', links }; }
  return proposalResult(
    {
      summary: { en: `${actionEn[0]!.toUpperCase()}${actionEn.slice(1)}?`, el: `${actionEl};` },
      reversal: 'none',
      reversalNote: accept
        ? { en: 'Accept notifies the other person; the connection can still be removed from Network', el: 'Η αποδοχή ενημερώνει το άλλο μέλος· η σύνδεση μπορεί να αφαιρεθεί από το Δίκτυο' }
        : { en: 'The other person is not notified of a decline, but the request cannot be un-declined', el: 'Το άλλο μέλος δεν ενημερώνεται για την απόρριψη, αλλά το αίτημα δεν επανέρχεται' },
      apply,
    },
    { tool: 'answer_request', href: '/network?tab=requests', links },
  );
}

function exportDataResult(propose: boolean, profile: AssistantProfile | null): AssistantResult {
  const links: AssistantLink[] = [{ href: '/settings', en: 'Open settings', el: 'Άνοιγμα ρυθμίσεων' }];
  const guests = !dataScope() && !isDemoData();
  if (guests) {
    return { tool: 'export_data', en: 'Sign in first — there is nothing saved under a guest session to export.', el: 'Συνδέσου πρώτα — δεν υπάρχουν δεδομένα σε συνεδρία επισκέπτη για εξαγωγή.', href: '/settings', links };
  }
  const apply = (): AssistantResult => {
    exportMyData(profile);
    logActivity({ kind: 'settings', title: 'Exported account data', titleEl: 'Εξαγωγή δεδομένων λογαριασμού', href: '/settings', byAssistant: true });
    return { tool: 'export_data', en: 'Downloaded a JSON file of your data — the same export Settings → Account writes.', el: 'Κατέβηκε αρχείο JSON με τα δεδομένα σου — η ίδια εξαγωγή με Ρυθμίσεις → Λογαριασμός.', href: '/settings', links };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: 'Export your data as a JSON file?', el: 'Εξαγωγή των δεδομένων σου ως αρχείο JSON;' },
      reversal: 'none',
      reversalNote: { en: 'Nothing changes — the card only downloads a JSON file of your data', el: 'Τίποτα δεν αλλάζει — η κάρτα απλώς κατεβάζει ένα αρχείο JSON με τα δεδομένα σου' },
      apply,
    },
    { tool: 'export_data', href: '/settings', links },
  );
}

export function runAssistant(text: string, profile: AssistantProfile | null, options?: { propose?: boolean }): AssistantResult {
  return attachSources(attachFollowUps(resolveAssistant(text, profile, options?.propose === true)));
}

function resolveAssistant(text: string, profile: AssistantProfile | null, propose: boolean): AssistantResult {
  const query = text.trim();
  const folded = fold(query);
  if (!query) return helpResult();

  const slash = folded.match(/^\/([a-z0-9-]+)(?:\s+(.*))?$/);
  if (slash) {
    const cmd = slash[1];
    const rest = (slash[2] || '').trim();
    if (cmd === 'match' || cmd === 'matches') return matchesResult(profile, rest || 'who is my best match');
    if (cmd === 'scout') return scoutResult(profile);
    if (cmd === 'need') return needResult(rest || query, propose);
    if (cmd === 'next') return nextStepAssistant(profile);
    if (cmd === 'canvas') return canvasResult(rest ? `/canvas ${rest}` : query, propose);
    if (cmd === 'builder') return builderResult(rest ? `/builder ${rest}` : query, propose);
    if (cmd === 'readiness') return readinessResult(rest || query, propose, profile);
    if (cmd === 'completeness' || cmd === 'profile-check') return completenessResult(profile);
    if (cmd === '6axis') return studioModalResult('6axis', rest || query, profile);
    if (cmd === 'dealroom') return studioModalResult('dealroom', rest || query, profile);
    if (cmd === 'needwall') return studioModalResult('needwall', rest || query, profile);
    if (cmd === 'theme' || cmd === 'palette') return themeResult(rest || query);
    if (cmd === 'lang' || cmd === 'language') return langResult(rest || query);
    if (cmd === 'style') return styleResult(rest || query, propose);
    if (cmd === 'coach' || cmd === 'ux' || cmd === 'tips') return coachResult(propose);
    if (cmd === 'pin') return pinResult(rest || query, propose);
    if (cmd === 'unpin') return unpinResult(rest || query, propose);
    if (cmd === 'home' || cmd === 'start') return homeResult(rest || query, propose);
    if (cmd === 'tasks' || cmd === 'task') return tasksListOrAddResult(query, propose);
    if (cmd === 'msg' || cmd === 'message') return directMessageResult(query, propose);
    if (cmd === 'inbox') return inboxResult(rest || query);
    if (cmd === 'plan') return playbookResult(propose);
    if (cmd === 'invite') return inviteResult(propose);
    if (cmd === 'round') return roundResult();
    if (cmd === 'quiz') return fitCheckResult();
    if (cmd === 'overdue' || cmd === 'due') return milestonesResult(rest || 'what is overdue', propose);
    if (cmd === 'help') return helpResult();
  }

  const taskUpdate = updateTaskResult(query, propose);
  if (taskUpdate) return taskUpdate;
  const milestoneUpdate = updateMilestoneResult(query, propose);
  if (milestoneUpdate) return milestoneUpdate;
  const sessionUpdate = updateSessionResult(query, propose);
  if (sessionUpdate) return sessionUpdate;
  const eventReg = registerEventResult(query, propose);
  if (eventReg) return eventReg;
  const answer = answerRequestResult(query, propose);
  if (answer) return answer;
  if (/\b(what's on|whats on|agenda|on today|on tomorrow|τι εχω|τι εχω σημερα|τι εχω αυριο|προγραμμα)\b/.test(folded) || hasStem(folded, 'τι εχω', 'ατζεντα')) return agendaResult(query);
  if (/\bwho wants to connect|incoming requests|connection requests\b/.test(folded) || hasStem(folded, 'ποιος θελει να συνδεθ', 'εισερχομεν')) return readRequestsResult();
  if (/\bexport my data|download my data|export (the )?data\b/.test(folded) || hasStem(folded, 'εξαγωγη των δεδομενων', 'κατεβασε τα δεδομενα')) return exportDataResult(propose, profile);
  if (/\b(how complete|profile complete(ness)?|profile completion|complete is my profile|finish my profile)\b/.test(folded) || /ποσο πληρες|πληροτητα.{0,12}προφιλ|ολοκληρωσ.{0,12}προφιλ/.test(folded)) return completenessResult(profile);

  // "Where do I export the pitch?" — the exact page, tab and control (ai/whereIs).
  const where = whereIsResult(query);
  if (where) return where;

  if (/\b(6-axis|6 axis|six axis|radar match)\b/.test(folded) || /6\s*αξον/.test(folded)) return studioModalResult('6axis', query, profile);
  if (/\b(open|show|launch)\b.{0,20}\b(deal\s*room)\b/.test(folded) || /ανοιξ.{0,20}deal\s*room/.test(folded)) return studioModalResult('dealroom', query, profile);
  if (/\b(open|show)\b.{0,20}\b(need\s*wall|need\s*cards?\s*wall)\b/.test(folded) || /πινακ.{0,15}αναγκ/.test(folded)) return studioModalResult('needwall', query, profile);

  if ((/\b(switch|change|set)\b.{0,15}\b(theme|palette)\b/.test(folded) || /\b(dark|stone|cyan|mint|apricot|lilac)\s+(theme|mode|palette)\b/.test(folded) || /αλλαξ.{0,15}(θεμα|παλετ)/.test(folded))) {
    return themeResult(query);
  }
  if ((/\b(switch|change|set)\b.{0,15}\b(language|greek|english)\b/.test(folded) || /αλλαξ.{0,15}γλωσσ/.test(folded))) {
    return langResult(query);
  }
  if ((/\b(send|write)\s+(a\s+)?message\s+to\b/i.test(query) || /στειλ.{0,10}μηνυμα\s+(στ|σε)/i.test(folded)) && namedPerson(query)) {
    return directMessageResult(query, propose);
  }

  if (/\b(lean\s*canvas|canvas)\b/.test(folded) || /καμβα/.test(folded)) {
    return canvasResult(query, propose);
  }
  if (/\b(startup\s*builder|builder\s*module|set\s+builder|fill\s+builder)\b/.test(folded) || (/builder/.test(folded) && /\b(problem|solution|market|model|gtm|module|status)\b/.test(folded))) {
    return builderResult(query, propose);
  }
  if (!/^(tell me about|πες μου για)(?=\s|$)/.test(folded) && (/\b(readiness\s*score|readiness\s*index|startup\s*name|venture\s*name|one-?liner)\b/.test(folded) || /δεικτ.{0,15}ετοιμοτητ/.test(folded) || /ονομα.{0,10}(startup|venture|εταιρει)/.test(folded))) {
    return readinessResult(query, propose, profile);
  }

  const ddShare = parseDDShare(query);
  if (ddShare) return ddShareResult(ddShare, propose, proposalResult);
  const ddSet = parseDDSet(query);
  if (ddSet) return ddSetResult(ddSet, propose, proposalResult);
  if (isDDReadQuery(folded)) return ddReadResult();
  const investorEmail = parseInvestorEmail(query);
  if (investorEmail) return investorEmailResult(investorEmail, emailContext(profile));
  if (isAuditQuery(folded)) return studioAuditResult(profile);
  // Investor pipeline and follow-ups (services/assistantPipeline): before the pitch,
  // round and people routes, because investors are named like people and a next
  // step may mention "the pitch deck".
  const pipelineHit = routePipeline(query, propose);
  if (pipelineHit) return pipelineHit;
  const pitchSet = parsePitchSet(query);
  if (pitchSet) return pitchSetResult(pitchSet, propose, proposalResult);
  if (isPitchQuery(folded)) return pitchReadResult();
  const legalToggle = parseLegalToggle(query);
  if (legalToggle) return legalToggleResult(legalToggle, propose, proposalResult);
  if (isLegalChecklistQuery(folded)) return legalChecklistResult();
  if (isFocusQuery(folded)) return focusResult();
  if (isSavedSearchQuery(folded)) return savedSearchesResult();

  const roundSet = parseRoundSet(query);
  if (roundSet) return roundSetResult(roundSet, propose);

  const settingsSet = parseSettingsSet(query);
  if (settingsSet) return settingsSetResult(settingsSet, propose);

  const profileSet = parseProfileSet(query);
  if (profileSet) return profileSetResult(profileSet, profile, propose);

  if (parseNotificationsRead(query)) return notificationsReadResult(propose);

  const person = namedPerson(query);
  if (person && hasStem(folded, 'why', 'γιατι') && hasStem(folded, 'match', 'ταιριαζ')) return matchDetailResult(profile, person);
  if (person && hasStem(folded, 'save', 'watch', 'αποθηκ')) return saveOrConnect('save', person, propose);
  if (person && hasStem(folded, 'connect', 'request', 'intro', 'συνδεσ', 'συνδεθ', 'αιτημ')) return saveOrConnect('connect', person, propose);
  if (person && hasStem(folded, 'book', 'schedule', 'κλεισ', 'ραντεβ')) return bookMentor(person, propose);
  if (/\b(still lack|team lack|founding team)\b/.test(folded) || hasStem(folded, 'τι λειπ', 'τι χρειαζεται η ομαδα')) return teamGapResult(profile);
  if ((/\b(propose|scout|do not send)\b/.test(folded) || hasStem(folded, 'προτειν', 'μην στειλ'))
    && (/\b(people|three|3|match)\b/.test(folded) || hasStem(folded, 'τρεις', 'συνιδρυτ', 'αντιστοιχ'))) return scoutResult(profile);
  if (hasStem(folded, 'need card', 'καρτα αναγκ', 'draft a need') || (hasStem(folded, 'need', 'καρτα', 'αναγκ') && hasStem(folded, 'draft', 'write', 'close', 'change', 'list', 'γραψ', 'κλεισ', 'αλλαξ'))) return needResult(query, propose);
  if (/\bsearch( my)? (messages?|inbox|thread)\b|\bunread\b.{0,30}\bmessages?\b|\bmessages?\b.{0,30}\bunread\b/.test(folded)
    || hasStem(folded, 'ψαξε') && hasStem(folded, 'μηνυμ')
    || hasStem(folded, 'αδιαβαστ') && hasStem(folded, 'μηνυμ')) return inboxResult(query);
  if (/\bopen to (a )?(co-?founder|investor|advisor)\b/.test(folded) || /\b(am i|i am)\b.{0,20}\bopen to\b/.test(folded) || /ανοιχτ.{0,12}(συνιδρυτ|επενδυτ|συμβουλ)|ειμαι ανοιχτ/.test(folded)) return openToResult(query, propose);
  if (/\b(what should i do first|next step)\b/.test(folded) || hasStem(folded, 'τι να κανω')) return nextStepAssistant(profile);
  if (/\b(7-day|seven-day|playbook|match plan)\b/.test(folded) || hasStem(folded, 'πλανο 7')) return playbookResult(propose);
  if (/\b(invite 3|invite three|bring 3|bring three|1\+3|one plus three)\b/.test(folded) || (hasStem(folded, 'προσκαλεσ') && /\b3\b|τρεις/.test(folded))) return inviteResult(propose);
  if (/\b(meet this week|who should i meet)\b/.test(folded) || /ποιον.{0,20}εβδομαδ|αυτη την εβδομαδα/.test(folded)) return weekMeetResult(profile);
  if (/\b(fit check|archetype|quiz)\b/.test(folded) || hasStem(folded, 'τι ειδους')) return fitCheckResult();

  if ((/\b(apply to|apply now|applying to)\b/.test(folded) || /^κανε αιτηση (?:στο|στη|στην|για)(?=\s|$)/.test(folded)) && !/\b(what|which|how)\b/.test(folded) && !hasStem(folded, 'ποια', 'ποιο')) return applyResult(query, propose);
  if ((/\bclaim\b/.test(folded) || /^(?:διεκδικησε|ζητα|παρε|ενεργοποιησε)(?=\s|$)/.test(folded)) && hasStem(folded, 'perk', 'aws', 'stripe', 'hubspot', 'notion', 'google cloud', 'gcp', 'intercom', 'slack', 'mercury', 'amazon web', 'παροχ') && !/\b(what|which|how)\b/.test(folded) && !hasStem(folded, 'ποια', 'ποιες')) {
    return claimPerkResult(query, propose);
  }
  if ((/\brecord\b/.test(folded) && /\binvest/.test(folded)) || (hasStem(folded, 'καταγραψ') && hasStem(folded, 'επενδυσ'))) return recordInvestmentResult(query, propose);
  if ((/\b(add|create|new)\b/.test(folded) && /\b(task|todo)\b/.test(folded)) || (hasStem(folded, 'προσθεσ', 'δημιουργ', 'νεα') && hasStem(folded, 'εργασια', 'καθηκον'))) return addTaskResult(query, propose);

  // A join names the community, which is also a knowledge card ("Fintech
  // Founders is on the Communities page…"). The verb wins: the card tells the
  // person to say "join <name>", so saying it must join.
  if (hasStem(folded, 'join', 'μπες', 'κανε join', 'γινε μελος') && COMMUNITY_CATALOG.some((item) => folded.includes(fold(item.name)))) {
    return communitiesResult(query, propose);
  }

  const about = aboutResult(query);
  if (about) return about;

  const nav = navigateResult(query);
  if (nav) return nav;

  if (/\b(best match|who (should|can) i|find .{0,20}(co-?founder|match))\b/.test(folded)
    || /καλυτερ.{0,12}αντιστοιχ|ποιος.{0,20}συνιδρυτ/.test(folded)
    || (/\b(match|co-?founder)\b/.test(folded) && !/\bopen/.test(folded) && !hasStem(folded, 'ανοιξ'))
    || (hasStem(folded, 'αντιστοιχ', 'συνιδρυτ', 'ταιριαζ', 'ιδρυτικ') && !hasStem(folded, 'ανοιξ', 'ανοιγμα'))
    || Object.keys(parseQualifiers(query).filters).length > 0) {
    return matchesResult(profile, query);
  }
  if ((/\b(become|how do i)\b/.test(folded) || hasStem(folded, 'πως γιν', 'γινω')) && /\bmentor\b|μεντορ/.test(folded)) return becomeMentorResult();
  if (/\bmentor\b/.test(folded) || hasStem(folded, 'μεντορ')) return mentorsResult(query);
  if (/\b(activity|history|notifications?|requests?|watchlist)\b/.test(folded) || hasStem(folded, 'τι εγινε', 'τι αλλαξε', 'τι νεο', 'ειδοποι', 'αιτημ')) return activityResult();
  if (/\b(new event|schedule a meeting|schedule a new event|add (a )?session)\b/.test(folded) || /^(?:κλεισε|προγραμματισε|βαλε)\s+(?:μια\s+)?(?:συναντηση|εκδηλωση|συνεδρια)(?=\s|$)/.test(folded)) return sessionAddResult(query, propose);
  if (/\b(events?|meetups?|sessions?)\b/.test(folded) || hasStem(folded, 'εκδηλ', 'διοργανωσ', 'συνεδρ')) return eventsResult(query, propose);
  if (/\b(communities|community)\b/.test(folded) || hasStem(folded, 'κοινοτ')) return communitiesResult(query, propose);
  if (/\b(programs?|accelerator|bootcamp)\b/.test(folded) || hasStem(folded, 'προγραμ')) return programsResult();
  if (/\b(perks?|credits)\b/.test(folded) || hasStem(folded, 'παροχ')) return perksResult();
  if (/\b(legal|template|nda)\b/.test(folded) || hasStem(folded, 'νομικ')) return legalResult();
  if (/\b(courses?|learning|resources?)\b/.test(folded) || hasStem(folded, 'μαθημ', 'πορο')) return resourcesResult();
  if (/\b(milestones?|overdue|due)\b/.test(folded) || hasStem(folded, 'οροσημ', 'εκπροθεσμ')) return milestonesResult(query, propose);
  if (/\bdue diligence\b/.test(folded) || hasStem(folded, 'δεουσα επιμελεια')) return ddReadResult();
  if (/\b(pipeline|funnel|term sheet)\b/.test(folded)) return routePipeline('show my pipeline', propose)!;
  if (/\b(rounds?|raise|runway|valuation)\b/.test(folded) || hasStem(folded, 'γυρο', 'χρηματοδ', 'επενδυτ')) return roundResult();
  if (/\b(today|status|brief|next)\b/.test(folded) || hasStem(folded, 'τι εκκρεμ', 'επομεν', 'σημεριν', 'κατασταση', 'συνοψη')) return briefingResult(profile);
  // "Help me design a plan" is a request for the model, not for the capability list.
  if (/^(?:help|help me|what can you(?: do| change)?)\??$|\bwhat can you (?:do|change)\b/.test(folded) || hasStem(folded, 'τι μπορεις')) return helpResult();

  return { ...briefingResult(profile), fallback: true };
}

export function assistantContextBlock(profile: AssistantProfile | null): string {
  const brief = platformBriefing(profile);
  const matches = brief.ranked.slice(0, 3).map((row) => `${row.person.fullName} (${row.fit.score}%)`).join(', ');
  const overdue = brief.overdue.map((item) => item.title).join(', ') || 'none';
  const canvasRaw = readValue<Record<string, string>>(keys.canvas, {});
  const canvasEffective = isDemoData() ? { ...DEMO_CANVAS_FALLBACK, ...canvasRaw } : canvasRaw;
  const canvasLine = CANVAS_FIELDS.map((f) => `${f.en}: ${(canvasEffective[f.key] || 'empty').trim()}`).join(' | ');
  const builderInputs = readBuilderInputs();
  const builderLine = BUILDER_MODULES.map((m) => {
    const st = builderStatus(m.id, builderInputs);
    return `${m.title} (${st.filled}/${st.total})`;
  }).join(', ');
  const ventureLabel = ventureName() || 'Unset';
  const readinessScore = currentReadiness(isDemoData() ? undefined : profile?.skills).score;
  const needsCount = readNeeds().filter((n) => n.status === 'open').length;
  const uxPrefs = readUxPrefs();
  const visited = topPages(4).map((row) => `${row.path}(${row.count})`).join(', ') || 'nothing yet';
  const usageLine = `Usage: most visited ${visited} · pinned [${uxPrefs.favorites.join(', ') || 'none'}] · home ${uxPrefs.homePath || '/'}`;
  return [
    `Viewer: ${profile?.fullName || 'Demo User'} · ${profile?.headline || ''} · ${profile?.industry || ''}`,
    `Venture: ${ventureLabel} · Readiness Score: ${readinessScore}/100 · Open Need Cards: ${needsCount}`,
    `Top matches: ${matches || 'none scored'}`,
    `Overdue milestones: ${overdue}`,
    `Round: ${brief.round.name} ($${brief.round.committedAmount.toLocaleString()} / $${brief.round.targetAmount.toLocaleString()}, burn $${brief.round.monthlyBurn.toLocaleString()}/mo)`,
    `Lean Canvas: ${canvasLine}`,
    `Startup Builder: ${builderLine}`,
    usageLine,
  ].join('\n');
}
