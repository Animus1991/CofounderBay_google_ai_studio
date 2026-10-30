/**
 * Text helpers shared by the assistant's router modules.
 *
 * `fold` lowercases and strips accents, so «Πρόσθεσε» and "προσθεσε" match.
 * `hasStem` exists because `\b` does not treat Greek letters as word
 * characters: Greek stems match anywhere, Latin stems need a non-letter on
 * each side ("add" must not match "address").
 */
export function fold(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function hasStem(hay: string, ...stems: string[]): boolean {
  return stems.some((stem) => {
    if (/[a-z0-9]/.test(stem) && !/[α-ω]/.test(stem)) {
      return new RegExp(`(?:^|[^a-z0-9])${stem}(?:$|[^a-z0-9])`).test(hay);
    }
    return hay.includes(stem);
  });
}

/** Escapes a literal for use inside a RegExp. */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
