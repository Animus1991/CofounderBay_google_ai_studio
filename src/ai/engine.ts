/**
 * One turn of the studio assistant.
 *
 * Order matters and is deliberate:
 *  1. **Router first.** The deterministic operator answers everything it
 *     recognises instantly, offline, with the same data the pages show. Most
 *     turns end here.
 *  2. **Model second, and only for what the router could not place.** Before
 *     this, an unrecognised question ("How should I price my SaaS?") was
 *     answered with the status briefing and then restated by Gemini — a
 *     confident reply to a question nobody asked. Now the model gets the
 *     question, the studio context and the declared action catalogue. It either
 *     calls one action — validated against its declaration and run through the
 *     same router in propose mode, so a write is still a card the person
 *     confirms — or answers in words.
 *  3. **Honesty last.** When neither can help (model not configured, cooling
 *     down after a failure, timed out, or returned nothing usable), the reply
 *     says so and offers what *can* be done, instead of guessing.
 *
 * Kept free of React so every branch is testable with a stub planner.
 */
import { assistantContextBlock, runAssistant, type AssistantFollowUp, type AssistantProfile, type AssistantResult } from '../services/assistantOps';
import { AIService, type GenerateResult } from '../services/aiService';
import { actionById, checkArgs, toFunctionDeclarations, type Bilingual } from './catalog';

export type EngineOrigin = 'router' | 'model-tool' | 'model-answer' | 'unmatched';

export type EngineResult = AssistantResult & {
  origin: EngineOrigin;
  /** The catalogue action the model chose, shown as "Understood as …". */
  interpretedAs?: { id: string; label: Bilingual };
};

export type Planner = (input: {
  prompt: string;
  context: string;
  functionDeclarations: unknown[];
  signal?: AbortSignal;
}) => Promise<GenerateResult>;

export type EngineOptions = {
  lang: 'en' | 'el';
  page: { href: string; en: string; el: string };
  /** Recent turns, oldest first, so the model can resolve "him" or "that". */
  history?: { role: 'user' | 'assistant'; text: string }[];
  /** Page-specific suggestions for the honest fallback. */
  suggestions?: AssistantFollowUp[];
  /** Overridable for tests; defaults to the Gemini planner. */
  planner?: Planner;
  timeoutMs?: number;
  signal?: AbortSignal;
};

const CAPABILITIES_LINK = { href: '/assistant', en: 'What I can do', el: 'Τι μπορώ να κάνω' };

function unmatched(reason: 'offline' | 'empty', options: EngineOptions): EngineResult {
  const why = reason === 'offline'
    ? {
        en: 'I could not match that to anything I can read or change in the studio, and the AI model is not reachable right now — so I will not guess.',
        el: 'Δεν μπόρεσα να το αντιστοιχίσω σε κάτι που διαβάζω ή αλλάζω στο studio, και το μοντέλο AI δεν είναι διαθέσιμο αυτή τη στιγμή — οπότε δεν θα μαντέψω.',
      }
    : {
        en: 'I could not match that to anything I can read or change in the studio, and I do not have a reliable answer to give.',
        el: 'Δεν μπόρεσα να το αντιστοιχίσω σε κάτι που διαβάζω ή αλλάζω στο studio, και δεν έχω αξιόπιστη απάντηση να δώσω.',
      };
  return {
    tool: 'unmatched',
    origin: 'unmatched',
    en: `${why.en} Try one of the questions below, or open the full list of what I can do.`,
    el: `${why.el} Δοκίμασε μία από τις ερωτήσεις παρακάτω ή άνοιξε τη λίστα με όσα μπορώ να κάνω.`,
    links: [CAPABILITIES_LINK],
    followUps: (options.suggestions ?? []).slice(0, 3),
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, controller: AbortController): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error('timeout'));
    }, ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

function promptFor(text: string, options: EngineOptions): string {
  const history = (options.history ?? [])
    .slice(-6)
    .map((turn) => `${turn.role === 'user' ? 'Founder' : 'Assistant'}: ${turn.text.slice(0, 400)}`)
    .join('\n');
  return `${history ? `Recent conversation:\n${history}\n\n` : ''}Founder: ${text}`;
}

/** Runs one assistant turn: router → model (tool or answer) → honest fallback. */
export async function respond(text: string, profile: AssistantProfile | null, options: EngineOptions): Promise<EngineResult> {
  const routed = runAssistant(text, profile, { propose: true });
  if (!routed.fallback) return { ...routed, origin: 'router' };

  const planner: Planner = options.planner ?? ((input) => AIService.plan(input));
  if (!options.planner && AIService.coolingDown) return unmatched('offline', options);

  const controller = new AbortController();
  options.signal?.addEventListener('abort', () => controller.abort(), { once: true });
  let decision: GenerateResult;
  try {
    decision = await withTimeout(
      planner({
        prompt: promptFor(text, options),
        context: `The founder is on the ${options.page.en} page (${options.page.href}).\n${assistantContextBlock(profile)}`,
        functionDeclarations: toFunctionDeclarations(),
        signal: controller.signal,
      }),
      options.timeoutMs ?? 12_000,
      controller,
    );
  } catch {
    return unmatched('offline', options);
  }

  const call = decision.functionCalls[0];
  if (call) {
    const action = actionById(call.name);
    if (action) {
      const checked = checkArgs(action, call.args);
      if (!checked.ok) {
        const need = [...checked.missing, ...checked.invalid].join(', ');
        return {
          tool: 'clarify',
          origin: 'model-tool',
          interpretedAs: { id: action.id, label: action.label },
          en: `I can ${action.label.en.toLowerCase()} — I just need: ${need}.`,
          el: `Μπορώ: ${action.label.el.toLowerCase()} — χρειάζομαι μόνο: ${need}.`,
          links: [CAPABILITIES_LINK],
          followUps: [action.example],
        };
      }
      const command = action.command(checked.args);
      const result = runAssistant(command, profile, { propose: true });
      if (!result.fallback) {
        return { ...result, origin: 'model-tool', interpretedAs: { id: action.id, label: action.label } };
      }
    }
  }

  const answer = decision.text?.trim();
  if (answer) {
    return {
      tool: 'answer',
      origin: 'model-answer',
      en: answer,
      el: answer,
      links: [],
      sources: [{ kind: 'page', en: options.page.en, el: options.page.el, href: options.page.href }],
    };
  }
  return unmatched('empty', options);
}
