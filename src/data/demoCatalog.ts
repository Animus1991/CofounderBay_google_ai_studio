/**
 * The dated sample items the pages show *and* the assistant talks about.
 *
 * Each page keeps rendering its own cards; what moves here is the part two
 * places must agree on — the title and when it happens. The assistant's
 * knowledge cards and event list read the same offsets, so "the EcoSphere
 * deadline" is the same day on Explore and in the chat.
 */
import { atDaysFromToday, daysFromToday, shortDay } from './demoClock';

type Lang = 'en' | 'el';

/** Events page samples. */
export const DEMO_EVENTS = [
  { id: '1', title: 'Startup Founders Networking Night', inDays: 7, startHour: 18, endHour: 21, place: { en: 'London', el: 'Λονδίνο' } },
  { id: '2', title: 'Mastering the Seed Round Pitch', inDays: 12, startHour: 14, endHour: 16, place: { en: 'online', el: 'online' } },
  { id: '3', title: 'FinTech Demo Day Q2', inDays: 25, startHour: 10, endHour: 13, place: { en: 'New York', el: 'Νέα Υόρκη' } },
] as const;

/** Programs page samples (deadline in days). */
export const DEMO_PROGRAM_DEADLINES: Record<string, number> = {
  'FinTech Accelerator Q3 2026': 14,
  'CleanTech Innovation Grant': 30,
  'SaaS Growth Bootcamp': 45,
};

/** Explore → Opportunities samples (deadline in days). */
export const DEMO_DISCOVERY_DEADLINES: Record<string, number> = {
  'EcoSphere Accelerator': 9,
  'Web3 Founders Grant': 25,
  'AI Innovation Lab': 45,
};

/** Explore → Upcoming sessions samples. */
export const DEMO_DISCOVERY_SESSIONS = [
  { id: 'demo-e1', title: 'Founder Mixer SF', inDays: 2, hour: 18, type: 'In-Person', capacity: '85%', status: 'FILLING' },
  { id: 'demo-e2', title: 'AI Product Workshop', inDays: 4, hour: 10, type: 'Virtual', capacity: '40%', status: 'OPEN' },
  { id: 'demo-e3', title: 'Seed Funding Webinar', inDays: 9, hour: 14, type: 'Virtual', capacity: '95%', status: 'LAST_CALL' },
] as const;

/** Fundraising → Programs samples. */
export const DEMO_FUNDING_PROGRAMS = [
  { id: 'prog_1', title: 'Y Combinator S26', inDays: 21, type: 'Accelerator', grant: '$500k', location: 'Remote / SF', match: 96, tags: ['AI', 'B2B', 'Global'], status: 'open' },
  { id: 'prog_2', title: 'Techstars Sustainability', inDays: 35, type: 'Accelerator', grant: '$120k', location: 'NYC', match: 88, tags: ['CleanTech', 'Impact'], status: 'open' },
  { id: 'prog_3', title: 'NSF SBIR Phase I', inDays: 55, type: 'Grant', grant: '$275k', location: 'US Only', match: 72, tags: ['R&D', 'DeepTech'], status: 'open' },
  { id: 'prog_4', title: 'Founders Factory EU', inDays: 80, type: 'Studio', grant: '€150k', location: 'London / Paris', match: 81, tags: ['B2B SaaS', 'Series A'], status: 'upcoming' },
] as const;

