/**
 * Due diligence for the operator: read the tracker, set an item's status,
 * create a read-only share link for an investor (undo = revoke).
 */
import {
  DD_CATEGORIES,
  DD_STATUS_LABEL,
  createDDShare,
  ddProgress,
  findDDItem,
  readDD,
  restoreDD,
  revokeDDShare,
  setDDStatus,
  shareUrl,
  type DDStatus,
} from '../lib/dueDiligence';
import { isDemoData, readValue, keys } from '../lib/localLists';
import { DEMO_VENTURE } from '../data/demoVenture';
import type { AssistantLink, AssistantProposal, AssistantResult } from './assistantOps';

type Proposer = (plan: AssistantProposal, base: { tool: string; href?: string; links: AssistantLink[] }) => AssistantResult;

const DD_HREF = '/fundraising?tab=dd';
const DD_LINK: AssistantLink = { href: DD_HREF, en: 'Open due diligence', el: 'Άνοιγμα δέουσας επιμέλειας' };
const fold = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const DD_WORDS = /(due[- ]diligence|\bdd\b|δεουσα επιμελεια|δεουσα)/;

export function isDDReadQuery(folded: string): boolean {
  return /^\/dd\b\s*$/.test(folded) || (DD_WORDS.test(folded) && /(show|status|open|what|how|progress|list|δειξε|τι |πως|ποια|προοδο|εκκρεμ)/.test(folded) && !/\b(share|send|mark|set)\b|μοιρασ|στειλε|σημειωσ/.test(folded));
}

function statusFrom(text: string): DDStatus | undefined {
  const f = fold(text);
  if (/\b(done|ready|complete|completed)\b|ετοιμ|ολοκληρ/.test(f)) return 'done';
  if (/in[ -]progress|started|working|σε εξελιξη|ξεκιν/.test(f)) return 'in_progress';
  if (/\b(todo|to do|open|not started|reopen|undone)\b|εκκρεμ|ανοιχτ/.test(f)) return 'todo';
  return undefined;
}

export function parseDDSet(query: string): { id: string; status: DDStatus } | null {
  const f = fold(query);
  const slash = query.match(/^\/dd\s+(done|ready|todo|open|progress|in[- ]progress)\s+(.+)$/i);
  if (slash) {
    const item = findDDItem(slash[2] ?? '');
    const status = /^progress$/i.test(slash[1] ?? '') ? 'in_progress' : statusFrom(slash[1] ?? '');
    return item && status ? { id: item.id, status } : null;
  }
  if (!DD_WORDS.test(f) || !/\b(mark|set|move|tick)\b|σημειωσ|βαλε|ορισε/.test(f)) return null;
  const status = statusFrom(f.replace(DD_WORDS, ' '));
  const subject = query
    .replace(/^(?:please\s+)?(mark|set|move|tick|σημείωσε|σημειωσε|βάλε|βαλε|όρισε|ορισε)\s+/i, '')
    .replace(/\s+(in|on|from)\s+(the\s+)?(my\s+)?(due[- ]diligence|dd)(\s+(checklist|list|tracker))?/i, ' ')
    .replace(/\s+(στη|στην|από τη|απο τη)\s+δέουσα\s+επιμέλεια|\s+στη\s+δεουσα\s+επιμελεια/i, ' ')
    .replace(/\s+(as\s+)?(done|ready|complete|completed|in[- ]progress|to ?do|open)\s*$/i, '')
    .replace(/\s+(ως|σε)\s+(έτοιμο|ετοιμο|ολοκληρωμένο|ολοκληρωμενο|σε εξέλιξη|σε εξελιξη|εκκρεμές|εκκρεμες)\s*$/i, '');
  const item = findDDItem(subject);
  return item && status ? { id: item.id, status } : null;
}

export function parseDDShare(query: string): { investor: string } | null {
  const slash = query.match(/^\/dd\s+share(?:\s+(?:with\s+)?(.+))?$/i);
  if (slash) return { investor: (slash[1] ?? '').trim() };
  const hit = query.match(/\b(?:share|send)\s+(?:my\s+|the\s+)?(?:due[- ]diligence|dd)(?:\s+(?:checklist|status|tracker|list))?(?:\s+(?:link\s+)?(?:with|to)\s+(.+?))?\s*$/i)
    ?? query.match(/(?:μοιράσου|μοιρασου|στείλε|στειλε)\s+(?:τη\s+|την\s+)?δέουσα\s+επιμέλεια(?:\s+(?:στον|στην|στη|στο|με τον|με την|με)\s+(.+?))?\s*$/i);
  return hit ? { investor: (hit[1] ?? '').trim().replace(/[.?!]+$/, '') } : null;
}

