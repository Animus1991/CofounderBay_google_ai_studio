/**
 * The due-diligence tracker: one checklist (keys.dueDiligence) shared by
 * Fundraising → Due diligence, the Tracker mini-card, the assistant and the
 * read-only investor share links.
 */
import { isDemoData, keys, readValue, writeValue } from './localLists';
import { studioApi } from './studioApi';

export type DDStatus = 'todo' | 'in_progress' | 'done';
export type DDCategory = 'corporate' | 'legal' | 'financial' | 'product' | 'team';
export type DDItem = {
  id: string;
  category: DDCategory;
  en: string;
  el: string;
  status: DDStatus;
  note?: string;
  custom?: boolean;
  updatedAt: string;
};

export const DD_CATEGORIES: { id: DDCategory; en: string; el: string }[] = [
  { id: 'corporate', en: 'Corporate', el: 'Εταιρικά' },
  { id: 'legal', en: 'Legal & IP', el: 'Νομικά & IP' },
  { id: 'financial', en: 'Financial', el: 'Οικονομικά' },
  { id: 'product', en: 'Product & tech', el: 'Προϊόν & τεχνολογία' },
  { id: 'team', en: 'Team', el: 'Ομάδα' },
];

export const DD_STATUS_LABEL: Record<DDStatus, { en: string; el: string }> = {
  todo: { en: 'To do', el: 'Εκκρεμεί' },
  in_progress: { en: 'In progress', el: 'Σε εξέλιξη' },
  done: { en: 'Ready', el: 'Έτοιμο' },
};

/** Standard pre-seed/seed request list; `match` spots a matching data-room file name. */
const TEMPLATE: { id: string; category: DDCategory; en: string; el: string; match: RegExp; demo: DDStatus }[] = [
  { id: 'dd-incorp', category: 'corporate', en: 'Certificate of incorporation & articles', el: 'Πιστοποιητικό σύστασης & καταστατικό', match: /incorp|articles|certificate|bylaws|καταστατ/i, demo: 'done' },
  { id: 'dd-board', category: 'corporate', en: 'Board & shareholder resolutions', el: 'Αποφάσεις ΔΣ & μετόχων', match: /board|resolution|minutes|πρακτικ/i, demo: 'done' },
  { id: 'dd-captable', category: 'corporate', en: 'Cap table (fully diluted)', el: 'Cap table (πλήρως αραιωμένο)', match: /cap.?table|equity|ownership/i, demo: 'in_progress' },
  { id: 'dd-safes', category: 'legal', en: 'SAFEs / convertible notes signed', el: 'Υπογεγραμμένα SAFE / μετατρέψιμα', match: /\bsafe\b|convertible|note/i, demo: 'in_progress' },
  { id: 'dd-ip', category: 'legal', en: 'IP assignment from every founder', el: 'Εκχώρηση IP από κάθε ιδρυτή', match: /\bip\b|assign|invention/i, demo: 'done' },
  { id: 'dd-contracts', category: 'legal', en: 'Key contracts (pilots, suppliers, NDAs)', el: 'Βασικές συμβάσεις (πιλότοι, προμηθευτές, NDA)', match: /contract|agreement|msa|nda|pilot/i, demo: 'todo' },
  { id: 'dd-gdpr', category: 'legal', en: 'Privacy policy & GDPR records', el: 'Πολιτική απορρήτου & αρχεία GDPR', match: /gdpr|privacy|dpa/i, demo: 'todo' },
  { id: 'dd-financials', category: 'financial', en: 'Financial statements & bank statements', el: 'Οικονομικές καταστάσεις & κινήσεις τραπεζών', match: /statement|balance|p&l|bank/i, demo: 'in_progress' },
  { id: 'dd-model', category: 'financial', en: '3-year financial model', el: 'Οικονομικό μοντέλο 3 ετών', match: /financ|projection|model|forecast/i, demo: 'todo' },
  { id: 'dd-tech', category: 'product', en: 'Technical architecture & security overview', el: 'Τεχνική αρχιτεκτονική & ασφάλεια', match: /architect|security|tech/i, demo: 'todo' },
  { id: 'dd-pilot', category: 'product', en: 'Pilot / traction evidence', el: 'Στοιχεία πιλότου / traction', match: /pilot|traction|metrics|kpi/i, demo: 'done' },
  { id: 'dd-team', category: 'team', en: 'Founder CVs & employment agreements', el: 'Βιογραφικά ιδρυτών & συμβάσεις εργασίας', match: /\bcv\b|resume|employment|offer/i, demo: 'todo' },
];

const now = () => new Date().toISOString();

function seed(): DDItem[] {
  const demo = isDemoData();
  return TEMPLATE.map(({ match: _m, demo: demoStatus, ...item }) => ({ ...item, status: demo ? demoStatus : 'todo', updatedAt: now() }));
}

