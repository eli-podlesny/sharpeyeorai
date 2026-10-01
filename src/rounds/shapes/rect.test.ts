import { describe, expect, it } from 'vitest';
import { selfIntersects } from '../polygon';
import { rectShape } from './rect';
import { ctx, maxGap, size } from './testUtil';

describe('rectShape', () => {
  const shape = rectShape({ width: 360, height: 200 }, ctx());

  it('is width × height, centered on (0, 0), with M in the middle', () => {
    expect(size(shape.outer)).toEqual({ width: 360, height: 200, cx: 0, cy: 0 });
    expect(shape.pole).toEqual({ x: 0, y: 0 });
    expect(shape.holes).toEqual([]);
  });

  it('keeps sharp corners and samples its edges about 3px apart', () => {
    expect(shape.outer).toContainEqual({ x: -180, y: -100 });
    expect(shape.outer).toContainEqual({ x: 180, y: 100 });
    expect(maxGap(shape.outer)).toBeLessThanOrEqual(3 + 1e-9);
    expect(selfIntersects(shape.outer)).toBe(false);
  });
});
