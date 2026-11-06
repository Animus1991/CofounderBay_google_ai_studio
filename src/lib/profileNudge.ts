/**
 * When the "finish your profile" bar shows (components/layout/ProfileProgressBar).
 * One rule for the bar and for the dashboard's completeness card, so the same
 * number is never shown twice on one screen: the card appears only while the
 * bar is hidden — closed at this completeness, or on a page that hides it.
 */
import { useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { mergeFitIntoViewer } from './fitCheck';
import { profileCompleteness } from './profileCompleteness';
import { keys, readValue, writeValue } from './localLists';
import { useStored } from './useStored';

type Nudge = { closedAt?: number };

const HIDDEN_ON = /^\/(profile|onboarding|messages|assistant)(\/|$)/;

export function useProfileNudge() {
  const location = useLocation();
  const { profile, user, isDemoMode } = useAuth();
  const nudge = useStored(() => readValue<Nudge>(keys.profileNudge, {}), [keys.profileNudge]);
  const { score, missing } = profileCompleteness(mergeFitIntoViewer(profile));
  const next = missing[0];
  const visible = Boolean(
    (user || isDemoMode)
    && !HIDDEN_ON.test(location.pathname)
    && score < 100
    && next
    && nudge.closedAt !== score,
  );
  return { visible, score, missing, next };
}

/** Hides the bar until the completeness changes. */
export function closeProfileNudge(score: number) {
  writeValue<Nudge>(keys.profileNudge, { closedAt: score });
}
