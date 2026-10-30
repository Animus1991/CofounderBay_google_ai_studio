/**
 * Seed the platform catalogues with honest, platform-authored starter content.
 *
 * Real accounts read `programs`, `events`, `learningResources`, `services`,
 * `jobs`, `perks` and `communities` straight from Firestore — at launch those
 * collections are empty until an admin publishes. Run once after the first
 * admin account exists:
 *
 *   CFB_ADMIN_EMAIL=admin@yourdomain.com CFB_ADMIN_PASSWORD=… node scripts/seed-catalog.mjs
 *
 * The script authenticates as that admin (rules allow admin writes to the
 * catalogues), is idempotent (fixed document ids + merge), and only writes
 * documents it owns — member data is never touched.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'firebase-applet-config.json'), 'utf8'));

const email = process.env.CFB_ADMIN_EMAIL;
const password = process.env.CFB_ADMIN_PASSWORD;
if (!email || !password) {
  console.error('Set CFB_ADMIN_EMAIL and CFB_ADMIN_PASSWORD to an admin account first.');
  process.exit(1);
}

const { initializeApp } = await import('firebase/app');
const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
const { getFirestore, doc, setDoc, serverTimestamp } = await import('firebase/firestore');

const app = initializeApp({
  projectId: config.projectId,
  appId: config.appId,
  apiKey: config.apiKey,
  authDomain: config.authDomain,
});
const auth = getAuth(app);
const user = await signInWithEmailAndPassword(auth, email, password);
const db = getFirestore(app, config.firestoreDatabaseId);

const inDays = (days, hour = 17) => {
  const d = new Date(Date.now() + days * 86400000);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
};

const owner = user.user.uid;

const writes = [
  // ── Programs — platform-run, no invented partners or funding figures ──
  ['programs/founder-sprint', {
    id: 'founder-sprint',
    title: 'Founder Sprint',
    type: 'Program',
    organizer: 'CoFounderBay',
    location: 'Remote',
    deadline: inDays(21),
    status: 'Open',
    focus: ['Validation', 'MVP', 'Customer discovery'],
    description: 'A four-week, cohort-based sprint run by CoFounderBay: weekly milestones, peer reviews and a final readiness check.',
  }],
  ['programs/idea-validation-week', {
    id: 'idea-validation-week',
    title: 'Idea Validation Week',
    type: 'Workshop series',
    organizer: 'CoFounderBay',
    location: 'Remote',
    deadline: inDays(10),
    status: 'Open',
    focus: ['Problem definition', 'Interviews'],
    description: 'A guided week of structured customer interviews and problem validation, ending with a scored evidence review.',
  }],
  ['programs/investor-readiness', {
    id: 'investor-readiness',
    title: 'Investor Readiness Review',
    type: 'Review',
    organizer: 'CoFounderBay',
    location: 'Remote',
    deadline: inDays(45),
    status: 'Open',
    focus: ['Fundraising', 'Metrics', 'Pitch'],
    description: 'Submit your deck and metrics for a structured readiness review against the platform checklist.',
  }],

  // ── Events — recurring platform sessions ──
  ['events/weekly-founder-standup', {
    id: 'weekly-founder-standup',
    title: 'Weekly Founder Standup',
    type: 'Meetup',
    location: 'Online',
    organizer: 'CoFounderBay',
    datetime: inDays(3),
    status: 'Upcoming',
    description: 'Thirty minutes, every week: what shipped, what is blocked, who can help. Open to all members.',
  }],
  ['events/open-office-hours', {
    id: 'open-office-hours',
    title: 'Open Office Hours',
    type: 'AMA',
    location: 'Online',
    organizer: 'CoFounderBay',
    datetime: inDays(7),
    status: 'Upcoming',
    description: 'Bring one question about fundraising, product or hiring — mentors and the team answer live.',
  }],
  ['events/demo-day', {
    id: 'demo-day',
    title: 'Community Demo Day',
    type: 'Demo',
    location: 'Online',
    organizer: 'CoFounderBay',
    datetime: inDays(30, 18),
    status: 'Upcoming',
    description: 'Members present five-minute demos to the community and invited mentors. Apply through the event page.',
  }],

  // ── Learning resources — authored by the platform ──
  ['learningResources/pitch-deck-fundamentals', {
    id: 'pitch-deck-fundamentals',
    title: 'Pitch Deck Fundamentals',
    instructor: 'CoFounderBay',
    duration: '45m',
    level: 'Beginner',
    rating: 0,
    description: 'The ten slides every early-stage deck needs, with the questions each one must answer.',
  }],
  ['learningResources/metrics-that-matter', {
    id: 'metrics-that-matter',
    title: 'Metrics That Matter',
    instructor: 'CoFounderBay',
    duration: '60m',
    level: 'Intermediate',
    rating: 0,
    description: 'Which numbers investors actually read at pre-seed and seed — and how to instrument them.',
  }],
  ['learningResources/legal-basics-for-founders', {
    id: 'legal-basics-for-founders',
    title: 'Legal Basics for Founders',
    instructor: 'CoFounderBay',
    duration: '50m',
    level: 'Beginner',
    rating: 0,
    description: 'Incorporation, founder agreements and IP assignment — the minimum you must get right.',
  }],
  ['learningResources/finding-pmf', {
    id: 'finding-pmf',
    title: 'Finding Product-Market Fit',
    instructor: 'CoFounderBay',
    duration: '90m',
    level: 'Advanced',
    rating: 0,
    description: 'A practical framework for measuring retention, running experiments and reading the signals.',
  }],

  // ── Services — offered by the platform ──
  ['services/pitch-review', {
    id: 'pitch-review',
    name: 'Pitch Review',
    provider: 'CoFounderBay',
    type: 'Review',
    price: 'Free',
    rating: 0,
    description: 'A structured, async review of your pitch deck against the readiness checklist.',
  }],
  ['services/cap-table-check', {
    id: 'cap-table-check',
    name: 'Cap Table Health Check',
    provider: 'CoFounderBay',
    type: 'Review',
    price: 'Free',
    rating: 0,
    description: 'A second pair of eyes on your cap table before your first priced round.',
  }],
  ['services/intro-call', {
    id: 'intro-call',
    name: 'Onboarding Call',
    provider: 'CoFounderBay',
    type: 'Call',
    price: 'Free',
    rating: 0,
    description: 'A 20-minute call to set your goals, complete your profile and find your first matches.',
  }],

  // ── Perks — real, publicly available founder programs. Each links to the
  // provider's own site; descriptions avoid any partnership claim. ──
  ['perks/aws-activate', {
    id: 'aws-activate',
    name: 'AWS Activate',
    category: 'cloud',
    value: 'Up to $100,000 credits',
    description: 'Public AWS program for startups: cloud credits, support and training. Apply on the AWS site.',
    url: 'https://aws.amazon.com/activate',
    featured: true,
  }],
  ['perks/google-startups-cloud', {
    id: 'google-startups-cloud',
    name: 'Google for Startups Cloud Program',
    category: 'cloud',
    value: 'Up to $200,000 credits',
    description: 'Public Google program: cloud credits for eligible early-stage startups. Apply on the Google site.',
    url: 'https://cloud.google.com/startup',
  }],
  ['perks/notion-startups', {
    id: 'notion-startups',
    name: 'Notion for Startups',
    category: 'productivity',
    value: 'Free workspace months',
    description: 'Public Notion program: free Plus plan months for eligible startups. Apply on the Notion site.',
    url: 'https://www.notion.com/startups',
  }],
  ['perks/hubspot-startups', {
    id: 'hubspot-startups',
    name: 'HubSpot for Startups',
    category: 'marketing',
    value: 'Tiered discounts',
    description: 'Public HubSpot program: scaled discounts on the growth suite. Apply on the HubSpot site.',
    url: 'https://www.hubspot.com/startups',
  }],
  ['perks/intercom-early-stage', {
    id: 'intercom-early-stage',
    name: 'Intercom Early Stage',
    category: 'marketing',
    value: 'Early-stage discount',
    description: 'Public Intercom program: discounted support suite for early-stage startups. Apply on the Intercom site.',
    url: 'https://www.intercom.com/early-stage',
  }],

  // ── Communities — materialise the four platform spaces so counts are real ──
  ['communities/fintech-founders', {
    id: 'fintech-founders',
    title: 'Fintech Founders',
    description: 'A space for entrepreneurs building the future of finance, banking, and payments.',
    category: 'Industry',
    tags: [],
    isPublic: true,
    ownerId: owner,
    memberIds: [],
    memberCount: 0,
    postCount: 0,
  }],
  ['communities/ai-machine-learning', {
    id: 'ai-machine-learning',
    title: 'AI & Machine Learning',
    description: 'Discussing the latest in LLMs, computer vision, and AI-driven applications.',
    category: 'Technology',
    tags: [],
    isPublic: true,
    ownerId: owner,
    memberIds: [],
    memberCount: 0,
    postCount: 0,
  }],
  ['communities/saas-builders', {
    id: 'saas-builders',
    title: 'SaaS Builders',
    description: 'Everything about building, scaling, and selling software as a service.',
    category: 'Business Model',
    tags: [],
    isPublic: true,
    ownerId: owner,
    memberIds: [],
    memberCount: 0,
    postCount: 0,
  }],
  ['communities/web3-crypto', {
    id: 'web3-crypto',
    title: 'Web3 & Crypto',
    description: 'Decentralized applications, blockchain protocols, and the future of the web.',
    category: 'Technology',
    tags: [],
    isPublic: true,
    ownerId: owner,
    memberIds: [],
    memberCount: 0,
    postCount: 0,
  }],
];

let ok = 0;
for (const [path, data] of writes) {
  try {
    await setDoc(doc(db, ...path.split('/')), { ...data, seededBy: 'seed-catalog', updatedAt: serverTimestamp() }, { merge: true });
    ok += 1;
    console.log(`  ✓ ${path}`);
  } catch (error) {
    console.error(`  ✗ ${path}: ${error.message}`);
  }
}
console.log(`\n${ok}/${writes.length} catalog documents written.`);
process.exit(ok === writes.length ? 0 : 1);
