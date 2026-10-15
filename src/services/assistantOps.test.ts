import { beforeEach, describe, expect, it } from 'vitest';
import { listKeys, readIds, readMilestones, readRound, readSaved, readSessions, readTasks, readTracked, resetAllLists } from '../lib/localLists';
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

  it('adds a workspace task the Venture Builder board shows', () => {
    const result = runAssistant('add task ship landing page', demo);
    expect(result.tool).toBe('task-add');
    expect(readTasks().some((item) => /landing page/i.test(item.title))).toBe(true);
  });
});
