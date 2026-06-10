# Architecture

This document describes the system design of **CoFounderBay** and the production-grade
foundation introduced to take it beyond an MVP.

## High-level overview

CoFounderBay is a single-page React application backed by Firebase (Auth + Firestore) with a
lightweight Express + Socket.IO dev server for realtime messaging and a mock API. AI features
are powered by Google Gemini with an optional local Ollama fallback.

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (SPA)                         │
│                                                              │
│  React 19 + Router 7                                         │
│  ├─ Providers: ErrorBoundary → QueryClient → Tenant → Toast  │
│  │              → Auth → Router                               │
│  ├─ stores/      Zustand (UI state, persisted)               │
│  ├─ lib/         apiClient · queryClient · logger ·          │
│  │               analytics · errorTracking · bootstrap       │
│  ├─ config/env   typed + validated environment               │
│  └─ services/    domain logic (AI, matching, billing, …)     │
└───────────┬───────────────────────────┬─────────────────────┘
            │ Firebase SDK               │ fetch / Socket.IO
            ▼                            ▼
   ┌─────────────────┐         ┌──────────────────────────┐
   │ Firebase Auth   │         │ Express + Socket.IO       │
   │ Cloud Firestore │         │ (server.ts, mock/dev API) │
   │ + security rules│         └──────────────────────────┘
   └─────────────────┘                  │
                                        ▼
                              ┌────────────────────┐
                              │ Gemini / Ollama AI │
                              └────────────────────┘
```

## Layers

### `src/config/env.ts` — Configuration
The single source of truth for runtime configuration. Reads `import.meta.env` (Vite) and
`process.env` fallbacks, exposes a typed `appEnv`, and provides `validateEnv()` which returns
non-fatal warnings surfaced at bootstrap. No other module should read env vars directly.

### `src/lib` — Cross-cutting infrastructure
- **`bootstrap.ts`** — one-time app init (observability + env validation), called from `main.tsx`.
- **`logger.ts`** — scoped, level-aware structured logging; routes `warn`/`error` to a sink.
- **`errorTracking.ts`** — provider-agnostic exception capture (Sentry-ready), wired into the
  logger sink, `window.onerror`, `unhandledrejection`, and the React `ErrorBoundary`.
- **`analytics.ts`** — provider-agnostic product analytics with a centralized event taxonomy.
- **`apiClient.ts`** — typed `fetch` wrapper: base-URL resolution, timeouts (AbortController),
  retry-with-backoff for idempotent calls, and a normalized `ApiError`.
- **`queryClient.ts`** — shared TanStack Query client with `ApiError`-aware retry policy and
  hierarchical `queryKeys`.

### `src/stores` — Global UI state
Zustand stores for cross-cutting UI state (sidebar collapse, mobile drawer, command palette,
theme). Durable preferences are persisted to `localStorage`.

### `src/context` — React contexts
`AuthContext` (Firebase auth + profile), `TenantContext` (multi-tenant branding/content),
`ToastContext`, `MessagingContext` (Socket.IO-driven conversations).

### `src/services` — Domain logic
Framework-agnostic business logic: AI orchestration, matching/compatibility scoring, billing,
scoring/gamification, automation, behavioral optimization.

## Provider hierarchy

```tsx
<ErrorBoundary>
  <QueryClientProvider>
    <TenantProvider>
      <ToastProvider>
        <AuthContext.Provider>
          <Router> … </Router>
```

`ErrorBoundary` is outermost so it can catch render errors from any provider; `QueryClient`
wraps the app so any route can use server-state hooks.

## Data flow

- **Auth/profile:** Firebase `onAuthStateChanged` + Firestore `onSnapshot` on `users/{uid}`
  and `profiles/{uid}` feed `AuthContext`.
- **Server state:** new code should use TanStack Query (`queryClient` + `queryKeys`) over the
  `apiClient`/Firestore. Legacy pages still use direct `fetch`/mock data and are being migrated.
- **UI state:** Zustand (`useUIStore`).
- **Realtime:** Socket.IO via `MessagingContext`, with graceful fallback to local data when the
  dev server is unavailable.

## Security

- **Firestore Security Rules** (`firestore.rules`) enforce per-document authorization and field
  validation (owner checks, role checks, URL/email validators).
- The Firebase web API key is a public client identifier; real access control lives in the rules.
- AI keys: client-side today; the roadmap moves them behind a server proxy.

## Observability

`bootstrap()` initializes error tracking and analytics. Both are no-op/console by default and
become real providers by passing implementations to `initErrorTracking()` / `initAnalytics()`
and enabling the corresponding `VITE_ENABLE_*` flags.

## Quality gates

`npm run validate` = `typecheck` + `lint` + `test`. The base `tsconfig.json` is intentionally
lenient so the existing type-check stays green; `tsconfig.strict.json` (`typecheck:strict`) is
the incremental target for full type safety. CI enforces the gate on every push/PR.

## Technology assessment (state-of-the-art review)

Verdict per layer — is each choice optimal for the product's purpose and future scale?

| Layer | Choice | Verdict | Notes |
| --- | --- | --- | --- |
| UI runtime | React 19 | ✅ State of the art | Latest major; concurrent features, modern JSX transform |
| Build | Vite 6 + Rollup vendor chunking | ✅ State of the art | Fast HMR, optimal code-splitting; main chunk 54 kB gzip-friendly |
| Language | TypeScript 5.8 | ✅ State of the art | Strict adoption is the tracked next step |
| Styling | Tailwind CSS v4 | ✅ State of the art | CSS-first config, design tokens via `@theme` |
| Server state | TanStack Query v5 | ✅ State of the art | Industry standard; adoption across pages in progress |
| UI state | Zustand v5 | ✅ State of the art | Minimal, persisted; right-sized vs Redux |
| Routing | React Router 7 | ✅ Current | SPA-appropriate; lazy routes in place |
| Auth/DB | Firebase Auth + Firestore | ✅ Right for this scale | Serverless, realtime, rules-enforced. Scale-out path: move matching/aggregation queries behind Cloud Functions or a dedicated API if relational complexity grows |
| Realtime | Socket.IO | ✅ Industry standard | Dev server is mock/in-memory — promotion to persistent backend is roadmapped |
| AI | `@google/genai` (Gemini) + Ollama fallback | ✅ Current SDK | Key must move server-side (roadmapped); circuit breaker already implemented |
| Charts | Recharts 3 | ✅ Appropriate | Heavy, but isolated in a lazy `charts` chunk |
| Animation | Framer Motion 12 | ✅ State of the art | Now paired with `prefers-reduced-motion` support |
| Testing | Vitest 2 + Testing Library | ✅ State of the art | E2E (Playwright) is the next addition |

**Deliberate trade-off — SPA vs SSR (Next.js):** public-page SEO would benefit from SSR, but a
framework migration would be a rewrite with high regression risk for zero feature gain. The
adopted strategy: keep the Vite SPA, enrich static SEO meta (done), and optionally prerender
the landing page at build time if organic acquisition becomes a priority.

## Known constraints / tech debt

See [`PRODUCTION_ROADMAP.md`](PRODUCTION_ROADMAP.md) for the prioritized plan, including the
mock-API → Firestore migration, AI key proxying, full `strict` adoption, duplicate-page cleanup,
and dependency vulnerability remediation.
