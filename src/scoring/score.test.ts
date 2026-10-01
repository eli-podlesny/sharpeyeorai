import { describe, expect, it } from 'vitest';
import { gameConfig } from '../config/game.config';
import { humanityIndex, lean } from './lean';
import { accuracy, falloffRadius, quality, roundPoints, speed, totalScore } from './score';

const square = { width: 200, height: 200 };

describe('falloffRadius', () => {
  it('is half the shorter side', () => {
    expect(falloffRadius(square)).toBe(100);
    expect(falloffRadius({ ...square, width: 300, height: 120 })).toBe(60);
  });
});

describe('accuracy — reference values for the 200 × 200 square', () => {
  const R = falloffRadius(square);
  it.each([
    [0, 1.0],
    [10, 0.85],
    [25, 0.65],
    [50, 0.35],
    [100, 0],
    [150, 0],
  ])('%ipx from O → %f', (dO, expected) => {
    expect(accuracy(dO, R)).toBeCloseTo(expected, 1);
  });
});

describe('speed', () => {
  it('is full up to the grace time and zero from the max time on', () => {
    expect(speed(0)).toBe(1);
    expect(speed(1500)).toBe(1);
    expect(speed(8000)).toBe(0);
    expect(speed(20000)).toBe(0);
  });

  it('falls in a straight line in between', () => {
    expect(speed(4750)).toBeCloseTo(0.5);
  });
});

describe('quality', () => {
  it('ignores speed when timeWeight is 0 (round 1)', () => {
    expect(quality(0.8, 0, 0)).toBeCloseTo(0.8);
  });

  it('takes away at most timeWeight for a slow click', () => {
    expect(quality(1, 0, 0.2)).toBeCloseTo(0.8);
    expect(quality(1, 1, 0.2)).toBeCloseTo(1);
  });

  it('is zero with a penalty', () => {
    expect(quality(1, 1, 0.2, true)).toBe(0);
  });
});

describe('roundPoints and totalScore', () => {
  it('gives a perfect game exactly 10,000', () => {
    expect(totalScore(Array<number>(12).fill(1), 12)).toBe(gameConfig.scoring.maxScore);
    expect(roundPoints(1, 12) * 12).toBeCloseTo(10000);
  });

  it('rounds the total only once, from the exact sum', () => {
    // 12 rounds of q = 0.5 → 5000 exactly, even though each round is 416.67 points.
    expect(totalScore(Array<number>(12).fill(0.5), 12)).toBe(5000);
    expect(roundPoints(0.5, 12)).toBeCloseTo(416.667, 2);
  });
});

describe('lean', () => {
  const C = { x: 0, y: 0 };
  const O = { x: 0, y: -10 };

  it('is 0 on C and 1 on O', () => {
    expect(lean(C, C, O)).toBeCloseTo(0);
    expect(lean(O, C, O)).toBeCloseTo(1);
  });

  it('ignores sideways offset (projects onto the C→O line)', () => {
    expect(lean({ x: 40, y: -5 }, C, O)).toBeCloseTo(0.5);
  });

  it('is clamped to [−0.5, 1.5]', () => {
    expect(lean({ x: 0, y: 50 }, C, O)).toBe(-0.5);
    expect(lean({ x: 0, y: -50 }, C, O)).toBe(1.5);
  });

  it('is null when C and O are under minSeparationPx apart', () => {
    expect(lean(C, C, { x: 0, y: -3 })).toBeNull();
  });
});

describe('humanityIndex', () => {
  it('averages the valid leans and skips nulls', () => {
    expect(humanityIndex([0, 1, null, 0.5])).toBeCloseTo(0.5);
  });

  it('is null when no round has a lean', () => {
    expect(humanityIndex([null, null])).toBeNull();
    expect(humanityIndex([])).toBeNull();
  });
});
