import { describe, expect, it } from 'vitest';
import { circleShape } from './circle';
import { ctx, maxGap, size } from './testUtil';

describe('circleShape', () => {
  const shape = circleShape({ diameter: 320 }, ctx());

  it('every point is on the circle', () => {
    for (const p of shape.outer) expect(Math.hypot(p.x, p.y)).toBeCloseTo(160, 9);
  });

  it('is 320 across, centered, smooth', () => {
    const s = size(shape.outer);
    expect(s.width).toBeCloseTo(320, 1);
    expect(s.height).toBeCloseTo(320, 1);
    expect(maxGap(shape.outer)).toBeLessThanOrEqual(3 + 1e-9);
    expect(shape.pole).toEqual({ x: 0, y: 0 });
  });
});
