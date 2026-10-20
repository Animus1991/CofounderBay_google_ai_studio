/**
 * Demo photos — topical covers for events, programs and courses.
 *
 * People do not get stock photos: a face that does not match the person is
 * worse than initials, so `portraitFor` returns '' and the Avatar component
 * renders the name's initials everywhere.
 *
 * Covers: the title/type/tags pick a theme ("pitch" → a speaker on stage,
 * "coffee" → cups, "energy" → turbines, "Athens" → the Acropolis), the seed
 * picks one photo of that theme, so a card keeps its cover on every page.
 *
 * Every photo is from Unsplash (free to use; hotlinking is how Unsplash asks
 * to be used).
 */

const UNSPLASH = 'https://images.unsplash.com/photo-';

/**
 * No generated faces: demo people render initials instead of a stranger's
 * photo. Kept for API compatibility with `avatarFor`.
 */
export function portraitFor(_id: string, _fullName: string, _size = 200): string {
 return '';
}

/* ----------------------------------------------------------------- covers */

const THEMES = {
 stage: ['1544531586-fde5298cdd40', '1475721027785-f74eccf877e2', '1587825140708-dfaf72ae4b04', '1582192730841-2a682d7375f9'],
 panel: ['1561489396-888724a1543d', '1591115765373-5207764f72e7'],
 talk: ['1591115765373-5207764f72e7', '1556761175-5973dc0f32e7', '1505373877841-8d25f7d46678', '1559223607-a43c990c692c'],
 conference: ['1540575467063-178a50c2df87', '1560439514-4e9645039924', '1523580494863-6f3031224c94', '1511578314322-379afb476865'],
 coffee: ['1495474472287-4d71bcdd2085', '1554118811-1e0d58224f24', '1501339847302-ac426a4a7cbb', '1445116572660-236099ec97a0'],
 workshop: ['1552664730-d307ca884978', '1512758017271-d7b84c2113f1', '1519389950473-47ba0277781c', '1581291518857-4e27b48ff24e'],
 meeting: ['1517245386807-bb43f82c33c4', '1543269865-cbf427effbad', '1542744173-8e7e53415bb0', '1517048676732-d65bc937f952'],
 networking: ['1515169067868-5387ec356754', '1517457373958-b7bdd4587205', '1528605248644-14dd04022da1', '1515187029135-18ee286d815b'],
 women: ['1522202176988-66273c2fd55f', '1573164713988-8665fc963095', '1531482615713-2afd69097998'],
 energy: ['1466611653911-95081537e5b7', '1509391366360-2e959784a276', '1532601224476-15c79f2f7a51', '1473341304170-971dccb5ac1e', '1508514177221-188b1cf16e9d'],
 health: ['1576091160399-112ba8d25d1d'],
 food: ['1504674900247-0877df9cc836', '1488459716781-31db52582fe9', '1555396273-367ea4eb4db5'],
 agri: ['1500382017468-9049fed747ef'],
 logistics: ['1494412574643-ff11b0a5c1c3', '1586528116311-ad8dd3c8310d'],
 circular: ['1532996122724-e3c354a0b15b'],
 hardware: ['1518770660439-4636190af475', '1581091226825-a6a2a5aee158', '1581092160562-40aa08e78837'],
 ai: ['1677442136019-21780ecad995', '1485827404703-89b55fcc595e', '1451187580459-43490279c0fa', '1620712943543-bcc4688e7485'],
 cloud: ['1573164713988-8665fc963095', '1563986768609-322da13575f3'],
 payments: ['1563013544-824ae1b704d3', '1556742049-0cfed4f6a45d', '1556745757-8d76bdb6984b', '1559526324-4b87b5e36e44'],
 legal: ['1450101499163-c8848c66ca85', '1589829545856-d10d557cf95f', '1554224155-6726b3ff858f'],
 design: ['1581291518857-4e27b48ff24e', '1586717791821-3f44a563fa4c', '1561070791-2526d30994b5', '1559028012-481c04fa702d'],
 code: ['1498050108023-c5249f4df085', '1531482615713-2afd69097998', '1555066931-4365d14bab8c', '1551434678-e076c223a692'],
 office: ['1559136555-9303baea8ebd', '1504384308090-c894fdcc538d', '1497366811353-6870744d04b2', '1524758631624-e2822e304c36', '1556761175-4b46a572b786'],
 // No stock-market chart: raising a round is not trading.
 fundraising: ['1579621970563-ebec7560ff3e', '1542744173-8e7e53415bb0', '1600880292203-757bb62b4baf', '1559526324-4b87b5e36e44'],
 metrics: ['1460925895917-afdab827c52f', '1551288049-bebda4e38f71', '1543286386-713bdd548da4', '1454165804606-c3d57bc86b40'],
 marketing: ['1533750349088-cd871a92f312', '1557838923-2985c318be48', '1543286386-713bdd548da4'],
 deal: ['1521791136064-7986c2920216', '1600880292089-90a7e086ee0c', '1600880292203-757bb62b4baf'],
 learning: ['1523240795612-9a054b0db644', '1513258496099-48168024aec0', '1488190211105-8b0e65b80b4e', '1434030216411-0b793f4b4173', '1501504905252-473c47e087f8'],
 research: ['1481627834876-b7833e8f5570', '1505664194779-8beaceb93744'],
 athens: ['1603565816030-6b389eeb23cb', '1555993539-1732b0258235', '1503152394-c571994fd383'],
 islands: ['1570077188670-e3a8d69ac5ff', '1533105079780-92b9be482077', '1601581875309-fafbf2d3ed3a'],
 team: ['1522071820081-009f0129c71c', '1531545514256-b1400bc00f31', '1556761175-b413da4baf72', '1521737604893-d14cc237f11d'],
} as const satisfies Record<string, readonly string[]>;

