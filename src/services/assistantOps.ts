/**
 * Deterministic studio operator. The chat panel runs this first so every
 * page, list and score the assistant mentions is the same data the rest of
 * the app already shows. Gemini only rewrites the wording.
 */
import { CAST, castByRole, findCast, placeOf, type CastMember } from '../data/cast';
import { compatibility, fromCast, fromProfile, listWords, rankPeople, type CompatibilityInput } from '../lib/compatibility';
import {
  addSession,
  addStudioTask,
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
  saveProfile,
  saveRequest,
  searchChat,
  setId,
  trackApplication,
  upsertMilestone,
  closeNeed,
  upsertNeed,
  writeMatchFilters,
  writeOpenTo,
  writeRound,
  type NeedCard,
  type OpenToKind,
} from '../lib/localLists';
import { milestoneService } from './milestoneService';
import { readFitCheck } from '../lib/fitCheck';
import { TEAM_AREAS, teamGaps } from '../lib/teamGaps';
import { studioNextStep } from '../lib/nextStep';

export type AssistantProfile = CompatibilityInput & {
  fullName?: string;
  headline?: string;
  location?: string | null;
};

export type AssistantLink = { href: string; en: string; el: string };

export type AssistantFollowUp = { en: string; el: string };

export type AssistantResult = {
  en: string;
  el: string;
  href?: string;
  links: AssistantLink[];
  tool: string;
  followUps?: AssistantFollowUp[];
};

const PAGES: { keys: string[]; href: string; en: string; el: string }[] = [
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
  const exact = PAGES.find((page) => page.href === path);
  if (exact) return { href: exact.href, en: exact.en, el: exact.el };
  const nested = PAGES.find((page) => page.href !== '/' && path.startsWith(`${page.href}/`));
  if (nested) return { href: nested.href, en: nested.en, el: nested.el };
  return { href: '/dashboard', en: 'Dashboard', el: 'Πίνακας' };
}

type KnowledgeCard = { keys: string[]; href: string; en: string; el: string };

