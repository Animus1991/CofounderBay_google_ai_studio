# CoFounderBay — PRD (upgrade of branch claude/ai-os-upgrade)

## Original problem statement (summary, Greek original)
Do a thorough audit of https://github.com/Animus1991/CofounderBay_google_ai_studio.git (branch `claude/ai-os-upgrade`).
Keep and extend every existing feature. Make the AI chat the central operator that reads, changes and fills in everything.
Make the UI/UX consistent and the data architecture coherent. Write a plan, then implement it.
User choices: bring the repo here and upgrade it · Claude Opus 5.5 · priorities: UX consistency + AI that controls everything + architecture/storage.

## Architecture
- Frontend: the repo's Vite + React 19 + TS app in /app/frontend (`yarn start` → vite on :3000). Demo mode is the default. Firebase Auth/Firestore stay in place for real accounts.
- Backend: FastAPI + MongoDB in /app/backend/server.py. It replaces the in-memory Express mock: tenants, users, deterministic matches, mentors, communities, conversations and messages, the AI proxy (/api/ai/generate, /api/ai/status, Claude Opus 5.5 via EMERGENT_LLM_KEY, with the Gemini-compatible {text, functionCalls} contract), the AI action ledger (/api/ai/actions) and the ai_usage log. Seed data comes from backend/seed.json.

## Implemented (2026-06)
- 7 new AI catalogue actions: studio_audit, read_pitch_deck, set_pitch_slide, read_legal_checklist, set_legal_item, focus_today, saved_searches (69 actions in total). They have EN/EL routing, confirm and undo, and eval tests.
- Server-side AI action ledger and an "Action history" panel. "Run a studio check" button on /assistant.
- A real AI profile review on /profile, with 3 next actions you can run.
- Shared libs lib/legalChecklist.ts and lib/focusStats.ts. Founder Tools accepts ?tab= and ?slide=. The demo pitch deck keeps its drafts.
- Plain-text AI replies (no raw Markdown). Rate limit per real client IP. Validated tenant patches (400/422).
- Messages layout gutter fix, data-testids on chat controls, vitest timeout 20 s.
- Docs: docs/AUDIT_AND_PLAN.md (Greek audit and plan), plus updated AI_OPERATOR.md and README.
- Tests: 530 vitest tests and 28 backend pytest tests pass. Testing agent iterations 1–2 passed.

## Iteration 2 (2026-06)
- Investor CRM: Fundraising → CRM tab (`?tab=crm`). It is a kanban board by stage with check size, next step and date, overdue flags, stage history, add, move and remove. The assistant gets add_investor, move_investor and set_investor_next (each with a per-investor undo), and /pipeline reads the board. The demo EcoFlow pipeline now lives in defaultRound().
- Daily Studio Nudge on the Dashboard: the AI picks one gap a day from studioAudit(), with a deterministic fallback. It has "Do it with the assistant" and "Done" buttons and is cached per day under keys.nudge.
- Multi-step plans: "a; b; c" or "… then …", or several model tool calls, become a plan. Each step is a separate proposal with its own Confirm, Cancel and Undo, up to 5 steps.
- Coherent demo story: the demo founder is now EcoFlow Systems (CleanTech/Water). Readiness is 68 everywhere (Founder Tools, Profile, Insights series). The own-profile insight reads the studio check.

## Backlog
- P0: Due-diligence and cap table as stored data. Server backup of the demo workspace.
- P1: Streaming for specialists. A 'Confirm all' option for plans.
- P2: Align headers in Admin/Messages/Profile. An a11y pass.
