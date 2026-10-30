// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { storeChoice } from './outreachStore';

describe('outreach store choice', () => {
  it('uses Firestore on Cloud Run and files elsewhere, unless told', () => {
    expect(storeChoice({})).toBe('file');
    expect(storeChoice({ K_SERVICE: 'cofounderbay' })).toBe('firestore');
    expect(storeChoice({ K_SERVICE: 'cofounderbay', OUTREACH_STORE: 'file' })).toBe('file');
    expect(storeChoice({ OUTREACH_STORE: ' Firestore ' })).toBe('firestore');
    expect(storeChoice({ OUTREACH_STORE: 'memory' })).toBe('memory');
    expect(storeChoice({ OUTREACH_STORE: 'mongo' })).toBe('file');
  });
});
