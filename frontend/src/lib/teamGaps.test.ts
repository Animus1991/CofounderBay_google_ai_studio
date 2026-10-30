import { describe, expect, it } from 'vitest';
import { coveredAreas, teamGaps } from './teamGaps';

describe('team gaps', () => {
  it('treats TypeScript and React as covering the build area', () => {
    expect(coveredAreas(['TypeScript', 'React', 'Node.js'])).toContain('build');
  });

  it('names market and operate as gaps for a builder-only skill list', () => {
    const result = teamGaps(['TypeScript', 'React']);
    expect(result.covered).toContain('build');
    expect(result.gaps).toEqual(expect.arrayContaining(['market', 'operate']));
  });
});
