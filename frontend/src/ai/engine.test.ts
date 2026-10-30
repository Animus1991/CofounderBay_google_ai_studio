import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readMilestones, resetAllLists } from '../lib/localLists';
import { respond, type Planner } from './engine';

const viewer = {
  fullName: 'Demo User',
  skills: ['React', 'TypeScript'],
  lookingFor: ['Sales', 'Growth'],
  industry: 'FinTech',
  stage: 'Pre-seed',
  commitment: 'Full-time',
  location: 'Athens, Greece',
};
const page = { href: '/dashboard', en: 'Dashboard', el: 'Πίνακας' };
const suggestions = [{ en: 'Who is my best match?', el: 'Ποια είναι η καλύτερη αντιστοίχιση;' }];

beforeEach(() => {
  resetAllLists();
  try { localStorage.setItem('demo_mode', 'true'); } catch { /* non-DOM env */ }
});

describe('assistant engine', () => {
  it('answers recognised requests from the router without calling the model', async () => {
    const planner = vi.fn<Planner>();
    const result = await respond('who is my best match', viewer, { lang: 'en', page, planner });
    expect(result.origin).toBe('router');
    expect(result.tool).toBe('matches');
    expect(planner).not.toHaveBeenCalled();
  });

  it('hands an unrecognised question to the model and shows its answer, not the briefing', async () => {
    const planner = vi.fn<Planner>().mockResolvedValue({ text: 'Start with value-based pricing: …', functionCalls: [] });
    const result = await respond('How should I price my SaaS product?', viewer, { lang: 'en', page, planner });
    expect(planner).toHaveBeenCalledOnce();
    const input = planner.mock.calls[0]![0];
    expect(input.prompt).toContain('How should I price my SaaS product?');
    expect(input.context).toContain('Dashboard');
    expect(input.functionDeclarations.length).toBeGreaterThan(40);
    expect(result.origin).toBe('model-answer');
    expect(result.tool).toBe('answer');
    expect(result.en).toMatch(/value-based pricing/);
    expect(result.en).not.toMatch(/Best match/);
  });

  it('runs a model tool call through the router as a proposal, so nothing is written before Confirm', async () => {
    const before = readMilestones().length;
    const planner: Planner = async () => ({
      text: '',
      functionCalls: [{ name: 'add_milestone', args: { title: 'Close five design partners' } }],
    });
    const result = await respond('I really need to get five design partners signed this month', viewer, { lang: 'en', page, planner });
    expect(result.origin).toBe('model-tool');
    expect(result.tool).toBe('milestone-add');
    expect(result.interpretedAs?.id).toBe('add_milestone');
    expect(result.proposal).toBeDefined();
    expect(readMilestones().length).toBe(before);
    await result.proposal!.apply();
    expect(readMilestones().some((item) => item.title === 'Close five design partners')).toBe(true);
  });

  it('asks for what is missing instead of guessing a required argument', async () => {
    const planner: Planner = async () => ({ text: '', functionCalls: [{ name: 'explain_match', args: {} }] });
    const result = await respond('why is that person a good fit', viewer, { lang: 'en', page, planner });
    expect(result.tool).toBe('clarify');
    expect(result.en).toMatch(/person/);
    expect(result.proposal).toBeUndefined();
  });

  it('ignores a tool name that is not in the catalogue', async () => {
    const planner: Planner = async () => ({ text: '', functionCalls: [{ name: 'delete_account', args: {} }] });
    const result = await respond('do something drastic', viewer, { lang: 'en', page, planner, suggestions });
    expect(result.origin).toBe('unmatched');
    expect(result.proposal).toBeUndefined();
  });

  it('says honestly that it cannot help when the model is unreachable', async () => {
    const planner: Planner = async () => { throw new Error('AI proxy error (503)'); };
    const result = await respond('How should I price my SaaS product?', viewer, { lang: 'en', page, planner, suggestions });
    expect(result.origin).toBe('unmatched');
    expect(result.en).toMatch(/not reachable/);
    expect(result.en).not.toMatch(/Best match/);
    expect(result.followUps?.[0]?.en).toBe('Who is my best match?');
    expect(result.links[0]?.href).toBe('/assistant');
  });

  it('gives up after the timeout instead of hanging the chat', async () => {
    const planner: Planner = () => new Promise(() => undefined);
    const result = await respond('Explain cap tables to me', viewer, { lang: 'en', page, planner, timeoutMs: 20 });
    expect(result.origin).toBe('unmatched');
  });

  it('passes recent turns so the model can resolve references', async () => {
    const planner = vi.fn<Planner>().mockResolvedValue({ text: 'ok', functionCalls: [] });
    await respond('and what about her?', viewer, {
      lang: 'en',
      page,
      planner,
      history: [
        { role: 'user', text: 'Tell me about Sarah Chen' },
        { role: 'assistant', text: 'Sarah Chen is listed as Founder.' },
      ],
    });
    expect(planner.mock.calls[0]![0].prompt).toMatch(/Sarah Chen is listed as Founder[\s\S]*and what about her\?/);
  });
});