export type PhotoTheme = keyof typeof THEMES;

/*
 * Words that pick a theme, tried in order: what happens at an event, then the
 * sector, the kind of programme, the topic, the place and last "people
 * together". A Latin word matches where a word starts ("fundrais" finds
 * "fundraising"); a trailing "$" means the whole word ("ai$" is not "said").
 * Greek stems are written without accents, as the text is compared.
 */
const RULES: ReadonlyArray<readonly [PhotoTheme, readonly string[]]> = [
 ['stage', ['pitch', 'demo day', 'demo-day', 'demoday', 'παρουσιασ']],
 ['panel', ['panel', 'fireside', 'debate', 'πανελ', 'στρογγυλ']],
 ['talk', ['webinar', 'livestream', 'keynote', 'ama$', 'talk$', 'talks$', 'ομιλι', 'διαλεξ']],
 ['conference', ['summit', 'conference', 'expo$', 'festival', 'συνεδριο', 'συνεδριου']],
 ['coffee', ['coffee', 'breakfast', 'brunch', 'καφε', 'πρωινο']],
 ['workshop', ['workshop', 'discovery', 'sprint', 'hackathon', 'interview', 'mvp$', 'prototyp', 'validat', 'εργαστηρι', 'συνεντευξ']],
 ['meeting', ['office hours', 'mentor', 'coaching', 'coach$', 'one-on-one', 'advisory', 'consult', 'ωρες γραφειου', 'μεντορ', 'καθοδηγ', 'συνεδρια', 'συμβουλ']],
 ['networking', ['meetup', 'networking', 'mixer', 'social$', 'happy hour', 'dinner', 'drinks', 'δικτυωσ', 'δειπνο', 'γνωριμι']],
 ['women', ['women', 'γυναικ']],
 ['energy', ['energy', 'climate', 'solar', 'wind$', 'grid$', 'cleantech', 'clean tech', 'green', 'battery', 'storage', 'anemos', 'kyma', 'ενεργει', 'κλιμα', 'ηλιακ', 'ανεμ', 'πρασιν']],
 ['health', ['health', 'medical', 'medtech', 'clinic', 'biotech', 'υγει', 'ιατρ']],
 ['food', ['food', 'restaurant', 'taverna', 'hospitality', 'τροφιμ', 'εστιατορ', 'ταβερν', 'φιλοξενι']],
 ['agri', ['agri', 'farm', 'γεωργ', 'αγροτ']],
 // Not "shipping": in a founder's mouth it means releasing ("shipping AI
 // features"), and the AI event got a warehouse.
 ['logistics', ['logistic', 'supply chain', 'freight', 'maritime', 'ναυτιλ', 'εφοδιαστ', 'μεταφορ']],
 ['circular', ['circular', 'recycl', 'waste', 'ανακυκλ', 'αποβλητ']],
 ['hardware', ['hardware', 'iot$', 'robot', 'electronic', 'chip$', 'chips$', 'manufactur', 'deep tech', 'deeptech', 'ρομποτ', 'ηλεκτρονικ']],
 ['ai', ['ai$', 'machine learning', 'ml$', 'llm', 'neural', 'genai', 'data science', 'τεχνητη νοημοσυνη', 'δεδομεν']],
 ['cloud', ['cloud', 'system design', 'architecture', 'devops', 'infrastructure', 'server', 'security', 'cyber', 'υποδομ', 'ασφαλει']],
 ['payments', ['fintech', 'payment', 'bank', 'invoice', 'insurtech', 'πληρωμ', 'τραπεζ', 'τιμολογ']],
 ['legal', ['legal', 'law$', 'lawyer', 'contract', 'gdpr', 'compliance', 'trademark', 'ip$', 'νομικ', 'δικηγορ', 'συμβολαι']],
 ['design', ['design', 'ux$', 'ui$', 'brand', 'craft', 'studio', 'figma', 'σχεδιασ', 'σχεδιο']],
 ['code', ['engineer', 'developer', 'coding', 'code$', 'full-stack', 'fullstack', 'typescript', 'react$', 'backend', 'frontend', 'open source', 'api$', 'dev$', 'κωδικ', 'μηχανικ', 'προγραμματιστ']],
 ['office', ['accelerator', 'incubator', 'bootcamp', 'cohort', 'programme', 'program$', 'lab$', 'labs$', 'hub$', 'coworking', 'επιταχυντ', 'θερμοκοιτιδ', 'κοορτ', 'προγραμμα']],
 ['fundraising', ['fundrais', 'invest', 'angel', 'ventures', 'capital', 'pre-seed', 'seed$', 'safe$', 'term sheet', 'cap table', 'vc$', 'family office', 'χρηματοδοτ', 'επενδυ', 'αγγελ', 'κεφαλαι']],
 ['metrics', ['saas$', 'metric', 'analytics', 'kpi', 'benchmark', 'dashboard', 'retention', 'churn', 'revenue', 'μετρικ', 'αναλυτικ', 'εσοδ']],
 ['marketing', ['marketing', 'growth', 'go-to-market', 'gtm$', 'seo$', 'content', 'launch', 'αναπτυξ', 'μαρκετινγκ', 'προωθησ']],
 ['deal', ['sales', 'b2b$', 'crm$', 'outbound', 'partnership', 'deal$', 'deals$', 'πωλησ', 'συνεργασι']],
 ['learning', ['course', 'learn', 'edtech', 'education', 'εκπαιδευ', 'academy', 'school', 'university', 'lesson', 'masterclass', 'playbook', 'guide', 'μαθημα', 'μαθηση', 'ακαδημ', 'σχολ', 'πανεπιστημ', 'οδηγ']],
 ['research', ['research', 'paper', 'study', 'report', 'ερευν', 'μελετ', 'αναφορ']],
 ['athens', ['athens', 'acropolis', 'αθην', 'ακροπολ']],
 ['islands', ['greece', 'greek', 'aegean', 'mediterranean', 'island', 'santorini', 'crete', 'cyclades', 'ελλαδ', 'ελληνικ', 'αιγαι', 'μεσογει', 'νησ', 'σαντοριν', 'κρητ', 'κυκλαδ']],
 ['team', ['founders', 'founder', 'community', 'club', 'circle', 'members', 'group', 'team', 'builders', 'ιδρυτ', 'κοινοτητ', 'λεσχη', 'κυκλος', 'μελη', 'ομαδ']],
];

