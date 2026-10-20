/**
 * Deterministic studio operator. The chat panel runs this first so every
 * page, list and score the assistant mentions is the same data the rest of
 * the app already shows. Gemini only rewrites the wording.
 */
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
  readNotificationPrefs,
  writeNotificationPrefs,
  writeProfileLocal,
  type ActivityKind,
  type NeedCard,
  type NeedField,
  type NotificationPrefs,
  type Round,
  type OpenToKind,
  type StudioTask,
  type TurnSource,
} from '../lib/localLists';
import { applySwitches, readSwitches, type Switches } from '../lib/privacySwitches';
import { cloudNotificationsUnread, markAllNotificationsRead } from '../lib/notificationFeed';
import { persistProfilePatch } from '../lib/account';
import type { UserProfile } from '../types';
import { milestoneService } from './milestoneService';
import { readFitCheck } from '../lib/fitCheck';
import { roundMetrics } from '../lib/roundMetrics';
import { TEAM_AREAS, teamGaps } from '../lib/teamGaps';
import { studioNextStep, studioWaiting } from '../lib/nextStep';
import { applyQualifiers, parseQualifiers } from '../lib/searchQualifiers';

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
};

export const ASSISTANT_PAGES: { keys: string[]; href: string; en: string; el: string }[] = [
  { keys: ['dashboard', 'home', 'πίνακ', 'αρχικ'], href: '/dashboard', en: 'Dashboard', el: 'Πίνακας' },
  { keys: ['match', 'cofounder', 'co-founder', 'συνιδρυτ', 'αντιστοιχ'], href: '/matches', en: 'Matches', el: 'Αντιστοιχίσεις' },
  { keys: ['discover', 'explore', 'εξερεύ'], href: '/discovery', en: 'Discovery', el: 'Εξερεύνηση' },
  { keys: ['mentor', 'μεντορ'], href: '/mentors', en: 'Mentors', el: 'Μέντορες' },
  { keys: ['message', 'chat', 'inbox', 'μηνυμ', 'συνομιλ'], href: '/messages', en: 'Messages', el: 'Μηνύματα' },
  { keys: ['milestone', 'οροσημ', 'στόχ'], href: '/milestones', en: 'Milestones', el: 'Ορόσημα' },
  { keys: ['fund', 'investor', 'round', 'raise', 'χρηματοδ', 'επενδυτ', 'γύρ'], href: '/fundraising', en: 'Fundraising', el: 'Χρηματοδότηση' },
  { keys: ['calendar', 'ημερολ', 'ραντεβ'], href: '/calendar', en: 'Calendar', el: 'Ημερολόγιο' },
  { keys: ['network', 'δικτυ'], href: '/network', en: 'Network', el: 'Δίκτυο' },
  { keys: ['communit', 'κοινοτ'], href: '/communities', en: 'Communities', el: 'Κοινότητες' },
  { keys: ['event', 'εκδηλ'], href: '/events', en: 'Events', el: 'Εκδηλώσεις' },
  { keys: ['program', 'accelerator', 'πρόγραμ', 'προγραμ'], href: '/programs', en: 'Programs', el: 'Προγράμματα' },
  { keys: ['profile', 'προφιλ'], href: '/profile', en: 'Profile', el: 'Προφίλ' },
  { keys: ['setting', 'ρυθμισ'], href: '/settings', en: 'Settings', el: 'Ρυθμίσεις' },
  { keys: ['insight', 'στατιστ'], href: '/insights', en: 'Insights', el: 'Εικόνα' },
  { keys: ['notification', 'ειδοποι'], href: '/notifications', en: 'Notifications', el: 'Ειδοποιήσεις' },
  { keys: ['legal', 'νομικ'], href: '/legal', en: 'Legal Hub', el: 'Νομικά' },
  { keys: ['perk', 'παροχ'], href: '/perks', en: 'Perks', el: 'Παροχές' },
  { keys: ['founder tool', 'εργαλει ιδρυτ'], href: '/founder-tools', en: 'Founder Tools', el: 'Εργαλεία ιδρυτή' },
  { keys: ['workspace', 'venture builder', 'χωροσ εργασ'], href: '/workspace', en: 'Workspace', el: 'Χώρος εργασίας' },
  { keys: ['resource', 'course', 'learning hub', 'πορο'], href: '/resources', en: 'Resources', el: 'Πόροι' },
  { keys: ['quiz', 'fit check', 'fit-check', 'αρχετυπ'], href: '/quiz', en: 'Fit check', el: 'Fit check' },
];

