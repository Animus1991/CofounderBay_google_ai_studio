import { useId } from 'react';
import { cn } from '../../lib/utils';

type SparklineProps = {
  values: number[];
  /** Read by screen readers instead of the drawing, e.g. "Profile views, last 7 days: 12 to 31". */
  label: string;
  className?: string;
};

/**
 * A small trend line drawn in plain SVG.
 *
 * The dashboard used to import the whole chart library (≈310 kB, loaded on
 * every first visit) for one area line without axes. This draws the same
 * shape in a few lines, follows the active theme through `currentColor`, and
 * says what it shows to assistive technology.
 */
export default function Sparkline({ values, label, className }: SparklineProps) {
  const gradientId = useId();
  if (values.length < 2) return null;
  const width = 100;
  const height = 32;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - 2 - ((value - min) / span) * (height - 4);
    return [x, y] as const;
  });
  const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className={cn('h-full w-full text-stone-900', className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} stroke="none" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
