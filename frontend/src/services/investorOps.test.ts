import { beforeEach, describe, expect, it } from 'vitest';
import { runAssistant } from './assistantOps';
import { readRound, writeRound } from '../lib/localLists';
import { respond } from '../ai/engine';
import { readPitch } from '../lib/pitch';
import { isLegalDone } from '../lib/legalChecklist';

const demo = { fullName: 'Demo User', headline: 'Founder', skills: ['React'] } as never;
const options = { lang: 'en' as const, page: { href: '/assistant', en: 'AI Studio', el: 'AI Studio' } };

function seed() {
  writeRound({
    pipeline: [
      { investorId: 'inv_1', name: 'Sequoia Capital', stage: 'Due Diligence', notes: '', updatedAt: '2026-01-01T00:00:00Z' },
      { investorId: 'inv_2', name: 'Naval Ravikant', stage: 'Meeting', notes: '', updatedAt: '2026-01-01T00:00:00Z' },
    ],
  });
}
const stageOf = (id: string) => readRound().pipeline?.find((item) => item.investorId === id)?.stage;

describe('investor CRM through the assistant', () => {
  beforeEach(() => { localStorage.clear(); seed(); });

  it('reads the pipeline grouped by stage', () => {
    const result = runAssistant('/pipeline', demo);
    expect(result.tool).toBe('pipeline');
    expect(result.en).toContain('Due Diligence: Sequoia Capital');
  });

  it('adds an investor only after Confirm and undoes exactly that entry', async () => {
    const result = runAssistant('Add Lowercarbon Capital to my pipeline at Contacted', demo, { propose: true });
    expect(result.tool).toBe('investor-add');
    expect(readRound().pipeline).toHaveLength(2);
    await result.proposal!.apply();
    expect(readRound().pipeline?.find((item) => item.name === 'Lowercarbon Capital')?.stage).toBe('Contacted');
    await result.proposal!.undo!();
    expect(readRound().pipeline).toHaveLength(2);
  });

  it('moves an investor by fuzzy name and records stage history', async () => {
    const result = runAssistant('Move Naval to Term Sheet', demo, { propose: true });
    expect(result.tool).toBe('investor-move');
    await result.proposal!.apply();
    expect(stageOf('inv_2')).toBe('Term Sheet');
    expect(readRound().pipeline?.find((item) => item.investorId === 'inv_2')?.history?.at(-1)?.stage).toBe('Term Sheet');
    await result.proposal!.undo!();
    expect(stageOf('inv_2')).toBe('Meeting');
  });

  it('sets a next step with a date', async () => {
    const result = runAssistant('/investor next Sequoia: send the pilot report by 2026-07-01', demo, { propose: true });
    expect(result.tool).toBe('investor-next');
    await result.proposal!.apply();
    const entry = readRound().pipeline?.find((item) => item.investorId === 'inv_1');
    expect(entry?.nextStep).toBe('send the pilot report');
    expect(entry?.nextDate).toBe('2026-07-01');
  });

  it('does not treat unknown names as a move', () => {
    expect(runAssistant('move the meeting to Friday', demo, { propose: true }).tool).not.toBe('investor-move');
  });
});

describe('multi-step plans', () => {
  beforeEach(() => { localStorage.clear(); seed(); });

  it('splits several router writes into a plan of separate proposals', async () => {
    const result = await respond('Set the problem slide to Buildings waste grey water; mark EIN done; move Naval to Term Sheet', demo, options);
    expect(result.tool).toBe('plan');
    expect(result.plan).toHaveLength(3);
    expect(result.plan!.map((step) => step.tool)).toEqual(['pitch-set', 'legal-check', 'investor-move']);
    await result.plan![1]!.proposal!.apply();
    expect(isLegalDone('ein')).toBe(true);
    expect(stageOf('inv_2')).toBe('Meeting');
    await result.plan![0]!.proposal!.apply();
    await result.plan![2]!.proposal!.apply();
    await result.plan![0]!.proposal!.undo!();
    expect(readPitch().problem).toBeUndefined();
    expect(stageOf('inv_2')).toBe('Term Sheet');
  });

  it('turns several model tool calls into one plan', async () => {
    const result = await respond('write my problem and solution slides', demo, {
      ...options,
      planner: async () => ({
        text: '',
        functionCalls: [
          { name: 'set_pitch_slide', args: { slide: 'problem', text: 'Buildings flush drinkable water' } },
          { name: 'set_pitch_slide', args: { slide: 'solution', text: 'An IoT bio-filter that reuses grey water' } },
        ],
      }),
    });
    expect(result.tool).toBe('plan');
    expect(result.origin).toBe('model-tool');
    expect(result.plan).toHaveLength(2);
  });

  it('leaves a single command alone', async () => {
    const result = await respond('Mark EIN done', demo, options);
    expect(result.tool).toBe('legal-check');
    expect(result.plan).toBeUndefined();
  });
});

describe('draft requests go to the model', () => {
  beforeEach(() => localStorage.clear());

  it('sends "write my problem and market slides" to the planner and returns a plan', async () => {
    let asked = '';
    const result = await respond('Write my problem and market slides for EcoFlow', demo, {
      ...options,
      planner: async (input) => {
        asked = input.prompt;
        return {
          text: '',
          functionCalls: [
            { name: 'set_pitch_slide', args: { slide: 'problem', text: 'Buildings pay twice for water.' } },
            { name: 'set_pitch_slide', args: { slide: 'market', text: '2.1M apartment buildings in the EU.' } },
          ],
        };
      },
    });
    expect(asked).toContain('Call set_pitch_slide once for every slide');
    expect(result.tool).toBe('plan');
  });

  it('falls back to the pitch status when the model is unreachable', async () => {
    const result = await respond('Draft my pitch deck slides', demo, { ...options, planner: async () => { throw new Error('down'); } });
    expect(result.tool).toBe('pitch');
  });
});
