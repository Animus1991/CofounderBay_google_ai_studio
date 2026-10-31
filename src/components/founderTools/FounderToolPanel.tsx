/**
 * What a Founder Tools tile opens.
 *
 * Seven calculators work on the account's own numbers (the round, the cap
 * table) through one tested math library (lib/equity), and every document
 * tool opens its professional outline (data/toolDocs) with a real download,
 * a copy and a draft by the assistant. Inputs here are what-if values: only
 * the explicit "Save to my round" / cap-table edits change stored data.
 */
import { useId, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Download, Plus, Save, Trash2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Sparkline from '../ui/Sparkline';
import { cn } from '../../lib/utils';
import { useLanguage, useT } from '../../lib/language';
import { useStored } from '../../lib/useStored';
import { keys, readRound, writeRound } from '../../lib/localLists';
import { capTable, roundSafes, useEntity, ventureName, type CapTableHolder } from '../../lib/entities';
import {
  BERKUS_FACTORS,
  SCORECARD_FACTORS,
  annualized,
  berkusValuation,
  burnMultiple,
  burnMultipleRating,
  equityGrant,
  formatMoney,
  formatPct,
  modelPricedRound,
  monthlyGrowthRate,
  proFormaCapTable,
  safeOwnershipAtCap,
  scorecardValuation,
  simulateRunway,
  unitEconomics,
  valuationRange,
  vcMethodValuation,
  type BerkusKey,
  type ScorecardKey,
} from '../../lib/equity';
import { TOOL_DOCS, toolDocMarkdown } from '../../data/toolDocs';
import { FOUNDER_TEMPLATES } from '../../data/templates';
import { copyText, downloadCsv, downloadWord, slugify } from '../../lib/download';
import { askAssistant } from '../../lib/assistantBus';
import { isInteractiveTool } from './tools';


type Props = {
  toolId: string | null;
  toolName?: string;
  onClose: () => void;
  onToast: (message: string) => void;
};

export default function FounderToolPanel({ toolId, toolName, onClose, onToast }: Props) {
  const t = useT();
  const open = Boolean(toolId && isInteractiveTool(toolId));
  const description = toolId ? DESCRIPTIONS[toolId] : undefined;
  return (
    <Modal open={open} onClose={onClose} title={toolName} description={description ? t(description.en, description.el) : undefined} size="2xl">
      {toolId === 'safe' && <SafeTool onToast={onToast} />}
      {toolId === 'captable' && <CapTableTool onToast={onToast} />}
      {toolId === 'valuation' && <ValuationTool onToast={onToast} />}
      {(toolId === 'burn' || toolId === 'model') && <RunwayTool onToast={onToast} forecast={toolId === 'model'} />}
      {toolId === 'equity' && <EquityTool />}
      {toolId === 'metrics' && <MetricsTool />}
      {toolId && toolId in TOOL_DOCS && <DocTool toolId={toolId} title={toolName ?? toolId} onToast={onToast} onClose={onClose} />}
    </Modal>
  );
}

const DESCRIPTIONS: Record<string, { en: string; el: string }> = {
  safe: { en: 'Post-money SAFE (Y Combinator): ownership = amount ÷ post-money cap. At the priced round it converts at the lower of the cap price and the discount price.', el: 'Post-money SAFE (Y Combinator): ποσοστό = ποσό ÷ post-money cap. Στον γύρο με τιμή μετατρέπεται στη χαμηλότερη από την τιμή του cap και την τιμή με έκπτωση.' },
  captable: { en: 'Who owns what today, and what a priced round would do to it — SAFE conversion and the option pool included.', el: 'Ποιος κατέχει τι σήμερα, και τι θα έκανε ένας γύρος με τιμή — με μετατροπή SAFE και option pool.' },
  valuation: { en: 'Three established pre-revenue methods side by side. They give a range to negotiate from, not a price.', el: 'Τρεις καθιερωμένες μέθοδοι πριν από έσοδα, δίπλα-δίπλα. Δίνουν εύρος για διαπραγμάτευση, όχι τιμή.' },
  burn: { en: 'Month-by-month cash, with revenue growth: when the money runs out, when revenue covers costs, and whether you are default alive.', el: 'Μετρητά μήνα προς μήνα, με ανάπτυξη εσόδων: πότε τελειώνουν, πότε τα έσοδα καλύπτουν τα έξοδα, και αν είσαι default alive.' },
  model: { en: 'A 36-month cash forecast from today\'s revenue, costs and growth, exportable as a spreadsheet.', el: 'Πρόβλεψη μετρητών 36 μηνών από τα σημερινά έσοδα, έξοδα και ανάπτυξη, με εξαγωγή σε λογιστικό φύλλο.' },
  equity: { en: 'Size an option grant, see its paper value and how it vests (4 years, 1-year cliff by default).', el: 'Υπολόγισε ένα grant δικαιωμάτων, την αξία του και πώς κατοχυρώνεται (4 έτη, 1 έτος cliff από προεπιλογή).' },
  metrics: { en: 'Unit economics and efficiency with the usual benchmarks: LTV:CAC, CAC payback, burn multiple and growth.', el: 'Οικονομικά μονάδας και αποδοτικότητα με τα συνήθη σημεία αναφοράς: LTV:CAC, CAC payback, burn multiple και ανάπτυξη.' },
};

// ── Small building blocks ───────────────────────────────────────────────────

function NumberField({ label, value, onChange, suffix, step = 1, min = 0, max, hint }: { label: string; value: number; onChange: (value: number) => void; suffix?: string; step?: number; min?: number; max?: number; hint?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="block space-y-1">
      <span className="text-xs font-medium text-stone-600">{label}</span>
      <span className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 focus-within:border-stone-400">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(event.target.value === '' ? 0 : Number(event.target.value))}
          className="min-h-9 w-full bg-transparent text-sm tabular-nums text-stone-900 outline-none"
        />
        {suffix && <span className="text-xs text-stone-400 shrink-0">{suffix}</span>}
      </span>
      {hint && <span className="block text-[11px] leading-snug text-stone-400">{hint}</span>}
    </label>
  );
}

function RangeField({ label, value, onChange, min = 0, max = 100, step = 25, format }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; format: (value: number) => string }) {
  const id = useId();
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs text-stone-600">{label}</label>
        <span className="text-xs font-semibold tabular-nums text-stone-900">{format(value)}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-stone-900" />
    </div>
  );
}

