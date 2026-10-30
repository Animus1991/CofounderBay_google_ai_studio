/**
 * The overdue alert: when an investor follow-up slips past its day, the
 * founder is told once — a toast on the next visit and an entry in
 * Notifications — not on every page load.
 *
 * "Once" is per investor and due day: moving the date and missing it again
 * alerts again. Remembered per account in the same synced store as the
 * pipeline, so a second device does not repeat it.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { followUps, keys, logActivity, readRound, readValue, writeValue, type FollowUp } from './localLists';
import { useToast } from '../context/ToastContext';
import { useT } from './language';

export const ALERTED_KEY = keys.followUpAlerts;

const alertId = (item: FollowUp) => `${item.investorId}@${item.nextDate}`;

/** Overdue follow-ups that have not been alerted yet; marks them alerted. */
export function takeNewOverdue(now: Date = new Date()): FollowUp[] {
  const overdue = followUps(readRound(), now).overdue;
  if (overdue.length === 0) return [];
  const alerted = new Set(readValue<string[]>(ALERTED_KEY, []));
  const fresh = overdue.filter((item) => !alerted.has(alertId(item)));
  if (fresh.length === 0) return [];
  // Keep only ids that are still overdue, so the list does not grow forever.
  const stillOverdue = new Set(overdue.map(alertId));
  writeValue(ALERTED_KEY, [...[...alerted].filter((id) => stillOverdue.has(id)), ...fresh.map(alertId)]);
  for (const item of fresh) {
    logActivity({
      kind: 'round',
      title: `Overdue: ${item.nextStep} — ${item.name}`,
      titleEl: `Εκπρόθεσμο: ${item.nextStep} — ${item.name}`,
      href: '/fundraising?tab=tracker',
    });
  }
  return fresh;
}

/** Raises the overdue alert once per visit, after the page has settled. */
export function useFollowUpAlerts(enabled: boolean) {
  const toast = useToast();
  const navigate = useNavigate();
  const t = useT();
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = window.setTimeout(() => {
      const fresh = takeNewOverdue();
      const first = fresh[0];
      if (!first) return;
      toast.toast({
        type: 'warning',
        title: fresh.length === 1
          ? t(`${first.name} is waiting on you`, `Η/Ο ${first.name} περιμένει από σένα`)
          : t(`${fresh.length} investor follow-ups are overdue`, `${fresh.length} follow-ups με επενδυτές είναι εκπρόθεσμα`),
        description: fresh.length === 1 ? first.nextStep : fresh.map((item) => item.name).join(', '),
        duration: 10_000,
        action: { label: t('Open pipeline', 'Άνοιγμα ροής'), run: () => navigate('/fundraising?tab=tracker') },
      });
    }, 1500);
    return () => window.clearTimeout(timer);
    // Once per mount of the app frame; the toast hook is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
