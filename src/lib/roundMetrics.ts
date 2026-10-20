import type { Round } from './localLists';

export interface RoundMetrics {
  /** Percent of the target committed, 0–100. */
  pct: number;
  /** Amount left to raise, never negative. */
  remaining: number;
  /** cashOnHand / monthlyBurn floored — the same formula the assistant answers with. */
  runwayMonths: number | null;
  activeLeads: number;
  meetings: number;
  closed: number;
  decided: number;
  /** closed / decided, null while no investor has reached a decision. */
  closeRate: number | null;
  /** Days from `now` to closeDate, null when the date does not parse. */
  daysToClose: number | null;
}

const MEETING_STAGES = new Set(['Meeting', 'Due Diligence', 'Term Sheet']);
const DECIDED_STAGES = new Set(['Closed', 'Passed']);

export function roundMetrics(round: Round, now: Date = new Date()): RoundMetrics {
  const pipeline = round.pipeline ?? [];
  const pct = round.targetAmount > 0 ? Math.round((round.committedAmount / round.targetAmount) * 100) : 0;
  const remaining = Math.max(0, round.targetAmount - round.committedAmount);
  const runwayMonths = round.monthlyBurn > 0 ? Math.floor(round.cashOnHand / round.monthlyBurn) : null;
  const activeLeads = pipeline.filter((item) => !DECIDED_STAGES.has(item.stage)).length;
  const meetings = pipeline.filter((item) => MEETING_STAGES.has(item.stage)).length;
  const closed = pipeline.filter((item) => item.stage === 'Closed').length;
  const decided = pipeline.filter((item) => DECIDED_STAGES.has(item.stage)).length;
  const closeRate = decided > 0 ? closed / decided : null;
  const close = new Date(round.closeDate);
  const daysToClose = Number.isNaN(close.getTime()) ? null : Math.max(0, Math.ceil((close.getTime() - now.getTime()) / 86_400_000));
  return { pct, remaining, runwayMonths, activeLeads, meetings, closed, decided, closeRate, daysToClose };
}
