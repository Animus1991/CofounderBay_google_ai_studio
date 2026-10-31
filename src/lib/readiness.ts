/**
 * The Venture Readiness Index — one definition for Founder Tools, Insights,
 * the profile and the assistant.
 *
 * Before this module "readiness" meant three different numbers: Founder Tools
 * scored three diagnostic answers (and counted an unanswered question as 0),
 * Insights showed profile completeness under the same name, and the assistant
 * read whatever snapshot Founder Tools had last stored while promising a
 * "5-step diagnostic" that had three steps.
 *
 * Now there are five dimensions, each scored 0–100 from what the founder
 * reported in the diagnostic *and* from evidence the studio already holds:
 *
 *   Team Composition    0.25  diagnostic + the four team areas the skills cover (lib/teamGaps)
 *   Market Validation   0.20  diagnostic (customer conversations)
 *   Product/Tech        0.20  diagnostic (state of the product)
 *   Financial Planning  0.20  diagnostic + how much of the round is filled in (target, cash, burn, terms)
 *   Pitch Readiness     0.15  diagnostic + how much of the 8-slide deck is written (lib/pitch)
 *
 * Weights follow what early-stage investors say drives their decisions: the
 * team is cited first, ahead of product, market and business model (Gompers,
 * Gornall, Kaplan & Strebulaev, "How do venture capitalists make decisions?",
 * Journal of Financial Economics, 2020). Where both a self-report and evidence
 * exist they are averaged; where only one exists it is used; a dimension with
 * neither is left out and the remaining weights are rescaled — the same rule
 * as the compatibility score, so a gap never silently counts as zero. The
 * result carries its `coverage` so the UI can say how much it stands on.
 */
import { PITCH_SLIDES, effectivePitch, slideStatus, type PitchContent } from './pitch';
import { teamGaps } from './teamGaps';
import { isDemoData, keys, readProfileLocal, readRound, type Round } from './localLists';
import { startupRecord } from './entities';
import { useStored } from './useStored';

export type Bilingual = { en: string; el: string };

export type ReadinessKey = 'Team Composition' | 'Market Validation' | 'Product/Tech' | 'Financial Planning' | 'Pitch Readiness';

export const READINESS_DIMENSIONS: readonly { key: ReadinessKey; weight: number; label: Bilingual; next: Bilingual; href: string }[] = [
  {
    key: 'Team Composition',
    weight: 0.25,
    label: { en: 'Team Composition', el: 'Σύνθεση ομάδας' },
    next: { en: 'Find a co-founder who covers what the team lacks.', el: 'Βρες συνιδρυτή που καλύπτει ό,τι λείπει από την ομάδα.' },
    href: '/matches',
  },
  {
    key: 'Market Validation',
    weight: 0.2,
    label: { en: 'Market Validation', el: 'Επικύρωση αγοράς' },
    next: { en: 'Add one customer conversation this week.', el: 'Πρόσθεσε μία συζήτηση με πελάτη αυτή την εβδομάδα.' },
    href: '/founder-tools?step=3',
  },
  {
    key: 'Product/Tech',
    weight: 0.2,
    label: { en: 'Product/Tech', el: 'Προϊόν/τεχνολογία' },
    next: { en: 'Ship the next milestone on Workspace.', el: 'Παράδωσε το επόμενο ορόσημο στον χώρο εργασίας.' },
    href: '/milestones',
  },
  {
    key: 'Financial Planning',
    weight: 0.2,
    label: { en: 'Financial Planning', el: 'Οικονομικός σχεδιασμός' },
    next: { en: 'Fill in your round: target, cash on hand and monthly burn.', el: 'Συμπλήρωσε τον γύρο: στόχο, διαθέσιμα μετρητά και μηνιαίο burn.' },
    href: '/fundraising',
  },
  {
    key: 'Pitch Readiness',
    weight: 0.15,
    label: { en: 'Pitch Readiness', el: 'Ετοιμότητα pitch' },
    next: { en: 'Write the empty slides of your pitch deck.', el: 'Γράψε τις κενές διαφάνειες του pitch deck.' },
    href: '/founder-tools?tab=pitch',
  },
];

export type ReadinessBasis = 'diagnostic' | 'evidence' | 'both';

export type ReadinessDimension = {
  key: ReadinessKey;
  label: Bilingual;
  weight: number;
  score: number | null;
  basis: ReadinessBasis | null;
  /** What the evidence part says ("Covers 2 of 4 team areas"), when there is evidence. */
  evidence: Bilingual | null;
  next: Bilingual;
  href: string;
};

export type ReadinessStatus = 'Planned' | 'Critical' | 'In-Progress' | 'Strong';

export type Readiness = {
  /** Weighted mean of the scored dimensions, 0–100 (0 when nothing is scored). */
  score: number;
  dimensions: ReadinessDimension[];
  /** Share of the total weight that has a score. */
  coverage: number;
  known: number;
  /** The lowest scored dimension — the best next thing to work on. */
  weakest: ReadinessDimension | null;
};

export type ReadinessEvidence = {
  /** Diagnostic answers per dimension, 0–100 (Founder Tools → Readiness diagnostic). */
  assessed?: Partial<Record<string, number>>;
  /** The founder's (and team's) skills. */
  skills?: readonly string[];
  /** The pitch deck text per slide. */
  pitch?: PitchContent;
  /** The fundraising round. */
  round?: Pick<Round, 'targetAmount' | 'cashOnHand' | 'monthlyBurn' | 'valuationCap'> | null;
};

export function readinessStatus(score: number | null | undefined): ReadinessStatus {
  if (score == null) return 'Planned';
  if (score < 40) return 'Critical';
  if (score < 70) return 'In-Progress';
  return 'Strong';
}

const clampScore = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : null;

