/**
 * Every capability the studio assistant has, declared once.
 *
 * The deterministic operator in `services/assistantOps.ts` already performs
 * each of these against the same lists the pages read. What was missing is a
 * *declaration*: one place that says what each capability is called, whether it
 * reads or changes something, which arguments it takes, how far an undo can
 * take it back and what a person would type to reach it. Without that, the
 * model could not be offered the tools, the capabilities page could not list
 * them, and nothing proved that a sentence reached the tool it was meant for.
 *
 * Execution stays in one place on purpose. A model never calls a function
 * here: it picks an action and its arguments, `command()` turns them into the
 * canonical sentence the operator already understands, and the operator runs
 * it in "propose" mode — so a write chosen by the model still becomes a card
 * the person confirms, with the same undo, exactly as if they had typed it.
 *
 * The eval suite (`catalog.eval.test.ts`) checks that every `example` and every
 * `command()` reaches the declared `tool`, so a declaration cannot drift from
 * the router without a failing test.
 */

export type Bilingual = { en: string; el: string };

/** `read` answers; `write` changes the person's data and always asks first; `navigate` moves; `preference` changes how the studio looks or answers. */
export type ActionKind = 'read' | 'write' | 'navigate' | 'preference';

export type ActionArea = 'people' | 'messages' | 'venture' | 'fundraising' | 'calendar' | 'ecosystem' | 'account' | 'studio';

export type ActionParam = {
  name: string;
  type: 'string' | 'number';
  required: boolean;
  /** What the model sees. Written for the model, in English. */
  description: string;
  enum?: readonly string[];
};

export type ActionReversal = 'full' | 'partial' | 'none';

export type ActionDeclaration = {
  /** Stable snake_case name offered to the model. */
  id: string;
  /** The operator tool this action resolves to (the `tool` on its result). */
  tool: string;
  kind: ActionKind;
  area: ActionArea;
  label: Bilingual;
  /** Model-facing description: what it does and when to choose it. */
  description: string;
  params: readonly ActionParam[];
  /** How far Undo takes a write back. Present on every write. */
  reversal?: ActionReversal;
  /** What a person would type. Shown on the capabilities page, checked by the eval. */
  example: Bilingual;
  /** Arguments the eval uses to prove `command()` resolves to `tool`. */
  sampleArgs?: Record<string, string>;
  /** The canonical sentence the operator resolves for these arguments. */
  command: (args: Record<string, string>) => string;
};

export const AREA_LABELS: Record<ActionArea, Bilingual> = {
  people: { en: 'People & matching', el: 'Άνθρωποι & αντιστοιχίσεις' },
  messages: { en: 'Messages', el: 'Μηνύματα' },
  venture: { en: 'Your venture', el: 'Το venture σου' },
  fundraising: { en: 'Fundraising', el: 'Χρηματοδότηση' },
  calendar: { en: 'Calendar & mentors', el: 'Ημερολόγιο & μέντορες' },
  ecosystem: { en: 'Ecosystem', el: 'Οικοσύστημα' },
  account: { en: 'Profile & settings', el: 'Προφίλ & ρυθμίσεις' },
  studio: { en: 'Studio', el: 'Studio' },
};

const arg = (args: Record<string, string>, key: string, fallback = ''): string => (args[key] ?? fallback).toString().trim();

/** Qualifier search syntax the Matches page and the operator share (`role:Founder location:"Athens"`). */
function qualifiers(args: Record<string, string>): string {
  const parts: string[] = [];
  for (const key of ['role', 'skill', 'industry', 'stage', 'location'] as const) {
    const value = arg(args, key);
    if (value) parts.push(/\s/.test(value) ? `${key}:"${value}"` : `${key}:${value}`);
  }
  return parts.join(' ');
}

const PRIVACY_PHRASES: Record<string, string> = {
  discoverable_on: 'show me in discovery',
  discoverable_off: 'hide me from discovery',
  email_on: 'show my email',
  email_off: 'hide my email',
  presence_on: 'share my presence',
  presence_off: 'stop sharing my online presence',
  messages_anyone: 'let anyone message me',
  messages_connections: 'only connections can message me',
  messages_none: 'no one can message me',
  mentoring_on: 'accept mentor requests',
  mentoring_off: 'stop mentor requests',
  profile_public: 'make my profile public',
  profile_private: 'make my profile private',
};

const ROUND_FIELDS: Record<string, string> = {
  target: 'target',
  committed: 'committed',
  burn: 'monthly burn',
  cash: 'cash on hand',
  valuation: 'valuation cap',
  discount: 'discount',
};

/** Page slugs the navigate and pin actions accept; the operator resolves the same words. */
export const PAGE_SLUGS = [
  'dashboard', 'matches', 'discovery', 'network', 'mentors', 'communities', 'events', 'programs',
  'workspace', 'founder-tools', 'fundraising', 'milestones', 'calendar', 'resources', 'insights',
  'legal', 'perks', 'notifications', 'profile', 'settings', 'messages',
] as const;

/** Page words the operator's navigate step recognises for each slug. */
const NAVIGATE_WORDS: Record<string, string> = {
  dashboard: 'dashboard', matches: 'matches', discovery: 'discovery', network: 'network', mentors: 'mentors',
  communities: 'communities', events: 'events', programs: 'programs', workspace: 'workspace',
  'founder-tools': 'founder tools', fundraising: 'fundraising', milestones: 'milestones', calendar: 'calendar',
  resources: 'resources', insights: 'insights', legal: 'legal hub', perks: 'perks', notifications: 'notifications',
  profile: 'profile', settings: 'settings', messages: 'messages',
};

export const COMMUNITY_NAMES = ['Fintech Founders', 'AI & Machine Learning', 'SaaS Builders', 'Web3 & Crypto'] as const;
export const PERK_NAMES = ['Amazon Web Services', 'Stripe', 'HubSpot', 'Notion', 'Google Cloud', 'Intercom', 'Slack', 'Mercury'] as const;

