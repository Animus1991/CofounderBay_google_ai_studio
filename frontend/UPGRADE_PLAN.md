# CoFounderBay — Πλήρες Σχέδιο Αναβάθμισης

> Στόχος: Ενοποίηση, βελτίωση UI/UX, αρχιτεκτονική αναβάθμιση, feature completeness.
> Design language: **minimalist monochrome** — stone/white palette, small typography, clean spacing.

---

> ## 🏗️ Production Foundation — ΟΛΟΚΛΗΡΩΘΗΚΕ ✅
>
> Το θεμέλιο παραγωγικής κλίμακας μπήκε: **typed env config**, **observability**
> (logger / error tracking / analytics), **κεντρικός API client**, **TanStack Query**,
> **Zustand UI store**, **ESLint + Prettier**, **Vitest + CI**, **PWA + SEO**.
> Το `npm run validate` (typecheck + lint + test) είναι **πράσινο**.
>
> 👉 Η συνέχεια (data-layer migration, AI key proxy, full strict, feature completeness)
> τεκμηριώνεται αναλυτικά στο **[`PRODUCTION_ROADMAP.md`](PRODUCTION_ROADMAP.md)** και η
> αρχιτεκτονική στο **[`ARCHITECTURE.md`](ARCHITECTURE.md)**. Το παρόν αρχείο διατηρείται ως
> ιστορικό των UI/UX βελτιώσεων.

---

## 0. Επείγουσες Διορθώσεις (Άμεσα)

| # | Πρόβλημα | Αρχείο | Fix |
|---|----------|--------|-----|
| 1 | TenantContext 404 | `TenantContext.tsx` | ✅ Ήδη διορθώθηκε |
| 2 | favicon 404 | `index.html` | ✅ Ήδη διορθώθηκε |
| 3 | Firebase auth/operation-not-allowed | Firebase Console | ✅ Ήδη διορθώθηκε |
| 4 | Raw Firebase error messages | Login/SignUp pages | ✅ Ήδη διορθώθηκε |
| 5 | Sidebar path /community mismatch | `App.tsx` | ✅ Ήδη διορθώθηκε |
| 6 | Demo Mode button στο sign-up | `SignUpPage.tsx` | ✅ Ήδη διορθώθηκε |
| 7 | Bundle 1.8MB | `App.tsx` | ✅ Lazy loading, τώρα ~926KB |
| 8 | useTenant crash on nav | `TenantContext.tsx` | ✅ Safe default context (session 5) |
| 9 | setLoading(false) missing localhost | `TenantContext.tsx` | ✅ Fixed (session 5) |

---

## SESSION PROGRESS LOG

### Session 5 ✅ COMPLETE
- **TenantContext** safe default context — no more crash
- **Resources.tsx** → PageShell applied, stone-* colors, minimalist tabs
- **Insights.tsx** → PageShell applied, minimalist time-range tabs, fixed JSX
- **Fundraising.tsx** → PageShell applied, JSX structure fixed
- **Programs.tsx** → PageShell applied
- **Perks.tsx** → PageShell applied, category filters
- **LegalHub.tsx** → PageShell applied

### Session 6 ✅ COMPLETE
- **FounderTools.tsx** → PageShell applied, header shrunk to minimalist
- **FounderTools Pitch tab** → Full slide builder (8 slides, status tracking, canvas preview, investor tips, prev/next navigation, PDF/share/mentor quick actions)
- **FounderTools Applications tab** → Full tracker (stats row, per-application status, match %, deadline/decision dates, add new CTA)
- **FounderTools Builder** → Modules 4 & 5 added (Business Model, Go-to-Market)
- **tsc** → Exit 0 ✅

### Session 7 ✅ COMPLETE (Current)
- **Fundraising.tsx** → Εμπλουτισμός με νέα features:
  - Mini Cap Table visualization (stacked progress bar με founders/SAFEs/ESOP)
  - Due Diligence Checklist (complete/pending items με progress)
  - Email Templates quick access (Cold Intro, Follow-up, Data Room)
  - Bar chart tooltips on hover