/** Fundraising → Opportunities samples; `null` means rolling. */
export const DEMO_FUNDING_OPPORTUNITIES = [
  { id: 'opp_1', title: 'Series A Scout Network', org: 'Sequoia Capital', type: 'Intro Request', amount: '$5M+', inDays: null, tags: ['AI', 'SaaS'], status: 'active' },
  { id: 'opp_2', title: 'Impact Investor Roundtable', org: 'Impact Capital Forum', type: 'Pitch Event', amount: '$1–3M', inDays: 16, tags: ['Impact', 'ESG'], status: 'active' },
  { id: 'opp_3', title: 'Founder Grant — Q2 2026', org: 'Stripe Foundation', type: 'Non-dilutive Grant', amount: '$50k', inDays: 31, tags: ['Fintech', 'SMB'], status: 'active' },
  { id: 'opp_4', title: 'EU Horizon Innovation Fund', org: 'European Commission', type: 'Grant', amount: '€250k', inDays: 40, tags: ['DeepTech', 'EU'], status: 'active' },
  { id: 'opp_5', title: 'Debt Facility — Revenue-Based', org: 'Clearco', type: 'Revenue-Based', amount: 'up to $2M', inDays: null, tags: ['SaaS', 'MRR>$30k'], status: 'active' },
] as const;

/** Fundraising → Upcoming meetings samples. */
export const DEMO_INVESTOR_MEETINGS = [
  { id: 'm1', investor: 'Sequoia Capital', type: 'Video Call', inDays: 2, time: '10:00', duration: '45 min', status: 'confirmed', notes: 'Partnership discussion' },
  { id: 'm2', investor: 'Naval Ravikant', type: 'Coffee Chat', inDays: 4, time: '14:00', duration: '30 min', status: 'pending', notes: 'Advisory role' },
  { id: 'm3', investor: 'First Round', type: 'Pitch', inDays: 6, time: '11:00', duration: '60 min', status: 'confirmed', notes: 'Seed round pitch' },
] as const;

/** Fundraising → Data room sample files (updated days ago). */
export const DEMO_ROOM_FILES = [
  { name: 'Pitch_Deck_v3.pdf', size: '4.2 MB', views: 24, daysAgo: 6 },
  { name: 'Financial_Projections.xlsx', size: '1.8 MB', views: 12, daysAgo: 8 },
  { name: 'Cap_Table_Safe.v2.pdf', size: '890 KB', views: 8, daysAgo: 11 },
  { name: 'IP_Assignments.zip', size: '12.4 MB', views: 3, daysAgo: 14 },
] as const;

/** Founder Tools → Applications samples (deadline and decision in days; negative = past). */
export const DEMO_APPLICATIONS = [
  { id: 1, program: 'Y Combinator W27', type: 'Accelerator', status: 'submitted', deadlineInDays: 60, decisionInDays: 120, match: 91, note: 'Strong product-market fit narrative. Weakness: team completeness.' },
  { id: 2, program: 'Techstars NYC', type: 'Accelerator', status: 'in-review', deadlineInDays: -10, decisionInDays: 25, match: 78, note: 'Application under review. Interview scheduled.' },
  { id: 3, program: 'NSF SBIR Phase I', type: 'Grant', status: 'draft', deadlineInDays: 55, decisionInDays: 140, match: 65, note: 'Complete technical commercialization section.' },
  { id: 4, program: 'First Round Capital', type: 'VC Intro', status: 'rejected', deadlineInDays: null, decisionInDays: -30, match: 55, note: 'Revisit after first revenue milestone. Keep in pipeline.' },
  { id: 5, program: 'Sequoia Arc', type: 'Program', status: 'draft', deadlineInDays: 40, decisionInDays: 95, match: 82, note: 'Requires product demo video and 1-pager.' },
] as const;

/** Founder Tools → Upcoming deadlines samples. */
export const DEMO_TOOL_DEADLINES = [
  { title: 'YC Summer Application', inDays: 5 },
  { title: 'Techstars Demo Day', inDays: 32 },
] as const;

/** Upcoming within a week counts as "soon" everywhere. */
export const SOON_DAYS = 7;

export const demoDay = (inDays: number) => daysFromToday(inDays);
export const demoAt = (inDays: number, hour: number) => atDaysFromToday(inDays, hour);