/** Slash shortcuts in the studio chat — same tools as the natural-language router. */
export const SLASH_COMMANDS: { cmd: string; en: string; el: string }[] = [
  { cmd: '/match', en: 'Rank people on this profile', el: 'Βαθμολόγησε ανθρώπους σε αυτό το προφίλ' },
  { cmd: '/scout', en: 'Propose three people — never send', el: 'Πρότεινε τρεις — χωρίς αποστολή' },
  { cmd: '/need', en: 'List or draft a need card', el: 'Δείξε ή γράψε κάρτα ανάγκης' },
  { cmd: '/next', en: 'What to do first', el: 'Τι να κάνεις πρώτα' },
  { cmd: '/inbox', en: 'Search messages in this browser', el: 'Ψάξε μηνύματα σε αυτόν τον browser' },
  { cmd: '/plan', en: 'Write a 7-day match plan', el: 'Γράψε πλάνο 7 ημερών' },
  { cmd: '/invite', en: 'Prepare three founder invites', el: 'Ετοίμασε τρεις προσκλήσεις ιδρυτών' },
  { cmd: '/round', en: 'Read the fundraising round', el: 'Διάβασε τον γύρο χρηματοδότησης' },
  { cmd: '/quiz', en: 'Open or recall the fit check', el: 'Άνοιξε ή θυμήσου το fit check' },
  { cmd: '/overdue', en: 'List overdue milestones', el: 'Δείξε εκπρόθεσμα ορόσημα' },
  { cmd: '/help', en: 'What this assistant can change', el: 'Τι μπορεί να αλλάξει αυτός ο βοηθός' },
];

export function pageContext(pathname: string): { href: string; en: string; el: string } {
  const path = (pathname.split('?')[0] || '/dashboard').replace(/\/+$/, '') || '/dashboard';
  const exact = ASSISTANT_PAGES.find((page) => page.href === path);
  if (exact) return { href: exact.href, en: exact.en, el: exact.el };
  const nested = ASSISTANT_PAGES.find((page) => page.href !== '/' && path.startsWith(`${page.href}/`));
  if (nested) return { href: nested.href, en: nested.en, el: nested.el };
  return { href: '/dashboard', en: 'Dashboard', el: 'Πίνακας' };
}

type KnowledgeCard = { keys: string[]; href: string; en: string; el: string; /** True when the card describes demo-only sample content. */ demo?: boolean };

