import { beforeEach, describe, expect, it } from 'vitest';
import { keys, listKeys, logActivity, readIds, readInvites, readMilestones, readNotificationPrefs, readOpenTo, readProfileLocal, readRound, readSaved, readSessions, readTasks, readTracked, readValue, resetAllLists, unreadActivityCount, upsertNeed } from '../lib/localLists';
import { readSwitches } from '../lib/privacySwitches';
import { runAssistant } from './assistantOps';

const demo = {
  fullName: 'Demo User',
  skills: ['React', 'TypeScript', 'Node.js'],
  lookingFor: ['Sales', 'Growth', 'Fundraising'],
  interests: ['FinTech', 'SaaS', 'AI'],
  industry: 'FinTech',
  stage: 'Pre-seed',
  commitment: 'Full-time',
  location: 'Athens, Greece',
  timezone: 'Europe/Athens',
};

describe('runAssistant', () => {
  beforeEach(() => {
    resetAllLists();
    // These tests exercise the demo world's shared catalogs (starter events,
    // demo programs, claimable perks) — real-mode copy is intentionally vague.
    try { localStorage.setItem('demo_mode', 'true'); } catch { /* non-DOM env */ }
  });

  it('ranks matches from the shared cast', () => {
    const result = runAssistant('who is my best match', demo);
    expect(result.tool).toBe('matches');
    expect(result.href).toBe('/matches');
    expect(result.en.toLowerCase()).toMatch(/jordan|marcus|mia|elena/);
    expect(result.links.length).toBeGreaterThan(0);
    expect(result.followUps?.[0]?.en).toMatch(/Why do I match with/);
    expect(result.sources?.some((source) => source.kind === 'people')).toBe(true);
  });

  it('ranks matches from a Greek best-match question', () => {
    const result = runAssistant('Ποια είναι η καλύτερη αντιστοίχιση;', demo);
    expect(result.tool).toBe('matches');
    expect(result.href).toBe('/matches');
  });

  it('filters the same directory from role and skill qualifiers', () => {
    const result = runAssistant('role:Founder skill:TypeScript', demo);
    expect(result.tool).toBe('matches');
    expect(result.en).toMatch(/Alex Rivera|TypeScript|directory/i);
  });

  it('explains one named match with reasons, friction and a first conversation', () => {
    const result = runAssistant('Why do I match with Sarah Chen?', demo);
    expect(result.tool).toBe('match-detail');
    expect(result.href).toBe('/profile/sarah-chen');
    expect(result.en).toMatch(/Sarah Chen/);
    expect(result.en).toMatch(/First conversation/);
    expect(result.followUps?.[0]?.en).toMatch(/Connect with Sarah Chen/);
  });

  it('says what the founding team still lacks from looking-for', () => {
    const result = runAssistant('What does my founding team still lack?', demo);
    expect(result.tool).toBe('team-gap');
    expect(result.en.toLowerCase()).toMatch(/sales|growth|fundraising/);
  });

  it('saves a named person onto the same list Network reads', () => {
    const result = runAssistant('save Sarah Chen', demo);
    expect(result.tool).toBe('save');
    expect(readSaved().some((item) => item.id === 'sarah-chen')).toBe(true);
  });

  it('adds a milestone the Milestones page will show', () => {
    const result = runAssistant('add milestone ship the beta', demo);
    expect(result.tool).toBe('milestone-add');
    expect(readMilestones().some((item) => /beta/i.test(item.title))).toBe(true);
  });

  it('opens fundraising without dropping the existing round numbers', () => {
    const result = runAssistant('open fundraising', demo);
    expect(result.tool).toBe('navigate');
    expect(result.href).toBe('/fundraising');
  });

  it('explains how to become a mentor instead of listing mentors', () => {
    const result = runAssistant('How do I become a mentor?', demo);
    expect(result.tool).toBe('become-mentor');
    expect(result.href).toBe('/profile');
  });

  it('lists the same events the Events page shows', () => {
    const result = runAssistant('what events are coming', demo);
    expect(result.tool).toBe('events');
    expect(result.en).toMatch(/Networking Night/);
  });

  it('opens the fundraising pipeline the Fundraising page uses', () => {
    const result = runAssistant('show my pipeline', demo);
    expect(result.tool).toBe('pipeline');
    expect(result.href).toBe('/fundraising');
  });

  it('lists the same programs the Programs page shows', () => {
    const result = runAssistant('what programs can I apply to', demo);
    expect(result.tool).toBe('programs');
    expect(result.en).toMatch(/FinTech Accelerator/);
  });

  it('answers tell-me-about from the same fundraising opportunity list', () => {
    const result = runAssistant('Tell me about Series A Scout Network', demo);
    expect(result.tool).toBe('about');
    expect(result.href).toBe('/fundraising');
    expect(result.en).toMatch(/Sequoia/);
  });

  it('answers tell-me-about from the same Discovery opportunity list', () => {
    const result = runAssistant('Tell me about EcoSphere Accelerator', demo);
    expect(result.tool).toBe('about');
    expect(result.href).toBe('/discovery');
    expect(result.en).toMatch(/EcoSphere/);
  });

  it('lists the same communities the Communities page shows', () => {
    const result = runAssistant('what communities can I join', demo);
    expect(result.tool).toBe('communities');
    expect(result.en).toMatch(/Fintech Founders/);
  });

  it('puts a meeting on the same calendar the Calendar page reads', () => {
    const result = runAssistant('Schedule a meeting on my calendar', demo);
    expect(result.tool).toBe('session-add');
    expect(result.href).toBe('/calendar');
    expect(readSessions().some((item) => item.type === 'Meeting')).toBe(true);
  });

  it('tracks an application the Fundraising page also writes', () => {
    const result = runAssistant('Apply to Y Combinator S26', demo);
    expect(result.tool).toBe('apply');
    expect(readTracked().some((item) => /y combinator/i.test(item.program))).toBe(true);
  });

  it('records an investment onto the same round Fundraising shows', () => {
    const before = readRound().committedAmount;
    const result = runAssistant('Record a $50k investment in my round', demo);
    expect(result.tool).toBe('record-investment');
    expect(readRound().committedAmount).toBe(before + 50_000);
  });

  it('claims a perk the Perks page reads', () => {
    const result = runAssistant('Claim the Amazon Web Services perk', demo);
    expect(result.tool).toBe('claim-perk');
    expect(readIds(listKeys.perks)).toContain('aws');
  });

  it('lists perks instead of claiming one when asked what can be claimed', () => {
    const result = runAssistant('What perks can I claim?', demo);
    expect(result.tool).toBe('perks');
    expect(result.href).toBe('/perks');
    expect(readIds(listKeys.perks)).not.toContain('aws');
  });

  it('answers readiness from the same copy Insights shows', () => {
    const result = runAssistant('Tell me about readiness score', demo);
    expect(result.tool).toBe('about');
    expect(result.href).toBe('/insights');
    expect(result.en).toMatch(/Readiness|Profile/i);
  });

  it('adds a workspace task the Venture Builder board shows', () => {
    const result = runAssistant('add task ship landing page', demo);
    expect(result.tool).toBe('task-add');
    expect(readTasks().some((item) => /landing page/i.test(item.title))).toBe(true);
  });

  it('writes a 7-day match plan onto the same Workspace task board', () => {
    const result = runAssistant('Give me a 7-day match plan', demo);
    expect(result.tool).toBe('playbook');
    expect(result.href).toBe('/workspace');
    expect(readTasks().some((item) => /looking-for/i.test(item.title))).toBe(true);
    expect(result.followUps?.[0]?.en).toMatch(/meet this week/i);
  });

  it('prepares three founder invites that share the fit check', () => {
    const result = runAssistant('Invite 3 founders', demo);
    expect(result.tool).toBe('invite');
    expect(readInvites().length).toBeGreaterThanOrEqual(3);
    expect(result.en).toMatch(/quiz/i);
  });

  it('names who to meet this week from the same match list', () => {
    const result = runAssistant('Who should I meet this week?', demo);
    expect(result.tool).toBe('week-meet');
    expect(result.en).toMatch(/Networking Night/);
  });

  it('points at the public fit check when none is stored', () => {
    const result = runAssistant('What is my fit check?', demo);
    expect(result.tool).toBe('fit-check');
    expect(result.href).toBe('/quiz');
  });

  it('maps /match slash to the same matches tool as the spoken prompt', () => {
    const result = runAssistant('/match', demo);
    expect(result.tool).toBe('matches');
    expect(result.href).toBe('/matches');
  });

  it('maps /plan slash onto the Workspace playbook', () => {
    const result = runAssistant('/plan', demo);
    expect(result.tool).toBe('playbook');
    expect(readTasks().some((item) => /looking-for/i.test(item.title))).toBe(true);
  });

  it('maps /quiz slash to the fit check', () => {
    expect(runAssistant('/quiz', demo).tool).toBe('fit-check');
  });

  it('scouts three people and refuses to send', () => {
    const result = runAssistant('Propose three people — do not send', demo);
    expect(result.tool).toBe('scout');
    expect(result.en).toMatch(/will not send/i);
    expect(result.links.length).toBeGreaterThan(0);
  });

  it('drafts a need card the next-step strip can read', () => {
    const result = runAssistant('Draft a need card for a technical co-founder', demo);
    expect(result.tool).toBe('need');
    expect(result.en).toMatch(/Missing/i);
  });

  it('maps /next to the same next-step tool Dashboard uses', () => {
    expect(runAssistant('/next', demo).tool).toBe('next');
  });

  it('searches stored messages without inventing a live call', () => {
    const result = runAssistant('search my messages for intro', demo);
    expect(result.tool).toBe('inbox');
    expect(result.href).toBe('/messages');
  });

  it('reports unread count from the same activity Notifications reads', () => {
    logActivity({ kind: 'profile', title: 'Saved a person' });
    const result = runAssistant('show my studio activity', demo);
    expect(result.tool).toBe('activity');
    expect(result.en).toMatch(/1 unread/);
  });
});

