# UX Audit & Feature-Completeness Analysis

> Systematic, per-page review of the entire surface area. Two lenses:
> **(α) Typography/visual density** — implemented globally via the density-tuned
> type scale in `src/index.css` (`@theme --text-*` tokens), and **(β) feature
> gaps vs. best-in-class consumer/professional networks** (LinkedIn, Tinder,
> Slack, Notion, Linear) — prioritized roadmap per page.
>
> Status legend: ✅ implemented · 🎯 high-priority gap · ◽ nice-to-have

---

## 0. Global Typography System (implemented)

**Diagnosis.** Inter was declared in CSS but **never loaded** — the app silently
rendered in Segoe UI/system fonts (optically wider, ~5% larger x-height at the
same px). Tailwind's default scale (16px base) compounded the "everything is
big" perception. Legacy automation had also littered pages with non-standard
arbitrary sizes (`text-[14.3px]`, `text-[12.25px]`, `text-[18.6px]`…).

**Remedy (all implemented).**

| Layer | Change |
| --- | --- |
| Font loading | Inter Variable (opsz 14..32, wght 100..900) + JetBrains Mono via Google Fonts, `preconnect` + `display=swap` |
| Type scale | `@theme` override: xs 11px · sm 13px · base 14px · lg 16px · xl 18px · 2xl 20px · 3xl 24px · 4xl 30px · 5xl 38px — the Linear/GitHub density class; per-step paired line heights |
| Rendering | `font-feature-settings: cv02, cv03, cv04, cv11, calt` (disambiguated digits/glyphs), `optimizeLegibility`, `-webkit-font-smoothing` |
| Headings | Optical tracking correction (−0.02em h1/h2, −0.01em h3/h4), `text-wrap: balance` |
| Paragraphs | `text-wrap: pretty` (no orphans) |
| Numerals | `tabular-nums` on KPIs/stat values (`StatCard`, dashboard KPI row, readiness ring) + `time, [data-numeric]` rule |
| Artifacts | All `text-[N.Npx]` arbitrary sizes normalized to tokens (LandingPage, FounderTools, Footer) |
| Outliers | 404 hero 72→38px; nav/footer wordmarks restrained; ErrorBoundary/TenantLanding heroes rebalanced |
| Mobile | iOS input-zoom guard (`font-size: max(16px, 1em)` ≤640px); anchor `scroll-margin-top` under sticky navs |

**Result.** Body text is 13–14px (comfortably legible at 100% zoom, average
acuity, ~50–66ch measures), headings cap at 24–30px in-app, and every size now
derives from one token source — changing density app-wide is a one-file edit.

---

## 1. Public Surface

### `LandingPage.tsx` — ✅ typography fixed
- ✅ Hero/section headings now token-driven (`text-xl…lg:text-4xl`).
- 🎯 **Social proof**: real logos/metrics strip ("1,200 founders matched") — the
  single highest-converting landing element.
- 🎯 **Live product preview**: replace static mock with an auto-playing 20s
  product tour (Screen Studio-style) or interactive demo sandbox.
- ◽ Testimonial carousel with founder photos; FAQ accordion (SEO-rich).
- ◽ Exit-intent or scroll-50% inline CTA variant.

### `LoginPage.tsx` / `SignUpPage.tsx`
- 🎯 **Magic-link & OAuth prominence**: passwordless first (email link), Google
  one-tap; password as fallback — table stakes for 2026 consumer auth.
- 🎯 Inline validation with field-level errors on blur (not submit-time alerts).
- ◽ Password-manager hints (`autocomplete="new-password"`, `webauthn` future).
- ◽ "Continue as demo" placement consistency with landing CTA.

### `Pricing.tsx`
- 🎯 Monthly/annual toggle with savings badge; per-seat calculator for teams.
- ◽ Feature-comparison table sticky header; "most popular" social anchor.

### `NotFound.tsx` — ✅ rebalanced (38px hero)
- ◽ Fuzzy-match suggestion ("did you mean /matches?") from the route table.

### `TenantLanding.tsx` — ✅ rebalanced
- 🎯 Wire into routing (`/:tenantSlug`) — currently orphaned.

---

## 2. Core Authenticated Loop

### `DashboardPage.tsx` — ✅ tabular-nums KPIs
- 🎯 **Real data**: KPIs/feed are mocked — wire React Query + Firestore
  (roadmap §2); add per-widget skeletons (primitives exist in `ui/Skeleton`).
- 🎯 **Actionable feed**: every feed item should deep-link (match → profile,
  milestone → milestone) — partially done; complete coverage.
- ◽ Drag-to-reorder widgets w/ persisted layout (Zustand, localStorage).
- ◽ "Today" digest header: 3 next-best-actions max (already have 1 hero action).

### `Discovery.tsx` / `MatchDiscovery.tsx`
- 🎯 **Saved searches + alerts** ("notify me on new fintech CTO in Berlin") —
  the retention engine of LinkedIn Recruiter/Indeed.
- 🎯 **Why this match** explainability chips on every card (skills overlap %,
  stage fit, timezone) — trust driver, data already in scoring service.
- 🎯 Undo on pass (toast with 5s revert) — Tinder-class forgiveness.
- ◽ Keyboard shortcuts (←/→/↑ save) with onboarding coachmark.
- ◽ Virtualized list for 500+ results (react-window already a dependency).

### `MentorsPage.tsx`
- 🎯 **Booking flow**: availability calendar + 15/30min slot picker (Calendly
  pattern); office-hours badges.
