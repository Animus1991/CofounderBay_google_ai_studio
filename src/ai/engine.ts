/**
 * One turn of the studio assistant.
 *
 * Order matters and is deliberate:
 *  1. **Several changes in one message.** "Add milestone Beta and add task Call
 *     the bank" becomes two proposal cards and a *Confirm all* — but only when
 *     every part is a change the router recognises on its own. Otherwise the
 *     message is read as one sentence (so "Ship design and launch" stays one
 *     milestone title).
 *  2. **Router first.** The deterministic operator answers everything it
 *     recognises instantly, offline, with the same data the pages show. Most
 *     turns end here. Two exceptions go to the model: a request to *write*
 *     content ("write my problem and market slides" — the router could only
 *     report status), and a router draft (an investor email) that the model
 *     rewrites from the same facts, the template staying as the offline copy.
 *  3. **Model second, and only for what the router could not place.** The model
 *     gets the question, the studio context and the declared action catalogue.
 *     - It may *read* first (up to three read actions — milestones, round,
 *       pipeline, follow-ups…). Each read runs through the router and its
 *       result goes back to the model, so an answer like "what should I focus
 *       on?" is grounded in the founder's own data, and the reply lists what
 *       was read ("Read from").
 *     - A write, navigation or preference it picks is validated against its
 *       declaration and run through the same router in propose mode, so it is
 *       still a card the person confirms. Several writes in one reply become a
 *       batch (one card each, plus Confirm all).
 *     - Or it answers in words, streamed as it is written when `onText` is given.
 *  4. **Honesty last.** When neither can help (model not configured, sign-in
 *     needed, cooling down, timed out, or nothing usable), the reply says so and
 *     offers what *can* be done, instead of guessing.
 *
 * Kept free of React so every branch is testable with a stub planner.
 */
import {
  assistantContextBlock,
  runAssistant,
  type AssistantFollowUp,
  type AssistantLink,
  type AssistantProfile,
  type AssistantResult,
  type AssistantSource,
} from '../services/assistantOps';
import { AIProxyError, AIService, type GenerateResult } from '../services/aiService';
import { actionById, checkArgs, toFunctionDeclarations, type ActionDeclaration, type Bilingual } from './catalog';

export type EngineOrigin = 'router' | 'model-tool' | 'model-answer' | 'unmatched';

export type EngineResult = AssistantResult & {
  origin: EngineOrigin;
  /** The catalogue action the model chose, shown as "Understood as …". */
  interpretedAs?: { id: string; label: Bilingual };
  /**
   * Several proposals from one turn — from one message with several commands, or
   * from several model tool calls. Each is confirmed, cancelled or undone on its
   * own, or all at once with Confirm all.
   */
  batch?: EngineResult[];
};