describe('proposals', () => {
  beforeEach(() => {
    resetAllLists();
    // A real account — demo seeding would pre-fill the lists under test.
    try { localStorage.removeItem('demo_mode'); } catch { /* non-DOM env */ }
    upsertNeed({
      id: 'need-seed',
      exists: 'A founding team with a scored looking-for',
      outcome: 'A signed pilot',
      missing: 'a designer',
      offer: 'equity',
      status: 'open',
      at: new Date().toISOString(),
    });
  });

  it('proposes a save and writes nothing until confirmed, then undoes it', async () => {
    const result = runAssistant('save Marcus Thorne', demo, { propose: true });
    expect(result.tool).toBe('save');
    expect(result.proposal?.reversal).toBe('full');
    expect(readSaved()).toHaveLength(0);
    const final = await result.proposal!.apply();
    expect(final.tool).toBe('save');
    expect(readSaved().some((item) => item.id === 'marcus-thorne')).toBe(true);
    await result.proposal!.undo!();
    expect(readSaved()).toHaveLength(0);
  });

  it('proposes a milestone add and removes it on undo', async () => {
    const result = runAssistant('add milestone ship the MVP', demo, { propose: true });
    expect(result.tool).toBe('milestone-add');
    expect(result.proposal?.reversal).toBe('full');
    expect(readMilestones()).toHaveLength(0);
    await result.proposal!.apply();
    expect(readMilestones().some((item) => /ship the mvp/i.test(item.title))).toBe(true);
    await result.proposal!.undo!();
    expect(readMilestones()).toHaveLength(0);
  });

  it('round-set proposes the field change and undo restores it', async () => {
    const cases: Array<[string, keyof ReturnType<typeof readRound>, unknown]> = [
      ['set monthly burn to 12k', 'monthlyBurn', 12_000],
      ['set cash on hand to 180k', 'cashOnHand', 180_000],
      ['set round target to 1.5M', 'targetAmount', 1_500_000],
      ['set committed to 450k', 'committedAmount', 450_000],
      ['set close date to 2026-03-31', 'closeDate', '2026-03-31'],
      ['rename the round to Seed', 'name', 'Seed'],
      ['όρισε το burn σε 12k', 'monthlyBurn', 12_000],
      ['όρισε τα διαθέσιμα σε 180k', 'cashOnHand', 180_000],
      ['όρισε στόχο γύρου 1.5M', 'targetAmount', 1_500_000],
      ['όρισε ημερομηνία κλεισίματος σε 2026-03-31', 'closeDate', '2026-03-31'],
      ['μετονόμασε τον γύρο σε Seed', 'name', 'Seed'],
    ];
    for (const [phrase, field, value] of cases) {
      const before = readRound()[field];
      const result = runAssistant(phrase, demo, { propose: true });
      expect(result.tool, phrase).toBe('round-set');
      expect(result.proposal?.reversal, phrase).toBe('full');
      expect(readRound()[field], phrase).toBe(before);
      await result.proposal!.apply();
      expect(readRound()[field], phrase).toBe(value);
      await result.proposal!.undo!();
      expect(readRound()[field], phrase).toBe(before);
    }
  });

  it('proposes an investment and restores the round on undo', async () => {
    const before = readRound().committedAmount;
    const result = runAssistant('record a $50k investment', demo, { propose: true });
    expect(result.tool).toBe('record-investment');
    expect(result.proposal?.reversal).toBe('full');
    expect(readRound().committedAmount).toBe(before);
    await result.proposal!.apply();
    expect(readRound().committedAmount).toBe(before + 50_000);
    await result.proposal!.undo!();
    expect(readRound().committedAmount).toBe(before);
  });

  it('does not attach a proposal to a pure read', () => {
    const result = runAssistant('who is my best match', demo, { propose: true });
    expect(result.tool).toBe('matches');
    expect(result.proposal).toBeUndefined();
  });

  it('declares honest reversibility on every write branch', () => {
    const phrases = [
      'save Marcus Thorne',
      'connect with Marcus Thorne',
      'schedule a session with Marcus Thorne',
      'schedule a meeting',
      'add milestone ship the MVP',
      'record a $50k investment',
      'add task write the pitch deck',
      'give me a 7-day match plan',
      'apply to Y Combinator S26',
      'claim the AWS perk',
      'invite 3 founders',
      'draft a need card for a designer',
      'change the outcome of my need card to a signed pilot',
      'close the need card',
      'open to investor',
    ];
    for (const phrase of phrases) {
      const result = runAssistant(phrase, demo, { propose: true });
      expect(result.proposal, phrase).toBeTruthy();
      const proposal = result.proposal!;
      if (proposal.reversal !== 'none') expect(typeof proposal.undo, phrase).toBe('function');
      if (proposal.reversal !== 'full') expect(proposal.reversalNote, phrase).toBeTruthy();
      expect(typeof proposal.apply, phrase).toBe('function');
    }
  });
});