- **Insights.tsx** → ✅ Light compact stat cards (αντικατάσταση dark bg-stone-950), h-56 charts, light amber Strategic Insight
- **Programs.tsx** → ✅ rounded-2xl cards, compact text-xs/sm typography, light amber Premium Opportunities sidebar
- **Events.tsx** → ✅ Light emerald-50 Host CTA (αντικατάσταση dark bg-stone-900), compact sidebar
- **Network.tsx** → ✅ Compact endorsement cards (p-4), text-xs body, amber Expert Badge, synced tab bar style
- **tsc --noEmit** → ✅ Exit 0 verified

---

## 1. Design System & Typography (Υψηλή Προτεραιότητα)

### 1.1 Typography Consolidation
**Πρόβλημα:** Ανομοιόμορφες γραμματοσειρές — κάποιες σελίδες χρησιμοποιούν `text-2xl`, άλλες `text-base`.
**Στόχος:** Ενιαία κλίμακα βασισμένη στην αρχική σελίδα (μικρές, clean γραμματοσειρές).

```
Page titles:        text-lg font-semibold (max text-xl)
Section headings:   text-sm font-semibold uppercase tracking-wider text-stone-400
Card titles:        text-sm font-semibold text-stone-900
Body text:          text-sm text-stone-600
Small/meta:         text-xs text-stone-400
Labels:             text-xs font-medium uppercase tracking-wider
Buttons:            text-xs sm:text-sm font-semibold
```

**Αρχεία που χρειάζονται αναθεώρηση:**
- `src/pages/AdminDashboard.tsx` — headings πολύ μεγάλα
- `src/pages/Fundraising.tsx` — ανομοιόμορφα font sizes
- `src/pages/Resources.tsx` — text-3xl titles
- `src/pages/Programs.tsx` — oversized headings
- Όλα τα admin pages

### 1.2 Spacing & Layout Grid
```
Page padding:       px-4 sm:px-6 lg:px-8 py-6
Card padding:       p-5 (compact) / p-6 (standard)
Section gap:        space-y-6
Grid columns:       grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
Card border:        border border-stone-100 rounded-2xl
Card shadow:        shadow-sm (hover: shadow-md)
```

### 1.3 Color Tokens (εκτός Tailwind defaults)
```css
/* Να προστεθούν στο tailwind.config.ts */
--surface-1: stone-50   /* page background */
--surface-2: white      /* cards */
--surface-3: stone-100  /* hover states */
--border:    stone-100  /* default borders */
--border-strong: stone-200
--text-primary:   stone-900
--text-secondary: stone-600
--text-muted:     stone-400
--accent:         stone-900  /* primary action color */
```

### 1.4 Component Standardization
Κάθε σελίδα πρέπει να χρησιμοποιεί τα νέα UI components:
- ✅ `Badge` — αντί για custom span badges
- ✅ `Avatar` — αντί για custom img/div avatars
- ✅ `Tabs` — αντί για custom tab implementations
- ✅ `Modal` / `ConfirmDialog` — αντί για custom modals
- ✅ `DropdownMenu` — αντί για custom dropdowns
- ✅ `Skeleton` — loading states παντού
- ✅ `EmptyState` — αντί για custom empty messages
- ✅ `Tooltip` — αντί για title attributes

---

## 2. Layout & Navigation (Υψηλή Προτεραιότητα)

### 2.1 Sidebar Improvements
**Αρχείο:** `src/components/layout/Sidebar.tsx`

Βελτιώσεις που χρειάζονται:
- [ ] **Collapsible με animation** — smooth transition 280px → 64px (icon only)
- [ ] **Active state** — bolder indicator για τρέχον route
- [ ] **Section labels** — "Main", "Tools", "Resources", "Admin" separators
- [ ] **Notification badges** — unread count στο Messages, Notifications
- [ ] **User menu** στο bottom — avatar + name + logout
- [ ] **Keyboard shortcut** hints στα nav items (tooltip on hover)
- [ ] **Mobile overlay** — smooth slide-in με backdrop blur

### 2.2 Navbar Simplification
**Αρχείο:** `src/components/Navbar.tsx`

- [ ] Αφαίρεση navbar εντελώς για authenticated users (η sidebar αντικαθιστά)
- [ ] Ή: sticky minimal top bar (h-12) με μόνο breadcrumbs + search + user avatar
- [ ] Breadcrumb navigation για sub-pages

