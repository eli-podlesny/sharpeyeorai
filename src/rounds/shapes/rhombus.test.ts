import { describe, expect, it } from 'vitest';
import type { Point } from '../../core/stage';
import { selfIntersects } from '../polygon';
import { rhombusShape, type RhombusParams } from './rhombus';
import { ctx, maxGap, size } from './testUtil';

const config: RhombusParams = {
  width: 300,
  height: 220,
  corners: [
    { x: 0.1, y: -0.5 },
    { x: 0.5, y: 0.08 },
    { x: -0.12, y: 0.5 },
    { x: -0.5, y: -0.1 },
  ],
};

/** Inner angle at corner b, in degrees. */
function angleAt(a: Point, b: Point, c: Point): number {
  const u = { x: a.x - b.x, y: a.y - b.y };
  const v = { x: c.x - b.x, y: c.y - b.y };
  const cos = (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y));
  return (Math.acos(cos) * 180) / Math.PI;
}

describe('rhombusShape', () => {
  const shape = rhombusShape(config, ctx());

  it('fills its 300 × 220 box, centered', () => {
    const s = size(shape.outer);
    expect(s.width).toBeCloseTo(300, 9);
    expect(s.height).toBeCloseTo(220, 9);
    expect(s.cx).toBeCloseTo(0, 9);
    expect(s.cy).toBeCloseTo(0, 9);
  });

  it('has four unequal corner angles that add up to 360°', () => {
    const corners = config.corners.map((p) => ({ x: p.x * 300, y: p.y * 220 }));
    const angles = corners.map((p, i) =>
      angleAt(corners[(i + 3) % 4] as Point, p, corners[(i + 1) % 4] as Point),
    );
    expect(angles.reduce((a, b) => a + b, 0)).toBeCloseTo(360, 6);
    expect(new Set(angles.map((a) => Math.round(a))).size).toBe(4);
  });

  it('is a simple, densely sampled outline', () => {
    expect(selfIntersects(shape.outer)).toBe(false);
    expect(maxGap(shape.outer)).toBeLessThanOrEqual(3 + 1e-9);
  });
});
