import { describe, expect, it } from 'vitest';
import { ellipseShape } from './ellipse';
import { ctx, maxGap, size } from './testUtil';

describe('ellipseShape', () => {
  const shape = ellipseShape({ width: 240, height: 150 }, ctx());

  it('every point is on the oval', () => {
    for (const p of shape.outer) expect((p.x / 120) ** 2 + (p.y / 75) ** 2).toBeCloseTo(1, 9);
  });

  it('is 240 × 150, centered, smooth, with M in the middle', () => {
    const s = size(shape.outer);
    expect(s.width).toBeCloseTo(240, 1);
    expect(s.height).toBeCloseTo(150, 1);
    expect(maxGap(shape.outer)).toBeLessThanOrEqual(3 + 1e-9);
    expect(shape.pole).toEqual({ x: 0, y: 0 });
  });
});
