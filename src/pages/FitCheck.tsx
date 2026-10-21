import { useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles, Users, Zap } from 'lucide-react';
import { Both } from '../lib/both';
import { bothText } from '../lib/labels';
import { LanguageToggle, useLanguage } from '../lib/language';
import { FIT_QUESTIONS, scoreFit, writeFitCheck, type FitAnswer } from '../lib/fitCheck';
import { useAuth } from '../App';

export default function FitCheck() {
  useLanguage();
  const navigate = useNavigate();
  const { user, toggleDemoMode } = useAuth();
  const [step, setStep] = useState(0);
  const [lookingKey, setLookingKey] = useState('gtm');
  const [answers, setAnswers] = useState<Partial<FitAnswer>>({});
  const question = FIT_QUESTIONS[step];
  const done = step >= FIT_QUESTIONS.length;
  const result = useMemo(() => {
    if (!done) return null;
    if (!answers.roleCover || !answers.stage || !answers.commitment || !answers.lookingFor || !answers.hours) return null;
    return scoreFit(answers as FitAnswer, lookingKey);
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

  const openMatches = () => {
    if (!user) toggleDemoMode(true);
    navigate('/matches');
  };

  const askAssistant = () => {
    const prompt = result
      ? `I am a ${result.archetype.en}. Who is my best match?`
      : 'Who is my best match?';
    if (!user) toggleDemoMode(true);
    navigate('/dashboard');
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('OPEN_ASSISTANT', { detail: { prompt } }));
    }, 400);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="flex items-center justify-between gap-3 px-2 sm:px-6 py-4">
        <NavLink to="/" className="inline-flex items-center gap-2 min-h-11 text-sm font-medium text-stone-900">
          <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          CoFounderBay
        </NavLink>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <NavLink to="/login" className="min-h-11 inline-flex items-center px-3 text-sm font-medium text-stone-600">
            <Both en="Sign in" el="Είσοδος" />
          </NavLink>
        </div>
      </header>

      {!done && question && (
        <>
          <div className="h-1.5 bg-stone-200">
            <div className="h-full bg-stone-900 transition-all duration-300" style={{ width: `${(step / FIT_QUESTIONS.length) * 100}%` }} />
          </div>
          <main className="flex-1 w-full max-w-xl mx-auto px-2 sm:px-6 py-10">
            <p className="text-xs font-medium text-stone-400 mb-2">
              {step + 1} / {FIT_QUESTIONS.length} · {bothText(question.why.en, question.why.el)}
            </p>
            <h1 className="text-xl sm:text-2xl font-medium text-stone-900 tracking-tight mb-6">
              <Both en={question.en} el={question.el} />
            </h1>
            <div className="space-y-2">
              {question.options.map((option) => (
                <button
                  key={`${option.id}-${option.en}`}
                  type="button"
                  onClick={() => pick(option.id, option.lookingFor)}
                  className="w-full min-h-11 text-left px-4 py-3 rounded-xl border border-stone-200 bg-white text-sm font-medium text-stone-800 hover:border-stone-900 hover:bg-stone-50 transition-all"
                >
                  <Both en={option.en} el={option.el} />
                </button>
              ))}
            </div>
            {step > 0 && (
              <button type="button" onClick={() => setStep((n) => n - 1)} className="mt-6 inline-flex items-center gap-1.5 min-h-11 text-sm text-stone-500">
                <ArrowLeft className="w-4 h-4" />
                <Both en="Back" el="Πίσω" />
              </button>
            )}
          </main>
        </>
      )}

      {done && result && (
        <main className="flex-1 w-full max-w-xl mx-auto px-2 sm:px-6 py-10 space-y-6">
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
            <span className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center shrink-0" aria-hidden="true"><Users className="w-5 h-5 text-stone-500" /></span>
            <p className="text-xs text-stone-500">
              <Both en="Next: see who covers what you still lack — photos stay, scores stay explainable." el="Επόμενο: δες ποιος καλύπτει αυτό που λείπει — οι φωτογραφίες μένουν, τα σκορ εξηγούνται." />
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button type="button" onClick={openMatches} className="min-h-11 inline-flex items-center justify-center gap-2 px-5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800">
              <Both en="See matches" el="Δες αντιστοιχίσεις" />
              <ArrowRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={askAssistant} className="min-h-11 inline-flex items-center justify-center gap-2 px-5 rounded-xl border border-stone-200 bg-white text-sm font-semibold text-stone-900 hover:border-stone-900">
              <Sparkles className="w-4 h-4" />
              <Both en="Ask the assistant who to meet" el="Ρώτα τον βοηθό ποιον να γνωρίσεις" />
            </button>
          </div>
          <NavLink to="/signup" className="block text-sm font-medium text-stone-500 hover:text-stone-900">
            <Both en="Or create an account — this fit check is kept on this browser." el="Ή φτιάξε λογαριασμό — αυτό το fit check μένει σε αυτόν τον περιηγητή." />
          </NavLink>
        </main>
      )}
    </div>
  );
}
