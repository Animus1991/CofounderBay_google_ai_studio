import { NEED_CARD_ITEMS } from '../data/studioCatalog';
import { formatMoney } from './equity';
import type { NeedCardItem, StartupStage, StartupVenture } from '../types';
import type { NeedCard, Round } from './localLists';
import type { PitchContent } from './pitch';

export function equityRange(values: string[]): string {
  const numbers = values.flatMap((value) => [...value.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map((match) => Number(match[1])));
  if (!numbers.length) return '—';
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  return min === max ? `${min}%` : `${min}–${max}%`;
}

const skillParts = (value: string) => value.toLowerCase().split(/[/,·•&+]+/).map((part) => part.trim()).filter(Boolean);

/**
 * Open cards (not the founder's own) that ask for a skill the viewer has — what the
 * "Alert me about matching cards" switch surfaces in Notifications. Matches whole
 * skill names or their parts ("React" ↔ "React / Next.js"), never substrings of words.
 */
export function needFits(cards: NeedCardItem[], skills: string[]): { card: NeedCardItem; matched: string[] }[] {
  const mine = new Set(skills.flatMap(skillParts));
  if (!mine.size) return [];
  return cards
    .filter((card) => !card.own && card.status !== 'filled')
    .map((card) => ({ card, matched: card.skills.filter((skill) => skillParts(skill).some((part) => mine.has(part))) }))
    .filter((row) => row.matched.length > 0);
}

/** "2h ago" / "1d ago" / "2026-01-05" → an ISO time, so sample cards sort like real ones. */
export function cardTime(createdAt: string, now = Date.now()): string {
  const relative = /^(\d+)\s*([mhd])\s*ago$/i.exec(createdAt.trim());
  if (relative) {
    const letter = (relative[2] ?? 'd').toLowerCase();
    const unit = letter === 'm' ? 60_000 : letter === 'h' ? 3_600_000 : 86_400_000;
    return new Date(now - Number(relative[1]) * unit).toISOString();
  }
  const parsed = Date.parse(createdAt);
  return new Date(Number.isNaN(parsed) ? now : parsed).toISOString();
}

export function localNeedToWallItem(card: NeedCard, ventureName: string, lang: 'en' | 'el' = 'en'): NeedCardItem {
  const existsLabel = lang === 'el' ? 'Τι υπάρχει' : 'What exists';
  const outcomeLabel = lang === 'el' ? 'Στόχος' : 'Target outcome';
  const missingLower = (card.missing || '').toLowerCase();
  const category: NeedCardItem['category'] = card.category ??
    (/cto|engineer|tech|dev|rust|ai|ml|react|node/.test(missingLower)
      ? 'Engineering'
      : /growth|sales|gtm|marketing|commercial/.test(missingLower)
        ? 'Growth & GTM'
        : /design|product|ux/.test(missingLower)
          ? 'Product'
          : /mentor|advisor/.test(missingLower)
            ? 'Advisory'
            : 'Operations');
  return {
    id: card.id,
    title: card.missing || 'Co-Founder / Key Partner',
    description: `${card.exists ? `${existsLabel}: ${card.exists}. ` : ''}${card.outcome ? `${outcomeLabel}: ${card.outcome}.` : ''}`.trim() || card.missing,
    ventureName,
    category,
    location: card.location,
    isRemote: card.remote,
    stage: card.stage,
    commitment: card.commitment,
    equityOffered: card.offer || '',
    skills: card.skills ?? [],
    applicantCount: 0,
    createdAt: card.at ? card.at.slice(0, 10) : '',
    status: card.status === 'closed' ? 'filled' : 'active',
    own: true,
    outcome: card.outcome,
  };
}

export function wallCards(localNeeds: NeedCard[], ventureName: string, isDemo: boolean, lang: 'en' | 'el' = 'en'): NeedCardItem[] {
  const local = localNeeds.map((card) => localNeedToWallItem(card, ventureName, lang));
  if (!isDemo) return local;
  const ids = new Set(local.map((card) => card.id));
  return [...local, ...NEED_CARD_ITEMS.filter((card) => !ids.has(card.id))];
}

export function myVentureFrom(input: {
  name: string;
  oneLiner: string;
  description: string;
  industry: string;
  stage?: StartupStage;
  location: string;
  openNeeds: NeedCard[];
  round: Round;
  readiness: number;
  founderName: string;
  founderAvatar: string;
  /** The venture's own mark; the founder's portrait is used when there is none. */
  logo?: string;
  pitch: PitchContent;
  canvas: Record<string, string>;
}): StartupVenture {
  const offers = input.openNeeds.filter((need) => need.status === 'open').map((need) => need.offer || '');
  // Compact money ("$450k of $1.5M"), the same format as Fundraising and the assistant, whatever the browser locale.
  const burn = input.round.monthlyBurn > 0 ? ` · Burn ${formatMoney(input.round.monthlyBurn)}/mo` : '';
  const fundingRaised = input.round.targetAmount > 0
    ? `${formatMoney(input.round.committedAmount)} of ${formatMoney(input.round.targetAmount)} (${input.round.instrument})`
    : '';
  return {
    id: 'sv-my-venture',
    name: input.name,
    logo: input.logo || input.founderAvatar,
    tagline: input.oneLiner,
    description: input.description,
    industry: input.industry,
    stage: input.stage ?? ('' as StartupStage),
    location: input.location,
    openRoles: input.openNeeds.filter((need) => need.status === 'open').map((need) => need.missing).filter(Boolean),
    equityOffer: equityRange(offers) === '—' ? '' : equityRange(offers),
    fundingRaised,
    teamSize: '',
    founderName: input.founderName,
    founderAvatar: input.founderAvatar,
    tractionMetric: `Readiness ${input.readiness}/100${burn}`,
    verified: false,
    applicationsCount: 0,
    pitchDeck: {
      problem: input.pitch.problem || input.canvas.problem || '',
      solution: input.pitch.solution || input.canvas.solution || input.oneLiner || '',
      marketSize: input.pitch.market || '',
      businessModel: input.pitch.model || '',
      tractionDetails: input.pitch.traction || '',
      useOfFunds: input.pitch.ask || '',
    },
  };
}
