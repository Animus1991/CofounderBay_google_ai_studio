import { beforeEach, describe, expect, it } from 'vitest';
import { resetAllLists } from './localLists';
import { runAssistant } from '../services/assistantOps';
import { LOCALIZED_PROMPTS, localizePrompt } from './promptLanguage';

beforeEach(() => {
  resetAllLists();
  try { localStorage.setItem('demo_mode', 'true'); } catch { /* non-DOM env */ }
});

describe('assistant prompts in the reader’s language', () => {
  it('leaves English alone and unknown prompts unchanged', () => {
    expect(localizePrompt('What is overdue?', 'en')).toBe('What is overdue?');
    expect(localizePrompt('Something new', 'el')).toBe('Something new');
  });

  it('routes every Greek prompt to the same tool as its English original', () => {
    const mismatches: string[] = [];
    for (const [en, el] of Object.entries(LOCALIZED_PROMPTS)) {
      const english = runAssistant(en, null);
      if (english.fallback) continue; // answered by the model either way
      const greek = runAssistant(el, null);
      if (greek.tool !== english.tool) mismatches.push(`${en} → ${english.tool} | ${el} → ${greek.tool}`);
    }
    expect(mismatches).toEqual([]);
  });

  it('carries names through the patterns', () => {
    expect(localizePrompt('Apply to Y Combinator S26', 'el')).toBe('Κάνε αίτηση στο Y Combinator S26');
    expect(localizePrompt('Why do I match with Sarah Chen?', 'el')).toBe('Γιατί ταιριάζω με Sarah Chen;');
    expect(runAssistant(localizePrompt('Why do I match with Sarah Chen?', 'el'), null).tool).toBe(runAssistant('Why do I match with Sarah Chen?', null).tool);
    expect(runAssistant(localizePrompt('Tell me about Sequoia Capital', 'el'), null).tool).toBe(runAssistant('Tell me about Sequoia Capital', null).tool);
  });
});

describe('drafting prompts keep their meaning in Greek', () => {
  it('still asks the model to write the same part of the studio', async () => {
    const { draftTarget } = await import('../ai/engine');
    expect(draftTarget(localizePrompt('Write my problem, market slides', 'el'))?.action).toBe('set_pitch_slide');
    expect(draftTarget(localizePrompt('Fill in my lean canvas', 'el'))?.action).toBe('set_canvas');
    expect(draftTarget(localizePrompt('Draft my startup builder market module', 'el'))?.action).toBe('set_builder');
  });
});
