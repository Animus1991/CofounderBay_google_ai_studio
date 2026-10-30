## Iteration 3 (2026-06)
- Confirm all / Cancel all on multi-step plans. Every step is still applied, logged and undone on its own.
- Investor follow-up emails: '/investor email X', 'Draft a follow-up email to X', or the Greek equivalent. Each one is a stage-aware template that Claude rewrites using only the facts given; if the model is unreachable the template stays. The CRM card has a 'Draft email' button.
- Overdue investor alerts: a red alert on the Dashboard above the daily step, plus live notifications computed from the data (origin 'derived', read state kept in keys.derivedRead).
- Due-diligence tracker at Fundraising → Due diligence (?tab=dd). It has 12 standard items in 5 categories, status cycling, notes, custom items, and data-room file hints. The Tracker mini card reads the same data.
- Read-only investor share links. The backend has /api/dd/shares (create, update, list, revoke) and /api/dd/public/{token}, which counts views. A public page lives at /dd/:token. Assistant actions: read_due_diligence, set_dd_item, share_due_diligence (Undo revokes the link).
- Tests: 570 vitest and 39 backend pytest pass.
- Note: share ownership is tied to the device or account id, not to real auth. Add auth before production.
