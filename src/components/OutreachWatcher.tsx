import { useEffect, useRef } from 'react';
import { useT } from '../lib/language';
import { useToast } from '../context/ToastContext';
import { useStored } from '../lib/useStored';
import { keys, readRound } from '../lib/localLists';
import { readDD } from '../lib/dueDiligence';
import { checkShareOpens, digestEnabledLocally, syncDigestSnapshot } from '../lib/outreach';
import { needsSignIn } from '../lib/studioApi';

const POLL_MS = 60_000;

/** Background duties for the signed-in shell: share-link open alerts and the digest snapshot. Renders nothing. */
export function OutreachWatcher() {
  const t = useT();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    let stopped = false;
    let failures = 0;
    const check = () => {
      // Hidden tab, or a server that said "sign in first" / kept failing: stay quiet.
      if (stopped || document.visibilityState !== 'visible' || failures >= 3) return;
      checkShareOpens()
        .then((fresh) => {
          failures = 0;
          if (stopped) return;
          fresh.forEach((open) => toastRef.current.info(t(`${open.name} opened your due-diligence link`, `${open.name}: άνοιξε τον σύνδεσμο δέουσας επιμέλειας`)));
        })
        .catch((error) => { failures = needsSignIn(error) ? 3 : failures + 1; });
    };
    check();
    const timer = window.setInterval(check, POLL_MS);
    document.addEventListener('visibilitychange', check);
    return () => { stopped = true; window.clearInterval(timer); document.removeEventListener('visibilitychange', check); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signature = useStored(() => JSON.stringify([readRound().pipeline ?? [], readDD().map((i) => i.status)]), [keys.round, keys.dueDiligence]);
  useEffect(() => {
    if (!digestEnabledLocally()) return;
    const timer = window.setTimeout(() => { void syncDigestSnapshot().catch(() => undefined); }, 4000);
    return () => window.clearTimeout(timer);
  }, [signature]);

  return null;
}
