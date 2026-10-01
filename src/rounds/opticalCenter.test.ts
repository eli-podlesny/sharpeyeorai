import { describe, expect, it } from 'vitest';
import { gameConfig } from '../config/game.config';
import type { RoundConfig } from '../config/rounds.config';
import { roundCenters, opticalCenters } from './opticalCenter';
import { contains, signedDistance, type Polygon } from './polygon';

const content = { width: 1000, height: 600 };

function makeRound(overrides: Partial<RoundConfig> = {}): RoundConfig {
  return {
    id: 1,
    phase: 1,
    shape: { type: 'rect', width: 200, height: 200, rotationDeg: 0 },
    offset: { x: 0, y: 0 },
    timeWeight: 0,
    timeLimitMs: null,
    effects: [],
    copyKey: 'objective.rect',
    ...overrides,
  };
}

const expectPoint = (actual: { x: number; y: number }, x: number, y: number): void => {
  expect(actual.x).toBeCloseTo(x, 6);
  expect(actual.y).toBeCloseTo(y, 6);
};

/**
 * A tall, thick arm (120 wide, x 0–120, y 0–400) with a thinner foot (80 high) running
 * right along the bottom to x = 400. C falls in the notch near the inner corner.
 */
const lShape: Polygon = [
  { x: 0, y: 0 },
  { x: 120, y: 0 },
  { x: 120, y: 320 },
  { x: 400, y: 320 },
  { x: 400, y: 400 },
  { x: 0, y: 400 },
];

describe('roundCenters for rectangles', () => {
  it('square: M = C, and O is C moved up 10px (5% of 200)', () => {
    const { C, M, O } = roundCenters(makeRound(), content);
    expectPoint(C, 500, 300);
    expectPoint(M, 500, 300);
    expectPoint(O, 500, 290);
  });

  it('rotated rectangle: the shift stays vertical on screen and uses the on-screen height', () => {
    // 200 × 100 turned 90°: on screen it is 100 wide and 200 tall → shift 10px straight up.
    const turned90 = { type: 'rect', width: 200, height: 100, rotationDeg: 90 } as const;
    expectPoint(roundCenters(makeRound({ shape: turned90 }), content).O, 500, 290);

    // 200 × 200 turned 45°: on screen it is 200√2 tall → shift 10√2 straight up.
    const turned45 = { type: 'rect', width: 200, height: 200, rotationDeg: 45 } as const;
    const { C, O } = roundCenters(makeRound({ shape: turned45 }), content);
    expect(O.x).toBeCloseTo(C.x, 6);
    expect(C.y - O.y).toBeCloseTo(10 * Math.SQRT2, 6);
  });

  it('applies per-round overrides, including a leftward shift', () => {
    const round = makeRound({ optical: { biasX: 0.1, biasY: 0.1 } });
    expectPoint(roundCenters(round, content).O, 480, 280);
  });
});

describe('opticalCenters for an L-shape', () => {
  const { C, M, O } = opticalCenters(lShape, gameConfig.optical);

  it('C sits in the notch near the corner, outside the shape', () => {
    expect(contains(lShape, C)).toBe(false);
    expect(C.x).toBeGreaterThan(120);
    expect(C.y).toBeLessThan(320);
  });

  it('M sits inside the thick arm, where the biggest circle fits (radius 60)', () => {
    expect(M.x).toBeLessThan(120);
    expect(signedDistance(lShape, M)).toBeGreaterThanOrEqual(60 - 0.5);
  });

  it('O lands between C and M, nudged up, and inside the shape', () => {
    const { skeletonWeight: w, biasY } = gameConfig.optical;
    expect(O.x).toBeCloseTo(C.x + w * (M.x - C.x), 6);
    expect(O.y).toBeCloseTo(C.y + w * (M.y - C.y) - biasY * 400, 6);
    expect(contains(lShape, O)).toBe(true);
  });
});

describe('opticalCenters fallback', () => {
  it('uses M when O would fall outside the shape', () => {
    // With no pull toward M, O stays near C, which is outside the L.
    const settings = { ...gameConfig.optical, skeletonWeight: 0 };
    const { M, O } = opticalCenters(lShape, settings);
    expect(O).toEqual(M);
  });
});
