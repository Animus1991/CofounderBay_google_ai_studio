/**
 * Deterministic studio operator. The chat panel runs this first so every
 * page, list and score the assistant mentions is the same data the rest of
 * the app already shows. Gemini only rewrites the wording.
 */
import { CAST, castByRole, findCast, placeOf, type CastMember } from '../data/cast';
import { fromProfile, rankPeople, type CompatibilityInput } from '../lib/compatibility';
import {
  addSession,
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
  toggleId,
  upsertMilestone,
  writeMatchFilters,
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
  { keys: ['legal', 'νομικ'], href: '/legal', en: 'Legal Hub', el: 'Νομικά' },
  { keys: ['perk', 'παροχ'], href: '/perks', en: 'Perks', el: 'Παροχές' },
  { keys: ['workspace', 'εργαλει', 'founder tool'], href: '/founder-tools', en: 'Founder Tools', el: 'Εργαλεία ιδρυτή' },
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

function helpResult(): AssistantResult {
  return {
    tool: 'help',
    en: 'I read the same lists as the rest of the studio. Try: “who is my best match”, “save Sarah”, “what is overdue”, “book David Hoffman”, “how is my round”, or “open fundraising”.',
    el: 'Διαβάζω τις ίδιες λίστες με την υπόλοιπη εφαρμογή. Δοκίμασε: «ποιος είναι η καλύτερη αντιστοίχιση», «αποθήκευσε τη Sarah», «τι είναι εκπρόθεσμο», «κλείσε τον David Hoffman», «πώς πάει ο γύρος», ή «άνοιξε χρηματοδότηση».',
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

  const nav = navigateResult(query);
  if (nav) return nav;

  if (/\b(best match|who (should|can) i|find .{0,20}(co-?founder|match)|καλυτερ.{0,12}αντιστοιχ|ποιος .{0,20}συνιδρυτ)\b/.test(folded)
    || (/\b(match|co-?founder|συνιδρυτ|αντιστοιχ)\b/.test(folded) && !/\bopen|ανοιξ/.test(folded))) {
    return matchesResult(profile, query);
  }
  if (/\b(mentor|μεντορ)\b/.test(folded)) return mentorsResult(query);
  if (/\b(milestone|οροσημ|overdue|εκπροθεσμ|due)\b/.test(folded)) return milestonesResult(query);
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
