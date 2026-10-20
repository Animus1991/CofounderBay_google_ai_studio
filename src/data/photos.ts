/**
 * Demo photos — topical covers for events, programs and courses.
 *
 * Demo people get a fixed, gender-matched face portrait; names the gender
 * sets do not know still fall back to initials (an empty string).
 *
 * Covers: the title/type/tags pick a theme ("pitch" → a speaker on stage,
 * "coffee" → cups, "energy" → turbines, "Athens" → the Acropolis), the seed
 * picks one photo of that theme, so a card keeps its cover on every page.
 *
 * Every photo is from Unsplash (free to use; hotlinking is how Unsplash asks
 * to be used).
 */

const UNSPLASH = 'https://images.unsplash.com/photo-';

/* --------------------------------------------------------------- portraits */

export const WOMEN_IDS = [
 '1567532939604-b6b5b0db2604', '1573497019236-17f8177b81e8', '1580489944761-15a19d654956', '1607746882042-944635dfe10e',
 '1544005313-94ddf0286df2', '1494790108377-be9c29b29330', '1573496359142-b8d87734a5a2', '1438761681033-6461ffad8d80',
 '1614644147724-2d4785d69962', '1594744803329-e58b31de8bf5', '1508214751196-bcfd4ca60f91', '1531123897727-8f129e1688ce',
 '1499952127939-9bbf5af6c51c', '1609505848912-b7c3b8b4beda', '1619895862022-09114b41f16f', '1573497019940-1c28c88b4f3e',
 '1592621385612-4d7129426394', '1548142813-c348350df52b', '1573496799652-408c2ac9fe98', '1611432579699-484f7990b127',
 '1525134479668-1bee5c7c6845', '1554151228-14d9def656e4', '1618835962148-cf177563c6c0', '1601412436009-d964bd02edbc',
 '1534528741775-53994a69daeb', '1489424731084-a5d8b219a5bb', '1546961329-78bef0414d7c', '1488426862026-3ee34a7d66df',
 '1566616213894-2d4e1baee5d8', '1598550874175-4d0ef436c909', '1557555187-23d685287bc3', '1586297135537-94bc9ba060aa',
 '1487412720507-e7ab37603c6f', '1567336273898-ebbf9eb3c3bf', '1542206395-9feb3edaa68d', '1544725176-7c40e5a71c5e',
] as const;

export const MEN_IDS = [
 '1611403119860-57c4937ef987', '1560250097-0b93528c311a', '1547425260-76bcadfb4f2c', '1545167622-3a6ac756afa4',
 '1507003211169-0a1dd7228f2d', '1618077360395-f3068be8e001', '1500648767791-00dcc994a43e', '1633332755192-727a05c4013d',
 '1531427186611-ecfd6d936c79', '1506794778202-cad84cf45f1d', '1599566150163-29194dcaad36', '1570295999919-56ceb5ecca61',
 '1590086782957-93c06ef21604', '1590086782792-42dd2350140d', '1527980965255-d3b416303d12', '1535713875002-d1d0cf377fde',
 '1566492031773-4f4e44671857', '1600180758890-6b94519a8ba6', '1629425733761-caae3b5f2e50', '1472099645785-5658abf4ff4e',
 '1557862921-37829c790f19', '1474176857210-7287d38d27c6', '1568602471122-7832951cc4c5', '1615109398623-88346a601842',
 '1504257432389-52343af06ae3', '1519085360753-af0119f7cbe7', '1552058544-f2b08422138a', '1528892952291-009c663ce843',
 '1584999734482-0361aecad844', '1463453091185-61582044d556', '1595152772835-219674b2a8a6', '1539571696357-5a69c17a67c6',
 '1564564321837-a57b7070ac4f', '1541647376583-8934aaf3448a', '1558203728-00f45181dd84', '1492562080023-ab3db95bfbce',
] as const;

/** One fixed face per cast member, matched by name and gender — all distinct. */
const CAST_PORTRAITS: Record<string, string> = {
 'sarah-chen': '1614644147724-2d4785d69962',
 'alex-rivera': '1500648767791-00dcc994a43e',
 'marcus-thorne': '1611403119860-57c4937ef987',
 'elena-rodriguez': '1567532939604-b6b5b0db2604',
 'david-park': '1568602471122-7832951cc4c5',
 'emma-kim': '1554151228-14d9def656e4',
 'jordan-taylor': '1527980965255-d3b416303d12',
 'priya-sharma': '1488426862026-3ee34a7d66df',
 'mia-kovacs': '1598550874175-4d0ef436c909',
 'james-wilson': '1506794778202-cad84cf45f1d',
 'leila-hassan': '1557555187-23d685287bc3',
 'david-hoffman': '1615109398623-88346a601842',
 'elena-rossi': '1601412436009-d964bd02edbc',
 'samir-patel': '1633332755192-727a05c4013d',
 'jessica-wu': '1548142813-c348350df52b',
 'daniel-weiss': '1552058544-f2b08422138a',
};

