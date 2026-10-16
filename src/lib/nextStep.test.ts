import { beforeEach, describe, expect, it } from 'vitest';
import { studioNextStep } from './nextStep';
import { resetAllLists } from './localLists';

describe('studioNextStep', () => {
  beforeEach(() => {
    resetAllLists();
    try {
      localStorage.removeItem('cfb.fitCheck');
    } catch {
      /* ignore */
    }
  });

  it('asks for the fit check when looking-for is empty', () => {
    const next = studioNextStep({});
    expect(next.id).toBe('quiz');
    expect(next.href).toBe('/quiz');
  });

  it('points at a named match when looking-for is filled', () => {
    const next = studioNextStep({
      skills: ['TypeScript', 'React'],
      lookingFor: ['Sales', 'Growth'],
      industry: 'FinTech',
      stage: 'Pre-seed',
      commitment: 'Full-time',
      city: 'Athens',
      timezone: 'Europe/Athens',
    });
    expect(['need', 'match', 'overdue']).toContain(next.id);
    expect(next.href).toBeTruthy();
  });
});
