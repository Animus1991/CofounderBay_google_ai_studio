# Mobile/tablet page refinement (9 pages)

Scope: only CommunicationHub, Fundraising, FounderTools, Workspace, Resources, ProfilePage, Network, Discovery, DashboardPage. Not validated in a browser by me; parent does the combined pass. Not all 39 pages were reviewed.

## Changed (class-only; no handlers, data, auth, API, copy, EN/EL touched)
- CommunicationHub: AI-center nav selected state, participant chip selected state, Conversations/Unread/Requests stat tiles now neutral stone-200 instead of black.
- Fundraising: top tab selected -> white raised segment with ring; inactive text stone-500 (contrast); meeting-type selected -> stone-200 + stone-400 border.
- FounderTools: top tab selected as above; two choice-tile selected states -> stone-200/stone-400.
- Workspace: tab selected as above; focus-mode toggle pressed -> stone-200.
- Resources: category tab selected as above, inactive contrast raised.
- Network: compare-picker selected chips -> stone-200/stone-400.
- Discovery: four filter-sheet option groups and the filter toggle selected states -> stone-200/stone-400.
- DashboardPage: "7-day match plan" promo tile softened from black to stone-100 with border; its inner stone-400 text darkened to stone-500/600 for the light surface.

## Retained
Primary actions (Send, Message, Save, Apply filters, Connect) keep the black primary; unread badges, own chat bubbles, progress bars and avatar badges stay black as small accents. ProfilePage had no selected-state black panels needing change; unchanged.

## Remaining risks
Fixed-width/nowrap tab rows (Workspace tabs use whitespace-nowrap) depend on the shared scroll-tabs overflow; Discovery filter sheet h-16 buttons and CommunicationHub three-pane layout at 768/1024 need browser confirmation. Global CSS height overrides in index.css may affect changed controls.

## Second pass: large dark surfaces and layout
Changed (class-only; handlers, copy, data untouched):
- ProfilePage: "AI Match/Profile Insight" card was a full bg-stone-900 panel; now stone-50 with stone-200 border. Nested text moved from white/stone-400/500 to stone-900/600, sub-tiles bg-white with stone-200 border, progress track stone-200 and fill stone-700, sparkle icon amber-600 for contrast on light. Profile cover banner (empty decorative block) bg-stone-200. Edit/Save primaries stay black.
- Resources: mentor/coach card was black; now stone-50 + border, avatar frame white, quote and price text re-toned. Its "Book Now" button flipped from white-on-black to the single black primary. Avatar/name row gap reduced on phones; price/Book row now wraps (flex-wrap gap-3) so the label and button don't squeeze at 375.
- Workspace: "Total" milestone tile neutral (stone-100/700); label/value branches that assumed white text simplified so the tile's border derivation still works.
- FounderTools: assessment category tag, builder step badge, pitch slide number badge moved from black to stone-200 with stone-900 text.
- CommunicationHub: header logo tile black -> stone-200 (shrink-0); conversation list column md:w-80 -> md:w-72 lg:w-80 xl:w-[22rem], giving the chat pane ~448px+ at 768 instead of ~368 (list is hidden-on-select below md already; right context panel is a full-screen overlay below xl, so only two panes are visible at 768/1024).
Retained: own chat bubbles, unread badges, AI badge, send/new-message buttons, progress fills, toasts, modal scrims, Fundraising/Network/Discovery primary Save/Message buttons, Fundraising cap-table bars (data colour).
Not changed / inspected: Fundraising and Network had no large dark promotional panels, only primaries, bars and tooltips. Hover-to-black icon tiles (Resources, Fundraising, ProfilePage) left as hover feedback.
Unverified: no browser check. Risks: Fundraising/Workspace buttons with fixed h-7/h-8/h-9 now interact with parent's 44px touch rule; ProfilePage action buttons use many px/py combos; Network 3-column and Fundraising cap-table grids were not restructured; Workspace tab row remains nowrap and relies on parent's wrapped scroll-tabs. Narrow title/action rows in Fundraising/Network/Dashboard were not individually reworked beyond the above.

## Third pass: browser-reported failures (Workspace, Fundraising)
Workspace Active Sprint header (class/markup only, same handlers):
- Outer row now flex-wrap with gap-x-3 gap-y-3; title+toggle group is flex-wrap min-w-0; title whitespace-nowrap so it no longer breaks into two lines; List/Kanban toggle shrink-0 with min-h-11 and px-3 buttons, type="button", aria-pressed bound to taskView, inactive text stone-500.
- Search+Task group: w-full below sm (wraps to its own row under the title), search is flex-1 min-w-0 (fixed w-40 only from sm), Task button min-h-11 shrink-0, so Task stays inside the card at 375 and at 1024. No overflow-hidden added; no ancestor nowrap.
- Task list rows: gap-3; text column min-w-0 flex-1 with break-words title; status/deadline/time meta wraps; tags block shrink-0 right-aligned with max-w-[7rem] below sm and wrapping, chevron kept. All controls retained.
Fundraising: every Button with fixed h-6/h-7/h-8/h-9 (and h-7 w-7 icon buttons) now uses min-h-11 (min-w-11) so the shared 44px touch rule applies and rows can grow: save/cancel, Data room/Schedule/assistant side actions, Watch/Details/Message/Edit round, program and opportunity Apply/Ask, SAFE actions, filter cyclers, scheduler Cancel/Schedule, data room upload/close. Native email-template chips (Cold Intro/Follow-up/Data room), "Schedule meeting", "View all N meetings" and "Open data room" got min-h-11 (and py-1 where needed). Meeting-type choices already had aria-pressed; kept. Containing rows already use flex-wrap/grid so they can wrap; fonts unchanged.
Unverified: not run. Possible remaining: Fundraising pipeline tiny icon buttons (min-h-8) at lines ~746/809 and h-7 w-7 decorative tiles were left as-is; larger buttons may lengthen cards.
