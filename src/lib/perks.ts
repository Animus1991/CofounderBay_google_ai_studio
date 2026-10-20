/** Sums the dollar amounts quoted in perk values ("$100,000 Credits", "$500
 * Bonus") so the savings figure always agrees with the cards it sums. */
export function perkDollarTotal(list: { value: string }[]): string {
  const total = list.reduce((sum, perk) => {
    const amount = perk.value.match(/\$([\d,]+)/)?.[1];
    return sum + (amount ? Number(amount.replace(/,/g, '')) : 0);
  }, 0);
  return `$${Math.floor(total / 1000)}k+`;
}
