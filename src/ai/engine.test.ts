import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readMilestones, readTasks, resetAllLists } from '../lib/localLists';
import { AIProxyError } from '../services/aiService';
import { respond, splitCommands, type Planner } from './engine';

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

  it('turns several changes in one message into separate proposals with nothing written yet', async () => {
    const planner = vi.fn<Planner>();
    const milestonesBefore = readMilestones().length;
    const tasksBefore = readTasks().length;
    const result = await respond('add milestone Private beta live and add task Call the bank', viewer, { lang: 'en', page, planner });
    expect(planner).not.toHaveBeenCalled();
    expect(result.tool).toBe('batch');
    expect(result.batch?.map((item) => item.tool)).toEqual(['milestone-add', 'task-add']);
    expect(result.batch?.every((item) => item.proposal)).toBe(true);
    expect(readMilestones().length).toBe(milestonesBefore);
    expect(readTasks().length).toBe(tasksBefore);
    for (const item of result.batch ?? []) await item.proposal!.apply();
    expect(readMilestones().some((item) => item.title === 'Private beta live')).toBe(true);
    expect(readTasks().some((item) => item.title === 'Call the bank')).toBe(true);
  });

  it('splits on new lines and Greek "και" too', () => {
    expect(splitCommands('add task A\nadd task B')).toEqual(['add task A', 'add task B']);
    expect(splitCommands('Πρόσθεσε ορόσημο Beta και πρόσθεσε εργασία Τράπεζα')).toEqual(['Πρόσθεσε ορόσημο Beta', 'πρόσθεσε εργασία Τράπεζα']);
    expect(splitCommands('one thing only')).toEqual([]);
  });

  it('keeps "and" inside a title when the parts are not each a command', async () => {
    const result = await respond('add milestone Ship design and launch', viewer, { lang: 'en', page, planner: vi.fn<Planner>() });
    expect(result.tool).toBe('milestone-add');
    expect(result.batch).toBeUndefined();
    expect(result.proposal?.summary.en).toMatch(/Ship design and launch/);
  });

  it('lets the model read studio data first, then answers from it and lists what it read', async () => {
    const planner = vi.fn<Planner>()
      .mockResolvedValueOnce({ text: '', functionCalls: [{ name: 'list_milestones', args: {} }] })
      .mockResolvedValueOnce({ text: 'Focus on the overdue milestone first.', functionCalls: [] });
    const result = await respond('Given everything on my plate, where should my energy go this week?', viewer, { lang: 'en', page, planner });
    expect(planner).toHaveBeenCalledTimes(2);
    const second = planner.mock.calls[1]![0];
    const lastTurn = second.contents.at(-1) as { parts: { functionResponse?: { name: string; response: { result: string } } }[] };
    expect(lastTurn.parts[0]?.functionResponse?.name).toBe('list_milestones');
    expect(lastTurn.parts[0]?.functionResponse?.response.result.length).toBeGreaterThan(10);
    expect(result.origin).toBe('model-answer');
    expect(result.en).toBe('Focus on the overdue milestone first.');
    expect(result.sources?.some((source) => /milestone/i.test(source.en))).toBe(true);
  });

  it('stops reading after the limit and shows what it read', async () => {
    const planner = vi.fn<Planner>().mockResolvedValue({ text: '', functionCalls: [{ name: 'list_milestones', args: {} }] });
    const result = await respond('Tell me everything that matters about my progress lately', viewer, { lang: 'en', page, planner });
    expect(planner).toHaveBeenCalledTimes(4);
    expect(result.origin).toBe('model-tool');
    expect(result.tool).toMatch(/milestone/);
  });

  it('says that sign-in is needed when the proxy refuses an anonymous call', async () => {
    const planner: Planner = async () => { throw new AIProxyError(401, 'sign-in-required', 'Sign in to use the AI assistant.'); };
    const result = await respond('How should I price my SaaS product?', viewer, { lang: 'en', page, planner, suggestions });
    expect(result.origin).toBe('unmatched');
    expect(result.en).toMatch(/signed in/);
    expect(result.links[0]?.href).toBe('/login');
  });

  it('streams the answer to the caller as it is written', async () => {
    const seen: string[] = [];
    const planner: Planner = async (input) => {
      input.onText?.('Start');
      input.onText?.('Start with value');
      return { text: 'Start with value', functionCalls: [] };
    };
    const result = await respond('How should I price my SaaS product?', viewer, { lang: 'en', page, planner, onText: (soFar) => seen.push(soFar) });
    expect(seen).toEqual(['Start', 'Start with value']);
    expect(result.en).toBe('Start with value');
  });
});
