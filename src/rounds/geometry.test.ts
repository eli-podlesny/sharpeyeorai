import { describe, expect, it } from 'vitest';
import type { RoundConfig } from '../config/rounds.config';
import { computedCenter, opticalCenter, rotate, toShapeLocal } from './geometry';

const content = { width: 1000, height: 600 };

function makeRound(overrides: Partial<RoundConfig> = {}): RoundConfig {
  return {
    id: 1,
    phase: 1,
    shape: { type: 'rect', width: 200, height: 200, rotationDeg: 0 },
    offset: { x: 0, y: 0 },
    opticalOffsetY: 0.05,
    timeWeight: 0,
    timeLimitMs: null,
    effects: [],
    copyKey: 'objective.rect',
    ...overrides,
  };
}

const expectPoint = (actual: { x: number; y: number }, x: number, y: number): void => {
  expect(actual.x).toBeCloseTo(x, 9);
  expect(actual.y).toBeCloseTo(y, 9);
};

describe('rotate', () => {
  it('turns clockwise on screen for positive degrees (y points down)', () => {
    expectPoint(rotate({ x: 1, y: 0 }, 90), 0, 1);
    expectPoint(rotate({ x: 0, y: -1 }, 90), 1, 0);
  });
});

describe('computedCenter (C)', () => {
  it('is the content center when there is no offset', () => {
    expectPoint(computedCenter(makeRound(), content), 500, 300);
  });

  it('follows the offset', () => {
    expectPoint(computedCenter(makeRound({ offset: { x: 30, y: -8 } }), content), 530, 292);
  });

  it('does not move when the shape rotates', () => {
    const shape = { type: 'rect', width: 200, height: 100, rotationDeg: 37 } as const;
    expectPoint(computedCenter(makeRound({ shape }), content), 500, 300);
  });
});

describe('opticalCenter (O)', () => {
  it('sits above C by opticalOffsetY × height (0.05 × 200 = 10px)', () => {
    expectPoint(opticalCenter(makeRound(), content), 500, 290);
  });

  it('uses the round’s own fraction and shape height', () => {
    const shape = { type: 'rect', width: 200, height: 300, rotationDeg: 0 } as const;
    expectPoint(opticalCenter(makeRound({ shape, opticalOffsetY: 0.1 }), content), 500, 270);
  });

  it('stays straight up on screen when the shape is rotated', () => {
    const shape = { type: 'rect', width: 200, height: 200, rotationDeg: 30 } as const;
    expectPoint(opticalCenter(makeRound({ shape, offset: { x: 20, y: 10 } }), content), 520, 300);
  });
});

describe('toShapeLocal', () => {
  it('measures from C without rotation', () => {
    const round = makeRound({ offset: { x: 0, y: -8 } });
    expectPoint(toShapeLocal({ x: 510, y: 282 }, round, content), 10, -10);
  });

  it('maps C to (0, 0) and corners to ± half size', () => {
    const round = makeRound();
    expectPoint(toShapeLocal({ x: 500, y: 300 }, round, content), 0, 0);
    expectPoint(toShapeLocal({ x: 400, y: 200 }, round, content), -100, -100);
  });

  it('undoes the shape rotation', () => {
    const shape = { type: 'rect', width: 200, height: 100, rotationDeg: 90 } as const;
    const round = makeRound({ shape });
    // Turned 90° clockwise, the shape's right edge now points down on screen.
    expectPoint(toShapeLocal({ x: 500, y: 400 }, round, content), 100, 0);
    // And its top edge points right.
    expectPoint(toShapeLocal({ x: 550, y: 300 }, round, content), 0, -50);
  });

  it('is the inverse of placing a local point on a rotated shape', () => {
    const shape = { type: 'rect', width: 200, height: 200, rotationDeg: 30 } as const;
    const round = makeRound({ shape, offset: { x: 40, y: -20 } });
    const c = computedCenter(round, content);
    const local = { x: 60, y: -25 };
    const turned = rotate(local, 30);
    expectPoint(toShapeLocal({ x: c.x + turned.x, y: c.y + turned.y }, round, content), 60, -25);
  });

  it('puts O 10px straight up from C, turned into the rotated shape’s axes', () => {
    const shape = { type: 'rect', width: 200, height: 200, rotationDeg: 90 } as const;
    const round = makeRound({ shape });
    // Screen-up is the shape's left (−x) after a 90° clockwise turn.
    expectPoint(toShapeLocal(opticalCenter(round, content), round, content), -10, 0);
  });
});
