import { describe, expect, it } from 'vitest';
import type { NeedCard, Round } from './localLists';
import { cardTime, equityRange, localNeedToWallItem, myVentureFrom, needFits, wallCards } from './studioData';
import { NEED_CARD_ITEMS } from '../data/studioCatalog';

const round: Round = {
  name: '',
  instrument: 'SAFE',
  targetAmount: 0,
  committedAmount: 0,
  valuationCap: 0,
  discountPct: 0,
  cashOnHand: 0,
  monthlyBurn: 0,
  closeDate: '',
  updatedAt: '',
  pipeline: [],
};

describe('studio data shaping', () => {
  it.each([
    [['35% - 45%', '30% - 45%', '30% - 40% + Salary'], '30–45%'],
    [['35%'], '35%'],
    [['negotiable'], '—'],
    [[], '—'],
  ])('computes an honest equity range', (values, expected) => {
    expect(equityRange(values)).toBe(expected);
  });

  it('keeps sample wall cards out of real accounts', () => {
    expect(wallCards([], 'Mine', false)).toEqual([]);
    expect(wallCards([], 'Mine', true).length).toBeGreaterThan(0);
  });

  it('does not invent missing legacy need fields', () => {
    const need: NeedCard = { id: 'mine', exists: '', outcome: '', missing: 'Designer', status: 'open', at: '2026-01-01' };
    expect(localNeedToWallItem(need, 'Mine')).toMatchObject({
      location: undefined,
      stage: undefined,
      commitment: undefined,
      equityOffered: '',
      applicantCount: 0,
      own: true,
    });
  });

  it('passes the new need fields through', () => {
    const need: NeedCard = {
      id: 'mine',
      exists: '',
      outcome: 'Ship onboarding',
      missing: 'Engineer',
      offer: '20%',
      status: 'open',
      at: '2026-01-01',
      category: 'Engineering',
      stage: 'Prototype / MVP',
      commitment: 'Full-Time',
      location: 'Athens',
      remote: true,
      skills: ['React'],
    };
    expect(localNeedToWallItem(need, 'Mine')).toMatchObject({
      outcome: 'Ship onboarding',
      location: 'Athens',
      stage: 'Prototype / MVP',
      commitment: 'Full-Time',
      isRemote: true,
      skills: ['React'],
    });
  });

  it('writes the card description in the reader’s language', () => {
    const need: NeedCard = { id: 'mine', exists: 'A prototype', outcome: 'Ship it', missing: 'Engineer', status: 'open', at: '2026-01-01' };
    expect(localNeedToWallItem(need, 'Mine', 'el').description).toBe('Τι υπάρχει: A prototype. Στόχος: Ship it.');
    expect(localNeedToWallItem(need, 'Mine').description).toBe('What exists: A prototype. Target outcome: Ship it.');
  });

  it('finds open cards that ask for a skill the viewer has, by whole skill names or parts', () => {
    const fits = needFits(NEED_CARD_ITEMS, ['React', 'TypeScript', 'Node.js', 'IoT']);
    expect(fits.map((row) => row.card.id)).toEqual(['need-1', 'need-3']);
    expect(fits[0]?.matched).toEqual(['TypeScript', 'React']);
    // "Go" must not match "Google" or "Growth"; parts match ("Next.js" in "React / Next.js").
    expect(needFits([{ ...NEED_CARD_ITEMS[1]!, skills: ['Growth', 'Google Ads'] }], ['Go'])).toEqual([]);
    expect(needFits([{ ...NEED_CARD_ITEMS[0]!, skills: ['React / Next.js'] }], ['next.js'])).toHaveLength(1);
    // Own and filled cards never alert.
    expect(needFits([{ ...NEED_CARD_ITEMS[0]!, own: true }], ['React'])).toEqual([]);
    expect(needFits([{ ...NEED_CARD_ITEMS[0]!, status: 'filled' }], ['React'])).toEqual([]);
    expect(needFits(NEED_CARD_ITEMS, [])).toEqual([]);
  });

  it('turns relative and dated card ages into times', () => {
    const now = Date.parse('2026-03-01T12:00:00.000Z');
    expect(cardTime('2h ago', now)).toBe('2026-03-01T10:00:00.000Z');
    expect(cardTime('1d ago', now)).toBe('2026-02-28T12:00:00.000Z');
    expect(cardTime('2026-01-05', now)).toBe('2026-01-05T00:00:00.000Z');
    expect(cardTime('', now)).toBe('2026-03-01T12:00:00.000Z');
  });

  it('does not invent venture metrics on an empty real account', () => {
    const venture = myVentureFrom({
      name: '',
      oneLiner: '',
      description: '',
      industry: '',
      location: '',
      openNeeds: [],
      round,
      readiness: 0,
      founderName: '',
      founderAvatar: '',
      pitch: {},
      canvas: {},
    });
    expect(JSON.stringify(venture)).not.toMatch(/450,000|1,500,000|CleanTech & AI|3 Founders/);
    expect(venture.verified).toBe(false);
    expect(Object.values(venture.pitchDeck ?? {})).toEqual(['', '', '', '', '', '']);
  });
});
