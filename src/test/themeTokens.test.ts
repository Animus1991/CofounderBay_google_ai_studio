/**
 * The theme tokens (src/styles/tokens.css), checked as data:
 *
 *  - no theme falls back to !important overrides again;
 *  - Dark Obsidian defines every role the light themes rely on Tailwind for;
 *  - text on the surfaces it is used on meets WCAG AA (4.5:1) in every theme —
 *    muted inks, status inks on their own tints, white on each accent, the
 *    accent used as text.
 *
 * Colours are read from the CSS itself (and Tailwind's palette for the
 * defaults), so changing a token is checked without a browser.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');
const tokens = fs.readFileSync(path.join(root, 'src/styles/tokens.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8');
const palette = fs.readFileSync(path.join(root, 'node_modules/tailwindcss/theme.css'), 'utf8');

type RGBA = [number, number, number, number];

const linear = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
function oklab(L: number, a: number, b: number): RGBA {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (v: number) => Math.max(0, Math.min(1, linear(v))) * 255;
  return [clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s), 1];
}

/** Values in one block of `css` whose selector text starts exactly with `selector`. */
function block(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no block ${selector}`);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1]!, match[2]!.replace(/\/\*.*?\*\//g, '').trim()]));
}

function tailwind(name: string): string {
  const match = new RegExp(`--color-${name}:\\s*([^;]+);`).exec(palette);
  if (!match) throw new Error(`no Tailwind colour ${name}`);
  return match[1]!.trim();
}

function parse(value: string, vars: Record<string, string> = {}): RGBA {
  const text = value.trim();
  const ref = /^var\((--[\w-]+)(?:,\s*(.+))?\)$/.exec(text);
  if (ref) return parse(vars[ref[1]!] ?? ref[2] ?? (() => { throw new Error(`unset ${ref[1]}`); })(), vars);
  const mix = /^color-mix\(in srgb,\s*(.+)\s+(\d+)%,\s*(#[0-9a-f]+)\)$/i.exec(text);
  if (mix) {
    const [a, weight, b] = [parse(mix[1]!, vars), Number(mix[2]) / 100, parse(mix[3]!, vars)];
    return [a[0] * weight + b[0] * (1 - weight), a[1] * weight + b[1] * (1 - weight), a[2] * weight + b[2] * (1 - weight), 1];
  }
  if (text.startsWith('#')) {
    const hex = text.slice(1);
    const full = hex.length === 3 ? [...hex].map((char) => char + char).join('') : hex;
    return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16), 1];
  }
  const numbers = (text.match(/-?[\d.]+%?/g) ?? []).map((n) => (n.endsWith('%') ? parseFloat(n) / 100 : parseFloat(n)));
  if (text.startsWith('rgba') || text.startsWith('rgb(')) {
    const alpha = text.includes('/') ? numbers[3]! : numbers[3] ?? 1;
    return [numbers[0]!, numbers[1]!, numbers[2]!, alpha];
  }
  if (text.startsWith('oklch')) {
    const [L, C, H] = numbers as [number, number, number];
    const hue = (H * Math.PI) / 180;
    return oklab(L, C * Math.cos(hue), C * Math.sin(hue));
  }
  throw new Error(`cannot read colour ${text}`);
}

const over = (top: RGBA, bottom: RGBA): RGBA => [0, 1, 2].map((i) => top[i]! * top[3] + bottom[i]! * (1 - top[3])).concat(1) as RGBA;
const luminance = ([r, g, b]: RGBA) => {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
function contrast(ink: RGBA, surface: RGBA, page: RGBA = [255, 255, 255, 1]): number {
  const ground = surface[3] < 1 ? over(surface, page) : surface;
  const fore = ink[3] < 1 ? over(ink, ground) : ink;
  const [a, b] = [luminance(fore), luminance(ground)].sort((x, y) => y - x);
  return (a! + 0.05) / (b! + 0.05);
}

const light = block(tokens, ':root:not([data-theme="dark"])');
const dark = block(tokens, ':root[data-theme="dark"]');
const accents = block(tokens, ':root:is([data-theme="cyan"], [data-theme="mint"], [data-theme="apricot"], [data-theme="lilac"], [data-theme="burgundy"])');
const accentThemes = ['cyan', 'mint', 'apricot', 'lilac', 'burgundy'] as const;

describe('theme tokens', () => {
  it('leave no !important colour overrides (only reduced motion keeps it)', () => {
    expect(tokens.replace(/\/\*[\s\S]*?\*\//g, '')).not.toContain('!important');
    const important = index.split('\n').filter((line) => line.includes('!important'));
    expect(important.every((line) => /animation|transition|scroll-behavior/.test(line))).toBe(true);
  });

  it('give Dark Obsidian every surface, ink and line role', () => {
    const roles = ['--surface-white', '--surface-50', '--surface-100', '--surface-200', '--surface-900', '--ink-900', '--ink-500', '--ink-400', '--line-200', '--line-900',
      '--ink-danger', '--ink-warning', '--ink-success', '--ink-info', '--ink-violet', '--tint-danger', '--tint-warning', '--tint-success', '--tint-info', '--tint-violet'];
    expect(roles.filter((role) => !(role in dark))).toEqual([]);
  });

  describe('light themes meet AA', () => {
    const surfaces = { white: parse('#ffffff'), 'stone-50': parse(tailwind('stone-50')), 'stone-100': parse(tailwind('stone-100')) };
    it.each(['--ink-500', '--ink-400', '--ink-300', '--ink-200'])('%s on white, stone-50 and stone-100', (ink) => {
      for (const surface of Object.values(surfaces)) expect(contrast(parse(light[ink]!), surface)).toBeGreaterThanOrEqual(4.5);
    });
    it.each([
      ['--ink-danger', '--tint-danger'], ['--ink-danger-strong', '--tint-danger'],
      ['--ink-warning', '--tint-warning'], ['--ink-warning-strong', '--tint-warning'], ['--ink-warning-soft', '--tint-warning'],
      ['--ink-success', '--tint-success'], ['--ink-success-strong', '--tint-success'], ['--ink-success-soft', '--tint-success'],
      ['--ink-info', '--tint-info'], ['--ink-violet', '--tint-violet'],
    ])('%s on white and on %s', (ink, tint) => {
      expect(contrast(parse(light[ink]!), parse('#ffffff'))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(parse(light[ink]!), parse(light[tint]!))).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe.each(accentThemes)('%s', (theme) => {
    const values = block(index, `  [data-theme="${theme}"]`);
    const accent = parse(values['--cfb-accent']!);
    it('white text on the accent fill meets AA', () => {
      expect(contrast(parse('#ffffff'), accent)).toBeGreaterThanOrEqual(4.5);
    });
    it('the accent as text meets AA on white and on its own wash', () => {
      const ink = parse(accents['--primary-ink']!, values);
      expect(contrast(ink, parse('#ffffff'))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, parse(values['--cfb-accent-soft']!))).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Dark Obsidian meets AA', () => {
    const page = parse(dark['--surface-50']!);
    const cards = ['--surface-white', '--surface-50', '--surface-100'].map((name) => parse(dark[name]!));
    it.each(['--ink-900', '--ink-600', '--ink-500', '--ink-400', '--ink-200', '--primary-ink'])('%s on cards and the page', (ink) => {
      for (const card of cards) expect(contrast(parse(dark[ink]!), card, page)).toBeGreaterThanOrEqual(4.5);
    });
    it.each([
      ['--ink-danger', '--tint-danger'], ['--ink-warning', '--tint-warning'], ['--ink-warning-strong', '--tint-warning-3'],
      ['--ink-success', '--tint-success'], ['--ink-info', '--tint-info'], ['--ink-violet', '--tint-violet'],
    ])('%s on a card and on %s', (ink, tint) => {
      const card = parse(dark['--surface-white']!);
      expect(contrast(parse(dark[ink]!), card)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(parse(dark[ink]!), over(parse(dark[tint]!), card))).toBeGreaterThanOrEqual(4.5);
    });
    it('white text on the inverse fill meets AA', () => {
      expect(contrast(parse('#ffffff'), parse(dark['--surface-900']!))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(parse('#ffffff'), parse(dark['--surface-800']!))).toBeGreaterThanOrEqual(4.5);
    });
  });
});
