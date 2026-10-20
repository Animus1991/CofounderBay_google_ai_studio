/**
 * One place that writes the "open to" choices, so Settings toggles and the
 * studio assistant cannot drift apart. Every call updates all three stores:
 * the local open-to list matching reads, the `cfb.accountSwitches` snapshot
 * the Settings toggles render, and — for signed-in accounts — the privacy
 * slice on the profile document other members' matching respects.
 */
import { persistPrivacy, type PrivacyFields } from './account';
import { keys, readValue, writeOpenTo, writeValue, type OpenToKind } from './localLists';

const SWITCH_KEY = keys.accountSwitches;

export type OpenToContext = {
  uid: string | null;
  demo: boolean;
  /** Other privacy fields written in the same call, so there is one remote write. */
  privacy?: Omit<PrivacyFields, 'openTo' | 'mentorAvailability'>;
};

export function applyOpenTo(kinds: OpenToKind[], ctx: OpenToContext): OpenToKind[] {
  const next = writeOpenTo(kinds);
  try {
    const stored = readValue<Record<string, unknown>>(SWITCH_KEY, {});
    writeValue(SWITCH_KEY, {
      ...stored,
      openToCofounder: next.includes('cofounder'),
      openToInvestors: next.includes('investor'),
      openToAdvisors: next.includes('advisor'),
      mentorAvailability: next.includes('mentoring'),
    });
  } catch {
    /* storage blocked — the list write still stands */
  }
  if (!ctx.demo && ctx.uid) {
    void persistPrivacy(ctx.uid, { ...ctx.privacy, openTo: next, mentorAvailability: next.includes('mentoring') }).catch(() => undefined);
  }
  return next;
}