export function ddReadResult(lang: 'en' | 'el' = 'en'): AssistantResult {
  const items = readDD();
  const p = ddProgress(items);
  const open = items.filter((item) => item.status !== 'done');
  const byCat = (l: 'en' | 'el') => DD_CATEGORIES.map((c) => {
    const rows = items.filter((item) => item.category === c.id);
    return rows.length ? `${l === 'el' ? c.el : c.en} ${rows.filter((r) => r.status === 'done').length}/${rows.length}` : '';
  }).filter(Boolean).join(' · ');
  const list = (l: 'en' | 'el') => open.slice(0, 6).map((item) => `• ${l === 'el' ? item.el : item.en} — ${DD_STATUS_LABEL[item.status][l]}`).join('\n');
  void lang;
  return {
    tool: 'dd',
    en: `Due diligence: ${p.done}/${p.total} ready, ${p.inProgress} in progress.\n${byCat('en')}${open.length ? `\nStill open:\n${list('en')}` : '\nEverything is ready to share.'}`,
    el: `Δέουσα επιμέλεια: ${p.done}/${p.total} έτοιμα, ${p.inProgress} σε εξέλιξη.\n${byCat('el')}${open.length ? `\nΑνοιχτά:\n${list('el')}` : '\nΌλα είναι έτοιμα για κοινοποίηση.'}`,
    href: DD_HREF,
    links: [DD_LINK],
    followUps: [
      ...(open[0] ? [{ en: `Mark ${open[0].en} done in due diligence`, el: `Σημείωσε ${open[0].el} ως έτοιμο στη δέουσα επιμέλεια` }] : []),
      { en: 'Share due diligence with Sequoia Capital', el: 'Στείλε τη δέουσα επιμέλεια στη Sequoia Capital' },
    ],
  };
}

export function ddSetResult(set: { id: string; status: DDStatus }, propose: boolean, proposalResult: Proposer): AssistantResult {
  const before = readDD();
  const item = before.find((row) => row.id === set.id)!;
  if (item.status === set.status) {
    return { tool: 'dd-set', en: `“${item.en}” is already ${DD_STATUS_LABEL[set.status].en.toLowerCase()}.`, el: `Το «${item.el}» είναι ήδη ${DD_STATUS_LABEL[set.status].el.toLowerCase()}.`, href: DD_HREF, links: [DD_LINK] };
  }
  const apply = (): AssistantResult => {
    const after = ddProgress(setDDStatus(set.id, set.status));
    return {
      tool: 'dd-set',
      en: `“${item.en}” is now ${DD_STATUS_LABEL[set.status].en.toLowerCase()}. Due diligence ${after.done}/${after.total} ready — share links show it after “Update”.`,
      el: `Το «${item.el}» είναι πλέον ${DD_STATUS_LABEL[set.status].el.toLowerCase()}. Δέουσα επιμέλεια ${after.done}/${after.total} — οι σύνδεσμοι το δείχνουν μετά την «Ενημέρωση».`,
      href: DD_HREF,
      links: [DD_LINK],
    };
  };
  if (!propose) return apply();
  return proposalResult(
    { summary: { en: `Mark “${item.en}” as ${DD_STATUS_LABEL[set.status].en.toLowerCase()} in due diligence?`, el: `Σημείωση «${item.el}» ως ${DD_STATUS_LABEL[set.status].el.toLowerCase()} στη δέουσα επιμέλεια;` }, reversal: 'full', apply, undo: () => { restoreDD(before); } },
    { tool: 'dd-set', href: DD_HREF, links: [DD_LINK] },
  );
}

function ventureName(): string {
  const local = readValue<{ company?: string }>(keys.profileLocal, {});
  return local.company || (isDemoData() ? DEMO_VENTURE.name : '');
}

export function ddShareResult(share: { investor: string }, propose: boolean, proposalResult: Proposer): AssistantResult {
  const p = ddProgress();
  const who = share.investor;
  let token = '';
  const apply = async (): Promise<AssistantResult> => {
    const created = await createDDShare(who, ventureName());
    token = created.token;
    const url = shareUrl(created.token);
    try { await navigator.clipboard?.writeText(url); } catch { /* copy is best-effort */ }
    return {
      tool: 'dd-share',
      en: `Share link ready${who ? ` for ${who}` : ''} (${p.done}/${p.total} ready, read-only, no files): ${url}\nCopied to your clipboard. You can see views and revoke it in Fundraising → Due diligence.`,
      el: `Ο σύνδεσμος είναι έτοιμος${who ? ` για ${who}` : ''} (${p.done}/${p.total} έτοιμα, μόνο ανάγνωση, χωρίς αρχεία): ${url}\nΑντιγράφηκε. Προβολές και ανάκληση στη Χρηματοδότηση → Δέουσα επιμέλεια.`,
      href: DD_HREF,
      links: [{ href: `/dd/${created.token}`, en: 'Preview the investor page', el: 'Προβολή σελίδας επενδυτή' }, DD_LINK],
    };
  };
  const base = { tool: 'dd-share', href: DD_HREF, links: [DD_LINK] };
  if (!propose) return { ...base, en: 'Confirm to create the share link.', el: 'Επιβεβαίωσε για να δημιουργηθεί ο σύνδεσμος.' };
  return proposalResult(
    {
      summary: { en: `Create a read-only due-diligence link${who ? ` for ${who}` : ''} (${p.done}/${p.total} ready)?`, el: `Δημιουργία συνδέσμου δέουσας επιμέλειας μόνο για ανάγνωση${who ? ` για ${who}` : ''} (${p.done}/${p.total} έτοιμα);` },
      reversal: 'full',
      reversalNote: { en: 'Undo revokes the link', el: 'Η Αναίρεση ανακαλεί τον σύνδεσμο' },
      apply,
      undo: async () => { if (token) await revokeDDShare(token); },
    },
    base,
  );
}
