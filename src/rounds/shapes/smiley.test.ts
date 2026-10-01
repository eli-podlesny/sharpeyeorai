import { describe, expect, it } from 'vitest';
import type { Point } from '../../core/stage';
import { contains, selfIntersects } from '../polygon';
import { smileyShape } from './smiley';
import { ctx, maxGap, size } from './testUtil';

describe('smileyShape (round 12)', () => {
  const shape = smileyShape({ diameter: 300 }, ctx());
  const [leftEye, rightEye, mouth] = shape.holes as [Point[], Point[], Point[]];

  it('is a 300 disc with M in the middle', () => {
    const s = size(shape.outer);
    expect(s.width).toBeCloseTo(300, 1);
    expect(s.height).toBeCloseTo(300, 1);
    expect(shape.pole).toEqual({ x: 0, y: 0 });
  });

  it('has two eyes above the middle, mirrored, and a mouth below', () => {
    expect(shape.holes).toHaveLength(3);
    expect(size(leftEye).cx).toBeCloseTo(-size(rightEye).cx, 6);
    expect(size(leftEye).cy).toBeLessThan(0);
    expect(size(mouth).cy).toBeGreaterThan(0);
  });

  it('the mouth is a curved band: its ends sit higher than its middle', () => {
    const lowest = Math.max(...mouth.map((p) => p.y));
    const ends = mouth.filter((p) => Math.abs(p.x) > 0.9 * (size(mouth).width / 2));
    for (const p of ends) expect(p.y).toBeLessThan(lowest - 20);
  });

  it('every hole sits inside the disc, without crossing itself or the others', () => {
    for (const hole of shape.holes) {
      expect(selfIntersects(hole)).toBe(false);
      expect(maxGap(hole)).toBeLessThan(3.5);
      for (const p of hole) expect(contains(shape.outer, p)).toBe(true);
    }
    for (const p of mouth) {
      expect(contains(leftEye, p) || contains(rightEye, p)).toBe(false);
    }
  });
});
