/**
 * Deterministic studio operator. The chat panel runs this first so every
 * page, list and score the assistant mentions is the same data the rest of
 * the app already shows. Gemini only rewrites the wording.
 */
import { CAST, castByRole, findCast, placeOf, type CastMember } from '../data/cast';
import { fromProfile, rankPeople, type CompatibilityInput } from '../lib/compatibility';
import {
  addSession,
  addStudioTask,
  effectiveStatus,
  listKeys,
  logActivity,
  readActivity,
  readMilestones,
  readRound,
  readSaved,
  saveProfile,
  saveRequest,
  setId,
  trackApplication,
  upsertMilestone,
  writeMatchFilters,
  writeRound,
} from '../lib/localLists';
import { milestoneService } from './milestoneService';

export type AssistantProfile = CompatibilityInput & {
  fullName?: string;
  headline?: string;
  location?: string | null;
};

export type AssistantLink = { href: string; en: string; el: string };

export type AssistantResult = {
  en: string;
  el: string;
  href?: string;
  links: AssistantLink[];
  tool: string;
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
];

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
  { keys: ['start a voice call', 'start a video call'], href: '/messages', en: 'Voice and video stay on Messages. Open the conversation, then Call or Video in the header. I can also book a mentorship slot on Calendar.', el: 'Φωνή και βίντεο μένουν στα Μηνύματα. Άνοιξε τη συνομιλία και πάτα Call ή Video. Μπορώ και να κλείσω mentorship στο Ημερολόγιο.' },
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
  if (items.length === 0) {
    return {
      tool: 'activity',
      en: 'No studio activity yet. Apply, claim a perk, add a task, or record an investment and it will show on Notifications.',
      el: 'Δεν υπάρχει ακόμα δραστηριότητα. Κάνε αίτηση, claim παροχής, πρόσθεσε εργασία ή καταγραφή επένδυσης και θα φανεί στις Ειδοποιήσεις.',
      href: '/notifications',
      links: [{ href: '/notifications', en: 'Open notifications', el: 'Άνοιγμα ειδοποιήσεων' }],
    };
  }
  return {
    tool: 'activity',
    en: `Same feed Notifications reads:\n${items.map((item) => item.title).join('\n')}`,
    el: `Το ίδιο feed με τις Ειδοποιήσεις:\n${items.map((item) => item.titleEl || item.title).join('\n')}`,
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

function communitiesResult(): AssistantResult {
  return {
    tool: 'communities',
    en: 'Same list as Communities: Fintech Founders, AI & Machine Learning, SaaS Builders, Web3 & Crypto. Join on that page, or say “create a community” and I will walk the listing.',
    el: 'Η ίδια λίστα με τις Κοινότητες: Fintech Founders, AI & Machine Learning, SaaS Builders, Web3 & Crypto. Κάνε Join εκεί, ή πες «δημιούργησε κοινότητα».',
    href: '/communities',
    links: [{ href: '/communities', en: 'Open communities', el: 'Άνοιγμα κοινοτήτων' }],
  };
}

function helpResult(): AssistantResult {
  return {
    tool: 'help',
    en: 'I read the same lists as the rest of the studio. Try: “who is my best match”, “save Sarah”, “what is overdue”, “book David Hoffman”, “how is my round”, “tell me about Sequoia”, “what events are coming”, or “how do I become a mentor”.',
    el: 'Διαβάζω τις ίδιες λίστες με την υπόλοιπη εφαρμογή. Δοκίμασε: «ποιος είναι η καλύτερη αντιστοίχιση», «αποθήκευσε τη Sarah», «τι είναι εκπρόθεσμο», «κλείσε τον David Hoffman», «πώς πάει ο γύρος», «πες μου για τη Sequoia», «ποιες εκδηλώσεις έρχονται», ή «πώς γίνομαι μέντορας».',
    links: [
      { href: '/matches', en: 'Matches', el: 'Αντιστοιχίσεις' },
      { href: '/milestones', en: 'Milestones', el: 'Ορόσημα' },
      { href: '/fundraising', en: 'Fundraising', el: 'Χρηματοδότηση' },
    ],
  };
}

export function runAssistant(text: string, profile: AssistantProfile | null): AssistantResult {
  const query = text.trim();
  const folded = fold(query);
  if (!query) return helpResult();

  const person = namedPerson(query);
  if (person && /\b(save|watch|αποθηκ)\b/.test(folded)) return saveOrConnect('save', person);
  if (person && /\b(connect|request|intro|συνδεσ|αιτημ)\b/.test(folded)) return saveOrConnect('connect', person);
  if (person && /\b(book|schedule|κλεισ|ραντεβ)\b/.test(folded)) return bookMentor(person);

  if (/\b(apply to|apply now|applying to)\b/.test(folded) && !/\b(what|which|how)\b/.test(folded)) return applyResult(query);
  if (/\b(claim|how do i claim)\b/.test(folded) && /\b(perk|aws|stripe|hubspot|notion|google cloud|gcp|intercom|slack|mercury|amazon web|παροχ)\b/.test(folded)) {
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
  if (/\b(communities|community|κοινοτ)/.test(folded)) return communitiesResult();
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
