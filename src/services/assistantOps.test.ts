import { beforeEach, describe, expect, it } from 'vitest';
import { listKeys, logActivity, readIds, readInvites, readMilestones, readRound, readSaved, readSessions, readTasks, readTracked, resetAllLists } from '../lib/localLists';
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
  });

  it('ranks matches from the shared cast', () => {
    const result = runAssistant('who is my best match', demo);
    expect(result.tool).toBe('matches');
    expect(result.href).toBe('/matches');
    expect(result.en.toLowerCase()).toMatch(/jordan|marcus|mia|elena/);
    expect(result.links.length).toBeGreaterThan(0);
    expect(result.followUps?.[0]?.en).toMatch(/Why do I match with/);
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
    expect(result.en).toMatch(/80%/);
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
