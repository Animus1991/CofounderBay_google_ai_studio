/**
 * Everything that leaves the app as a file or a link: text, JSON, CSV, Word,
 * printable PDF, calendar (.ics) entries, and share links.
 */

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  downloadBlob(filename, new Blob([content], { type: mime }));
}

export function downloadJson(filename: string, data: unknown) {
  downloadText(filename, JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
}

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV with a BOM so Excel opens Greek text correctly. */
export function downloadCsv(filename: string, rows: unknown[][]) {
  const body = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  downloadText(filename, `\uFEFF${body}`, 'text/csv;charset=utf-8');
}

export function slugify(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\u0370-\u03ff]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'document'
  );
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inline(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
}

/** A small Markdown subset (headings, lists, checkboxes, quotes, rules, paragraphs) to HTML. */
export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let paragraph: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1]!.length;
      out.push(`<h${level}>${inline(heading[2] ?? '')}</h${level}>`);
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      flushParagraph();
      closeList();
      out.push('<hr />');
      continue;
    }
    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flushParagraph();
      closeList();
      out.push(`<blockquote>${inline(quote[1] ?? '')}</blockquote>`);
      continue;
    }
    const bullet = /^\s*[-*]\s+(\[( |x)\]\s+)?(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) {
        closeList();
        out.push(`<${kind}>`);
        list = kind;
      }
      if (bullet) {
        const box = bullet[2] === 'x' ? '☑ ' : bullet[1] ? '☐ ' : '';
        out.push(`<li>${box}${inline(bullet[3] ?? '')}</li>`);
      } else {
        out.push(`<li>${inline(numbered?.[1] ?? '')}</li>`);
      }
      continue;
    }
    closeList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  closeList();
  return out.join('\n');
}

const PRINT_CSS = `
  body { font-family: Inter, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1c1917; line-height: 1.55; max-width: 760px; margin: 40px auto; padding: 0 24px; font-size: 14px; }
  h1 { font-size: 24px; margin: 0 0 12px; } h2 { font-size: 18px; margin: 28px 0 8px; } h3 { font-size: 15px; margin: 20px 0 6px; }
  p, li { margin: 6px 0; } ul, ol { padding-left: 22px; } hr { border: 0; border-top: 1px solid #e7e5e4; margin: 24px 0; }
  blockquote { margin: 12px 0; padding: 8px 14px; border-left: 3px solid #d6d3d1; color: #57534e; background: #fafaf9; }
  code { background: #f5f5f4; padding: 1px 4px; border-radius: 4px; }
  .meta { color: #78716c; font-size: 12px; margin-bottom: 24px; }
  .slide { page-break-after: always; border: 1px solid #e7e5e4; border-radius: 12px; padding: 32px; margin: 24px 0; min-height: 360px; }
  @media print { body { margin: 0 auto; } .no-print { display: none; } }
`;

export function htmlDocument(title: string, bodyHtml: string, meta = ''): string {
  return `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title><style>${PRINT_CSS}</style></head><body><h1>${escapeHtml(title)}</h1>${meta ? `<div class="meta">${escapeHtml(meta)}</div>` : ''}${bodyHtml}</body></html>`;
}

/** Opens a print-ready page; the browser's dialog offers "Save as PDF". */
export function openPrintable(title: string, bodyHtml: string, meta = ''): boolean {
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.open();
  win.document.write(htmlDocument(title, bodyHtml, meta));
  win.document.close();
  win.focus();
  setTimeout(() => {
    try {
      win.print();
    } catch {
      /* the page stays open for a manual print */
    }
  }, 350);
  return true;
}

/** A .doc file Word and Google Docs open, built from Markdown. */
export function downloadWord(filename: string, title: string, markdown: string) {
  const html = htmlDocument(title, markdownToHtml(markdown));
  downloadText(filename.endsWith('.doc') ? filename : `${filename}.doc`, html, 'application/msword;charset=utf-8');
}

export function downloadMarkdown(filename: string, markdown: string) {
  downloadText(filename.endsWith('.md') ? filename : `${filename}.md`, markdown, 'text/markdown;charset=utf-8');
}

// ── Calendar ──────────────────────────────────────────────────────────────

export type CalendarEntry = {
  uid: string;
  title: string;
  start: Date;
  end?: Date;
  allDay?: boolean;
  description?: string;
  location?: string;
  url?: string;
};

function icsDate(date: Date, allDay = false): string {
  if (allDay) return date.toISOString().slice(0, 10).replace(/-/g, '');
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function icsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  parts.push(rest);
  return parts.join('\r\n');
}

export function icsCalendar(entries: CalendarEntry[]): string {
  const stamp = icsDate(new Date());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CoFounderBay//Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const entry of entries) {
    const end = entry.end ?? new Date(entry.start.getTime() + (entry.allDay ? 86_400_000 : 60 * 60_000));
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${entry.uid}@cofounderbay`);
    lines.push(`DTSTAMP:${stamp}`);
    if (entry.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(entry.start, true)}`);
      lines.push(`DTEND;VALUE=DATE:${icsDate(end, true)}`);
    } else {
      lines.push(`DTSTART:${icsDate(entry.start)}`);
      lines.push(`DTEND:${icsDate(end)}`);
    }
    lines.push(fold(`SUMMARY:${icsText(entry.title)}`));
    if (entry.description) lines.push(fold(`DESCRIPTION:${icsText(entry.description)}`));
    if (entry.location) lines.push(fold(`LOCATION:${icsText(entry.location)}`));
    if (entry.url) lines.push(fold(`URL:${entry.url}`));
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcs(filename: string, entries: CalendarEntry[]) {
  downloadText(filename.endsWith('.ics') ? filename : `${filename}.ics`, icsCalendar(entries), 'text/calendar;charset=utf-8');
}

export function googleCalendarUrl(entry: CalendarEntry): string {
  const end = entry.end ?? new Date(entry.start.getTime() + 60 * 60_000);
  const dates = entry.allDay ? `${icsDate(entry.start, true)}/${icsDate(end, true)}` : `${icsDate(entry.start)}/${icsDate(end)}`;
  const params = new URLSearchParams({ action: 'TEMPLATE', text: entry.title, dates });
  if (entry.description) params.set('details', entry.description);
  if (entry.location) params.set('location', entry.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ── Clipboard and sharing ─────────────────────────────────────────────────

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** The system share sheet where there is one, otherwise a copied link. Returns how it was shared. */
export async function shareLink(input: { title: string; text?: string; url: string }): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator !== 'undefined' && 'share' in navigator && window.matchMedia?.('(pointer: coarse)').matches) {
      await navigator.share({ title: input.title, text: input.text, url: input.url });
      return 'shared';
    }
  } catch {
    /* fall back to copying */
  }
  return (await copyText(input.url)) ? 'copied' : 'failed';
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
}
