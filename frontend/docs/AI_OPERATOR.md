# The studio assistant (AI operator)

The assistant is the centre of the product: it reads and changes the same lists
every page uses. This document is the map of how a sentence becomes an answer
or a change, and how to add a capability without breaking that contract.

## One turn

```
founder types ─► engine.respond()
                  │
                  ├─ 1. runAssistant(text, propose)        services/assistantOps.ts
                  │     deterministic router, instant, offline, same data as pages
                  │     matched? ──► reply (reads) or proposal card (writes)
                  │
                  ├─ 2. not matched (result.fallback === true)
                  │     AIService.plan(prompt, context, catalogue)   services/aiService.ts
                  │       └─ Gemini with function declarations from ai/catalog.ts
                  │     • function call → checkArgs() → action.command(args)
                  │         → runAssistant(command, propose)  (same code path,
                  │           so a write is still a card the founder confirms)
                  │     • missing / invalid argument → one clarifying question
                  │     • text → "AI answer" (badge in the chat)
                  │
                  └─ 3. no model / timeout / empty → "Not matched", honest copy,
                        page starters and a link to /assistant
```

Writes never happen without the founder's **Confirm**. Every write declares how
far **Undo** goes (`full` / `partial` / `none`) and the card says it.

## Files

| File | Role |
| --- | --- |
| `src/ai/catalog.ts` | The declaration of every capability: id, kind (read / write / navigate / preference), area, label, model-facing description, parameters (with closed sets), reversal, a canonical example, and `command(args)` — the sentence the router resolves. `toFunctionDeclarations()` is what Gemini receives. |
| `src/ai/engine.ts` | One turn: router → model → honest fallback. React-free and fully tested with a stub planner. |
| `src/services/assistantOps.ts` | The deterministic router and every tool's read/write/undo, against `lib/localLists` (the same lists the pages read). |
| `src/services/aiService.ts` | Gemini access. Proxy by default (`POST /api/ai/generate`), returns text **and** function calls; `plan()`, `status()`, circuit breaker. |
| `services/studioAreas.ts` | Pitch deck, legal checklist, focus time and saved searches — read/write/undo against the same lists. |
| `services/investorOps.ts`, `components/InvestorPipelineBoard.tsx` | Investor CRM: /pipeline read, add / move / next-step writes with per-investor undo; Fundraising → CRM board on the same `round.pipeline`. |
| `ai/engine.ts` → `routerPlan`, `isDraftRequest` | Multi-step plans: `a; b; c`, `… then …` or several model tool calls become separate proposals (max 5), each confirmed on its own. Draft requests (“write my problem and market slides”) go to the model. |
| `components/DailyNudge.tsx` | One AI-picked step a day on the Dashboard from `studioAudit()`. |
| `lib/aiLedger.ts`, `components/AiActionLedger.tsx` | Server-side ledger of every proposal (applied / cancelled / undone / failed) shown on the AI Studio. |
| `backend/server.py` | The platform API (FastAPI + MongoDB) and the AI proxy (Claude Opus 5.5, same `{text, functionCalls}` contract). |
| `server.ts` | Legacy local dev server (Node). The AI proxy: 8 MB body for slide images, model allow-list, output ceiling, config allow-list, per-member rate limit, `GET /api/ai/status`. |
| `src/components/ChatWidget.tsx` | The conversation UI — `floating` (corner panel on every page) and `page` (inline on `/assistant`). One persisted transcript for both. |
| `src/pages/AssistantPage.tsx` | The AI Studio: the conversation plus the capability list read from the catalogue, with read/write and undo badges and the model status. |
| `src/lib/assistantBus.ts` | `askAssistant(prompt, { context, agentId })` / `openAssistant()` — the only way a page hands something to the assistant. |
| `src/lib/pageRegistry.ts` | Every page once (labels EN/EL, title, icon, section, help, assistant keywords). Sidebar, ⌘K help, document titles, pins and the assistant derive from it. |
| `src/data/demoCatalog.ts`, `demoClock.ts`, `demoVenture.ts` | The sample account's dated items and venture story, shared by pages and the assistant so they never disagree. |

## Adding a capability

1. Implement the tool in `assistantOps.ts` (read: return a result; write: return
   a `proposal` with `apply` and, where honest, `undo`). Route a sentence to it in
   `resolveAssistant`. Use `hasStem()` — `\b` does not see Greek letters as word
   characters, which is why seventeen Greek phrasings used to fall through.
2. Declare it in `ai/catalog.ts` with an English **and** Greek `example`,
   `sampleArgs`, and a `command()` that produces a sentence the router resolves.
3. Run `npm test`. `src/ai/catalog.eval.test.ts` fails if the English or Greek
   example, or the command a model call turns into, does not reach the declared
   tool — or if a write would apply without a proposal. It also checks that every
   starter chip the studio suggests reaches a tool.

## Guarantees the tests hold

- `catalog.eval.test.ts` — 220+ routing cases (EN, EL, model commands, starters).
- `engine.test.ts` — router first; model answer vs. model tool; writes wait for
  Confirm; clarifying question for missing arguments; unknown tool names ignored;
  honest fallback on failure and timeout; recent turns passed for references.
- `ChatWidget.test.tsx` — Confirm/Cancel render and work, Undo restores, Cancel
  writes nothing, an unrecognised question is not answered with the briefing.
- `pageRegistry.test.ts` — every route in `App.tsx` has one registry entry with
  both languages.
