/**
 * Reads "add a shareholder" sentences into one cap-table line:
 *   "Add Maria Papadopoulou as a shareholder with 500k shares"
 *   "add an option pool of 1M shares"
 *   «Πρόσθεσε μέτοχο τη Μαρία με 500 χιλ. μετοχές»
 *
 * Input is the original sentence; matching runs on the folded copy (lower
 * case, no accents) and the name is cut from the original at the same place,
 * so it keeps its capitals and accents.
 */
import { fold } from '../services/assistantText';

export type ShareholderQuery = { name: string; shares: number; kind?: 'pool' };

const COUNT = String.raw`(\d{1,3}(?:,\d{3})+|\d+(?:[.,]\d+)?)\s*(k|m|mn|thousand|million|χιλ[α-ω]*\.?|εκ[α-ω]*\.?)?`;

function count(raw: string, unit: string | undefined): number | null {
  const number = /^\d{1,3}(,\d{3})+$/.test(raw) ? Number(raw.replace(/,/g, '')) : Number.parseFloat(raw.replace(',', '.'));
  if (!Number.isFinite(number) || number <= 0) return null;
  const u = (unit ?? '').trim();
  const multiplier = /^(m|mn|million|εκ)/.test(u) ? 1_000_000 : /^(k|thousand|χιλ)/.test(u) ? 1_000 : 1;
  return Math.round(number * multiplier);
}

const PATTERNS: RegExp[] = [
  // add Maria as a shareholder with 500k shares / add Maria to the cap table with 500k shares
  new RegExp(String.raw`\badd\s+(.+?)\s+(?:as\s+an?\s+(?:shareholder|holder)|to\s+(?:the|my)\s+cap\s*table)\s+with\s+${COUNT}\s*shares?\b`),
  // add a shareholder (named) Maria with 500k shares
  new RegExp(String.raw`\badd\s+an?\s+(?:shareholder|holder)\s+(?:named\s+|called\s+)?(.+?)\s+with\s+${COUNT}\s*shares?\b`),
  // πρόσθεσε (μέτοχο|στο cap table) — \b does not see Greek letters, so the start is matched explicitly.
  // πρόσθεσε (μέτοχο|στο cap table) (τον|την|το)? Μαρία με 500k μετοχές
  new RegExp(String.raw`(?:^|\s)προσθεσε\s+(?:μετοχο|στο\s+cap\s*table)\s+(?:τον\s+|την\s+|τη\s+|το\s+)?(.+?)\s+με\s+${COUNT}\s*μετοχ`),
];

const POOL = new RegExp(String.raw`\b(?:add|create)\s+an?\s+(?:option\s+)?pool\s+(?:of\s+)?${COUNT}\s*shares?\b|(?:^|\s)προσθεσε\s+(?:option\s+)?pool\s+(?:με\s+)?${COUNT}\s*μετοχ`);

export function parseShareholderQuery(query: string): ShareholderQuery | null {
  const original = query.trim();
  const folded = fold(original);
  const pool = folded.match(POOL);
  if (pool) {
    const shares = count(pool[1] ?? pool[3] ?? '', pool[1] ? pool[2] : pool[4]);
    return shares ? { name: 'Option pool', shares, kind: 'pool' } : null;
  }
  for (const pattern of PATTERNS) {
    const match = folded.match(pattern);
    if (!match || match.index == null) continue;
    const shares = count(match[2] ?? '', match[3]);
    if (!shares) return null;
    // Fold keeps the length of a precomposed (NFC) sentence, so the name's place is the same in the original.
    const at = folded.indexOf(match[1]!, match.index);
    const raw = (folded.length === original.length && at >= 0 ? original.slice(at, at + match[1]!.length) : match[1]!).trim().replace(/^["'«]|["'»]$/g, '');
    if (!raw || raw.length > 60) return null;
    const name = raw[0]!.toUpperCase() + raw.slice(1);
    return { name, shares };
  }
  return null;
}
