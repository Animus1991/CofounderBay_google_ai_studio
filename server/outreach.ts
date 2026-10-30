/**
 * Outreach: what leaves the studio towards investors.
 *
 *   /api/dd/shares            POST create · GET list           (owner)
 *   /api/dd/shares/:token     PUT refresh · DELETE revoke     (owner)
 *   /api/dd/public/:token     GET — the read-only page an investor opens; counts views
 *   /api/email/status         GET — is a provider configured
 *   /api/email/send           POST — send (or log as queued) one email      (owner)
 *   /api/email/log            GET — what was sent, without bodies            (owner)
 *   /api/digest/settings      GET · PUT — weekly digest day, hour, zone, address (owner)
 *   /api/digest/snapshot      PUT — the pipeline/round/DD summary it is built from (owner)
 *   /api/digest/preview       GET · /api/digest/send-now POST · /api/digest/history GET (owner)
 *   /api/cron/digest          POST — sends every digest due this hour; Bearer DIGEST_CRON_SECRET
 *
 * Ported from the other agent's FastAPI + Mongo backend so the app keeps one
 * server. Differences on purpose: the owner of a record is the verified caller
 * (server/identity) instead of a client id in the body; sign-in is required in
 * production; public links and sends are rate-limited; share files are capped.
 */
import express, { type Express, type Request, type Response } from 'express';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { makeBudget, type Caller } from './identity';
import type { Store } from './store';
import { EMAIL_RE, type emailService } from './email';
import { buildDigest, DEFAULT_DIGEST_SETTINGS, dueNow, validTimeZone, type DigestSettings, type DigestSnapshot } from './digest';

type Identify = (req: Request, res: Response) => Promise<Caller | null>;

export type OutreachOptions = {
  identify: Identify;
  store: Store;
  email: ReturnType<typeof emailService>;
  cronSecret?: string;
  now?: () => Date;
  log?: (message: string, detail?: unknown) => void;
};

type ShareItem = { category: string; title: string; status: 'todo' | 'in_progress' | 'done'; note?: string };
type ShareFile = { name: string; size: string; url: string };
type Share = {
  token: string; owner: string; investorName: string; ventureName: string; items: ShareItem[]; files: ShareFile[];
  views: number; lastViewedAt: string | null; createdAt: string; updatedAt: string; revoked: boolean;
};
type EmailEntry = {
  id: string; owner: string; to: string; subject: string; kind: 'investor' | 'digest'; status: 'sent' | 'queued' | 'failed';
  provider: string | null; detail?: string; at: string; investorId?: string | null; investorName?: string | null; trigger?: string;
};
type SettingsDoc = DigestSettings & { owner: string; updatedAt: string };
type SnapshotDoc = DigestSnapshot & { owner: string; updatedAt: string };
type DigestRun = { owner: string; at: string; subject: string; stats: Record<string, number>; status: string; trigger: string };

const MAX_FILE_URL = 1_500_000;
const MAX_FILES = 10;
const MAX_ITEMS = 80;

class Invalid extends Error {}

const str = (value: unknown, max: number, field: string, { required = false } = {}): string => {
  if (value === undefined || value === null || value === '') {
    if (required) throw new Invalid(`${field} is required`);
    return '';
  }
  if (typeof value !== 'string') throw new Invalid(`${field} must be text`);
  const text = value.trim();
  if (text.length > max) throw new Invalid(`${field} is too long`);
  if (required && !text) throw new Invalid(`${field} is required`);
  return text;
};

function shareItems(value: unknown): ShareItem[] {
  if (!Array.isArray(value) || value.length > MAX_ITEMS) throw new Invalid('items must be a list of up to 80');
  return value.map((raw: Record<string, unknown>) => {
    const status = raw?.status;
    if (status !== 'todo' && status !== 'in_progress' && status !== 'done') throw new Invalid('item status must be todo, in_progress or done');
    const note = str(raw.note, 500, 'note');
    return { category: str(raw.category, 40, 'category', { required: true }), title: str(raw.title, 160, 'title', { required: true }), status, ...(note ? { note } : {}) };
  });
}

function shareFiles(value: unknown): ShareFile[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_FILES) throw new Invalid('files must be a list of up to 10');
  return value.map((raw: Record<string, unknown>) => {
    if (typeof raw?.url === 'string' && raw.url.length > MAX_FILE_URL) throw new Invalid('A file is too large to attach to a link (about 1 MB at most). Share it from your data room instead.');
    const url = str(raw?.url, MAX_FILE_URL, 'file url', { required: true });
    if (!/^(https:\/\/|data:)/.test(url)) throw new Invalid('a file must be an https or data URL');
    return { name: str(raw.name, 200, 'file name', { required: true }), size: str(raw.size, 40, 'file size'), url };
  });
}

