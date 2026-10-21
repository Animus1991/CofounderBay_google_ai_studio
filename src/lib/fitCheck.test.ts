import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFitCheck, scoreFit, writeFitCheck } from './fitCheck';
import { resetAllLists, setDataScope } from './localLists';

vi.mock('../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', async (importOriginal) => {
  const original = await importOriginal<typeof import('firebase/firestore')>();
  return { ...original };
});

describe('scoreFit', () => {
  it('names a builder seeking GTM from the matching fields', () => {
    const result = scoreFit({
      roleCover: 'builder',
      stage: 'Pre-seed',
      commitment: 'Full-time',
      lookingFor: ['Sales', 'Growth', 'Partnerships'],
      hours: 'overlap',
    }, 'gtm');
    expect(result.archetype.en).toMatch(/go-to-market/i);
    expect(result.why.en).toMatch(/looking-for/);
    expect(result.why.en).toMatch(/Pre-seed/);
  });
});

describe('fit check storage is per account', () => {
  beforeEach(() => {
    localStorage.clear();
    setDataScope(null);
    resetAllLists();
  });

  it('does not show account A answers after switching to account B', () => {
    const sample = scoreFit({
      roleCover: 'builder',
      stage: 'Pre-seed',
      commitment: 'Full-time',
      lookingFor: ['Sales'],
      hours: 'overlap',
    }, 'gtm');
    setDataScope('user-a');
    writeFitCheck(sample);
    expect(readFitCheck()?.archetype.en).toMatch(/go-to-market/i);
    setDataScope('user-b');
    expect(readFitCheck()).toBeNull();
  });
});
