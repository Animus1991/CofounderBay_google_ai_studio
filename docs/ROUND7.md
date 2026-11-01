# Round 7 — Ο βοηθός κλείνει τον κύκλο

## 1. Σύγκριση με το παρελθόν

Το `origin/main` (04b7e76) ήταν αυστηρό υπερσύνολο του προηγούμενου branch μας
(`bedc6cc`): 33 commits από άλλους agents μπήκαν πάνω στη δουλειά μας χωρίς να
χαθεί τίποτα — τα usage stats, τα pins, το `/coach`, το Fit Check, το Burgundy
theme, τα colour tunings και το stat-strip επέζησαν όλα την επανεγγραφή των
theme tokens. Ο γύρος ξεκίνησε λοιπόν με καθαρή εικόνα του παρόντος, όχι με
υποθέσεις από την προηγούμενη σειρά.

## 2. Ευρήματα ελέγχου

| # | Εύρημα | Απόδειξη |
| --- | --- | --- |
| 1 | Ο βοηθός δημιουργεί αλλά δεν «κλείνει τον κύκλο»: δεν ολοκληρώνει/μετακινεί/διαγράφει εργασίες, δεν ενημερώνει ορόσημα, δεν μεταφέρει/ακυρώνει συναντήσεις, δεν εγγράφει σε εκδηλώσεις, δεν διαβάζει το πρόγραμμα της ημέρας | `assistantOps` είχε μόνο `task-add`, `milestone-add`, `session-add` |
| 2 | Οι προθεσμίες εργασιών ήταν παγωμένα κείμενα («2d left») που δεν γερνούσαν ποτέ | `StudioTask.deadline` string στο `localLists` |
| 3 | Το schedule αγνοούσε τίτλο, συμμετέχοντα και ώρα — πάντα «10:00 αύριο» | `sessionAddResult` |
| 4 | Πέντε ευρήματα προσβασιμότητας από τον έλεγχο του γύρου | `.probes/round7/audit.json` |
| 5 | Η δημόσια σελίδα `/dd/:token` είχε αγγλικό-only error state | `DueDiligenceSharePage.tsx` |
| 6 | Flake στο e2e του KPI: διάβαζε μετά από σταθερό 1500ms | `handoff5-check.spec.ts:18` |
| 7 | Δεν υπήρχε read για αιτήματα σύνδεσης ούτε εξαγωγή δεδομένων από τον βοηθό | — |

## 3. Σχέδιο

- Κοινά helpers: `parseTime`, `setEventRegistration`, `agendaFor`.
- `StudioTask.due` ως πραγματική ημερομηνία· το chip υπολογίζει την ετικέτα από
  το σήμερα (Σήμερα/Αύριο/απομένουν N ημ./καθυστέρηση N ημ.).
- Νέες ικανότητες: `update_task`, `update_milestone`, `update_session`,
  `register_event`, `read_agenda`, `read_requests`, `answer_request`,
  `export_data` — όλες proposal + Undo όπου είναι τίμιο, όλες στις ίδιες
  λίστες με τις σελίδες.

## 4. Υλοποίηση

| Αρχείο | Τι άλλαξε |
| --- | --- |
| `src/services/assistantTime.ts` | Νέο: `parseTime` (EN/EL, business-hours για «στις 3», αποκλείει ημερομηνίες/ποσά) + tests |
| `src/lib/eventRegistration.ts` | Νέο: `setEventRegistration` — η σελίδα Events και ο βοηθός καλούν το ίδιο |
| `src/lib/agenda.ts` | Νέο: `agendaFor` (sessions/milestones/follow-ups/tasks) + tests |
| `src/lib/localLists.ts` | `StudioTask.due`, `taskDue`/`taskDueLabel`, `updateStudioTask`, `insertStudioTask`, demo seeds με `due`, demo sessions από `DEMO_INVESTOR_MEETINGS` |
| `src/pages/Events.tsx` | Το toggle καλεί `setEventRegistration` (ίδια συμπεριφορά) |
| `src/pages/Workspace.tsx` | Το chip προθεσμίας διαβάζει `taskDueLabel` |
| `src/services/assistantOps.ts` | 8 νέες/επεκτεταμένες ικανότητες· `sessionAddResult` με τίτλο/ημέρα/ώρα· `addTaskResult` με `due`· ελληνικά stems παντού |
| `src/ai/catalog.ts` | 86 δηλωμένες ικανότητες (8 νέες + εμπλουτισμένο `schedule_session`) |
| `src/ai/whereIs.ts` | agenda → /calendar, requests → /network?tab=requests |
| `src/pages/admin/AutomationDashboard.tsx`, `CommunicationHub.tsx`, `ProfilePage.tsx`, `FitCheck.tsx`, `admin/UserManagement.tsx` | Πέντε axe διορθώσεις (select-name, nested-interactive, aria-prohibited-attr, link-name, scrollable-region) |
| `src/pages/DueDiligenceSharePage.tsx` | Error state δίγλωσσο |
| `e2e/handoff5-check.spec.ts`, `e2e/assistant.spec.ts` | Flake fix (expect.poll) + νέο τεστ «ολοκλήρωσα την εργασία…» |
| `src/services/assistantOps.test.ts`, `assistantTime.test.ts`, `agenda.test.ts`, `eventRegistration.test.ts`, `taskDue.test.ts` | ~30 νέα τεστ |

## 5. Επαλήθευση

| Έλεγχος | Αποτέλεσμα |
| --- | --- |
| typecheck / typecheck:strict | ✓ |
| lint | ✓ |
| vitest | 392 τεστ, όλα πράσινα |
| check:links / check:buttons | ✓ |
| build / check:bundle | ✓ |
| playwright (assistant, a11y, handoff5, mobile-chrome, smoke) | πράσινο |
| After-audit 9 routes × 4 configs | τα axe ευρήματα έφυγαν· 0 νέα |

Απόφαση σημείου: «mark X done» χωρίς τη λέξη «εργασία» και χωρίς ταίριασμα
εργασίας πέφτει στο briefing (δεν ρωτάει), γιατί θα έκλεβε τα legal/dd
παραδείγματα («mark EIN done») — η ρητή «διάγραψε την εργασία X» ρωτάει κανονικά.
