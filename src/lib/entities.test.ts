import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { keys, resetAllLists, writeProfileLocal, writeValue } from './localLists';
import { pushRecent, recentTools, savedPerks, startupRecord, toggleId, useEntity, useVentureName, ventureName, ventureSummary } from './entities';
import { DEMO_VENTURE } from '../data/demoVenture';

describe('entities', () => {
  const clean = () => {
    localStorage.clear();
    resetAllLists();
  };
  beforeEach(clean);
  afterEach(clean);

  it('read a fallback for missing or malformed data', () => {
    expect(startupRecord.read()).toEqual({});
    writeValue(keys.startup, ['not', 'a', 'record']);
    expect(startupRecord.read()).toEqual({});
    writeValue(keys.savedPerks, ['aws', 3, null, 'gcp']);
    expect(savedPerks.read()).toEqual(['aws', 'gcp']);
  });

  it('toggle ids and keep the newest recents first', () => {
    toggleId(savedPerks, 'aws');
    toggleId(savedPerks, 'gcp');
    toggleId(savedPerks, 'aws');
    expect(savedPerks.read()).toEqual(['gcp']);
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'b']) pushRecent(recentTools, id);
    expect(recentTools.read()).toEqual(['b', 'f', 'e', 'd', 'c']);
  });

  it('name the venture the same way everywhere: Founder Tools, then the profile, then the sample', () => {
    expect(ventureName()).toBe('');
    writeProfileLocal({ company: 'Local Co' });
    expect(ventureName()).toBe('Local Co');
    expect(ventureName('Profile Co')).toBe('Profile Co');
    startupRecord.write({ name: '  Renamed Co ' });
    expect(ventureName('Profile Co')).toBe('Renamed Co');
  });

  it('use the sample venture in the sample account', () => {
    localStorage.setItem('demo_mode', 'true');
    expect(ventureName()).toBe(DEMO_VENTURE.name);
    expect(ventureSummary()).toEqual({ oneLiner: DEMO_VENTURE.oneLiner, readinessScore: DEMO_VENTURE.readinessScore });
  });

  it('re-render when the record changes from anywhere', () => {
    const { result } = renderHook(() => ({ startup: useEntity(startupRecord), name: useVentureName('Profile Co') }));
    expect(result.current.name).toBe('Profile Co');
    act(() => { startupRecord.write({ name: 'From the assistant' }); });
    expect(result.current.startup.name).toBe('From the assistant');
    expect(result.current.name).toBe('From the assistant');
  });
});
