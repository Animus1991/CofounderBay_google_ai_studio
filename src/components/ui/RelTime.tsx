import { formatDateTime } from '../../lib/dates';
import { useLanguage } from '../../lib/language';
import { formatRelativeTime } from '../../lib/utils';

/** Relative time with the exact date and 24-hour time on hover, as on GitHub. */
export default function RelTime({ iso, className }: { iso: string; className?: string }) {
  useLanguage();
  return (
    <time dateTime={iso} title={formatDateTime(iso)} className={className}>
      {formatRelativeTime(iso)}
    </time>
  );
}
