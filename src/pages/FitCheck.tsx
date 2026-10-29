import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles, Users, X, Zap } from 'lucide-react';
import { Both } from '../lib/both';
import { bothText } from '../lib/labels';
import { LanguageToggle, useLanguage, useT } from '../lib/language';
import { FIT_QUESTIONS, fitProfileUpdate, readFitCheck, scoreFit, writeFitCheck, type FitAnswer } from '../lib/fitCheck';
import { logActivity, writeProfileLocal } from '../lib/localLists';
import { persistProfilePatch } from '../lib/account';
import type { UserProfile } from '../types';
import { useAuth } from '../App';
import { cn } from '../lib/utils';
import { askAssistant } from '../lib/assistantBus';

export default function FitCheck() {
  useLanguage();
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, profile, isDemoMode, toggleDemoMode } = useAuth();
  const [step, setStep] = useState(0);
  const [lookingKey, setLookingKey] = useState('gtm');
  const [answers, setAnswers] = useState<Partial<FitAnswer>>({});
  const [applyState, setApplyState] = useState<'idle' | 'saving' | 'error'>('idle');
  const question = FIT_QUESTIONS[step];
  const done = step >= FIT_QUESTIONS.length;
  const inApp = Boolean(user) || isDemoMode;
  // Where a retake was started (e.g. /matches) — the result returns there.
  const rawFrom = params.get('from');
  const from = rawFrom && rawFrom.startsWith('/') && !rawFrom.startsWith('//') ? rawFrom : null;

  const fallbackPath = from || (user || isDemoMode ? '/dashboard' : '/');

  const handleExit = useCallback(() => {
    const historyIdx = typeof window !== 'undefined' ? (window.history.state as { idx?: number } | null)?.idx : undefined;
    if (typeof historyIdx === 'number' ? historyIdx > 0 : window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  }, [navigate, fallbackPath]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleExit();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleExit]);

  const result = useMemo(() => {
    if (!done) return null;
    const complete: FitAnswer = {
      roleCover: answers.roleCover ?? 'builder',
      stage: answers.stage ?? 'Pre-seed',
      commitment: answers.commitment ?? 'Full-time',
      lookingFor: answers.lookingFor ?? ['Sales', 'Growth'],
      hours: answers.hours ?? 'overlap',
    };
    return scoreFit(complete, lookingKey);
  }, [answers, done, lookingKey]);

  const pick = (optionId: string, lookingFor?: string[]) => {
    if (!question) return;
    const next: Partial<FitAnswer> = { ...answers };
    if (question.id === 'lookingFor') {
      next.lookingFor = lookingFor ?? [optionId];
      setLookingKey(optionId);
    } else if (question.id === 'roleCover') {
      next.roleCover = optionId as FitAnswer['roleCover'];
    } else if (question.id === 'stage') {
      next.stage = optionId as FitAnswer['stage'];
    } else if (question.id === 'commitment') {
      next.commitment = optionId as FitAnswer['commitment'];
    } else {
      next.hours = optionId as FitAnswer['hours'];
    }
    setAnswers(next);
    const last = step === FIT_QUESTIONS.length - 1;
    if (last) {
      const complete = {
        roleCover: next.roleCover ?? 'builder',
        stage: next.stage ?? 'Pre-seed',
        commitment: next.commitment ?? 'Full-time',
        lookingFor: next.lookingFor ?? ['Sales', 'Growth'],
        hours: next.hours ?? 'overlap',
      } satisfies FitAnswer;
      writeFitCheck(scoreFit(complete, question.id === 'lookingFor' ? optionId : lookingKey));
    }
    setStep((n) => n + 1);
  };

  const skipCurrentStep = () => {
    if (!question) return;
    const defaultOption = question.options[0];
    if (defaultOption) {
      pick(defaultOption.id, defaultOption.lookingFor);
    } else {
      setStep((n) => n + 1);
    }
  };

  const handleStepBack = () => {
    if (step > 0) {
      setStep((n) => n - 1);
    } else {
      handleExit();
    }
  };

  const isOptionSelected = (optionId: string, optionLookingFor?: string[]) => {
    if (!question) return false;
    if (question.id === 'lookingFor') {
      if (optionLookingFor && answers.lookingFor) {
        return lookingKey === optionId;
      }
      return false;
    }
    return answers[question.id] === optionId;
  };

  const openMatches = () => {
    if (!user && !isDemoMode) toggleDemoMode(true);
    navigate(from || '/matches');
  };

  // Signed-in (or demo) members can turn the answers into their profile, so every
  // ranking that reads the profile (Matches, Dashboard, Network, Profile, assistant) updates.
  const applyToProfile = async () => {
    const latest = readFitCheck();
    if (!latest) return;
    const patch = fitProfileUpdate(latest, profile) as Partial<UserProfile>;
    setApplyState('saving');
    try {
      if (user && !isDemoMode) await persistProfilePatch(user.uid, patch);
      else writeProfileLocal(patch);
      logActivity({ kind: 'profile', title: 'Fit check applied to profile', titleEl: 'Το fit check εφαρμόστηκε στο προφίλ', href: '/matches' });
      navigate(from || '/matches');
    } catch {
      setApplyState('error');
    }
  };

  const askAboutMatch = () => {
    const prompt = result
      ? `I am a ${result.archetype.en}. Who is my best match?`
      : 'Who is my best match?';
    if (!user && !isDemoMode) toggleDemoMode(true);
    navigate('/dashboard');
    window.setTimeout(() => {
      askAssistant(prompt);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="flex items-center justify-between gap-2 sm:gap-3 px-2.5 sm:px-6 py-3.5 border-b border-stone-200/70 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleExit}
            className="inline-flex items-center gap-1.5 min-h-10 px-2.5 rounded-xl border border-stone-200 bg-white text-xs sm:text-sm font-medium text-stone-700 hover:text-stone-900 hover:border-stone-300 hover:bg-stone-50 transition-colors"
            title={t('Back to previous page', 'Επιστροφή στην προηγούμενη σελίδα')}
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline sm:inline">
              <Both en="Back" el="Πίσω" />
            </span>
          </button>
          <NavLink to="/" className="inline-flex items-center gap-2 min-h-10 text-sm font-medium text-stone-900">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-stone-900 rounded-lg flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="hidden sm:inline">CoFounderBay</span>
          </NavLink>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <LanguageToggle />
          <button
            type="button"
            onClick={handleExit}
            className="min-h-10 inline-flex items-center px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          >
            <Both en="Skip" el="Παράλειψη" />
          </button>
          {!user && !isDemoMode && (
            <NavLink to="/login" className="hidden sm:inline-flex min-h-10 items-center px-3 text-sm font-medium text-stone-600 hover:text-stone-900">
              <Both en="Sign in" el="Είσοδος" />
            </NavLink>
          )}
          <button
            type="button"
            onClick={handleExit}
            aria-label={t('Close fit check', 'Κλείσιμο fit check')}
            title={t('Close (Esc)', 'Κλείσιμο (Esc)')}
            className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-stone-200 bg-white text-stone-500 hover:text-stone-900 hover:border-stone-300 hover:bg-stone-100 transition-colors shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {!done && question && (
        <>
          <div className="h-1.5 bg-stone-200">
            <div
              className="h-full bg-stone-900 transition-all duration-300"
              style={{ width: `${((step + 1) / FIT_QUESTIONS.length) * 100}%` }}
            />
          </div>
          <main className="flex-1 w-full max-w-xl mx-auto px-3 sm:px-6 py-8 sm:py-10">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-1.5">
                {FIT_QUESTIONS.map((q, idx) => {
                  const canJump = idx <= step;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      disabled={!canJump}
                      onClick={() => canJump && setStep(idx)}
                      aria-label={`${t('Question', 'Ερώτηση')} ${idx + 1}`}
                      className={cn(
                        'h-2 rounded-full transition-all',
                        idx === step
                          ? 'w-6 bg-stone-900'
                          : idx < step
                            ? 'w-3 bg-stone-500 hover:bg-stone-700 cursor-pointer'
                            : 'w-2 bg-stone-200 cursor-default'
                      )}
                    />
                  );
                })}
              </div>
              <span className="text-xs font-medium text-stone-400">
                {step + 1} / {FIT_QUESTIONS.length}
              </span>
            </div>

            <p className="text-xs font-medium text-stone-400 mb-2">
              {bothText(question.why.en, question.why.el)}
            </p>
            <h1 className="text-xl sm:text-2xl font-medium text-stone-900 tracking-tight mb-6">
              <Both en={question.en} el={question.el} />
            </h1>
            <div className="space-y-2">
              {question.options.map((option, idx) => {
                const selected = isOptionSelected(option.id, option.lookingFor);
                return (
                  <button
                    key={`${option.id}-${idx}-${option.en}`}
                    type="button"
                    onClick={() => pick(option.id, option.lookingFor)}
                    className={cn(
                      'w-full min-h-11 text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-between gap-2',
                      selected
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-white text-stone-800 hover:border-stone-900 hover:bg-stone-50'
                    )}
                  >
                    <span>
                      <Both en={option.en} el={option.el} />
                    </span>
                    <ArrowRight className={cn('w-4 h-4 shrink-0 opacity-60', selected ? 'text-white' : 'text-stone-400')} />
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-stone-200/60 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleStepBack}
                className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {step > 0 ? (
                  <Both en="Previous question" el="Προηγούμενη ερώτηση" />
                ) : (
                  <Both en="Exit to previous page" el="Επιστροφή στην προηγούμενη σελίδα" />
                )}
              </button>

              <button
                type="button"
                onClick={skipCurrentStep}
                className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl text-sm font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-200/50 transition-colors"
              >
                <Both en="Skip question" el="Παράλειψη ερώτησης" />
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </main>
        </>
      )}

      {done && result && (
        <main className="flex-1 w-full max-w-xl mx-auto px-3 sm:px-6 py-8 sm:py-10 space-y-6">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep(FIT_QUESTIONS.length - 1)}
              className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs font-medium text-stone-600 hover:text-stone-900 hover:border-stone-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <Both en="Back to questions" el="Πίσω στις ερωτήσεις" />
            </button>
            <button
              type="button"
              onClick={() => setStep(0)}
              className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs font-medium text-stone-600 hover:text-stone-900 hover:border-stone-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <Both en="Start over" el="Από την αρχή" />
            </button>
          </div>

          <p className="text-xs font-medium text-stone-400 tracking-wide">
            <Both en="Same fields Matches already scores" el="Τα ίδια πεδία που ήδη βαθμολογεί η Αντιστοίχιση" />
          </p>
          <h1 className="text-xl sm:text-2xl font-semibold text-stone-900 tracking-tight">
            <Both en={result.archetype.en} el={result.archetype.el} />
          </h1>
          <p className="text-sm text-stone-600 leading-relaxed">
            <Both en={result.why.en} el={result.why.el} />
          </p>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-stone-100">
            <span className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center shrink-0" aria-hidden="true">
              <Users className="w-5 h-5 text-stone-500" />
            </span>
            <p className="text-xs text-stone-500">
              <Both
                en="Next: see who covers what you still lack — photos stay, scores stay explainable."
                el="Επόμενο: δες ποιος καλύπτει αυτό που λείπει — οι φωτογραφίες μένουν, τα σκορ εξηγούνται."
              />
            </p>
          </div>
          {inApp && (
            <div className="p-3 rounded-xl bg-white border border-stone-200 space-y-2">
              <p className="text-xs text-stone-600">
                <Both
                  en="Update your profile with these answers (stage, commitment, looking for; role skills are only added if missing). Matches, Dashboard and the assistant re-rank right away."
                  el="Ενημέρωσε το προφίλ με αυτές τις απαντήσεις (στάδιο, δέσμευση, τι ψάχνεις· οι δεξιότητες ρόλου προστίθενται μόνο αν λείπουν). Αντιστοιχίσεις, Πίνακας και βοηθός ανακατατάσσονται αμέσως."
                />
              </p>
              <button
                type="button"
                onClick={() => void applyToProfile()}
                disabled={applyState === 'saving'}
                className="min-h-11 w-full inline-flex items-center justify-center gap-2 px-5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 disabled:opacity-60"
              >
                <Check className="w-4 h-4" />
                {applyState === 'saving'
                  ? <Both en="Updating…" el="Ενημέρωση…" />
                  : <Both en="Update my profile & matches" el="Ενημέρωσε προφίλ & αντιστοιχίσεις" />}
              </button>
              {applyState === 'error' && (
                <p className="text-xs text-red-600"><Both en="Could not save. Your answers are kept — try again." el="Δεν αποθηκεύτηκε. Οι απαντήσεις κρατήθηκαν — δοκίμασε ξανά." /></p>
              )}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={openMatches}
              className={cn(
                'min-h-11 inline-flex items-center justify-center gap-2 px-5 rounded-xl text-sm font-semibold',
                inApp ? 'border border-stone-200 bg-white text-stone-900 hover:border-stone-900' : 'bg-stone-900 text-white hover:bg-stone-800'
              )}
            >
              {inApp
                ? <Both en="Keep my profile, see matches" el="Κράτα το προφίλ, δες αντιστοιχίσεις" />
                : <Both en="See matches" el="Δες αντιστοιχίσεις" />}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={askAboutMatch}
              className="min-h-11 inline-flex items-center justify-center gap-2 px-5 rounded-xl border border-stone-200 bg-white text-sm font-semibold text-stone-900 hover:border-stone-900"
            >
              <Sparkles className="w-4 h-4" />
              <Both en="Ask the assistant who to meet" el="Ρώτα τον βοηθό ποιον να γνωρίσεις" />
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-200/60">
            <NavLink to="/signup" className="text-sm font-medium text-stone-500 hover:text-stone-900">
              <Both
                en="Or create an account — this fit check is kept on this browser."
                el="Ή φτιάξε λογαριασμό — αυτό το fit check μένει σε αυτόν τον περιηγητή."
              />
            </NavLink>
            <button
              type="button"
              onClick={handleExit}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <Both en="Return to previous page" el="Επιστροφή στην προηγούμενη σελίδα" />
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
