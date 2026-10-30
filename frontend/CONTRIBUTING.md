# Contributing to CoFounderBay

Thanks for contributing! This guide keeps the codebase consistent and production-ready.

## Prerequisites

- Node.js `>= 20` (`.nvmrc`)
- npm (the repo uses `package-lock.json`; `.npmrc` sets `legacy-peer-deps=true`)

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev
```

## Quality gate

Before pushing, run the same gate CI uses:

```bash
npm run validate   # typecheck + lint + test
```

Individual checks:

```bash
npm run typecheck         # tsc --noEmit
npm run typecheck:strict  # stricter config (aspirational target)
npm run lint              # eslint
npm run lint:fix          # eslint --fix
npm run format            # prettier --write
npm run test              # vitest
```

## Coding standards

- **TypeScript** — prefer precise types. New code should pass `typecheck:strict`. Avoid `any`;
  the ESLint rule is a warning only to keep legacy code building, not a license for new `any`.
- **Imports** — always at the top of the file.
- **Configuration** — never read `import.meta.env` directly; use `src/config/env.ts`.
- **Logging** — use `createLogger(scope)` from `src/lib/logger.ts`, not `console.*`.
- **HTTP** — use `apiClient` (`src/lib/apiClient.ts`); don't scatter raw `fetch` in new code.
- **Server state** — use TanStack Query with keys from `src/lib/queryClient.ts`.
- **Global UI state** — use the Zustand store in `src/stores/`.
- **Styling** — Tailwind CSS v4, the minimalist stone/white design system; compose classes with
  `cn()` from `src/lib/utils.ts`.
- **Comments** — explain *why*, not *what*. Don't add noise.

## Tests

- Co-locate tests as `*.test.ts(x)` next to the unit under test.
- Use Vitest + Testing Library; the setup lives in `src/test/setup.ts`.
- Don't weaken or delete existing tests without a clear reason.

## Commits & branches

- Branch from `main`: `feat/…`, `fix/…`, `chore/…`, `docs/…`, `refactor/…`.
- Use [Conventional Commits](https://www.conventionalcommits.org/): `feat: …`, `fix: …`,
  `chore: …`, `docs: …`, `test: …`, `refactor: …`.
- Keep PRs focused; include a short description and screenshots for UI changes.

## Pull requests

A PR should:
1. Pass `npm run validate` locally and in CI.
2. Not remove existing functionality (optimize, don't delete).
3. Update docs (`README`, `ARCHITECTURE`, `PRODUCTION_ROADMAP`) when behavior or structure changes.

## Project layout

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full layer-by-layer design and
[`PRODUCTION_ROADMAP.md`](PRODUCTION_ROADMAP.md) for the prioritized roadmap.
