/**
 * The sample people of the demo, defined once.
 *
 * Dashboard circles, co-founder matches, the network, messages, mentors,
 * calendar participants, notifications, the assistant and the mock API all
 * read from this list, so a person keeps the same name, role, city and skills
 * on every page. This module has no browser dependencies: `server.ts` imports
 * it too.
 */
import { portraitFor } from './photos';

export type CastRole = 'Founder' | 'Co-Founder Candidate' | 'Mentor' | 'Investor' | 'Advisor';

export type CastMember = {
  id: string;
  fullName: string;
  role: CastRole;
  headline: string;
  headlineEl?: string;
  city: string;
  country: string;
  timezone: string;
  industry: string;
  stage: 'Idea' | 'Pre-seed' | 'Seed' | 'Series A' | 'Growth';
  commitment: 'Full-time' | 'Part-time' | 'Advisory';
  skills: string[];
  interests: string[];
  /** What this person wants from a match, in the same words as `skills`. */
  lookingFor: string[];
  bio: string;
  bioEl?: string;
  company?: string;
  /** Mentors and investors only. */
  expertise?: string[];
  rating?: number;
  reviews?: number;
  availability?: 'Immediate' | 'Flexible' | '1 month notice';
  achievements?: string[];
  checkSize?: string;
};

