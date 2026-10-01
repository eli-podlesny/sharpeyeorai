import { describe, expect, it } from 'vitest';
import { getRound } from '../../config/rounds.config';
import type { Point } from '../../core/stage';
import { contains, selfIntersects } from '../polygon';
import { avocadoShape, type AvocadoParams } from './avocado';
import { ctx, maxGap, size } from './testUtil';

const config = getRound(3).shape as { type: 'avocado' } & AvocadoParams;

/** Left and right edges of the outline around a given height (from the sampled points nearby). */
function edgesAt(outer: readonly Point[], y: number): { left: number; right: number } {
  const xs = outer.filter((p) => Math.abs(p.y - y) < 4).map((p) => p.x);
  return { left: Math.min(...xs), right: Math.max(...xs) };
}

const widthAt = (outer: readonly Point[], y: number): number => {
  const { left, right } = edgesAt(outer, y);
  return right - left;
};

describe('avocadoShape (round 3)', () => {
  const shape = avocadoShape(config, ctx());

  it('is 280 × 380, upright and centered', () => {
    const s = size(shape.outer);
    expect(s.width).toBeCloseTo(280, 6);
    expect(s.height).toBeCloseTo(380, 6);
    expect(s.cx).toBeCloseTo(0, 6);
    expect(s.cy).toBeCloseTo(0, 6);
  });

  it('is a pear: small top bulb, a waist, a bigger bottom bulb', () => {
    const top = widthAt(shape.outer, -0.3 * 380);
    const waist = widthAt(shape.outer, -0.17 * 380);
    const bottom = widthAt(shape.outer, 0.2 * 380);
    expect(waist).toBeLessThan(top);
    expect(bottom).toBeGreaterThan(1.5 * top);
  });

  it('is lopsided: the top bulb sits off-center from the bottom bulb', () => {
    const middle = (y: number): number => {
      const { left, right } = edgesAt(shape.outer, y);
      return (left + right) / 2;
    };
    expect(Math.abs(middle(-0.3 * 380) - middle(0.2 * 380))).toBeGreaterThan(10);
  });

  it('untilted, the pit is an upright oval about 35% of the width', () => {
    const upright = avocadoShape({ ...config, pitRotationDeg: 0 }, ctx());
    const s = size(upright.holes[0] ?? []);
    expect(s.width).toBeCloseTo(0.35 * 280, 0);
    expect(s.height).toBeCloseTo(0.35 * 280 * config.pitAspect, 0);
  });

  it('the pit leans clockwise with the fruit: its top point sits right of its center', () => {
    const pit = shape.holes[0] ?? [];
    const s = size(pit);
    const topmost = pit.reduce((a, b) => (b.y < a.y ? b : a));
    expect(config.pitRotationDeg).toBeGreaterThan(0);
    expect(topmost.x).toBeGreaterThan(s.cx + 5);
  });

  it('the pit is centered in the lower bulb, inside the outline', () => {
    expect(shape.holes).toHaveLength(1);
    const pit = shape.holes[0] ?? [];
    const s = size(pit);
    expect(s.cy).toBeGreaterThan(0);
    const { left, right } = edgesAt(shape.outer, s.cy);
    expect(s.cx).toBeCloseTo((left + right) / 2, 0);
    for (const p of pit) expect(contains(shape.outer, p)).toBe(true);
  });

  it('is a simple, densely sampled outline', () => {
    expect(selfIntersects(shape.outer)).toBe(false);
    expect(maxGap(shape.outer)).toBeLessThan(3.5);
  });
});