function escapeRegExp(text: string): string {
 return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const RULE_PATTERNS: ReadonlyArray<readonly [PhotoTheme, RegExp]> = RULES.map(([theme, words]) => {
 const alternatives = words.map((word) => {
  const whole = word.endsWith('$');
  const body = escapeRegExp(whole ? word.slice(0, -1) : word) + (whole ? '(?![a-z0-9])' : '');
  // Greek stems match anywhere; a Latin word must start a word. (No
  // lookbehind: older Safari cannot parse it and the module would fail.)
  return /^[a-z0-9]/.test(word) ? `(?:^|[^a-z0-9])${body}` : body;
 });
 return [theme, new RegExp(alternatives.join('|'))] as const;
});

/** Lower case without accents, so "Εργαστήριο" reads "εργαστηριο". */
function plain(text: string): string {
 return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** FNV-1a: a small stable hash, so a seed always picks the same photo. */
function hashOf(seed: string): number {
 let hash = 0x811c9dc5;
 for (let i = 0; i < seed.length; i += 1) {
  hash ^= seed.charCodeAt(i);
  hash = Math.imul(hash, 0x01000193);
 }
 return hash >>> 0;
}

function pick<T>(pool: readonly T[], seed: string): T {
 return (pool[hashOf(seed) % pool.length] ?? pool[0]) as T;
}

/** The theme a text is about, or null when no word in it picks one. */
export function photoThemeOf(text: string | null | undefined): PhotoTheme | null {
 if (!text) return null;
 const haystack = plain(text);
 for (const [theme, pattern] of RULE_PATTERNS) {
  if (pattern.test(haystack)) return theme;
 }
 return null;
}

/**
 * A cover photo for `seed` (an id, slug or title). The theme comes from
 * `about` (a title, then a type or sector) when given, else from the seed
 * itself, else `office`. Cropped around its busiest part ("entropy") so a
 * wide strip keeps its subject.
 */
export function coverFor(
 seed: string,
 about: ReadonlyArray<string | null | undefined> = [],
 width = 960,
 height = 540,
): string {
 const theme = [...about, seed].map(photoThemeOf).find((found): found is PhotoTheme => found != null) ?? 'office';
 return `${UNSPLASH}${pick(THEMES[theme], seed.trim())}?w=${width}&h=${height}&fit=crop&crop=entropy&auto=format&q=75`;
}