/** The dated knowledge cards the assistant answers from — same offsets as the pages. */
export function datedKnowledge(lang: Lang): { keys: string[]; href: string; text: string }[] {
  const day = (inDays: number) => shortDay(daysFromToday(inDays), lang);
  const el = lang === 'el';
  const opp = (id: string) => DEMO_FUNDING_OPPORTUNITIES.find((item) => item.id === id)!;
  const prog = (id: string) => DEMO_FUNDING_PROGRAMS.find((item) => item.id === id)!;
  const event = (id: string) => DEMO_EVENTS.find((item) => item.id === id)!;
  const session = (id: string) => DEMO_DISCOVERY_SESSIONS.find((item) => item.id === id)!;
  return [
    { keys: ['impact investor roundtable'], href: '/fundraising', text: el ? `Το Impact Investor Roundtable είναι pitch event στη Χρηματοδότηση → Ευκαιρίες ($1–3M, ${day(opp('opp_2').inDays!)}, ESG).` : `Impact Investor Roundtable is a pitch event on Fundraising → Opportunities ($1–3M, ${day(opp('opp_2').inDays!)}, ESG). Same list as the Opportunities tab.` },
    { keys: ['founder grant', 'stripe foundation'], href: '/fundraising', text: el ? `Το Founder Grant είναι μη αραιωτική επιχορήγηση $50k από Stripe Foundation στη Χρηματοδότηση → Ευκαιρίες (προθεσμία ${day(opp('opp_3').inDays!)}).` : `Founder Grant is a $50k non-dilutive Stripe Foundation grant on Fundraising → Opportunities (deadline ${day(opp('opp_3').inDays!)}).` },
    { keys: ['eu horizon', 'horizon innovation'], href: '/fundraising', text: el ? `Το EU Horizon Innovation Fund είναι επιχορήγηση €250k από την Ευρωπαϊκή Επιτροπή στη Χρηματοδότηση → Ευκαιρίες (${day(opp('opp_4').inDays!)}).` : `EU Horizon Innovation Fund is a €250k grant from the European Commission on Fundraising → Opportunities (${day(opp('opp_4').inDays!)}, DeepTech/EU).` },
    { keys: ['y combinator', 'yc s26'], href: '/fundraising', text: el ? `Το Y Combinator S26 είναι στη Χρηματοδότηση → Προγράμματα: $500k, προθεσμία ${day(prog('prog_1').inDays)}, 96% match.` : `Y Combinator S26 is on Fundraising → Programs: $500k accelerator, deadline ${day(prog('prog_1').inDays)}, 96% match.` },
    { keys: ['techstars'], href: '/fundraising', text: el ? `Το Techstars Sustainability είναι στη Χρηματοδότηση → Προγράμματα: $120k, NYC, ${day(prog('prog_2').inDays)}.` : `Techstars Sustainability is on Fundraising → Programs: $120k, NYC, deadline ${day(prog('prog_2').inDays)}.` },
    { keys: ['nsf sbir'], href: '/fundraising', text: el ? `Το NSF SBIR Phase I είναι επιχορήγηση $275k στη Χρηματοδότηση → Προγράμματα (${day(prog('prog_3').inDays)}).` : `NSF SBIR Phase I is a $275k US grant on Fundraising → Programs (${day(prog('prog_3').inDays)}).` },
    { keys: ['founders factory'], href: '/fundraising', text: el ? `Το Founders Factory EU είναι studio στη Χρηματοδότηση → Προγράμματα (€150k, ${day(prog('prog_4').inDays)}).` : `Founders Factory EU is a studio on Fundraising → Programs (€150k, London/Paris, ${day(prog('prog_4').inDays)}).` },
    { keys: ['fintech accelerator'], href: '/programs', text: el ? `Το FinTech Accelerator Q3 2026 είναι στα Προγράμματα: $120k, 12 εβδομάδες, προθεσμία ${day(DEMO_PROGRAM_DEADLINES['FinTech Accelerator Q3 2026']!)}.` : `FinTech Accelerator Q3 2026 is on Programs: $120k, 12 weeks, deadline ${day(DEMO_PROGRAM_DEADLINES['FinTech Accelerator Q3 2026']!)}. Same card as the Programs page.` },
    { keys: ['cleantech innovation'], href: '/programs', text: el ? `Το CleanTech Innovation Grant είναι στα Προγράμματα: $50k μη αραιωτικά, ${day(DEMO_PROGRAM_DEADLINES['CleanTech Innovation Grant']!)}.` : `CleanTech Innovation Grant is on Programs: $50k non-dilutive, deadline ${day(DEMO_PROGRAM_DEADLINES['CleanTech Innovation Grant']!)}.` },
    { keys: ['saas growth bootcamp', 'founders academy'], href: '/programs', text: el ? `Το SaaS Growth Bootcamp είναι στα Προγράμματα: 4 εβδομάδες, ${day(DEMO_PROGRAM_DEADLINES['SaaS Growth Bootcamp']!)}.` : `SaaS Growth Bootcamp / Founders Academy is on Programs: 4 weeks, deadline ${day(DEMO_PROGRAM_DEADLINES['SaaS Growth Bootcamp']!)}.` },
    { keys: ['networking night', 'startup founders networking'], href: '/events', text: el ? `Το Startup Founders Networking Night είναι στις Εκδηλώσεις: Λονδίνο, ${day(event('1').inDays)}, 18:00–21:00.` : `Startup Founders Networking Night is on Events: London, ${day(event('1').inDays)}, 18:00–21:00. Register on the Events page.` },
    { keys: ['seed round pitch', 'mastering the seed'], href: '/events', text: el ? `Το Mastering the Seed Round Pitch είναι online workshop στις Εκδηλώσεις, ${day(event('2').inDays)}.` : `Mastering the Seed Round Pitch is an online workshop on Events, ${day(event('2').inDays)}, hosted by Sarah Chen.` },
    { keys: ['fintech demo day'], href: '/events', text: el ? `Το FinTech Demo Day Q2 είναι στις Εκδηλώσεις: Νέα Υόρκη, ${day(event('3').inDays)}.` : `FinTech Demo Day Q2 is on Events: New York, ${day(event('3').inDays)}, 10:00–13:00.` },
    { keys: ['ecosphere'], href: '/discovery', text: el ? `Το EcoSphere Accelerator είναι στην Εξερεύνηση → Ευκαιρίες: 12 εβδομάδες, remote, προθεσμία ${day(DEMO_DISCOVERY_DEADLINES['EcoSphere Accelerator']!)}.` : `EcoSphere Accelerator is on Explore → Opportunities: 12 weeks, remote, sustainability, deadline ${day(DEMO_DISCOVERY_DEADLINES['EcoSphere Accelerator']!)}. Same card as Explore.` },
    { keys: ['web3 founders grant'], href: '/discovery', text: el ? `Το Web3 Founders Grant είναι στην Εξερεύνηση → Ευκαιρίες: χωρίς equity, ${day(DEMO_DISCOVERY_DEADLINES['Web3 Founders Grant']!)}.` : `Web3 Founders Grant is on Explore → Opportunities: equity-free funding for core infrastructure, deadline ${day(DEMO_DISCOVERY_DEADLINES['Web3 Founders Grant']!)}.` },
    { keys: ['ai innovation lab'], href: '/discovery', text: el ? `Το AI Innovation Lab είναι στην Εξερεύνηση → Ευκαιρίες: Βερολίνο, ${day(DEMO_DISCOVERY_DEADLINES['AI Innovation Lab']!)}.` : `AI Innovation Lab is on Explore → Opportunities: Berlin incubator for enterprise automation, deadline ${day(DEMO_DISCOVERY_DEADLINES['AI Innovation Lab']!)}.` },
    { keys: ['founder mixer'], href: '/events', text: el ? `Το Founder Mixer SF είναι στην Εξερεύνηση → Επερχόμενες συνεδρίες (${day(session('demo-e1').inDays)}).` : `Founder Mixer SF is on Explore → Upcoming Sessions (${day(session('demo-e1').inDays)}, in person).` },
    { keys: ['ai product workshop'], href: '/events', text: el ? `Το AI Product Workshop είναι στην Εξερεύνηση (${day(session('demo-e2').inDays)}, virtual).` : `AI Product Workshop is on Explore → Upcoming Sessions (${day(session('demo-e2').inDays)}, virtual).` },
    { keys: ['seed funding webinar'], href: '/events', text: el ? `Το Seed Funding Webinar είναι στην Εξερεύνηση (${day(session('demo-e3').inDays)}).` : `Seed Funding Webinar is on Explore → Upcoming Sessions (${day(session('demo-e3').inDays)}).` },
  ];
}

