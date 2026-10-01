import { describe, expect, it } from 'vitest';
import type { RoundConfig } from '../config/rounds.config';
import { placeShape, rotate, shapeAnchor, shapePath, toShapeLocal } from './geometry';
import { bounds } from './polygon';

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
    effects: [],
    copyKey: 'objective.shape',
    ...overrides,
  };
}

const expectPoint = (actual: { x: number; y: number } | undefined, x: number, y: number): void => {
  expect(actual?.x).toBeCloseTo(x, 9);
  expect(actual?.y).toBeCloseTo(y, 9);
};

describe('rotate', () => {
  it('turns clockwise on screen for positive degrees (y points down)', () => {
    expectPoint(rotate({ x: 1, y: 0 }, 90), 0, 1);
    expectPoint(rotate({ x: 0, y: -1 }, 90), 1, 0);
  });
});

describe('shapeAnchor', () => {
  it('is the content center plus the offset', () => {
    expectPoint(shapeAnchor(makeRound(), content), 500, 300);
    expectPoint(shapeAnchor(makeRound({ offset: { x: 30, y: -8 } }), content), 530, 292);
  });
});

describe('placeShape', () => {
  it('centers the shape on its anchor', () => {
    const shape = placeShape(makeRound({ offset: { x: 30, y: -8 } }), content, SEED);
    const box = bounds(shape.outer);
    expect(box.minX).toBeCloseTo(430, 9);
    expect(box.minY).toBeCloseTo(192, 9);
    expect(box.width).toBeCloseTo(200, 9);
    expect(box.height).toBeCloseTo(200, 9);
    expectPoint(shape.pole, 530, 292);
  });

  it('turns the outline and the holes around the anchor', () => {
    const round = makeRound({ shape: { type: 'rect', width: 200, height: 100 }, rotationDeg: 90 });
    const box = bounds(placeShape(round, content, SEED).outer);
    expect(box.width).toBeCloseTo(100, 9);
    expect(box.height).toBeCloseTo(200, 9);
    // Top-left corner (−100, −50) turned 90° clockwise lands at (50, −100) from the anchor.
    expectPoint(placeShape(round, content, SEED).outer[0], 550, 200);
  });

  it('moves holes with the shape', () => {
    const round = makeRound({ shape: { type: 'smiley', diameter: 300 }, offset: { x: 100, y: 0 } });
    const shape = placeShape(round, content, SEED);
    expect(shape.holes).toHaveLength(3);
    for (const hole of shape.holes) {
      const box = bounds(hole);
      expect(box.minX).toBeGreaterThan(450);
      expect(box.maxX).toBeLessThan(750);
    }
  });
});

describe('toShapeLocal', () => {
  it('measures from the origin without rotation', () => {
    expectPoint(toShapeLocal({ x: 510, y: 282 }, { x: 500, y: 292 }, 0), 10, -10);
  });

  it('undoes the shape rotation', () => {
    const origin = { x: 500, y: 300 };
    // Turned 90° clockwise, the shape's right edge now points down on screen…
    expectPoint(toShapeLocal({ x: 500, y: 400 }, origin, 90), 100, 0);
    // …and its top edge points right.
    expectPoint(toShapeLocal({ x: 550, y: 300 }, origin, 90), 0, -50);
  });

  it('is the inverse of placing a local point on a rotated shape', () => {
    const origin = { x: 540, y: 280 };
    const turned = rotate({ x: 60, y: -25 }, 30);
    expectPoint(
      toShapeLocal({ x: origin.x + turned.x, y: origin.y + turned.y }, origin, 30),
      60,
      -25,
    );
  });
});

describe('shapePath', () => {
  it('draws one closed sub-path per ring', () => {
    const d = shapePath({
      outer: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
      holes: [
        [
          { x: 2, y: 2 },
          { x: 3, y: 2 },
          { x: 3, y: 3 },
        ],
      ],
    });
    expect(d).toBe('M0.00 0.00L10.00 0.00L10.00 10.00ZM2.00 2.00L3.00 2.00L3.00 3.00Z');
  });
});
