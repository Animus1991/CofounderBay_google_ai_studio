import { beforeEach, describe, expect, it } from 'vitest';
import { keys, resetAllLists, setDataScope, writeRound, writeValue } from './localLists';
import { draftPitch, effectivePitch, pitchMarkdown, readPitch, slideStatus, writePitchSlide } from './pitch';
import { FOUNDER_TEMPLATES } from '../data/templates';

beforeEach(() => {
  setDataScope('pitch-fixture');
  resetAllLists();
  try { localStorage.setItem('demo_mode', 'false'); } catch { /* non-DOM env */ }
});

describe('pitch deck data', () => {
  it('computes status from the slide text instead of a fixed label', () => {
    expect(slideStatus(undefined)).toBe('pending');
    expect(slideStatus('  ')).toBe('pending');
    expect(slideStatus('Short start')).toBe('in-progress');
    expect(slideStatus('x'.repeat(60))).toBe('complete');
  });

  it('stores slide text in the pitch list Insights reads, and clears empty slides', () => {
    writePitchSlide('problem', 'Founders waste weeks finding a co-founder.');
    expect(readPitch().problem).toMatch(/Founders waste weeks/);
    writePitchSlide('problem', '   ');
    expect(readPitch().problem).toBeUndefined();
  });

  it('drafts slides from the canvas, venture and round — and never invents numbers', () => {
    writeValue(keys.canvas, { problem: 'Cross-border B2B settlement takes days.', solution: 'Settlement in one click.' });
    writeValue(keys.startup, { name: 'AegeanFlow', oneLiner: 'Instant B2B settlement' });
    writeRound({ targetAmount: 1_500_000, committedAmount: 300_000, instrument: 'SAFE', valuationCap: 12_000_000, monthlyBurn: 20_000 });
    const draft = draftPitch();
    expect(draft.cover).toBe('AegeanFlow Instant B2B settlement');
    expect(draft.problem).toMatch(/Cross-border B2B settlement/);
    expect(draft.solution).toMatch(/Settlement in one click/);
    expect(draft.ask).toMatch(/\$1\.5M on a SAFE \(\$12M cap\)/);
    expect(draft.ask).toMatch(/\$300k of \$1\.5M committed/);
    expect(draft.team).toBe('');
  });

  it('shows the founder’s own slides on a real account, not the draft', () => {
    writeValue(keys.canvas, { problem: 'Drafted problem' });
    expect(effectivePitch()).toEqual({});
    writePitchSlide('cover', 'My cover');
    expect(effectivePitch()).toEqual({ cover: 'My cover' });
  });

  it('exports every slide, marking the empty ones', () => {
    const md = pitchMarkdown({ cover: 'AegeanFlow' }, 'en', 'AegeanFlow');
    expect(md).toMatch(/^# AegeanFlow/);
    expect(md).toMatch(/## 1\. Cover & Hook\n\nAegeanFlow/);
    expect(md).toMatch(/## 8\. Ask & Use of Funds\n\n_\(empty/);
    expect(pitchMarkdown({}, 'el', 'X')).toMatch(/## 2\. Πρόβλημα/);
  });
});

describe('founder templates', () => {
  it('build a real document or spreadsheet in both languages', () => {
    for (const template of FOUNDER_TEMPLATES) {
      for (const lang of ['en', 'el'] as const) {
        const built = template.build(lang);
        if (template.format === 'csv') {
          expect(built.rows?.length, template.name.en).toBeGreaterThan(5);
        } else {
          expect(built.markdown?.startsWith('# '), template.name.en).toBe(true);
          expect((built.markdown ?? '').length, template.name.en).toBeGreaterThan(120);
        }
      }
    }
  });

  it('marks legal outlines as not legal advice', () => {
    for (const template of FOUNDER_TEMPLATES.filter((item) => item.category === 'Legal' || item.category === 'HR')) {
      expect(template.build('en').markdown).toMatch(/not legal advice/);
      expect(template.build('el').markdown).toMatch(/όχι νομική συμβουλή/);
    }
  });

  it('starts the financial model from the founder’s own cash and burn', () => {
    writeRound({ cashOnHand: 240_000, monthlyBurn: 20_000 });
    const rows = FOUNDER_TEMPLATES.find((item) => item.format === 'csv')!.build('en').rows!;
    expect(rows[0]).toContain('Cash');
    expect(rows[1]).toContain(14_000);
    expect(rows[1]).toContain(6_000);
    expect(rows[1]).toContain('=240000-H2');
    expect(rows[12]?.[0]).toBe(12);
  });
});