const KNOWLEDGE: KnowledgeCard[] = [
  { keys: ['series a scout', 'scout network'], href: '/fundraising', en: 'Series A Scout Network is a rolling Sequoia intro on Fundraising → Opportunities ($5M+, AI/SaaS). Open the tab and apply, or I can walk the round numbers.', el: 'Το Series A Scout Network είναι rolling intro της Sequoia στη Χρηματοδότηση → Ευκαιρίες ($5M+, AI/SaaS). Άνοιξε την καρτέλα ή ρώτα για τον γύρο.' },
  { keys: ['impact investor roundtable'], href: '/fundraising', en: 'Impact Investor Roundtable is a pitch event on Fundraising → Opportunities ($1–3M, 12 May 2026, ESG). Same list as the Opportunities tab.', el: 'Το Impact Investor Roundtable είναι pitch event στη Χρηματοδότηση → Ευκαιρίες ($1–3M, 12 Μαΐ 2026).' },
  { keys: ['founder grant', 'stripe foundation'], href: '/fundraising', en: 'Founder Grant — Q2 2026 is a $50k non-dilutive Stripe Foundation grant on Fundraising → Opportunities (deadline 30 May 2026).', el: 'Το Founder Grant — Q2 2026 είναι μη αραιωτική επιχορήγηση $50k από Stripe Foundation στη Χρηματοδότηση → Ευκαιρίες (30 Μαΐ 2026).' },
  { keys: ['eu horizon', 'horizon innovation'], href: '/fundraising', en: 'EU Horizon Innovation Fund is a €250k grant from the European Commission on Fundraising → Opportunities (1 Jun 2026, DeepTech/EU).', el: 'Το EU Horizon Innovation Fund είναι επιχορήγηση €250k από την Ευρωπαϊκή Επιτροπή στη Χρηματοδότηση → Ευκαιρίες (1 Ιουν 2026).' },
  { keys: ['debt facility', 'clearco', 'revenue-based'], href: '/fundraising', en: 'Debt Facility — Revenue-Based is a Clearco line up to $2M on Fundraising → Opportunities (rolling, SaaS with MRR over $30k).', el: 'Το Debt Facility — Revenue-Based είναι γραμμή Clearco έως $2M στη Χρηματοδότηση → Ευκαιρίες (rolling).' },
  { keys: ['sequoia'], href: '/fundraising', en: 'Sequoia Capital is in the Fundraising investor list and pipeline (Due Diligence). VC, SaaS/FinTech/AI, checks $500k–$5M. Open Fundraising to move the stage or send a note.', el: 'Η Sequoia Capital είναι στη λίστα επενδυτών και στον αγωγό (Due Diligence). VC, SaaS/FinTech/AI, $500k–$5M. Άνοιξε τη Χρηματοδότηση για το στάδιο.' },
  { keys: ['andreessen', 'a16z'], href: '/fundraising', en: 'Andreessen Horowitz is on Fundraising → Investors (Contacted). VC, Consumer/Enterprise/Bio, $1M–$50M.', el: 'Η Andreessen Horowitz είναι στη Χρηματοδότηση → Επενδυτές (Contacted). VC, $1M–$50M.' },
  { keys: ['first round'], href: '/fundraising', en: 'First Round Capital is Identified on the Fundraising pipeline. Seed specialist, $250k–$3M.', el: 'Η First Round Capital είναι Identified στον αγωγό Χρηματοδότησης. Seed, $250k–$3M.' },
  { keys: ['y combinator', 'yc s26'], href: '/fundraising', en: 'Y Combinator S26 is on Fundraising → Programs: $500k accelerator, deadline 19 Apr 2026, 96% match.', el: 'Το Y Combinator S26 είναι στη Χρηματοδότηση → Προγράμματα: $500k, προθεσμία 19 Απρ 2026, 96% match.' },
  { keys: ['techstars'], href: '/fundraising', en: 'Techstars Sustainability is on Fundraising → Programs: $120k, NYC, deadline 1 May 2026.', el: 'Το Techstars Sustainability είναι στη Χρηματοδότηση → Προγράμματα: $120k, NYC, 1 Μαΐ 2026.' },
  { keys: ['nsf sbir'], href: '/fundraising', en: 'NSF SBIR Phase I is a $275k US grant on Fundraising → Programs (18 Jun 2026).', el: 'Το NSF SBIR Phase I είναι επιχορήγηση $275k στη Χρηματοδότηση → Προγράμματα (18 Ιουν 2026).' },
  { keys: ['founders factory'], href: '/fundraising', en: 'Founders Factory EU is a studio on Fundraising → Programs (€150k, London/Paris, 10 Jul 2026).', el: 'Το Founders Factory EU είναι studio στη Χρηματοδότηση → Προγράμματα (€150k, 10 Ιουλ 2026).' },
  { keys: ['fintech accelerator'], href: '/programs', en: 'FinTech Accelerator Q3 2026 is on Programs: $120k, 12 weeks, deadline 15 Apr 2026. Same card as the Programs page.', el: 'Το FinTech Accelerator Q3 2026 είναι στα Προγράμματα: $120k, 12 εβδομάδες, 15 Απρ 2026.' },
  { keys: ['cleantech innovation'], href: '/programs', en: 'CleanTech Innovation Grant is on Programs: $50k non-dilutive, deadline 1 May 2026.', el: 'Το CleanTech Innovation Grant είναι στα Προγράμματα: $50k μη αραιωτικά, 1 Μαΐ 2026.' },
  { keys: ['saas growth bootcamp', 'founders academy'], href: '/programs', en: 'SaaS Growth Bootcamp / Founders Academy is on Programs: 4 weeks, deadline 30 Mar 2026.', el: 'Το SaaS Growth Bootcamp είναι στα Προγράμματα: 4 εβδομάδες, 30 Μαρ 2026.' },
  { keys: ['networking night', 'startup founders networking'], href: '/events', en: 'Startup Founders Networking Night is on Events: London, 28 Mar 2026, 6–9 PM. Register on the Events page.', el: 'Το Startup Founders Networking Night είναι στις Εκδηλώσεις: Λονδίνο, 28 Μαρ 2026.' },
  { keys: ['seed round pitch', 'mastering the seed'], href: '/events', en: 'Mastering the Seed Round Pitch is an online workshop on Events, 2 Apr 2026, hosted by Sarah Chen.', el: 'Το Mastering the Seed Round Pitch είναι online workshop στις Εκδηλώσεις, 2 Απρ 2026.' },
  { keys: ['fintech demo day'], href: '/events', en: 'FinTech Demo Day Q2 is on Events: New York, 15 Apr 2026, 10 AM–1 PM.', el: 'Το FinTech Demo Day Q2 είναι στις Εκδηλώσεις: Νέα Υόρκη, 15 Απρ 2026.' },
  { keys: ['global startup summit'], href: '/events', en: 'Global Startup Summit 2026 is the featured event on Events. Scroll the list or ask me to host a session.', el: 'Το Global Startup Summit 2026 είναι το featured στις Εκδηλώσεις. Άνοιξε τη λίστα ή ρώτα να διοργανώσουμε.' },
  { keys: ['aws activate', 'amazon web services'], href: '/perks', en: 'AWS Activate through CoFounderBay is on Perks: up to $100k credits plus training. Claim it on the Perks page.', el: 'Το AWS Activate μέσω CoFounderBay είναι στις Παροχές: έως $100k credits. Κάνε claim στη σελίδα Παροχές.' },
  { keys: ['readiness score'], href: '/insights', en: 'Readiness Score lives on Insights (and Profile). Teams over 80% are modeled as 3× more likely to close in six months. Open Profile to improve the score.', el: 'Το Readiness Score είναι στα Insights και στο Προφίλ. Πάνω από 80% μοντελοποιείται 3× πιθανότητα κλεισίματος σε έξι μήνες.' },
  { keys: ['articles of incorporation', 'founder stock', 'safe agreement', 'mutual nda'], href: '/legal', en: 'That template is on Legal Hub, same cards as Incorporation / Fundraising Legal. Download or preview there, or book legal office hours.', el: 'Αυτό το πρότυπο είναι στο Legal Hub. Κατέβασέ το από εκεί ή κλείσε legal office hours.' },
  { keys: ['legal office hours', 'book legal'], href: '/legal', en: 'Legal office hours are 15 minutes with partner firms on Legal Hub. Open that page and use Book a Session — I keep the same firms: Wilson Sonsini, Gunderson Dettmer, Cooley.', el: 'Τα legal office hours είναι 15 λεπτά με partner firms στο Legal Hub. Άνοιξε τη σελίδα και πάτα Book a Session.' },
  { keys: ['wilson sonsini', 'gunderson dettmer', 'cooley llp'], href: '/legal', en: 'Wilson Sonsini, Gunderson Dettmer and Cooley are the partner firms on Legal Hub. Book office hours from that sidebar.', el: 'Wilson Sonsini, Gunderson Dettmer και Cooley είναι τα partner firms στο Legal Hub.' },
  { keys: ['start a voice call', 'start a video call', 'how do i start a voice', 'how do i start a video'], href: '/messages', en: 'Call and Video on Messages do not start a live line. They open this assistant so you can draft the first line or book a Calendar slot instead. I can also search the thread if you say “search my messages for…”.', el: 'Τα Call και Video στα Μηνύματα δεν ανοίγουν ζωντανή κλήση. Ανοίγουν αυτόν τον βοηθό για το πρώτο μήνυμα ή ένα ραντεβού στο Ημερολόγιο. Μπορώ και να ψάξω το νήμα αν πεις «ψάξε στα μηνύματα…».' },
  { keys: ['list a partner service', 'list your service'], href: '/resources', en: 'Partner services are listed on Resources → Services. Tell me the service name and price and I will point you at that tab.', el: 'Οι υπηρεσίες partners είναι στους Πόρους → Services. Πες όνομα και τιμή.' },
  { keys: ['post a job', 'post a role'], href: '/resources', en: 'Jobs sit on Resources → Jobs, same cards as Lead Full-Stack Engineer, Growth Marketing Manager, Product Design Intern. Open that tab to post or apply.', el: 'Οι θέσεις είναι στους Πόρους → Jobs. Άνοιξε την καρτέλα για καταχώριση ή αίτηση.' },
  { keys: ['foundations of fundraising', 'scalable sales engine', 'legal essentials for startups', 'product-market fit workshop'], href: '/resources', en: 'That course is on Resources → Learning, same cards as the Learning Hub. Start Learning opens this assistant with the course title.', el: 'Αυτό το μάθημα είναι στους Πόρους → Learning.' },
  { keys: ['create a community'], href: '/communities', en: 'Create stays on Communities. Name the space, pick a category, and I will keep it next to Fintech Founders, AI & Machine Learning, SaaS Builders, and Web3 & Crypto. Open Communities and use Create — or tell me the name.', el: 'Η δημιουργία μένει στις Κοινότητες. Δώσε όνομα και κατηγορία. Άνοιξε Κοινότητες και πάτα Create — ή πες μου το όνομα.' },
  { keys: ['fintech founders', 'ai & machine learning', 'saas builders', 'web3 & crypto'], href: '/communities', en: 'That community is on the Communities page with the same members and posts you see on the cards. Join there, or Enter Community to open Messages.', el: 'Αυτή η κοινότητα είναι στη σελίδα Κοινότητες. Κάνε Join εκεί, ή Enter για τα Μηνύματα.' },
  { keys: ['export my pitch', 'share my pitch', 'pitch deck', 'pitch slide', 'cover & hook'], href: '/founder-tools', en: 'Pitch lives on Founder Tools → Pitch: Cover & Hook, Problem, Solution, Market Size, Business Model, Traction, Team, Ask. Export, share, or send to a mentor from that tab — I can also book a mentor.', el: 'Το pitch είναι στα Εργαλεία ιδρυτή → Pitch. Export, share ή αποστολή σε μέντορα από εκεί. Μπορώ και να κλείσω μέντορα.' },
  { keys: ['lean canvas'], href: '/workspace', en: 'Lean Canvas is on Workspace → Canvas. Save keeps the draft on that page; AI Refine opens this assistant on the same nine boxes.', el: 'Το Lean Canvas είναι στο Workspace → Canvas. Το Save κρατά το draft εκεί· το AI Refine ανοίγει αυτόν τον βοηθό.' },
  { keys: ['workspace assets', 'project assets'], href: '/workspace', en: 'Project assets sit on Workspace → Dashboard: Pitch Deck v2.pdf, Brand Guidelines.zip, Market Research.docx. Open Workspace to download, or Founder Tools for the live pitch.', el: 'Τα αρχεία είναι στο Workspace → Dashboard. Άνοιξε Workspace ή τα Εργαλεία ιδρυτή για το live pitch.' },
  { keys: ['ecosphere'], href: '/discovery', en: 'EcoSphere Accelerator is on Discovery → Opportunities: 12 weeks, remote, sustainability, deadline 30 Oct. Same card as Explore.', el: 'Το EcoSphere Accelerator είναι στην Εξερεύνηση → Ευκαιρίες: 12 εβδομάδες, remote, 30 Οκτ.' },
  { keys: ['web3 founders grant'], href: '/discovery', en: 'Web3 Founders Grant is on Discovery → Opportunities: equity-free funding for core infrastructure, deadline 15 Nov.', el: 'Το Web3 Founders Grant είναι στην Εξερεύνηση → Ευκαιρίες: χωρίς equity, 15 Νοε.' },
  { keys: ['ai innovation lab'], href: '/discovery', en: 'AI Innovation Lab is on Discovery → Opportunities: Berlin incubator for enterprise automation, deadline 5 Dec.', el: 'Το AI Innovation Lab είναι στην Εξερεύνηση → Ευκαιρίες: Βερολίνο, 5 Δεκ.' },
  { keys: ['founder mixer'], href: '/events', en: 'Founder Mixer SF is on Discovery → Upcoming Sessions and Events. Register on Events to put it on Calendar.', el: 'Το Founder Mixer SF είναι στην Εξερεύνηση και στις Εκδηλώσεις. Κάνε Register για το Ημερολόγιο.' },
  { keys: ['ai product workshop'], href: '/events', en: 'AI Product Workshop is on Discovery → Upcoming Sessions (20 Oct, virtual). Register from Events.', el: 'Το AI Product Workshop είναι στην Εξερεύνηση (20 Οκτ, virtual).' },
  { keys: ['seed funding webinar'], href: '/events', en: 'Seed Funding Webinar is on Discovery → Upcoming Sessions (25 Oct). Same ecosystem list.', el: 'Το Seed Funding Webinar είναι στην Εξερεύνηση (25 Οκτ).' },
];

