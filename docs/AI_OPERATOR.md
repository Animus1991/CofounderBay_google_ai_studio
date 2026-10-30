# The studio assistant (AI operator)

The assistant is the centre of the product: it reads and changes the same lists
every page uses. This document is the map of how a sentence becomes an answer
or a change, and how to add a capability without breaking that contract.

## One turn

```
founder types ─► engine.respond()                              src/ai/engine.ts
                  │
                  ├─ 0. several commands in one message?  splitCommands()
                  │     "add milestone X and add task Y" / "…, μετά …" / one per line
                  │     2–6 parts, every part a write the router knows
                  │     ──► one batch: a card per write + "Confirm all (n)"
                  │
                  ├─ 1. runAssistant(text, propose)        services/assistantOps.ts
                  │     deterministic router, instant, offline, same data as pages
                  │     (where-is, pipeline/follow-ups, briefing, 60+ tools)
                  │     matched? ──► reply (reads) or proposal card (writes)
                  │
                  ├─ 2. not matched (result.fallback === true)
                  │     AIService.plan({ prompt, contents, context, … })   services/aiService.ts
                  │       └─ Gemini with function declarations from ai/catalog.ts
                  │          text arrives as a stream (onText) when the proxy is on
                  │     • read call → run it, hand the result back to the model,
                  │       up to MAX_READS (3); the answer lists those reads as sources
                  │     • write call → checkArgs() → action.command(args)
                  │         → runAssistant(command, propose)  (same code path,
                  │           so a write is still a card the founder confirms)
                  │     • missing / invalid argument → one clarifying question
                  │     • text → "AI answer" (badge in the chat)
                  │
                  └─ 3. no model / timeout / empty / sign-in needed → "Not matched",
                        honest copy (and a sign-in link when the proxy asks for one),
                        page starters and a link to /assistant
```

Writes never happen without the founder's **Confirm** (or **Confirm all** for a
batch, which applies each card in order and offers one **Undo all**). Every write
declares how far **Undo** goes (`full` / `partial` / `none`) and the card says it.

## The proxy

`server/aiProxy.ts` (mounted by `server.ts`) is the only place the Gemini key is
used.

| Route | What it does |
| --- | --- |
| `GET /api/ai/status` | `{ configured, model, requiresSignIn }` — the studio shows this. |
| `POST /api/ai/generate` | One call; returns text and function calls. |
| `POST /api/ai/stream` | Server-sent events: `data: {"text": …}` chunks, then `{"done": true, "functionCalls": […]}` or `{"error": …}`. |

- **Who is calling.** A `Bearer` Firebase ID token is verified in
  `server/firebaseAuth.ts` (RS256 against Google's published certificates,
  issuer/audience/expiry checked, certificates cached) — no `firebase-admin`
  dependency. A bad token is always `401 invalid-token`. With
  `AI_REQUIRE_AUTH` on (the default in production) a missing token is
  `401 sign-in-required`; otherwise the call is served from a smaller anonymous
  bucket.
- **How much.** Per-uid buckets (`AI_RATE_LIMIT_PER_MINUTE`), anonymous calls at
  a third of that unless `AI_ANON_RATE_LIMIT_PER_MINUTE` says otherwise; `429`
  carries `Retry-After`.
- **What it forwards.** Models outside `GEMINI_MODEL` + `AI_MODEL_ALLOWLIST` fall
  back to `GEMINI_MODEL`; output is clamped to `AI_MAX_OUTPUT_TOKENS`; only known
  config keys are passed on.
- **From where.** `server/cors.ts`: `CORS_ORIGINS` (comma-separated, or `*`),
  else `APP_URL` in production and localhost in development. The same policy
  guards Socket.IO.

On the client, `AIProxyError.needsSignIn` lets the chat say "sign in to use the
model" instead of tripping the circuit breaker.

## Files

