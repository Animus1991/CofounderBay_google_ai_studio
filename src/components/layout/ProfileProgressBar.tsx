/**
 * "Finish your profile" — a slim bar above every page until the profile is
 * complete, with the single most valuable missing field and one button.
 *
 * The completeness card used to live only near the bottom of the dashboard, so
 * a founder who never scrolled there never learned that matching was running on
 * half a profile. The measure is lib/profileCompleteness — the same number as
 * the dashboard card, the profile page and Insights. Closing the bar hides it
 * for this completeness; it returns only when the number changes. Pages where
 * the profile is being edited, or that own the full screen, do not show it.
 */
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useT } from '../../lib/language';
import { closeProfileNudge, useProfileNudge } from '../../lib/profileNudge';

export default function ProfileProgressBar() {
  const t = useT();
  const navigate = useNavigate();
  const { visible, score, missing, next } = useProfileNudge();
  if (!visible || !next) return null;
  const others = missing.length - 1;

  return (
    <div
      role="region"
      aria-label={t('Profile completeness', 'Πληρότητα προφίλ')}
      data-testid="profile-progress-bar"
      className="shrink-0 border-b border-stone-200 bg-stone-50"
    >
      <div className="flex items-center gap-2.5 px-3.5 py-1.5 sm:px-6">
        <div className="hidden h-1 w-16 shrink-0 overflow-hidden rounded-full bg-stone-200 sm:block" aria-hidden="true">
          <div className="h-full rounded-full bg-stone-900" style={{ width: `${score}%` }} />
        </div>
        <p className="min-w-0 flex-1 truncate text-xs text-stone-600">
          <span className="font-semibold text-stone-900">{t(`Profile ${score}%`, `Προφίλ ${score}%`)}</span>
          {' · '}
          {t(`add ${next.addLabel.en}`, `πρόσθεσε ${next.addLabel.el}`)}
          {others > 0 ? t(` and ${others} more`, ` και ${others} ακόμη`) : ''}
          <span className="hidden sm:inline">{t(' — matching reads these fields.', ' — η αντιστοίχιση διαβάζει αυτά τα πεδία.')}</span>
        </p>
        <button
          type="button"
          onClick={() => navigate(next.href)}
          className="inline-flex min-h-8 shrink-0 items-center rounded-lg bg-stone-900 px-3 text-xs font-medium text-white hover:bg-stone-800"
        >
          {t('Finish', 'Συνέχεια')}
        </button>
        <button
          type="button"
          aria-label={t('Hide until the profile changes', 'Απόκρυψη μέχρι να αλλάξει το προφίλ')}
          title={t('Hide until the profile changes', 'Απόκρυψη μέχρι να αλλάξει το προφίλ')}
          onClick={() => closeProfileNudge(score)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-900"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
