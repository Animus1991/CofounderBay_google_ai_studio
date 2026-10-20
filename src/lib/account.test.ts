import { beforeEach, describe, expect, it, vi } from 'vitest';
import { persistAccount } from './account';
import { setDoc } from 'firebase/firestore';

vi.mock('../firebase', () => ({
  auth: { currentUser: null },
  db: {},
}));
vi.mock('firebase/firestore', async (importOriginal) => {
  const original = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...original,
    doc: vi.fn((_db: unknown, col: string, id: string) => ({ col, id })),
    setDoc: vi.fn(() => Promise.resolve()),
    serverTimestamp: vi.fn(() => 'ts'),
    deleteField: vi.fn(() => 'DELETE_FIELD'),
  };
});
vi.mock('firebase/auth', async (importOriginal) => {
  const original = await importOriginal<typeof import('firebase/auth')>();
  return { ...original, updateProfile: vi.fn(() => Promise.resolve()) };
});
vi.mock('./cloudSync', () => ({ flushCloudSync: vi.fn(() => Promise.resolve()) }));

beforeEach(() => {
  vi.mocked(setDoc).mockClear();
});

describe('persistAccount', () => {
  it('clears a link the form emptied instead of keeping the old one', async () => {
    await persistAccount('u1', { bio: 'hi', linkedin: '', github: '', website: '' });
    const profileCall = vi.mocked(setDoc).mock.calls.find(([ref]) => (ref as { col?: string }).col === 'profiles');
    expect(profileCall).toBeTruthy();
    const patch = profileCall?.[1] as Record<string, unknown>;
    expect(patch.socialLinks).toEqual({});
    expect(patch.linkedinUrl).toBe('DELETE_FIELD');
    expect(patch.githubUrl).toBe('DELETE_FIELD');
  });

  it('keeps a protocol-prefixed link when one is given', async () => {
    await persistAccount('u1', { bio: 'hi', linkedin: 'linkedin.com/in/x', github: '', website: '' });
    const profileCall = vi.mocked(setDoc).mock.calls.find(([ref]) => (ref as { col?: string }).col === 'profiles');
    const patch = profileCall?.[1] as Record<string, unknown>;
    expect(patch.socialLinks).toEqual({ linkedin: 'https://linkedin.com/in/x' });
    expect(patch.linkedinUrl).toBe('https://linkedin.com/in/x');
    expect(patch.githubUrl).toBe('DELETE_FIELD');
  });
});
