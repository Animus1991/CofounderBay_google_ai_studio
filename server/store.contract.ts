/**
 * What every outreach store must do, run against each backend: the memory and
 * file stores in `npm test`, Firestore against the emulator in CI
 * (server/firestoreStore.test.ts). Not a test file itself.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StoreConflict, type Store } from './store';

export function storeContract(label: string, open: () => Promise<{ store: Store; close?: () => Promise<void> }>) {
  describe(`${label} store`, () => {
    let store: Store;
    let close: (() => Promise<void>) | undefined;
    beforeEach(async () => {
      ({ store, close } = await open());
    });
    afterEach(async () => {
      await close?.();
    });

    it('puts and gets by id, and a missing id is null', async () => {
      await store.put('settings', 'uid:ada', { owner: 'uid:ada', hour: 9 });
      expect(await store.get('settings', 'uid:ada')).toEqual({ owner: 'uid:ada', hour: 9 });
      await store.put('settings', 'uid:ada', { owner: 'uid:ada', hour: 10 });
      expect(await store.get('settings', 'uid:ada')).toEqual({ owner: 'uid:ada', hour: 10 });
      expect(await store.get('settings', 'uid:nobody')).toBeNull();
    });

    it('keeps ids with slashes and dots apart', async () => {
      await store.put('settings', 'ip:10.0.0.1', { owner: 'a' });
      await store.put('settings', 'odd/id', { owner: 'b' });
      expect(await store.get('settings', 'ip:10.0.0.1')).toEqual({ owner: 'a' });
      expect(await store.get('settings', 'odd/id')).toEqual({ owner: 'b' });
    });

    it('finds by equality on every listed field; a missing field is not null', async () => {
      await store.insert('log', { owner: 'a', investorId: 'inv_1', at: '1' });
      await store.insert('log', { owner: 'a', investorId: null, at: '2' });
      await store.insert('log', { owner: 'a', at: '3' });
      await store.insert('log', { owner: 'b', investorId: 'inv_1', at: '4' });
      const at = (docs: Array<{ at?: unknown }>) => docs.map((doc) => doc.at).sort();
      expect(at(await store.find('log', { owner: 'a' }))).toEqual(['1', '2', '3']);
      expect(at(await store.find('log', { owner: 'a', investorId: 'inv_1' }))).toEqual(['1']);
      expect(at(await store.find('log', { owner: 'a', investorId: null }))).toEqual(['2']);
      expect(at(await store.find('log'))).toEqual(['1', '2', '3', '4']);
      expect(await store.find('nothing-here')).toEqual([]);
    });

    it('drops undefined fields, as a database would', async () => {
      const saved = await store.insert('log', { owner: 'a', note: undefined, at: '1' });
      expect(saved).toEqual({ owner: 'a', at: '1' });
      const [found] = await store.find<Record<string, unknown>>('log', { owner: 'a' });
      expect(found).not.toHaveProperty('note');
    });

    it('refuses a second insert under the same id', async () => {
      await store.insert('shares', { token: 't1' }, { id: 't1' });
      await expect(store.insert('shares', { token: 't1' }, { id: 't1' })).rejects.toBeInstanceOf(StoreConflict);
      expect(await store.find('shares', { token: 't1' })).toHaveLength(1);
    });

    it('keeps only the newest documents per owner when asked', async () => {
      const keep = { by: 'owner', order: 'at', max: 3 };
      for (const at of ['2026-01-01', '2026-01-03', '2026-01-02', '2026-01-05', '2026-01-04']) await store.insert('runs', { owner: 'a', at }, { keep });
      await store.insert('runs', { owner: 'b', at: '2025-12-31' }, { keep });
      expect((await store.find<{ at: string }>('runs', { owner: 'a' })).map((doc) => doc.at).sort()).toEqual(['2026-01-03', '2026-01-04', '2026-01-05']);
      expect(await store.find('runs', { owner: 'b' })).toHaveLength(1);
    });

    it('updates every match from its current value and leaves the rest', async () => {
      await store.insert('shares', { token: 't1', owner: 'a', views: 0, revoked: false }, { id: 't1' });
      await store.insert('shares', { token: 't2', owner: 'a', views: 5, revoked: true }, { id: 't2' });
      const [first] = await store.update<{ views: number }>('shares', { token: 't1', revoked: false }, (doc) => ({ views: doc.views + 1 }));
      expect(first).toMatchObject({ token: 't1', views: 1 });
      await store.update<{ views: number }>('shares', { token: 't1', revoked: false }, (doc) => ({ views: doc.views + 1 }));
      expect(await store.get('shares', 't1')).toMatchObject({ views: 2 });
      expect(await store.update('shares', { token: 't2', revoked: false }, () => ({ views: 99 }))).toEqual([]);
      expect(await store.get('shares', 't2')).toMatchObject({ views: 5 });
    });

    it('counts concurrent updates of one document without losing any', async () => {
      await store.insert('shares', { token: 't1', views: 0 }, { id: 't1' });
      await Promise.all(Array.from({ length: 5 }, () => store.update<{ views: number }>('shares', { token: 't1' }, (doc) => ({ views: doc.views + 1 }))));
      expect(await store.get('shares', 't1')).toMatchObject({ views: 5 });
    });

    it('removes matches and says how many', async () => {
      for (const part of [0, 1, 2]) await store.insert('files', { token: 't1', part });
      await store.insert('files', { token: 't2', part: 0 });
      expect(await store.remove('files', { token: 't1' })).toBe(3);
      expect(await store.remove('files', { token: 't1' })).toBe(0);
      expect(await store.find('files')).toHaveLength(1);
    });

    it('never updates or removes a whole collection by accident', async () => {
      await expect(store.update('files', {}, () => ({}))).rejects.toThrow(/at least one field/);
      await expect(store.remove('files', {})).rejects.toThrow(/at least one field/);
    });

    it('hands back copies, not its own documents', async () => {
      await store.put('settings', 'x', { owner: 'x', tags: ['a'] });
      const copy = await store.get<{ tags: string[] }>('settings', 'x');
      copy!.tags.push('b');
      expect(await store.get('settings', 'x')).toEqual({ owner: 'x', tags: ['a'] });
    });
  });
}