function fold(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function namedPerson(text: string): CastMember | undefined {
  const folded = fold(text);
  return CAST.find((person) => folded.includes(fold(person.fullName)))
    ?? CAST.find((person) => folded.includes(fold(person.fullName.split(' ')[0] || '')));
}

function candidates(): CastMember[] {
  return CAST.filter((person) => person.role === 'Founder' || person.role === 'Co-Founder Candidate');
}

function meInput(profile: AssistantProfile | null): CompatibilityInput {
  return fromProfile(profile);
}

function linkFor(person: CastMember): AssistantLink {
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
  const folded = fold(query);
  let pool = candidates();
  if (/\btech|engineer|typescript|react|τεχνικ/.test(folded)) {
    pool = pool.filter((person) => person.skills.some((skill) => /typescript|react|node|python|mlops|embedded/i.test(skill)));
    writeMatchFilters({ q: query, role: '', stage: '', commitment: '', location: '', skill: 'TypeScript' });
  }
  if (/\bsales|growth|πωλησ|αναπτυξ/.test(folded)) {
    pool = pool.filter((person) => person.skills.some((skill) => /sales|growth|marketing/i.test(skill)));
  }
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

function matchDetailResult(profile: AssistantProfile | null, person: CastMember): AssistantResult {
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

function needResult(query: string): AssistantResult {
  const folded = fold(query);
  const closing = /\b(close|κλεισ)\b/.test(folded) && /\b(need|card|καρτα|αναγκ)\b/.test(folded);
  if (closing) {
    const open = readNeeds().filter((item) => item.status === 'open');
    const card = open[0];
    if (!card) {
      return {
        tool: 'need',
        en: 'No open need card to close. Say “draft a need card for a technical co-founder”.',
        el: 'Δεν υπάρχει ανοιχτή κάρτα ανάγκης. Πες «γράψε κάρτα ανάγκης για τεχνικό συνιδρυτή».',
        href: '/network',
        links: [{ href: '/network', en: 'Open network', el: 'Άνοιγμα δικτύου' }],
      };
    }
    closeNeed(card.id);
    logActivity({ kind: 'profile', title: `Closed need: ${card.missing}`, titleEl: `Έκλεισε ανάγκη: ${card.missing}`, href: '/network', byAssistant: true });
    return {
      tool: 'need',
      en: `Closed “${card.missing}”. Other cards stay as they are.`,
      el: `Έκλεισε το «${card.missing}». Οι άλλες κάρτες μένουν όπως είναι.`,
      href: '/network',
      links: [{ href: '/network', en: 'Open network', el: 'Άνοιγμα δικτύου' }],
    };
  }
  const drafting = /\b(draft|write|create|new|γραψ|φτιαξ|δημιουργ)\b/.test(folded);
  if (drafting || (/\b(need card|καρτα αναγκ)\b/.test(folded) && readNeeds().length === 0)) {
    const missing = query
      .replace(/^(please\s+)?(draft|write|create|new|γραψε|φτιαξε|δημιουργησε)\s+(a\s+)?(need card|καρτα αναγκης)?\s*(for|για)?\s*/i, '')
      .trim() || 'a co-founder';
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
    logActivity({ kind: 'profile', title: `Need card: ${missing}`, titleEl: `Κάρτα ανάγκης: ${missing}`, href: '/network', byAssistant: true });
    return {
      tool: 'need',
      en: `Need card is open: exists — ${card.exists}. Outcome — ${card.outcome}. Missing — ${card.missing}. Same list the next-step strip reads. I did not notify anyone.`,
      el: `Η κάρτα ανάγκης είναι ανοιχτή: υπάρχει — ${card.exists}. Αποτέλεσμα — ${card.outcome}. Λείπει — ${card.missing}. Η ίδια λίστα με το επόμενο βήμα. Δεν ειδοποίησα κανέναν.`,
      href: '/network',
      links: [{ href: '/network', en: 'Open network', el: 'Άνοιγμα δικτύου' }],
    };
  }
  const list = readNeeds();
  if (list.length === 0) {
    return {
      tool: 'need',
      en: 'No need cards yet. One card, three sentences: what exists, the outcome, who is missing. Say “draft a need card for a technical co-founder”.',
      el: 'Δεν υπάρχουν κάρτες ανάγκης. Μία κάρτα, τρεις προτάσεις: τι υπάρχει, το αποτέλεσμα, ποιος λείπει. Πες «γράψε κάρτα ανάγκης για τεχνικό συνιδρυτή».',
      href: '/network',
      links: [{ href: '/network', en: 'Open network', el: 'Άνοιγμα δικτύου' }],
    };
  }
  const linesEn = list.slice(0, 6).map((item) => `${item.status === 'open' ? 'Open' : 'Closed'} · missing ${item.missing} · ${item.outcome}`);
  const linesEl = list.slice(0, 6).map((item) => `${item.status === 'open' ? 'Ανοιχτή' : 'Κλειστή'} · λείπει ${item.missing} · ${item.outcome}`);
  return {
    tool: 'need',
    en: `Your need cards:\n${linesEn.join('\n')}`,
    el: `Οι κάρτες ανάγκης σου:\n${linesEl.join('\n')}`,
    href: '/network',
    links: [{ href: '/network', en: 'Open network', el: 'Άνοιγμα δικτύου' }],
  };
}

function inboxResult(query: string): AssistantResult {
  const needle = query
    .replace(/^(please\s+)?(search( my)? (messages?|inbox|thread)|ψαξε( στα)? μηνυμ(ατα)?)\s*(for|για)?\s*/i, '')
    .trim();
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
  const next = studioNextStep(fromProfile(profile));
  return {
    tool: 'next',
    en: next.en,
    el: next.el,
    href: next.href,
    links: [{ href: next.href, en: 'Open that page', el: 'Άνοιγμα της σελίδας' }],
  };
}

function openToResult(query: string): AssistantResult {
  const folded = fold(query);
  const kinds: OpenToKind[] = [];
  if (/\bco-?founder|συνιδρυτ/.test(folded)) kinds.push('cofounder');
  if (/\binvestor|επενδυτ/.test(folded)) kinds.push('investor');
  if (/\badvisor|mentor|συμβουλ|μεντορ/.test(folded)) kinds.push('advisor');
  if (kinds.length && /\b(open|mark|set|ανοιχτ)\b/.test(folded)) {
    writeOpenTo([...new Set([...readOpenTo(), ...kinds])]);
    logActivity({ kind: 'settings', title: `Open to ${kinds.join(', ')}`, titleEl: `Ανοιχτός σε ${kinds.join(', ')}`, href: '/settings', byAssistant: true });
    return {
      tool: 'open-to',
      en: `Settings now marks you open to ${readOpenTo().join(', ')}. Matching reads this the next time you scout.`,
      el: `Οι Ρυθμίσεις σε έχουν ανοιχτό σε ${readOpenTo().join(', ')}. Η αντιστοίχιση το διαβάζει στο επόμενο scout.`,
      href: '/settings',
      links: [{ href: '/settings', en: 'Open settings', el: 'Άνοιγμα ρυθμίσεων' }],
    };
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

function saveOrConnect(kind: 'save' | 'connect', person: CastMember): AssistantResult {
  const card = {
    id: person.id,
    fullName: person.fullName,
    role: person.role,
    industry: person.industry,
    location: placeOf(person),
    note: person.headline,
  };
  if (kind === 'save') {
    saveProfile(card);
    logActivity({ kind: 'profile', title: `Saved ${person.fullName}`, titleEl: `Αποθηκεύτηκε ο/η ${person.fullName}`, href: `/profile/${person.id}`, byAssistant: true });
    return {
      tool: 'save',
      en: `${person.fullName} is on your saved list. Open Network to compare notes.`,
      el: `Ο/Η ${person.fullName} είναι στη λίστα αποθηκευμένων. Άνοιξε το Δίκτυο για τις σημειώσεις.`,
      href: '/network',
      links: [linkFor(person), { href: '/network', en: 'Open network', el: 'Άνοιγμα δικτύου' }],
    };
  }
  saveRequest({ ...card, status: 'pending', message: 'Sent from the studio assistant' });
  logActivity({ kind: 'request', title: `Requested ${person.fullName}`, titleEl: `Αίτημα προς ${person.fullName}`, href: `/profile/${person.id}`, byAssistant: true });
  return {
    tool: 'connect',
    en: `Connection request queued for ${person.fullName}. It shows on Network.`,
    el: `Το αίτημα σύνδεσης για ${person.fullName} είναι στη λίστα. Φαίνεται στο Δίκτυο.`,
    href: '/network',
    links: [linkFor(person), { href: '/network', en: 'Open network', el: 'Άνοιγμα δικτύου' }],
  };
}

function mentorsResult(query: string): AssistantResult {
  const folded = fold(query);
  let mentors = castByRole('Mentor');
  if (/\bfund|pitch|raise|χρηματοδ|pitch/.test(folded)) {
    mentors = mentors.filter((person) => (person.expertise ?? []).some((item) => /fund|pitch|strategy/i.test(item)));
  } else if (/\bproduct|προϊον/.test(folded)) {
    mentors = mentors.filter((person) => (person.expertise ?? []).some((item) => /product/i.test(item)));
  } else if (/\bgrowth|market|αναπτυξ/.test(folded)) {
    mentors = mentors.filter((person) => (person.expertise ?? []).some((item) => /growth|market/i.test(item)));
  } else if (/\bengine|tech|τεχνικ/.test(folded)) {
    mentors = mentors.filter((person) => (person.expertise ?? []).some((item) => /engineering|security|team/i.test(item)));
  }
  if (mentors.length === 0) mentors = castByRole('Mentor');
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

function milestonesResult(query: string): AssistantResult {
  const folded = fold(query);
  const creating = /\b(add|create|new|προσθεσ|δημιουργ)\b/.test(folded) && /\b(milestone|οροσημ)\b/.test(folded);
  if (creating) {
    const title = query.replace(/^(please\s+)?(add|create|new|προσθεσε|δημιουργησε)\s+(a\s+)?(milestone|οροσημο)\s*(called|named|με ονομα|με τίτλο)?\s*/i, '').trim() || 'New milestone';
    const due = new Date();
    due.setDate(due.getDate() + 14);
    const created = {
      id: `m-${Date.now().toString(36)}`,
      title,
      description: 'Created from the studio assistant.',
      targetDate: due.toISOString().slice(0, 10),
      status: 'Planned' as const,
      category: 'Product' as const,
      priority: 'Medium' as const,
      progress: 0,
      tasks: [],
      ownerId: 'demo-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    upsertMilestone(created);
    logActivity({ kind: 'milestone', title: `Added ${title}`, titleEl: `Προστέθηκε: ${title}`, href: '/milestones', byAssistant: true });
    return {
      tool: 'milestone-add',
      en: `Added “${title}” to Milestones, due in two weeks. Open the board to change the date.`,
      el: `Προστέθηκε το «${title}» στα Ορόσημα, σε δύο εβδομάδες. Άνοιξε τον πίνακα για την ημερομηνία.`,
      href: '/milestones',
      links: [{ href: '/milestones', en: 'Open milestones', el: 'Άνοιγμα οροσήμων' }],
    };
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

function roundResult(): AssistantResult {
  const round = readRound();
  const runway = round.monthlyBurn > 0 ? Math.floor(round.cashOnHand / round.monthlyBurn) : null;
  const pct = round.targetAmount > 0 ? Math.round((round.committedAmount / round.targetAmount) * 100) : 0;
  return {
    tool: 'round',
    en: `${round.name} ${round.instrument}: $${round.committedAmount.toLocaleString()} of $${round.targetAmount.toLocaleString()} (${pct}%).${runway != null ? ` About ${runway} months of runway.` : ''} Open Fundraising to edit the numbers.`,
    el: `${round.name} ${round.instrument}: $${round.committedAmount.toLocaleString()} από $${round.targetAmount.toLocaleString()} (${pct}%).${runway != null ? ` Περίπου ${runway} μήνες runway.` : ''} Άνοιξε τη Χρηματοδότηση για να αλλάξεις τα νούμερα.`,
    href: '/fundraising',
    links: [{ href: '/fundraising', en: 'Open fundraising', el: 'Άνοιγμα χρηματοδότησης' }],
  };
}

function navigateResult(query: string): AssistantResult | null {
  const folded = fold(query);
  if (!/\b(open|go|show|take me|ανοιξ|πηγαιν|δειξ)\b/.test(folded) && !PAGES.some((page) => page.keys.some((key) => folded === key))) {
    return null;
  }
  const page = PAGES.find((item) => item.keys.some((key) => folded.includes(key)));
  if (!page) return null;
  return {
    tool: 'navigate',
    en: `Opening ${page.en}.`,
    el: `Άνοιγμα: ${page.el}.`,
    href: page.href,
    links: [{ href: page.href, en: page.en, el: page.el }],
  };
}

function bookMentor(person: CastMember): AssistantResult {
  const when = new Date();
  when.setDate(when.getDate() + 3);
  when.setHours(10, 0, 0, 0);
  addSession({
    id: `ses-${person.id}-${Date.now()}`,
    title: `Mentorship · ${person.fullName}`,
    type: 'Mentorship',
    time: when.toISOString(),
    duration: '30m',
    location: 'Video call',
    participants: [person.fullName],
    priority: 'High',
  });
  setId(listKeys.mentors, person.id, true);
  logActivity({ kind: 'session', title: `Booked ${person.fullName}`, titleEl: `Κλείστηκε συνάντηση με ${person.fullName}`, href: '/calendar', byAssistant: true });
  return {
    tool: 'book',
    en: `Booked a 30-minute session with ${person.fullName} in three days. It is on the Calendar.`,
    el: `Κλείστηκε συνάντηση 30 λεπτών με ${person.fullName} σε τρεις μέρες. Είναι στο Ημερολόγιο.`,
    href: '/calendar',
    links: [{ href: '/calendar', en: 'Open calendar', el: 'Άνοιγμα ημερολογίου' }, linkFor(person)],
  };
}

function sessionAddResult(query: string): AssistantResult {
  const meeting = /\bmeeting\b/.test(fold(query));
  const when = new Date();
  when.setDate(when.getDate() + 1);
  when.setHours(10, 0, 0, 0);
  const title = meeting ? 'Investor meeting' : 'Studio event';
  addSession({
    id: `ses-studio-${Date.now()}`,
    title,
    type: meeting ? 'Meeting' : 'Event',
    time: when.toISOString(),
    duration: '30m',
    location: meeting ? 'Video call' : 'Workspace',
    participants: ['Demo User'],
    priority: 'Medium',
  });
  logActivity({ kind: 'session', title: `Scheduled ${title}`, titleEl: `Προγραμματίστηκε: ${title}`, href: '/calendar', byAssistant: true });
  return {
    tool: 'session-add',
    en: `Put “${title}” on Calendar for tomorrow 10:00. Same list the Calendar page reads.`,
    el: `Μπήκε το «${title}» στο Ημερολόγιο για αύριο 10:00. Η ίδια λίστα με τη σελίδα Ημερολόγιο.`,
    href: '/calendar',
    links: [{ href: '/calendar', en: 'Open calendar', el: 'Άνοιγμα ημερολογίου' }],
  };
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

function applyResult(query: string): AssistantResult {
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
  trackApplication(title, type);
  logActivity({ kind: 'application', title: `Applied to ${title}`, titleEl: `Αίτηση: ${title}`, href: '/fundraising', byAssistant: true });
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
}

function claimPerkResult(query: string): AssistantResult {
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
  setId(listKeys.perks, hit.id, true);
  logActivity({ kind: 'perk', title: `Claimed ${hit.name}`, titleEl: `Διεκδικήθηκε: ${hit.name}`, href: '/perks', byAssistant: true });
  return {
    tool: 'claim-perk',
    en: `${hit.name} is marked claimed on Perks — same list the page reads.`,
    el: `Το ${hit.name} σημειώθηκε ως claimed στις Παροχές — η ίδια λίστα με τη σελίδα.`,
    href: '/perks',
    links: [{ href: '/perks', en: 'Open perks', el: 'Άνοιγμα παροχών' }],
  };
}

function recordInvestmentResult(query: string): AssistantResult {
  const amount = parseMoney(fold(query)) ?? 50_000;
  const round = writeRound({ committedAmount: readRound().committedAmount + amount });
  logActivity({ kind: 'round', title: `Recorded $${amount.toLocaleString()}`, titleEl: `Καταγράφηκε $${amount.toLocaleString()}`, href: '/fundraising', byAssistant: true });
  const pct = round.targetAmount > 0 ? Math.round((round.committedAmount / round.targetAmount) * 100) : 0;
  return {
    tool: 'record-investment',
    en: `Added $${amount.toLocaleString()} to ${round.name}. Now $${round.committedAmount.toLocaleString()} of $${round.targetAmount.toLocaleString()} (${pct}%). Same numbers Fundraising shows.`,
    el: `Προστέθηκαν $${amount.toLocaleString()} στον ${round.name}. Τώρα $${round.committedAmount.toLocaleString()} από $${round.targetAmount.toLocaleString()} (${pct}%). Τα ίδια νούμερα με τη Χρηματοδότηση.`,
    href: '/fundraising',
    links: [{ href: '/fundraising', en: 'Open fundraising', el: 'Άνοιγμα χρηματοδότησης' }],
  };
}

function addTaskResult(query: string): AssistantResult {
  const title = query.replace(/^(please\s+)?(add|create|new)\s+(a\s+)?(task|todo)\s*(called|named|:)?\s*/i, '').trim() || 'New task';
  addStudioTask(title);
  logActivity({ kind: 'milestone', title: `Added task ${title}`, titleEl: `Προστέθηκε εργασία: ${title}`, href: '/workspace', byAssistant: true });
  return {
    tool: 'task-add',
    en: `Added “${title}” to Workspace → Dashboard. Same board the Task button writes.`,
    el: `Προστέθηκε το «${title}» στο Workspace → Dashboard. Ο ίδιος πίνακας με το κουμπί Task.`,
    href: '/workspace',
    links: [{ href: '/workspace', en: 'Open workspace', el: 'Άνοιγμα χώρου εργασίας' }],
  };
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

function eventsResult(query: string): AssistantResult {
  const folded = fold(query);
  if (/\bhost|διοργανωσ|create an event|how do i host/.test(folded)) {
    return sessionAddResult('Schedule a new event on my calendar');
  }
  return {
    tool: 'events',
    en: 'Same list as the Events page: Startup Founders Networking Night (London, 28 Mar), Mastering the Seed Round Pitch (online, 2 Apr), FinTech Demo Day Q2 (New York, 15 Apr).',
    el: 'Η ίδια λίστα με τη σελίδα Εκδηλώσεις: Startup Founders Networking Night (Λονδίνο, 28 Μαρ), Mastering the Seed Round Pitch (online, 2 Απρ), FinTech Demo Day Q2 (Νέα Υόρκη, 15 Απρ).',
    href: '/events',
    links: [{ href: '/events', en: 'Open events', el: 'Άνοιγμα εκδηλώσεων' }, { href: '/calendar', en: 'Open calendar', el: 'Άνοιγμα ημερολογίου' }],
  };
}

function programsResult(): AssistantResult {
  return {
    tool: 'programs',
    en: 'Same list as the Programs page: FinTech Accelerator Q3 2026 ($120k, 12 weeks), CleanTech Innovation Grant ($50k, non-dilutive), Founders Academy Bootcamp. Open Programs to filter Accelerators, Grants, or Bootcamps.',
    el: 'Η ίδια λίστα με τη σελίδα Προγράμματα: FinTech Accelerator Q3 2026 ($120k, 12 εβδομάδες), CleanTech Innovation Grant ($50k), Founders Academy Bootcamp. Άνοιξε Προγράμματα για φίλτρο.',
    href: '/programs',
    links: [{ href: '/programs', en: 'Open programs', el: 'Άνοιγμα προγραμμάτων' }],
  };
}

function aboutResult(query: string): AssistantResult | null {
  const folded = fold(query);
  const asking = /\b(tell me about|what is|what's|whats|explain|who is|πληροφορ|τι ειναι|ποιος)\b/.test(folded);
  const hit = KNOWLEDGE.find((card) => card.keys.some((key) => folded.includes(key)));
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
  return {
    tool: 'perks',
    en: 'Same list as Perks: AWS Activate ($100k credits), Stripe fee-free, HubSpot, Notion, Google Cloud, Intercom, Slack, Mercury. Open Perks to claim one.',
    el: 'Η ίδια λίστα με τις Παροχές: AWS Activate, Stripe, HubSpot, Notion, Google Cloud, Intercom, Slack, Mercury. Άνοιξε Παροχές για claim.',
    href: '/perks',
    links: [{ href: '/perks', en: 'Open perks', el: 'Άνοιγμα παροχών' }],
  };
}

function resourcesResult(): AssistantResult {
  return {
    tool: 'resources',
    en: 'Resources has the same four tabs as the page: Learning (Fundraising, Sales, Legal, PMF), Partner Services, Jobs, and Support. Ask a course name or open Resources.',
    el: 'Οι Πόροι έχουν τις ίδιες τέσσερις καρτέλες: Learning, Υπηρεσίες, Θέσεις, Υποστήριξη. Πες όνομα μαθήματος ή άνοιξε Πόρους.',
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

const COMMUNITY_CATALOG = [
  { id: '1', name: 'Fintech Founders' },
  { id: '2', name: 'AI & Machine Learning' },
  { id: '3', name: 'SaaS Builders' },
  { id: '4', name: 'Web3 & Crypto' },
];

function communitiesResult(query?: string): AssistantResult {
  const folded = fold(query || '');
  const joining = /\b(join|μπες|κανε join)\b/.test(folded);
  const hit = COMMUNITY_CATALOG.find((item) => folded.includes(fold(item.name)));
  if (joining && hit) {
    setId(listKeys.communities, hit.id, true);
    logActivity({ kind: 'community', title: `Joined ${hit.name}`, titleEl: `Έγινε join: ${hit.name}`, href: '/communities', byAssistant: true });
    return {
      tool: 'communities',
      en: `You joined ${hit.name}. Same joined list the Communities page reads. Enter Community there opens Messages.`,
      el: `Έγινες μέλος στο ${hit.name}. Η ίδια λίστα join με τη σελίδα Κοινότητες.`,
      href: '/communities',
      links: [{ href: '/communities', en: 'Open communities', el: 'Άνοιγμα κοινοτήτων' }],
    };
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

function playbookResult(): AssistantResult {
  const existing = new Set(readTasks().map((item) => item.title.toLowerCase()));
  const added = PLAYBOOK_TASKS.filter((title) => !existing.has(title.toLowerCase()));
  added.forEach((title) => addStudioTask(title));
  logActivity({ kind: 'milestone', title: 'Started 7-day match plan', titleEl: 'Ξεκίνησε πλάνο 7 ημερών', href: '/workspace', byAssistant: true });
  return {
    tool: 'playbook',
    en: `Seven tasks are on Workspace → Dashboard: ${PLAYBOOK_TASKS.join('; ')}. ${added.length ? `Added ${added.length} new.` : 'They were already there.'} Same board the Task button writes.`,
    el: `Επτά εργασίες είναι στο Workspace → Dashboard: ${PLAYBOOK_TASKS.join('; ')}. ${added.length ? `Προστέθηκαν ${added.length}.` : 'Ήταν ήδη εκεί.'} Ο ίδιος πίνακας με το κουμπί Task.`,
    href: '/workspace',
    links: [
      { href: '/workspace', en: 'Open workspace', el: 'Άνοιγμα χώρου εργασίας' },
      { href: '/quiz', en: 'Open fit check', el: 'Άνοιγμα fit check' },
    ],
  };
}

function inviteResult(): AssistantResult {
  const seeded = seedFounderInvites(3);
  const href = seeded[0]?.href || '/quiz';
  logActivity({ kind: 'request', title: 'Prepared 3 founder invites', titleEl: 'Ετοιμάστηκαν 3 προσκλήσεις ιδρυτών', href: '/network', byAssistant: true });
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
}

function weekMeetResult(profile: AssistantProfile | null): AssistantResult {
  const ranked = rankPeople(fromProfile(profile ?? {}), CAST.filter((person) => person.role === 'Founder' || person.role === 'Co-Founder Candidate')).slice(0, 2);
  const who = ranked[0]?.person;
  return {
    tool: 'week-meet',
    en: who
      ? `This week: talk to ${who.fullName} (${who.headline}), then register for Startup Founders Networking Night on Events (London, 28 Mar 2026). Same people Matches ranks; same event the Events page lists.`
      : 'This week: open Matches, then register for Startup Founders Networking Night on Events (London, 28 Mar 2026).',
    el: who
      ? `Αυτή την εβδομάδα: μίλα με ${who.fullName} (${who.headline}), μετά εγγράψου στο Startup Founders Networking Night στις Εκδηλώσεις (Λονδίνο, 28 Μαρ 2026). Τα ίδια άτομα με το Matches.`
      : 'Αυτή την εβδομάδα: άνοιξε Αντιστοιχίσεις, μετά εγγράψου στο Networking Night στις Εκδηλώσεις.',
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
    en: 'I read the same lists as the rest of the studio. Try: “who is my best match”, “propose three people”, “draft a need card”, “what should I do first”, “search my messages for intro”, or type /match /scout /need /next /inbox /plan /invite /round /quiz /overdue /help. Type @ to pin a person, /new to start over.',
    el: 'Διαβάζω τις ίδιες λίστες με την υπόλοιπη εφαρμογή. Δοκίμασε: «ποιος είναι η καλύτερη αντιστοίχιση», «πρότεινε τρεις», «γράψε κάρτα ανάγκης», «τι να κάνω πρώτα», ή πληκτρολόγησε /match /scout /need /next /inbox /plan /help. Πληκτρολόγησε @ για άτομο, /new για νέα συνομιλία.',
    links: [
      { href: '/matches', en: 'Matches', el: 'Αντιστοιχίσεις' },
      { href: '/milestones', en: 'Milestones', el: 'Ορόσημα' },
      { href: '/fundraising', en: 'Fundraising', el: 'Χρηματοδότηση' },
    ],
  };
}

export function runAssistant(text: string, profile: AssistantProfile | null): AssistantResult {
  return attachFollowUps(resolveAssistant(text, profile));
}

function resolveAssistant(text: string, profile: AssistantProfile | null): AssistantResult {
  const query = text.trim();
  const folded = fold(query);
  if (!query) return helpResult();

  const slash = folded.match(/^\/([a-z-]+)(?:\s+(.*))?$/);
  if (slash) {
    const cmd = slash[1];
    const rest = (slash[2] || '').trim();
    if (cmd === 'match' || cmd === 'matches') return matchesResult(profile, rest || 'who is my best match');
    if (cmd === 'scout') return scoutResult(profile);
    if (cmd === 'need') return needResult(rest || query);
    if (cmd === 'next') return nextStepAssistant(profile);
    if (cmd === 'inbox') return inboxResult(rest || query);
    if (cmd === 'plan') return playbookResult();
    if (cmd === 'invite') return inviteResult();
    if (cmd === 'round') return roundResult();
    if (cmd === 'quiz') return fitCheckResult();
    if (cmd === 'overdue' || cmd === 'due') return milestonesResult(rest || 'what is overdue');
    if (cmd === 'help') return helpResult();
  }

  const person = namedPerson(query);
  if (person && /\b(why|γιατι)\b/.test(folded) && /\b(match|ταιριαζ)\b/.test(folded)) return matchDetailResult(profile, person);
  if (person && /\b(save|watch|αποθηκ)\b/.test(folded)) return saveOrConnect('save', person);
  if (person && /\b(connect|request|intro|συνδεσ|αιτημ)\b/.test(folded)) return saveOrConnect('connect', person);
  if (person && /\b(book|schedule|κλεισ|ραντεβ)\b/.test(folded)) return bookMentor(person);
  if (/\b(still lack|team lack|founding team|τι λειπ|τι χρειάζεται η ομάδα)\b/.test(folded)) return teamGapResult(profile);
  if (/\b(propose|scout|do not send|μην στειλ|προτειν)\b/.test(folded) && /\b(people|three|3|τρεις|συνιδρυτ|match)\b/.test(folded)) return scoutResult(profile);
  if (/\b(need card|καρτα αναγκ|draft a need)\b/.test(folded)) return needResult(query);
  if (/\b(search( my)? (messages?|inbox|thread)|ψαξε( στα)? μηνυμ)\b/.test(folded)) return inboxResult(query);
  if (/\b(open to (a )?(co-?founder|investor|advisor)|ανοιχτ.{0,12}(συνιδρυτ|επενδυτ|συμβουλ))\b/.test(folded)) return openToResult(query);
  if (/\b(what should i do first|next step|τι να κανω πρωτα)\b/.test(folded)) return nextStepAssistant(profile);
  if (/\b(7-day|seven-day|playbook|match plan|πλανο 7|πλάνο 7)\b/.test(folded)) return playbookResult();
  if (/\b(invite 3|invite three|bring 3|bring three|1\+3|one plus three|προσκαλεσ.{0,8}3|προσκάλεσ.{0,8}3)\b/.test(folded)) return inviteResult();
  if (/\b(meet this week|who should i meet|ποιον .{0,20}εβδομαδ|αυτη την εβδομαδα)\b/.test(folded)) return weekMeetResult(profile);
  if (/\b(fit check|archetype|quiz|τι ειδους|τι είδους συνιδρυτ)\b/.test(folded)) return fitCheckResult();

  if (/\b(apply to|apply now|applying to)\b/.test(folded) && !/\b(what|which|how)\b/.test(folded)) return applyResult(query);
  if (/\bclaim\b/.test(folded) && /\b(perk|aws|stripe|hubspot|notion|google cloud|gcp|intercom|slack|mercury|amazon web|παροχ)\b/.test(folded) && !/\b(what|which|how)\b/.test(folded)) {
    return claimPerkResult(query);
  }
  if (/\brecord\b/.test(folded) && /\binvest/.test(folded)) return recordInvestmentResult(query);
  if (/\b(add|create|new)\b/.test(folded) && /\b(task|todo)\b/.test(folded)) return addTaskResult(query);

  const about = aboutResult(query);
  if (about) return about;

  const nav = navigateResult(query);
  if (nav) return nav;

  if (/\b(best match|who (should|can) i|find .{0,20}(co-?founder|match)|καλυτερ.{0,12}αντιστοιχ|ποιος .{0,20}συνιδρυτ)\b/.test(folded)
    || (/\b(match|co-?founder|συνιδρυτ|αντιστοιχ)\b/.test(folded) && !/\bopen|ανοιξ/.test(folded))) {
    return matchesResult(profile, query);
  }
  if (/\b(become|how do i|πως γιν|γινω)\b/.test(folded) && /\b(mentor|μεντορ)\b/.test(folded)) return becomeMentorResult();
  if (/\b(mentor|μεντορ)\b/.test(folded)) return mentorsResult(query);
  if (/\b(activity|history|notification|τι εγινε)\b/.test(folded)) return activityResult();
  if (/\b(new event|schedule a meeting|schedule a new event|add (a )?session)\b/.test(folded)) return sessionAddResult(query);
  if (/\b(events?|meetups?|εκδηλ|διοργανωσ)\b/.test(folded)) return eventsResult(query);
  if (/\b(communities|community|κοινοτ)/.test(folded)) return communitiesResult(query);
  if (/\b(programs?|accelerator|bootcamp|προγραμ)\b/.test(folded)) return programsResult();
  if (/\b(perks?|credits|παροχ)\b/.test(folded)) return perksResult();
  if (/\b(legal|template|nda|νομικ)\b/.test(folded)) return legalResult();
  if (/\b(courses?|learning|resources?|μαθημ|πορο)\b/.test(folded)) return resourcesResult();
  if (/\b(milestone|οροσημ|overdue|εκπροθεσμ|due)\b/.test(folded)) return milestonesResult(query);
  if (/\b(pipeline|funnel|due diligence|term sheet)\b/.test(folded)) return pipelineResult();
  if (/\b(round|raise|runway|valuation|γυρ|χρηματοδ|επενδυτ)\b/.test(folded)) return roundResult();
  if (/\b(today|status|brief|next|τι να κανω|τι εκκρεμ|επομεν)\b/.test(folded)) return briefingResult(profile);
  if (/\b(help|τι μπορεις|what can you)\b/.test(folded)) return helpResult();

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