### 2.3 Page Shell
Να δημιουργηθεί reusable `PageShell` component:
```tsx
<PageShell
  title="Fundraising"
  description="Track your fundraising pipeline"
  actions={<Button>New Round</Button>}
>
  {children}
</PageShell>
```
Αυτό εξασφαλίζει ενιαία header structure σε όλες τις σελίδες.

### 2.4 Breadcrumbs
Αυτόματα breadcrumbs από το URL path:
`Dashboard / Admin / User Management`

---

## 3. Σελίδα προς Σελίδα — Αναλυτικές Βελτιώσεις

### 3.1 DashboardPage (`/dashboard`)
**Τρέχουσα κατάσταση:** Functional αλλά generic.

Βελτιώσεις:
- [ ] **KPI Cards row** — Match rate, Profile views, Messages unread, Connections
- [ ] **Match suggestions carousel** — 3 horizontal cards με quick actions
- [ ] **Activity feed** — Timeline format, compact, με icons
- [ ] **Completion checklist** — "Complete your profile", "Add skills", etc.
- [ ] **Upcoming events widget** — next 2-3 events compact list
- [ ] **Quick actions** — "Find co-founder", "Post update", "Browse mentors"

### 3.2 ProfilePage (`/profile`)
- [ ] **Cover photo** area (gradient fallback)
- [ ] **Profile completion bar** — με steps
- [ ] **Skills tags** — pill chips, editable inline
- [ ] **Experience timeline** — compact vertical list
- [ ] **Social links** — GitHub, LinkedIn, Twitter icons
- [ ] **Pitch section** — "My startup idea" editable textarea
- [ ] **Availability badge** — "Open to co-founder", "Full-time", etc.
- [ ] **Public profile view** toggle

### 3.3 MatchDiscovery (`/discovery`)
- [ ] **Filter sidebar** — role, industry, location, stage, availability
- [ ] **Card vs List view** toggle
- [ ] **Match score %** badge στο κάθε profile card
- [ ] **Quick swipe actions** — Like/Pass keyboard shortcuts (L/P)
- [ ] **Saved profiles** section
- [ ] **Search with debounce** — real-time filtering

### 3.4 MentorsPage (`/mentors`)
- [ ] **Category filters** — Product, Tech, Marketing, Finance, Legal
- [ ] **Availability calendar** integration
- [ ] **Session booking** flow — modal με time slots
- [ ] **Review scores** — star rating display
- [ ] **Featured mentors** row at top
- [ ] **"Request session"** CTA αντί για generic button

### 3.5 MessagesPage (`/messages`)
- [ ] **Conversation list** — αριστερά, με unread badges
- [ ] **Chat window** — δεξιά, με message bubbles
- [ ] **Real-time** μέσω socket.io (ήδη υπάρχει στο server.ts)
- [ ] **Typing indicator**
- [ ] **Message reactions** (emoji)
- [ ] **File attachment** UI (όχι backend ακόμα)
- [ ] **Search conversations**
- [ ] **Archive/mute** actions

### 3.6 MilestonesPage (`/milestones`)
- [ ] **Kanban view** — To Do / In Progress / Done columns
- [ ] **Timeline view** — Gantt-style horizontal
- [ ] **Progress rings** στα projects
- [ ] **Due date alerts** — overdue badge
- [ ] **Team member assignment** chips
- [ ] **Priority levels** — visual indicators

### 3.7 FounderTools (`/founder-tools`)
- [ ] **Tool categories** — Legal, Finance, Product, Marketing, HR
- [ ] **Template library** — downloadable/copyable
- [ ] **AI-assisted** tool suggestions
- [ ] **Pinned tools** αρχικά
- [ ] **Recently used** section

### 3.8 Fundraising (`/fundraising`)
- [ ] **Pipeline stages** — Awareness → Interest → Due Diligence → Term Sheet → Closed
- [ ] **Investor CRM table** — name, firm, stage, last contact, notes
- [ ] **Round tracker** — target amount, committed, remaining gauge
- [ ] **Pitch deck uploader** UI
- [ ] **Meeting scheduler** με investors
- [ ] **Data room** link manager