export const ACTION_CATALOG: readonly ActionDeclaration[] = [
  // ── People & matching ──────────────────────────────────────────────────
  {
    id: 'find_matches',
    tool: 'matches',
    kind: 'read',
    area: 'people',
    label: { en: 'Rank people for you', el: 'Κατάταξη ανθρώπων για σένα' },
    description: 'Rank co-founder candidates from the member directory with the same scorer the Matches page uses. Optional filters narrow the list.',
    params: [
      { name: 'role', type: 'string', required: false, description: 'Directory role to filter by, e.g. Founder, Mentor, Investor.' },
      { name: 'skill', type: 'string', required: false, description: 'A skill the person must have, e.g. TypeScript or Sales.' },
      { name: 'industry', type: 'string', required: false, description: 'Industry, e.g. FinTech.' },
      { name: 'stage', type: 'string', required: false, description: 'Venture stage, e.g. Idea, Pre-seed, Seed.' },
      { name: 'location', type: 'string', required: false, description: 'City or country.' },
    ],
    example: { en: 'Who is my best match?', el: 'Ποια είναι η καλύτερη αντιστοίχιση;' },
    sampleArgs: { skill: 'TypeScript', location: 'San Francisco' },
    command: (args) => {
      const q = qualifiers(args);
      return q ? `/match ${q}` : '/match';
    },
  },
  {
    id: 'explain_match',
    tool: 'match-detail',
    kind: 'read',
    area: 'people',
    label: { en: 'Explain a match score', el: 'Εξήγηση σκορ αντιστοίχισης' },
    description: 'Explain why the viewer matches a named member: the strongest dimension, the friction, and a first conversation topic.',
    params: [{ name: 'person', type: 'string', required: true, description: 'Full name of the member.' }],
    example: { en: 'Why do I match with Sarah Chen?', el: 'Γιατί ταιριάζω με τη Sarah Chen;' },
    sampleArgs: { person: 'Marcus Thorne' },
    command: (args) => `Why do I match with ${arg(args, 'person')}?`,
  },
  {
    id: 'about_person',
    tool: 'about-person',
    kind: 'read',
    area: 'people',
    label: { en: 'Look up a member', el: 'Πληροφορίες για μέλος' },
    description: 'Say who a named member is: role and headline from the directory.',
    params: [{ name: 'person', type: 'string', required: true, description: 'Full name of the member.' }],
    example: { en: 'Tell me about Marcus Thorne', el: 'Πες μου για τον Marcus Thorne' },
    sampleArgs: { person: 'Jordan Taylor' },
    command: (args) => `Tell me about ${arg(args, 'person')}`,
  },
  {
    id: 'team_gaps',
    tool: 'team-gap',
    kind: 'read',
    area: 'people',
    label: { en: 'What the team still lacks', el: 'Τι λείπει στην ομάδα' },
    description: 'Compare the viewer’s skills and looking-for with the directory and say which roles the founding team still lacks.',
    params: [],
    example: { en: 'What does my founding team still lack?', el: 'Τι λείπει ακόμα στην ιδρυτική ομάδα;' },
    command: () => 'What does my founding team still lack?',
  },
  {
    id: 'scout_people',
    tool: 'scout',
    kind: 'read',
    area: 'people',
    label: { en: 'Propose three people', el: 'Πρόταση τριών ανθρώπων' },
    description: 'Propose the three best-fitting members with a draft first note. Never sends anything.',
    params: [],
    example: { en: 'Propose three people — do not send', el: 'Πρότεινε τρεις — χωρίς αποστολή' },
    command: () => '/scout',
  },
  {
    id: 'week_meet',
    tool: 'week-meet',
    kind: 'read',
    area: 'people',
    label: { en: 'Who to meet this week', el: 'Ποιον να γνωρίσεις αυτή την εβδομάδα' },
    description: 'Suggest one person and one session worth the viewer’s time this week.',
    params: [],
    example: { en: 'Who should I meet this week?', el: 'Ποιον να γνωρίσω αυτή την εβδομάδα;' },
    command: () => 'Who should I meet this week?',
  },
  {
    id: 'save_person',
    tool: 'save',
    kind: 'write',
    area: 'people',
    reversal: 'full',
    label: { en: 'Save a person', el: 'Αποθήκευση ατόμου' },
    description: 'Add a named member to the viewer’s saved list on Network.',
    params: [{ name: 'person', type: 'string', required: true, description: 'Full name of the member.' }],
    example: { en: 'Save Marcus Thorne', el: 'Αποθήκευσε τον Marcus Thorne' },
    sampleArgs: { person: 'Mia Kovacs' },
    command: (args) => `save ${arg(args, 'person')}`,
  },
  {
    id: 'connect_person',
    tool: 'connect',
    kind: 'write',
    area: 'people',
    reversal: 'partial',
    label: { en: 'Send a connection request', el: 'Αίτημα σύνδεσης' },
    description: 'Send a connection request to a named member.',
    params: [{ name: 'person', type: 'string', required: true, description: 'Full name of the member.' }],
    example: { en: 'Connect with Jordan Taylor', el: 'Σύνδεση με τον Jordan Taylor' },
    sampleArgs: { person: 'Elena Rodriguez' },
    command: (args) => `connect with ${arg(args, 'person')}`,
  },
  {
    id: 'open_to',
    tool: 'open-to',
    kind: 'write',
    area: 'people',
    reversal: 'full',
    label: { en: 'Say what you are open to', el: 'Δήλωση «ανοιχτός σε»' },
    description: 'Mark the viewer as open to a co-founder, an investor or an advisor in Settings → Privacy.',
    params: [{ name: 'kind', type: 'string', required: true, description: 'What the viewer is open to.', enum: ['co-founder', 'investor', 'advisor'] }],
    example: { en: 'Mark me as open to a co-founder', el: 'Είμαι ανοιχτός σε συνιδρυτή' },
    sampleArgs: { kind: 'investor' },
    command: (args) => `mark me as open to a ${arg(args, 'kind', 'co-founder')}`,
  },

  // ── Messages ───────────────────────────────────────────────────────────
  {
    id: 'search_messages',
    tool: 'inbox',
    kind: 'read',
    area: 'messages',
    label: { en: 'Search your messages', el: 'Αναζήτηση στα μηνύματα' },
    description: 'Search the viewer’s stored conversations for a word or phrase.',
    params: [{ name: 'query', type: 'string', required: true, description: 'Word or phrase to find.' }],
    example: { en: 'Search my messages for term sheet', el: 'Ψάξε στα μηνύματα για term sheet' },
    sampleArgs: { query: 'intro' },
    command: (args) => `search my messages for ${arg(args, 'query')}`,
  },
  {
    id: 'unread_messages',
    tool: 'inbox',
    kind: 'read',
    area: 'messages',
    label: { en: 'List unread messages', el: 'Αδιάβαστα μηνύματα' },
    description: 'List the viewer’s unread messages.',
    params: [],
    example: { en: 'Which messages are unread?', el: 'Ποια μηνύματα είναι αδιάβαστα;' },
    command: () => 'which messages are unread',
  },
  {
    id: 'send_message',
    tool: 'inbox',
    kind: 'write',
    area: 'messages',
    reversal: 'full',
    label: { en: 'Send a direct message', el: 'Αποστολή μηνύματος' },
    description: 'Send a direct message to a named member. The viewer confirms the exact text first.',
    params: [
      { name: 'person', type: 'string', required: true, description: 'Full name of the member.' },
      { name: 'body', type: 'string', required: true, description: 'The message text, written as the viewer would send it.' },
    ],
    example: { en: '/msg Sarah Chen: Shall we review the term sheet tomorrow?', el: '/msg Sarah Chen: Να δούμε το term sheet αύριο;' },
    sampleArgs: { person: 'Sarah Chen', body: 'Coffee next week?' },
    command: (args) => `/msg ${arg(args, 'person')}: ${arg(args, 'body')}`,
  },

  // ── Your venture ───────────────────────────────────────────────────────
  {
    id: 'next_step',
    tool: 'next',
    kind: 'read',
    area: 'venture',
    label: { en: 'What to do first', el: 'Τι να κάνεις πρώτα' },
    description: 'Name the single most useful next step for the viewer, and anything waiting on them.',
    params: [],
    example: { en: 'What should I do first?', el: 'Τι να κάνω πρώτα;' },
    command: () => 'What should I do first?',
  },
  {
    id: 'briefing',
    tool: 'briefing',
    kind: 'read',
    area: 'venture',
    label: { en: 'Today’s briefing', el: 'Σύνοψη ημέρας' },
    description: 'Summarise the viewer’s best match, overdue milestones and round progress.',
    params: [],
    example: { en: 'Give me today’s status', el: 'Δώσε μου τη σημερινή κατάσταση' },
    command: () => 'status today',
  },
  {
    id: 'read_canvas',
    tool: 'canvas',
    kind: 'read',
    area: 'venture',
    label: { en: 'Read the Lean Canvas', el: 'Ανάγνωση Lean Canvas' },
    description: 'Read the five Lean Canvas sections from Workspace.',
    params: [],
    example: { en: 'Show my lean canvas', el: 'Δείξε μου τον καμβά' },
    command: () => '/canvas',
  },
  {
    id: 'set_canvas',
    tool: 'canvas',
    kind: 'write',
    area: 'venture',
    reversal: 'full',
    label: { en: 'Update a Lean Canvas section', el: 'Ενημέρωση ενότητας Lean Canvas' },
    description: 'Write one Lean Canvas section on Workspace.',
    params: [
      { name: 'section', type: 'string', required: true, description: 'Which section.', enum: ['problem', 'solution', 'metrics', 'uvp', 'advantage'] },
      { name: 'value', type: 'string', required: true, description: 'The new text for that section.' },
    ],
    example: { en: 'Set canvas problem to Fragmented B2B settlements', el: 'Όρισε το canvas problem σε Κατακερματισμένοι διακανονισμοί B2B' },
    sampleArgs: { section: 'uvp', value: 'Settlement in one click' },
    command: (args) => `set canvas ${arg(args, 'section', 'problem')} to ${arg(args, 'value')}`,
  },
  {
    id: 'read_builder',
    tool: 'builder',
    kind: 'read',
    area: 'venture',
    label: { en: 'Startup Builder progress', el: 'Πρόοδος Startup Builder' },
    description: 'Read how far each of the five Startup Builder modules is filled.',
    params: [],
    example: { en: 'Show my Startup Builder progress', el: 'Δείξε την πρόοδο του Startup Builder' },
    command: () => 'Show my Startup Builder progress',
  },
  {
    id: 'set_builder',
    tool: 'builder',
    kind: 'write',
    area: 'venture',
    reversal: 'full',
    label: { en: 'Fill a Startup Builder module', el: 'Συμπλήρωση module του Builder' },
    description: 'Write the text of one Startup Builder module.',
    params: [
      { name: 'module', type: 'string', required: true, description: 'Which module.', enum: ['problem', 'solution', 'market', 'model', 'gtm'] },
      { name: 'value', type: 'string', required: true, description: 'The text for that module.' },
    ],
    example: { en: 'Set builder market to €48B European embedded finance', el: 'Όρισε builder market σε €48B embedded finance στην Ευρώπη' },
    sampleArgs: { module: 'gtm', value: 'Partner-led sales to accountants' },
    command: (args) => `set builder ${arg(args, 'module', 'problem')} to ${arg(args, 'value')}`,
  },
  {
    id: 'read_readiness',
    tool: 'readiness',
    kind: 'read',
    area: 'venture',
    label: { en: 'Venture readiness', el: 'Ετοιμότητα venture' },
    description: 'Read the venture name, one-liner and readiness score from Founder Tools.',
    params: [],
    example: { en: 'What is my readiness score?', el: 'Ποιος είναι ο δείκτης ετοιμότητας;' },
    command: () => 'What is my readiness score?',
  },
  {
    id: 'set_venture',
    tool: 'readiness',
    kind: 'write',
    area: 'venture',
    reversal: 'full',
    label: { en: 'Name your venture', el: 'Όνομα / one-liner του venture' },
    description: 'Set the venture name or one-liner shown on Founder Tools, the Deal Room and the assistant.',
    params: [
      { name: 'field', type: 'string', required: true, description: 'Which field.', enum: ['name', 'one-liner'] },
      { name: 'value', type: 'string', required: true, description: 'The new value.' },
    ],
    example: { en: 'Set startup name to AegeanFlow AI', el: 'Όρισε όνομα startup σε AegeanFlow AI' },
    sampleArgs: { field: 'one-liner', value: 'Water data for cities' },
    command: (args) => (arg(args, 'field') === 'one-liner' ? `set one-liner to ${arg(args, 'value')}` : `set startup name to ${arg(args, 'value')}`),
  },
  {
    id: 'list_tasks',
    tool: 'task-add',
    kind: 'read',
    area: 'venture',
    label: { en: 'List Workspace tasks', el: 'Εργασίες Χώρου Εργασίας' },
    description: 'List the tasks on Workspace.',
    params: [],
    example: { en: '/tasks', el: '/tasks' },
    command: () => '/tasks',
  },
  {
    id: 'add_task',
    tool: 'task-add',
    kind: 'write',
    area: 'venture',
    reversal: 'full',
    label: { en: 'Add a task', el: 'Προσθήκη εργασίας' },
    description: 'Add a task to Workspace.',
    params: [{ name: 'title', type: 'string', required: true, description: 'Task title.' }],
    example: { en: 'Add task ship landing page', el: 'Add task ship landing page' },
    sampleArgs: { title: 'Call three design partners' },
    command: (args) => `add task ${arg(args, 'title')}`,
  },
  {
    id: 'list_milestones',
    tool: 'milestones',
    kind: 'read',
    area: 'venture',
    label: { en: 'Milestones and what is overdue', el: 'Ορόσημα και εκπρόθεσμα' },
    description: 'List milestones with status, progress and due date.',
    params: [],
    example: { en: 'What is overdue?', el: 'Τι είναι εκπρόθεσμο;' },
    command: () => '/overdue',
  },
  {
    id: 'add_milestone',
    tool: 'milestone-add',
    kind: 'write',
    area: 'venture',
    reversal: 'full',
    label: { en: 'Add a milestone', el: 'Προσθήκη ορόσημου' },
    description: 'Add a milestone due in two weeks.',
    params: [{ name: 'title', type: 'string', required: true, description: 'Milestone title.' }],
    example: { en: 'Add milestone ship the MVP', el: 'Πρόσθεσε ορόσημο ship the MVP' },
    sampleArgs: { title: 'First paying customer' },
    command: (args) => `add milestone ${arg(args, 'title')}`,
  },
  {
    id: 'need_cards',
    tool: 'need',
    kind: 'read',
    area: 'venture',
    label: { en: 'Your need cards', el: 'Οι κάρτες ανάγκης σου' },
    description: 'List the viewer’s need cards (what exists, the outcome, who is missing).',
    params: [],
    example: { en: '/need', el: '/need' },
    command: () => '/need',
  },
  {
    id: 'draft_need',
    tool: 'need',
    kind: 'write',
    area: 'venture',
    reversal: 'full',
    label: { en: 'Draft a need card', el: 'Νέα κάρτα ανάγκης' },
    description: 'Open a need card for the role the team is missing.',
    params: [{ name: 'missing', type: 'string', required: true, description: 'Who is missing, e.g. "a technical co-founder".' }],
    example: { en: 'Draft a need card for a technical co-founder', el: 'Γράψε κάρτα ανάγκης για τεχνικό συνιδρυτή' },
    sampleArgs: { missing: 'a growth lead' },
    command: (args) => `Draft a need card for ${arg(args, 'missing', 'a co-founder')}`,
  },
  {
    id: 'seven_day_plan',
    tool: 'playbook',
    kind: 'write',
    area: 'venture',
    reversal: 'full',
    label: { en: 'Write a 7-day match plan', el: 'Πλάνο 7 ημερών' },
    description: 'Write seven concrete matching tasks to Workspace.',
    params: [],
    example: { en: 'Give me a 7-day match plan', el: 'Δώσε μου πλάνο 7 ημερών' },
    command: () => '/plan',
  },
  {
    id: 'invite_founders',
    tool: 'invite',
    kind: 'write',
    area: 'venture',
    reversal: 'full',
    label: { en: 'Prepare three founder invites', el: 'Τρεις προσκλήσεις ιδρυτών' },
    description: 'Prepare three invite links to the 60-second fit check.',
    params: [],
    example: { en: 'Invite 3 founders', el: 'Προσκάλεσε 3 ιδρυτές' },
    command: () => '/invite',
  },

  // ── Fundraising ────────────────────────────────────────────────────────
  {
    id: 'read_round',
    tool: 'round',
    kind: 'read',
    area: 'fundraising',
    label: { en: 'Your round', el: 'Ο γύρος σου' },
    description: 'Read the fundraising round: instrument, committed, target and runway.',
    params: [],
    example: { en: 'How is my round going?', el: 'Πώς πάει ο γύρος;' },
    command: () => '/round',
  },
  {
    id: 'set_round',
    tool: 'round-set',
    kind: 'write',
    area: 'fundraising',
    reversal: 'full',
    label: { en: 'Change a round number', el: 'Αλλαγή αριθμού γύρου' },
    description: 'Set one number of the fundraising round. Amounts accept 50k / 1.5M.',
    params: [
      { name: 'field', type: 'string', required: true, description: 'Which number.', enum: ['target', 'committed', 'burn', 'cash', 'valuation', 'discount'] },
      { name: 'value', type: 'string', required: true, description: 'The new value, e.g. "1.5M", "12k" or "20" for a discount percent.' },
    ],
    example: { en: 'Set monthly burn to 12k', el: 'Όρισε μηνιαίο burn σε 12k' },
    sampleArgs: { field: 'target', value: '2M' },
    command: (args) => `set ${ROUND_FIELDS[arg(args, 'field')] ?? arg(args, 'field', 'target')} to ${arg(args, 'value')}`,
  },
  {
    id: 'record_investment',
    tool: 'record-investment',
    kind: 'write',
    area: 'fundraising',
    reversal: 'full',
    label: { en: 'Record an investment', el: 'Καταγραφή επένδυσης' },
    description: 'Add a committed amount to the round.',
    params: [{ name: 'amount', type: 'string', required: true, description: 'Amount, e.g. "50k".' }],
    example: { en: 'Record a $50k investment in my round', el: 'Record a $50k investment' },
    sampleArgs: { amount: '25k' },
    command: (args) => `record a $${arg(args, 'amount', '50k').replace(/^\$/, '')} investment`,
  },
  {
    id: 'pipeline',
    tool: 'pipeline',
    kind: 'read',
    area: 'fundraising',
    label: { en: 'Investor pipeline', el: 'Αγωγός επενδυτών' },
    description: 'Explain the investor pipeline stages on Fundraising.',
    params: [],
    example: { en: 'Show my pipeline', el: 'Show my pipeline' },
    command: () => 'show my pipeline',
  },
  {
    id: 'programs',
    tool: 'programs',
    kind: 'read',
    area: 'fundraising',
    label: { en: 'Programs you can apply to', el: 'Προγράμματα για αίτηση' },
    description: 'List accelerators, grants and bootcamps.',
    params: [],
    example: { en: 'What programs can I apply to?', el: 'Σε ποια προγράμματα μπορώ να κάνω αίτηση;' },
    command: () => 'what programs can I apply to',
  },
  {
    id: 'apply_program',
    tool: 'apply',
    kind: 'write',
    area: 'fundraising',
    reversal: 'full',
    label: { en: 'Track an application', el: 'Παρακολούθηση αίτησης' },
    description: 'Put a draft application for a named program or opportunity on the tracking list.',
    params: [{ name: 'program', type: 'string', required: true, description: 'Program or opportunity title.' }],
    example: { en: 'Apply to Y Combinator S26', el: 'Apply to Y Combinator S26' },
    sampleArgs: { program: 'Techstars Sustainability' },
    command: (args) => `Apply to ${arg(args, 'program')}`,
  },

  // ── Calendar & mentors ─────────────────────────────────────────────────
  {
    id: 'events',
    tool: 'events',
    kind: 'read',
    area: 'calendar',
    label: { en: 'Upcoming events', el: 'Επερχόμενες εκδηλώσεις' },
    description: 'List upcoming events.',
    params: [],
    example: { en: 'What events are coming?', el: 'Ποιες εκδηλώσεις έρχονται;' },
    command: () => 'what events are coming',
  },
  {
    id: 'schedule_session',
    tool: 'session-add',
    kind: 'write',
    area: 'calendar',
    reversal: 'full',
    label: { en: 'Put a meeting on the calendar', el: 'Ραντεβού στο ημερολόγιο' },
    description: 'Add a 30-minute meeting (or a studio event) to the Calendar at 10:00 on a date, or tomorrow.',
    params: [
      { name: 'kind', type: 'string', required: false, description: 'Meeting or event.', enum: ['meeting', 'event'] },
      { name: 'date', type: 'string', required: false, description: 'Day in YYYY-MM-DD. Omit for tomorrow.' },
    ],
    example: { en: 'Schedule a meeting on my calendar', el: 'Schedule a meeting on my calendar' },
    sampleArgs: { kind: 'meeting', date: '2030-01-15' },
    command: (args) => {
      const date = arg(args, 'date');
      const base = arg(args, 'kind') === 'event' ? 'schedule a new event' : 'schedule a meeting';
      return date ? `${base} on ${date}` : `${base} on my calendar`;
    },
  },
  {
    id: 'find_mentors',
    tool: 'mentors',
    kind: 'read',
    area: 'calendar',
    label: { en: 'Find a mentor', el: 'Εύρεση μέντορα' },
    description: 'List mentors, optionally for a topic.',
    params: [{ name: 'topic', type: 'string', required: false, description: 'Topic.', enum: ['fundraising', 'product', 'growth', 'engineering'] }],
    example: { en: 'Find a fundraising mentor', el: 'Βρες μέντορα για χρηματοδότηση' },
    sampleArgs: { topic: 'growth' },
    command: (args) => (arg(args, 'topic') ? `find a ${arg(args, 'topic')} mentor` : 'find a mentor'),
  },
  {
    id: 'book_mentor',
    tool: 'book',
    kind: 'write',
    area: 'calendar',
    reversal: 'full',
    label: { en: 'Book a mentor session', el: 'Κράτηση συνάντησης με μέντορα' },
    description: 'Book a 30-minute session with a named mentor in three days.',
    params: [{ name: 'person', type: 'string', required: true, description: 'Full name of the mentor.' }],
    example: { en: 'Book a session with Sarah Chen', el: 'Κλείσε ραντεβού με τη Sarah Chen' },
    sampleArgs: { person: 'Sarah Chen' },
    command: (args) => `book a session with ${arg(args, 'person')}`,
  },
  {
    id: 'become_mentor',
    tool: 'become-mentor',
    kind: 'read',
    area: 'calendar',
    label: { en: 'How to become a mentor', el: 'Πώς γίνεσαι μέντορας' },
    description: 'Explain how the viewer can offer mentoring.',
    params: [],
    example: { en: 'How do I become a mentor?', el: 'Πώς γίνομαι μέντορας;' },
    command: () => 'How do I become a mentor?',
  },

  // ── Ecosystem ──────────────────────────────────────────────────────────
  {
    id: 'communities',
    tool: 'communities',
    kind: 'read',
    area: 'ecosystem',
    label: { en: 'Communities', el: 'Κοινότητες' },
    description: 'List communities and the ones the viewer joined.',
    params: [],
    example: { en: 'What communities can I join?', el: 'Σε ποιες κοινότητες μπορώ να μπω;' },
    command: () => 'what communities can I join',
  },
  {
    id: 'join_community',
    tool: 'communities',
    kind: 'write',
    area: 'ecosystem',
    reversal: 'full',
    label: { en: 'Join a community', el: 'Συμμετοχή σε κοινότητα' },
    description: 'Join a named community.',
    params: [{ name: 'community', type: 'string', required: true, description: 'Community name.', enum: COMMUNITY_NAMES }],
    example: { en: 'Join the Fintech Founders community', el: 'Κάνε join στην κοινότητα Fintech Founders' },
    sampleArgs: { community: 'SaaS Builders' },
    command: (args) => `join the ${arg(args, 'community', 'Fintech Founders')} community`,
  },
  {
    id: 'perks',
    tool: 'perks',
    kind: 'read',
    area: 'ecosystem',
    label: { en: 'Startup perks', el: 'Παροχές για startups' },
    description: 'List startup perks and credits.',
    params: [],
    example: { en: 'What perks can I claim?', el: 'Ποιες παροχές μπορώ να πάρω;' },
    command: () => 'What perks can I claim?',
  },
  {
    id: 'claim_perk',
    tool: 'claim-perk',
    kind: 'write',
    area: 'ecosystem',
    reversal: 'full',
    label: { en: 'Claim or track a perk', el: 'Διεκδίκηση παροχής' },
    description: 'Mark a perk claimed (sample account) or star it to track (real account).',
    params: [{ name: 'perk', type: 'string', required: true, description: 'Perk provider.', enum: PERK_NAMES }],
    example: { en: 'Claim the Amazon Web Services perk', el: 'Claim the Amazon Web Services perk' },
    sampleArgs: { perk: 'Notion' },
    command: (args) => `Claim the ${arg(args, 'perk', 'Amazon Web Services')} perk`,
  },
  {
    id: 'resources',
    tool: 'resources',
    kind: 'read',
    area: 'ecosystem',
    label: { en: 'Courses and resources', el: 'Μαθήματα και πόροι' },
    description: 'Describe Resources: courses, partner services, jobs and support.',
    params: [],
    example: { en: 'What courses are there?', el: 'Τι μαθήματα υπάρχουν;' },
    command: () => 'what courses are there',
  },
  {
    id: 'legal',
    tool: 'legal',
    kind: 'read',
    area: 'ecosystem',
    label: { en: 'Legal templates', el: 'Νομικά πρότυπα' },
    description: 'Describe the Legal Hub templates and office hours. Not legal advice.',
    params: [],
    example: { en: 'What legal templates are there?', el: 'Τι νομικά πρότυπα υπάρχουν;' },
    command: () => 'what legal templates are there',
  },
  {
    id: 'about_item',
    tool: 'about',
    kind: 'read',
    area: 'ecosystem',
    label: { en: 'Where something lives', el: 'Πού βρίσκεται κάτι' },
    description: 'Explain a named program, investor, event, perk or feature and which page holds it.',
    params: [{ name: 'topic', type: 'string', required: true, description: 'The thing to explain, e.g. "lean canvas" or "Techstars".' }],
    example: { en: 'Tell me about AWS Activate', el: 'Πες μου για το AWS Activate' },
    sampleArgs: { topic: 'readiness score' },
    command: (args) => `Tell me about ${arg(args, 'topic')}`,
  },
  {
    id: 'activity',
    tool: 'activity',
    kind: 'read',
    area: 'ecosystem',
    label: { en: 'What changed', el: 'Τι άλλαξε' },
    description: 'Read the studio activity feed, including what the assistant changed.',
    params: [],
    example: { en: 'Show my studio activity', el: 'Τι άλλαξε;' },
    command: () => 'show my studio activity',
  },

  // ── Profile & settings ─────────────────────────────────────────────────
  {
    id: 'set_profile_field',
    tool: 'profile-set',
    kind: 'write',
    area: 'account',
    reversal: 'full',
    label: { en: 'Edit your profile', el: 'Επεξεργασία προφίλ' },
    description: 'Change the viewer’s headline (≤160), bio (≤600) or location (≤80).',
    params: [
      { name: 'field', type: 'string', required: true, description: 'Which field.', enum: ['headline', 'bio', 'location'] },
      { name: 'value', type: 'string', required: true, description: 'The new text.' },
    ],
    example: { en: 'Set my headline to Building climate fintech', el: 'Άλλαξε την επικεφαλίδα μου σε Χτίζω climate fintech' },
    sampleArgs: { field: 'location', value: 'Thessaloniki, Greece' },
    command: (args) => `set my ${arg(args, 'field', 'headline')} to ${arg(args, 'value')}`,
  },
  {
    id: 'edit_skills',
    tool: 'profile-set',
    kind: 'write',
    area: 'account',
    reversal: 'full',
    label: { en: 'Add or remove a skill', el: 'Προσθήκη / αφαίρεση δεξιότητας' },
    description: 'Add a skill to, or remove one from, the viewer’s profile. Matching reads skills.',
    params: [
      { name: 'action', type: 'string', required: true, description: 'Add or remove.', enum: ['add', 'remove'] },
      { name: 'skill', type: 'string', required: true, description: 'The skill.' },
    ],
    example: { en: 'Add skill React', el: 'Πρόσθεσε δεξιότητα React' },
    sampleArgs: { action: 'add', skill: 'Go' },
    command: (args) => `${arg(args, 'action') === 'remove' ? 'remove' : 'add'} skill ${arg(args, 'skill')}`,
  },
  {
    id: 'privacy_setting',
    tool: 'settings-set',
    kind: 'write',
    area: 'account',
    reversal: 'full',
    label: { en: 'Change a privacy setting', el: 'Αλλαγή ρύθμισης απορρήτου' },
    description: 'Change one privacy switch: discoverability, email visibility, presence, who can message, mentoring requests, public profile.',
    params: [{ name: 'setting', type: 'string', required: true, description: 'The switch and its new state.', enum: Object.keys(PRIVACY_PHRASES) }],
    example: { en: 'Hide my email', el: 'Κρύψε το email μου' },
    sampleArgs: { setting: 'messages_connections' },
    command: (args) => PRIVACY_PHRASES[arg(args, 'setting')] ?? 'hide my email',
  },
  {
    id: 'notification_setting',
    tool: 'settings-set',
    kind: 'write',
    area: 'account',
    reversal: 'full',
    label: { en: 'Turn a notification on or off', el: 'Ειδοποιήσεις on/off' },
    description: 'Turn one notification topic on or off.',
    params: [
      { name: 'topic', type: 'string', required: true, description: 'Topic.', enum: ['match', 'message', 'community', 'news', 'event', 'mentor', 'fundraising', 'mention'] },
      { name: 'state', type: 'string', required: true, description: 'On or off.', enum: ['on', 'off'] },
    ],
    example: { en: 'Turn off event notifications', el: 'Απενεργοποίησε τις ειδοποιήσεις εκδηλώσεων' },
    sampleArgs: { topic: 'news', state: 'off' },
    command: (args) => `turn ${arg(args, 'state') === 'on' ? 'on' : 'off'} ${arg(args, 'topic', 'event')} notifications`,
  },
  {
    id: 'mark_notifications_read',
    tool: 'notifications-read',
    kind: 'write',
    area: 'account',
    reversal: 'partial',
    label: { en: 'Mark notifications read', el: 'Σήμανση ειδοποιήσεων ως αναγνωσμένων' },
    description: 'Mark every notification as read.',
    params: [],
    example: { en: 'Mark all notifications read', el: 'Καθάρισε τις ειδοποιήσεις' },
    command: () => 'mark all notifications read',
  },
  {
    id: 'fit_check',
    tool: 'fit-check',
    kind: 'read',
    area: 'account',
    label: { en: 'Your fit check', el: 'Το fit check σου' },
    description: 'Recall the viewer’s 60-second fit-check archetype, or open it.',
    params: [],
    example: { en: 'What is my fit check?', el: 'Ποιο είναι το fit check μου;' },
    command: () => '/quiz',
  },

  // ── Studio ─────────────────────────────────────────────────────────────
  {
    id: 'navigate',
    tool: 'navigate',
    kind: 'navigate',
    area: 'studio',
    label: { en: 'Open a page', el: 'Άνοιγμα σελίδας' },
    description: 'Take the viewer to a page of the studio.',
    params: [{ name: 'page', type: 'string', required: true, description: 'Page.', enum: PAGE_SLUGS }],
    example: { en: 'Open fundraising', el: 'Άνοιξε τη χρηματοδότηση' },
    sampleArgs: { page: 'calendar' },
    command: (args) => `open ${NAVIGATE_WORDS[arg(args, 'page')] ?? 'dashboard'}`,
  },
  {
    id: 'open_studio_view',
    tool: 'studio-modal',
    kind: 'navigate',
    area: 'studio',
    label: { en: 'Open a studio view', el: 'Άνοιγμα προβολής studio' },
    description: 'Open the 6-axis score breakdown (optionally for a person), the Deal Room or the Need Cards wall.',
    params: [
      { name: 'view', type: 'string', required: true, description: 'Which view.', enum: ['6axis', 'dealroom', 'needwall'] },
      { name: 'person', type: 'string', required: false, description: 'For 6axis: the member to inspect.' },
    ],
    example: { en: 'Open deal room', el: 'Άνοιξε το deal room' },
    sampleArgs: { view: '6axis', person: 'Sarah Chen' },
    command: (args) => `/${arg(args, 'view', 'dealroom')}${arg(args, 'person') ? ` ${arg(args, 'person')}` : ''}`,
  },
  {
    id: 'set_theme',
    tool: 'settings-set',
    kind: 'preference',
    area: 'studio',
    label: { en: 'Switch theme', el: 'Αλλαγή θέματος' },
    description: 'Switch the colour theme.',
    params: [{ name: 'theme', type: 'string', required: true, description: 'Theme.', enum: ['stone', 'dark', 'cyan', 'mint', 'apricot', 'lilac', 'burgundy'] }],
    example: { en: '/theme dark', el: '/theme dark' },
    sampleArgs: { theme: 'mint' },
    command: (args) => `/theme ${arg(args, 'theme', 'stone')}`,
  },
  {
    id: 'set_language',
    tool: 'settings-set',
    kind: 'preference',
    area: 'studio',
    label: { en: 'Switch language', el: 'Αλλαγή γλώσσας' },
    description: 'Switch the interface language.',
    params: [{ name: 'language', type: 'string', required: true, description: 'Language.', enum: ['en', 'el'] }],
    example: { en: '/lang el', el: '/lang en' },
    sampleArgs: { language: 'el' },
    command: (args) => `/lang ${arg(args, 'language', 'en')}`,
  },
  {
    id: 'set_reply_style',
    tool: 'settings-set',
    kind: 'preference',
    area: 'studio',
    reversal: 'full',
    label: { en: 'How I reply', el: 'Πώς απαντώ' },
    description: 'Set how the assistant replies: length, tone, emoji.',
    params: [
      { name: 'length', type: 'string', required: false, description: 'Reply length.', enum: ['short', 'balanced', 'detailed'] },
      { name: 'tone', type: 'string', required: false, description: 'Tone.', enum: ['friendly', 'direct', 'formal'] },
      { name: 'emoji', type: 'string', required: false, description: 'Emoji on or off.', enum: ['on', 'off'] },
    ],
    example: { en: '/style short direct', el: '/style short direct' },
    sampleArgs: { length: 'detailed', tone: 'formal' },
    command: (args) => ['/style', arg(args, 'length'), arg(args, 'tone'), arg(args, 'emoji') ? `emoji ${arg(args, 'emoji')}` : ''].filter(Boolean).join(' '),
  },
  {
    id: 'ux_coach',
    tool: 'coach',
    kind: 'read',
    area: 'studio',
    label: { en: 'Shortcuts from how you work', el: 'Συντομεύσεις από τη χρήση σου' },
    description: 'Read how the viewer uses the studio and suggest pins and a home page.',
    params: [],
    example: { en: '/coach', el: '/coach' },
    command: () => '/coach',
  },
  {
    id: 'pin_page',
    tool: 'pin',
    kind: 'preference',
    area: 'studio',
    reversal: 'full',
    label: { en: 'Pin a page to the sidebar', el: 'Καρφίτσωμα σελίδας' },
    description: 'Pin a page to the sidebar.',
    params: [{ name: 'page', type: 'string', required: true, description: 'Page.', enum: PAGE_SLUGS }],
    example: { en: '/pin matches', el: '/pin matches' },
    sampleArgs: { page: 'fundraising' },
    command: (args) => `/pin ${arg(args, 'page', 'matches')}`,
  },
  {
    id: 'set_home',
    tool: 'home',
    kind: 'preference',
    area: 'studio',
    reversal: 'full',
    label: { en: 'Choose your home page', el: 'Επιλογή αρχικής σελίδας' },
    description: 'Choose the page the viewer lands on, or clear it.',
    params: [{ name: 'page', type: 'string', required: true, description: 'Page, or "off" to clear.', enum: [...PAGE_SLUGS, 'off'] }],
    example: { en: '/home matches', el: '/home matches' },
    sampleArgs: { page: 'workspace' },
    command: (args) => `/home ${arg(args, 'page', 'off')}`,
  },
  {
    id: 'help',
    tool: 'help',
    kind: 'read',
    area: 'studio',
    label: { en: 'What I can change', el: 'Τι μπορώ να αλλάξω' },
    description: 'List what the assistant can read and change.',
    params: [],
    example: { en: '/help', el: '/help' },
    command: () => '/help',
  },
] as const;

