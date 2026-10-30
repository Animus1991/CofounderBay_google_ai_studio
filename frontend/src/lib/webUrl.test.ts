import { describe, expect, it } from 'vitest';
import { safeMediaUrl, safeWebUrl } from './webUrl';

describe('safeWebUrl', () => {
  it('normalizes a valid https URL to its href', () => {
    expect(safeWebUrl(' https://example.com/path?q=1 ')).toBe('https://example.com/path?q=1');
    expect(safeWebUrl('http://example.com')).toBe('http://example.com/');
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<h1>x</h1>',
    'vbscript:msgbox(1)',
    'ftp://files.example.com/x',
    '//evil.example.com/x',
    '/\\evil',
    '#',
    '',
    '   ',
    'http://user:pw@example.com',
    'https://user@example.com',
    'http://nodot',
    'notaurl',
    'example.com/path',
  ])('rejects %s', (value) => {
    expect(safeWebUrl(value)).toBeNull();
  });

  it('accepts localhost without a dot', () => {
    expect(safeWebUrl('http://localhost:3010/calendar')).toBe('http://localhost:3010/calendar');
    expect(safeWebUrl('https://localhost')).toBe('https://localhost/');
  });

  it('rejects non-strings and oversized values', () => {
    expect(safeWebUrl(undefined)).toBeNull();
    expect(safeWebUrl(null)).toBeNull();
    expect(safeWebUrl(42)).toBeNull();
    expect(safeWebUrl(`https://example.com/${'a'.repeat(2100)}`)).toBeNull();
  });
});

describe('safeMediaUrl', () => {
  it('accepts blob and non-html data URLs alongside http(s)', () => {
    expect(safeMediaUrl('blob:http://localhost:3010/1234-abcd')).toBe('blob:http://localhost:3010/1234-abcd');
    expect(safeMediaUrl('data:image/png;base64,iVBORw0KGgo=')).toBe('data:image/png;base64,iVBORw0KGgo=');
    expect(safeMediaUrl('https://cdn.example.com/file.pdf')).toBe('https://cdn.example.com/file.pdf');
  });

  it.each(['data:text/html,<script>alert(1)</script>', 'javascript:alert(1)', 'ftp://x.example.com/f'])(
    'rejects %s',
    (value) => {
      expect(safeMediaUrl(value)).toBeNull();
    },
  );
});
