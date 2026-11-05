import React from 'react';
import {
  X,
  CheckCircle2,
  MessageSquare,
  UserCheck,
  MapPin,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { FounderProfile } from '../types';
import { CONFIDENCE_LABELS, type Compatibility } from '../lib/compatibility';
import CoverImage from './ui/CoverImage';

interface MatchBreakdownModalProps {
  founder: FounderProfile | null;
  myProfile: FounderProfile;
  /** The platform score (same engine as every card, profile and the assistant). */
  fit?: Compatibility | null;
  isOpen: boolean;
  onClose: () => void;
  onInitiateChat: (founder: FounderProfile) => void;
  onOpenFullProfile: (founder: FounderProfile) => void;
  lang: 'en' | 'el';
}

export const MatchBreakdownModal: React.FC<MatchBreakdownModalProps> = ({
  founder,
  myProfile,
  fit,
  isOpen,
  onClose,
  onInitiateChat,
  onOpenFullProfile,
  lang,
}) => {
  if (!isOpen || !founder) return null;
  const tr = (en: string, el: string) => (lang === 'en' ? en : el);
  // Only the platform score is shown as a number; without one there is no number at all.
  const totalScore = fit?.score ?? null;
  const scored = fit?.dimensions ?? [];
  const reasons = scored.filter((d) => d.reason && (d.score ?? 0) >= 60).map((d) => tr(d.reason!.en, d.reason!.el));

  // Facts shown beside the score, never added to it.
  const context = [
    {
      key: 'role',
      icon: UserCheck,
      label: tr('Founding role', 'Ρόλος στην ίδρυση'),
      value: myProfile.headline ? `${myProfile.role} ↔ ${founder.role}` : founder.role,
    },
    {
      key: 'verified',
      icon: ShieldCheck,
      label: tr('Verification', 'Επαλήθευση'),
      value: founder.verified ? tr('Verified profile', 'Επαληθευμένο προφίλ') : tr('Not verified yet', 'Δεν έχει επαληθευτεί ακόμη'),
    },
    ...(founder.location
      ? [{ key: 'location', icon: MapPin, label: tr('Location', 'Τοποθεσία'), value: founder.location }]
      : []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 pt-14 sm:pt-16 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        data-type-scale="app"
        aria-modal="true"
        aria-label={totalScore != null
          ? tr(`Why ${totalScore}% with ${founder.name}`, `Γιατί ${totalScore}% με ${founder.name}`)
          : tr(`Score breakdown: ${founder.name}`, `Ανάλυση σκορ: ${founder.name}`)}
        className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 sm:px-6 py-[0.92rem] bg-background/60">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <CoverImage
              src={founder.avatar}
              alt=""
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl ring-1 ring-border shrink-0"
              fallback={<span className="text-xs font-semibold text-stone-500">{founder.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>}
            />
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground truncate">
                {tr(`Score breakdown: ${founder.name}`, `Ανάλυση σκορ: ${founder.name}`)}
              </h3>
              <p className="text-xs text-muted-foreground truncate">{founder.headline || founder.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="text-right">
              <div className="text-base sm:text-lg font-semibold font-mono tabular-nums text-primary-accessible">
                {totalScore != null ? `${totalScore}%` : '—'}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {totalScore != null ? tr('Same score as on cards', 'Ίδιο σκορ με τις κάρτες') : tr('Not enough data to score', 'Λίγα στοιχεία για σκορ')}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={lang === 'en' ? 'Close' : 'Κλείσιμο'}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground tap-area"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-[1.455rem] space-y-4">
          {scored.length > 0 ? (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-foreground">
                {tr('What the score is made of', 'Από τι αποτελείται το σκορ')}
              </p>
              {fit && fit.confidence && (
                <p className="text-[11px] text-muted-foreground leading-snug" data-testid="match-confidence">
                  {tr(
                    `Based on ${fit.known} of ${scored.length} factors (${Math.round(fit.coverage * 100)}% of the weight) · ${CONFIDENCE_LABELS[fit.confidence].en}`,
                    `Με βάση ${fit.known} από ${scored.length} παράγοντες (${Math.round(fit.coverage * 100)}% του βάρους) · ${CONFIDENCE_LABELS[fit.confidence].el}`,
                  )}
                </p>
              )}
              {scored.map((dim) => (
                <div key={dim.key} className="rounded-xl border border-border bg-background/50 px-3 py-[0.68rem] space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                    <span className="font-semibold text-foreground">
                      {tr(dim.label.en, dim.label.el)}
                      <span className="ml-1.5 font-normal text-muted-foreground">· {tr('weight', 'βάρος')} {Math.round(dim.weight * 100)}%</span>
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-foreground shrink-0">
                      {dim.score == null ? tr('no data', 'χωρίς στοιχεία') : `${dim.score}%`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${dim.score ?? 0}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {dim.reason
                      ? tr(dim.reason.en, dim.reason.el)
                      : tr('Missing on one profile — left out, the other weights are rescaled.', 'Λείπει από ένα προφίλ — εξαιρείται και τα άλλα βάρη αναπροσαρμόζονται.')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-xl border border-border bg-background/50 px-3 py-[0.68rem] text-xs text-muted-foreground" data-testid="match-unscored">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p className="leading-snug">
                {tr(
                  'There is not enough on both profiles to score this pair. Skills, market, stage, commitment and working hours are compared — add yours on your profile and the score appears here and on every card.',
                  'Δεν υπάρχουν αρκετά στοιχεία και στα δύο προφίλ για σκορ. Συγκρίνονται δεξιότητες, αγορά, στάδιο, δέσμευση και ώρες εργασίας — πρόσθεσε τα δικά σου στο προφίλ και το σκορ θα εμφανιστεί εδώ και σε κάθε κάρτα.',
                )}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground pt-1">
              {tr('Context (not counted in the score)', 'Πλαίσιο (δεν μετράει στο σκορ)')}
            </p>
            <dl className="rounded-xl border border-border bg-background/50 divide-y divide-border">
              {context.map((row) => {
                const Icon = row.icon;
                return (
                  <div key={row.key} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                    <dt className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                      <Icon className="h-3.5 w-3.5" />
                      {row.label}
                    </dt>
                    <dd className="font-medium text-foreground text-right min-w-0 break-words">{row.value}</dd>
                  </div>
                );
              })}
            </dl>
          </div>

          {reasons.length > 0 && (
            <div className="rounded-xl border border-border bg-background/40 px-4 py-[0.92rem] space-y-2">
              <div className="text-xs font-semibold text-foreground">
                {tr('Why you match', 'Γιατί ταιριάζετε')}
              </div>
              <div className="space-y-1.5">
                {reasons.map((reason, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullProfile(founder);
              }}
              className="h-9 rounded-lg border border-border bg-card px-3.5 text-xs font-medium text-foreground hover:bg-accent"
            >
              {lang === 'en' ? 'View Full Profile' : 'Πλήρες Προφίλ'}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onInitiateChat(founder);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{lang === 'en' ? 'Message' : 'Μήνυμα'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