const KNOWLEDGE: KnowledgeCard[] = [
  { keys: ['series a scout', 'scout network'], href: '/fundraising', demo: true, en: 'Series A Scout Network is a rolling Sequoia intro on Fundraising → Opportunities ($5M+, AI/SaaS). Open the tab and apply, or I can walk the round numbers.', el: 'Το Series A Scout Network είναι rolling intro της Sequoia στη Χρηματοδότηση → Ευκαιρίες ($5M+, AI/SaaS). Άνοιξε την καρτέλα ή ρώτα για τον γύρο.' },
  { keys: ['impact investor roundtable'], href: '/fundraising', demo: true, en: 'Impact Investor Roundtable is a pitch event on Fundraising → Opportunities ($1–3M, 12 May 2026, ESG). Same list as the Opportunities tab.', el: 'Το Impact Investor Roundtable είναι pitch event στη Χρηματοδότηση → Ευκαιρίες ($1–3M, 12 Μαΐ 2026).' },
  { keys: ['founder grant', 'stripe foundation'], href: '/fundraising', demo: true, en: 'Founder Grant — Q2 2026 is a $50k non-dilutive Stripe Foundation grant on Fundraising → Opportunities (deadline 30 May 2026).', el: 'Το Founder Grant — Q2 2026 είναι μη αραιωτική επιχορήγηση $50k από Stripe Foundation στη Χρηματοδότηση → Ευκαιρίες (30 Μαΐ 2026).' },
  { keys: ['eu horizon', 'horizon innovation'], href: '/fundraising', demo: true, en: 'EU Horizon Innovation Fund is a €250k grant from the European Commission on Fundraising → Opportunities (1 Jun 2026, DeepTech/EU).', el: 'Το EU Horizon Innovation Fund είναι επιχορήγηση €250k από την Ευρωπαϊκή Επιτροπή στη Χρηματοδότηση → Ευκαιρίες (1 Ιουν 2026).' },
  { keys: ['debt facility', 'clearco', 'revenue-based'], href: '/fundraising', demo: true, en: 'Debt Facility — Revenue-Based is a Clearco line up to $2M on Fundraising → Opportunities (rolling, SaaS with MRR over $30k).', el: 'Το Debt Facility — Revenue-Based είναι γραμμή Clearco έως $2M στη Χρηματοδότηση → Ευκαιρίες (rolling).' },
  { keys: ['sequoia'], href: '/fundraising', demo: true, en: 'Sequoia Capital is in the Fundraising investor list and pipeline (Due Diligence). VC, SaaS/FinTech/AI, checks $500k–$5M. Open Fundraising to move the stage or send a note.', el: 'Η Sequoia Capital είναι στη λίστα επενδυτών και στον αγωγό (Due Diligence). VC, SaaS/FinTech/AI, $500k–$5M. Άνοιξε τη Χρηματοδότηση για το στάδιο.' },
  { keys: ['andreessen', 'a16z'], href: '/fundraising', demo: true, en: 'Andreessen Horowitz is on Fundraising → Investors (Contacted). VC, Consumer/Enterprise/Bio, $1M–$50M.', el: 'Η Andreessen Horowitz είναι στη Χρηματοδότηση → Επενδυτές (Contacted). VC, $1M–$50M.' },
  { keys: ['first round'], href: '/fundraising', demo: true, en: 'First Round Capital is Identified on the Fundraising pipeline. Seed specialist, $250k–$3M.', el: 'Η First Round Capital είναι Identified στον αγωγό Χρηματοδότησης. Seed, $250k–$3M.' },
  { keys: ['y combinator', 'yc s26'], href: '/fundraising', demo: true, en: 'Y Combinator S26 is on Fundraising → Programs: $500k accelerator, deadline 19 Apr 2026, 96% match.', el: 'Το Y Combinator S26 είναι στη Χρηματοδότηση → Προγράμματα: $500k, προθεσμία 19 Απρ 2026, 96% match.' },
  { keys: ['techstars'], href: '/fundraising', demo: true, en: 'Techstars Sustainability is on Fundraising → Programs: $120k, NYC, deadline 1 May 2026.', el: 'Το Techstars Sustainability είναι στη Χρηματοδότηση → Προγράμματα: $120k, NYC, 1 Μαΐ 2026.' },
  { keys: ['nsf sbir'], href: '/fundraising', demo: true, en: 'NSF SBIR Phase I is a $275k US grant on Fundraising → Programs (18 Jun 2026).', el: 'Το NSF SBIR Phase I είναι επιχορήγηση $275k στη Χρηματοδότηση → Προγράμματα (18 Ιουν 2026).' },
  { keys: ['founders factory'], href: '/fundraising', demo: true, en: 'Founders Factory EU is a studio on Fundraising → Programs (€150k, London/Paris, 10 Jul 2026).', el: 'Το Founders Factory EU είναι studio στη Χρηματοδότηση → Προγράμματα (€150k, 10 Ιουλ 2026).' },
  { keys: ['fintech accelerator'], href: '/programs', demo: true, en: 'FinTech Accelerator Q3 2026 is on Programs: $120k, 12 weeks, deadline 15 Apr 2026. Same card as the Programs page.', el: 'Το FinTech Accelerator Q3 2026 είναι στα Προγράμματα: $120k, 12 εβδομάδες, 15 Απρ 2026.' },
  { keys: ['cleantech innovation'], href: '/programs', demo: true, en: 'CleanTech Innovation Grant is on Programs: $50k non-dilutive, deadline 1 May 2026.', el: 'Το CleanTech Innovation Grant είναι στα Προγράμματα: $50k μη αραιωτικά, 1 Μαΐ 2026.' },
  { keys: ['saas growth bootcamp', 'founders academy'], href: '/programs', demo: true, en: 'SaaS Growth Bootcamp / Founders Academy is on Programs: 4 weeks, deadline 30 Mar 2026.', el: 'Το SaaS Growth Bootcamp είναι στα Προγράμματα: 4 εβδομάδες, 30 Μαρ 2026.' },
  { keys: ['networking night', 'startup founders networking'], href: '/events', demo: true, en: 'Startup Founders Networking Night is on Events: London, 28 Mar 2026, 6–9 PM. Register on the Events page.', el: 'Το Startup Founders Networking Night είναι στις Εκδηλώσεις: Λονδίνο, 28 Μαρ 2026.' },
  { keys: ['seed round pitch', 'mastering the seed'], href: '/events', demo: true, en: 'Mastering the Seed Round Pitch is an online workshop on Events, 2 Apr 2026, hosted by Sarah Chen.', el: 'Το Mastering the Seed Round Pitch είναι online workshop στις Εκδηλώσεις, 2 Απρ 2026.' },
  { keys: ['fintech demo day'], href: '/events', demo: true, en: 'FinTech Demo Day Q2 is on Events: New York, 15 Apr 2026, 10 AM–1 PM.', el: 'Το FinTech Demo Day Q2 είναι στις Εκδηλώσεις: Νέα Υόρκη, 15 Απρ 2026.' },
  { keys: ['global startup summit'], href: '/events', demo: true, en: 'Global Startup Summit 2026 is the featured event on Events. Scroll the list or ask me to host a session.', el: 'Το Global Startup Summit 2026 είναι το featured στις Εκδηλώσεις. Άνοιξε τη λίστα ή ρώτα να διοργανώσουμε.' },
  { keys: ['aws activate', 'amazon web services'], href: '/perks', en: 'AWS Activate is the flagship public founder program listed on Perks — apply on the provider site from that card. Open Perks to see every published perk.', el: 'Το AWS Activate είναι δημόσιο πρόγραμμα στις Παροχές — κάνε αίτηση στον πάροχο από την κάρτα. Άνοιξε Παροχές για όλες.' },
  { keys: ['readiness score'], href: '/insights', en: 'Readiness Score lives on Insights (and Profile). Improve it from Profile: fill skills, looking-for, and your stage.', el: 'Το Readiness Score είναι στα Insights και στο Προφίλ. Βελτίωσέ το από το Προφίλ: δεξιότητες, τι ψάχνεις και το στάδιό σου.' },
  { keys: ['articles of incorporation', 'founder stock', 'safe agreement', 'mutual nda'], href: '/legal', en: 'That template is on Legal Hub, same cards as Incorporation / Fundraising Legal. Download the starter draft there, or book office hours.', el: 'Αυτό το πρότυπο είναι στο Legal Hub. Κατέβασε το αρχικό draft από εκεί ή κλείσε συνεδρία.' },
  { keys: ['legal office hours', 'book legal'], href: '/legal', en: 'Legal office hours are 15-minute sessions you book on Legal Hub — the Book a Session button adds it straight to your Calendar.', el: 'Οι νομικές συνεδρίες είναι 15λεπτες συναντήσεις που κλείνεις στο Legal Hub — το κουμπί τις βάζει στο Ημερολόγιό σου.' },
  { keys: ['start a voice call', 'start a video call', 'how do i start a voice', 'how do i start a video'], href: '/messages', en: 'Call and Video on Messages do not start a live line. They open this assistant so you can draft the first line or book a Calendar slot instead. I can also search the thread if you say “search my messages for…”.', el: 'Τα Call και Video στα Μηνύματα δεν ανοίγουν ζωντανή κλήση. Ανοίγουν αυτόν τον βοηθό για το πρώτο μήνυμα ή ένα ραντεβού στο Ημερολόγιο. Μπορώ και να ψάξω το νήμα αν πεις «ψάξε στα μηνύματα…».' },
  { keys: ['list a partner service', 'list your service'], href: '/resources', en: 'Partner services are listed on Resources → Services. Tell me the service name and price and I will point you at that tab.', el: 'Οι υπηρεσίες partners είναι στους Πόρους → Services. Πες όνομα και τιμή.' },
  { keys: ['post a job', 'post a role'], href: '/resources', en: 'Jobs sit on Resources → Jobs. Use Post a Job on that tab — the listing goes live for every member.', el: 'Οι θέσεις είναι στους Πόρους → Jobs. Πάτα Post a Job στην καρτέλα — η αγγελία βγαίνει live για όλα τα μέλη.' },
  { keys: ['foundations of fundraising', 'scalable sales engine', 'legal essentials for startups', 'product-market fit workshop'], href: '/resources', demo: true, en: 'That course is on Resources → Learning, same cards as the Learning Hub. Start Learning opens this assistant with the course title.', el: 'Αυτό το μάθημα είναι στους Πόρους → Learning.' },
  { keys: ['create a community'], href: '/communities', en: 'Create stays on Communities. Name the space, pick a category, and I will keep it next to Fintech Founders, AI & Machine Learning, SaaS Builders, and Web3 & Crypto. Open Communities and use Create — or tell me the name.', el: 'Η δημιουργία μένει στις Κοινότητες. Δώσε όνομα και κατηγορία. Άνοιξε Κοινότητες και πάτα Create — ή πες μου το όνομα.' },
  { keys: ['fintech founders', 'ai & machine learning', 'saas builders', 'web3 & crypto'], href: '/communities', en: 'That community is on the Communities page with its real member count. Join there, or tell me “join <name>” and I will do it.', el: 'Αυτή η κοινότητα είναι στη σελίδα Κοινότητες με τον πραγματικό αριθμό μελών. Κάνε Join εκεί, ή πες μου «join <όνομα>».' },
  { keys: ['export my pitch', 'share my pitch', 'pitch deck', 'pitch slide', 'cover & hook'], href: '/founder-tools', en: 'Pitch lives on Founder Tools → Pitch: Cover & Hook, Problem, Solution, Market Size, Business Model, Traction, Team, Ask. Export, share, or send to a mentor from that tab — I can also book a mentor.', el: 'Το pitch είναι στα Εργαλεία ιδρυτή → Pitch. Export, share ή αποστολή σε μέντορα από εκεί. Μπορώ και να κλείσω μέντορα.' },
  { keys: ['lean canvas'], href: '/workspace', en: 'Lean Canvas is on Workspace → Canvas. Save keeps the draft on that page; AI Refine opens this assistant on the same nine boxes.', el: 'Το Lean Canvas είναι στο Workspace → Canvas. Το Save κρατά το draft εκεί· το AI Refine ανοίγει αυτόν τον βοηθό.' },
  { keys: ['workspace assets', 'project assets'], href: '/workspace', demo: true, en: 'Project assets sit on Workspace → Dashboard: Pitch Deck v2.pdf, Brand Guidelines.zip, Market Research.docx. Open Workspace to download, or Founder Tools for the live pitch.', el: 'Τα αρχεία είναι στο Workspace → Dashboard. Άνοιξε Workspace ή τα Εργαλεία ιδρυτή για το live pitch.' },
  { keys: ['ecosphere'], href: '/discovery', demo: true, en: 'EcoSphere Accelerator is on Discovery → Opportunities: 12 weeks, remote, sustainability, deadline 30 Oct. Same card as Explore.', el: 'Το EcoSphere Accelerator είναι στην Εξερεύνηση → Ευκαιρίες: 12 εβδομάδες, remote, 30 Οκτ.' },
  { keys: ['web3 founders grant'], href: '/discovery', demo: true, en: 'Web3 Founders Grant is on Discovery → Opportunities: equity-free funding for core infrastructure, deadline 15 Nov.', el: 'Το Web3 Founders Grant είναι στην Εξερεύνηση → Ευκαιρίες: χωρίς equity, 15 Νοε.' },
  { keys: ['ai innovation lab'], href: '/discovery', demo: true, en: 'AI Innovation Lab is on Discovery → Opportunities: Berlin incubator for enterprise automation, deadline 5 Dec.', el: 'Το AI Innovation Lab είναι στην Εξερεύνηση → Ευκαιρίες: Βερολίνο, 5 Δεκ.' },
  { keys: ['founder mixer'], href: '/events', demo: true, en: 'Founder Mixer SF is on Discovery → Upcoming Sessions and Events. Register on Events to put it on Calendar.', el: 'Το Founder Mixer SF είναι στην Εξερεύνηση και στις Εκδηλώσεις. Κάνε Register για το Ημερολόγιο.' },
  { keys: ['ai product workshop'], href: '/events', demo: true, en: 'AI Product Workshop is on Discovery → Upcoming Sessions (20 Oct, virtual). Register from Events.', el: 'Το AI Product Workshop είναι στην Εξερεύνηση (20 Οκτ, virtual).' },
  { keys: ['seed funding webinar'], href: '/events', demo: true, en: 'Seed Funding Webinar is on Discovery → Upcoming Sessions (25 Oct). Same ecosystem list.', el: 'Το Seed Funding Webinar είναι στην Εξερεύνηση (25 Οκτ).' },
];