describe('settings-set', () => {
  beforeEach(() => {
    resetAllLists();
    try { localStorage.setItem('demo_mode', 'true'); } catch { /* non-DOM env */ }
  });

  const runSwitch = async (phrase: string, read: () => unknown, expected: unknown) => {
    const before = read();
    const result = runAssistant(phrase, demo, { propose: true });
    expect(result.tool, phrase).toBe('settings-set');
    expect(result.proposal, phrase).toBeTruthy();
    expect(result.proposal!.reversal, phrase).toBe('full');
    expect(read(), phrase).toEqual(before);
    await result.proposal!.apply();
    expect(read(), phrase).toEqual(expected);
    await result.proposal!.undo!();
    expect(read(), phrase).toEqual(before);
  };

  it('routes who-can-message phrases', async () => {
    await runSwitch('messages from connections only', () => readSwitches().messagesFrom, 'connections');
    await runSwitch('only connections can message me', () => readSwitches().messagesFrom, 'connections');
    await runSwitch('let anyone message me', () => readSwitches().messagesFrom, 'anyone');
    await runSwitch('messages from anyone', () => readSwitches().messagesFrom, 'anyone');
    await runSwitch('close new chats', () => readSwitches().messagesFrom, 'none');
    await runSwitch('no one can message me', () => readSwitches().messagesFrom, 'none');
    await runSwitch('μηνύματα μόνο από συνδέσεις', () => readSwitches().messagesFrom, 'connections');
    await runSwitch('μηνύματα από οποιονδήποτε', () => readSwitches().messagesFrom, 'anyone');
    await runSwitch('κλείσε τα νέα μηνύματα', () => readSwitches().messagesFrom, 'none');
    await runSwitch('κανείς να μη μου στέλνει', () => readSwitches().messagesFrom, 'none');
  });

  it('routes privacy switches', async () => {
    await runSwitch('hide my email', () => readSwitches().showEmail, false);
    await runSwitch('show my email', () => readSwitches().showEmail, true);
    await runSwitch('κρύψε το email μου', () => readSwitches().showEmail, false);
    await runSwitch('δείξε το email μου', () => readSwitches().showEmail, true);
    await runSwitch('hide me from discovery', () => readSwitches().discoverable, false);
    await runSwitch('show me in discovery', () => readSwitches().discoverable, true);
    await runSwitch('κρύψε με από την εξερεύνηση', () => readSwitches().discoverable, false);
    await runSwitch('εμφάνισέ με στην εξερεύνηση', () => readSwitches().discoverable, true);
    await runSwitch('stop sharing my presence', () => readSwitches().sharePresence, false);
    await runSwitch('share my presence', () => readSwitches().sharePresence, true);
    await runSwitch('μην δείχνεις πότε είμαι online', () => readSwitches().sharePresence, false);
    await runSwitch('δείξε πότε είμαι online', () => readSwitches().sharePresence, true);
    await runSwitch('make my profile public', () => readSwitches().publicProfile, true);
    await runSwitch('make my profile private', () => readSwitches().publicProfile, false);
    await runSwitch('κάνε το προφίλ μου δημόσιο', () => readSwitches().publicProfile, true);
    await runSwitch('κάνε το προφίλ μου ιδιωτικό', () => readSwitches().publicProfile, false);
  });

  it('routes mentoring availability through to the open-to list', async () => {
    await runSwitch('open to mentoring', () => readSwitches().mentorAvailability, true);
    await runSwitch('close mentoring', () => readSwitches().mentorAvailability, false);
    await runSwitch('δέχομαι αιτήματα καθοδήγησης', () => readSwitches().mentorAvailability, true);
    await runSwitch('κλείσε την καθοδήγηση', () => readSwitches().mentorAvailability, false);
    const result = runAssistant('accept mentor requests', demo, { propose: true });
    await result.proposal!.apply();
    expect(readOpenTo()).toContain('mentoring');
  });

  it('routes notification preference toggles', async () => {
    const runNotify = async (phrase: string, key: keyof ReturnType<typeof readNotificationPrefs>, on: boolean) => {
      const before = readNotificationPrefs();
      const result = runAssistant(phrase, demo, { propose: true });
      expect(result.tool, phrase).toBe('settings-set');
      expect(result.proposal?.reversal, phrase).toBe('full');
      await result.proposal!.apply();
      expect(readNotificationPrefs()[key], phrase).toBe(on);
      await result.proposal!.undo!();
      expect(readNotificationPrefs(), phrase).toEqual(before);
    };
    await runNotify('turn off event notifications', 'events', false);
    await runNotify('turn on event notifications', 'events', true);
    await runNotify('turn off match notifications', 'matches', false);
    await runNotify('turn on fundraising notifications', 'fundraising', true);
    await runNotify('απενεργοποίησε τις ειδοποιήσεις για εκδηλώσεις', 'events', false);
    await runNotify('ενεργοποίησε τις ειδοποιήσεις για μέντορες', 'mentors', true);
  });
});

