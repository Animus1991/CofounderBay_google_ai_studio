// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { fileStore, memoryStore } from './store';
import { storeContract } from './store.contract';

storeContract('memory', async () => ({ store: memoryStore() }));

storeContract('file', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'outreach-contract-'));
  const store = fileStore(dir, 0);
  return { store, close: async () => { store.flush(); rmSync(dir, { recursive: true, force: true }); } };
});

describe('file store on disk', () => {
  const dirs: string[] = [];
  const freshDir = () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'outreach-file-'));
    dirs.push(dir);
    return dir;
  };
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('survives a restart', async () => {
    const dir = freshDir();
    const first = fileStore(dir, 0);
    await first.insert('ddShares', { token: 't1', owner: 'uid:a', revoked: false }, { id: 't1' });
    await first.put('digestSettings', 'uid:a', { owner: 'uid:a', hour: 9 });
    first.flush();
    const second = fileStore(dir, 0);
    expect(await second.get('ddShares', 't1')).toMatchObject({ owner: 'uid:a' });
    expect(await second.get('digestSettings', 'uid:a')).toEqual({ owner: 'uid:a', hour: 9 });
    expect(JSON.parse(readFileSync(path.join(dir, 'ddShares.json'), 'utf8'))).toHaveProperty('t1');
  });

  it('reads the first version’s plain lists', async () => {
    const dir = freshDir();
    writeFileSync(path.join(dir, 'emailLog.json'), JSON.stringify([{ owner: 'uid:a', at: '1' }, { owner: 'uid:b', at: '2' }]));
    const store = fileStore(dir, 0);
    expect(await store.find('emailLog', { owner: 'uid:a' })).toEqual([{ owner: 'uid:a', at: '1' }]);
  });

  it('logs a failed save instead of crashing the server', async () => {
    const dir = freshDir();
    const problems: string[] = [];
    const store = fileStore(dir, 0, (message) => problems.push(message));
    await store.put('digestSettings', 'uid:a', { owner: 'uid:a' });
    rmSync(dir, { recursive: true, force: true });
    store.flush();
    expect(problems).toEqual(['outreach store: could not save digestSettings']);
    expect(await store.get('digestSettings', 'uid:a')).toEqual({ owner: 'uid:a' });
  });
});
