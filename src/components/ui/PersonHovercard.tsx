import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { avatarOf, findPerson, isOnline } from '../../lib/peopleSource';
import Avatar from './Avatar';
import { labelOf } from '../../lib/labels';
import { useLanguage, useT } from '../../lib/language';
import FactLine from './FactLine';

const CARD_WIDTH = 288;

function localClock(timezone: string, mode: 'en' | 'el'): string | null {
  try {
    return new Date().toLocaleTimeString(mode === 'el' ? 'el-GR' : 'en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
  } catch {
    return null;
  }
}

/**
 * Who a person is without leaving the page, as GitHub's hovercards: photo, headline,
 * role, place and local time, stage, first three skills. Read-only on purpose — the
 * name itself stays the way in. Touch screens skip the card and follow the name.
 */
export default function PersonHovercard({ person: idOrName, children }: { person: string | null | undefined; children: ReactNode }) {
  const t = useT();
  const { mode } = useLanguage();
  const person = findPerson(idOrName);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [place, setPlace] = useState<{ top: number; left: number; above: boolean } | null>(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!person) return <>{children}</>;

  const show = () => {
    if (typeof window === 'undefined' || !window.matchMedia?.('(hover: hover)').matches) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const above = rect.bottom + 240 > window.innerHeight && rect.top > 260;
      setPlace({
        top: above ? rect.top - 8 : rect.bottom + 8,
        left: Math.min(Math.max(8, rect.left), window.innerWidth - CARD_WIDTH - 8),
        above,
      });
    }, 500);
  };

  const hide = () => {
    window.clearTimeout(timer.current);
    setPlace(null);
  };

  const clock = localClock(person.timezone, mode);

  return (
    <span ref={anchorRef} className="inline" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {place && typeof document !== 'undefined' && createPortal(
        <div
          role="tooltip"
          style={{ position: 'fixed', top: place.top, left: place.left, width: CARD_WIDTH, transform: place.above ? 'translateY(-100%)' : undefined }}
          className="pointer-events-none z-[120] rounded-xl border border-stone-200 bg-white p-4 text-left shadow-sm"
        >
          <div className="flex items-start gap-3">
            <Avatar src={avatarOf(person) || undefined} fallback={person.fullName} size="lg" status={isOnline(person) ? 'online' : undefined} className="[&>*]:rounded-xl" />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug text-stone-900">{person.fullName}</p>
              <p className="text-xs leading-snug text-stone-500">{labelOf(person.role)}</p>
            </div>
          </div>
          <p className="mt-2 text-sm leading-snug text-stone-700">{t(person.headline, person.headlineEl || person.headline)}</p>
          <FactLine
            className="mt-2"
            items={[
              person.location,
              clock ? t(`${clock} local time`, `${clock} τοπική ώρα`) : '',
              labelOf(person.stage),
              labelOf(person.commitment),
            ]}
            label={t('Profile facts', 'Στοιχεία προφίλ')}
          />
          {person.skills.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {person.skills.slice(0, 3).map((skill) => (
                <span key={skill} className="studio-label">{labelOf(skill)}</span>
              ))}
            </div>
          )}
        </div>,
        document.body,
      )}
    </span>
  );
}
