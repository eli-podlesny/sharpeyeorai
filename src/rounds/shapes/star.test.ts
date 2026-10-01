import { describe, expect, it } from 'vitest';
import { contains, selfIntersects } from '../polygon';
import { starShape } from './star';
import { ctx, maxGap, size } from './testUtil';

describe('starShape', () => {
  const params = { width: 380, height: 240, points: 5, innerRatio: 0.45 };
  const shape = starShape(params, ctx());

  it('fills its stretched 380 × 240 box, centered', () => {
    const s = size(shape.outer);
    expect(s.width).toBeCloseTo(380, 6);
    expect(s.height).toBeCloseTo(240, 6);
    expect(s.cx).toBeCloseTo(0, 6);
    expect(s.cy).toBeCloseTo(0, 6);
  });

  it('has its first tip pointing straight up', () => {
    const top = shape.outer.reduce((a, b) => (b.y < a.y ? b : a));
    expect(top.y).toBeCloseTo(-120, 6);
  });

  it('is concave between the tips (the box middle-bottom is outside the shape)', () => {
    expect(contains(shape.outer, { x: 0, y: 115 })).toBe(false);
    expect(contains(shape.outer, { x: 0, y: 0 })).toBe(true);
  });

  it('is a simple, densely sampled outline', () => {
    expect(selfIntersects(shape.outer)).toBe(false);
    expect(maxGap(shape.outer)).toBeLessThanOrEqual(3 + 1e-9);
  });
});
