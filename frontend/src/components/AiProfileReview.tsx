import { useState } from 'react';
import { ArrowRight, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useT, getLang } from '../lib/language';
import { keys, readValue, writeValue } from '../lib/localLists';
import { useStored } from '../lib/useStored';
import { useAuth } from '../App';
import { viewerFromAuth } from './ChatWidget';
import { askAssistant } from '../lib/assistantBus';
import { AIService } from '../services/aiService';
import { assistantContextBlock } from '../services/assistantOps';

type Review = {
  summary: string;
  strengths: string[];
  gaps: string[];
  actions: { label: string; prompt: string }[];
  lang: 'en' | 'el';
  at: string;
};

const SYSTEM = `You are the CoFounderBay studio reviewer. You review a founder's profile and studio data.
Use ONLY facts in the given context; never invent metrics, names or numbers. Do not state any overall score or percentage.
Return JSON: {"summary": string (max 35 words), "strengths": string[] (2-3, max 14 words each), "gaps": string[] (2-3, max 14 words each),
"actions": [{"label": string (max 6 words), "prompt": string}] (exactly 3)}.
Each action "prompt" must be a sentence the studio assistant understands, e.g. "Set the problem slide to …", "Mark EIN done",
"Change my headline to …", "Draft a need card for a CTO", "Who is my best match?", "What should I do first?".`;

function readReview(): Review | null {
  const value = readValue<Review | null>(keys.profileInsight, null);
  return value && Array.isArray(value.actions) ? value : null;
}

/** A real AI review of the founder's own profile, with next actions the assistant can carry out. */
export function AiProfileReview() {
  const t = useT();
  const { profile: authProfile } = useAuth();
  const profile = viewerFromAuth(authProfile);
  const review = useStored(readReview, [keys.profileInsight]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setBusy(true);
    setError('');
    const lang = getLang() === 'el' ? 'el' : 'en';
    try {
      const out = await AIService.json<Omit<Review, 'lang' | 'at'>>(
        `Write in ${lang === 'el' ? 'Greek' : 'English'}.\nProfile and studio context:\n${assistantContextBlock(profile)}\nBio: ${profile?.bio ?? ''}\nSkills: ${(profile?.skills ?? []).join(', ')}`,
        SYSTEM,
      );
      writeValue(keys.profileInsight, {
        summary: String(out.summary ?? ''),
        strengths: (out.strengths ?? []).slice(0, 3).map(String),
        gaps: (out.gaps ?? []).slice(0, 3).map(String),
        actions: (out.actions ?? []).slice(0, 3).filter((a) => a?.label && a?.prompt),
        lang,
        at: new Date().toISOString(),
      });
    } catch {
      setError(t('The AI review is unavailable right now. Your profile is unchanged — try again in a moment.', 'Η ανάλυση AI δεν είναι διαθέσιμη τώρα. Το προφίλ σου δεν άλλαξε — δοκίμασε ξανά σε λίγο.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="ai-profile-review" className="bg-white border border-stone-200 p-5 rounded-xl space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-stone-900">{t('AI review of your profile', 'Ανάλυση AI του προφίλ σου')}</h3>
        </div>
        <button
          type="button"
          data-testid="ai-profile-review-generate"
          onClick={() => { void generate(); }}
          disabled={busy}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-stone-200 px-3 text-xs font-medium text-stone-700 transition-colors hover:border-stone-400 hover:text-stone-900 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {review ? t('Refresh', 'Ανανέωση') : t('Review my profile', 'Ανάλυσε το προφίλ μου')}
        </button>
      </div>
      {!review && !busy && !error && (
        <p className="text-xs text-stone-500">{t('Three next steps from your profile, venture and round.', 'Τρία επόμενα βήματα από προφίλ, venture και γύρο.')}</p>
      )}
      {busy && <p className="text-xs text-stone-500" data-testid="ai-profile-review-loading">{t('Reading your studio…', 'Διαβάζω το studio σου…')}</p>}
      {error && <p className="text-xs text-red-600" data-testid="ai-profile-review-error">{error}</p>}
      {review && !busy && (
        <div className="space-y-3" data-testid="ai-profile-review-result">
          <p className="text-xs leading-relaxed text-stone-700">{review.summary}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ReviewList title={t('Strengths', 'Δυνατά σημεία')} items={review.strengths} tone="text-emerald-700" />
            <ReviewList title={t('Gaps', 'Κενά')} items={review.gaps} tone="text-amber-700" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-stone-500">{t('Let the assistant do it', 'Άφησε τον βοηθό να το κάνει')}</p>
            {review.actions.map((action, index) => (
              <button
                key={`${action.label}-${index}`}
                type="button"
                data-testid={`ai-profile-review-action-${index}`}
                onClick={() => askAssistant(action.prompt)}
                className="group flex w-full items-center justify-between gap-2 rounded-lg border border-stone-100 px-3 py-2 text-left text-xs text-stone-800 transition-colors hover:border-stone-300 hover:bg-stone-50"
              >
                <span>{action.label}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-stone-900" />
              </button>
            ))}
          </div>
          <p className="text-[11px] text-stone-400">{t('Generated by the AI model from your own data · changes still wait for your Confirm', 'Από το μοντέλο AI με βάση τα δικά σου δεδομένα · οι αλλαγές περιμένουν την Επιβεβαίωσή σου')}</p>
        </div>
      )}
    </div>
  );
}

function ReviewList({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div className="space-y-1">
      <p className={`text-xs font-semibold ${tone}`}>{title}</p>
      <ul className="space-y-1">
        {items.map((item, index) => <li key={index} className="text-xs text-stone-600">• {item}</li>)}
      </ul>
    </div>
  );
}
