/**
 * Investor emails for the operator: a stage-aware follow-up draft built only
 * from the founder's own data (pipeline entry, round, due diligence). The model
 * may rewrite it from the same facts (ai/engine → writeDraft); the template is
 * the offline version. Reading and changing the pipeline itself lives in
 * services/assistantPipeline, so there is one implementation of each write.
 */
import { followUps, localDay, readRound, PIPELINE_STAGES, type RoundInvestor } from '../lib/localLists';
import { findInvestor, CRM_HREF, STAGE_LABEL_EL } from './assistantPipeline';
import { fold } from './assistantText';
import type { AssistantLink, AssistantResult } from './assistantOps';

type Stage = (typeof PIPELINE_STAGES)[number];

const CRM_LINK: AssistantLink = { href: CRM_HREF, en: 'Open the investor CRM', el: 'Άνοιγμα CRM επενδυτών' };

export const stageLabel = (stage: string, lang: 'en' | 'el') => (lang === 'el' ? STAGE_LABEL_EL[stage] ?? stage : stage);

function findTracked(name: string): RoundInvestor | undefined {
  const want = fold(name).replace(/^(the|τον|την|το|τη)\s+/, '').trim();
  if (want.length < 2) return undefined;
  return findInvestor(want, readRound().pipeline ?? [])?.investor;
}

const clean = (v: string) => v.trim().replace(/^[“"«']+|[”"»'.]+$/g, '').trim();

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
  const today = localDay();
  const overdueDate = !!investor.nextDate && investor.nextDate < today;
  const replyBy = localDay(new Date(Date.now() + 5 * 86_400_000));
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

/** Active investors whose next step is overdue (local day), oldest first — used by the nudge and the notification feed. */
export function overdueInvestors(): RoundInvestor[] {
  return followUps().overdue;
}
