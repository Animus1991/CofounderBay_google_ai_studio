/**
 * Investor CRM for the operator: read the pipeline, add an investor, move one
 * between stages, set the next step. Every write is a proposal with an undo
 * that restores only that investor's entry, so plan steps never clobber each other.
 */
import {
  PIPELINE_STAGES,
  logActivity,
  readRound,
  restorePipelineEntry,
  setPipelineStage,
  updatePipelineInvestor,
  upsertPipelineInvestor,
  type RoundInvestor,
} from '../lib/localLists';
import type { AssistantLink, AssistantProposal, AssistantResult } from './assistantOps';

type Proposer = (plan: AssistantProposal, base: { tool: string; href?: string; links: AssistantLink[] }) => AssistantResult;
type Stage = (typeof PIPELINE_STAGES)[number];

const CRM_HREF = '/fundraising?tab=crm';
const CRM_LINK: AssistantLink = { href: CRM_HREF, en: 'Open investor CRM', el: 'Άνοιγμα CRM επενδυτών' };

const STAGE_EL: Record<Stage, string> = {
  Identified: 'Εντοπίστηκε', Contacted: 'Έγινε επαφή', Meeting: 'Συνάντηση', 'Due Diligence': 'Δέουσα επιμέλεια',
  'Term Sheet': 'Term sheet', Closed: 'Κλειστό', Passed: 'Απορρίφθηκε',
};
const STAGE_ALIASES: Record<Stage, string[]> = {
  Identified: ['identified', 'identify', 'εντοπ', 'λιστα'],
  Contacted: ['contacted', 'contact', 'reached out', 'επαφη', 'επικοινων'],
  Meeting: ['meeting', 'meet', 'call', 'συναντησ', 'ραντεβου'],
  'Due Diligence': ['due diligence', 'diligence', 'dd', 'δεουσα', 'ελεγχ'],
  'Term Sheet': ['term sheet', 'terms', 'termsheet', 'ορων', 'ορους'],
  Closed: ['closed', 'close', 'won', 'signed', 'κλειστ', 'κλεισ', 'υπογραφ'],
  Passed: ['passed', 'pass', 'declined', 'lost', 'rejected', 'απορρ', 'αρνηθ'],
};

