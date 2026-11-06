import { beforeEach, describe, expect, it } from 'vitest';
import { logActivity, readMilestones, resetAllLists, setDataScope, upsertMilestone } from '../lib/localLists';
import { currentNotes, waitsOnReader } from '../lib/notificationFeed';
import { weekPlan } from '../lib/weekPlan';
import { respond } from '../ai/engine';
import { runAssistant } from './assistantOps';
import type { Milestone } from '../types';

const founder = {
  fullName: 'Demo User',
  skills: ['React', 'TypeScript'],
  lookingFor: ['Sales', 'Growth'],
  industry: 'FinTech',
  stage: 'Pre-seed',
  commitment: 'Full-time',
  location: 'Athens, Greece',
};
const page = { href: '/dashboard', en: 'Dashboard', el: 'Πίνακας' };

const day = (offset: number, from: Date = new Date()) => {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

function milestone(id: string, title: string, targetDate: string, status: Milestone['status'] = 'Planned'): Milestone {
  const at = new Date().toISOString();
  return { id, ownerId: 'me', title, category: 'Product', targetDate, status, priority: 'Medium', progress: 0, tasks: [], createdAt: at, updatedAt: at };
}

const statusOf = (id: string) => readMilestones().find((item) => item.id === id)?.status;

function sampleAccount() {
  setDataScope('');
  resetAllLists();
  try { localStorage.setItem('demo_mode', 'true'); } catch { /* non-DOM env */ }
}

function realAccount() {
  try { localStorage.setItem('demo_mode', 'false'); } catch { /* non-DOM env */ }
  setDataScope('week-fixture');
  resetAllLists();
}

describe('notification triage from the chat', () => {
  beforeEach(sampleAccount);

  it('keeps what waits on the founder unread, and Undo restores exactly what it changed', async () => {
    const result = runAssistant('triage my notifications', founder, { propose: true });
    expect(result.tool).toBe('notifications-triage');
    expect(result.proposal?.reversal).toBe('full');
    expect(result.en).toMatch(/^Mark 1 notification read that needs nothing from you\?/);
    expect(result.en).toMatch(/2 waiting on you stay unread/);
    const unreadBefore = currentNotes().filter((note) => !note.read).map((note) => note.id).sort();
    await result.proposal!.apply();
    const unreadAfter = currentNotes().filter((note) => !note.read);
    expect(unreadAfter.length).toBe(2);
    expect(unreadAfter.every(waitsOnReader)).toBe(true);
    await result.proposal!.undo!();
    expect(currentNotes().filter((note) => !note.read).map((note) => note.id).sort()).toEqual(unreadBefore);
  });

  it('says so instead of proposing when everything left waits on the founder', async () => {
    await runAssistant('triage my notifications', founder, { propose: true }).proposal!.apply();
    const again = runAssistant('triage my notifications', founder, { propose: true });
    expect(again.proposal).toBeUndefined();
    expect(again.en).toBe('Every unread notification is waiting on you.');
  });

  it('routes the Greek and slash phrasings to triage, and leaves "mark all read" as it was', () => {
    expect(runAssistant('Σήμανε τις υπόλοιπες ειδοποιήσεις ως αναγνωσμένες', founder, { propose: true }).tool).toBe('notifications-triage');
    expect(runAssistant('Διαλογή ειδοποιήσεων', founder, { propose: true }).tool).toBe('notifications-triage');
    expect(runAssistant('mark the rest as read', founder, { propose: true }).tool).toBe('notifications-triage');
    expect(runAssistant('/triage', founder, { propose: true }).tool).toBe('notifications-triage');
    expect(runAssistant('Καθάρισε τις ειδοποιήσεις', founder, { propose: true }).tool).toBe('notifications-read');
    expect(runAssistant('mark all notifications read', founder, { propose: true }).tool).toBe('notifications-read');
  });

  it('names what stays unread in the reader’s language', () => {
    const result = runAssistant('Τακτοποίησε τις ειδοποιήσεις', founder, { propose: true });
    expect(result.el).toMatch(/^Σήμανση ως αναγνωσμένων: 1 ειδοποίηση που δεν χρειάζεται τίποτα από σένα;/);
    expect(result.el).toMatch(/Νέο μήνυμα από τον Marcus/);
  });
});

describe('starting a milestone from the chat', () => {
  beforeEach(sampleAccount);

  it('moves a planned milestone to In Progress and Undo puts it back', async () => {
    upsertMilestone(milestone('m-pilot', 'Pilot with Alpha Bank', day(3)));
    const result = runAssistant('Start milestone Pilot with Alpha Bank', founder, { propose: true });
    expect(result.tool).toBe('update_milestone');
    expect(result.proposal?.reversal).toBe('full');
    expect(statusOf('m-pilot')).toBe('Planned');
    await result.proposal!.apply();
    expect(statusOf('m-pilot')).toBe('In Progress');
    await result.proposal!.undo!();
    expect(statusOf('m-pilot')).toBe('Planned');
  });

  it('understands the Greek request', () => {
    upsertMilestone(milestone('m-pilot', 'Pilot with Alpha Bank', day(3)));
    const result = runAssistant('Ξεκίνα το ορόσημο Pilot with Alpha Bank', founder, { propose: true });
    expect(result.tool).toBe('update_milestone');
    expect(result.el).toBe('Έναρξη «Pilot with Alpha Bank» και σήμανση ως Σε εξέλιξη;');
  });

  it('answers without a card when the milestone is already in progress', () => {
    const result = runAssistant('start milestone MVP launch', founder, { propose: true });
    expect(result.proposal).toBeUndefined();
    expect(result.en).toBe('“MVP launch” is already In Progress.');
  });

  it('does not read "how do I start …" as a request to start a milestone', () => {
    upsertMilestone(milestone('m-deck', 'Pitch deck', day(4)));
    const result = runAssistant('How do I start the pitch deck?', founder, { propose: true });
    expect(result.tool).not.toBe('update_milestone');
    expect(statusOf('m-deck')).toBe('Planned');
  });
});

describe('prepare my week', () => {
  it('collects the next seven days from the lists the pages read', () => {
    realAccount();
    const now = new Date(2026, 10, 6, 10, 0);
    upsertMilestone(milestone('m-today', 'Due today', day(0, now)));
    upsertMilestone(milestone('m-six', 'Due in six days', day(6, now)));
    upsertMilestone(milestone('m-seven', 'Due in seven days', day(7, now)));
    upsertMilestone(milestone('m-late', 'Late and planned', day(-2, now)));
    upsertMilestone(milestone('m-late-started', 'Late and started', day(-4, now), 'In Progress'));
    upsertMilestone(milestone('m-done', 'Done already', day(1, now), 'Completed'));
    const plan = weekPlan(now);
    expect(plan.facts.dueMilestones.map((item) => item.title)).toEqual(['Due today', 'Due in six days']);
    expect(plan.facts.overdueMilestones.map((item) => item.title).sort()).toEqual(['Late and planned', 'Late and started']);
    // Overdue first, then the soonest due; started and completed ones are not proposed.
    expect(plan.startable.map((item) => item.id)).toEqual(['m-late', 'm-today', 'm-six']);
    expect(plan.en).toMatch(/^\*\*The next 7 days\*\*/);
    expect(plan.en).toMatch(/Milestones due: Due today \(today\), Due in six days \(in 6 days\)\./);
    expect(plan.el).toMatch(/Ορόσημα που λήγουν: Due today \(σήμερα\), Due in six days \(σε 6 ημέρες\)\./);
    expect(plan.canTriage).toBe(false);
  });

  it('says the week is quiet when nothing falls due or waits', () => {
    realAccount();
    const plan = weekPlan(new Date(2026, 10, 6, 10, 0));
    expect(plan.en).toContain('It is a quiet week');
    expect(plan.startable).toHaveLength(0);
    expect(plan.canTriage).toBe(false);
  });

  it('offers the triage and the milestone starts as separate cards, nothing written before Confirm', async () => {
    realAccount();
    upsertMilestone(milestone('m-late', 'Ship onboarding', day(-3)));
    upsertMilestone(milestone('m-soon', 'Close design partner', day(2)));
    logActivity({ kind: 'profile', title: 'Saved a profile', titleEl: 'Αποθηκεύτηκε προφίλ', href: '/discovery' });
    const result = await respond('Prepare my week', founder, { lang: 'en', page });
    expect(result.tool).toBe('prepare-week');
    expect(result.en).toMatch(/^\*\*The next 7 days\*\*/);
    expect(result.en).toContain('each runs only if you confirm it, and can be undone');
    expect(result.batch?.map((step) => step.tool)).toEqual(['notifications-triage', 'update_milestone', 'update_milestone']);
    expect(result.batch![1]!.en).toContain('Ship onboarding');
    expect(statusOf('m-late')).toBe('Planned');
    await result.batch![1]!.proposal!.apply();
    expect(statusOf('m-late')).toBe('In Progress');
    await result.batch![1]!.proposal!.undo!();
    expect(statusOf('m-late')).toBe('Planned');
  });

  it('a single step comes as one card with the week above it', async () => {
    realAccount();
    upsertMilestone(milestone('m-soon', 'Close design partner', day(2)));
    const result = await respond('Plan my week', founder, { lang: 'en', page });
    expect(result.batch).toBeUndefined();
    expect(result.proposal).toBeDefined();
    expect(result.en).toMatch(/\*\*The next 7 days\*\*[\s\S]*Start “Close design partner”/);
  });

  it('the Greek phrasing and /prepare are the same request', async () => {
    realAccount();
    expect((await respond('Ετοίμασε την εβδομάδα μου', founder, { lang: 'el', page })).tool).toBe('prepare-week');
    expect((await respond('/prepare', founder, { lang: 'en', page })).tool).toBe('prepare-week');
  });
});