- 🎯 Reviews/ratings with verified-session gating.
- ◽ Mentor "response time" + "sessions completed" trust stats.

### `CommunitiesPage.tsx`
- 🎯 Join-state lifecycle (open/request/invited) + member previews.
- 🎯 Per-community feed tab (posts already modeled in Workspace).
- ◽ Community health indicators (weekly active %, response rate).

### `CommunicationHub.tsx`
- 🎯 **Read receipts + delivery states** (sent/delivered/read ticks).
- 🎯 **Message search** within conversation (already global ⌘K — add scoped).
- 🎯 Link previews (OG unfurl) and inline image lightbox.
- ◽ Scheduled send; remind-me-if-no-reply (Superhuman pattern).
- ◽ Voice-note waveform scrubbing (recorder exists; add seek).

### `Network.tsx`
- 🎯 Mutual-connection paths ("introduce me via Maria") — LinkedIn's core graph
  value; render 2nd-degree intro chains.
- ◽ CSV/vCard export; birthday/funding-news nudges.

### `Notifications.tsx`
- 🎯 Granular per-channel preferences (in-app/email/push × event type) with
  digest batching option.
- ◽ Mark-all-read + per-section collapse; keyboard j/k navigation.

---

## 3. Founder Workspace

### `MilestonesPage.tsx`
- 🎯 Drag-and-drop between kanban columns (status mutation exists).
- 🎯 Dependencies between milestones (blocked-by arrows in timeline view).
- ◽ ICS export of target dates; burndown sparkline per quarter.

### `FounderTools.tsx` — ✅ artifact px normalized
- 🎯 Persist assessment answers + readiness history graph (currently resets).
- ◽ Template preview modal before download; usage analytics per tool.

### `Fundraising.tsx`
- 🎯 Investor CRM stages w/ drag (pipeline exists, make it mutable).
- 🎯 Intro-path suggestions from Network graph per investor.
- ◽ Round modeling calculator (dilution/SAFE caps) — exists in tools? cross-link.

### `LegalHub.tsx`, `Resources.tsx`, `Perks.tsx`, `Programs.tsx`, `Events.tsx`, `Calendar.tsx`, `Insights.tsx`, `Workspace.tsx`
- 🎯 `Events`: ICS add-to-calendar + attendee avatars + waitlist state.
- 🎯 `Calendar`: two-way sync stub (Google OAuth scope) or at least ICS feed.
- 🎯 `Workspace`: comment threads on posts (flat now); @mentions w/ typeahead.
- ◽ `Insights`: export PNG/CSV per chart; date-range presets.
- ◽ `Perks`: redemption state machine (claimed/active/expired) + value counter.

### `ProfilePage.tsx`
- 🎯 **Completion meter with specific next action** (+12% if you add skills) —
  proven LinkedIn growth loop; data exists in scoring.
- 🎯 Public share URL w/ OG image generation (off-platform virality).
- ◽ Endorsements w/ requester flow; video intro slot.

### `OnboardingWizard.tsx`
- 🎯 Resume-later persistence (write per-step to Firestore; restore on login).
- ◽ Progress save indicator; step deep-links for support.

### `Settings.tsx` + `settings/Billing.tsx`
- 🎯 Danger zone: export-my-data (GDPR §10 roadmap) + delete account flow.
- ◽ Active sessions list w/ revoke; connected apps.

---

## 4. Admin & SuperAdmin

### `AdminDashboard.tsx`, `admin/*`
- 🎯 `UserManagement`: bulk actions (suspend/role) + CSV export + audit trail
  per action (roadmap §10).
- 🎯 `AutomationDashboard`: dry-run mode + per-rule execution log drill-in
  (log exists; add filter by rule).
- ◽ `BrandingSettings`: live preview pane (split-screen) for theme edits.
- ◽ `TaxonomySettings`: drag-reorder skills; merge-duplicates tool.

### `superadmin/BillingOversight.tsx`
- ◽ MRR movement chart (new/expansion/churn) + tenant drill-down.

---

## 5. Cross-cutting (state-of-the-art checklist)

| Capability | Status | Note |
| --- | --- | --- |
| ⌘K command palette | ✅ exists | add per-page contextual actions |
| Route titles + scroll restore | ✅ | `RouteLifecycle` |
| Offline indicator | ✅ | `OfflineBanner` + E2E covered |
| Skip-link / focus-visible / reduced-motion | ✅ | WCAG 2.4.1, 2.4.7, 2.3.3 |
| Skeletons/Empty/Error primitives | ✅ exists | apply uniformly on data fetch (blocked on §2 data layer) |
| Toast system | ✅ exists | add aria-live="polite" audit |
| PWA manifest | ✅ | add offline shell + install prompt UX |
| Push notifications | 🎯 | FCM — the daily-return driver |
| Optimistic mutations | 🎯 | with React Query everywhere |
| Image optimization | 🎯 | responsive `srcset`, lazy, blur-up |
| i18n scaffolding | 🎯 | strings are hardcoded EN |
| Dark mode | ◽ | tokens ready (`.dark` palette defined), no toggle |

---

## Methodology note

Pages were graded against the daily-driver bar: *would a founder open this
unprompted every morning?* The three loops that earn that habit are
**(1) new-matches dopamine** (Discovery alerts + explainability),
**(2) conversation continuity** (read receipts, scheduled send, push), and
**(3) visible progress** (readiness history, milestone burndown, profile
completion). Those 🎯 items above are sequenced first in each section.
