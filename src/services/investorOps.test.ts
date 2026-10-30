import { beforeEach, describe, expect, it } from 'vitest';
import { runAssistant } from './assistantOps';
import { readRound, setDataScope, writeRound } from '../lib/localLists';
import { respond } from '../ai/engine';
import { readPitch } from '../lib/pitch';
import { isLegalDone } from '../lib/legalChecklist';
import { overdueInvestors } from './investorOps';

// Scenarios first written for the other agent's investor CRM (branch claude/ai-os-upgrade),
// kept as regressions for the single pipeline implementation (services/assistantPipeline).

const demo = { fullName: 'Demo User', headline: 'Founder', skills: ['React'] } as never;
const options = { lang: 'en' as const, page: { href: '/assistant', en: 'AI Studio', el: 'AI Studio' } };

function seed() {
  writeRound({
    pipeline: [
      { investorId: 'inv_1', name: 'Sequoia Capital', stage: 'Due Diligence', notes: '', checkSize: '$500k', updatedAt: '2026-01-01T00:00:00Z' },
      { investorId: 'inv_2', name: 'Naval Ravikant', stage: 'Meeting', notes: '', updatedAt: '2026-01-01T00:00:00Z' },
    ],
  });
}
const stageOf = (id: string) => readRound().pipeline?.find((item) => item.investorId === id)?.stage;

beforeEach(() => {
  setDataScope(null);
  localStorage.clear();
  seed();
});

describe('investor CRM through the assistant', () => {
  it('reads the pipeline with stage and check size, from /pipeline too', () => {
    const result = runAssistant('/pipeline', demo);
    expect(result.tool).toBe('pipeline');
    expect(result.en).toContain('Sequoia Capital · Due Diligence · $500k');
    expect(result.href).toBe('/fundraising?tab=crm');
  });

  it('adds an investor at a named stage only after Confirm, and undoes exactly that entry', async () => {
    const result = runAssistant('Add Lowercarbon Capital to my pipeline at Contacted', demo, { propose: true });
    expect(result.tool).toBe('pipeline-add');
    expect(readRound().pipeline).toHaveLength(2);
    await result.proposal!.apply();
    expect(readRound().pipeline?.find((item) => item.name === 'Lowercarbon Capital')?.stage).toBe('Contacted');
    await result.proposal!.undo!();
    expect(readRound().pipeline).toHaveLength(2);
  });

  it('accepts the /investor slash forms', async () => {
    const added = runAssistant('/investor add Lowercarbon Capital at Meeting', demo, { propose: true });
    expect(added.tool).toBe('pipeline-add');
    await added.proposal!.apply();
    expect(readRound().pipeline?.find((item) => item.name === 'Lowercarbon Capital')?.stage).toBe('Meeting');
    const moved = runAssistant('/investor move Naval to Term Sheet', demo, { propose: true });
    expect(moved.tool).toBe('pipeline-move');
  });

  it('moves an investor by a short name, records stage history and undoes it exactly', async () => {
    const result = runAssistant('Move Naval to Term Sheet', demo, { propose: true });
    expect(result.tool).toBe('pipeline-move');
    await result.proposal!.apply();
    expect(stageOf('inv_2')).toBe('Term Sheet');
    expect(readRound().pipeline?.find((item) => item.investorId === 'inv_2')?.history?.at(-1)?.stage).toBe('Term Sheet');
    await result.proposal!.undo!();
    expect(stageOf('inv_2')).toBe('Meeting');
    expect(readRound().pipeline?.find((item) => item.investorId === 'inv_2')?.history).toBeUndefined();
  });

  it('understands "X moved to Y"', () => {
    expect(runAssistant('Naval moved to Due Diligence', demo, { propose: true }).tool).toBe('pipeline-move');
  });

  it('sets a next step with an ISO date through /investor next', async () => {
    const result = runAssistant('/investor next Sequoia: send the pilot report by 2026-07-01', demo, { propose: true });
    expect(result.tool).toBe('followup-set');
    await result.proposal!.apply();
    const entry = readRound().pipeline?.find((item) => item.investorId === 'inv_1');
    expect(entry?.nextStep).toBe('send the pilot report');
    expect(entry?.nextDate).toBe('2026-07-01');
  });

  it('does not treat unknown names as a move', () => {
    expect(runAssistant('move the meeting to Friday', demo, { propose: true }).tool).not.toBe('pipeline-move');
  });

  it('drafts a stage-aware follow-up email from the founder’s own data', () => {
    const result = runAssistant('Draft a follow-up email to Naval Ravikant', demo);
    expect(result.tool).toBe('investor-email');
    expect(result.en).toMatch(/^Subject: Thank you — next steps/);
    expect(result.draft?.facts).toContain('Investor: Naval Ravikant (stage Meeting');
  });

  it('lists overdue investors by the local day', () => {
    writeRound({ pipeline: [{ investorId: 'x', name: 'Late Fund', stage: 'Contacted', notes: '', nextStep: 'Call', nextDate: '2000-01-01', updatedAt: '' }] });
    expect(overdueInvestors().map((item) => item.name)).toEqual(['Late Fund']);
  });
});

describe('several changes in one turn', () => {
  it('splits several router writes into one batch of separate proposals', async () => {
    const result = await respond('Set the problem slide to Buildings waste grey water; mark EIN done; move Naval to Term Sheet', demo, options);
    expect(result.tool).toBe('batch');
    expect(result.batch).toHaveLength(3);
    expect(result.batch!.map((step) => step.tool)).toEqual(['pitch-set', 'legal-check', 'pipeline-move']);
    await result.batch![1]!.proposal!.apply();
    expect(isLegalDone('ein')).toBe(true);
    expect(stageOf('inv_2')).toBe('Meeting');
    await result.batch![0]!.proposal!.apply();
    await result.batch![2]!.proposal!.apply();
    await result.batch![0]!.proposal!.undo!();
    expect(readPitch().problem).toBeUndefined();
    expect(stageOf('inv_2')).toBe('Term Sheet');
  });

  it('turns several model tool calls into one batch', async () => {
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
    expect(result.tool).toBe('batch');
    expect(result.origin).toBe('model-tool');
    expect(result.batch).toHaveLength(2);
  });

  it('leaves a single command alone', async () => {
    const result = await respond('Mark EIN done', demo, options);
    expect(result.tool).toBe('legal-check');
    expect(result.batch).toBeUndefined();
  });
});

describe('draft requests go to the model', () => {
  it('sends "write my problem and market slides" to the planner and returns a batch', async () => {
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
    expect(result.tool).toBe('batch');
  });

  it('falls back to the pitch status when the model is unreachable', async () => {
    const result = await respond('Draft my pitch deck slides', demo, { ...options, planner: async () => { throw new Error('down'); } });
    expect(result.tool).toBe('pitch');
  });

  it('lets the model rewrite an investor email from the same facts, and keeps the template when it cannot', async () => {
    const rewritten = await respond('Draft a follow-up email to Naval Ravikant', demo, {
      ...options,
      writer: async () => ({ subject: 'Per-building numbers', body: 'Hi Naval, thanks for the second meeting. Here is the per-building cost model you asked for.' }),
    });
    expect(rewritten.origin).toBe('model-answer');
    expect(rewritten.en).toMatch(/^Subject: Per-building numbers/);
    const kept = await respond('Draft a follow-up email to Naval Ravikant', demo, { ...options, writer: async () => { throw new Error('down'); } });
    expect(kept.origin).toBe('router');
    expect(kept.en).toMatch(/^Subject: /);
  });
});