### 3.9 Network (`/network`)
- [ ] **Connection cards** — mutual connections count
- [ ] **Pending requests** section
- [ ] **Suggested connections** — based on industry/skills
- [ ] **Connection strength** indicator
- [ ] **Export connections** button

### 3.10 CommunitiesPage (`/community`)
- [ ] **Community cards** — member count, activity badge
- [ ] **Featured communities** row
- [ ] **My communities** vs All
- [ ] **Join/Leave** με animation
- [ ] **Post preview** in card

### 3.11 EventsPage (`/events`)
- [ ] **Calendar view** + List view toggle
- [ ] **Filter** — Online/In-person, Category, Date range
- [ ] **RSVP flow** — modal με confirmation
- [ ] **Countdown** για upcoming events
- [ ] **Past events** archive

### 3.12 Programs (`/programs`)
- [ ] **Application status tracker**
- [ ] **Deadline countdown** badges
- [ ] **Program comparison** side-by-side
- [ ] **Success stories** section
- [ ] **Filter** by stage, type, location

### 3.13 Resources (`/resources`)
- [ ] **Category sidebar** — Articles, Templates, Tools, Videos
- [ ] **Featured resources** hero section
- [ ] **Bookmark** functionality
- [ ] **Search** με live filter
- [ ] **Reading time** estimate
- [ ] **Related resources** suggestion

### 3.14 Insights (`/insights`)
- [ ] **Profile analytics** — views over time chart
- [ ] **Match analytics** — acceptance rate, response time
- [ ] **Community engagement** metrics
- [ ] **Export data** button
- [ ] **Date range** filter

### 3.15 LegalHub (`/legal`)
- [ ] **Document categories** — Agreements, IP, Employment, Equity
- [ ] **Preview modal** για documents
- [ ] **Download + Copy** actions
- [ ] **Disclaimer** notice
- [ ] **"Get legal advice"** CTA

### 3.16 Perks (`/perks`)
- [ ] **Category filter** — Cloud, SaaS, Finance, Office
- [ ] **Savings amount** badge
- [ ] **Claim flow** — copy code modal
- [ ] **Featured / New** badges
- [ ] **Expiry dates**

### 3.17 Settings (`/settings`)
- [ ] **Sidebar navigation** — Profile, Account, Notifications, Privacy, Billing, Integrations
- [ ] **Auto-save** με debounce (αντί για Save button)
- [ ] **Danger zone** section (delete account)
- [ ] **Connected accounts** (Google, GitHub)
- [ ] **Two-factor auth** toggle (UI only)
- [ ] **Session management** — active devices list

### 3.18 Admin Pages
- [ ] **AdminDashboard** — platform stats, user growth chart, revenue metrics
- [ ] **UserManagement** — table με sort/filter/search, bulk actions, role change
- [ ] **AutomationDashboard** — rule builder UI, trigger/action pairs
- [ ] **BrandingSettings** — live preview panel δίπλα στις ρυθμίσεις
- [ ] **SSOSettings** — provider cards (Google, Microsoft, Okta)

### 3.19 Landing Page (`/`)
- [ ] **Hero section** — headline + sub + CTA + demo screenshot
- [ ] **Features grid** — 6 key features με icons
- [ ] **Social proof** — testimonials, logos, stats
- [ ] **Pricing preview** section
- [ ] **FAQ** accordion
- [ ] **Footer** με links

### 3.20 Onboarding Wizard (`/onboarding`)
- [ ] **Step indicator** — progress bar (1/5, 2/5...)
- [ ] **Steps:** Role → About → Skills → Goals → Profile photo
- [ ] **Skip option** για κάθε step
- [ ] **Keyboard navigation** (Enter = next)
- [ ] **Animated transitions** μεταξύ steps

---

## 4. Architecture & Backend (Μεσαία Προτεραιότητα)

### 4.1 Firebase Integration (Συνιστάται να διατηρηθεί)

**Γιατί Firebase:**
- Auth δωρεάν μέχρι 10K users/month
- Firestore Spark plan: δωρεάν για dev/beta
- Google Auth, Email/Pass, GitHub — έτοιμα
- Firebase Hosting: δωρεάν static hosting
- **Κόστος τώρα: €0**