const fold = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const clean = (v: string) => v.trim().replace(/^[“"«']+|[”"»'.]+$/g, '').trim();
const slug = (name: string) => `inv-${fold(name).replace(/[^a-z0-9α-ω]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}`;

export const stageLabel = (stage: string, lang: 'en' | 'el') => (lang === 'el' ? STAGE_EL[stage as Stage] ?? stage : stage);

export function stageFrom(text: string): Stage | undefined {
  const folded = fold(text);
  return (PIPELINE_STAGES as readonly Stage[]).find((stage) => STAGE_ALIASES[stage].some((alias) => new RegExp(`(?:^|[^a-z0-9α-ω])${alias}`).test(folded)));
}

function findTracked(name: string): RoundInvestor | undefined {
  const want = fold(name).replace(/^(the|τον|την|το)\s+/, '');
  if (want.length < 2) return undefined;
  const pipeline = readRound().pipeline ?? [];
  return pipeline.find((item) => fold(item.name) === want)
    ?? pipeline.find((item) => fold(item.name).startsWith(want) || want.startsWith(fold(item.name)))
    ?? pipeline.find((item) => fold(item.name).split(/\s+/).some((word) => word.length > 2 && !GENERIC.has(word) && want.split(/\s+/).includes(word)));
}

const GENERIC = new Set(['capital', 'ventures', 'venture', 'partners', 'fund', 'funds', 'labs', 'group', 'holdings', 'investments', 'angels', 'the']);

const isoDate = (text: string) => text.match(/\b(20\d\d-\d\d-\d\d)\b/)?.[1];

// ── Parsers ────────────────────────────────────────────────────────────────

export function parseInvestorAdd(query: string): { name: string; stage?: Stage } | null {
  const hit = query.match(/^\/investor\s+add\s+(.+?)(?:\s+(?:at|as|stage:?)\s+(.+))?$/i)
    ?? query.match(/\b(?:add|track)\s+(.+?)\s+to\s+(?:my\s+)?(?:investor\s+)?(?:pipeline|crm)(?:\s+(?:at|as|in)\s+(.+))?$/i)
    ?? query.match(/(?:πρόσθεσε|προσθεσε)\s+(?:τον|την|το|τους)?\s*(.+?)\s+στ(?:ον|ην|ο|α|ους)\s+(?:αγωγό|αγωγο|επενδυτές|επενδυτες|pipeline|crm)(?:\s+(?:σε|στο|στη|στην|ως)\s+(.+))?$/i);
  if (!hit) return null;
  const name = clean(hit[1] ?? '');
  if (name.length < 2 || name.length > 80) return null;
  const stage = hit[2] ? stageFrom(hit[2]) : undefined;
  return { name, stage };
}

export function parseInvestorMove(query: string): { investor: RoundInvestor; stage: Stage } | null {
  const hit = query.match(/^\/investor\s+move\s+(.+?)\s+to\s+(.+)$/i)
    ?? query.match(/\b(?:move|advance|bump|set)\s+(.+?)\s+to\s+(?:the\s+)?(.+?)(?:\s+stage)?$/i)
    ?? query.match(/(?:μετακίνησε|μετακινησε|πέρασε|περασε|βάλε|βαλε)\s+(?:τον|την|το|τη)?\s*(.+?)\s+(?:σε|στο|στη|στην|στον)\s+(.+)$/i)
    ?? query.match(/\b(.+?)\s+(?:moved|is now|went)\s+(?:to|in)\s+(.+)$/i);
  if (!hit) return null;
  const stage = stageFrom(hit[2] ?? '');
  const investor = stage ? findTracked(clean(hit[1] ?? '')) : undefined;
  return investor && stage ? { investor, stage } : null;
}

export function parseInvestorNext(query: string): { investor: RoundInvestor; step: string; date?: string } | null {
  const hit = query.match(/^\/investor\s+next\s+(.+?)\s*:\s*(.+)$/i)
    ?? query.match(/\b(?:set\s+)?(?:the\s+)?next\s+step\s+(?:for|with)\s+(.+?)\s*(?:to|:|-)\s+(.+)$/i)
    ?? query.match(/επόμενο\s+βήμα\s+(?:για|με)\s+(?:τον|την|το)?\s*(.+?)\s*(?::|σε|-)\s+(.+)$/i)
    ?? query.match(/επομενο\s+βημα\s+(?:για|με)\s+(?:τον|την|το)?\s*(.+?)\s*(?::|σε|-)\s+(.+)$/i);
  if (!hit) return null;
  const investor = findTracked(clean(hit[1] ?? ''));
  const raw = clean(hit[2] ?? '');
  if (!investor || !raw) return null;
  const date = isoDate(raw);
  const step = raw.replace(/\s*(?:by|until|on|έως|μέχρι)?\s*20\d\d-\d\d-\d\d\s*/i, ' ').trim();
  return { investor, step: (step || raw).slice(0, 200), date };
}

export function isPipelineQuery(folded: string): boolean {
  return /^\/(pipeline|crm|investors)\b/.test(folded) || /\b(investor\s+)?(pipeline|crm)\b/.test(folded) || /\bmy investors\b/.test(folded) || /(αγωγ.{0,6}επενδυτ|τους επενδυτες μου)/.test(folded);
}

// ── Results ────────────────────────────────────────────────────────────────

export function pipelineReadResult(): AssistantResult {
  const pipeline = readRound().pipeline ?? [];
  const today = new Date().toISOString().slice(0, 10);
  if (pipeline.length === 0) {
    return {
      tool: 'pipeline',
      en: 'Your investor pipeline is empty. Say “add First Round Capital to my pipeline” or track a fund from Fundraising → Investors.',
      el: 'Ο αγωγός επενδυτών είναι άδειος. Πες «πρόσθεσε την First Round Capital στον αγωγό» ή παρακολούθησε ένα fund από Χρηματοδότηση → Επενδυτές.',
      href: CRM_HREF,
      links: [CRM_LINK],
      followUps: [{ en: 'Add First Round Capital to my pipeline', el: 'Πρόσθεσε την First Round Capital στον αγωγό' }],
    };
  }
  const active = pipeline.filter((item) => item.stage !== 'Passed' && item.stage !== 'Closed');
  const overdue = active.filter((item) => item.nextDate && item.nextDate < today);
  const lines = (lang: 'en' | 'el') => (PIPELINE_STAGES as readonly Stage[])
    .map((stage) => ({ stage, names: pipeline.filter((item) => item.stage === stage) }))
    .filter((group) => group.names.length)
    .map((group) => `${stageLabel(group.stage, lang)}: ${group.names.map((item) => `${item.name}${item.checkSize ? ` (${item.checkSize})` : ''}${item.nextStep ? ` → ${item.nextStep}${item.nextDate ? ` · ${item.nextDate}` : ''}` : ''}`).join('; ')}`)
    .join('\n');
  const first = overdue[0] ?? active[0];
  return {
    tool: 'pipeline',
    en: `Investor CRM — ${pipeline.length} tracked, ${active.length} active${overdue.length ? `, ${overdue.length} next step${overdue.length === 1 ? '' : 's'} overdue` : ''}. Same board as Fundraising → CRM.\n${lines('en')}`,
    el: `CRM επενδυτών — ${pipeline.length} σε παρακολούθηση, ${active.length} ενεργοί${overdue.length ? `, ${overdue.length} εκπρόθεσμα επόμενα βήματα` : ''}. Ο ίδιος πίνακας με Χρηματοδότηση → CRM.\n${lines('el')}`,
    href: CRM_HREF,
    links: [CRM_LINK],
    followUps: first ? [{ en: `Move ${first.name} to ${PIPELINE_STAGES[Math.min(PIPELINE_STAGES.indexOf(first.stage as Stage) + 1, 5)]}`, el: `Μετακίνησε ${first.name} σε ${stageLabel(PIPELINE_STAGES[Math.min(PIPELINE_STAGES.indexOf(first.stage as Stage) + 1, 5)]!, 'el')}` }] : [],
  };
}

function snapshot(investorId: string): RoundInvestor | undefined {
  const entry = (readRound().pipeline ?? []).find((item) => item.investorId === investorId);
  return entry ? { ...entry, history: entry.history ? [...entry.history] : undefined } : undefined;
}

function done(tool: string, en: string, el: string): AssistantResult {
  return { tool, en: `${en} Fundraising → CRM shows the same board.`, el: `${el} Το ίδιο φαίνεται στη Χρηματοδότηση → CRM.`, href: CRM_HREF, links: [CRM_LINK] };
}

export function investorAddResult(add: { name: string; stage?: Stage }, propose: boolean, proposalResult: Proposer): AssistantResult {
  const existing = findTracked(add.name);
  const investorId = existing?.investorId ?? slug(add.name);
  const name = existing?.name ?? add.name;
  const stage = add.stage ?? (existing?.stage as Stage | undefined) ?? 'Identified';
  if (existing && existing.stage === stage) {
    return { tool: 'investor-add', en: `${name} is already in your pipeline at ${stage}.`, el: `${name}: ήδη στον αγωγό (${stageLabel(stage, 'el')}).`, href: CRM_HREF, links: [CRM_LINK] };
  }
  const before = snapshot(investorId);
  const apply = (): AssistantResult => {
    if (existing) setPipelineStage(investorId, stage);
    else upsertPipelineInvestor({ investorId, name, stage });
    logActivity({ kind: 'milestone', title: `Tracking ${name} (${stage})`, titleEl: `Παρακολούθηση ${name} (${stageLabel(stage, 'el')})`, href: CRM_HREF, byAssistant: true });
    return done('investor-add', `Added ${name} to your pipeline at ${stage}.`, `${name}: προστέθηκε στον αγωγό (${stageLabel(stage, 'el')}).`);
  };
  if (!propose) return apply();
  return proposalResult(
    { summary: { en: `Add ${name} to your investor pipeline at ${stage}?`, el: `Προσθήκη ${name} στον αγωγό επενδυτών (${stageLabel(stage, 'el')});` }, reversal: 'full', apply, undo: () => { restorePipelineEntry(investorId, before); } },
    { tool: 'investor-add', href: CRM_HREF, links: [CRM_LINK] },
  );
}

export function investorMoveResult(move: { investor: RoundInvestor; stage: Stage }, propose: boolean, proposalResult: Proposer): AssistantResult {
  const { investor, stage } = move;
  if (investor.stage === stage) {
    return { tool: 'investor-move', en: `${investor.name} is already at ${stage}.`, el: `${investor.name}: ήδη σε ${stageLabel(stage, 'el')}.`, href: CRM_HREF, links: [CRM_LINK] };
  }
  const before = snapshot(investor.investorId);
  const apply = (): AssistantResult => {
    setPipelineStage(investor.investorId, stage);
    logActivity({ kind: 'milestone', title: `${investor.name}: ${investor.stage} → ${stage}`, titleEl: `${investor.name}: ${stageLabel(investor.stage, 'el')} → ${stageLabel(stage, 'el')}`, href: CRM_HREF, byAssistant: true });
    return done('investor-move', `Moved ${investor.name} from ${investor.stage} to ${stage}.`, `${investor.name}: από ${stageLabel(investor.stage, 'el')} σε ${stageLabel(stage, 'el')}.`);
  };
  if (!propose) return apply();
  return proposalResult(
    { summary: { en: `Move ${investor.name} from ${investor.stage} to ${stage}?`, el: `Μετακίνηση ${investor.name} από ${stageLabel(investor.stage, 'el')} σε ${stageLabel(stage, 'el')};` }, reversal: 'full', apply, undo: () => { restorePipelineEntry(investor.investorId, before); } },
    { tool: 'investor-move', href: CRM_HREF, links: [CRM_LINK] },
  );
}

export function investorNextResult(next: { investor: RoundInvestor; step: string; date?: string }, propose: boolean, proposalResult: Proposer): AssistantResult {
  const { investor, step, date } = next;
  const before = snapshot(investor.investorId);
  const when = date ? ` by ${date}` : '';
  const apply = (): AssistantResult => {
    updatePipelineInvestor(investor.investorId, { nextStep: step, ...(date ? { nextDate: date } : {}) });
    return done('investor-next', `Next step with ${investor.name}: ${step}${when}.`, `Επόμενο βήμα με ${investor.name}: ${step}${date ? ` έως ${date}` : ''}.`);
  };
  if (!propose) return apply();
  return proposalResult(
    { summary: { en: `Set the next step with ${investor.name} to “${step}”${when}?`, el: `Επόμενο βήμα με ${investor.name}: «${step}»${date ? ` έως ${date}` : ''};` }, reversal: 'full', apply, undo: () => { restorePipelineEntry(investor.investorId, before); } },
    { tool: 'investor-next', href: CRM_HREF, links: [CRM_LINK] },
  );
}

// ── Follow-up emails ───────────────────────────────────────────────────────

export function parseInvestorEmail(query: string): { investor: RoundInvestor } | null {
  const hit = query.match(/^\/investor\s+email\s+(.+)$/i)
    ?? query.match(/\b(?:draft|write|compose|prepare)\s+(?:me\s+)?(?:a\s+|an\s+)?(?:follow[- ]?up\s+|intro\s+|thank[- ]you\s+)?(?:email|e-mail|mail|message|note)\s+(?:to|for)\s+(.+?)(?:\s+(?:about|re)\b.*)?[.?!]?$/i)
    ?? query.match(/(?:γράψε|γραψε|ετοίμασε|ετοιμασε|συνέταξε|συνεταξε)\s+(?:ένα\s+|ενα\s+)?(?:follow[- ]?up\s+)?(?:email|e-mail|mail|μήνυμα|μηνυμα)\s+(?:στον|στην|στο|για τον|για την|για το|για)\s+(.+?)[.?!]?$/i);
  if (!hit) return null;
  const investor = findTracked(clean(hit[1] ?? ''));
  return investor ? { investor } : null;
}

const SUBJECT: Record<Stage, string> = {
  Identified: 'Introduction', Contacted: 'Following up', Meeting: 'Thank you — next steps', 'Due Diligence': 'Due-diligence materials',
  'Term Sheet': 'Term sheet — next steps', Closed: 'Welcome aboard', Passed: 'Staying in touch',
};
const OPENER: Record<Stage, string> = {
  Identified: 'I am reaching out because your focus fits what we are building.',
  Contacted: 'Following up on my earlier note — I would value 20 minutes with you.',
  Meeting: 'Thank you for the time — it was a useful conversation.',
  'Due Diligence': 'Thank you for moving into due diligence with us.',
  'Term Sheet': 'Thank you for the term sheet — we are reviewing it with our advisers.',
  Closed: 'We are delighted to have you on board.',
  Passed: 'Thanks again for the candid feedback — a short update since we spoke.',
};

/** Facts the email may use — the model rewrites from these only, the template is the offline version. */
export function investorEmailResult(
  email: { investor: RoundInvestor },
  context: { venture: string; oneLiner: string; founder: string; round: string; dd?: string },
): AssistantResult {
  const { investor } = email;
  const today = new Date().toISOString().slice(0, 10);
  const overdueDate = !!investor.nextDate && investor.nextDate < today;
  const replyBy = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
  const stage = (PIPELINE_STAGES as readonly string[]).includes(investor.stage) ? (investor.stage as Stage) : 'Contacted';
  const first = investor.name.split(/\s+/)[0] ?? investor.name;
  const greeting = /capital|ventures|partners|fund|horowitz|labs/i.test(investor.name) ? `Hi ${investor.name} team` : `Hi ${first}`;
  const lines = [
    `Subject: ${SUBJECT[stage]} — ${context.venture || 'our startup'}`,
    '',
    `${greeting},`,
    '',
    OPENER[stage],
    context.oneLiner ? `${context.venture}: ${context.oneLiner}` : '',
    context.round,
    investor.notes ? `On your question — ${investor.notes.replace(/\.$/, '')}: I am attaching what we have.` : '',
    stage === 'Due Diligence' && context.dd ? `Due-diligence status: ${context.dd}. I can send a read-only link to the checklist.` : '',
    investor.nextStep ? `Proposed next step: ${investor.nextStep}${investor.nextDate ? ` (by ${investor.nextDate})` : ''}.` : 'Would a short call next week work?',
    '',
    'Best,',
    context.founder || 'The founding team',
  ].filter((line, index, all) => line !== '' || (all[index - 1] ?? '') !== '');
  const text = lines.join('\n').replace(` (by ${investor.nextDate})`, overdueDate ? '' : ` (by ${investor.nextDate})`);
  const facts = [
    `Investor: ${investor.name} (stage ${stage}${investor.checkSize ? `, check ${investor.checkSize}` : ''})`,
    investor.notes ? `Notes: ${investor.notes}` : '',
    investor.nextStep ? `Next step: ${investor.nextStep}${investor.nextDate && !overdueDate ? ` by ${investor.nextDate}` : ''}` : '',
    overdueDate ? 'This follow-up is late on our side — do not mention any past date or deadline.' : '',
    `Venture: ${context.venture} — ${context.oneLiner}`,
    context.round,
    context.dd ? `Due diligence: ${context.dd}` : '',
    `Sender: ${context.founder}`,
  ].filter(Boolean).join('\n');
  return {
    tool: 'investor-email',
    en: text,
    el: text,
    href: CRM_HREF,
    links: [CRM_LINK],
    followUps: [{ en: `Set next step for ${investor.name} to: wait for a reply by ${replyBy}`, el: `Επόμενο βήμα για ${investor.name}: αναμονή απάντησης έως ${replyBy}` }],
    draft: { kind: 'email', to: investor.name, facts },
  };
}

/** Active investors whose next step date is before today — used by the nudge and the notification feed. */
export function overdueInvestors(): RoundInvestor[] {
  const today = new Date().toISOString().slice(0, 10);
  return (readRound().pipeline ?? []).filter((item) => item.stage !== 'Passed' && item.stage !== 'Closed' && item.nextDate && item.nextDate < today);
}
