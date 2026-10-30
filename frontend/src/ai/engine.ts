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
  /** A multi-step plan: each step is its own proposal the person confirms, skips or undoes. */
  plan?: EngineResult[];
};

const MAX_PLAN_STEPS = 5;

function planResult(steps: EngineResult[], origin: EngineOrigin): EngineResult {
  const n = steps.length;
  return {
    tool: 'plan',
    origin,
    en: `Plan: ${n} changes. Confirm each one below — nothing changes until you do, and every step can be undone on its own.`,
    el: `Πλάνο: ${n} αλλαγές. Επιβεβαίωσε την καθεμία παρακάτω — τίποτα δεν αλλάζει χωρίς εσένα και κάθε βήμα αναιρείται χωριστά.`,
    links: [],
    plan: steps,
  };
}

/** "Set the problem slide to X; mark EIN done" — two or more router writes become one plan. */
function routerPlan(text: string, profile: AssistantProfile | null): EngineResult | null {
  const parts = text.split(/\s*(?:;|\n|\s+then\s+|\s+και μετά\s+|\s+μετά\s+)\s*/i).map((part) => part.trim()).filter((part) => part.length > 2);
  if (parts.length < 2) return null;
  const writes: EngineResult[] = [];
  for (const part of parts.slice(0, MAX_PLAN_STEPS)) {
    const step = runAssistant(part, profile, { propose: true });
    if (!step.proposal || step.fallback) return null; // any non-write part → not a plan
    writes.push({ ...step, origin: 'router' });
  }
  return writes.length >= 2 ? planResult(writes, 'router') : null;
}

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
  /** Overridable for tests; rewrites a router draft (investor email) from its facts. */
  writer?: (prompt: string, system: string) => Promise<{ subject?: string; body?: string }>;
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
/**
 * "Write my problem and market slides" asks for content the router cannot author —
 * it would only report status. These go straight to the model, which drafts one
 * set_pitch_slide call per slide (a plan when there are several).
 */
export function isDraftRequest(text: string): boolean {
  const folded = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/[:]|\bslide\s+(?:to|as)\b|\bσε\s+«/.test(folded)) return false;
  return /\b(write|draft|fill(?:\s+in)?|generate|create|prepare)\b.{0,60}\b(slides?|pitch\s+deck)\b/.test(folded)
    || /(γραψε|συμπληρωσε|ετοιμασε|συνταξε).{0,60}(διαφανει|pitch)/.test(folded);
}

const DRAFT_SYSTEM = `You write short, specific founder-to-investor emails. Use ONLY the facts given — never invent metrics, names, dates or amounts.
Max 140 words in the body. Warm, direct, no hype, no Markdown. Sign with the sender name. Return JSON {"subject": string, "body": string}.`;

/** The template is already a complete email; the model only rewrites it from the same facts when reachable. */
async function writeDraft(routed: AssistantResult, options: EngineOptions): Promise<EngineResult> {
  const fallback: EngineResult = { ...routed, origin: 'router' };
  const write = options.writer ?? (AIService.coolingDown ? null : (prompt: string, system: string) => AIService.json<{ subject?: string; body?: string }>(prompt, system));
  if (!write || !routed.draft) return fallback;
  try {
    const out = await write(`Write in ${options.lang === 'el' ? 'Greek' : 'English'}.\nFacts:\n${routed.draft.facts}\n\nTemplate to improve:\n${routed.en}`, DRAFT_SYSTEM);
    const subject = String(out.subject ?? '').trim();
    const body = String(out.body ?? '').trim();
    if (!subject || body.length < 40) return fallback;
    const text = `Subject: ${subject}\n\n${body}`;
    return { ...routed, en: text, el: text, origin: 'model-answer' };
  } catch {
    return fallback;
  }
}

export async function respond(text: string, profile: AssistantProfile | null, options: EngineOptions): Promise<EngineResult> {
  const planned = routerPlan(text, profile);
  if (planned) return planned;
  const drafting = isDraftRequest(text);
  const routed = drafting ? null : runAssistant(text, profile, { propose: true });
  if (routed && !routed.fallback) {
    if (routed.draft) return writeDraft(routed, options);
    return { ...routed, origin: 'router' };
  }

  const planner: Planner = options.planner ?? ((input) => AIService.plan(input));
  const offline = (): EngineResult => {
    const status = drafting ? runAssistant(text, profile, { propose: true }) : null;
    return status && !status.fallback ? { ...status, origin: 'router' } : unmatched('offline', options);
  };
  if (!options.planner && AIService.coolingDown) return offline();

  const controller = new AbortController();
  options.signal?.addEventListener('abort', () => controller.abort(), { once: true });
  let decision: GenerateResult;
  try {
    decision = await withTimeout(
      planner({
        prompt: drafting
          ? `${promptFor(text, options)}\n\n(The founder wants the content written. Call set_pitch_slide once for every slide they named, with text you write from the studio context — 1-3 sentences each, no invented numbers.)`
          : promptFor(text, options),
        context: `The founder is on the ${options.page.en} page (${options.page.href}).\n${assistantContextBlock(profile)}`,
        functionDeclarations: toFunctionDeclarations(),
        signal: controller.signal,
      }),
      options.timeoutMs ?? 12_000,
      controller,
    );
  } catch {
    return offline();
  }

  if (decision.functionCalls.length > 1) {
    const steps: EngineResult[] = [];
    for (const each of decision.functionCalls.slice(0, MAX_PLAN_STEPS)) {
      const action = actionById(each.name);
      if (!action || action.kind !== 'write') continue;
      const checked = checkArgs(action, each.args);
      if (!checked.ok) continue;
      const result = runAssistant(action.command(checked.args), profile, { propose: true });
      if (!result.fallback && result.proposal) steps.push({ ...result, origin: 'model-tool', interpretedAs: { id: action.id, label: action.label } });
    }
    if (steps.length >= 2) return planResult(steps, 'model-tool');
    if (steps.length === 1) return steps[0]!;
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