| File | Role |
| --- | --- |
| `src/ai/catalog.ts` | The declaration of every capability (67): id, kind (read / write / navigate / preference), area, label, model-facing description, parameters (with closed sets), reversal, a canonical example in English and Greek, and `command(args)` — the sentence the router resolves. `toFunctionDeclarations()` is what Gemini receives. |
| `src/ai/engine.ts` | One turn: batch → router → model (with the read loop) → honest fallback. React-free and fully tested with a stub planner. |
| `src/ai/whereIs.ts` | "Where is X?" — 33 places (page, section, control) with a "Take me there" link. |
| `src/services/assistantOps.ts` | The deterministic router and every tool's read/write/undo, against `lib/localLists` (the same lists the pages read). |
| `src/services/assistantPipeline.ts` | Investor pipeline, follow-ups and next steps, including EN/EL date parsing ("by Friday", "μέχρι την Παρασκευή", `14/11`). |
| `src/services/assistantText.ts` | `fold`, `hasStem`, `escapeRegExp` — accent- and case-insensitive matching that works for Greek. |
| `src/services/aiService.ts` | Gemini access. Proxy by default; `generateContent`, `generateContentStream` (SSE), `plan()`, `extractJson()`, `status()`, circuit breaker, `AIProxyError`. |
| `server/aiProxy.ts`, `server/firebaseAuth.ts`, `server/cors.ts` | The proxy, token verification and origin policy above. |
| `src/components/ChatWidget.tsx` | The conversation UI — `floating` (corner panel on every page) and `page` (inline on `/assistant`). One persisted transcript for both, synced across devices by `cloudSync`. Streams the model's text as it arrives; batches get "Confirm all". |
| `src/pages/AssistantPage.tsx` | The AI Studio: the conversation plus the capability list read from the catalogue, with read/write and undo badges and the model status. |
| `src/lib/assistantBus.ts` | `askAssistant(prompt, { context, agentId })` / `openAssistant()` — the only way a page hands something to the assistant. Prompts are translated to the founder's language first (`lib/promptLanguage.ts`). |
| `src/lib/profileFromText.ts` | "Describe yourself" in onboarding: free text → skills, industry, city, years, stage, commitment, headline (rules first, the model via `extractJson` when available). Fills empty fields only; Undo restores. |
| `src/lib/followUpAlerts.ts`, `src/lib/nextStep.ts` | Overdue investor follow-ups: one toast per follow-up, and first place in "Waiting on you". |
| `src/lib/pageRegistry.ts` | Every page once (labels EN/EL, title, icon, section, help, assistant keywords). Sidebar, ⌘K help, document titles, pins and the assistant derive from it. |
| `src/data/demoCatalog.ts`, `demoClock.ts`, `demoVenture.ts` | The sample account's dated items, pipeline and venture story, shared by pages and the assistant so they never disagree. |

## Adding a capability

1. Implement the tool in `assistantOps.ts` (read: return a result; write: return
   a `proposal` with `apply` and, where honest, `undo`). Route a sentence to it in
   `resolveAssistant`. Use `hasStem()` or `(?=\s|$)` — `\b` does not see Greek
   letters as word characters, which is why seventeen Greek phrasings used to
   fall through.
2. Declare it in `ai/catalog.ts` with an English **and** Greek `example`,
   `sampleArgs`, and a `command()` that produces a sentence the router resolves.
3. If it has a place on a page, add it to `ai/whereIs.ts`.
4. Run `npm test`. `src/ai/catalog.eval.test.ts` fails if the English or Greek
   example, or the command a model call turns into, does not reach the declared
   tool — or if a write would apply without a proposal. It also checks that every
   starter chip the studio suggests reaches a tool.

## Guarantees the tests hold

- `catalog.eval.test.ts` — 220+ routing cases (EN, EL, model commands, starters).
- `engine.test.ts` — router first; batches only when every part is a write;
  model answer vs. model tool; reads fed back and listed as sources, capped at
  three; text streamed to the caller as it is written; writes wait for Confirm;
  clarifying question for missing arguments; unknown tool names ignored; honest
  fallback on failure, timeout and sign-in.
- `assistantPipeline.test.ts`, `whereIs.test.ts`, `followUpAlerts.test.ts`,
  `profileFromText.test.ts`, `promptLanguage.test.ts` — the pieces above,
  including dates that must not match inside words ("money" is not Monday).
- `ChatWidget.test.tsx` — Confirm/Cancel render and work, Undo restores, Cancel
  writes nothing, Confirm all applies a batch in order with one Undo all.
- `server/aiProxy.test.ts`, `server/firebaseAuth.test.ts`, `server/cors.test.ts`
  — 401 without or with a bad token, anonymous bucket, `Retry-After`, model
  allow-list, SSE shape, signature/issuer/audience/expiry checks, origin policy.
- `e2e/assistant.spec.ts` — the same flows in a real browser: a batch confirmed
  and undone, follow-ups read and a next step set in Greek, where-is with its
  link, "Waiting on you" on the dashboard, a next step edited on the pipeline,
  onboarding filled from a description.
- `pageRegistry.test.ts` — every route in `App.tsx` has one registry entry with
  both languages; `bilingual.test.ts` — every translation key has EN and EL;
  `palette.test.ts` — status colours stay within the five hue families.
