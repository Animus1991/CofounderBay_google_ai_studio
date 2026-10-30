# CoFounderBay — Έλεγχος & Πλάνο Αναβάθμισης (branch `claude/ai-os-upgrade`)

> Ημερομηνία: Ιούνιος 2026 · Βάση: `claude/ai-os-upgrade` (a908287) · Στόχος: το AI ως κεντρικός
> «χειριστής» της πλατφόρμας, ενιαίο UX, σταθερή αρχιτεκτονική δεδομένων.

## 1. Τι βρέθηκε (αντικειμενικός έλεγχος)

### 1.1 Δυνατά σημεία που διατηρούνται
| Περιοχή | Εύρημα |
| --- | --- |
| AI operator | Δηλωτικός κατάλογος ενεργειών (`ai/catalog.ts`), ντετερμινιστικός router πρώτα, μοντέλο μόνο για ό,τι δεν αντιστοιχίζεται, Confirm + Undo για κάθε εγγραφή, eval suite 245 περιπτώσεων EN/EL. |
| Ενιαία δεδομένα | Όλες οι σελίδες και ο βοηθός διαβάζουν/γράφουν τις ίδιες λίστες (`lib/localLists.ts`), με cloud sync για λογαριασμούς. |
| Page registry | Μία περιγραφή ανά σελίδα (sidebar, ⌘K, titles, βοηθός) με test κάλυψης. |
| UI | Ενιαίο `PageShell`, μονόχρωμη παλέτα, δίγλωσσο (EN/EL), lazy routes, reduced-motion. |

### 1.2 Κενά / ρίσκα
| # | Κενό | Επίπτωση | Κατάσταση |
| --- | --- | --- | --- |
| G1 | Backend ήταν in-memory Express mock (`server.ts`) — δεδομένα χάνονταν σε κάθε restart, τυχαία (Math.random) σκορ συμβατότητας σε κάθε refresh. | Ασυνέπεια, μη αναπαραγώγιμα σκορ | ✅ FastAPI + MongoDB, ντετερμινιστικά σκορ |
| G2 | AI proxy δεμένο σε Gemini key στο περιβάλλον. | Χωρίς key → χωρίς AI | ✅ Claude Opus 5.5 μέσω server proxy, ίδιο συμβόλαιο (`text` + `functionCalls`), JSON mode, εικόνες, rate limit |
| G3 | ~25 από ~60 λίστες ήταν «τυφλές» για τον βοηθό (pitch deck, νομική λίστα, focus, saved searches κ.ά.). | Το AI δεν μπορούσε να συμπληρώσει τα πάντα | ✅ 7 νέες ενέργειες (βλ. §2) |
| G4 | Δεν υπήρχε ιστορικό/έλεγχος για το τι άλλαξε ο βοηθός (μόνο τοπικό transcript). | Χαμηλή διαφάνεια/εμπιστοσύνη | ✅ Server-side AI action ledger + πάνελ «Ιστορικό ενεργειών» |
| G5 | «AI Profile Insight» στο Προφίλ έδειχνε σταθερά νούμερα/κείμενο. | Ψευδο-AI | ✅ Πραγματική ανάλυση AI με 3 εκτελέσιμες επόμενες ενέργειες |
| G6 | Η λίστα συμμόρφωσης ήταν ορισμένη μέσα στη σελίδα· focus stats μέσα στο Workspace. | Διπλή λογική, ο βοηθός δεν μπορούσε να τα δει | ✅ `lib/legalChecklist.ts`, `lib/focusStats.ts` (μία πηγή) |
| G7 | Founder Tools δεν δεχόταν `?tab=` → deep links του βοηθού δεν άνοιγαν την καρτέλα. | Σπασμένη ροή | ✅ |
| G8 | Messages: κενό padding κάτω από το full-height chat σε desktop. | Οπτική ασυνέπεια | ✅ |
| G9 | Vitest timeouts 5 s σε φορτωμένα περιβάλλοντα (Milestones/Chat). | Ψευδώς κόκκινο CI | ✅ testTimeout 20 s |
| G10 | `investorCrm`, `dueDiligence`, `capTable`, `compliance` keys δηλωμένα αλλά αχρησιμοποίητα. | Νεκρός κώδικας / υπόσχεση χωρίς λειτουργία | ⏳ Backlog P1 (CRM επενδυτών ως λίστα + ενέργειες AI) |
| G11 | AdminDashboard / CommunicationHub / ProfilePage εκτός `PageShell`. | Μικρή απόκλιση header | ⏳ Σκόπιμα full-bleed· ευθυγράμμιση spacing σε P2 |