export type Planner = (input: {
  prompt: string;
  /** The conversation so far for this turn, including reads the model asked for. */
  contents: unknown[];
  context: string;
  functionDeclarations: unknown[];
  signal?: AbortSignal;
  onText?: (soFar: string) => void;
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
  /** Receives the model's answer as it is written. */
  onText?: (soFar: string) => void;
};

/** How many times the model may read studio data before it must answer. */
export const MAX_READS = 3;
/** The most changes one message may carry. */
export const MAX_BATCH = 6;

const CAPABILITIES_LINK = { href: '/assistant', en: 'What I can do', el: 'Τι μπορώ να κάνω' };
const SIGN_IN_LINK = { href: '/login', en: 'Sign in', el: 'Σύνδεση' };

type UnmatchedReason = 'offline' | 'empty' | 'sign-in';

function unmatched(reason: UnmatchedReason, options: EngineOptions): EngineResult {
  const why = {
    offline: {
      en: 'I could not match that to anything I can read or change in the studio, and the AI model is not reachable right now — so I will not guess.',
      el: 'Δεν μπόρεσα να το αντιστοιχίσω σε κάτι που διαβάζω ή αλλάζω στο studio, και το μοντέλο AI δεν είναι διαθέσιμο αυτή τη στιγμή — οπότε δεν θα μαντέψω.',
    },
    empty: {
      en: 'I could not match that to anything I can read or change in the studio, and I do not have a reliable answer to give.',
      el: 'Δεν μπόρεσα να το αντιστοιχίσω σε κάτι που διαβάζω ή αλλάζω στο studio, και δεν έχω αξιόπιστη απάντηση να δώσω.',
    },
    'sign-in': {
      en: 'I could not match that to a studio action, and open questions go to the AI model, which needs you to be signed in.',
      el: 'Δεν το αντιστοίχισα σε ενέργεια του studio, και οι ανοιχτές ερωτήσεις πάνε στο μοντέλο AI, που χρειάζεται να έχεις συνδεθεί.',
    },
  }[reason];
  return {
    tool: 'unmatched',
    origin: 'unmatched',
    en: `${why.en} Try one of the questions below, or open the full list of what I can do.`,
    el: `${why.el} Δοκίμασε μία από τις ερωτήσεις παρακάτω ή άνοιξε τη λίστα με όσα μπορώ να κάνω.`,
    links: reason === 'sign-in' ? [SIGN_IN_LINK, CAPABILITIES_LINK] : [CAPABILITIES_LINK],
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

// ── Several changes in one message ─────────────────────────────────────────

/** Line breaks and semicolons always separate; "and"/"then"/"και" only between full commands. */
const HARD_BREAK = /\s*(?:\r?\n+|;)\s*/;
const SOFT_BREAK = /(?:\s*,)?\s+(?:and then|then|and also|and|also)\s+|(?:\s*,)?\s+(?:και μετά|και επίσης|μετά|και)\s+/i;

/** Candidate parts of a message that may hold several commands. */
export function splitCommands(text: string): string[] {
  const parts = text
    .split(HARD_BREAK)
    .flatMap((piece) => piece.split(SOFT_BREAK))
    .map((piece) => piece.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter((piece) => piece.length > 2);
  return parts.length >= 2 && parts.length <= MAX_BATCH ? parts : [];
}

function batchResult(steps: EngineResult[], origin: EngineOrigin): EngineResult {
  const count = steps.length;
  return {
    tool: 'batch',
    origin,
    en: `${count} changes — confirm each one, or all of them at once. Nothing changes until you confirm, and each can be undone on its own.`,
    el: `${count} αλλαγές — επιβεβαίωσε την καθεμία ή όλες μαζί. Τίποτα δεν αλλάζει πριν επιβεβαιώσεις, και καθεμία αναιρείται χωριστά.`,
    links: [],
    batch: steps,
  };
}

function batchFor(text: string, profile: AssistantProfile | null): EngineResult | null {
  const parts = splitCommands(text);
  if (parts.length < 2) return null;
  const results = parts.map((part) => runAssistant(part, profile, { propose: true }));
  // Only when every part is, on its own, a change the router recognises.
  if (!results.every((result) => !result.fallback && result.proposal)) return null;
  return batchResult(results.map((result) => ({ ...result, origin: 'router' as const })), 'router');
}

// ── Content the router cannot write ────────────────────────────────────────

/**
 * "Write my problem and market slides" asks for content the router cannot author —
 * it would only report status. These go straight to the model, which drafts one
 * set_pitch_slide call per slide (a batch when there are several).
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

// ── The model, with reads ──────────────────────────────────────────────────

type Read = { action: ActionDeclaration; result: AssistantResult };

function readSources(reads: Read[]): AssistantSource[] {
  const seen = new Set<string>();
  const sources: AssistantSource[] = [];
  for (const { action, result } of reads) {
    const fromResult = result.sources?.length
      ? result.sources
      : [{ kind: action.tool, en: action.label.en, el: action.label.el, href: result.href ?? '/assistant' }];
    for (const source of fromResult) {
      const key = `${source.kind}:${source.en}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push(source);
    }
  }
  return sources;
}

function readLinks(reads: Read[]): AssistantLink[] {
  const links: AssistantLink[] = [];
  for (const { result } of reads) {
    for (const link of result.links) {
      if (!links.some((item) => item.href === link.href)) links.push(link);
    }
  }
  return links.slice(0, 3);
}

const DRAFT_HINT = '\n\n(The founder wants the content written. Call set_pitch_slide once for every slide they named, with text you write from the studio context — 1-3 sentences each, no invented numbers.)';

/** Runs one assistant turn: batch → router (or a draft for the model) → model (reads, then tools or an answer) → honest fallback. */
export async function respond(text: string, profile: AssistantProfile | null, options: EngineOptions): Promise<EngineResult> {
  const batch = batchFor(text, profile);
  if (batch) return batch;

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
  const prompt = `${promptFor(text, options)}${drafting ? DRAFT_HINT : ''}`;
  const context = `The founder is on the ${options.page.en} page (${options.page.href}).\n${assistantContextBlock(profile)}`;
  const contents: unknown[] = [{ role: 'user', parts: [{ text: prompt }] }];
  const reads: Read[] = [];

  for (let step = 0; step <= MAX_READS; step += 1) {
    let decision: GenerateResult;
    try {
      decision = await withTimeout(
        planner({ prompt, contents, context, functionDeclarations: toFunctionDeclarations(), signal: controller.signal, onText: options.onText }),
        options.timeoutMs ?? 12_000,
        controller,
      );
    } catch (error) {
      if (reads.length) break;
      if (error instanceof AIProxyError && error.needsSignIn) return unmatched('sign-in', options);
      return offline();
    }

    // Several changes at once ("write my problem and market slides"): one card each.
    const writes = decision.functionCalls
      .map((each) => ({ each, action: actionById(each.name) }))
      .filter((entry): entry is { each: typeof entry.each; action: ActionDeclaration } => entry.action?.kind === 'write');
    if (writes.length > 1) {
      const steps: EngineResult[] = [];
      for (const { each, action } of writes.slice(0, MAX_BATCH)) {
        const checked = checkArgs(action, each.args);
        if (!checked.ok) continue;
        const result = runAssistant(action.command(checked.args), profile, { propose: true });
        if (!result.fallback && result.proposal) steps.push({ ...result, origin: 'model-tool', interpretedAs: { id: action.id, label: action.label } });
      }
      if (steps.length >= 2) return batchResult(steps, 'model-tool');
      if (steps.length === 1) return steps[0]!;
    }

    const call = decision.functionCalls[0];
    const action = call ? actionById(call.name) : undefined;
    if (call && action) {
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
      const result = runAssistant(action.command(checked.args), profile, { propose: true });
      if (!result.fallback) {
        if (action.kind === 'read' && step < MAX_READS) {
          // Give the model what it asked to read, and let it answer from it.
          reads.push({ action, result });
          contents.push({ role: 'model', parts: [{ functionCall: { name: action.id, args: checked.args } }] });
          contents.push({
            role: 'user',
            parts: [{ functionResponse: { name: action.id, response: { result: options.lang === 'el' ? result.el : result.en, page: result.href ?? null } } }],
          });
          continue;
        }
        const sources = [...readSources(reads), ...(result.sources ?? [])];
        return { ...result, origin: 'model-tool', interpretedAs: { id: action.id, label: action.label }, sources: sources.length ? sources : undefined };
      }
    }

    const answer = decision.text?.trim();
    if (answer) {
      const pageSource: AssistantSource = { kind: 'page', en: options.page.en, el: options.page.el, href: options.page.href };
      return {
        tool: 'answer',
        origin: 'model-answer',
        en: answer,
        el: answer,
        links: readLinks(reads),
        sources: reads.length ? readSources(reads) : [pageSource],
      };
    }
    break;
  }

  // The model read but did not write an answer: show the last thing it read, as read.
  const last = reads.at(-1);
  if (last) {
    return { ...last.result, origin: 'model-tool', interpretedAs: { id: last.action.id, label: last.action.label }, sources: readSources(reads) };
  }
  return unmatched('empty', options);
}
