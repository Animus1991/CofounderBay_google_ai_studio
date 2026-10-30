import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runAssistant } from './assistantOps';
import { respond } from '../ai/engine';
import { readDD, ddProgress } from '../lib/dueDiligence';
import { writeRound } from '../lib/localLists';
import { overdueInvestors } from './investorOps';

const demo = { fullName: 'Demo User', headline: 'Founder', skills: ['React'] } as never;
const options = { lang: 'en' as const, page: { href: '/assistant', en: 'AI Studio', el: 'AI Studio' } };

function seed() {
  writeRound({
    pipeline: [
      { investorId: 'inv_1', name: 'Sequoia Capital', stage: 'Due Diligence', notes: 'Asked for pilot data.', updatedAt: '2026-01-01T00:00:00Z', nextStep: 'Share the data room', nextDate: '2020-01-01' },
      { investorId: 'inv_2', name: 'Naval Ravikant', stage: 'Meeting', notes: '', updatedAt: '2026-01-01T00:00:00Z', nextDate: '2999-01-01' },
    ],
  });
}

describe('due diligence through the assistant', () => {
  beforeEach(() => { localStorage.clear(); seed(); });

  it('reads the tracker', () => {
    const result = runAssistant('What is still open in due diligence?', demo);
    expect(result.tool).toBe('dd');
    expect(result.en).toMatch(/Due diligence: \d+\/12 ready/);
  });

  it('sets an item only after Confirm, with exact undo', async () => {
    const before = ddProgress().done;
    const result = runAssistant('Mark the financial model done in due diligence', demo, { propose: true });
    expect(result.tool).toBe('dd-set');
    expect(ddProgress().done).toBe(before);
    await result.proposal!.apply();
    expect(readDD().find((item) => item.id === 'dd-model')?.status).toBe('done');
    await result.proposal!.undo!();
    expect(ddProgress().done).toBe(before);
  });

  it('supports the slash form and does not steal legal commands', () => {
    expect(runAssistant('/dd progress gdpr', demo, { propose: true }).tool).toBe('dd-set');
    expect(runAssistant('Mark EIN done', demo, { propose: true }).tool).toBe('legal-check');
  });

  it('creates a share link on Confirm and revokes it on Undo', async () => {
    const calls: { url: string; method: string }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method ?? 'GET' });
      return new Response(JSON.stringify({ token: 'tok123', investorName: 'Sequoia Capital', done: 4, total: 12 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));
    const result = runAssistant('Share due diligence with Sequoia Capital', demo, { propose: true });
    expect(result.tool).toBe('dd-share');
    expect(calls).toHaveLength(0);
    const applied = await result.proposal!.apply();
    expect(applied.en).toContain('/dd/tok123');
    await result.proposal!.undo!();
    expect(calls.map((c) => c.method)).toEqual(['POST', 'DELETE']);
    vi.unstubAllGlobals();
  });
});

describe('investor follow-up emails', () => {
  beforeEach(() => { localStorage.clear(); seed(); });

  it('drafts a stage-aware template offline', async () => {
    const result = await respond('Draft a follow-up email to Sequoia', demo, { ...options, writer: async () => { throw new Error('down'); } });
    expect(result.tool).toBe('investor-email');
    expect(result.origin).toBe('router');
    expect(result.en).toMatch(/^Subject: Due-diligence materials/);
    expect(result.en).toContain('Share the data room');
  });

  it('lets the model rewrite the email from the same facts', async () => {
    let facts = '';
    const result = await respond('/investor email Naval', demo, {
      ...options,
      writer: async (prompt) => { facts = prompt; return { subject: 'Next steps', body: 'Hi Naval, thanks for the meeting — here is the per-building cost model you asked about. Best, Demo' }; },
    });
    expect(facts).toContain('Investor: Naval Ravikant (stage Meeting');
    expect(result.origin).toBe('model-answer');
    expect(result.en.startsWith('Subject: Next steps')).toBe(true);
  });
});

describe('overdue investor alerts', () => {
  beforeEach(() => { localStorage.clear(); seed(); });

  it('lists only active investors past their next-step date', () => {
    expect(overdueInvestors().map((item) => item.name)).toEqual(['Sequoia Capital']);
  });
});