**Τι να μετεγκαταστήσουμε από mock server στο Firestore:**
```
/users/{uid}              → user profile
/users/{uid}/connections  → connections subcollection
/conversations/{id}       → messages
/events/{id}              → events
/communities/{id}         → communities
/milestones/{uid}/{id}    → milestones
/notifications/{uid}      → notifications
```

### 4.2 State Management
**Τρέχουσα:** Props drilling + Context API
**Βελτίωση:** Zustand για global state (light, no boilerplate)

```typescript
// stores/useAppStore.ts
const useAppStore = create((set) => ({
  sidebarCollapsed: false,
  notifications: [],
  unreadCount: 0,
  // ...
}));
```

### 4.3 Data Fetching
**Τρέχουσα:** Direct fetch calls
**Βελτίωση:** React Query (TanStack Query) για:
- Cache management
- Loading/error states
- Background refetch
- Optimistic updates

### 4.4 API Layer
Centralized API client:
```typescript
// lib/api.ts
export const api = {
  profiles: { get, update, list },
  connections: { list, request, accept },
  messages: { list, send, markRead },
  // ...
}
```

### 4.5 Error Boundaries
- Global error boundary (ήδη υπάρχει)
- Per-section error boundaries με retry button
- Network error toast notifications

### 4.6 Real-time Features (socket.io — ήδη υπάρχει)
- [ ] Unread message count badge
- [ ] Live notifications
- [ ] Online presence indicators
- [ ] Typing indicators στο chat

---

## 5. Performance (Χαμηλή-Μεσαία Προτεραιότητα)

### 5.1 Bundle Optimization
- ✅ Lazy loading (ήδη υλοποιήθηκε) — 926KB από 1.8MB
- [ ] Dynamic import για recharts (βαρύ — 287KB)
- [ ] Preload critical routes (dashboard, profile)
- [ ] Service Worker για offline support

### 5.2 Image Optimization
- [ ] `loading="lazy"` σε όλες τις εικόνες
- [ ] Placeholder shimmer κατά το loading
- [ ] WebP format preference
- [ ] Avatar fallback χωρίς 404

### 5.3 Virtual Scrolling
Για μεγάλες λίστες (matches, connections, messages):
- [ ] `@tanstack/react-virtual` για infinite scroll lists

---

## 6. UX Micro-interactions & Polish

### 6.1 Animations (με motion/react)
- [ ] **Page transitions** — fade + slide κατά navigation
- [ ] **Card hover** — subtle scale(1.01) + shadow
- [ ] **Button press** — scale(0.98)
- [ ] **Toast** — slide in από bottom-right ✅
- [ ] **Modal** — scale + fade ✅
- [ ] **Sidebar collapse** — smooth width transition
- [ ] **Skeleton pulse** — ✅

