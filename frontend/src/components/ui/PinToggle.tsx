import { useLocation } from 'react-router-dom';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import { bothText } from '../../lib/labels';
import { useStored } from '../../lib/useStored';
import { isFavorite, toggleFavorite, UX_PREFS_KEY, readUxPrefs } from '../../lib/personalization';
import { navLabel } from '../../lib/navMap';
import { useT } from '../../lib/language';

/** Star in a page header: pins this page to the sidebar's Pinned group. */
export default function PinToggle({ path: explicitPath }: { path?: string }) {
  useT();
  const { pathname } = useLocation();
  const path = explicitPath ?? pathname;
  useStored(readUxPrefs, [UX_PREFS_KEY]);
  const on = isFavorite(path);
  const label = navLabel(path);
  const title = on
    ? bothText(`Pinned in your sidebar. Remove ${label.en}?`, `Καρφιτσωμένο στο μενού. Ξεκαρφίτσωμα ${label.en};`)
    : bothText(`Pin ${label.en} to the top of your sidebar`, `Καρφίτσωσε «${label.en}» στην κορυφή του μενού`);
  return (
    <button
      type="button"
      onClick={() => toggleFavorite(path)}
      aria-pressed={on}
      aria-label={title}
      title={title}
      className={cn(
        'inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors',
        on
          ? 'bg-stone-900 border-stone-900 text-amber-300 hover:bg-stone-800'
          : 'bg-white border-stone-200 text-stone-400 hover:text-stone-900 hover:border-stone-300',
      )}
    >
      <Star className={cn('w-4 h-4', on && 'fill-current')} aria-hidden="true" />
    </button>
  );
}