const ownerView = (share: Share) => ({
  token: share.token, investorName: share.investorName, ventureName: share.ventureName, views: share.views, lastViewedAt: share.lastViewedAt,
  createdAt: share.createdAt, updatedAt: share.updatedAt, done: share.items.filter((item) => item.status === 'done').length,
  total: share.items.length, files: share.files.map((file) => file.name),
});

const publicView = (share: Share) => ({
  token: share.token, investorName: share.investorName, ventureName: share.ventureName, views: share.views, lastViewedAt: share.lastViewedAt,
  createdAt: share.createdAt, updatedAt: share.updatedAt, items: share.items, files: share.files,
});

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function registerOutreachRoutes(app: Express, opts: OutreachOptions) {
  const now = opts.now ?? (() => new Date());
  const log = opts.log ?? ((message: string, detail?: unknown) => console.warn(message, detail ?? ''));
  const iso = () => now().toISOString();
  const budget = makeBudget(() => now().getTime());
  const small = express.json({ limit: '200kb' });
  const large = express.json({ limit: '16mb' });
  const { store } = opts;

  /** Runs a handler for the identified caller; validation errors become 400/422. */
  const owned = (handler: (caller: Caller, req: Request, res: Response) => unknown) => async (req: Request, res: Response) => {
    const caller = await opts.identify(req, res);
    if (!caller) return;
    try {
      await handler(caller, req, res);
    } catch (error) {
      if (error instanceof Invalid) res.status(422).json({ error: error.message, code: 'invalid' });
      else {
        log('outreach route failed', error);
        res.status(500).json({ error: 'Something went wrong — nothing was changed.', code: 'server-error' });
      }
    }
  };

  // ── Due-diligence share links ───────────────────────────────────────────
  app.post('/api/dd/shares', large, owned((caller, req, res) => {
    if (!budget(`share:${caller.key}`, 30, 3_600_000, res)) return;
    const at = iso();
    const share: Share = {
      token: randomBytes(16).toString('base64url'),
      owner: caller.key,
      investorName: str(req.body?.investorName, 120, 'investorName'),
      ventureName: str(req.body?.ventureName, 120, 'ventureName'),
      items: shareItems(req.body?.items),
      files: shareFiles(req.body?.files),
      views: 0, lastViewedAt: null, createdAt: at, updatedAt: at, revoked: false,
    };
    store.insert('ddShares', share);
    res.status(201).json(ownerView(share));
  }));

  app.put('/api/dd/shares/:token', large, owned((caller, req, res) => {
    const items = shareItems(req.body?.items);
    const files = req.body?.files === undefined ? undefined : shareFiles(req.body.files);
    const ventureName = str(req.body?.ventureName, 120, 'ventureName');
    const [updated] = store.update<Share>('ddShares', (share) => share.token === req.params.token && share.owner === caller.key && !share.revoked,
      () => ({ items, ventureName, updatedAt: iso(), ...(files ? { files } : {}) }));
    if (!updated) {
      res.status(404).json({ error: 'Share not found', code: 'not-found' });
      return;
    }
    res.json(ownerView(updated));
  }));

  app.get('/api/dd/shares', owned((caller, _req, res) => {
    const mine = store.all<Share>('ddShares').filter((share) => share.owner === caller.key && !share.revoked);
    res.json(mine.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50).map(ownerView));
  }));

  app.delete('/api/dd/shares/:token', owned((caller, req, res) => {
    const [revoked] = store.update<Share>('ddShares', (share) => share.token === req.params.token && share.owner === caller.key && !share.revoked,
      () => ({ revoked: true, updatedAt: iso() }));
    if (!revoked) {
      res.status(404).json({ error: 'Share not found', code: 'not-found' });
      return;
    }
    res.json({ revoked: true });
  }));

  app.get('/api/dd/public/:token', (req, res) => {
    if (!budget(`view:${req.ip || 'unknown'}`, 120, 60_000, res)) return;
    const [viewed] = store.update<Share>('ddShares', (share) => share.token === req.params.token && !share.revoked,
      (share) => ({ views: share.views + 1, lastViewedAt: iso() }));
    if (!viewed) {
      res.status(404).json({ error: 'This link is no longer available.', code: 'not-found' });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    res.json(publicView(viewed));
  });

  // ── Email ───────────────────────────────────────────────────────────────
  const deliver = async (owner: string, message: { to: string; subject: string; text: string; replyTo?: string }, meta: Partial<EmailEntry> & { kind: EmailEntry['kind'] }) => {
    const outcome = await opts.email.deliver(message);
    const entry: EmailEntry = { id: randomUUID(), owner, to: message.to, subject: message.subject, at: iso(), status: outcome.status, provider: outcome.provider, ...(outcome.detail ? { detail: outcome.detail } : {}), ...meta };
    store.insert('emailLog', entry, { cap: 5000 });
    return entry;
  };
  const strip = ({ owner: _owner, ...entry }: EmailEntry) => entry;

  app.get('/api/email/status', (_req, res) => res.json(opts.email.status()));

  app.post('/api/email/send', small, owned(async (caller, req, res) => {
    if (!budget(`email:${caller.key}`, caller.member ? 30 : 5, 3_600_000, res)) return;
    const to = str(req.body?.to, 254, 'to', { required: true });
    const replyTo = str(req.body?.replyTo, 254, 'replyTo');
    if (!EMAIL_RE.test(to) || (replyTo && !EMAIL_RE.test(replyTo))) throw new Invalid('Add one valid email address');
    const subject = str(req.body?.subject, 200, 'subject', { required: true }).replace(/[\r\n]+/g, ' ');
    const text = str(req.body?.body, 10_000, 'body', { required: true });
    const entry = await deliver(caller.key, { to, subject, text, ...(replyTo ? { replyTo } : {}) }, {
      kind: 'investor',
      investorId: str(req.body?.investorId, 80, 'investorId') || null,
      investorName: str(req.body?.investorName, 120, 'investorName') || null,
    });
    res.json(strip(entry));
  }));

  app.get('/api/email/log', owned((caller, req, res) => {
    const investorId = typeof req.query.investorId === 'string' ? req.query.investorId : '';
    const mine = store.all<EmailEntry>('emailLog').filter((entry) => entry.owner === caller.key && (!investorId || entry.investorId === investorId));
    res.json(mine.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100).map(strip));
  }));

  // ── Weekly digest ───────────────────────────────────────────────────────
  const settingsOf = (owner: string): DigestSettings => {
    const found = store.all<SettingsDoc>('digestSettings').find((doc) => doc.owner === owner);
    if (!found) return { ...DEFAULT_DIGEST_SETTINGS };
    const { owner: _owner, updatedAt: _at, ...settings } = found;
    return settings;
  };
  const snapshotOf = (owner: string) => store.all<SnapshotDoc>('digestSnapshots').find((doc) => doc.owner === owner);

  const sendDigest = async (owner: string, trigger: string) => {
    const settings = settingsOf(owner);
    if (!settings.email) throw new Invalid('Add an email address in Settings first');
    const snapshot = snapshotOf(owner);
    if (!snapshot) throw new Invalid('No digest data yet — open Fundraising once so the app can send it');
    const digest = buildDigest(snapshot, settings.lang, now());
    const entry = await deliver(owner, { to: settings.email, subject: digest.subject, text: digest.text }, { kind: 'digest', trigger });
    store.insert('digests', { owner, at: entry.at, subject: digest.subject, stats: digest.stats, status: entry.status, trigger } satisfies DigestRun, { cap: 5000 });
    return { ...digest, status: entry.status, at: entry.at };
  };

  app.get('/api/digest/settings', owned((caller, _req, res) => res.json(settingsOf(caller.key))));

  app.put('/api/digest/settings', small, owned((caller, req, res) => {
    const body = req.body ?? {};
    const day = Number(body.day);
    const hour = Number(body.hour);
    if (!Number.isInteger(day) || day < 0 || day > 6) throw new Invalid('day must be 0 (Sunday) to 6');
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Invalid('hour must be 0 to 23');
    const timezone = str(body.timezone, 60, 'timezone') || DEFAULT_DIGEST_SETTINGS.timezone;
    if (!validTimeZone(timezone)) throw new Invalid('Unknown time zone');
    const email = str(body.email, 254, 'email') || null;
    if (email && !EMAIL_RE.test(email)) throw new Invalid('Add one valid email address');
    const enabled = body.enabled === true;
    if (enabled && !email) throw new Invalid('An email address is required to turn the digest on');
    const lang = body.lang === 'el' ? 'el' : 'en';
    const previous = settingsOf(caller.key);
    const doc: SettingsDoc = { owner: caller.key, enabled, day, hour, timezone, email, lang, updatedAt: iso(), ...(previous.lastSentWeek ? { lastSentWeek: previous.lastSentWeek } : {}) };
    if (!store.update<SettingsDoc>('digestSettings', (item) => item.owner === caller.key, () => doc).length) store.insert('digestSettings', doc);
    const { owner: _owner, updatedAt: _at, ...settings } = doc;
    res.json(settings);
  }));

  app.put('/api/digest/snapshot', large, owned((caller, req, res) => {
    const body = req.body ?? {};
    const pipeline = Array.isArray(body.pipeline) ? body.pipeline.slice(0, 200).map((raw: Record<string, unknown>) => ({
      name: str(raw?.name, 120, 'name', { required: true }),
      stage: str(raw.stage, 40, 'stage', { required: true }),
      checkSize: str(raw.checkSize, 40, 'checkSize') || undefined,
      nextStep: str(raw.nextStep, 200, 'nextStep') || undefined,
      nextDate: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.nextDate ?? '')) ? String(raw.nextDate) : undefined,
      history: Array.isArray(raw.history) ? raw.history.slice(-50).map((step: Record<string, unknown>) => ({ at: str(step?.at, 40, 'at'), stage: str(step?.stage, 40, 'stage') })) : [],
    })) : [];
    const dd = body.dd && typeof body.dd === 'object' ? {
      done: Number(body.dd.done) || 0, total: Number(body.dd.total) || 0, inProgress: Number(body.dd.inProgress) || 0,
      open: Array.isArray(body.dd.open) ? body.dd.open.slice(0, 20).map((title: unknown) => str(title, 160, 'open')) : [],
    } : {};
    const round = body.round && typeof body.round === 'object' ? {
      target: Number(body.round.target) || 0, committed: Number(body.round.committed) || 0,
      instrument: str(body.round.instrument, 40, 'instrument'), targetLabel: str(body.round.targetLabel, 40, 'targetLabel'),
    } : {};
    const doc: SnapshotDoc = { owner: caller.key, venture: str(body.venture, 120, 'venture'), pipeline, dd, round, updatedAt: iso() };
    if (!store.update<SnapshotDoc>('digestSnapshots', (item) => item.owner === caller.key, () => doc).length) store.insert('digestSnapshots', doc);
    res.json({ saved: true });
  }));

  app.get('/api/digest/preview', owned((caller, _req, res) => {
    const snapshot = snapshotOf(caller.key);
    if (!snapshot) throw new Invalid('No digest data yet — open Fundraising once so the app can send it');
    res.json(buildDigest(snapshot, settingsOf(caller.key).lang, now()));
  }));

  app.post('/api/digest/send-now', small, owned(async (caller, _req, res) => {
    if (!budget(`digest:${caller.key}`, 6, 3_600_000, res)) return;
    res.json(await sendDigest(caller.key, 'manual'));
  }));

  app.get('/api/digest/history', owned((caller, _req, res) => {
    const mine = store.all<DigestRun>('digests').filter((run) => run.owner === caller.key);
    res.json(mine.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12).map(({ owner: _owner, ...run }) => run));
  }));

  /** Sends every digest due this hour, at most once per ISO week each. */
  const runDigests = async (trigger: string) => {
    const at = now();
    let sent = 0;
    for (const settings of store.all<SettingsDoc>('digestSettings').filter((doc) => doc.enabled && doc.email)) {
      const week = dueNow(settings, at);
      if (!week || settings.lastSentWeek === week) continue;
      try {
        await sendDigest(settings.owner, trigger);
        store.update<SettingsDoc>('digestSettings', (doc) => doc.owner === settings.owner, () => ({ lastSentWeek: week }));
        sent += 1;
      } catch (error) {
        log('digest skipped', error instanceof Error ? error.message : error);
      }
    }
    return sent;
  };

  app.post('/api/cron/digest', (req, res) => {
    const header = req.headers.authorization || '';
    const given = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!opts.cronSecret || !given || !sameSecret(given, opts.cronSecret)) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    // Acknowledge at once; the sends run after the response.
    res.status(202).json({ accepted: true });
    void runDigests(`cron:${randomUUID().slice(0, 8)}`);
  });

  return { runDigests };
}
