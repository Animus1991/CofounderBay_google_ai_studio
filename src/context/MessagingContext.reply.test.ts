import { beforeEach, describe, expect, it } from 'vitest';
import { resetAllLists } from '../lib/localLists';
import { localSpecialistReply } from './MessagingContext';

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

describe('localSpecialistReply', () => {
  beforeEach(() => {
    resetAllLists();
    try { localStorage.setItem('demo_mode', 'true'); } catch { /* non-DOM env */ }
  });

  it('answers from workspace data when the cloud model is down', () => {
    const reply = localSpecialistReply('what should I do first', demo, 'en');
    expect(reply.toLowerCase()).not.toMatch(/try again/);
    expect(reply.length).toBeGreaterThan(20);
  });

  it('answers in Greek without asking the founder to retry', () => {
    const reply = localSpecialistReply('τι να κανω πρώτα', demo, 'el');
    expect(reply).not.toMatch(/Δοκίμασε ξανά/);
    expect(reply.length).toBeGreaterThan(20);
  });

  it('still briefs the workspace for an open question', () => {
    const reply = localSpecialistReply('hello there', demo, 'en');
    expect(reply.toLowerCase()).not.toMatch(/try again/);
    expect(reply.toLowerCase()).toMatch(/match|milestone|round/);
  });
});