export function actionById(id: string): ActionDeclaration | undefined {
  return ACTION_CATALOG.find((action) => action.id === id);
}

export function actionsByArea(): { area: ActionArea; label: Bilingual; actions: ActionDeclaration[] }[] {
  const order = Object.keys(AREA_LABELS) as ActionArea[];
  return order
    .map((area) => ({ area, label: AREA_LABELS[area], actions: ACTION_CATALOG.filter((action) => action.area === area) }))
    .filter((group) => group.actions.length > 0);
}

export type ArgCheck = { ok: true; args: Record<string, string> } | { ok: false; missing: string[]; invalid: string[] };

/**
 * Validates what a model proposed against the declaration: required arguments
 * present, closed sets respected, unknown keys dropped. A model is free to be
 * wrong; the catalogue is not.
 */
export function checkArgs(action: ActionDeclaration, raw: Record<string, unknown> | undefined): ArgCheck {
  const args: Record<string, string> = {};
  const missing: string[] = [];
  const invalid: string[] = [];
  for (const param of action.params) {
    const value = raw?.[param.name];
    const text = value === null || value === undefined ? '' : String(value).trim();
    if (!text) {
      if (param.required) missing.push(param.name);
      continue;
    }
    if (param.enum && !param.enum.some((option) => option.toLowerCase() === text.toLowerCase())) {
      invalid.push(param.name);
      continue;
    }
    const canonical = param.enum?.find((option) => option.toLowerCase() === text.toLowerCase()) ?? text;
    args[param.name] = canonical.slice(0, 600);
  }
  if (missing.length || invalid.length) return { ok: false, missing, invalid };
  return { ok: true, args };
}

/** The Gemini `functionDeclarations` the catalogue offers a model. */
export function toFunctionDeclarations(actions: readonly ActionDeclaration[] = ACTION_CATALOG) {
  return actions.map((action) => ({
    name: action.id,
    description: `${action.description}${action.kind === 'write' ? ' The person confirms before anything changes.' : ''}`,
    parameters: {
      type: 'OBJECT',
      properties: Object.fromEntries(
        action.params.map((param) => [
          param.name,
          {
            type: param.type === 'number' ? 'NUMBER' : 'STRING',
            description: param.description,
            ...(param.enum ? { enum: [...param.enum] } : {}),
          },
        ]),
      ),
      required: action.params.filter((param) => param.required).map((param) => param.name),
    },
  }));
}
