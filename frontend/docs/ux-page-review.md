# UX page review (src/pages)

Scope: six criteria (rows, button purposes, one primary per context, no redundant controls, hierarchy, actionable empty states). Fonts, palette, tabs, handlers, auth and data untouched. No tests/screenshots were run for this pass.

## Changed (copy-only, en/el preserved)
- CommunicationHub.tsx: specialist-conversations, shared photos and shared files empty states now say what to do next.
- DashboardPage.tsx: "Nothing scheduled" now points to Calendar.

## Reviewed, retained (grep-level review of empty states, labels, handlers)
- MatchDiscovery, Discovery: already use EmptyHint / ClearFiltersButton with next-step copy, filters labelled; retained.
- Discovery communities empty state already names the Communities page; retained.
- Remaining pages (Profile, Workspace, Fundraising, FounderTools, Events, Mentors, Communities, Milestones, Calendar, Programs, Network, Resources, Insights, LegalHub, Perks, Notifications, Settings, settings/Billing, Pricing, admin/*, superadmin/BillingOversight, AdminDashboard, Landing, Login, SignUp, FitCheck, Onboarding, NotFound, TenantLanding): not edited.

## Pending limitations
- This was NOT a full line-by-line audit of all ~19k lines; only the pages above were inspected, and only by search. Per-page findings for the unedited pages are not established.
- Row-completeness (truncation) and responsive wrapping were not checked in a browser.
- No accessibility conformance claim is made.

## Follow-up: overlay spacing removal
- AdminDashboard.tsx line 76 header: removed `lg:pr-56` (reserved space for the fixed Language/Exit overlay, which the parent is moving to an in-flow toolbar).
- admin/AutomationDashboard.tsx line 228 header: same removal.
- grep confirms no other `pr-56` in src/pages. PageShell's own `lg:pr-56` is parent-owned.
- Unverified: heading/toolbar collision at desktop widths was not checked in a browser; depends on the parent's toolbar landing.

## Second pass: Profile, Workspace, Fundraising, FounderTools, CommunicationHub
Read: button/handler greps and the render sections around each edit; not every line of the ~7k lines.
- Fundraising.tsx: "Schedule" -> "Schedule meeting"; data room "View" -> "Open data room"; "Analytics" -> "View analytics" (same handlers); the Upcoming Meetings and Data Room card headers now wrap (flex-wrap + gap) so long bilingual labels aren't clipped. Retained: pipeline stage/remove icon buttons (already aria-labelled), tab strip.
- Workspace.tsx: Lean Canvas header and its Save/AI Refine group now wrap; "Save" -> "Save canvas" (distinguishes from other saves; Save stays secondary, existing dark primary button kept).
- FounderTools.tsx: tracked-application inline form "Save" -> "Track application" (matches the trigger "Track New Application").
- CommunicationHub.tsx: inline message edit "Save" -> "Save edit"; earlier empty-state next-step copy.
- ProfilePage.tsx: header title block gets min-w-0 so long names/headlines shrink in the row. Retained: Edit/Connect/Message/Follow/Share hierarchy (icon buttons already labelled).
Not changed / pending: no element reordering or duplicate-control removal was made; duplicate-control and importance-order findings for these pages are not established. Nothing browser-verified. Other pages still un-audited.

## Third pass: concrete accessibility-name fixes (source-level, not browser/screen-reader tested)
- Events.tsx: bookmark button now has localized stateful label (Save event / Remove saved event), title, and aria-pressed; share button labelled "Copy event title".
- Discovery.tsx: filter drawer close button has type="button" and aria-label "Close filters".
- Pricing.tsx: billing toggle has type="button", role="switch", aria-checked (Annual), aria-label "Annual billing".
- admin/SSOSettings.tsx: Enable SSO and Require SSO toggles got type/role=switch/aria-checked/labels; JIT switch got an aria-label. Inputs/selects/textarea with an adjacent visible label now use htmlFor + generated id (ssosettings-field-N, sso-endpoint-url); Client Secret, authorization endpoint URL and add-domain inputs got aria-labels.
- admin/BrandingSettings.tsx: adjacent label/control pairs linked by htmlFor + id (brandingsettings-field-N); the six colour picker/hex inputs got aria-labels.
- admin/AutomationDashboard.tsx: the execution-row Info Button did nothing; now a non-interactive titled span. The MoreVertical Button in the sample modal step had no handler or existing delete handler to wire, so it is now a non-interactive titled span saying step editing is unavailable (no persistence invented). Create-modal close button got type and aria-label.
Pending: the label-linking was done by pattern match; any control not adjacent to its label may still lack a name. Not verified in a browser.

## Fourth pass: remaining 22 pages (source-section review; nothing run)
Method: grepped each file for nested Link>Button, selects/inputs without labels, truncate/line-clamp on titles, choice buttons without pressed state; read the surrounding render code for those hits. Header/filter/row/empty sections of every file were NOT read line by line; files with no hit are "no concrete defect found by these searches", not verified good.

Changed:
- admin/UserManagement.tsx: header Branding and Taxonomies shortcuts were Link>Button (nested interactive); now single Link with equivalent ghost-style classes. Export/other actions untouched.
- settings/Billing.tsx: "Add Method" Link>Button -> single Link (outline look approximated with stone classes); Country select now has htmlFor/id.
- TenantLanding.tsx: hero signup CTA Link>Button -> single Link with dark primary classes approximating size=lg (padding/radius may differ slightly from Button; check visually). "Learn More" stays the secondary outline.
- Calendar.tsx: selected-day event list title no longer truncates (break-words); month-grid chips keep truncate (title attr holds full text).
- CommunitiesPage.tsx: create-form Category select label linked (htmlFor/id).
- Resources.tsx: job form Type select and Company input labels linked.
- OnboardingWizard.tsx: role, industry, stage, commitment and looking-for choice buttons now expose aria-pressed; non-submit type="button" added where missing.
Retained without edits (no concrete defect from the searches): Programs, Perks, Insights, Notifications, LegalHub, MentorsPage, AdminDashboard (only the earlier pr-56 change), DomainSettings, TaxonomySettings (description line-clamp-1 is secondary text, kept), BillingOversight, LandingPage, LoginPage, SignUpPage, FitCheck (options auto-advance on click so no persistent selected state), NotFound. Programs/Perks descriptions keep line-clamp-2 (secondary text).
Pending runtime checks: visual parity of the three Link-converted buttons; keyboard order; tab-wrap and empty-state wording per page; no claim that these pages meet all six criteria.
