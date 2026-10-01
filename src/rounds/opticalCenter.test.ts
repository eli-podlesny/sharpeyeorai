import { describe, expect, it } from 'vitest';
import { gameConfig } from '../config/game.config';
import { getRound, type RoundConfig } from '../config/rounds.config';
import { placeShape, type PlacedShape } from './geometry';
import { opticalCenters, shapeCenters } from './opticalCenter';
import { contains, signedDistance, type Polygon } from './polygon';
import { roundTarget } from './target';

const content = { width: 1000, height: 600 };
const SEED = 1;

function makeRound(overrides: Partial<RoundConfig> = {}): RoundConfig {
  return {
    id: 1,
    phase: 1,
    shape: { type: 'rect', width: 200, height: 200 },
    offset: { x: 0, y: 0 },
    rotationDeg: 0,
    fill: 'default',
    timeWeight: 0,
    timeLimitMs: null,
    showObjective: true,
    clickFeedback: true,
    effects: [],
    copyKey: 'objective.shape',
    ...overrides,
  };
}

const centersOf = (round: RoundConfig) => roundTarget(round, content, SEED).centers;

const expectPoint = (actual: { x: number; y: number }, x: number, y: number, digits = 6): void => {
  expect(actual.x).toBeCloseTo(x, digits);
  expect(actual.y).toBeCloseTo(y, digits);
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

describe('round centers for rectangles', () => {
  it('square: M = C, and O is C moved up 10px (5% of 200)', () => {
    const { C, M, O } = centersOf(makeRound());
    expectPoint(C, 500, 300);
    expectPoint(M, 500, 300);
    expectPoint(O, 500, 290);
  });

  it('rotated rectangle: the shift stays vertical on screen and uses the on-screen height', () => {
    // 200 × 100 turned 90°: on screen it is 100 wide and 200 tall → shift 10px straight up.
    const wide = { type: 'rect', width: 200, height: 100 } as const;
    expectPoint(centersOf(makeRound({ shape: wide, rotationDeg: 90 })).O, 500, 290);

    // 200 × 200 turned 45°: on screen it is 200√2 tall → shift 10√2 straight up.
    const { C, O } = centersOf(makeRound({ rotationDeg: 45 }));
    expect(O.x).toBeCloseTo(C.x, 6);
    expect(C.y - O.y).toBeCloseTo(10 * Math.SQRT2, 6);
  });

  it('applies per-round overrides, including a leftward shift', () => {
    const round = makeRound({ optical: { biasX: 0.1, biasY: 0.1 } });
    expectPoint(centersOf(round).O, 480, 280);
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

describe('shapes with holes', () => {
  /** A 200 × 200 square with a 100 × 100 hole in its middle: a square ring. */
  const ring: PlacedShape = {
    outer: [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 200 },
      { x: 0, y: 200 },
    ],
    holes: [
      [
        { x: 50, y: 50 },
        { x: 150, y: 50 },
        { x: 150, y: 150 },
        { x: 50, y: 150 },
      ],
    ],
    anchor: { x: 100, y: 100 },
    rotationDeg: 0,
  };

  it('ring: O is computed as if the hole were filled, so it sits in the hole', () => {
    const { C, O } = shapeCenters(ring, gameConfig.optical);
    expectPoint(C, 100, 100);
    expectPoint(O, 100, 90);
    expect(contains(ring.holes[0] ?? [], O)).toBe(true);
  });

  const avocado = placeShape(makeRound({ shape: getRound(3).shape }), content, SEED);
  const pit = avocado.holes[0] ?? [];

  it('avocado: C sits in the material, pushed up by the pit; O ignores the pit', () => {
    const filled = opticalCenters(avocado.outer, gameConfig.optical);
    const { C, O } = shapeCenters(avocado, gameConfig.optical);
    expect(contains(avocado.outer, C)).toBe(true);
    expect(contains(pit, C)).toBe(false);
    expect(C.y).toBeLessThan(filled.C.y);
    expectPoint(O, filled.O.x, filled.O.y);
  });

  it('avocado: lopsided enough that C and O are far apart, both on the material', () => {
    const { C, O } = shapeCenters(avocado, gameConfig.optical);
    expect(Math.hypot(O.x - C.x, O.y - C.y)).toBeGreaterThan(15);
    expect(contains(pit, C) || contains(pit, O)).toBe(false);
  });

  it('avocado: O can sit in the pit (here with the full pull toward M)', () => {
    const settings = { ...gameConfig.optical, skeletonWeight: 1, biasY: 0 };
    const { O } = shapeCenters(avocado, settings);
    expect(contains(pit, O)).toBe(true);
  });

  it('smiley: the eyes and mouth do not move O', () => {
    const smiley = placeShape(
      makeRound({ shape: { type: 'smiley', diameter: 300 } }),
      content,
      SEED,
    );
    const { M, O } = shapeCenters(smiley, gameConfig.optical);
    const disc = shapeCenters({ ...smiley, holes: [] }, gameConfig.optical);
    expectPoint(O, disc.O.x, disc.O.y);
    expectPoint(M, 500, 300);
    // 5% of 300 above the middle.
    expectPoint(O, 500, 285, 1);
  });
});
