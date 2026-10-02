import { describe, expect, it } from 'vitest';
import { selfIntersects } from '../polygon';
import { ctx, maxGap, size } from './testUtil';
import { triangleShape } from './triangle';

describe('triangleShape', () => {
  const side = 120;
  const shape = triangleShape({ side }, ctx());

  it('is as wide as its side and √3/2 of it tall, centered on its box', () => {
    const s = size(shape.outer);
    expect(s.width).toBeCloseTo(side, 9);
    expect(s.height).toBeCloseTo((side * Math.sqrt(3)) / 2, 9);
    expect(s.cx).toBeCloseTo(0, 9);
    expect(s.cy).toBeCloseTo(0, 9);
  });

  it('has three equal sides, point up', () => {
    const top = shape.outer.reduce((a, p) => (p.y < a.y ? p : a));
    expect(top.x).toBeCloseTo(0, 9);
    const h = (side * Math.sqrt(3)) / 2;
    const corners = [
      { x: 0, y: -h / 2 },
      { x: side / 2, y: h / 2 },
      { x: -side / 2, y: h / 2 },
    ];
    const sides = corners.map((p, i) => {
      const q = corners[(i + 1) % 3] ?? p;
      return Math.hypot(q.x - p.x, q.y - p.y);
    });
    for (const s of sides) expect(s).toBeCloseTo(side, 9);
  });

  it('is a simple, densely sampled outline', () => {
    expect(selfIntersects(shape.outer)).toBe(false);
    expect(maxGap(shape.outer)).toBeLessThanOrEqual(3 + 1e-9);
    expect(shape.holes).toEqual([]);
  });
});
