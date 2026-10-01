import { describe, expect, it } from 'vitest';
import { getRound } from '../../config/rounds.config';
import { selfIntersects } from '../polygon';
import { blobShape, type BlobParams } from './blob';
import { ctx, maxGap, size } from './testUtil';

const config = getRound(2).shape as { type: 'blob' } & BlobParams;
const SEEDS = Array.from({ length: 500 }, (_, i) => i + 1);

describe('blobShape (round 2)', () => {
  it('never crosses itself, across 500 seeds', () => {
    const crossing = SEEDS.filter((seed) => selfIntersects(blobShape(config, ctx(seed)).outer));
    expect(crossing).toEqual([]);
  });

  it('the same seed gives the same blob; another seed a different one', () => {
    expect(blobShape(config, ctx(42))).toEqual(blobShape(config, ctx(42)));
    expect(blobShape(config, ctx(42))).not.toEqual(blobShape(config, ctx(43)));
  });

  it('fills its 500 × 300 box, centered, with points about 3px apart', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const { outer } = blobShape(config, ctx(seed));
      const s = size(outer);
      expect(s.width).toBeCloseTo(500, 0);
      expect(s.height).toBeCloseTo(300, 0);
      expect(Math.abs(s.cx)).toBeLessThan(1);
      expect(Math.abs(s.cy)).toBeLessThan(1);
      expect(maxGap(outer)).toBeLessThan(3.5);
    }
  });
});
