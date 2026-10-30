import { describe, expect, it } from 'vitest';
import { runAssistant } from '../services/assistantOps';
import { filterSlash, roleStarters, slashQuery, startersFor } from './assistantStarters';

const profile = { fullName: 'Demo User', role: 'Founder' };

describe('roleStarters', () => {
  it('gives mentors the mentor set', () => {
    expect(roleStarters('Mentor').map((s) => s.en)).toEqual([
      'Who booked a session with me?',
      'What should I prepare for my next session?',
      'Which founders match my expertise?',
    ]);
  });

  it('reuses the mentor set for advisors', () => {
    expect(roleStarters('Advisor')).toEqual(roleStarters('Mentor'));
  });

  it('gives investors the investor set', () => {
    expect(roleStarters('Investor').map((s) => s.en)).toEqual([
      'Which founders match my thesis?',
      'What changed in my watchlist?',
      'Which rounds are open now?',
    ]);
  });

  it('returns nothing for founders or unknown roles', () => {
    expect(roleStarters('Founder')).toEqual([]);
    expect(roleStarters(null)).toEqual([]);
  });
});

describe('startersFor', () => {
  it('puts role starters ahead of the default set for mentors', () => {
    const list = startersFor('/dashboard', 'Mentor');
    expect(list.slice(0, 3).map((s) => s.en)).toEqual([
      'Who booked a session with me?',
      'What should I prepare for my next session?',
      'Which founders match my expertise?',
    ]);
  });

  it('keeps the founder defaults when no role matches', () => {
    const list = startersFor('/dashboard', 'Founder');
    expect(list.some((s) => s.en === 'Who booked a session with me?')).toBe(false);
    expect(list[0]?.en).toBe('What should I do first?');
  });
});

describe('starter routing', () => {
  it.each([
    ['Who booked a session with me?', 'events'],
    ['Ποιος έκλεισε συνεδρία μαζί μου;', 'events'],
    ['What should I prepare for my next session?', 'events'],
    ['Τι να ετοιμάσω για την επόμενη συνεδρία;', 'events'],
    ['Which founders match my expertise?', 'matches'],
    ['Ποια ιδρυτικά μέλη ταιριάζουν στην εμπειρία μου;', 'matches'],
    ['Which founders match my thesis?', 'matches'],
    ['Ποια ιδρυτικά μέλη ταιριάζουν στη θέση μου;', 'matches'],
    ['What changed in my watchlist?', 'activity'],
    ['Τι άλλαξε στη λίστα παρακολούθησης;', 'activity'],
    ['Ποιοι γύροι είναι ανοιχτοί τώρα;', 'round'],
    ['What should I do first?', 'next'],
    ['Τι να κάνω πρώτα;', 'next'],
    ['Who should I meet this week?', 'week-meet'],
    ['Ποιον να γνωρίσω αυτή την εβδομάδα;', 'week-meet'],
    ['What needs me in my requests?', 'activity'],
    ['Τι με χρειάζεται στα αιτήματα;', 'activity'],
    ['Which messages are unread?', 'inbox'],
    ['Ποια μηνύματα είναι αδιάβαστα;', 'inbox'],
    ['What is new in my notifications?', 'activity'],
    ['Τι νέο στις ειδοποιήσεις;', 'activity'],
  ])('"%s" routes to %s', (phrase, tool) => {
    expect(runAssistant(phrase, profile).tool).toBe(tool);
  });

  it('"Which rounds are open now?" resolves to a round-aware op', () => {
    const tool = runAssistant('Which rounds are open now?', profile).tool;
    expect(['round', 'navigate']).toContain(tool);
  });
});

describe('slashQuery', () => {
  it('accepts a lone slash and single tokens', () => {
    expect(slashQuery('/')).toBe('/');
    expect(slashQuery('/ev')).toBe('/ev');
  });

  it('rejects non-slash input and multi-word input', () => {
    expect(slashQuery('events')).toBe('');
    expect(slashQuery('/events coming')).toBe('');
    expect(slashQuery('')).toBe('');
  });
});

describe('filterSlash', () => {
  const items = [
    { cmd: '/events', en: 'Upcoming events', el: 'Επερχόμενες εκδηλώσεις' },
    { cmd: '/mentors', en: 'Find a mentor', el: 'Εύρεση μέντορα' },
    { en: 'What is overdue?', el: 'Τι είναι εκπρόθεσμο;' },
  ];

  it('returns everything for a lone slash', () => {
    expect(filterSlash(items, '/')).toEqual(items);
  });

  it('matches the command prefix', () => {
    expect(filterSlash(items, '/me')).toEqual([items[1]]);
  });

  it('matches EN and EL labels accent-insensitively', () => {
    expect(filterSlash(items, '/overdue')).toEqual([items[2]]);
    expect(filterSlash(items, '/εκδηλωσ')).toEqual([items[0]]);
    expect(filterSlash(items, '/εκπροθεσμο')).toEqual([items[2]]);
  });

  it('returns nothing without a slash query', () => {
    expect(filterSlash(items, 'events')).toEqual([]);
    expect(filterSlash(items, '')).toEqual([]);
  });
});