function fold(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** `\b` does not treat Greek as a word. Stems match anywhere; Latin needs a non-letter on each side. */
function hasStem(hay: string, ...stems: string[]): boolean {
  return stems.some((stem) => {
    if (/[a-z0-9]/.test(stem) && !/[α-ω]/.test(stem)) {
      return new RegExp(`(?:^|[^a-z0-9])${stem}(?:$|[^a-z0-9])`).test(hay);
    }
    return hay.includes(stem);
  });
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
  const links: AssistantLink[] = [
    ...(top ? [linkFor(top.person)] : []),
    { href: '/matches', en: 'Open matches', el: 'Άνοιγμα αντιστοιχίσεων' },
    { href: '/milestones', en: 'Open milestones', el: 'Άνοιγμα οροσήμων' },
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
  if (drafting || (/\b(need card|καρτα αναγκ)\b/.test(folded) && readNeeds().length === 0)) {
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
          ? 'Κανένα αδιάβαστο μήνυμα σε αυτόν τον browser. Άνοιξε τα Μηνύματα για τα τελευταία νήματα.'
          : 'Δεν υπάρχουν μηνύματα σε αυτόν τον browser. Άνοιξε τα Μηνύματα και ζήτα αναζήτηση λέξης στο νήμα.',
        href: '/messages',
        links: [{ href: '/messages', en: 'Open messages', el: 'Άνοιγμα μηνυμάτων' }],
      };
    }
    const lines = list.map((item) => `${item.senderName || item.senderId}: ${item.body.slice(0, 120)}`);
    return {
      tool: 'inbox',
      en: wantsUnread ? `Unread in this browser's store:\n${lines.join('\n')}` : `Latest messages in this browser's store:\n${lines.join('\n')}`,
      el: wantsUnread ? `Αδιάβαστα σε αυτόν τον browser:\n${lines.join('\n')}` : `Τελευταία μηνύματα σε αυτόν τον browser:\n${lines.join('\n')}`,
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
        : 'Δεν υπάρχουν μηνύματα σε αυτόν τον browser. Άνοιξε τα Μηνύματα και ζήτα αναζήτηση λέξης στο νήμα.',
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
  if (kinds.length && /\b(open|mark|set|ανοιχτ)\b/.test(folded)) {
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
        el: `${person.fullName} είχε ήδη ζητήσει σύνδεση — τώρα είστε συνδεδεμένοι.`,
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
  const creating = /\b(add|create|new|προσθεσ|δημιουργ)\b/.test(folded) && /\b(milestone|οροσημ)\b/.test(folded);
  if (creating) {
    const title = query.replace(/^(please\s+)?(add|create|new|προσθεσε|δημιουργησε)\s+(a\s+)?(milestone|οροσημο)\s*(called|named|με ονομα|με τίτλο)?\s*/i, '').trim() || 'New milestone';
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
  return {
    tool: 'round',
    en: `${round.name} ${round.instrument}: $${round.committedAmount.toLocaleString()} of $${round.targetAmount.toLocaleString()} (${pct}%).${runway != null ? ` About ${runway} months of runway.` : ''} Edit round on Fundraising, or tell me the new number.`,
    el: `${round.name} ${round.instrument}: $${round.committedAmount.toLocaleString()} από $${round.targetAmount.toLocaleString()} (${pct}%).${runway != null ? ` Περίπου ${runway} μήνες runway.` : ''} Επεξεργασία γύρου στη Χρηματοδότηση, ή πες μου το νέο νούμερο.`,
    href: '/fundraising',
    links: [{ href: '/fundraising', en: 'Open fundraising', el: 'Άνοιγμα χρηματοδότησης' }],
  };
}

function navigateResult(query: string): AssistantResult | null {
  const folded = fold(query);
  if (!/\b(open|go|show|take me|ανοιξ|πηγαιν|δειξ)\b/.test(folded) && !ASSISTANT_PAGES.some((page) => page.keys.some((key) => folded === key))) {
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
  const meeting = /\bmeeting\b/.test(fold(query));
  const title = meeting ? 'Investor meeting' : 'Studio event';
  const sessionId = `ses-studio-${Date.now()}`;
  let logged: LoggedWrite | null = null;
  const apply = (): AssistantResult => {
    const when = new Date();
    when.setDate(when.getDate() + 1);
    when.setHours(10, 0, 0, 0);
    addSession({
      id: sessionId,
      title,
      type: meeting ? 'Meeting' : 'Event',
      time: when.toISOString(),
      duration: '30m',
      location: meeting ? 'Video call' : 'Workspace',
      participants: [],
      priority: 'Medium',
    });
    logged = { kind: 'session', title: `Scheduled ${title}`, titleEl: `Προγραμματίστηκε: ${title}`, href: '/calendar' };
    logActivity({ ...logged, byAssistant: true });
    return {
      tool: 'session-add',
      en: `Put “${title}” on Calendar for tomorrow 10:00. Same list the Calendar page reads.`,
      el: `Μπήκε το «${title}» στο Ημερολόγιο για αύριο 10:00. Η ίδια λίστα με τη σελίδα Ημερολόγιο.`,
      href: '/calendar',
      links: [{ href: '/calendar', en: 'Open calendar', el: 'Άνοιγμα ημερολογίου' }],
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `Put “${title}” on Calendar for tomorrow 10:00?`, el: `Προσθήκη «${title}» στο Ημερολόγιο για αύριο 10:00;` },
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

function pipelineResult(): AssistantResult {
  return {
    tool: 'pipeline',
    en: 'Same pipeline as Fundraising: Identified, Contacted, Meeting, Due Diligence, Term Sheet, Closed, Passed. Open Fundraising to move a name between stages.',
    el: 'Ο ίδιος αγωγός με τη Χρηματοδότηση: Identified, Contacted, Meeting, Due Diligence, Term Sheet, Closed, Passed. Άνοιξε τη Χρηματοδότηση για να μετακινήσεις ένα όνομα.',
    href: '/fundraising',
    links: [{ href: '/fundraising', en: 'Open fundraising', el: 'Άνοιγμα χρηματοδότησης' }],
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
  const saved = readValue<string[]>('cfb.savedPerks', []);
  const apply = (): AssistantResult => {
    if (!saved.includes(perkId)) writeValue('cfb.savedPerks', [...saved, perkId]);
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
      undo: () => { writeValue('cfb.savedPerks', saved); },
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
  const title = query.replace(/^(please\s+)?(add|create|new)\s+(a\s+)?(task|todo)\s*(called|named|:)?\s*/i, '').trim() || 'New task';
  let created: StudioTask | null = null;
  let logged: LoggedWrite | null = null;
  const apply = (): AssistantResult => {
    created = addStudioTask(title);
    logged = { kind: 'milestone', title: `Added task ${title}`, titleEl: `Προστέθηκε εργασία: ${title}`, href: '/workspace' };
    logActivity({ ...logged, byAssistant: true });
    return {
      tool: 'task-add',
      en: `Added “${title}” to Workspace → Dashboard. Same board the Task button writes.`,
      el: `Προστέθηκε το «${title}» στο Workspace → Dashboard. Ο ίδιος πίνακας με το κουμπί Task.`,
      href: '/workspace',
      links: [{ href: '/workspace', en: 'Open workspace', el: 'Άνοιγμα χώρου εργασίας' }],
    };
  };
  if (!propose) return apply();
  return proposalResult(
    {
      summary: { en: `Add “${title}” to Workspace → Dashboard?`, el: `Προσθήκη «${title}» στο Workspace → Dashboard;` },
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
      ? 'Same list as the Events page: Startup Founders Networking Night (London, 28 Mar), Mastering the Seed Round Pitch (online, 2 Apr), FinTech Demo Day Q2 (New York, 15 Apr).'
      : 'Events shows every session published by the platform and members — newest first, with real RSVP counts. Open Events to register; anything you register for lands on your Calendar.',
    el: demoCopy
      ? 'Η ίδια λίστα με τη σελίδα Εκδηλώσεις: Startup Founders Networking Night (Λονδίνο, 28 Μαρ), Mastering the Seed Round Pitch (online, 2 Απρ), FinTech Demo Day Q2 (Νέα Υόρκη, 15 Απρ).'
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
  const asking = /\b(tell me about|what is|what's|whats|explain|who is|πληροφορ|τι ειναι|ποιος)\b/.test(folded);
  const hit = KNOWLEDGE.find((card) => (!card.demo || isDemoData()) && card.keys.some((key) => folded.includes(key)));
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
const COMMUNITY_CATALOG = [
  { id: 'fintech-founders', name: 'Fintech Founders', description: 'A space for entrepreneurs building the future of finance, banking, and payments.', category: 'Industry' },
  { id: 'ai-machine-learning', name: 'AI & Machine Learning', description: 'Discussing the latest in LLMs, computer vision, and AI-driven applications.', category: 'Technology' },
  { id: 'saas-builders', name: 'SaaS Builders', description: 'Everything about building, scaling, and selling software as a service.', category: 'Business Model' },
  { id: 'web3-crypto', name: 'Web3 & Crypto', description: 'Decentralized applications, blockchain protocols, and the future of the web.', category: 'Technology' },
];

function communitiesResult(query: string | undefined, propose: boolean): AssistantResult {
  const folded = fold(query || '');
  const joining = /\b(join|μπες|κανε join)\b/.test(folded);
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
      el: `Τρεις θέσεις πρόσκλησης είναι έτοιμες (${readInvites().length} σε αυτόν τον λογαριασμό). Στείλε το ${href} — είναι το ίδιο fit check 60″, και το Matches θα διαβάσει αυτά τα πεδία.`,
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
  const eventLineEn = isDemoData()
    ? 'register for Startup Founders Networking Night on Events (London, 28 Mar 2026)'
    : 'register for the next published session on Events';
  const eventLineEl = isDemoData()
    ? 'εγγράψου στο Startup Founders Networking Night στις Εκδηλώσεις (Λονδίνο, 28 Μαρ 2026)'
    : 'εγγράψου στην επόμενη δημοσιευμένη συνεδρία στις Εκδηλώσεις';
  return {
    tool: 'week-meet',
    en: who
      ? `This week: talk to ${who.fullName} (${who.headline}), then ${eventLineEn}. Same people Matches ranks; same list Events shows.`
      : `This week: open Matches, then ${eventLineEn}.`,
    el: who
      ? `Αυτή την εβδομάδα: μίλα με ${who.fullName} (${who.headline}), μετά ${eventLineEl}. Τα ίδια άτομα με το Matches.`
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
      el: 'Δεν υπάρχει fit check σε αυτόν τον browser. Πέντε ερωτήσεις, 60″, χωρίς είσοδο. Οι απαντήσεις γράφουν τα ίδια πέντε πεδία που βαθμολογεί το Matches.',
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
    en: 'I read the same lists as the rest of the studio. Try: “who is my best match”, “propose three people”, “draft a need card”, “what should I do first”, “search my messages for intro”, “set monthly burn to 18k”, “hide my email”, “change my headline to …”, “mark all notifications read”, or type /match /scout /need /next /inbox /plan /invite /round /quiz /overdue /help. Narrow people with role: location: skill: industry: stage: (Greek: ρόλος: τόπος: δεξιότητα: κλάδος: στάδιο:). Type @ to pin a person, /new to start over.',
    el: 'Διαβάζω τις ίδιες λίστες με την υπόλοιπη εφαρμογή. Δοκίμασε: «ποιος είναι η καλύτερη αντιστοίχιση», «πρότεινε τρεις», «γράψε κάρτα ανάγκης», «τι να κάνω πρώτα», «όρισε το burn σε 18k», «κρύψε το email μου», «όρισε την τοποθεσία μου σε …», «σήμανε όλες τις ειδοποιήσεις ως αναγνωσμένες», ή πληκτρολόγησε /match /scout /need /next /inbox /plan /help. Στένεψε ανθρώπους με role: location: skill: industry: stage: (ελληνικά: ρόλος: τόπος: δεξιότητα: κλάδος: στάδιο:). Πληκτρολόγησε @ για άτομο, /new για νέα συνομιλία.',
    links: [
      { href: '/matches', en: 'Matches', el: 'Αντιστοιχίσεις' },
      { href: '/milestones', en: 'Milestones', el: 'Ορόσημα' },
      { href: '/fundraising', en: 'Fundraising', el: 'Χρηματοδότηση' },
    ],
  };
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

export function runAssistant(text: string, profile: AssistantProfile | null, options?: { propose?: boolean }): AssistantResult {
  return attachSources(attachFollowUps(resolveAssistant(text, profile, options?.propose === true)));
}

function resolveAssistant(text: string, profile: AssistantProfile | null, propose: boolean): AssistantResult {
  const query = text.trim();
  const folded = fold(query);
  if (!query) return helpResult();

  const slash = folded.match(/^\/([a-z-]+)(?:\s+(.*))?$/);
  if (slash) {
    const cmd = slash[1];
    const rest = (slash[2] || '').trim();
    if (cmd === 'match' || cmd === 'matches') return matchesResult(profile, rest || 'who is my best match');
    if (cmd === 'scout') return scoutResult(profile);
    if (cmd === 'need') return needResult(rest || query, propose);
    if (cmd === 'next') return nextStepAssistant(profile);
    if (cmd === 'inbox') return inboxResult(rest || query);
    if (cmd === 'plan') return playbookResult(propose);
    if (cmd === 'invite') return inviteResult(propose);
    if (cmd === 'round') return roundResult();
    if (cmd === 'quiz') return fitCheckResult();
    if (cmd === 'overdue' || cmd === 'due') return milestonesResult(rest || 'what is overdue', propose);
    if (cmd === 'help') return helpResult();
  }

  const roundSet = parseRoundSet(query);
  if (roundSet) return roundSetResult(roundSet, propose);

  const settingsSet = parseSettingsSet(query);
  if (settingsSet) return settingsSetResult(settingsSet, propose);

  const profileSet = parseProfileSet(query);
  if (profileSet) return profileSetResult(profileSet, profile, propose);

  if (parseNotificationsRead(query)) return notificationsReadResult(propose);

  const person = namedPerson(query);
  if (person && /\b(why|γιατι)\b/.test(folded) && /\b(match|ταιριαζ)\b/.test(folded)) return matchDetailResult(profile, person);
  if (person && /\b(save|watch|αποθηκ)\b/.test(folded)) return saveOrConnect('save', person, propose);
  if (person && /\b(connect|request|intro|συνδεσ|αιτημ)\b/.test(folded)) return saveOrConnect('connect', person, propose);
  if (person && /\b(book|schedule|κλεισ|ραντεβ)\b/.test(folded)) return bookMentor(person, propose);
  if (/\b(still lack|team lack|founding team)\b/.test(folded) || hasStem(folded, 'τι λειπ', 'τι χρειαζεται η ομαδα')) return teamGapResult(profile);
  if ((/\b(propose|scout|do not send)\b/.test(folded) || hasStem(folded, 'προτειν', 'μην στειλ'))
    && (/\b(people|three|3|match)\b/.test(folded) || hasStem(folded, 'τρεις', 'συνιδρυτ', 'αντιστοιχ'))) return scoutResult(profile);
  if (hasStem(folded, 'need card', 'καρτα αναγκ', 'draft a need') || (hasStem(folded, 'need', 'καρτα', 'αναγκ') && hasStem(folded, 'draft', 'write', 'close', 'change', 'list', 'γραψ', 'κλεισ', 'αλλαξ'))) return needResult(query, propose);
  if (/\bsearch( my)? (messages?|inbox|thread)\b|\bunread\b.{0,30}\bmessages?\b|\bmessages?\b.{0,30}\bunread\b/.test(folded)
    || hasStem(folded, 'ψαξε') && hasStem(folded, 'μηνυμ')
    || hasStem(folded, 'αδιαβαστ') && hasStem(folded, 'μηνυμ')) return inboxResult(query);
  if (/\bopen to (a )?(co-?founder|investor|advisor)\b/.test(folded) || /ανοιχτ.{0,12}(συνιδρυτ|επενδυτ|συμβουλ)|ειμαι ανοιχτ/.test(folded)) return openToResult(query, propose);
  if (/\b(what should i do first|next step)\b/.test(folded) || hasStem(folded, 'τι να κανω')) return nextStepAssistant(profile);
  if (/\b(7-day|seven-day|playbook|match plan)\b/.test(folded) || hasStem(folded, 'πλανο 7')) return playbookResult(propose);
  if (/\b(invite 3|invite three|bring 3|bring three|1\+3|one plus three)\b/.test(folded) || (hasStem(folded, 'προσκαλεσ') && /\b3\b|τρεις/.test(folded))) return inviteResult(propose);
  if (/\b(meet this week|who should i meet)\b/.test(folded) || /ποιον.{0,20}εβδομαδ|αυτη την εβδομαδα/.test(folded)) return weekMeetResult(profile);
  if (/\b(fit check|archetype|quiz)\b/.test(folded) || hasStem(folded, 'τι ειδους')) return fitCheckResult();

  if (/\b(apply to|apply now|applying to)\b/.test(folded) && !/\b(what|which|how)\b/.test(folded)) return applyResult(query, propose);
  if (/\bclaim\b/.test(folded) && /\b(perk|aws|stripe|hubspot|notion|google cloud|gcp|intercom|slack|mercury|amazon web|παροχ)\b/.test(folded) && !/\b(what|which|how)\b/.test(folded)) {
    return claimPerkResult(query, propose);
  }
  if (/\brecord\b/.test(folded) && /\binvest/.test(folded)) return recordInvestmentResult(query, propose);
  if (/\b(add|create|new)\b/.test(folded) && /\b(task|todo)\b/.test(folded)) return addTaskResult(query, propose);

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
  if (/\b(new event|schedule a meeting|schedule a new event|add (a )?session)\b/.test(folded)) return sessionAddResult(query, propose);
  if (/\b(events?|meetups?|sessions?)\b/.test(folded) || hasStem(folded, 'εκδηλ', 'διοργανωσ', 'συνεδρ')) return eventsResult(query, propose);
  if (/\b(communities|community)\b/.test(folded) || hasStem(folded, 'κοινοτ')) return communitiesResult(query, propose);
  if (/\b(programs?|accelerator|bootcamp)\b/.test(folded) || hasStem(folded, 'προγραμ')) return programsResult();
  if (/\b(perks?|credits)\b/.test(folded) || hasStem(folded, 'παροχ')) return perksResult();
  if (/\b(legal|template|nda)\b/.test(folded) || hasStem(folded, 'νομικ')) return legalResult();
  if (/\b(courses?|learning|resources?)\b/.test(folded) || hasStem(folded, 'μαθημ', 'πορο')) return resourcesResult();
  if (/\b(milestones?|overdue|due)\b/.test(folded) || hasStem(folded, 'οροσημ', 'εκπροθεσμ')) return milestonesResult(query, propose);
  if (/\b(pipeline|funnel|due diligence|term sheet)\b/.test(folded)) return pipelineResult();
  if (/\b(rounds?|raise|runway|valuation)\b/.test(folded) || hasStem(folded, 'γυρο', 'χρηματοδ', 'επενδυτ')) return roundResult();
  if (/\b(today|status|brief|next)\b/.test(folded) || hasStem(folded, 'τι εκκρεμ', 'επομεν')) return briefingResult(profile);
  if (/\b(help|what can you)\b/.test(folded) || hasStem(folded, 'τι μπορεις')) return helpResult();

  return briefingResult(profile);
}

export function assistantContextBlock(profile: AssistantProfile | null): string {
  const brief = platformBriefing(profile);
  const matches = brief.ranked.slice(0, 3).map((row) => `${row.person.fullName} (${row.fit.score}%)`).join(', ');
  const overdue = brief.overdue.map((item) => item.title).join(', ') || 'none';
  return [
    `Viewer: ${profile?.fullName || 'Demo User'} · ${profile?.headline || ''} · ${profile?.industry || ''}`,
    `Top matches: ${matches || 'none scored'}`,
    `Overdue milestones: ${overdue}`,
    `Round: ${brief.round.name} ${brief.round.committedAmount}/${brief.round.targetAmount}`,
  ].join('\n');
}
