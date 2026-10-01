import { describe, expect, it } from 'vitest';
import { getRound } from '../../config/rounds.config';
import type { Point } from '../../core/stage';
import { contains, selfIntersects } from '../polygon';
import { avocadoShape, type AvocadoParams } from './avocado';
import { ctx, maxGap, size } from './testUtil';

const config = getRound(3).shape as { type: 'avocado' } & AvocadoParams;

/** Half-width of the outline around a given height (from the sampled points nearby). */
function halfWidthAt(outer: readonly Point[], y: number): number {
  return Math.max(...outer.filter((p) => Math.abs(p.y - y) < 4).map((p) => Math.abs(p.x)));
}

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
    const top = halfWidthAt(shape.outer, -0.31 * 380);
    const waist = halfWidthAt(shape.outer, -0.18 * 380);
    const bottom = halfWidthAt(shape.outer, 0.2 * 380);
    expect(waist).toBeLessThan(top);
    expect(bottom).toBeGreaterThan(1.5 * top);
  });

  it('has a round pit about 35% of the width, inside the lower bulb', () => {
    expect(shape.holes).toHaveLength(1);
    const pit = shape.holes[0] ?? [];
    const s = size(pit);
    expect(s.width).toBeCloseTo(0.35 * 280, 0);
    expect(s.height).toBeCloseTo(0.35 * 280, 0);
    expect(s.cy).toBeGreaterThan(0);
    for (const p of pit) expect(contains(shape.outer, p)).toBe(true);
  });

  it('is a simple, densely sampled outline', () => {
    expect(selfIntersects(shape.outer)).toBe(false);
    expect(maxGap(shape.outer)).toBeLessThan(3.5);
  });
});
