import { describe, expect, it } from 'vitest';
import { getRound } from '../../config/rounds.config';
import { contains, selfIntersects } from '../polygon';
import { circleClusterShape, type CircleClusterParams } from './circleCluster';
import { ctx, maxGap, size } from './testUtil';

const config = getRound(9).shape as { type: 'circleCluster' } & CircleClusterParams;

describe('circleClusterShape (round 9)', () => {
  const shape = circleClusterShape(config, ctx());
  const s = size(shape.outer);

  it('is centered on its bounding box', () => {
    expect(s.cx).toBeCloseTo(0, 6);
    expect(s.cy).toBeCloseTo(0, 6);
  });

  it('is the union of its circles: as wide and tall as they are together', () => {
    const xs = config.circles.flatMap((c) => [c.x - c.r, c.x + c.r]);
    const ys = config.circles.flatMap((c) => [c.y - c.r, c.y + c.r]);
    expect(s.width).toBeCloseTo(Math.max(...xs) - Math.min(...xs), 0);
    expect(s.height).toBeCloseTo(Math.max(...ys) - Math.min(...ys), 0);
  });

  it('every outline point lies on one of the circles, outside the others', () => {
    // Move the circles into the shape's (re-centered) frame.
    const xs = config.circles.flatMap((c) => [c.x - c.r, c.x + c.r]);
    const ys = config.circles.flatMap((c) => [c.y - c.r, c.y + c.r]);
    const dx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const dy = (Math.max(...ys) + Math.min(...ys)) / 2;
    const circles = config.circles.map((c) => ({ x: c.x - dx, y: c.y - dy, r: c.r }));
    for (const p of shape.outer) {
      const gaps = circles.map((c) => Math.hypot(p.x - c.x, p.y - c.y) - c.r);
      expect(Math.min(...gaps.map(Math.abs))).toBeLessThan(0.5);
      expect(Math.min(...gaps)).toBeGreaterThan(-0.5);
    }
  });

  it('uses three different circles and is not symmetric', () => {
    expect(new Set(config.circles.map((c) => c.r)).size).toBe(3);
    const mirrored = shape.outer.map((p) => ({ x: -p.x, y: p.y }));
    const outside = mirrored.filter((p) => !contains(shape.outer, p)).length;
    expect(outside).toBeGreaterThan(shape.outer.length / 10);
  });

  it('is a simple, densely sampled outline', () => {
    expect(selfIntersects(shape.outer)).toBe(false);
    expect(maxGap(shape.outer)).toBeLessThan(3.5);
  });

  it('refuses circles that do not all overlap', () => {
    const apart = {
      circles: [
        { x: 0, y: 0, r: 10 },
        { x: 100, y: 0, r: 10 },
      ],
    };
    expect(() => circleClusterShape(apart, ctx())).toThrow();
  });
});
