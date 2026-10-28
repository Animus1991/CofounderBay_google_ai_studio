import React, { ReactNode } from 'react';
import { Sparkles, LucideIcon } from 'lucide-react';

export interface PageHeaderProps {
  title: string;
  titleEl?: string;
  description?: string;
  descriptionEl?: string;
  eyebrow?: string;
  eyebrowEl?: string;
  eyebrowIcon?: LucideIcon;
  eyebrowColor?: string;
  actions?: ReactNode;
  metrics?: Array<{
    label: string;
    labelEl?: string;
    value: string | number;
    subtext?: string;
    subtextEl?: string;
    color?: string;
  }>;
  lang?: 'en' | 'el';
  headingAs?: 'h1' | 'h2' | 'h3';
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  titleEl,
  description,
  descriptionEl,
  eyebrow,
  eyebrowEl,
  eyebrowIcon: EyebrowIcon = Sparkles,
  eyebrowColor = 'text-primary',
  actions,
  metrics,
  lang = 'el',
  headingAs: Heading = 'h2',
  className = '',
}) => {
  const displayTitle = lang === 'el' && titleEl ? titleEl : title;
  const displayDesc = lang === 'el' && descriptionEl ? descriptionEl : description;
  const displayEyebrow = lang === 'el' && eyebrowEl ? eyebrowEl : eyebrow;

  return (
    <div
      data-component="page-header"
      className={`relative overflow-hidden rounded-2xl border border-border bg-card/85 px-4 py-[1.2125rem] sm:px-6 sm:py-[1.455rem] shadow-sm backdrop-blur-sm ${className}`}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 -z-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          {displayEyebrow && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary-accessible">
              <EyebrowIcon className={`h-3.5 w-3.5 ${eyebrowColor}`} />
              <span>{displayEyebrow}</span>
            </div>
          )}

          <Heading className="page-title text-xl font-bold tracking-tight text-foreground sm:text-2xl leading-snug">
            {displayTitle}
          </Heading>

          {displayDesc && (
            <p className="page-lead max-w-3xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {displayDesc}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
            {actions}
          </div>
        )}
      </div>

      {metrics && metrics.length > 0 && (
        <div className="mt-[1.2125rem] pt-[0.97rem] border-t border-border/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {metrics.map((m, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border/80 bg-background/70 px-3.5 py-[0.606rem] shadow-2xs"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground leading-snug">
                {lang === 'el' && m.labelEl ? m.labelEl : m.label}
              </div>
              <div className={`mt-1 text-base sm:text-lg font-bold leading-snug ${m.color || 'text-foreground'}`}>
                {m.value}
              </div>
              {(m.subtext || m.subtextEl) && (
                <div className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
                  {lang === 'el' && m.subtextEl ? m.subtextEl : m.subtext}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
