import { describe, expect, it } from 'vitest';
import { overflowState, revealActive } from './scrollTabs';

describe('scroll tabs', () => {
  it('says which side of a strip continues', () => {
    expect(overflowState(0, 300, 300)).toBe('none');
    expect(overflowState(0, 600, 300)).toBe('end');
    expect(overflowState(150, 600, 300)).toBe('both');
    expect(overflowState(300, 600, 300)).toBe('start');
  });

  it('scrolls the strip, not the page, to show the active tab', () => {
    const strip = document.createElement('div');
    const tab = document.createElement('button');
    tab.setAttribute('aria-pressed', 'true');
    strip.appendChild(tab);
    Object.defineProperties(strip, { scrollWidth: { value: 800 }, clientWidth: { value: 300 }, offsetLeft: { value: 0 } });
    Object.defineProperties(tab, { offsetLeft: { value: 600 }, offsetWidth: { value: 100 } });
    strip.scrollLeft = 0;
    revealActive(strip);
    expect(strip.scrollLeft).toBe(416);
  });
});
