import { beforeEach, describe, expect, it } from 'vitest';
import { runAssistant } from './assistantOps';
import { readPitch } from '../lib/pitch';
import { isLegalDone } from '../lib/legalChecklist';
import { addFocusSession, readFocusToday } from '../lib/focusStats';
import { keys, readAssistantFeedback, readEndorsements, readIds, readSavedSearches, toggleId, writeAssistantFeedback } from '../lib/localLists';

const demo = { fullName: 'Demo User', headline: 'Founder', skills: ['React'] } as never;

describe('studio areas the operator now covers', () => {
  beforeEach(() => localStorage.clear());

  it('reads the pitch deck and writes one slide only after Confirm, with exact undo', async () => {
    expect(runAssistant('/pitch', demo).tool).toBe('pitch');
    const result = runAssistant('Set the traction slide to 120 paying teams', demo, { propose: true });
    expect(result.tool).toBe('pitch-set');
    expect(readPitch().traction).toBeUndefined();
    await result.proposal!.apply();
    expect(readPitch().traction).toBe('120 paying teams');
    await result.proposal!.undo!();
    expect(readPitch().traction).toBeUndefined();
  });

  it('ticks and reopens a legal checklist item', async () => {
    const tick = runAssistant('Mark EIN done', demo, { propose: true });
    expect(tick.tool).toBe('legal-check');
    await tick.proposal!.apply();
    expect(isLegalDone('ein')).toBe(true);
    const reopen = runAssistant('untick ein', demo, { propose: true });
    await reopen.proposal!.apply();
    expect(isLegalDone('ein')).toBe(false);
    await reopen.proposal!.undo!();
    expect(isLegalDone('ein')).toBe(true);
  });

  it('does not hijack milestone or task phrasing', () => {
    expect(runAssistant('mark milestone bank integration done', demo, { propose: true }).tool).not.toBe('legal-check');
    expect(runAssistant('add task write the pitch deck', demo, { propose: true }).tool).toBe('task-add');
  });

  it('reports focus time and saved searches from the same lists', () => {
    addFocusSession(25);
    expect(runAssistant('/focus', demo).en).toContain('1 focus session');
    expect(runAssistant('Show my saved searches', demo).tool).toBe('saved-searches');
  });

  it('logs a focus session, saves a Discovery search, and restores hidden members with exact undo', async () => {
    const baseSessions = readFocusToday().sessions;
    const logFocus = runAssistant('Log a 25-minute focus session', demo, { propose: true });
    expect(logFocus.tool).toBe('focus-log');
    expect(readFocusToday().sessions).toBe(baseSessions);
    await logFocus.proposal!.apply();
    expect(readFocusToday().sessions).toBe(baseSessions + 1);
    await logFocus.proposal!.undo!();
    expect(readFocusToday().sessions).toBe(baseSessions);

    const saveSearch = runAssistant('Save search Fintech CTO', demo, { propose: true });
    expect(saveSearch.tool).toBe('save-search');
    expect(readSavedSearches()).toHaveLength(0);
    await saveSearch.proposal!.apply();
    expect(readSavedSearches()[0]?.label).toBe('Fintech CTO');
    await saveSearch.proposal!.undo!();
    expect(readSavedSearches()).toHaveLength(0);

    toggleId(keys.hiddenPeople, 'fp-1');
    expect(readIds(keys.hiddenPeople)).toEqual(['fp-1']);
    const unhide = runAssistant('Restore hidden members', demo, { propose: true });
    expect(unhide.tool).toBe('unhide-people');
    await unhide.proposal!.apply();
    expect(readIds(keys.hiddenPeople)).toEqual([]);
    await unhide.proposal!.undo!();
    expect(readIds(keys.hiddenPeople)).toEqual(['fp-1']);
  });

  it('reads collaborator skill endorsements and verifies a collaborator skill with Confirm and exact Undo', async () => {
    expect(runAssistant('Show my skill endorsements', demo).tool).toBe('endorsements');
    expect(runAssistant('Δείξε τις συστάσεις δεξιοτήτων μου', demo).tool).toBe('endorsements');

    const baseSarah = readEndorsements('sarah-chen').length;
    const endorse = runAssistant('Endorse Sarah Chen for TypeScript', demo, { propose: true });
    expect(endorse.tool).toBe('endorse-skill');
    expect(readEndorsements('sarah-chen')).toHaveLength(baseSarah);
    await endorse.proposal!.apply();
    expect(readEndorsements('sarah-chen')).toHaveLength(baseSarah + 1);
    expect(readEndorsements('sarah-chen')[0]?.skillId).toBe('TypeScript');
    expect(readEndorsements('sarah-chen')[0]?.verified).toBe(true);
    await endorse.proposal!.undo!();
    expect(readEndorsements('sarah-chen')).toHaveLength(baseSarah);
  });

  it('persists structured assistant feedback reasons and supports vote toggling', () => {
    writeAssistantFeedback('turn-1', 'down', 'wrong_result');
    expect(readAssistantFeedback().find((f) => f.turnId === 'turn-1')).toMatchObject({
      turnId: 'turn-1',
      value: 'down',
      reason: 'wrong_result',
    });
    writeAssistantFeedback('turn-1', null);
    expect(readAssistantFeedback().find((f) => f.turnId === 'turn-1')).toBeUndefined();
  });

  it('audits every area with fixes as follow-ups', () => {
    const audit = runAssistant('Audit my studio', demo);
    expect(audit.tool).toBe('audit');
    expect(audit.en).toMatch(/Studio check: \d+% complete across 8 areas/);
    expect((audit.followUps ?? []).length).toBeGreaterThan(0);
    expect(runAssistant('Τι λείπει ακόμα στην ιδρυτική ομάδα;', demo).tool).toBe('team-gap');
  });
});