describe('profile-set', () => {
  const viewer = { ...demo, headline: 'Old headline', bio: 'Old bio', location: 'Athens', skills: ['React'] };

  beforeEach(() => {
    resetAllLists();
    try { localStorage.setItem('demo_mode', 'true'); } catch { /* non-DOM env */ }
  });

  const runProfile = async (phrase: string, expectPatch: Record<string, unknown>) => {
    const result = runAssistant(phrase, viewer, { propose: true });
    expect(result.tool, phrase).toBe('profile-set');
    expect(result.proposal?.reversal, phrase).toBe('full');
    await result.proposal!.apply();
    expect(readProfileLocal(), phrase).toMatchObject(expectPatch);
    return result;
  };

  it('updates headline, bio and location through profile-local in demo', async () => {
    let result = await runProfile('change my headline to Building Aegean', { headline: 'Building Aegean' });
    await result.proposal!.undo!();
    expect(readProfileLocal().headline).toBe('Old headline');
    result = await runProfile('set my headline to Quoted "thing"', { headline: 'Quoted "thing"' });
    await result.proposal!.undo!();
    await runProfile('set my bio to Coffee first', { bio: 'Coffee first' });
    await runProfile('set my location to Berlin', { location: 'Berlin' });
    await runProfile('άλλαξε την επικεφαλίδα μου σε Νέα επικεφαλίδα', { headline: 'Νέα επικεφαλίδα' });
    await runProfile('όρισε την επικεφαλίδα μου σε Build', { headline: 'Build' });
    result = await runProfile('όρισε το bio μου σε Καλημέρα', { bio: 'Καλημέρα' });
    await result.proposal!.undo!();
    expect(readProfileLocal().bio).toBe('Old bio');
    await runProfile('όρισε την τοποθεσία μου σε Θεσσαλονίκη', { location: 'Θεσσαλονίκη' });
  });

  it('merges skills case-insensitively without duplicates', async () => {
    const result = await runProfile('add skill GraphQL', { skills: ['React', 'GraphQL'] });
    await result.proposal!.undo!();
    expect(readProfileLocal().skills).toEqual(['React']);
    await runProfile('πρόσθεσε δεξιότητα Kubernetes', { skills: ['React', 'Kubernetes'] });
    await runProfile('remove skill React', { skills: [] });
    const gone = await runProfile('αφαίρεσε δεξιότητα React', { skills: [] });
    await gone.proposal!.undo!();
    expect(readProfileLocal().skills).toEqual(['React']);
    const dupe = runAssistant('add skill react', viewer, { propose: true });
    expect(dupe.tool).toBe('profile-set');
    expect(dupe.proposal).toBeUndefined();
    expect(dupe.en).toMatch(/already/);
  });

  it('rejects over-limit values without writing', () => {
    const long = 'x'.repeat(700);
    const result = runAssistant(`set my bio to ${long}`, viewer, { propose: true });
    expect(result.tool).toBe('profile-set');
    expect(result.proposal).toBeUndefined();
    expect(readProfileLocal().bio).toBeUndefined();
  });
});

