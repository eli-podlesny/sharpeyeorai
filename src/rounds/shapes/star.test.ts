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

describe('starShape with its own depth per inner corner', () => {
  const params = { width: 300, height: 300, points: 7, innerRatio: 0.5 };
  const radii = [0.46, 0.62, 0.38, 0.56, 0.42, 0.66, 0.5];
  // With a huge spacing only the corners are left: tip, inner, tip, inner…
  const corners = starShape({ ...params, innerRadii: radii }, ctx(1, 1000)).outer;
  const depth = corners.filter((_, i) => i % 2 === 1).map((p) => Math.hypot(p.x, p.y));

  it('puts the deepest and the shallowest inner corners where the radii say', () => {
    expect(corners).toHaveLength(14);
    expect(depth.indexOf(Math.min(...depth))).toBe(radii.indexOf(Math.min(...radii)));
    expect(depth.indexOf(Math.max(...depth))).toBe(radii.indexOf(Math.max(...radii)));
  });

  it('fills its box and never crosses itself', () => {
    const shape = starShape({ ...params, innerRadii: radii }, ctx());
    expect(size(shape.outer).width).toBeCloseTo(300, 6);
    expect(size(shape.outer).height).toBeCloseTo(300, 6);
    expect(selfIntersects(shape.outer)).toBe(false);
  });
});
