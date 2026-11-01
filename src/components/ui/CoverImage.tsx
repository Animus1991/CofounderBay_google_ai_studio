import { useEffect, useState, type ElementType, type ReactNode } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

type CoverImageProps = {
  src?: string | null;
  /** Describes the picture; empty for decorative covers whose title is already on the card. */
  alt: string;
  className?: string;
  imgClassName?: string;
  /** The icon on the placeholder — the card's kind (an event, a community, a program). */
  icon?: ElementType;
  /** Placeholder tone: light on cards, dark under overlaid text. */
  tone?: 'light' | 'dark';
  /** Custom placeholder content (e.g. a person's initials) instead of the icon. */
  fallback?: ReactNode;
};

/**
 * A cover picture that never shows a broken image.
 *
 * Covers come from remote URLs (the sample photos, Firestore documents without
 * a picture, partner logos). When the address is empty or fails to load, the
 * browser drew a broken-image glyph with the alt text across the card. This
 * shows a calm placeholder with the card's icon instead, in the theme's tint.
 */
export default function CoverImage({ src, alt, className, imgClassName, icon: Icon = ImageIcon, tone = 'light', fallback }: CoverImageProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const showImage = Boolean(src) && !failed;
  return (
    <div className={cn('relative overflow-hidden', tone === 'dark' ? 'bg-stone-900' : 'bg-stone-100', className)}>
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-cover', imgClassName)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center" data-testid="cover-placeholder" aria-hidden="true">
          {fallback ?? <Icon className={cn('h-8 w-8', tone === 'dark' ? 'text-stone-600' : 'text-stone-300')} />}
        </div>
      )}
    </div>
  );
}