function Stat({ label, value, tone, hint, testId }: { label: string; value: string; tone?: 'good' | 'warn' | 'bad'; hint?: string; testId?: string }) {
  return (
    <div className="rounded-xl border border-stone-100 bg-stone-50 p-3">
      <p className="text-[11px] font-medium text-stone-500">{label}</p>
      <p data-testid={testId} className={cn('text-sm font-semibold tabular-nums', tone === 'good' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : tone === 'bad' ? 'text-red-700' : 'text-stone-900')}>{value}</p>
      {hint && <p className="text-[11px] leading-snug text-stone-400">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-stone-500 tracking-wide">{title}</h3>
      {children}
    </section>
  );
}

const shares = (value: number) => Math.round(value).toLocaleString();

// ── SAFE ────────────────────────────────────────────────────────────────────

function SafeTool({ onToast }: { onToast: (message: string) => void }) {
  const t = useT();
  const { mode } = useLanguage();
  const round = useStored(readRound, [keys.round]);
  const holders = useEntity(capTable);
  const [amount, setAmount] = useState(() => round.committedAmount || 500_000);
  const [cap, setCap] = useState(() => round.valuationCap || 8_000_000);
  const [discount, setDiscount] = useState(() => round.discountPct || 20);
  const [nextPre, setNextPre] = useState(() => (round.valuationCap || 8_000_000) * 1.5);
  const [nextRaise, setNextRaise] = useState(() => Math.max(1_000_000, (round.targetAmount || 1_000_000) * 2));

  const ownership = safeOwnershipAtCap(amount, cap);
  const preMoneyReading = cap > 0 ? amount / (cap + amount) : null;
  const conversion = modelPricedRound({ holders, safes: [{ amount, cap, discount: discount / 100, holder: 'SAFE' }], preMoney: nextPre, investment: nextRaise });
  const safeRow = conversion.rows.find((row) => row.kind === 'safe');

  const summary = t(
    `SAFE: ${formatMoney(amount)} at a ${formatMoney(cap)} post-money cap, ${discount}% discount → ${ownership == null ? 'ownership set at the priced round' : `${formatPct(ownership)} before the priced round`}.${safeRow ? ` At a ${formatMoney(nextPre)} pre-money round raising ${formatMoney(nextRaise)} it converts by ${safeRow.convertedBy} at $${safeRow.pricePerShare?.toFixed(4)} per share to ${formatPct(safeRow.pctAfter)}.` : ''}`,
    `SAFE: ${formatMoney(amount)} με post-money cap ${formatMoney(cap)}, έκπτωση ${discount}% → ${ownership == null ? 'ποσοστό που ορίζεται στον γύρο με τιμή' : `${formatPct(ownership)} πριν από τον γύρο με τιμή`}.${safeRow ? ` Σε γύρο με pre-money ${formatMoney(nextPre)} και άντληση ${formatMoney(nextRaise)} μετατρέπεται (${safeRow.convertedBy === 'cap' ? 'με το cap' : safeRow.convertedBy === 'discount' ? 'με την έκπτωση' : 'στην τιμή του γύρου'}) στα $${safeRow.pricePerShare?.toFixed(4)} ανά μετοχή, σε ${formatPct(safeRow.pctAfter)}.` : ''}`,
  );

  return (
    <div className="space-y-5">
      <Section title={t('Terms', 'Όροι')}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumberField label={t('Investment ($)', 'Επένδυση ($)')} value={amount} onChange={setAmount} step={10_000} />
          <NumberField label={t('Post-money cap ($)', 'Post-money cap ($)')} value={cap} onChange={setCap} step={500_000} />
          <NumberField label={t('Discount', 'Έκπτωση')} value={discount} onChange={(value) => setDiscount(Math.min(90, Math.max(0, value)))} suffix="%" max={90} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Stat testId="safe-ownership" label={t('Ownership before the priced round', 'Ποσοστό πριν από τον γύρο με τιμή')} value={ownership == null ? t('Set at the priced round', 'Ορίζεται στον γύρο με τιμή') : formatPct(ownership)} hint={t('Amount ÷ post-money cap', 'Ποσό ÷ post-money cap')} />
          <Stat label={t('Pre-money reading (for comparison)', 'Ανάγνωση pre-money (για σύγκριση)')} value={preMoneyReading == null ? '—' : formatPct(preMoneyReading)} hint={t('Amount ÷ (cap + amount) — what an older pre-money SAFE would give', 'Ποσό ÷ (cap + ποσό) — ό,τι θα έδινε ένα παλαιότερο pre-money SAFE')} />
        </div>
      </Section>

      <Section title={t('At the priced round', 'Στον γύρο με τιμή')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumberField label={t('Next round pre-money ($)', 'Pre-money επόμενου γύρου ($)')} value={nextPre} onChange={setNextPre} step={500_000} />
          <NumberField label={t('Next round raise ($)', 'Άντληση επόμενου γύρου ($)')} value={nextRaise} onChange={setNextRaise} step={250_000} />
        </div>
        {conversion.ok && safeRow ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat label={t('Converts by', 'Μετατρέπεται με')} value={safeRow.convertedBy === 'cap' ? t('the cap', 'το cap') : safeRow.convertedBy === 'discount' ? t('the discount', 'την έκπτωση') : t('the round price', 'την τιμή του γύρου')} />
            <Stat label={t('SAFE price per share', 'Τιμή μετοχής SAFE')} value={`$${(safeRow.pricePerShare ?? 0).toFixed(4)}`} hint={t(`Round price $${conversion.pricePerShare.toFixed(4)}`, `Τιμή γύρου $${conversion.pricePerShare.toFixed(4)}`)} />
            <Stat label={t('Ownership after the round', 'Ποσοστό μετά τον γύρο')} value={formatPct(safeRow.pctAfter)} />
          </div>
        ) : (
          <p className="text-xs text-stone-500">{conversion.problem === 'safes-exceed-cap' ? t('The SAFE would own 100% or more at that cap — check the numbers.', 'Το SAFE θα κατείχε 100% ή περισσότερο με αυτό το cap — έλεγξε τους αριθμούς.') : t('Add a pre-money valuation and your cap table to see the conversion.', 'Πρόσθεσε pre-money αποτίμηση και cap table για να δεις τη μετατροπή.')}</p>
        )}
      </Section>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => { writeRound({ instrument: 'SAFE', valuationCap: cap, discountPct: discount }); onToast(t('Cap and discount saved to your round', 'Το cap και η έκπτωση αποθηκεύτηκαν στον γύρο σου')); }}>
          <Save className="w-3.5 h-3.5" /> {t('Use these terms for my round', 'Χρήση αυτών των όρων στον γύρο μου')}
        </Button>
        <Button size="sm" variant="outline" onClick={async () => onToast((await copyText(summary)) ? t('Summary copied', 'Η σύνοψη αντιγράφηκε') : t('Copy did not work in this browser', 'Η αντιγραφή δεν λειτούργησε σε αυτόν τον περιηγητή'))}>
          <Copy className="w-3.5 h-3.5" /> {t('Copy summary', 'Αντιγραφή σύνοψης')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => downloadTemplate(3, mode, onToast, t)}>
          <Download className="w-3.5 h-3.5" /> {t('SAFE term checklist', 'Λίστα όρων SAFE')}
        </Button>
      </div>
    </div>
  );
}

