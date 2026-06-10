# CoFounderBay — Production-Scale Roadmap

> **Goal:** evolve CoFounderBay from a feature-rich MVP into a **production-grade,
> state-of-the-art** product — without removing any existing functionality, only optimizing it.
>
> This roadmap is the single source of truth for the productionization effort. It records what
> has been delivered and prioritizes what remains. Status legend: ✅ done · 🟡 in progress ·
> ⬜ planned.

---

## 0. Production Foundation — ✅ DELIVERED

The architectural foundation that lets the app "break free from the MVP". All additive and
non-breaking; `npm run validate` is green (typecheck + lint 0 errors + tests passing).

### Configuration & security
- ✅ `src/config/env.ts` — typed, validated, centralized environment access (`appEnv`, `validateEnv`).
- ✅ `src/firebase.ts` — env-first Firebase config with JSON fallback (multi-environment ready).
- ✅ `.env.example` — documents every variable (AI, app, Firebase, observability).
- ✅ `.npmrc` — pins `legacy-peer-deps` so installs/CI are reproducible (fixes the React 19 ↔
  `react-window` peer conflict); `overrides` dedupes Vite.

### Observability
- ✅ `src/lib/logger.ts` — scoped, level-aware structured logging.
- ✅ `src/lib/errorTracking.ts` — provider-agnostic capture (Sentry-ready) wired into the logger,
  `window.onerror`, `unhandledrejection`, and the React `ErrorBoundary`.
- ✅ `src/lib/analytics.ts` — provider-agnostic analytics with a centralized event taxonomy.
- ✅ `src/lib/bootstrap.ts` — one-time init invoked from `main.tsx`.

### Data & state layer
- ✅ `src/lib/apiClient.ts` — typed fetch client (timeout, retry/backoff, normalized `ApiError`).
- ✅ `src/lib/queryClient.ts` — TanStack Query client + hierarchical `queryKeys`; wired via
  `QueryClientProvider` in `App.tsx`.
- ✅ `src/stores/useUIStore.ts` — Zustand UI store (sidebar/theme persisted); `Layout.tsx` migrated.

### Tooling & quality gates
- ✅ ESLint 9 flat config (`eslint.config.js`) + Prettier + EditorConfig + `.nvmrc`.
- ✅ `package.json` — professional metadata, scripts (`typecheck`, `lint`, `format`, `test`,
  `validate`), engines, dependencies (React Query, Zustand, Vitest, ESLint, Prettier).
- ✅ `tsconfig.json` hardened safely + `tsconfig.strict.json` as the incremental strict target.

### Testing & CI/CD
- ✅ Vitest + Testing Library (`vitest.config.ts`, `src/test/setup.ts`) + sample tests.
- ✅ GitHub Actions CI (`.github/workflows/ci.yml`): typecheck → lint → test → build.

### PWA & SEO
- ✅ `public/manifest.webmanifest`, `public/icon.svg`, `public/robots.txt`.
- ✅ `index.html` enriched: PWA, Open Graph, Twitter cards, apple-touch-icon.

### Real bugs fixed (surfaced by the new tooling)
- ✅ `BrandingSettings.tsx` — Rules-of-Hooks violation (`useState` after early return) fixed.
- ✅ `FounderTools.tsx` — `useTool` (an event handler) renamed to `markToolUsed` (was masquerading
  as a hook and tripping linting).

---

## 1. Type Safety & Code Health — �

- ✅ **`strict: true` is now LIVE in the base `tsconfig.json`** (plus `noImplicitReturns`,
  `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`) — ~100 genuine type-safety errors
  fixed across services, context, layout and pages. `npm run typecheck` enforces it.
- ✅ **Removed 12 duplicate/dead pages**: `Dashboard.tsx`, `Communities.tsx`, `Matches.tsx`,
  `Mentors.tsx`, `Messages.tsx`, `MessagesPage.tsx`, `Milestones.tsx`, `Profile.tsx`, `Landing.tsx`,
  `Login.tsx`, `Onboarding.tsx`, `admin/AdminDashboard.tsx` (kept `TenantLanding.tsx` — unique
  multi-tenant surface, pending routing).
- ⬜ Replace `as any` casts with precise types; burn down remaining ESLint warnings (unused
  symbols are delegated to ESLint `no-unused-vars`, not tsc).
- ⬜ Make `lint` fail on warnings in CI once the warning count hits zero.
- ⬜ Reformat the codebase with Prettier (the legacy double-spaced files) in a single dedicated PR.

## 2. Data Layer Migration (mock → real) — ⬜

- ⬜ Migrate page data fetching to TanStack Query hooks over Firestore/`apiClient`
  (`useProfile`, `useMatches`, `useConversations`, `useMilestones`, …) using `queryKeys`.
- ⬜ Replace hardcoded mock data (dashboard KPIs, events, mentors, communities, fundraising,
  network, etc.) with Firestore collections per the data model in `firestore.rules`.
- ⬜ Add optimistic updates + cache invalidation for mutations (connections, messages, milestones).
- ⬜ Add skeleton/empty/error states uniformly (the `ui/` primitives already exist).

## 3. Backend & Security — 🟡

- ✅ **AI proxy implemented**: `POST /api/ai/generate` in `server.ts` keeps `GEMINI_API_KEY`
  server-side with per-IP rate limiting (`AI_RATE_LIMIT_PER_MINUTE`, default 30/min).
  The client (`aiService.ts`) routes through it when `VITE_AI_USE_PROXY` is true — the
  **default in production builds** — and `validateEnv()` warns if a key would ship client-side.