const WOMEN_NAMES = new Set([
 'anna', 'maria', 'elena', 'eleni', 'helena', 'helen', 'sofia', 'sophia', 'katerina', 'catherine', 'christina', 'ioanna',
 'joanna', 'irini', 'eirini', 'irene', 'lydia', 'chrysa', 'vasso', 'vasiliki', 'georgia', 'dimitra', 'despina', 'athena',
 'penelope', 'zoe', 'nefeli', 'danae', 'sarah', 'sara', 'jane', 'emma', 'lisa', 'priya', 'andreea', 'olivia', 'emily',
 'laura', 'julia', 'anastasia', 'natalia', 'alexandra', 'eva', 'mia', 'marina', 'theodora', 'angeliki', 'konstantina',
 'panagiota', 'fotini', 'stella', 'rena', 'niki', 'kalliopi', 'effie', 'myrto', 'artemis', 'evi', 'kate', 'rachel',
 'jessica', 'amanda', 'linda', 'susan', 'karen', 'nancy', 'amy', 'ana', 'lucia', 'chloe', 'grace',
 'αννα', 'μαρια', 'ελενα', 'ελενη', 'σοφια', 'κατερινα', 'χριστινα', 'ιωαννα', 'ειρηνη', 'λυδια', 'χρυσα', 'βασω',
 'γεωργια', 'δημητρα', 'δεσποινα', 'αθηνα', 'πηνελοπη', 'ζωη', 'νεφελη', 'δαναη', 'σταυρουλα', 'μυρτω', 'φωτεινη',
]);

const MEN_NAMES = new Set([
 'marcus', 'nikos', 'nick', 'nicholas', 'nikolas', 'yannis', 'giannis', 'john', 'james', 'dimitris', 'giorgos', 'george',
 'thanos', 'athanasios', 'stavros', 'spyros', 'petros', 'peter', 'mike', 'michael', 'michalis', 'kostas', 'konstantinos',
 'fotis', 'david', 'andreas', 'andrew', 'tom', 'thomas', 'klaus', 'alexis', 'alexandros', 'christos', 'vasilis', 'panagiotis',
 'manolis', 'antonis', 'stelios', 'lefteris', 'sotiris', 'ilias', 'elias', 'aris', 'haris', 'pavlos', 'paul', 'mark',
 'daniel', 'robert', 'richard', 'william', 'joseph', 'charles', 'matthew', 'ben', 'jack', 'ryan', 'kevin', 'brian',
 'jason', 'eric', 'steven', 'raj', 'arjun', 'omar', 'ali', 'lukas', 'jonas', 'felix', 'leo', 'max',
 'νικος', 'γιαννης', 'δημητρης', 'γιωργος', 'θανος', 'σταυρος', 'σπυρος', 'πετρος', 'κωστας', 'φωτης', 'ανδρεας',
 'μιχαλης', 'αλεξης', 'χρηστος', 'βασιλης', 'παναγιωτης', 'μανωλης', 'αντωνης', 'στελιος', 'ηλιας', 'αρης', 'παυλος',
]);

const CAST_FACES = new Set(Object.values(CAST_PORTRAITS));
const FREE_WOMEN = WOMEN_IDS.filter((id) => !CAST_FACES.has(id));
const FREE_MEN = MEN_IDS.filter((id) => !CAST_FACES.has(id));

/**
 * A face portrait for a demo/sample person. Cast members keep a fixed,
 * matched face; any other known first name picks deterministically from the
 * faces no cast member uses. Unknown or non-person names get '' so the
 * Avatar shows initials instead of a stranger.
 */
export function portraitFor(id: string, fullName: string, size = 200): string {
 const photoId = CAST_PORTRAITS[id] ?? (() => {
  const first = plain(fullName).split(/[^a-zα-ω]+/u).filter(Boolean)[0] ?? '';
  if (WOMEN_NAMES.has(first)) return pick(FREE_WOMEN, id);
  if (MEN_NAMES.has(first)) return pick(FREE_MEN, id);
  return '';
 })();
 return photoId ? `${UNSPLASH}${photoId}?w=${size}&h=${size}&fit=crop&crop=faces&auto=format&q=75` : '';
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