export const CAST: CastMember[] = [
  {
    id: 'sarah-chen',
    fullName: 'Sarah Chen',
    role: 'Founder',
    headline: 'Product lead building cash-flow tools for freelancers',
    headlineEl: 'Product lead — φτιάχνει εργαλεία ταμειακών ροών για freelancers',
    city: 'New York',
    country: 'USA',
    timezone: 'America/New_York',
    industry: 'FinTech',
    stage: 'Pre-seed',
    commitment: 'Full-time',
    skills: ['Product strategy', 'UX research', 'Figma', 'SQL'],
    interests: ['FinTech', 'Future of work', 'SaaS'],
    lookingFor: ['TypeScript', 'React', 'Node.js'],
    bio: 'Former product lead at a payments company. Talked to 60 freelancers about late invoices and is building the fix.',
    bioEl: 'Πρώην product lead σε εταιρεία πληρωμών. Μίλησε με 60 freelancers για καθυστερημένα τιμολόγια και φτιάχνει τη λύση.',
  },
  {
    id: 'alex-rivera',
    fullName: 'Alex Rivera',
    role: 'Founder',
    headline: 'CTO, full-stack engineer',
    headlineEl: 'CTO, full-stack μηχανικός',
    city: 'San Francisco',
    country: 'USA',
    timezone: 'America/Los_Angeles',
    industry: 'AI',
    stage: 'Seed',
    commitment: 'Full-time',
    skills: ['TypeScript', 'React', 'Node.js', 'MLOps'],
    interests: ['AI', 'Developer tools', 'SaaS'],
    lookingFor: ['Sales', 'Growth', 'Partnerships'],
    bio: 'Ships product with small teams. Built the data platform at a Series B start-up and wants a commercial co-founder.',
    bioEl: 'Βγάζει προϊόν με μικρές ομάδες. Έχτισε την πλατφόρμα δεδομένων σε Series B start-up και ψάχνει εμπορικό συνιδρυτή.',
  },
  {
    id: 'marcus-thorne',
    fullName: 'Marcus Thorne',
    role: 'Co-Founder Candidate',
    headline: 'Growth operator, ex-HubSpot',
    headlineEl: 'Growth operator, πρώην HubSpot',
    city: 'London',
    country: 'UK',
    timezone: 'Europe/London',
    industry: 'SaaS',
    stage: 'Idea',
    commitment: 'Part-time',
    skills: ['Growth', 'Sales', 'Partnerships'],
    interests: ['SaaS', 'AI', 'Marketplaces'],
    lookingFor: ['TypeScript', 'React', 'Product strategy'],
    bio: 'Took two SaaS products from zero to the first 1,000 paying teams. Looking for a technical co-founder.',
    bioEl: 'Πήγε δύο προϊόντα SaaS από το μηδέν στις πρώτες 1.000 πληρώνουσες ομάδες. Ψάχνει τεχνικό συνιδρυτή.',
  },
  {
    id: 'elena-rodriguez',
    fullName: 'Elena Rodriguez',
    role: 'Co-Founder Candidate',
    headline: 'Product designer with a climate focus',
    headlineEl: 'Product designer με επίκεντρο το κλίμα',
    city: 'Barcelona',
    country: 'Spain',
    timezone: 'Europe/Madrid',
    industry: 'CleanTech',
    stage: 'Idea',
    commitment: 'Full-time',
    skills: ['Product design', 'Branding', 'Prototyping', 'Figma'],
    interests: ['CleanTech', 'Mobility', 'SaaS'],
    lookingFor: ['Node.js', 'Sales', 'Fundraising'],
    bio: 'Designed energy dashboards used by 40 municipalities. Wants to join a founding team as the design lead.',
    bioEl: 'Σχεδίασε dashboards ενέργειας που χρησιμοποιούν 40 δήμοι. Θέλει να μπει σε ιδρυτική ομάδα ως design lead.',
  },
  {
    id: 'david-park',
    fullName: 'David Park',
    role: 'Founder',
    headline: 'Hardware engineer building air-quality sensors',
    headlineEl: 'Μηχανικός hardware — φτιάχνει αισθητήρες ποιότητας αέρα',
    city: 'Seoul',
    country: 'South Korea',
    timezone: 'Asia/Seoul',
    industry: 'Deep Tech',
    stage: 'Pre-seed',
    commitment: 'Full-time',
    skills: ['Embedded systems', 'C++', 'Supply chain'],
    interests: ['Deep Tech', 'CleanTech', 'IoT'],
    lookingFor: ['Sales', 'Fundraising', 'Product strategy'],
    bio: 'Built sensor boards for two consumer devices. Has a working prototype and three pilot buildings.',
    bioEl: 'Έχτισε πλακέτες αισθητήρων για δύο συσκευές ευρείας χρήσης. Έχει λειτουργικό πρωτότυπο και τρία πιλοτικά κτίρια.',
  },
  {
    id: 'emma-kim',
    fullName: 'Emma Kim',
    role: 'Founder',
    headline: 'Data scientist working on clinical triage',
    headlineEl: 'Data scientist — δουλεύει σε κλινική διαλογή',
    city: 'Toronto',
    country: 'Canada',
    timezone: 'America/Toronto',
    industry: 'HealthTech',
    stage: 'Idea',
    commitment: 'Full-time',
    skills: ['Python', 'Machine learning', 'Statistics'],
    interests: ['HealthTech', 'AI'],
    lookingFor: ['Product strategy', 'Sales', 'Regulatory'],
    bio: 'Five years of hospital data science. Validating a triage model with two emergency departments.',
    bioEl: 'Πέντε χρόνια data science σε νοσοκομεία. Επικυρώνει μοντέλο διαλογής με δύο τμήματα επειγόντων.',
  },
  {
    id: 'jordan-taylor',
    fullName: 'Jordan Taylor',
    role: 'Co-Founder Candidate',
    headline: 'Growth marketer, ex-Stripe',
    headlineEl: 'Growth marketer, πρώην Stripe',
    city: 'Austin',
    country: 'USA',
    timezone: 'America/Chicago',
    industry: 'FinTech',
    stage: 'Seed',
    commitment: 'Full-time',
    skills: ['Growth', 'Lifecycle marketing', 'SEO', 'Analytics'],
    interests: ['FinTech', 'SaaS'],
    lookingFor: ['TypeScript', 'Product strategy'],
    bio: 'Ran lifecycle marketing for Stripe Atlas. Joins teams that already have a product people use.',
    bioEl: 'Ανέλαβε το lifecycle marketing του Stripe Atlas. Μπαίνει σε ομάδες που έχουν ήδη προϊόν που χρησιμοποιείται.',
  },
  {
    id: 'priya-sharma',
    fullName: 'Priya Sharma',
    role: 'Founder',
    headline: 'ML engineer turned founder',
    headlineEl: 'Από ML engineer σε founder',
    city: 'Bengaluru',
    country: 'India',
    timezone: 'Asia/Kolkata',
    industry: 'AI',
    stage: 'Pre-seed',
    commitment: 'Full-time',
    skills: ['Python', 'Machine learning', 'MLOps'],
    interests: ['AI', 'Developer tools'],
    lookingFor: ['Sales', 'Growth'],
    bio: 'Building evaluation tooling for teams that ship language models. Two design partners signed.',
    bioEl: 'Φτιάχνει εργαλεία αξιολόγησης για ομάδες που βγάζουν γλωσσικά μοντέλα. Δύο design partners έχουν ήδη συμφωνήσει.',
  },
  {
    id: 'mia-kovacs',
    fullName: 'Mia Kovacs',
    role: 'Founder',
    headline: 'EdTech founder moving to B2B',
    headlineEl: 'EdTech founder — μετάβαση σε B2B',
    city: 'Vienna',
    country: 'Austria',
    timezone: 'Europe/Vienna',
    industry: 'EdTech',
    stage: 'Seed',
    commitment: 'Full-time',
    skills: ['Sales', 'Partnerships', 'Product strategy'],
    interests: ['EdTech', 'Future of work'],
    lookingFor: ['TypeScript', 'React'],
    bio: 'Sold a consumer learning app to 30,000 students. Now selling the same course engine to companies.',
    bioEl: 'Πούλησε εφαρμογή εκμάθησης σε 30.000 μαθητές. Τώρα πουλά την ίδια μηχανή μαθημάτων σε εταιρείες.',
  },
  {
    id: 'james-wilson',
    fullName: 'James Wilson',
    role: 'Advisor',
    headline: 'SaaS go-to-market advisor',
    headlineEl: 'Σύμβουλος go-to-market για SaaS',
    city: 'London',
    country: 'UK',
    timezone: 'Europe/London',
    industry: 'SaaS',
    stage: 'Growth',
    commitment: 'Advisory',
    skills: ['Pricing', 'Enterprise sales', 'Sales'],
    interests: ['SaaS', 'AI'],
    lookingFor: [],
    bio: 'Former VP Sales. Helps seed-stage teams set pricing and run their first enterprise deals.',
    bioEl: 'Πρώην VP Sales. Βοηθά seed-stage ομάδες με pricing και τις πρώτες enterprise συμφωνίες.',
    expertise: ['Pricing', 'Sales', 'Go-to-market'],
  },
  {
    id: 'leila-hassan',
    fullName: 'Leila Hassan',
    role: 'Advisor',
    headline: 'Regulatory advisor for HealthTech (FDA, CE)',
    headlineEl: 'Σύμβουλος κανονιστικής συμμόρφωσης για HealthTech (FDA, CE)',
    city: 'Dubai',
    country: 'UAE',
    timezone: 'Asia/Dubai',
    industry: 'HealthTech',
    stage: 'Growth',
    commitment: 'Advisory',
    skills: ['Regulatory', 'Legal', 'Clinical trials'],
    interests: ['HealthTech'],
    lookingFor: [],
    bio: 'Took eleven medical devices through FDA and CE review. Advises on evidence plans and data protection.',
    bioEl: 'Οδήγησε έντεκα ιατρικά προϊόντα σε έγκριση FDA και CE. Συμβουλεύει σε σχέδια τεκμηρίωσης και προστασία δεδομένων.',
    expertise: ['Regulatory', 'Legal', 'Compliance'],
  },
  {
    id: 'david-hoffman',
    fullName: 'David Hoffman',
    role: 'Mentor',
    headline: 'Ex-VP Product @ Uber',
    headlineEl: 'Πρώην VP Product στην Uber',
    city: 'San Francisco',
    country: 'USA',
    timezone: 'America/Los_Angeles',
    industry: 'Marketplaces',
    stage: 'Growth',
    commitment: 'Advisory',
    skills: ['Product strategy', 'Growth', 'Marketplaces'],
    interests: ['Marketplaces', 'Mobility'],
    lookingFor: [],
    company: 'Uber',
    bio: 'Fifteen years in product, including the core marketplace teams at Uber during their fastest growth.',
    bioEl: 'Δεκαπέντε χρόνια στο προϊόν, με τις βασικές ομάδες marketplace της Uber στην περίοδο ταχύτερης ανάπτυξης.',
    expertise: ['Product', 'Growth', 'Marketplace'],
    rating: 4.9,
    reviews: 124,
    availability: 'Immediate',
    achievements: ['Scaled the Uber marketplace to 50+ cities', 'Angel investor in 12 start-ups', 'Former Y Combinator founder'],
  },
  {
    id: 'elena-rossi',
    fullName: 'Elena Rossi',
    role: 'Mentor',
    headline: 'Venture partner, FinTech and SaaS',
    headlineEl: 'Venture partner, FinTech και SaaS',
    city: 'Milan',
    country: 'Italy',
    timezone: 'Europe/Rome',
    industry: 'FinTech',
    stage: 'Growth',
    commitment: 'Advisory',
    skills: ['Fundraising', 'Pitching', 'Strategy'],
    interests: ['FinTech', 'SaaS'],
    lookingFor: [],
    company: 'Sequoia',
    bio: 'Early-stage investor in enterprise SaaS and FinTech across Europe and the US. Three exits as an operator.',
    bioEl: 'Επενδύει σε early-stage enterprise SaaS και FinTech σε Ευρώπη και ΗΠΑ. Τρεις exits ως επιχειρησιακό στέλεχος.',
    expertise: ['Fundraising', 'Pitching', 'Strategy'],
    rating: 5,
    reviews: 89,
    availability: 'Flexible',
    achievements: ['Led the Series A of three unicorns', 'Board member at five tech companies', 'Former CEO of a FinTech start-up'],
  },
  {
    id: 'samir-patel',
    fullName: 'Samir Patel',
    role: 'Mentor',
    headline: 'CTO at a FinTech scale-up',
    headlineEl: 'CTO σε FinTech scale-up',
    city: 'London',
    country: 'UK',
    timezone: 'Europe/London',
    industry: 'FinTech',
    stage: 'Growth',
    commitment: 'Advisory',
    skills: ['Engineering', 'Security', 'Team building'],
    interests: ['FinTech', 'Developer tools'],
    lookingFor: [],
    company: 'FinTech scale-up',
    bio: 'Grew an engineering team from 10 to 500 people and moved a monolith to secure, highly available services.',
    bioEl: 'Ανάπτυξε ομάδα μηχανικών από 10 σε 500 άτομα και μετέτρεψε monolith σε ασφαλείς, υψηλά διαθέσιμες υπηρεσίες.',
    expertise: ['Engineering', 'Security', 'Team Building'],
    rating: 4.8,
    reviews: 56,
    availability: '1 month notice',
    achievements: ['Scaled engineering from 10 to 500+', 'Architected payment systems with 99.99% uptime', 'Author of "Scaling FinTech"'],
  },
  {
    id: 'jessica-wu',
    fullName: 'Jessica Wu',
    role: 'Mentor',
    headline: 'Growth lead @ Airbnb',
    headlineEl: 'Growth lead στην Airbnb',
    city: 'Seattle',
    country: 'USA',
    timezone: 'America/Los_Angeles',
    industry: 'Consumer',
    stage: 'Growth',
    commitment: 'Advisory',
    skills: ['Growth', 'Lifecycle marketing', 'Retention'],
    interests: ['Consumer', 'Marketplaces'],
    lookingFor: [],
    company: 'Airbnb',
    bio: 'User acquisition and lifecycle marketing. Built referral loops that became a main growth channel at Airbnb.',
    bioEl: 'User acquisition και lifecycle marketing. Έχτισε referral loops που έγιναν βασικό κανάλι ανάπτυξης της Airbnb.',
    expertise: ['Marketing', 'Retention', 'Virality'],
    rating: 4.9,
    reviews: 210,
    availability: 'Flexible',
    achievements: ['Raised 90-day retention by 40%', 'Designed the referral programme', 'Speaker at GrowthHackers Conference'],
  },
  {
    id: 'daniel-weiss',
    fullName: 'Daniel Weiss',
    role: 'Investor',
    headline: 'Angel investor, 30+ pre-seed deals',
    headlineEl: 'Angel investor, 30+ pre-seed συμφωνίες',
    city: 'Berlin',
    country: 'Germany',
    timezone: 'Europe/Berlin',
    industry: 'SaaS',
    stage: 'Growth',
    commitment: 'Advisory',
    skills: ['Fundraising', 'Strategy'],
    interests: ['SaaS', 'FinTech', 'AI'],
    lookingFor: [],
    bio: 'Writes first cheques into B2B software teams in Europe. Usually decides within two meetings.',
    bioEl: 'Γράφει πρώτα cheques σε B2B software ομάδες στην Ευρώπη. Συνήθως αποφασίζει μέσα σε δύο συναντήσεις.',
    checkSize: '$25k–$100k',
  },
];

