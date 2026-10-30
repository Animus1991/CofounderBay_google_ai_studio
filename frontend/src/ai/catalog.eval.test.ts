/**
 * Routing eval: every capability the catalogue declares must be reachable.
 *
 * Three promises are checked for each action:
 *  1. the English `example` a person would type reaches the declared tool;
 *  2. the Greek `example` reaches the same tool (the studio is bilingual);
 *  3. `command(sampleArgs)` — the sentence a model's tool call is turned
 *     into — reaches the same tool, and a write arrives as a proposal the
 *     person confirms rather than as a change already made.
 *
 * A declaration that drifts from the router, or a router change that strands
 * a declared capability, fails here instead of in front of a founder.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { resetAllLists } from '../lib/localLists';
import { runAssistant } from '../services/assistantOps';
import { ACTION_CATALOG, actionById, checkArgs, toFunctionDeclarations } from './catalog';
import { DEFAULT_STARTERS, PAGE_STARTERS, roleStarters } from '../lib/assistantStarters';

const viewer = {
  fullName: 'Demo User',
  headline: 'Technical founder building a FinTech product',
  skills: ['React', 'TypeScript', 'Node.js'],
  lookingFor: ['Sales', 'Growth', 'Fundraising'],
  interests: ['FinTech', 'SaaS', 'AI'],
  industry: 'FinTech',
  stage: 'Pre-seed',
  commitment: 'Full-time',
  location: 'Athens, Greece',
  timezone: 'Europe/Athens',
};

beforeEach(() => {
  resetAllLists();
  try { localStorage.setItem('demo_mode', 'true'); } catch { /* non-DOM env */ }
});

describe('action catalogue', () => {
  it('declares unique ids and every write with a reversal', () => {
    const ids = ACTION_CATALOG.map((action) => action.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const action of ACTION_CATALOG) {
      if (action.kind === 'write') expect(action.reversal, action.id).toBeDefined();
      expect(action.id).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(action.label.en && action.label.el, action.id).toBeTruthy();
    }
  });

  it('offers the model one function per action, with required params listed', () => {
    const declarations = toFunctionDeclarations();
    expect(declarations).toHaveLength(ACTION_CATALOG.length);
    const explain = declarations.find((item) => item.name === 'explain_match');
    expect(explain?.parameters.required).toEqual(['person']);
    const theme = declarations.find((item) => item.name === 'set_theme');
    expect((theme?.parameters.properties as Record<string, { enum?: string[] }>).theme?.enum).toContain('burgundy');
  });

  it('rejects missing and out-of-set arguments, and keeps the canonical enum spelling', () => {
    const setRound = actionById('set_round')!;
    expect(checkArgs(setRound, { field: 'target' })).toEqual({ ok: false, missing: ['value'], invalid: [] });
    expect(checkArgs(setRound, { field: 'salary', value: '1' })).toEqual({ ok: false, missing: [], invalid: ['field'] });
    expect(checkArgs(setRound, { field: 'BURN', value: '12k', extra: 'x' })).toEqual({ ok: true, args: { field: 'burn', value: '12k' } });
  });
});

describe('routing eval — English examples', () => {
  for (const action of ACTION_CATALOG) {
    it(`${action.id}: “${action.example.en}” → ${action.tool}`, () => {
      const result = runAssistant(action.example.en, viewer, { propose: true });
      expect(result.fallback, 'fell through to the briefing').toBeFalsy();
      expect(result.tool).toBe(action.tool);
    });
  }
});

describe('routing eval — Greek examples', () => {
  for (const action of ACTION_CATALOG) {
    it(`${action.id}: «${action.example.el}» → ${action.tool}`, () => {
      const result = runAssistant(action.example.el, viewer, { propose: true });
      expect(result.fallback, 'fell through to the briefing').toBeFalsy();
      expect(result.tool).toBe(action.tool);
    });
  }
});

describe('routing eval — model tool calls', () => {
  for (const action of ACTION_CATALOG) {
    it(`${action.id}: command(sampleArgs) → ${action.tool}`, () => {
      const checked = checkArgs(action, action.sampleArgs ?? {});
      expect(checked.ok, JSON.stringify(checked)).toBe(true);
      const command = action.command(checked.ok ? checked.args : {});
      const result = runAssistant(command, viewer, { propose: true });
      expect(result.fallback, `“${command}” fell through to the briefing`).toBeFalsy();
      expect(result.tool, command).toBe(action.tool);
      if (action.kind === 'write' && action.reversal !== 'none') {
        // A write the model picks must still wait for the person.
        expect(result.proposal, `“${command}” wrote without asking`).toBeDefined();
      }
    });
  }
});

describe('fallback flag', () => {
  it('marks an unrelated question as unmatched instead of answering it with the briefing', () => {
    const result = runAssistant('How should I price my SaaS product?', viewer, { propose: true });
    expect(result.fallback).toBe(true);
  });

  it('leaves every matched tool unflagged', () => {
    expect(runAssistant('who is my best match', viewer).fallback).toBeFalsy();
    expect(runAssistant('status today', viewer).fallback).toBeFalsy();
  });
});

describe('routing eval — every suggested starter reaches a studio tool', () => {
  // A chip the studio itself suggests must never land on "not matched".
  const starters = [
    ...DEFAULT_STARTERS,
    ...Object.values(PAGE_STARTERS).flat(),
    ...roleStarters('mentor'),
    ...roleStarters('investor'),
  ];
  const unique = [...new Map(starters.map((item) => [item.en, item])).values()];
  for (const starter of unique) {
    it(`“${starter.en}” / «${starter.el}»`, () => {
      expect(runAssistant(starter.en, viewer, { propose: true }).fallback, starter.en).toBeFalsy();
      expect(runAssistant(starter.el, viewer, { propose: true }).fallback, starter.el).toBeFalsy();
    });
  }
});