export function readDD(): DDItem[] {
  const stored = readValue<DDItem[] | null>(keys.dueDiligence, null);
  return Array.isArray(stored) && stored.length ? stored : seed();
}

function writeDD(items: DDItem[]): DDItem[] {
  return writeValue(keys.dueDiligence, items);
}

export function setDDStatus(id: string, status: DDStatus): DDItem[] {
  return writeDD(readDD().map((item) => (item.id === id ? { ...item, status, updatedAt: now() } : item)));
}

export function setDDNote(id: string, note: string): DDItem[] {
  return writeDD(readDD().map((item) => (item.id === id ? { ...item, note: note.trim() || undefined, updatedAt: now() } : item)));
}

export function addDDItem(en: string, category: DDCategory): DDItem[] {
  const title = en.trim().slice(0, 160);
  if (!title) return readDD();
  return writeDD([...readDD(), { id: `dd-c-${Date.now().toString(36)}`, category, en: title, el: title, status: 'todo', custom: true, updatedAt: now() }]);
}

export function removeDDItem(id: string): DDItem[] {
  return writeDD(readDD().filter((item) => item.id !== id));
}

/** Restores the whole list exactly — the assistant's undo. */
export function restoreDD(items: DDItem[]): DDItem[] {
  return writeDD(items);
}

export function ddProgress(items = readDD()) {
  const done = items.filter((item) => item.status === 'done').length;
  const inProgress = items.filter((item) => item.status === 'in_progress').length;
  return { done, inProgress, total: items.length, pct: items.length ? Math.round((done / items.length) * 100) : 0 };
}

/** Template ids whose data-room file is already uploaded but not marked ready. */
export function ddFoundInRoom(fileNames: string[], items = readDD()): string[] {
  return TEMPLATE.filter((rule) => fileNames.some((name) => rule.match.test(name)))
    .map((rule) => rule.id)
    .filter((id) => items.find((item) => item.id === id)?.status !== 'done');
}

const fold = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function findDDItem(text: string, items = readDD()): DDItem | undefined {
  const want = fold(text).replace(/\b(the|my|our|item|τo|τα|τη|την)\b/g, ' ').trim();
  if (want.length < 2) return undefined;
  const words = want.split(/\s+/).filter((word) => word.length > 1);
  let best: { item: DDItem; score: number } | undefined;
  for (const item of items) {
    const hay = `${fold(item.en)} ${fold(item.el)} ${item.id.replace('dd-', '')}`;
    const score = words.filter((word) => hay.includes(word)).length / words.length;
    if (score > (best?.score ?? 0)) best = { item, score };
  }
  return best && best.score >= 0.5 ? best.item : undefined;
}

// ── Share links ───────────────────────────────────────────────────────────
export type DDShareFile = { name: string; size: string; url: string };
export type DDShare = {
  files?: string[];
  token: string;
  investorName: string;
  ventureName: string;
  views: number;
  lastViewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  done: number;
  total: number;
};
export type DDPublic = Omit<DDShare, 'done' | 'total' | 'files'> & { files?: DDShareFile[]; items: { category: string; title: string; status: DDStatus; note?: string | null }[] };

export const DD_SHARES_EVENT = 'cfb:dd-shares';

export function shareUrl(token: string): string {
  return `${window.location.origin}/dd/${token}`;
}

function snapshot(includeNotes: boolean) {
  return readDD().map((item) => ({ category: item.category, title: item.en, status: item.status, ...(includeNotes && item.note ? { note: item.note } : {}) }));
}

export async function createDDShare(investorName: string, ventureName: string, includeNotes = false, files: DDShareFile[] = []): Promise<DDShare> {
  const share = await studioApi<DDShare>('/dd/shares', {
    method: 'POST',
    body: { investorName: investorName.slice(0, 120), ventureName: ventureName.slice(0, 120), items: snapshot(includeNotes), files },
  });
  window.dispatchEvent(new Event(DD_SHARES_EVENT));
  return share;
}

export async function refreshDDShare(token: string, ventureName: string, includeNotes = false): Promise<DDShare> {
  const share = await studioApi<DDShare>(`/dd/shares/${encodeURIComponent(token)}`, {
    method: 'PUT',
    body: { ventureName, items: snapshot(includeNotes) },
  });
  window.dispatchEvent(new Event(DD_SHARES_EVENT));
  return share;
}

export async function listDDShares(): Promise<DDShare[]> {
  return studioApi<DDShare[]>('/dd/shares');
}

export async function revokeDDShare(token: string): Promise<void> {
  await studioApi(`/dd/shares/${encodeURIComponent(token)}`, { method: 'DELETE' });
  window.dispatchEvent(new Event(DD_SHARES_EVENT));
}

export async function fetchPublicDD(token: string): Promise<DDPublic> {
  return studioApi<DDPublic>(`/dd/public/${encodeURIComponent(token)}`);
}
