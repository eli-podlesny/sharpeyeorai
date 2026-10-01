import { describe, expect, it } from 'vitest';
import { contains, selfIntersects } from '../polygon';
import { curveShape } from './curve';
import { ctx, maxGap, size } from './testUtil';

describe('curveShape', () => {
  // A plain rounded diamond.
  const params = {
    width: 300,
    height: 200,
    controls: [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ],
  };
  const shape = curveShape(params, ctx());

  // Resampling the fitted curve can cut its extremes by a fraction of a pixel.
  it('fills its width × height box, centered', () => {
    const s = size(shape.outer);
    expect(s.width).toBeCloseTo(300, 0);
    expect(s.height).toBeCloseTo(200, 0);
    expect(s.cx).toBeCloseTo(0, 0);
    expect(s.cy).toBeCloseTo(0, 0);
  });

  it('is a simple, densely sampled closed curve', () => {
    expect(selfIntersects(shape.outer)).toBe(false);
    expect(maxGap(shape.outer)).toBeLessThanOrEqual(3.1);
    expect(contains(shape.outer, { x: 0, y: 0 })).toBe(true);
    expect(shape.holes).toEqual([]);
  });

  it('no drift draws the same curve; drift moves the outline by about that much', () => {
    const none = curveShape(
      params,
      ctx(),
      params.controls.map(() => ({ x: 0, y: 0 })),
    );
    expect(none.outer).toEqual(shape.outer);
    const right = curveShape(
      params,
      ctx(),
      params.controls.map(() => ({ x: 10, y: 0 })),
    );
    const s = size(right.outer);
    expect(s.cx).toBeCloseTo(10, 0);
    expect(s.width).toBeCloseTo(300, 0);
  });
});
