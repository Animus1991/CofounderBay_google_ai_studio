import React from 'react';
import {
  X,
  BarChart2,
  CheckCircle2,
  MessageSquare,
  UserCheck,
  Layers,
  Clock,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { FounderProfile } from '../types';
import { MATCH_WEIGHTS } from '../utils/matchingEngine';
import { CONFIDENCE_LABELS, type Compatibility } from '../lib/compatibility';

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
  const totalScore = fit?.score ?? founder.matchScore;
  const scored = fit?.dimensions ?? [];

  const bd = founder.matchBreakdown || {
    roleComplementarity: 22,
    skillsOverlap: 21,
    stageAlignment: 18,
    commitmentAlignment: 15,
    locationProximity: 5,
    recencyBonus: 10,
    reasons: founder.matchHighlights,
  };

  const allSignals = [
    {
      key: 'role',
      labelEn: 'Role Complementarity',
      labelEl: 'Συμπληρωματικότητα Ρόλων',
      descEn: `${myProfile.role} ↔ ${founder.role}`,
      descEl: `${myProfile.role} ↔ ${founder.role}`,
      value: bd.roleComplementarity,
      max: MATCH_WEIGHTS.roleComplementarity,
      icon: UserCheck,
    },
    {
      key: 'skills',
      labelEn: 'Superpower & Sought Skills Synergy',
      labelEl: 'Συνέργεια Δεξιοτήτων & Αναγκών',
      descEn: 'Jaccard skill overlap & sought role fulfillment',
      descEl: 'Υπερκάλυψη ζητούμενων τεχνικών & εμπορικών δεξιοτήτων',
      value: bd.skillsOverlap,
      max: MATCH_WEIGHTS.skillsOverlap,
      icon: Layers,
    },
    {
      key: 'stage',
      labelEn: 'Venture Stage Alignment',
      labelEl: 'Ευθυγράμμιση Σταδίου Venture',
      descEn: `Your stage (${myProfile.stage}) vs ${founder.stage}`,
      descEl: `Το στάδιό σου (${myProfile.stage}) έναντι ${founder.stage}`,
      value: bd.stageAlignment,
      max: MATCH_WEIGHTS.stageAlignment,
      icon: BarChart2,
    },
    {
      key: 'commitment',
      labelEn: 'Commitment Cadence',
      labelEl: 'Επίπεδο Δέσμευσης Χρόνου',
      descEn: `${myProfile.commitment} vs ${founder.commitment}`,
      descEl: `${myProfile.commitment} έναντι ${founder.commitment}`,
      value: bd.commitmentAlignment,
      max: MATCH_WEIGHTS.commitmentAlignment,
      icon: Clock,
    },
    {
      key: 'location',
      labelEn: 'Hub & Remote Proximity',
      labelEl: 'Τοποθεσία & Remote Συνεργασία',
      descEn: founder.location,
      descEl: founder.location,
      value: bd.locationProximity,
      max: MATCH_WEIGHTS.locationProximity,
      icon: MapPin,
    },
    {
      key: 'recency',
      labelEn: 'Verification & Activity Index',
      labelEl: 'Επαλήθευση & Ενεργή Παρουσία',
      descEn: founder.verified ? 'Verified ecosystem track record' : 'Active profile',
      descEl: founder.verified ? 'Επαληθευμένο ιστορικό ιδρυτή' : 'Ενεργό προφίλ',
      value: bd.recencyBonus,
      max: MATCH_WEIGHTS.recencyBonus,
      icon: ShieldCheck,
    },
  ];
  // With a platform score present, the axes it already covers are shown from it; the
  // remaining signals (role fit, verification) stay visible as context, not as score.
  const dimensions = scored.length > 0 ? allSignals.filter((d) => d.key === 'role' || d.key === 'recency') : allSignals;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 pt-14 sm:pt-16 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tr(`Why ${totalScore}% with ${founder.name}`, `Γιατί ${totalScore}% με ${founder.name}`)}
        className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 sm:px-6 py-[0.92rem] bg-background/60">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img
              src={founder.avatar}
              alt={founder.name}
              referrerPolicy="no-referrer"
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl object-cover ring-1 ring-border shrink-0"
            />
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {tr(`Score breakdown: ${founder.name}`, `Ανάλυση σκορ: ${founder.name}`)}
              </h3>
              <p className="text-xs text-muted-foreground truncate">{founder.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="text-right">
              <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-primary">
                {totalScore}%
              </div>
              <div className="text-[10px] text-muted-foreground">
                {tr('Same score as on cards', 'Ίδιο σκορ με τις κάρτες')}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={lang === 'en' ? 'Close' : 'Κλείσιμο'}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-[1.455rem] space-y-4">
          {scored.length > 0 && (
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
                    <span className="font-mono tabular-nums font-bold text-foreground shrink-0">
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
          )}
          {scored.length > 0 && (
            <p className="text-xs font-semibold text-foreground pt-1">
              {tr('Extra context (not counted in the score)', 'Επιπλέον πλαίσιο (δεν μετράει στο σκορ)')}
            </p>
          )}
          <div className="space-y-2.5">
            {dimensions.map((dim) => {
              const Icon = dim.icon;
              const pct = Math.round((dim.value / dim.max) * 100);
              return (
                <div
                  key={dim.key}
                  className="rounded-xl border border-border bg-background/50 px-3 py-[0.68rem] space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5 min-w-0">
                      <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">{lang === 'en' ? dim.labelEn : dim.labelEl}</span>
                    </span>
                    <span className="font-mono tabular-nums font-bold text-foreground shrink-0">
                      {dim.value} / {dim.max} pts ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {lang === 'en' ? dim.descEn : dim.descEl}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-border bg-background/40 px-4 py-[0.92rem] space-y-2">
            <div className="text-xs font-bold text-foreground">
              {tr('Why you match', 'Γιατί ταιριάζετε')}
            </div>
            <div className="space-y-1.5">
              {(scored.length > 0
                ? scored.filter((d) => d.reason && (d.score ?? 0) >= 60).map((d) => tr(d.reason!.en, d.reason!.el))
                : bd.reasons
              ).map((reason, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>

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
              <span>{lang === 'en' ? 'Connect & Message' : 'Έναρξη Συνομιλίας'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
