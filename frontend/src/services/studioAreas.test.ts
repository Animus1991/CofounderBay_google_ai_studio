import { beforeEach, describe, expect, it } from 'vitest';
import { runAssistant } from './assistantOps';
import { readPitch } from '../lib/pitch';
import { isLegalDone } from '../lib/legalChecklist';
import { addFocusSession } from '../lib/focusStats';

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

  it('audits every area with fixes as follow-ups', () => {
    const audit = runAssistant('Audit my studio', demo);
    expect(audit.tool).toBe('audit');
    expect(audit.en).toMatch(/Studio check: \d+% complete across 8 areas/);
    expect((audit.followUps ?? []).length).toBeGreaterThan(0);
    expect(runAssistant('Τι λείπει ακόμα στην ιδρυτική ομάδα;', demo).tool).toBe('team-gap');
  });
});
