import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkShareOpens, splitDraft } from './outreach';
import { readActivity } from './localLists';

describe('outreach helpers', () => {
  beforeEach(() => { localStorage.clear(); vi.unstubAllGlobals(); });

  it('splits an assistant draft into subject and body', () => {
    expect(splitDraft('Subject: Next steps\n\nHi Naval,\nThanks.')).toEqual({ subject: 'Next steps', body: 'Hi Naval,\nThanks.' });
    expect(splitDraft('Just a body')).toEqual({ subject: '', body: 'Just a body' });
  });

  it('turns new share-link opens into activity, but not the first sighting', async () => {
    let views = 2;
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([{ token: 't1', investorName: 'Sequoia Capital', views }]), { status: 200 })));
    expect(await checkShareOpens()).toEqual([]);
    views = 3;
    expect(await checkShareOpens()).toEqual([{ name: 'Sequoia Capital', views: 1 }]);
    expect(readActivity()[0]?.title).toBe('Sequoia Capital opened your due-diligence link');
    expect(await checkShareOpens()).toEqual([]);
  });
});