/** The Events sample list in one sentence, for the assistant. */
export function demoEventsLine(lang: Lang): string {
  return DEMO_EVENTS.map((item) => `${item.title} (${item.place[lang]}, ${shortDay(daysFromToday(item.inDays), lang)})`).join(', ');
}

/**
 * The sample round's investor pipeline, with each investor's next step and
 * when it is due. One follow-up is overdue on purpose, so the overdue alert,
 * the dashboard brief and the assistant's "what is overdue?" have something
 * true to show.
 */
export const DEMO_PIPELINE = [
  { investorId: 'inv_1', name: 'Sequoia Capital', stage: 'Due Diligence', notes: 'Requested financial projections for 2027.', nextStep: 'Share the data room with the pilot report', nextStepEl: 'Μοιράσου το data room με την αναφορά του πιλότου', dueInDays: 2 },
  { investorId: 'inv_2', name: 'Naval Ravikant', stage: 'Meeting', notes: 'Second meeting scheduled for next Tuesday.', nextStep: 'Send the per-building cost model', nextStepEl: 'Στείλε το μοντέλο κόστους ανά κτίριο', dueInDays: 5 },
  { investorId: 'inv_3', name: 'Andreessen Horowitz', stage: 'Contacted', notes: 'Intro sent via Alex.', nextStep: 'Follow up on the intro', nextStepEl: 'Κάνε follow-up στη γνωριμία', dueInDays: -1 },
  { investorId: 'inv_4', name: 'First Round Capital', stage: 'Identified', notes: 'Fits our thesis perfectly.', nextStep: 'Ask Alex for a warm intro', nextStepEl: 'Ζήτα από τον Alex μια γνωριμία', dueInDays: 9 },
  { investorId: 'inv_5', name: 'Bessemer Venture', stage: 'Passed', notes: 'Too early for their current fund.', nextStep: '', nextStepEl: '', dueInDays: null },
] as const;

/** The sample pipeline as stored rows, dated from today. */
export function demoPipeline(lang: Lang = 'en', now: Date = new Date()) {
  const at = now.toISOString();
  return DEMO_PIPELINE.map((item) => ({
    investorId: item.investorId,
    name: item.name,
    stage: item.stage,
    notes: item.notes,
    updatedAt: at,
    ...(item.dueInDays === null
      ? {}
      : { nextStep: lang === 'el' ? item.nextStepEl : item.nextStep, nextDate: daysFromToday(item.dueInDays, now) }),
  }));
}

/** The sample investor directory (Fundraising → Investors), by id — the assistant uses it to add one to the pipeline. */
export const DEMO_INVESTOR_NAMES = [
  { id: 'inv_1', name: 'Sequoia Capital' },
  { id: 'inv_2', name: 'Naval Ravikant' },
  { id: 'inv_3', name: 'Andreessen Horowitz' },
  { id: 'inv_4', name: 'First Round Capital' },
  { id: 'inv_5', name: 'Bessemer Venture' },
  { id: 'inv_6', name: 'Index Ventures' },
] as const;