- ⬜ Promote the in-memory `server.ts` to either (a) Firebase Functions, or (b) a real API service;
  persist conversations/messages to Firestore (rules already exist).
- ⬜ Input validation (Zod) on all write paths; harden Firestore rules with tests
  (`@firebase/rules-unit-testing`).
- ✅ Dependency vulnerabilities remediated: `npm audit fix` (non-breaking) + `vitest@^3.2.6`
  upgrade — **0 vulnerabilities** (was 14: 2 critical, 3 high, 9 moderate).
- ⬜ Secrets management: move all keys to host/CI secrets; never commit live config.

## 4. Feature Completeness — ⬜

Per-page hardening (carry over the relevant items from `UPGRADE_PLAN.md`, now reframed for
production rather than UI polish only):
- ⬜ **Dashboard** — real KPIs, activity feed, readiness widget from live data.
- ⬜ **Profile** — completion flow, skills, endorsements, public view.
- ⬜ **Matching/Discovery** — filters, saved profiles, debounced search, real scoring service.
- ⬜ **Messaging** — persistence, typing indicators, reactions, attachments, presence.
- ⬜ **Fundraising** — investor CRM, pipeline, data room.
- ⬜ **Milestones** — kanban/timeline, assignments, due-date alerts.
- ⬜ **Admin** — charts, bulk actions, automation rule builder, SSO wizard, billing (Stripe).

## 5. Performance — ⬜

- ⬜ Dynamic-import heavy libs (Recharts) and route-level prefetch for hot routes.
- ⬜ Virtualize long lists (`react-window` is already a dependency) for matches/messages/feeds.
- ⬜ Image lazy-loading + responsive sizes + avatar fallbacks without 404s.
- ⬜ Add a Service Worker (offline shell, asset caching) — manifest already in place.
- ⬜ Bundle-size budget in CI; analyze with `rollup-plugin-visualizer`.

## 6. Observability & Analytics (go live) — ⬜

- ⬜ Wire a real error-tracking provider (Sentry) via `initErrorTracking()` + `VITE_SENTRY_DSN`.
- ⬜ Wire a real analytics provider (PostHog/Segment) via `initAnalytics()`; instrument the
  `AnalyticsEvent` taxonomy across key funnels (signup, onboarding, match, message, checkout).
- ⬜ Add Web Vitals reporting and a basic uptime/health check.

## 7. Testing & QA — ⬜

- ⬜ Unit tests for `services/` (matching, scoring, billing) and `lib/` (apiClient request paths).
- ⬜ Component tests for critical flows (auth guard, onboarding, messaging).
- ✅ **Playwright E2E installed and green**: `playwright.config.ts` + `e2e/smoke.spec.ts`
  (6 tests: landing/login/pricing titles, 404 page + recovery, offline indicator) with a
  dedicated CI job (`e2e`) uploading reports on failure. `npm run test:e2e`.
- ⬜ Extend E2E to authed journeys (signup → onboarding → match → message) once test
  accounts/emulator wiring exists.
- ⬜ Coverage threshold gate (start ~50%, ratchet up).

## 8. Accessibility & i18n — ⬜

- ⬜ A11y pass: `aria-label`s on icon buttons, focus management, skip-to-content, contrast,
  screen-reader announcements for toasts.
- ⬜ Keyboard navigation everywhere (Cmd/Ctrl-K palette already exists).
- ⬜ Externalize strings; add i18n scaffolding (the product is global by design).

## 9. DevOps & Deployment — ⬜

- ⬜ Preview deployments per PR; production deploy workflow (Firebase Hosting / Vercel / Netlify).
- ⬜ Environments: dev / staging / prod with separate Firebase projects (env-first config ready).
- ⬜ Dependabot/Renovate for dependency hygiene; CodeQL for security scanning.
- ⬜ Release process: Conventional Commits → automated CHANGELOG + semver.

## 10. Compliance & Trust — ⬜

- ⬜ Privacy policy, terms, cookie consent; GDPR data export/delete flows.
- ⬜ Audit logging for admin/sensitive actions.
- ⬜ Rate limiting and abuse prevention on social/messaging surfaces.

---

## Definition of "Production Scale"

A release is production-ready when:
1. `npm run validate` is green **and** `typecheck:strict` passes with `lint` failing on warnings.
2. No mock data on primary user journeys; all reads/writes hit Firestore/the API.
3. AI keys are server-side; secrets are never in the bundle.
4. Error tracking + analytics are live; Web Vitals are within budget.
5. Critical flows are covered by unit + E2E tests; CI gates merges.
6. A11y AA on core pages; PWA installable; offline shell works.
7. Documented deploy pipeline with staging → prod promotion.

## Tech debt register

| Item | Severity | Notes |
| --- | --- | --- |
| ESLint warnings (`any`, unused) | medium | Burn down per module; then fail CI on warnings |
| Mock `server.ts` / mock data | high | Migrate to Firestore / real API |
| ~~AI key client-side~~ | ✅ done | Server proxy + `VITE_AI_USE_PROXY` (prod default) |
| ~~Duplicate pages (~11)~~ | ✅ done | 12 dead pages removed |
| ~~`npm audit`: 14 vulns~~ | ✅ done | 0 vulnerabilities |
| Double-spaced legacy files | low | One-shot Prettier reformat PR |

---

> Historical UI/UX polish notes live in [`UPGRADE_PLAN.md`](UPGRADE_PLAN.md). This roadmap
> supersedes it for productionization priorities.
