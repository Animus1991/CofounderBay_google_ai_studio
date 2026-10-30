import { describe, expect, it } from 'vitest';
import { BUILDER_CONTENT, BUILDER_MODULES, builderStatus, readBuilderInputs } from './builder';
import { keys } from './localLists';

describe('builderStatus', () => {
  it('returns Not started with no saved answers', () => {
    expect(builderStatus(1, {})).toEqual({ status: 'Not started', filled: 0, total: 3 });
  });

  it('returns In-Progress when some questions are answered', () => {
    expect(builderStatus(1, { '1-0': 'an answer' }).status).toBe('In-Progress');
  });

  it('returns Completed when every question is answered', () => {
    expect(builderStatus(1, { '1-0': 'a', '1-1': 'b', '1-2': 'c' }).status).toBe('Completed');
  });

  it('ignores blank or whitespace-only answers', () => {
    expect(builderStatus(2, { '2-0': '   ' }).filled).toBe(0);
  });

  it('has one module per content entry', () => {
    expect(BUILDER_MODULES.length).toBe(Object.keys(BUILDER_CONTENT).length);
  });

  it('demo with nothing stored reproduces the staged look from real answers', () => {
    localStorage.removeItem(keys.builderInputs);
    localStorage.setItem('demo_mode', 'true');
    try {
      const inputs = readBuilderInputs();
      expect(builderStatus(1, inputs).status).toBe('Completed');
      expect(builderStatus(2, inputs).status).toBe('Completed');
      expect(builderStatus(3, inputs).status).toBe('In-Progress');
      expect(builderStatus(4, inputs).status).toBe('Not started');
      expect(builderStatus(5, inputs).status).toBe('Not started');
    } finally {
      localStorage.removeItem('demo_mode');
    }
  });

  it('real account with nothing stored is all Not started', () => {
    localStorage.removeItem(keys.builderInputs);
    localStorage.removeItem('demo_mode');
    const inputs = readBuilderInputs();
    for (const module of BUILDER_MODULES) {
      expect(builderStatus(module.id, inputs).status).toBe('Not started');
    }
  });
});