## 2. Τι υλοποιήθηκε σε αυτόν τον γύρο

**Αρχιτεκτονική & δεδομένα**
- `backend/server.py` (FastAPI + MongoDB): tenants, users, matches, mentors, communities/posts,
  conversations/messages (+ `POST /api/messages`), AI proxy (`/api/ai/generate`, `/api/ai/status`),
  AI action ledger (`/api/ai/actions`), ai_usage log. Seed idempotent από `backend/seed.json`.
- Frontend: Vite app στη θέση του template, `yarn start` → port 3000, same-origin `/api`.

**AI που ελέγχει και συμπληρώνει τα πάντα**
| Νέα ενέργεια | Τύπος | Παράδειγμα |
| --- | --- | --- |
| `studio_audit` | read | «Audit my studio» / `/audit` — 8 περιοχές, % πληρότητας, η πρόταση που διορθώνει κάθε κενό |
| `read_pitch_deck` | read | «Show my pitch deck status» / `/pitch` |
| `set_pitch_slide` | write (full undo) | «Set the problem slide to …» / «Όρισε τη διαφάνεια problem σε …» |
| `read_legal_checklist` | read | «Show my legal checklist» / `/legal` |
| `set_legal_item` | write (full undo) | «Mark EIN done» / «Σημείωσε το EIN ως ολοκληρωμένο» |
| `focus_today` | read | «How much did I focus today?» / `/focus` |
| `saved_searches` | read | «Show my saved searches» / `/searches` |

- Ledger: κάθε πρόταση → applied / cancelled / undone / failed, με πηγή (router ή μοντέλο).
- AI Studio: κουμπί «Run a studio check», πάνελ «Action history».
- Προφίλ: «AI review of your profile» → σύνοψη, δυνατά/κενά, 3 κουμπιά που στέλνουν εντολή στον βοηθό.
- Starters ανά σελίδα για τις νέες ενέργειες (Dashboard, Legal, Founder Tools, Workspace, Discovery).

## 3. Πλάνο συνέχειας (προτεραιοποιημένο)

**P0 — συνέπεια δεδομένων**
1. Investor CRM ως πραγματική λίστα (`keys.investors`) με στάδια + ενέργειες AI (`add_investor`, `move_investor_stage`).
2. Due-diligence & cap table ως αποθηκευμένα δεδομένα αντί για υπολογισμό μέσα στη σελίδα.
3. Server mirror (Mongo) για τον demo χώρο, ώστε «Backup & restore» να δουλεύει χωρίς Firebase.

**P1 — AI-first**
4. Proactive nudges: ο έλεγχος studio τρέχει στο Dashboard και προτείνει 1 ενέργεια/ημέρα.
5. Multi-step plans: το μοντέλο προτείνει ακολουθία ενεργειών (π.χ. γράψε 3 διαφάνειες) ως μία κάρτα με επιμέρους Confirm.
6. Streaming απαντήσεων (SSE) για τους specialists.

**P2 — UX/UI**
7. Ευθυγράμμιση header/spacing σε Admin/Messages/Profile με τα tokens του `PageShell`.
8. Ενιαίο empty-state copy pattern σε όλα τα πάνελ.
9. Lighthouse/a11y pass ανά σελίδα (contrast στις amber/stone αποχρώσεις, focus rings).
