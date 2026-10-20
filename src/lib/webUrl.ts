/**
 * The only URL shapes the app puts into `href`/`src` attributes or stores on a
 * profile: http(s) for outbound links, plus blob:/data: for files and media
 * produced inside this browser. Everything else — javascript:, vbscript:,
 * data: documents, ftp:, bare fragments — is refused, so a stored or remote
 * field can never smuggle a scriptable scheme into the page.
 */
const MAX_URL_LENGTH = 2048;

function parseSafe(value: unknown, protocols: string[]): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (!protocols.includes(url.protocol)) return null;
  if (url.username || url.password) return null;
  if (url.protocol === 'http:' || url.protocol === 'https:') {
    const host = url.hostname;
    if (host !== 'localhost' && !host.includes('.')) return null;
  }
  return url.href;
}

/** http(s) only — for outbound links the app renders or persists. */
export function safeWebUrl(value: unknown): string | null {
  return parseSafe(value, ['http:', 'https:']);
}

/**
 * http(s) plus blob:/data: — for media produced inside this browser (chat
 * uploads, voice notes, workspace files). A `data:` document is refused when
 * it is HTML, which could otherwise imitate the app in a new tab.
 */
export function safeMediaUrl(value: unknown): string | null {
  const url = parseSafe(value, ['http:', 'https:', 'blob:', 'data:']);
  if (url && /^data:text\/html/i.test(url)) return null;
  return url;
}