function blend(assessed: number | null, evidence: number | null): { score: number | null; basis: ReadinessBasis | null } {
  if (assessed != null && evidence != null) return { score: Math.round((assessed + evidence) / 2), basis: 'both' };
  if (assessed != null) return { score: assessed, basis: 'diagnostic' };
  if (evidence != null) return { score: evidence, basis: 'evidence' };
  return { score: null, basis: null };
}

/** Team areas the skills cover (build, design, market, operate), as 0–100; null without skills. */
export function teamEvidence(skills: readonly string[] | undefined): { score: number; covered: number } | null {
  const list = (skills ?? []).filter((item) => typeof item === 'string' && item.trim());
  if (list.length === 0) return null;
  const { covered } = teamGaps(list);
  return { score: Math.round((covered.length / 4) * 100), covered: covered.length };
}

/** Written slides as 0–100: a complete slide counts 1, a started one ½; null when nothing is written. */
export function pitchEvidence(pitch: PitchContent | undefined): { score: number; complete: number; started: number } | null {
  if (!pitch) return null;
  let complete = 0;
  let started = 0;
  for (const slide of PITCH_SLIDES) {
    const status = slideStatus(pitch[slide.key]);
    if (status === 'complete') complete += 1;
    else if (status === 'in-progress') started += 1;
  }
  if (complete + started === 0) return null;
  return { score: Math.round(((complete + started / 2) / PITCH_SLIDES.length) * 100), complete, started };
}

/** How much of the round's planning numbers are filled in, as 0–100; null with an empty round. */
export function financeEvidence(round: ReadinessEvidence['round']): { score: number; filled: number } | null {
  if (!round) return null;
  const parts = [round.targetAmount > 0, round.cashOnHand > 0, round.monthlyBurn > 0, round.valuationCap > 0];
  const filled = parts.filter(Boolean).length;
  if (filled === 0) return null;
  return { score: Math.round((filled / parts.length) * 100), filled };
}

export function computeReadiness(input: ReadinessEvidence): Readiness {
  const assessed = input.assessed ?? {};
  const team = teamEvidence(input.skills);
  const pitch = pitchEvidence(input.pitch);
  const finance = financeEvidence(input.round);

  const dimensions: ReadinessDimension[] = READINESS_DIMENSIONS.map((dim) => {
    const self = clampScore(assessed[dim.key]);
    let evidence: { score: number; text: Bilingual } | null = null;
    if (dim.key === 'Team Composition' && team) {
      evidence = { score: team.score, text: { en: `Skills cover ${team.covered} of 4 team areas`, el: `Οι δεξιότητες καλύπτουν ${team.covered} από 4 τομείς ομάδας` } };
    } else if (dim.key === 'Pitch Readiness' && pitch) {
      evidence = {
        score: pitch.score,
        text: { en: `${pitch.complete} of ${PITCH_SLIDES.length} slides written, ${pitch.started} started`, el: `${pitch.complete} από ${PITCH_SLIDES.length} διαφάνειες γραμμένες, ${pitch.started} ξεκινημένες` },
      };
    } else if (dim.key === 'Financial Planning' && finance) {
      evidence = { score: finance.score, text: { en: `${finance.filled} of 4 round numbers filled in`, el: `${finance.filled} από 4 αριθμοί του γύρου συμπληρωμένοι` } };
    }
    const { score, basis } = blend(self, evidence?.score ?? null);
    return { key: dim.key, label: dim.label, weight: dim.weight, score, basis, evidence: evidence?.text ?? null, next: dim.next, href: dim.href };
  });

  const scored = dimensions.filter((d) => d.score != null);
  const weight = scored.reduce((sum, d) => sum + d.weight, 0);
  const score = weight > 0 ? Math.round(scored.reduce((sum, d) => sum + d.weight * (d.score as number), 0) / weight) : 0;
  const weakest = scored.length ? [...scored].sort((a, b) => (a.score as number) - (b.score as number))[0] ?? null : null;
  return { score, dimensions, coverage: Math.round(weight * 100) / 100, known: scored.length, weakest };
}

/**
 * The sample venture's diagnostic. Chosen so the weighted index is exactly the
 * sample venture's 68 (DEMO_VENTURE.readinessScore), the number every page and
 * the assistant show in the sample account.
 */
export const DEMO_READINESS_SCORES: Record<ReadinessKey, number> = {
  'Team Composition': 90,
  'Market Validation': 60,
  'Product/Tech': 75,
  'Financial Planning': 40,
  'Pitch Readiness': 70,
};

export function demoReadiness(): Readiness {
  return computeReadiness({ assessed: DEMO_READINESS_SCORES });
}

const skillList = (raw: unknown): string[] => (Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : []);

/**
 * The account's readiness from what is stored: the diagnostic answers on the
 * venture record, the pitch deck, the round, and the skills passed in (the
 * signed-in profile) or, without them, the local profile copy.
 */
export function currentReadiness(skills?: unknown): Readiness {
  const saved = startupRecord.read();
  // The sample venture starts from its sample diagnostic; answers given in the sample account still move it.
  if (isDemoData()) return computeReadiness({ assessed: { ...DEMO_READINESS_SCORES, ...(saved.dimensions ?? {}) } });
  const list = skills === undefined ? skillList(readProfileLocal().skills) : skillList(skills);
  return computeReadiness({ assessed: saved.dimensions, skills: list, pitch: effectivePitch(), round: readRound() });
}

/** For React: the readiness, recomputed whenever the venture, the deck, the round or the skills change. */
export function useReadiness(skills?: unknown): Readiness {
  const signature = skills === undefined ? '' : skillList(skills).join('|');
  return useStored(() => currentReadiness(skills), [keys.startup, keys.pitch, keys.round, keys.profileLocal, `skills:${signature}`]);
}
