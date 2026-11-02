/**
 * Reads a priced-round question — "model raising 2M at 8M pre", "what if we
 * raise $1.5M at a $10M pre-money with a 15% pool", «μοντελοποίησε γύρο 2M σε
 * 8M pre-money, pool 10%» — into the three inputs the cap-table tool takes
 * (lib/equity modelPricedRound): new money, pre-money and the option pool.
 *
 * It answers only when a valuation is named as pre- or post-money (or as "a
 * valuation of …"), so "set the cap to 10M" and SAFE questions keep their own
 * routes. A post-money figure is turned into pre-money (post − new money).
 * Input is folded text (lower case, no accents; services/assistantText fold).
 */
export type RoundQuery = {
  /** New money in the round, dollars. */
  investment: number;
  /** Pre-money valuation, dollars. */
  preMoney: number;
  /** Option pool after the round, percent (0–40); null when not named. */
  poolPct: number | null;
  /** The valuation was named as post-money and converted. */
  fromPost: boolean;
};

const UNITS: [RegExp, number][] = [
  [/^(b|bn|billion|δισ)/, 1_000_000_000],
  [/^(m|mn|million|εκ)/, 1_000_000],
  [/^(k|thousand|χιλ)/, 1_000],
];

type Token = { value: number; start: number; end: number };

function moneyTokens(folded: string): Token[] {
  const tokens: Token[] = [];
  const pattern = /(\d{1,3}(?:,\d{3})+|\d+(?:[.,]\d+)?)\s*(bn|b|mn|m|k|thousand|million|billion|χιλ[α-ω]*\.?|εκ[α-ω]*\.?|δισ[α-ω]*\.?)?(?![a-zα-ω0-9])/g;
  for (const match of folded.matchAll(pattern)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    // "10%" and "10 %" are the pool or a discount, not money.
    if (/^\s*%/.test(folded.slice(end))) continue;
    const raw = match[1] ?? '';
    const number = /^\d{1,3}(,\d{3})+$/.test(raw) ? Number(raw.replace(/,/g, '')) : Number.parseFloat(raw.replace(',', '.'));
    if (!Number.isFinite(number) || number <= 0) continue;
    const unit = (match[2] ?? '').trim();
    const multiplier = UNITS.find(([test]) => test.test(unit))?.[1] ?? 1;
    const value = Math.round(number * multiplier);
    // A bare small number ("10 days", "series 2") is not an amount of money.
    if (multiplier === 1 && value < 10_000) continue;
    tokens.push({ value, start, end });
  }
  return tokens;
}

const POOL = /(\d+(?:[.,]\d+)?)\s*%\s*(?:option\s*)?pool|(?:option\s*)?pool\s*(?:of|at|to|στο|σε|=)?\s*(\d+(?:[.,]\d+)?)\s*%/;
const AFTER_PRE = /^\s*(?:\$|€)?\s*(pre|pre-money|premoney)\b/;
const AFTER_POST = /^\s*(?:\$|€)?\s*(post|post-money|postmoney)\b/;
const BEFORE_VALUATION = /(valuation(?:\s+of)?|valued\s+at|αποτιμηση(?:\s+(?:των|του))?)\s*(?:\$|€)?\s*$/;
const INTENT = /\b(model|simulate|what if|raise|raising|priced round|round|series [a-c]|seed)\b|μοντελοποιησ|προσομοιωσ|αντλ|γυρο|γυρος|σειρα [α-γ]/;

export function parseRoundQuery(folded: string): RoundQuery | null {
  if (!INTENT.test(folded)) return null;
  const tokens = moneyTokens(folded);
  if (tokens.length < 2) return null;

  let valuation: { token: Token; post: boolean } | null = null;
  for (const token of tokens) {
    const after = folded.slice(token.end, token.end + 16);
    const before = folded.slice(Math.max(0, token.start - 24), token.start);
    if (AFTER_POST.test(after)) { valuation = { token, post: true }; break; }
    if (AFTER_PRE.test(after) || BEFORE_VALUATION.test(before)) { valuation = { token, post: false }; break; }
  }
  if (!valuation) return null;
  const investmentToken = tokens.find((token) => token !== valuation.token);
  if (!investmentToken) return null;

  const investment = investmentToken.value;
  const preMoney = valuation.post ? valuation.token.value - investment : valuation.token.value;
  if (!(preMoney > 0)) return null;

  const pool = folded.match(POOL);
  const poolRaw = pool ? pool[1] ?? pool[2] : null;
  const poolPct = poolRaw ? Math.min(40, Math.max(0, Number.parseFloat(poolRaw.replace(',', '.')))) : null;
  return { investment, preMoney, poolPct: poolPct != null && Number.isFinite(poolPct) ? poolPct : null, fromPost: valuation.post };
}
