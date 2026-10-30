# Themes

Seven themes — Stone (default), Cyan, Mint, Apricot, Lilac, Burgundy and Dark
Obsidian — come from one file: `src/styles/tokens.css`. The theme is the
`data-theme` attribute on `<html>` (`src/stores/useUIStore.ts`; Stone has none).

## How a class gets its colour

Components keep Tailwind's neutral and status classes. Tailwind 4 lets a colour
be defined per property, so each of those classes reads a **role token** instead
of a fixed colour:

| Class | Token | Role |
| --- | --- | --- |
| `bg-white`, `bg-stone-50 … 300`, `bg-stone-800/900` | `--surface-white`, `--surface-50` … `--surface-900` | surfaces; 900/800 are the inverse fill (primary buttons, banners) |
| `text-stone-200 … 900` | `--ink-200` … `--ink-900` | text, from faint to strong |
| `border-stone-50 … 400/900`, `divide-*` | `--line-50` … `--line-900` | lines |
| `ring-stone-900` | `--ring-strong` | focus and selection rings |
| `text-primary`, `bg-primary` | `--primary-ink`, `--primary-fill` | the accent as text, as a fill |
| `text-red/amber/emerald/blue/violet-*` | `--ink-danger`, `--ink-warning`, `--ink-success`, `--ink-info`, `--ink-violet` (`-soft` / `-strong`) | status text |
| `bg-{family}-50/100/200` | `--tint-*` | status pastel surfaces |
| `border-{family}-100/200/300` | `--line-*` | status outlines |

A token left unset falls back to Tailwind's own colour, so Stone sets only what
it changes. Every variant — `hover:`, `group-hover:`, `focus:`, `md:`, `/50` —
follows the token without extra CSS.

## Surfaces set the inks on them

An inverse surface (`bg-stone-900`, `bg-stone-800`, `bg-black`) sets `--on-ink-*`
so muted and status text on it reads light; a light card inside it (`bg-white`,
`bg-stone-50/100`) clears them again. Classes resolve as
`var(--on-ink-500, var(--ink-500, <Tailwind's stone-500>))`.

## What tokens cannot say

A short section at the end of `tokens.css` keeps the few rules that combine
properties or states: a fill that turns inverse on hover turns its text white,
the selected (`bg-stone-200`) fill carries its outline in accent and dark themes,
light buttons inside an inverse banner, Dark Obsidian's hero gradients and warm
maroon cards, warm status icons. None of them uses `!important`.

## Adding or changing a theme

1. Add the accent's `--cfb-accent`, `-soft`, `-border`, `-hover` and `--primary` in
   `src/index.css` (`@layer base`), and the attribute to the accent selector lists
   in `tokens.css`.
2. For a dark theme, give every role a value (copy the Dark Obsidian block).
3. Run `npm test` — `src/test/themeTokens.test.ts` reads the tokens and fails if
   text drops under WCAG AA (4.5:1) on the surfaces it is used on, or if an
   `!important` override comes back. `e2e/a11y-themes.spec.ts` runs axe's
   contrast rule in every theme in a real browser.

## Status colours

Five families, one meaning each: red = danger, amber = warning, emerald =
success, blue = information, violet = AI / special. `src/test/palette.test.ts`
fails on any other family outside the theme picker's swatches, because those
classes have no tokens and would not follow the theme.