/**
 * Ids used by earlier versions of the demo, kept so saved lists and links
 * created before the cast existed still open the right person.
 */
const LEGACY_IDS: Record<string, string> = {
  '1': 'alex-rivera',
  '2': 'sarah-chen',
  '3': 'marcus-thorne',
  '4': 'elena-rodriguez',
  '5': 'david-park',
  'demo-sarah': 'sarah-chen',
  'demo-alex': 'alex-rivera',
  'demo-marcus': 'marcus-thorne',
  sarah: 'sarah-chen',
  u2: 'alex-rivera',
  u3: 'sarah-chen',
  u4: 'elena-rodriguez',
  u5: 'jordan-taylor',
  u6: 'elena-rossi',
  u7: 'daniel-weiss',
  u8: 'priya-sharma',
  s1: 'mia-kovacs',
  s2: 'david-park',
  s3: 'leila-hassan',
};

export function castId(id: string): string {
  return LEGACY_IDS[id] ?? id;
}

export function findCast(idOrName: string | null | undefined): CastMember | undefined {
  if (!idOrName) return undefined;
  const id = castId(idOrName);
  const byId = CAST.find((person) => person.id === id);
  if (byId) return byId;
  const needle = idOrName.trim().toLowerCase();
  if (!needle) return undefined;
  return (
    CAST.find((person) => person.fullName.toLowerCase() === needle) ??
    CAST.find((person) => person.fullName.toLowerCase().split(' ')[0] === needle) ??
    CAST.find((person) => person.fullName.toLowerCase().includes(needle))
  );
}

export function castByRole(...roles: CastRole[]): CastMember[] {
  return CAST.filter((person) => roles.includes(person.role));
}

export function avatarFor(id: string, size = 100): string {
  return portraitFor(castId(id), findCast(id)?.fullName ?? id, size);
}

export function placeOf(person: Pick<CastMember, 'city' | 'country'>): string {
  return [person.city, person.country].filter(Boolean).join(', ');
}
