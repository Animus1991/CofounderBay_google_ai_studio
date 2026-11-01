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
                  │     (where-is, pipeline/follow-ups, due diligence, pitch, legal,
                  │     studio check, briefing, 70+ tools)
                  │     matched? ──► reply (reads) or proposal card (writes)
                  │     an investor email draft ──► the model rewrites it from the
                  │       same facts (writeDraft); the template is the offline copy
                  │     "write my slides / fill my canvas / draft my builder
                  │       module" (draftTarget) ──► straight to the model, which
                  │       calls one write per part → a batch of cards
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
| `src/ai/catalog.ts` | The declaration of every capability (87): id, kind (read / write / navigate / preference), area, label, model-facing description, parameters (with closed sets), reversal, a canonical example in English and Greek, and `command(args)` — the sentence the router resolves. `toFunctionDeclarations()` is what Gemini receives. |
| `src/ai/engine.ts` | One turn: batch → router → model (with the read loop) → honest fallback. React-free and fully tested with a stub planner. |
| `src/ai/whereIs.ts` | "Where is X?" — 33 places (page, section, control) with a "Take me there" link. |
| `src/services/assistantOps.ts` | The deterministic router and every tool's read/write/undo, against `lib/localLists` (the same lists the pages read). |
| `src/services/assistantPipeline.ts` | The one implementation of investor reads and writes: pipeline (stage, check size, next step), follow-ups, move, add (optionally at a stage), next step with EN/EL dates ("by Friday", «μέχρι την Παρασκευή», `14/11`), `/investor add|move|next` and `/pipeline`. Every undo restores exactly that investor (stage history included). |
| `src/services/investorOps.ts` | Stage-aware follow-up email drafts from the founder's own data, and `overdueInvestors()` for the daily step and Notifications. |
| `src/services/ddOps.ts`, `src/lib/dueDiligence.ts` | Due diligence: 12 standard items in 5 categories, status, notes, data-room hints, and read-only share links (server/outreach). |
| `src/services/studioAreas.ts` | Pitch slides, the Legal Hub checklist, today's focus time and saved searches, read and written by the assistant. `studioAudit()` (assistantOps) scores eight areas for the studio check, the daily step and the profile insight. |
| `src/services/assistantText.ts` | `fold`, `hasStem`, `escapeRegExp` — accent- and case-insensitive matching that works for Greek. |
| `src/services/assistantTime.ts` | `parseTime` — clock times in both languages ("3pm", "15:30", «στις 3», «3 μ.μ.») on folded text, with date/amount negatives. |
| `src/lib/agenda.ts` | `agendaFor(today | tomorrow | week)` — sessions, milestones, investor follow-ups and task deadlines in one sorted list (the `read_agenda` read). |
| `src/lib/eventRegistration.ts` | `setEventRegistration(event, on)` — the one write path for event registration the Events page toggle and the assistant (`register_event`, `update_session` on `evt-` ids) share. |
| `src/services/aiService.ts` | Gemini access. Proxy by default; `generateContent`, `generateContentStream` (SSE), `plan()`, `extractJson()`, `status()`, circuit breaker, `AIProxyError`. |
| `server/aiProxy.ts`, `server/firebaseAuth.ts`, `server/cors.ts`, `server/identity.ts` | The proxy, token verification, origin policy and the one caller rule shared with outreach. |
| `server/outreach.ts`, `server/email.ts`, `server/digest.ts` | Due-diligence share links (public view counts; files kept apart in chunks and deleted on revoke), provider-agnostic email (queued without a provider), the weekly investor digest and its cron endpoint (each week claimed in the store before sending, so overlapping runs send once). |
| `server/store.ts`, `server/firestoreStore.ts`, `server/outreachStore.ts` | The store behind outreach: one async interface (get / put / find by equality / insert with a per-owner cap / transactional update / remove) with memory, JSON-file and Firestore backends. Firestore is the default on Cloud Run (`OUTREACH_STORE`). `store.contract.ts` is the behaviour every backend must pass. |
| `src/lib/entities.ts`, `src/lib/outreachQueries.ts` | The shared data layer (docs/DATA_LAYER.md): typed records the pages and the assistant read alike — one `ventureName()` for every screen — and the query cache for outreach server data, which the assistant's writes (a share link created, an email sent) refresh too. |
| `src/lib/aiLedger.ts`, `src/components/AiActionLedger.tsx` | The action history: every proposal and what the founder did with it — an account list, synced like the others. |
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
- `investorOps.test.ts`, `ddOps.test.ts`, `studioAreas.test.ts` — the other agent's
  scenarios, kept as regressions for the merged implementation (batch, slash forms,
  drafts, share links).
- `server/outreach.test.ts` — sign-in required, owner-only lists and revokes, public
  views counted, bad files and second recipients refused, a 1.2 MB file kept whole
  across chunks and deleted on revoke, digest schedule once per ISO week in the
  person's zone, overlapping runs send once, cron behind its secret.
- `server/store.test.ts` — the store contract on memory and JSON files (and a failed
  save logged, not fatal); `server/firestoreStore.test.ts` runs the same contract on
  the Firestore emulator in CI.
- `tests/rules/*.rules.test.ts` (`npm run test:emulator`, CI job "Firestore rules ·
  store") — the security rules against the emulators: server-only collections
  closed to every client, the Verified badge only from a confirmed address, a
  suspension lifted only by an admin, connection requests answered only by the
  person asked, endorsements only in your own name, community membership changed
  only for yourself, messages only between participants, storage folders private
  to list.
- `e2e/outreach.spec.ts`, `e2e/a11y.spec.ts` — CRM board and email, a due-diligence
  link opened and revoked, the studio check; no serious axe violations on ten screens.
- `pageRegistry.test.ts` — every route in `App.tsx` has one registry entry with
  both languages; `bilingual.test.ts` — every translation key has EN and EL;
  `palette.test.ts` — status colours stay within the five hue families.
