import { beforeEach, describe, expect, it } from 'vitest';
import { followUps, readRound, resetAllLists, setDataScope } from '../lib/localLists';
import { findInvestor, parseDay, parseStage, routePipeline, stepText } from './assistantPipeline';
import { fold } from './assistantText';
import { runAssistant } from './assistantOps';

// A Thursday, so weekday arithmetic is checkable.
const NOW = new Date(2026, 9, 29, 10, 0, 0);

beforeEach(() => {
  setDataScope(null); // the sample account (its round brings the sample pipeline)
  resetAllLists();
  try { localStorage.setItem('demo_mode', 'true'); } catch { /* non-DOM env */ }
});

describe('understanding days', () => {
  const day = (text: string) => parseDay(fold(text), NOW)?.day ?? null;

  it('reads relative and named days in English', () => {
    expect(day('today')).toBe('2026-10-29');
    expect(day('by tomorrow')).toBe('2026-10-30');
    expect(day('in 3 days')).toBe('2026-11-01');
    expect(day('next week')).toBe('2026-11-05');
    expect(day('by Friday')).toBe('2026-10-30');
    expect(day('on Thursday')).toBe('2026-11-05');
    expect(day('on 15 Nov')).toBe('2026-11-15');
    expect(day('Nov 4')).toBe('2026-11-04');
    expect(day('2026-12-01')).toBe('2026-12-01');
    expect(day('15/11')).toBe('2026-11-15');
  });

  it('reads Greek days, with or without accents', () => {
    expect(day('αύριο')).toBe('2026-10-30');
    expect(day('μέχρι την Παρασκευή')).toBe('2026-10-30');
    expect(day('σε 5 μέρες')).toBe('2026-11-03');
    expect(day('15 Νοεμβρίου')).toBe('2026-11-15');
    expect(day('την επόμενη εβδομάδα')).toBe('2026-11-05');
  });

  it('does not find a day inside other words', () => {
    expect(day('send the money model')).toBeNull();
    expect(day('a decision on pricing')).toBeNull();
    expect(day('31/02')).toBeNull();
  });
});

describe('understanding investors and stages', () => {
  it('finds a pipeline investor by full name, first word or a16z', () => {
    const pipeline = readRound().pipeline ?? [];
    expect(findInvestor(fold('next step with Sequoia Capital'), pipeline)?.investor.name).toBe('Sequoia Capital');
    expect(findInvestor(fold('follow up with sequoia'), pipeline)?.investor.name).toBe('Sequoia Capital');
    expect(findInvestor(fold('ping a16z'), pipeline)?.investor.name).toBe('Andreessen Horowitz');
    expect(findInvestor(fold('call the bank'), pipeline)).toBeNull();
  });

  it('reads the target stage in English and Greek', () => {
    expect(parseStage(fold('move naval to term sheet'))).toBe('Term Sheet');
    expect(parseStage(fold('μετακίνησε τον Naval σε δέουσα επιμέλεια'))).toBe('Due Diligence');
    expect(parseStage(fold('mark a16z as passed'))).toBe('Passed');
  });

  it('keeps only the words of the next step', () => {
    const pipeline = readRound().pipeline ?? [];
    const text = 'Next step with Sequoia: send the 2027 projections by Friday';
    const folded = fold(text);
    expect(stepText(text, findInvestor(folded, pipeline)!, parseDay(folded, NOW))).toBe('send the 2027 projections');
    const greek = 'Επόμενο βήμα με τη Sequoia: στείλε τις προβλέψεις μέχρι την Παρασκευή';
    const greekFolded = fold(greek);
    expect(stepText(greek, findInvestor(greekFolded, pipeline)!, parseDay(greekFolded, NOW))).toBe('στείλε τις προβλέψεις');
  });
});

describe('pipeline tools', () => {
  it('lists overdue and due-soon follow-ups from the sample round', () => {
    const due = followUps(readRound());
    expect(due.overdue.map((item) => item.name)).toEqual(['Andreessen Horowitz']);
    const result = runAssistant('What follow-ups are due?', null);
    expect(result.tool).toBe('followups');
    expect(result.en).toMatch(/1 overdue/);
    expect(result.en).toMatch(/Andreessen Horowitz: Follow up on the intro — overdue/);
    expect(runAssistant('Ποια follow-ups λήγουν;', null).tool).toBe('followups');
  });

  it('proposes a next step, writes it only on Confirm, and undoes it', async () => {
    const result = routePipeline('Next step with Sequoia: send the 2027 projections by Friday', true, NOW)!;
    expect(result.tool).toBe('followup-set');
    expect(result.proposal?.summary.en).toMatch(/send the 2027 projections/);
    const before = readRound().pipeline!.find((item) => item.investorId === 'inv_1')!;
    expect(before.nextStep).toBe('Share the data room with the pilot report');
    await result.proposal!.apply();
    const after = readRound().pipeline!.find((item) => item.investorId === 'inv_1')!;
    expect(after.nextStep).toBe('send the 2027 projections');
    expect(after.nextDate).toBe('2026-10-30');
    await result.proposal!.undo!();
    const restored = readRound().pipeline!.find((item) => item.investorId === 'inv_1')!;
    expect(restored.nextStep).toBe(before.nextStep);
    expect(restored.nextDate).toBe(before.nextDate);
  });

  it('moves an investor between stages and back', async () => {
    const result = runAssistant('move Naval to Term Sheet', null, { propose: true });
    expect(result.tool).toBe('pipeline-move');
    await result.proposal!.apply();
    expect(readRound().pipeline!.find((item) => item.investorId === 'inv_2')!.stage).toBe('Term Sheet');
    await result.proposal!.undo!();
    expect(readRound().pipeline!.find((item) => item.investorId === 'inv_2')!.stage).toBe('Meeting');
  });

  it('adds an investor from the directory, and says so when one is already tracked', async () => {
    const result = runAssistant('add Index Ventures to my pipeline', null, { propose: true });
    expect(result.tool).toBe('pipeline-add');
    await result.proposal!.apply();
    expect(readRound().pipeline!.some((item) => item.investorId === 'inv_6' && item.stage === 'Identified')).toBe(true);
    await result.proposal!.undo!();
    expect(readRound().pipeline!.some((item) => item.investorId === 'inv_6')).toBe(false);
    const again = runAssistant('add Sequoia to my pipeline', null, { propose: true });
    expect(again.proposal).toBeUndefined();
    expect(again.en).toMatch(/already in your pipeline/);
  });

  it('works in Greek', () => {
    expect(runAssistant('Πρόσθεσε την Index Ventures στη ροή μου', null, { propose: true }).tool).toBe('pipeline-add');
    expect(runAssistant('Μετακίνησε τον Naval σε Term Sheet', null, { propose: true }).tool).toBe('pipeline-move');
    expect(runAssistant('Επόμενο βήμα με τη Sequoia: στείλε τις προβλέψεις αύριο', null, { propose: true }).tool).toBe('followup-set');
  });

  it('leaves "what is my next step" to the general next-step answer when no investor is named', () => {
    expect(runAssistant('what is my next step', null).tool).not.toMatch(/followup/);
  });

  it('includes an overdue investor follow-up in the briefing', () => {
    expect(runAssistant('give me my brief', null).en).toMatch(/Investor follow-up overdue: Andreessen Horowitz/);
  });
});