### 6.2 Keyboard Navigation
- [ ] **Ctrl+K** — Command Palette ✅
- [ ] **Esc** — Close modals/palette ✅
- [ ] **Tab** — Focus management σε forms
- [ ] **Arrow keys** — Navigate lists
- [ ] **/** — Focus search

### 6.3 Empty States
Κάθε σελίδα πρέπει να έχει:
- [ ] Meaningful empty state με icon + message + CTA
- [ ] First-time user guidance
- [ ] Skeleton loading states

### 6.4 Responsive Design
- [ ] Mobile-first revision σε κάθε σελίδα
- [ ] Bottom navigation bar για mobile (αντί sidebar)
- [ ] Touch-friendly tap targets (min 44px)
- [ ] Swipe gestures στο mobile sidebar

---

## 7. Accessibility (A11y)

- [ ] `aria-label` σε όλα τα icon buttons
- [ ] Focus rings ορατά (Tailwind `focus-visible:ring`)
- [ ] Color contrast ≥ 4.5:1 (stone-600 on white ✅)
- [ ] Skip-to-content link
- [ ] Screen reader announcements για toast notifications
- [ ] Form error messages με `aria-describedby`

---

## 8. Developer Experience

### 8.1 Code Organization
```
src/
  components/
    ui/          ← reusable primitives ✅
    layout/      ← Sidebar, Navbar, Footer ✅
    forms/       ← FormField, FormError, etc.
    charts/      ← recharts wrappers
  pages/         ← route-level components
  hooks/         ← useDebounce, useLocalStorage, useMediaQuery
  stores/        ← Zustand stores
  lib/           ← api, utils, firebase
  context/       ← Auth, Toast, Tenant ✅
  types.ts       ← all TypeScript types
```

### 8.2 Custom Hooks που χρειάζονται
```typescript
useDebounce(value, delay)
useLocalStorage(key, default)
useMediaQuery(query)
useClickOutside(ref, handler)
useIntersectionObserver()     // για infinite scroll
useFirestoreDoc(path)         // Firebase wrapper
useFirestoreCollection(path)  // Firebase wrapper
```

### 8.3 Form Handling
- [ ] React Hook Form για όλα τα forms
- [ ] Zod για validation schemas
- [ ] Centralized error display

---

## 9. Deployment & Infrastructure

### Option A: Firebase (Συνιστάται)
```
Frontend:  Firebase Hosting (δωρεάν, CDN, SSL)
Auth:      Firebase Auth (δωρεάν μέχρι 10K/month)
Database:  Firestore (δωρεάν Spark tier)
Backend:   Firebase Functions (δωρεάν 2M calls/month)
Storage:   Firebase Storage (δωρεάν 5GB)
Κόστος:    €0 για beta/MVP
```

### Option B: Hybrid
```
Frontend:  Netlify / Vercel (δωρεάν)
Auth:      Firebase Auth
Database:  Firestore + Express mock server
Κόστος:    €0
```

---

## 10. Προτεραιοποίηση & Χρονοδιάγραμμα

### Sprint 1 (Άμεσα — 1-2 εβδομάδες)
1. Typography consolidation σε όλες τις σελίδες
2. PageShell component + εφαρμογή παντού
3. Sidebar improvements (collapse, badges, user menu)
4. DashboardPage πλήρης υλοποίηση
5. EmptyState + Skeleton σε όλες τις σελίδες

### Sprint 2 (2-3 εβδομάδες)
1. ProfilePage overhaul
2. MessagesPage realtime
3. Settings sidebar layout
4. Onboarding wizard steps
5. Mobile responsive fixes

### Sprint 3 (3-4 εβδομάδες)
1. Firestore integration (αντικατάσταση mock data)
2. MatchDiscovery με filters
3. Fundraising pipeline
4. MilestonesPage kanban
5. React Query integration

### Sprint 4 (4-6 εβδομάδες)
1. Landing page polish
2. Admin dashboard charts
3. Notifications realtime
4. Performance optimizations
5. A11y audit & fixes

---

## Σύνοψη Αρχείων που Χρειάζονται Άμεση Εργασία

| Αρχείο | Κατάσταση | Προτεραιότητα |
|--------|-----------|---------------|
| `src/pages/DashboardPage.tsx` | Generic, λείπουν widgets | 🔴 Υψηλή |
| `src/components/layout/Sidebar.tsx` | Λείπουν βελτιώσεις | 🔴 Υψηλή |
| `src/pages/ProfilePage.tsx` | Ατελής | 🔴 Υψηλή |
| `src/pages/OnboardingWizard.tsx` | Steps ατελείς | 🔴 Υψηλή |
| `src/pages/Fundraising.tsx` | ✅ Cap Table, DD Checklist, Email Templates | ✅ Ολοκληρώθηκε |
| `src/pages/Insights.tsx` | ✅ Light compact, h-56 charts | ✅ Ολοκληρώθηκε |
| `src/pages/Programs.tsx` | ✅ rounded-2xl, light promo card | ✅ Ολοκληρώθηκε |
| `src/pages/Events.tsx` | ✅ light Host CTA, compact sidebar | ✅ Ολοκληρώθηκε |
| `src/pages/Network.tsx` | ✅ Compact endorsements, tab sync | ✅ Ολοκληρώθηκε |
| `src/pages/MessagesPage.tsx` | Χωρίς realtime | 🟡 Μεσαία |
| `src/pages/MilestonesPage.tsx` | Χωρίς kanban | 🟡 Μεσαία |
| `src/pages/Settings.tsx` | Χωρίς sidebar nav | 🟡 Μεσαία |
| `src/pages/AdminDashboard.tsx` | Χωρίς charts | 🟢 Χαμηλή |
| `src/pages/LandingPage.tsx` | Ατελής | 🟢 Χαμηλή |
