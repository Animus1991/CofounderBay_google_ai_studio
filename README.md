<div align="center">

# CoFounderBay

**A startup ecosystem platform that connects founders, co-founders, mentors and investors — reducing founder risk and team-formation risk through compatibility-driven matching.**

[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)](.github/workflows/ci.yml)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?logo=firebase&logoColor=black)

</div>

---

## Overview

CoFounderBay is a professional, multi-tenant platform for the startup ecosystem. It helps
entrepreneurs find compatible co-founders, connect with mentors and investors, track
fundraising and milestones, and accelerate execution with AI assistance.

- **Matching engine** — compatibility scoring across skills, values, goals and availability.
- **AI operator** — one assistant that reads and changes the same data as every page
  (62 declared actions, Gemini tool use, confirm + undo for every write), as a corner
  panel everywhere and as the full-page AI Studio (`/assistant`). See
  [`docs/AI_OPERATOR.md`](docs/AI_OPERATOR.md).
- **Communication hub** — real-time messaging (Socket.IO) plus 10 specialized AI agents.
- **Founder tooling** — pitch deck builder, fundraising CRM, milestones, workspace, insights.
- **Ecosystem** — communities, events, mentors, programs, resources, perks.
- **Multi-tenancy & admin** — white-label branding, SSO, automation engine, billing.
- **Gamification** — XP, badges, streaks, venture-readiness scoring.

> See [`docs/`](docs) and [`PRODUCTION_ROADMAP.md`](PRODUCTION_ROADMAP.md) for the full plan
> and [`ARCHITECTURE.md`](ARCHITECTURE.md) for the system design.

## Tech stack

| Layer | Technology |
| --- | --- |
| UI | React 19, React Router 7, Tailwind CSS v4, Framer Motion, Lucide, Recharts |
| State / data | Zustand (UI state), TanStack Query (server state) |
| Auth / DB | Firebase Auth + Cloud Firestore (with security rules) |
| Realtime / dev API | Express + Socket.IO (in-memory mock, `server.ts`) |
| AI | Google Gemini (`@google/genai`) with local Ollama fallback |
| Tooling | TypeScript, ESLint 9 (flat), Prettier, Vitest + Testing Library |

## Getting started

**Prerequisites:** Node.js `>= 20` (see [`.nvmrc`](.nvmrc)) and npm.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
#   → set VITE_GEMINI_API_KEY (and optionally Firebase / observability vars)

# 3. Start the dev server (Express + Vite + Socket.IO)
npm run dev
```

The app starts on `http://localhost:5180` by default (configurable via `VITE_PORT`).

## NPM scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the full dev server (API + Vite + WebSocket) |
| `npm run build` | Production build (Vite) |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | TypeScript type-check (no emit) |
| `npm run typecheck:strict` | Type-check against the stricter `tsconfig.strict.json` |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm run test` / `test:watch` / `test:coverage` | Vitest |
| `npm run validate` | `typecheck` + `lint` + `test` (the CI gate) |

## Project structure

```
src/
  config/      # typed, validated environment configuration
  lib/         # apiClient, queryClient, logger, analytics, errorTracking, bootstrap, utils
  stores/      # Zustand global state (UI)
  context/     # React contexts (Auth, Tenant, Toast, Messaging)
  services/    # domain services (AI, matching, billing, scoring, automation, ...)
  components/  # UI primitives (ui/), layout (layout/), shared components
  pages/       # route-level pages (incl. admin/, settings/, superadmin/)
  test/        # Vitest setup
firestore.rules # Firestore security rules
server.ts       # dev API + Socket.IO server
```

## Configuration

All runtime configuration is centralized and validated in
[`src/config/env.ts`](src/config/env.ts). Client-exposed variables must be prefixed with
`VITE_`. Firebase config is resolved env-first (with a fallback to
`firebase-applet-config.json`). See [`.env.example`](.env.example) for the full list.

> **Security:** `VITE_GEMINI_API_KEY` is read by the client. For production, proxy AI calls
> through a backend so the key is never shipped to the browser (tracked in the roadmap).

## Testing

```bash
npm run test          # run once
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

## Deployment

Static build (`npm run build` → `dist/`) deploys to any static host (Firebase Hosting,
Netlify, Vercel). CI runs typecheck, lint, test and build on every push/PR — see
[`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for coding standards, branch/commit conventions and
the local quality gate (`npm run validate`).
