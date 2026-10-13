/** People the studio already shows on cards. Opening a profile uses this, then anything remembered from a click. */

export type PersonCard = {
  id: string;
  fullName: string;
  headline: string;
  location: string;
  role: string;
  industry: string;
  bio: string;
};

const KEY = 'cfb.openedPeople';

const DIRECTORY: PersonCard[] = [
  { id: '1', fullName: 'Alex Rivera', headline: 'CTO / Full-stack', location: 'SF', role: 'Founder', industry: 'AI', bio: 'Ships product with small teams.' },
  { id: '2', fullName: 'Sarah Chen', headline: 'Product Designer', location: 'NYC', role: 'Founder', industry: 'FinTech', bio: 'Building fintech tools.' },
  { id: '3', fullName: 'Marcus Thorne', headline: 'Growth Marketer', location: 'London', role: 'Founder', industry: 'SaaS', bio: 'Looks for a technical co-founder.' },
  { id: '4', fullName: 'Emma Kim', headline: 'Founder', location: '', role: 'Founder', industry: '', bio: '' },
  { id: '5', fullName: 'David Park', headline: 'Founder', location: '', role: 'Founder', industry: '', bio: '' },
  { id: 'u1', fullName: 'Sarah Chen', headline: 'FinTech mentor', location: 'NYC', role: 'Mentor', industry: 'FinTech', bio: '' },
  { id: 'u2', fullName: 'Alex Rivera', headline: 'AI founder', location: 'SF', role: 'Founder', industry: 'AI', bio: '' },
  { id: 'u3', fullName: 'James Wilson', headline: 'SaaS advisor', location: 'London', role: 'Advisor', industry: 'SaaS', bio: '' },
  { id: 'u4', fullName: 'Elena Rodriguez', headline: 'CleanTech candidate', location: 'Berlin', role: 'Co-Founder Candidate', industry: 'CleanTech', bio: '' },
  { id: 'demo-sarah', fullName: 'Sarah Chen', headline: 'Product lead', location: 'NYC', role: 'Founder', industry: 'Fintech', bio: 'Building fintech tools.' },
  { id: 'demo-alex', fullName: 'Alex Rivera', headline: 'Engineer', location: 'SF', role: 'Founder', industry: 'AI', bio: 'Ships product with small teams.' },
  { id: 'demo-marcus', fullName: 'Marcus Thorne', headline: 'Operator', location: 'London', role: 'Co-Founder Candidate', industry: 'SaaS', bio: 'Looks for a technical co-founder.' },
  { id: 'sarah', fullName: 'Sarah Chen', headline: 'Product Designer', location: 'NYC', role: 'Founder', industry: 'FinTech', bio: '' },
];

export function rememberPerson(person: Partial<PersonCard> & { id: string; fullName: string }) {
  const card: PersonCard = {
    id: person.id,
    fullName: person.fullName,
    headline: person.headline || person.role || 'Founder',
    location: person.location || '',
    role: person.role || 'Founder',
    industry: person.industry || '',
    bio: person.bio || '',
  };
  try {
    const raw = localStorage.getItem(KEY);
    const all = raw ? JSON.parse(raw) as Record<string, PersonCard> : {};
    all[card.id] = card;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* the profile still opens from the directory */
  }
}

export function lookupPerson(id: string): PersonCard | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    const all = raw ? JSON.parse(raw) as Record<string, PersonCard> : {};
    if (all[id]?.fullName) return all[id];
  } catch {
    /* use the directory */
  }
  return DIRECTORY.find((person) => person.id === id);
}
