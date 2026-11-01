# Χρώματα: τι παίρνουμε από το GitHub και τι όχι

**Ερώτημα:** να αντιγράψουμε τα δευτερεύοντα χρώματα του github.com και την αρμονία τους με τα κεντρικά; Ή
τουλάχιστον τη λογική εναρμόνισης, και τα σημεία όπου τα χρησιμοποιεί, για παράδειγμα τα περιγράμματα;

**Απάντηση:** τη **λογική ναι**, τις **αποχρώσεις όχι**. Το GitHub χρησιμοποιεί το design system Primer.

## 1. Η λογική του Primer

| Αρχή | Πώς εφαρμόζεται στο GitHub |
| --- | --- |
| **Ουδέτερο πρώτα** | Το μεγαλύτερο μέρος της σελίδας είναι ουδέτερο: φόντα `canvas.default` (λευκό) και `canvas.subtle` (#f6f8fa), κείμενα `fg.default` και `fg.muted`. |
| **Ορατό ουδέτερο περίγραμμα σε κάθε container** | Κάρτες (Box), inputs και δευτερεύοντα κουμπιά έχουν 1px `borderColor-default` (#d1d9e0, 1,43:1 σε λευκό). Τα διαχωριστικά μέσα σε container έχουν `borderColor-muted` (≈1,28:1). |
| **Το accent μόνο για ό,τι είναι διαδραστικό, επιλεγμένο ή focused** | Σύνδεσμοι, επιλεγμένο tab, focus outline 2px. Δεν χρησιμοποιείται για διακόσμηση. |
| **Κάθε σημασιολογική οικογένεια έχει 4 παραλλαγές** | `fg` για κείμενο και εικονίδια (AA), `emphasis` για συμπαγές γέμισμα με λευκό κείμενο, `muted` για περίγραμμα, `subtle` για ελαφρύ φόντο. |
| **Χρωματιστά περιγράμματα μόνο με νόημα** | Flash, Label, Danger zone: περίγραμμα `muted` της οικογένειας, φόντο `subtle`, κείμενο `fg`. |
| **Focus** | `outline: 2px solid` στο accent, πάντα ορατό. |

## 2. Γιατί όχι οι ίδιες οι αποχρώσεις

1. **Ταυτότητα.** Το μπλε #0969da και τα ψυχρά γκρι είναι η ταυτότητα του GitHub. Μια πλατφόρμα που μοιάζει
   με GitHub χάνει τη δική της.
2. **Επτά θέματα.** Ο χρήστης διαλέγει Stone, Cyan, Mint, Apricot, Lilac, Burgundy ή Dark Obsidian. Ένα σταθερό
   μπλε accent θα συγκρουόταν με όλα.
3. **Ζεστός τόνος.** Η βάση μας είναι stone, ζεστό γκρι. Τα ψυχρά γκρι του Primer δεν δένουν μαζί του. Κρατάμε
   λοιπόν τον τόνο μας και αντιγράφουμε μόνο τα **επίπεδα αντίθεσης** του Primer.

## 3. Αντιστοίχιση ρόλων: Primer → δικά μας tokens

Η αρχιτεκτονική ρόλων υπήρχε ήδη (`src/styles/tokens.css`, `docs/THEMES.md`):

| Primer | Εμείς | Κλάση που το χρησιμοποιεί |
| --- | --- | --- |
| `bgColor-default` / `-muted` / `-inset` | `--surface-white` / `--surface-50` / `--surface-100` | `bg-white`, `bg-stone-50`, `bg-stone-100` |
| `fgColor-default` / `-muted` | `--ink-900` / `--ink-500` | `text-stone-900`, `text-stone-500` |
| `borderColor-muted` | `--line-100` | `border-stone-100`, `divide-stone-100` |
| `borderColor-default` | `--line-200` | `border-stone-200` |
| `fgColor-accent` / `bgColor-accent-emphasis` / `-muted` / `-subtle` | `--primary-ink` / `--cfb-accent` (`--primary-fill`) / `--cfb-accent-border` / `--cfb-accent-soft` | `text-primary`, `bg-stone-900` στα accent θέματα, επιλεγμένα στοιχεία |
| `fgColor-{success,attention,danger,done}` | `--ink-{success,warning,danger,violet}` | `text-emerald/amber/red/violet-600` |
| `…-emphasis` | `--ink-*-strong` | `text-*-700/800` |
| `…-muted` (περίγραμμα) | `--line-{success,warning,danger,info,violet}` | `border-*-200` |
| `…-subtle` (φόντο) | `--tint-*` | `bg-*-50` |
| `focus-outlineColor` | `--ring-strong` (accent στα accent θέματα) | `ring-stone-900` |

## 4. Τι άλλαξε σε αυτόν τον γύρο

| Πριν | Μετά | Λόγος |
| --- | --- | --- |
| Τα light θέματα άφηναν τα `--line-50/100/200/300` στο Tailwind: stone-100 = 1,09:1, stone-200 = 1,26:1 σε λευκό | `line-50` 1,17 · `line-100` **1,30** · `line-200` **1,50** · `line-300` 1,87 | Οι κάρτες σχεδόν δεν ξεχώριζαν από τη σελίδα. Πλέον έχουν τα επίπεδα του Primer (muted 1,28 / default 1,43), στον δικό μας ζεστό τόνο. |
| Dark: `line-100` = `line-200` = 0,18 alpha | 0,24 / 0,30 / 0,42 | Ίδια κλιμάκωση με τα light θέματα (Primer dark ≈ 1,9:1). |
| Το `Button` είχε focus ring 1px σε γκρι | 2px στο `--ring-strong` (accent), offset 2px | Το focus του Primer είναι 2px στο accent· το 1px γκρι χανόταν. |
| Η «Διαγραφή λογαριασμού» είχε το ίδιο ουδέτερο περίγραμμα με την «Εξαγωγή» | Περίγραμμα κινδύνου (`border-red-200`, δηλαδή `--line-danger`) | Λογική «Danger zone»: η μη αναστρέψιμη ενέργεια ξεχωρίζει πριν πατηθεί. |

**Δεν αλλάζει:** καμία γραμματοσειρά, κανένα accent, κανένα κείμενο. Επειδή η αλλαγή έγινε στα tokens, ισχύει
σε όλες τις σελίδες και σε κάθε θέμα χωρίς να αλλάξει κανένα component. Οι ετικέτες κατάστασης
(φόντο `subtle`, περίγραμμα `muted`, κείμενο `fg`) ακολουθούσαν ήδη τη λογική του Primer και μένουν ως έχουν.

## 5. Πώς ελέγχεται

- `src/test/themeTokens.test.ts`: το `line-100` είναι τουλάχιστον 1,25:1 και το `line-200` τουλάχιστον 1,4:1
  σε λευκό· η κλίμακα αυξάνει μονότονα σε light και dark· όλοι οι υπάρχοντες έλεγχοι AA για κείμενα παραμένουν.
- `e2e/a11y-themes.spec.ts`: ο κανόνας αντίθεσης του axe σε 6 θέματα και 4 οθόνες.