describe('notifications-read', () => {
  beforeEach(() => {
    resetAllLists();
    try { localStorage.setItem('demo_mode', 'true'); } catch { /* non-DOM env */ }
  });

  it('proposes, zeroes the unread feed, and undo restores it', async () => {
    logActivity({ kind: 'profile', title: 'first' });
    logActivity({ kind: 'profile', title: 'second' });
    const beforeUnread = unreadActivityCount();
    expect(beforeUnread).toBe(2);
    const result = runAssistant('mark all notifications read', demo, { propose: true });
    expect(result.tool).toBe('notifications-read');
    expect(result.proposal?.reversal).toBe('full');
    await result.proposal!.apply();
    // The apply writes its own audit entry as already-read: unread stays zero.
    expect(unreadActivityCount()).toBe(0);
    const seed = readValue<{ read: boolean }[]>(keys.demoNotes, []);
    expect(seed.length).toBeGreaterThan(0);
    expect(seed.every((note) => note.read)).toBe(true);
    await result.proposal!.undo!();
    expect(unreadActivityCount()).toBe(beforeUnread);
    const restored = readValue<{ id: string; read: boolean }[]>(keys.demoNotes, []);
    expect(restored.find((note) => note.id === 'demo-1')?.read).toBe(false);
    expect(restored.find((note) => note.id === 'demo-2')?.read).toBe(false);
  });

  it('routes the Greek phrases too', () => {
    expect(runAssistant('σήμανε όλες τις ειδοποιήσεις ως αναγνωσμένες', demo, { propose: true }).tool).toBe('notifications-read');
    expect(runAssistant('καθάρισε τις ειδοποιήσεις', demo, { propose: true }).tool).toBe('notifications-read');
    expect(runAssistant('mark all notifications as read', demo, { propose: true }).tool).toBe('notifications-read');
  });
});