function downloadTemplate(id: number, mode: 'en' | 'el', onToast: (message: string) => void, t: (en: string, el: string) => string) {
  const template = FOUNDER_TEMPLATES.find((item) => item.id === id);
  if (!template) return;
  const name = mode === 'el' ? template.name.el : template.name.en;
  const built = template.build(mode);
  if (built.rows) downloadCsv(`${slugify(name)}.csv`, built.rows);
  else downloadWord(slugify(name), name, built.markdown ?? '');
  onToast(t(`${name} downloaded`, `Κατέβηκε: ${name}`));
}

// ── Cap table ───────────────────────────────────────────────────────────────

function CapTableTool({ onToast }: { onToast: (message: string) => void }) {
  const t = useT();
  const round = useStored(readRound, [keys.round]);
  const holders = useEntity(capTable);
  const safes = roundSafes(round);
  const today = proFormaCapTable(holders, safes);
  const [preMoney, setPreMoney] = useState(() => Math.max(4_000_000, (round.valuationCap || 6_000_000) * 1.5));
  const [investment, setInvestment] = useState(() => Math.max(1_000_000, (round.targetAmount || 1_000_000) * 2));
  const [poolPct, setPoolPct] = useState(10);
  const priced = modelPricedRound({ holders, safes, preMoney, investment, targetPoolPost: poolPct / 100, investorName: t('New investors', 'Νέοι επενδυτές') });

  const update = (index: number, patch: Partial<CapTableHolder>) => capTable.write(holders.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const remove = (index: number) => capTable.write(holders.filter((_, i) => i !== index));
  const add = () => capTable.write([...holders, { name: t('Early employee', 'Πρώτος εργαζόμενος'), shares: 100_000 }]);

  const exportCsv = () => {
    downloadCsv('cap-table.csv', [
      ['Holder', 'Type', 'Shares before', 'Shares after', '% before', '% after', 'Price per share'],
      ...priced.rows.map((row) => [row.name, row.kind, Math.round(row.sharesBefore), Math.round(row.sharesAfter), (row.pctBefore * 100).toFixed(2), (row.pctAfter * 100).toFixed(2), row.pricePerShare?.toFixed(4) ?? '']),
    ]);
    onToast(t('Cap table downloaded', 'Το cap table κατέβηκε'));
  };

  return (
    <div className="space-y-5">
      <Section title={t('Shareholders (saved to your account)', 'Μέτοχοι (αποθηκεύονται στον λογαριασμό σου)')}>
        <div className="space-y-2">
          {holders.map((row, index) => (
            <div key={index} className="grid grid-cols-[1fr_8rem_auto_auto] items-center gap-2">
              <input aria-label={t('Holder name', 'Όνομα μετόχου')} value={row.name} onChange={(event) => update(index, { name: event.target.value })} className="min-h-9 rounded-lg border border-stone-200 px-2.5 text-sm" />
              <input aria-label={t(`Shares held by ${row.name}`, `Μετοχές του ${row.name}`)} type="number" min={0} step={10_000} value={row.shares} onChange={(event) => update(index, { shares: Math.max(0, Number(event.target.value) || 0) })} className="min-h-9 rounded-lg border border-stone-200 px-2.5 text-sm tabular-nums" />
              <label className="flex items-center gap-1 text-xs text-stone-600">
                <input type="checkbox" checked={row.kind === 'pool'} onChange={(event) => update(index, { kind: event.target.checked ? 'pool' : undefined })} />
                {t('Pool', 'Pool')}
              </label>
              <Button size="icon" variant="ghost" aria-label={t(`Remove ${row.name}`, `Αφαίρεση ${row.name}`)} disabled={holders.length <= 1} onClick={() => remove(index)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={add}><Plus className="w-3.5 h-3.5" /> {t('Add a holder', 'Προσθήκη μετόχου')}</Button>
        </div>
      </Section>

      <Section title={t('Today, with your round\'s SAFEs at their cap', 'Σήμερα, με τα SAFE του γύρου στο cap τους')}>
        {today.ok ? (
          <ul className="space-y-1.5" data-testid="captable-today">
            {today.rows.map((row) => (
              <li key={row.name} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-stone-700">{row.name}</span>
                <span className="tabular-nums font-semibold text-stone-900">{row.pct == null ? t('at the priced round', 'στον γύρο με τιμή') : formatPct(row.pct)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-stone-500">{t('Add at least one holder with shares.', 'Πρόσθεσε τουλάχιστον έναν μέτοχο με μετοχές.')}</p>
        )}
        {safes.length === 0 && <p className="text-[11px] text-stone-400">{t('No committed SAFE money in your round yet (Fundraising → Edit round).', 'Δεν υπάρχουν ακόμη δεσμευμένα SAFE στον γύρο σου (Χρηματοδότηση → Επεξεργασία γύρου).')}</p>}
      </Section>

      <Section title={t('Model a priced round', 'Μοντελοποίηση γύρου με τιμή')}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumberField label={t('Pre-money ($)', 'Pre-money ($)')} value={preMoney} onChange={setPreMoney} step={500_000} />
          <NumberField label={t('New money ($)', 'Νέα κεφάλαια ($)')} value={investment} onChange={setInvestment} step={250_000} />
          <NumberField label={t('Option pool after the round', 'Option pool μετά τον γύρο')} value={poolPct} onChange={(value) => setPoolPct(Math.min(40, Math.max(0, value)))} suffix="%" max={40} hint={t('Created in the pre-money (option pool shuffle)', 'Δημιουργείται στο pre-money (option pool shuffle)')} />
        </div>
        {priced.ok ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" data-testid="captable-priced">
                <thead>
                  <tr className="text-left text-stone-500">
                    <th className="py-1.5 pr-2 font-medium">{t('Holder', 'Μέτοχος')}</th>
                    <th className="py-1.5 pr-2 font-medium text-right">{t('Shares after', 'Μετοχές μετά')}</th>
                    <th className="py-1.5 pr-2 font-medium text-right" title={t('Share of issued shares today; SAFEs are not shares until they convert.', 'Ποσοστό των εκδοθεισών μετοχών σήμερα· τα SAFE δεν είναι μετοχές πριν μετατραπούν.')}>{t('Before (issued)', 'Πριν (εκδοθείσες)')}</th>
                    <th className="py-1.5 font-medium text-right">{t('After', 'Μετά')}</th>
                  </tr>
                </thead>
                <tbody>
                  {priced.rows.map((row) => (
                    <tr key={`${row.kind}-${row.name}`} className="border-t border-stone-100">
                      <td className="py-1.5 pr-2 text-stone-700">{row.name}{row.convertedBy && row.kind === 'safe' ? <span className="text-stone-400"> · {row.convertedBy === 'cap' ? t('cap', 'cap') : row.convertedBy === 'discount' ? t('discount', 'έκπτωση') : t('round price', 'τιμή γύρου')}</span> : null}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{shares(row.sharesAfter)}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums text-stone-500">{row.pctBefore ? formatPct(row.pctBefore) : '—'}</td>
                      <td className="py-1.5 text-right tabular-nums font-semibold text-stone-900">{formatPct(row.pctAfter)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label={t('Price per share', 'Τιμή μετοχής')} value={`$${priced.pricePerShare.toFixed(4)}`} />
              <Stat label={t('Post-money', 'Post-money')} value={formatMoney(priced.postMoney)} />
              <Stat label={t('Pool top-up', 'Αύξηση pool')} value={shares(priced.poolIncrease)} />
              <Stat label={t('Founder dilution (incl. SAFE conversion)', 'Αραίωση ιδρυτών (με μετατροπή SAFE)')} value={`${priced.founderDilutionPts.toFixed(1)} ${t('pts', 'μον.')}`} tone={priced.founderDilutionPts > 30 ? 'warn' : undefined} />
            </div>
            <Button size="sm" variant="outline" onClick={exportCsv}><Download className="w-3.5 h-3.5" /> {t('Download as CSV', 'Λήψη ως CSV')}</Button>
          </>
        ) : (
          <p className="text-xs text-stone-500">{priced.problem === 'safes-exceed-cap' ? t('Your SAFEs would own 100% or more at their caps — check the round.', 'Τα SAFE θα κατείχαν 100% ή περισσότερο στα cap τους — έλεγξε τον γύρο.') : t('Add a pre-money valuation and at least one holder.', 'Πρόσθεσε pre-money αποτίμηση και τουλάχιστον έναν μέτοχο.')}</p>
        )}
      </Section>
    </div>
  );
}

// ── Valuation ───────────────────────────────────────────────────────────────

function ValuationTool({ onToast }: { onToast: (message: string) => void }) {
  const t = useT();
  const { mode } = useLanguage();
  const round = useStored(readRound, [keys.round]);
  const [berkus, setBerkus] = useState<Record<BerkusKey, number>>({ idea: 50, prototype: 50, team: 50, relationships: 25, rollout: 0 });
  const [median, setMedian] = useState(3_000_000);
  const [score, setScore] = useState<Record<ScorecardKey, number>>({ team: 100, opportunity: 100, product: 100, competition: 100, channels: 100, funding: 100, other: 100 });
  const [exitRevenue, setExitRevenue] = useState(20_000_000);
  const [exitMultiple, setExitMultiple] = useState(5);
  const [targetReturn, setTargetReturn] = useState(20);
  const [investment, setInvestment] = useState(() => round.targetAmount || 1_000_000);
  const [retention, setRetention] = useState(60);

  const berkusResult = berkusValuation(Object.fromEntries(Object.entries(berkus).map(([key, value]) => [key, value / 100])));
  const scorecardResult = scorecardValuation(median, Object.fromEntries(Object.entries(score).map(([key, value]) => [key, value / 100])));
  const vc = vcMethodValuation({ exitMetric: exitRevenue, exitMultiple, targetReturn, investment, retention: retention / 100 });
  const range = valuationRange([berkusResult.value, scorecardResult.value, vc.preMoney]);
  const pick = (text: { en: string; el: string }) => (mode === 'el' ? text.el : text.en);

  const summary = t(
    `Pre-money valuation estimate — Berkus ${formatMoney(berkusResult.value)}, Scorecard ${formatMoney(scorecardResult.value)} (×${scorecardResult.multiplier.toFixed(2)} of a ${formatMoney(median)} median), VC method ${formatMoney(vc.preMoney)}.${range ? ` Range ${formatMoney(range.low)}–${formatMoney(range.high)}, median ${formatMoney(range.mid)}.` : ''}`,
    `Εκτίμηση pre-money αποτίμησης — Berkus ${formatMoney(berkusResult.value)}, Scorecard ${formatMoney(scorecardResult.value)} (×${scorecardResult.multiplier.toFixed(2)} διαμέσου ${formatMoney(median)}), μέθοδος VC ${formatMoney(vc.preMoney)}.${range ? ` Εύρος ${formatMoney(range.low)}–${formatMoney(range.high)}, διάμεσος ${formatMoney(range.mid)}.` : ''}`,
  );

  return (
    <div className="space-y-5">
      {range && (
        <div className="grid grid-cols-3 gap-3" data-testid="valuation-range">
          <Stat label={t('Low', 'Χαμηλή')} value={formatMoney(range.low)} />
          <Stat label={t('Median', 'Διάμεσος')} value={formatMoney(range.mid)} />
          <Stat label={t('High', 'Υψηλή')} value={formatMoney(range.high)} />
        </div>
      )}

      <Section title={t(`Berkus method · ${formatMoney(berkusResult.value)}`, `Μέθοδος Berkus · ${formatMoney(berkusResult.value)}`)}>
        <p className="text-[11px] text-stone-400">{t('Each risk you have reduced adds up to $500k (pre-revenue only).', 'Κάθε κίνδυνος που έχεις μειώσει προσθέτει έως $500k (μόνο πριν από έσοδα).')}</p>
        {BERKUS_FACTORS.map((factor) => (
          <RangeField key={factor.key} label={pick(factor)} value={berkus[factor.key]} onChange={(value) => setBerkus((prev) => ({ ...prev, [factor.key]: value }))} format={(value) => formatMoney((value / 100) * 500_000)} />
        ))}
      </Section>

      <Section title={t(`Scorecard method · ${formatMoney(scorecardResult.value)}`, `Μέθοδος Scorecard · ${formatMoney(scorecardResult.value)}`)}>
        <NumberField label={t('Median pre-money of comparable pre-revenue deals in your region ($)', 'Διάμεσο pre-money συγκρίσιμων deals πριν από έσοδα στην περιοχή σου ($)')} value={median} onChange={setMedian} step={250_000} hint={t('Use a figure from your local angel network or a recent market report.', 'Χρησιμοποίησε στοιχείο από το τοπικό δίκτυο angels ή πρόσφατη έκθεση αγοράς.')} />
        {SCORECARD_FACTORS.map((factor) => (
          <RangeField key={factor.key} label={`${pick(factor)} · ${Math.round(factor.weight * 100)}%`} value={score[factor.key]} min={0} max={200} step={10} onChange={(value) => setScore((prev) => ({ ...prev, [factor.key]: value }))} format={(value) => `${value}%`} />
        ))}
      </Section>

      <Section title={t(`Venture Capital method · ${formatMoney(vc.preMoney)} pre-money`, `Μέθοδος Venture Capital · ${formatMoney(vc.preMoney)} pre-money`)}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumberField label={t('Exit-year revenue ($)', 'Έσοδα έτους εξόδου ($)')} value={exitRevenue} onChange={setExitRevenue} step={1_000_000} />
          <NumberField label={t('Exit multiple', 'Πολλαπλασιαστής εξόδου')} value={exitMultiple} onChange={setExitMultiple} suffix="×" step={0.5} />
          <NumberField label={t('Target return', 'Στόχος απόδοσης')} value={targetReturn} onChange={setTargetReturn} suffix="×" step={1} hint={t('Seed investors often target 10×–30×', 'Οι seed επενδυτές στοχεύουν συχνά 10×–30×')} />
          <NumberField label={t('This round ($)', 'Αυτός ο γύρος ($)')} value={investment} onChange={setInvestment} step={100_000} />
          <NumberField label={t('Ownership kept after later rounds', 'Ποσοστό που μένει μετά από επόμενους γύρους')} value={retention} onChange={(value) => setRetention(Math.min(100, Math.max(1, value)))} suffix="%" max={100} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat label={t('Terminal value', 'Τελική αξία')} value={formatMoney(vc.terminalValue)} />
          <Stat label={t('Post-money today', 'Post-money σήμερα')} value={formatMoney(vc.postMoney)} />
          <Stat label={t('Ownership the investor needs', 'Ποσοστό που χρειάζεται ο επενδυτής')} value={vc.requiredOwnership == null ? '—' : formatPct(vc.requiredOwnership)} />
        </div>
      </Section>

      <Button size="sm" variant="outline" onClick={async () => onToast((await copyText(summary)) ? t('Summary copied', 'Η σύνοψη αντιγράφηκε') : t('Copy did not work in this browser', 'Η αντιγραφή δεν λειτούργησε σε αυτόν τον περιηγητή'))}>
        <Copy className="w-3.5 h-3.5" /> {t('Copy summary', 'Αντιγραφή σύνοψης')}
      </Button>
    </div>
  );
}

// ── Runway and forecast ─────────────────────────────────────────────────────

function RunwayTool({ onToast, forecast }: { onToast: (message: string) => void; forecast: boolean }) {
  const t = useT();
  const { mode } = useLanguage();
  const round = useStored(readRound, [keys.round]);
  const [cash, setCash] = useState(() => round.cashOnHand || 250_000);
  const [expenses, setExpenses] = useState(() => round.monthlyBurn || 20_000);
  const [revenue, setRevenue] = useState(0);
  const [revenueGrowth, setRevenueGrowth] = useState(10);
  const [expenseGrowth, setExpenseGrowth] = useState(2);
  const result = useMemo(
    () => simulateRunway({ cash, monthlyExpenses: expenses, monthlyRevenue: revenue, revenueGrowth: revenueGrowth / 100, expenseGrowth: expenseGrowth / 100, horizon: forecast ? 36 : 60 }),
    [cash, expenses, revenue, revenueGrowth, expenseGrowth, forecast],
  );
  const monthName = (offset: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + offset);
    return date.toLocaleDateString(mode === 'el' ? 'el-GR' : 'en-US', { month: 'short', year: 'numeric' });
  };
  const exportCsv = () => {
    downloadCsv('cash-forecast.csv', [
      ['Month', 'Revenue', 'Expenses', 'Net burn', 'Cash at month end'],
      ...result.months.map((row) => [monthName(row.month), Math.round(row.revenue), Math.round(row.expenses), Math.round(row.netBurn), Math.round(row.cash)]),
    ]);
    onToast(t('Forecast downloaded', 'Η πρόβλεψη κατέβηκε'));
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <NumberField label={t('Cash on hand ($)', 'Διαθέσιμα μετρητά ($)')} value={cash} onChange={setCash} step={10_000} />
        <NumberField label={t('Monthly expenses ($)', 'Μηνιαία έξοδα ($)')} value={expenses} onChange={setExpenses} step={1_000} />
        <NumberField label={t('Monthly revenue ($)', 'Μηνιαία έσοδα ($)')} value={revenue} onChange={setRevenue} step={1_000} />
        <NumberField label={t('Revenue growth per month', 'Ανάπτυξη εσόδων ανά μήνα')} value={revenueGrowth} onChange={setRevenueGrowth} suffix="%" step={1} min={-50} />
        <NumberField label={t('Expense growth per month', 'Αύξηση εξόδων ανά μήνα')} value={expenseGrowth} onChange={setExpenseGrowth} suffix="%" step={1} min={-50} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat testId="runway-months" label={t('Runway', 'Runway')} value={result.runwayMonths == null ? t(`${forecast ? 36 : 60}+ months`, `${forecast ? 36 : 60}+ μήνες`) : t(`${result.runwayMonths} months`, `${result.runwayMonths} μήνες`)} tone={result.runwayMonths != null && result.runwayMonths < 6 ? 'bad' : result.runwayMonths != null && result.runwayMonths < 12 ? 'warn' : 'good'} hint={result.runwayMonths == null ? undefined : t(`Cash out around ${monthName(result.runwayMonths + 1)}`, `Τέλος μετρητών περίπου ${monthName(result.runwayMonths + 1)}`)} />
        <Stat label={t('Net burn now', 'Καθαρό burn τώρα')} value={`${formatMoney(result.netBurnNow)}${t('/mo', '/μήνα')}`} />
        <Stat label={t('Breakeven', 'Νεκρό σημείο')} value={result.breakevenMonth == null ? t('Not on this path', 'Όχι σε αυτή την πορεία') : monthName(result.breakevenMonth)} />
        <Stat testId="runway-alive" label={t('Default alive?', 'Default alive;')} value={result.defaultAlive ? t('Alive', 'Ναι') : t('Dead — raise or cut', 'Όχι — άντληση ή περικοπές')} tone={result.defaultAlive ? 'good' : 'bad'} hint={t('Revenue catches costs before the cash runs out (Paul Graham)', 'Τα έσοδα καλύπτουν τα έξοδα πριν τελειώσουν τα μετρητά (Paul Graham)')} />
      </div>
      <div className="text-stone-900">
        <Sparkline values={result.months.map((row) => Math.max(0, row.cash))} label={t('Cash balance by month', 'Υπόλοιπο μετρητών ανά μήνα')} className="h-12 w-full" />
      </div>
      {forecast && (
        <div className="overflow-x-auto max-h-64">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-stone-500">
                <th className="py-1 pr-2 font-medium">{t('Month', 'Μήνας')}</th>
                <th className="py-1 pr-2 font-medium text-right">{t('Revenue', 'Έσοδα')}</th>
                <th className="py-1 pr-2 font-medium text-right">{t('Expenses', 'Έξοδα')}</th>
                <th className="py-1 font-medium text-right">{t('Cash', 'Μετρητά')}</th>
              </tr>
            </thead>
            <tbody>
              {result.months.slice(0, 36).map((row) => (
                <tr key={row.month} className="border-t border-stone-100">
                  <td className="py-1 pr-2 text-stone-700">{monthName(row.month)}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{formatMoney(row.revenue)}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{formatMoney(row.expenses)}</td>
                  <td className={cn('py-1 text-right tabular-nums font-semibold', row.cash < 0 ? 'text-red-700' : 'text-stone-900')}>{formatMoney(row.cash)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => { writeRound({ cashOnHand: cash, monthlyBurn: Math.max(0, Math.round(expenses - revenue)) }); onToast(t('Cash and net burn saved to your round', 'Τα μετρητά και το καθαρό burn αποθηκεύτηκαν στον γύρο σου')); }}>
          <Save className="w-3.5 h-3.5" /> {t('Save cash and net burn to my round', 'Αποθήκευση μετρητών και burn στον γύρο μου')}
        </Button>
        <Button size="sm" variant="outline" onClick={exportCsv}><Download className="w-3.5 h-3.5" /> {t('Download forecast (CSV)', 'Λήψη πρόβλεψης (CSV)')}</Button>
        {forecast && (
          <Button size="sm" variant="outline" onClick={() => downloadTemplate(4, mode, onToast, t)}><Download className="w-3.5 h-3.5" /> {t('12-month model template', 'Πρότυπο μοντέλου 12 μηνών')}</Button>
        )}
      </div>
    </div>
  );
}

// ── Equity grant ────────────────────────────────────────────────────────────

function EquityTool() {
  const t = useT();
  const holders = useEntity(capTable);
  const fullyDiluted = holders.reduce((sum, row) => sum + row.shares, 0);
  const [pct, setPct] = useState(1);
  const [fd, setFd] = useState(() => fullyDiluted || 10_000_000);
  const [price, setPrice] = useState(1);
  const [strike, setStrike] = useState(0.1);
  const [vesting, setVesting] = useState(48);
  const [cliff, setCliff] = useState(12);
  const grant = equityGrant({ pct: pct / 100, fullyDilutedShares: fd, pricePerShare: price, strikePrice: strike, vestingMonths: vesting, cliffMonths: cliff });
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <NumberField label={t('Grant (% fully diluted)', 'Grant (% πλήρως αραιωμένο)')} value={pct} onChange={setPct} suffix="%" step={0.1} />
        <NumberField label={t('Fully diluted shares', 'Πλήρως αραιωμένες μετοχές')} value={fd} onChange={setFd} step={100_000} hint={t('From your cap table', 'Από το cap table σου')} />
        <NumberField label={t('Price per share ($)', 'Τιμή μετοχής ($)')} value={price} onChange={setPrice} step={0.01} hint={t('Latest preferred price or 409A', 'Τελευταία τιμή preferred ή 409A')} />
        <NumberField label={t('Strike price ($)', 'Τιμή άσκησης ($)')} value={strike} onChange={setStrike} step={0.01} />
        <NumberField label={t('Vesting (months)', 'Κατοχύρωση (μήνες)')} value={vesting} onChange={(value) => setVesting(Math.max(1, Math.round(value)))} step={12} />
        <NumberField label={t('Cliff (months)', 'Cliff (μήνες)')} value={cliff} onChange={(value) => setCliff(Math.max(0, Math.round(value)))} step={1} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat testId="grant-shares" label={t('Shares granted', 'Μετοχές grant')} value={shares(grant.shares)} />
        <Stat label={t('Paper value', 'Λογιστική αξία')} value={formatMoney(grant.value)} />
        <Stat label={t('Spread over strike', 'Διαφορά από την τιμή άσκησης')} value={formatMoney(grant.spread)} />
      </div>
      <Section title={t('Vesting schedule', 'Χρονοδιάγραμμα κατοχύρωσης')}>
        <ul className="space-y-1.5">
          {grant.schedule.map((point) => (
            <li key={point.month} className="flex items-center gap-3 text-xs">
              <span className="w-24 text-stone-600">{t(`Month ${point.month}`, `Μήνας ${point.month}`)}</span>
              <span className="h-1.5 flex-1 rounded-full bg-stone-100 overflow-hidden"><span className="block h-full bg-stone-900" style={{ width: `${point.pct * 100}%` }} /></span>
              <span className="w-28 text-right tabular-nums text-stone-900">{shares(point.vested)} · {Math.round(point.pct * 100)}%</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

// ── Growth metrics ──────────────────────────────────────────────────────────

function MetricsTool() {
  const t = useT();
  const [arpa, setArpa] = useState(100);
  const [margin, setMargin] = useState(80);
  const [churn, setChurn] = useState(3);
  const [cac, setCac] = useState(600);
  const [netBurn, setNetBurn] = useState(50_000);
  const [netNewArr, setNetNewArr] = useState(40_000);
  const [mrrThen, setMrrThen] = useState(10_000);
  const [mrrNow, setMrrNow] = useState(15_000);
  const [months, setMonths] = useState(6);
  const unit = unitEconomics({ arpa, grossMargin: margin / 100, monthlyChurn: churn / 100, cac });
  const multiple = burnMultiple(netBurn, netNewArr);
  const rating = burnMultipleRating(multiple);
  const growth = monthlyGrowthRate(mrrThen, mrrNow, months);
  const ratingText: Record<NonNullable<typeof rating>, string> = {
    amazing: t('amazing (<1)', 'εξαιρετικό (<1)'),
    great: t('great (1–1.5)', 'πολύ καλό (1–1,5)'),
    good: t('good (1.5–2)', 'καλό (1,5–2)'),
    suspect: t('suspect (2–3)', 'αμφίβολο (2–3)'),
    bad: t('bad (>3)', 'κακό (>3)'),
  };
  return (
    <div className="space-y-5">
      <Section title={t('Unit economics', 'Οικονομικά μονάδας')}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NumberField label={t('ARPA / month ($)', 'ARPA / μήνα ($)')} value={arpa} onChange={setArpa} step={10} />
          <NumberField label={t('Gross margin', 'Μικτό περιθώριο')} value={margin} onChange={(value) => setMargin(Math.min(100, Math.max(0, value)))} suffix="%" max={100} />
          <NumberField label={t('Monthly churn', 'Μηνιαία απώλεια')} value={churn} onChange={(value) => setChurn(Math.min(100, Math.max(0, value)))} suffix="%" step={0.5} max={100} />
          <NumberField label={t('CAC ($)', 'CAC ($)')} value={cac} onChange={setCac} step={50} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat label={t('Lifetime value (gross margin)', 'Αξία ζωής (μικτό περιθώριο)')} value={unit.ltv == null ? '—' : formatMoney(unit.ltv)} hint={unit.lifetimeMonths == null ? undefined : t(`≈ ${Math.round(unit.lifetimeMonths)} months average lifetime`, `≈ ${Math.round(unit.lifetimeMonths)} μήνες μέση διάρκεια`)} />
          <Stat testId="ltv-cac" label="LTV : CAC" value={unit.ltvToCac == null ? '—' : `${unit.ltvToCac.toFixed(1)} : 1`} tone={unit.ltvToCac == null ? undefined : unit.ltvToCac >= 3 ? 'good' : unit.ltvToCac >= 1 ? 'warn' : 'bad'} hint={t('Benchmark: 3 : 1 or better', 'Σημείο αναφοράς: 3 : 1 ή καλύτερα')} />
          <Stat label={t('CAC payback', 'Απόσβεση CAC')} value={unit.paybackMonths == null ? '—' : t(`${unit.paybackMonths.toFixed(1)} months`, `${unit.paybackMonths.toFixed(1)} μήνες`)} tone={unit.paybackMonths == null ? undefined : unit.paybackMonths <= 12 ? 'good' : unit.paybackMonths <= 18 ? 'warn' : 'bad'} hint={t('Benchmark: under 12 months', 'Σημείο αναφοράς: κάτω από 12 μήνες')} />
        </div>
      </Section>
      <Section title={t('Efficiency and growth', 'Αποδοτικότητα και ανάπτυξη')}>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <NumberField label={t('Net burn in the period ($)', 'Καθαρό burn περιόδου ($)')} value={netBurn} onChange={setNetBurn} step={5_000} />
          <NumberField label={t('Net new ARR in the period ($)', 'Νέο καθαρό ARR περιόδου ($)')} value={netNewArr} onChange={setNetNewArr} step={5_000} />
          <NumberField label={t('MRR at the start ($)', 'MRR στην αρχή ($)')} value={mrrThen} onChange={setMrrThen} step={1_000} />
          <NumberField label={t('MRR now ($)', 'MRR τώρα ($)')} value={mrrNow} onChange={setMrrNow} step={1_000} />
          <NumberField label={t('Months between', 'Μήνες ανάμεσα')} value={months} onChange={(value) => setMonths(Math.max(1, Math.round(value)))} step={1} min={1} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat label={t('Burn multiple', 'Burn multiple')} value={multiple == null ? '—' : `${multiple.toFixed(2)}× · ${rating ? ratingText[rating] : ''}`} tone={rating === 'amazing' || rating === 'great' ? 'good' : rating === 'good' || rating === 'suspect' ? 'warn' : rating === 'bad' ? 'bad' : undefined} hint={t('Net burn ÷ net new ARR (David Sacks)', 'Καθαρό burn ÷ νέο καθαρό ARR (David Sacks)')} />
          <Stat label={t('Monthly growth (compound)', 'Μηνιαία ανάπτυξη (σύνθετη)')} value={growth == null ? '—' : formatPct(growth, 1)} />
          <Stat label={t('Annualized', 'Σε ετήσια βάση')} value={growth == null ? '—' : formatPct(annualized(growth), 0)} />
        </div>
      </Section>
    </div>
  );
}

// ── Documents ───────────────────────────────────────────────────────────────

function DocTool({ toolId, title, onToast, onClose }: { toolId: string; title: string; onToast: (message: string) => void; onClose: () => void }) {
  const t = useT();
  const { mode } = useLanguage();
  const navigate = useNavigate();
  const doc = TOOL_DOCS[toolId];
  if (!doc) return null;
  const pick = (text: { en: string; el: string }) => (mode === 'el' ? text.el : text.en);
  const venture = ventureName();
  const markdown = toolDocMarkdown(doc, title, mode, venture);
  const download = () => {
    if (doc.templateId) {
      downloadTemplate(doc.templateId, mode, onToast, t);
      return;
    }
    downloadWord(slugify(title) || toolId, title, markdown);
    onToast(t(`${title} downloaded`, `Κατέβηκε: ${title}`));
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">{pick(doc.summary)}</p>
      {doc.legal && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t('Starting outline, not legal advice. Use the official documents and have a lawyer review before signing.', 'Αρχικό περίγραμμα, όχι νομική συμβουλή. Χρησιμοποίησε τα επίσημα έγγραφα και ζήτα έλεγχο από δικηγόρο πριν την υπογραφή.')}
        </p>
      )}
      <div className="space-y-3">
        {doc.sections.map((section) => (
          <div key={section.heading.en}>
            <h3 className="text-xs font-semibold text-stone-900">{pick(section.heading)}</h3>
            <ul className="mt-1 space-y-1">
              {section.items.map((item) => (
                <li key={item.en} className="text-xs text-stone-600 leading-snug pl-3 relative before:absolute before:left-0 before:top-[0.45em] before:h-1 before:w-1 before:rounded-full before:bg-stone-300">{pick(item)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" onClick={() => { onClose(); askAssistant(`${doc.prompt}${venture ? ` (${venture})` : ''}`); }}>
          {t('Draft it with the assistant', 'Σύνταξη με τον βοηθό')}
        </Button>
        <Button size="sm" variant="outline" onClick={download}><Download className="w-3.5 h-3.5" /> {t('Download outline (.doc)', 'Λήψη περιγράμματος (.doc)')}</Button>
        <Button size="sm" variant="outline" onClick={async () => onToast((await copyText(markdown)) ? t('Outline copied', 'Το περίγραμμα αντιγράφηκε') : t('Copy did not work in this browser', 'Η αντιγραφή δεν λειτούργησε σε αυτόν τον περιηγητή'))}>
          <Copy className="w-3.5 h-3.5" /> {t('Copy', 'Αντιγραφή')}
        </Button>
        {doc.related && (
          <Button size="sm" variant="ghost" onClick={() => { onClose(); navigate(doc.related!.href); }}>{pick(doc.related.label)}</Button>
        )}
      </div>
    </div>
  );
}
