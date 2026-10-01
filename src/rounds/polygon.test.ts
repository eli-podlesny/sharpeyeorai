import { describe, expect, it } from 'vitest';
import {
  bounds,
  centroid,
  contains,
  materialCentroid,
  selfIntersects,
  signedArea,
  poleOfInaccessibility,
  signedDistance,
  type Polygon,
} from './polygon';

const square: Polygon = [
  { x: 0, y: 0 },
  { x: 200, y: 0 },
  { x: 200, y: 200 },
  { x: 0, y: 200 },
];

/** An L: a 300 × 100 bottom bar and a 100-wide arm going up the left side to y = 0. */
const lShape: Polygon = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 200 },
  { x: 300, y: 200 },
  { x: 300, y: 300 },
  { x: 0, y: 300 },
];

describe('bounds', () => {
  it('measures the box around the vertices', () => {
    expect(bounds(lShape)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 300,
      maxY: 300,
      width: 300,
      height: 300,
    });
  });
});

describe('centroid', () => {
  it('is the middle of a square', () => {
    expect(centroid(square)).toEqual({ x: 100, y: 100 });
  });

  it('does not depend on winding order', () => {
    expect(centroid([...square].reverse())).toEqual({ x: 100, y: 100 });
  });

  it('is the area-weighted center of an L', () => {
    // Arm 100 × 200 (area 2) centered (50, 100), bar 300 × 100 (area 3) centered (150, 250).
    const c = centroid(lShape);
    expect(c.x).toBeCloseTo(110);
    expect(c.y).toBeCloseTo(190);
    // …which lies outside the L itself, in the notch.
    expect(contains(lShape, c)).toBe(false);
  });
});

describe('contains and signedDistance', () => {
  it('knows inside from outside', () => {
    expect(contains(square, { x: 10, y: 10 })).toBe(true);
    expect(contains(square, { x: 210, y: 10 })).toBe(false);
    expect(contains(lShape, { x: 200, y: 100 })).toBe(false);
  });

  it('is positive inside, negative outside', () => {
    expect(signedDistance(square, { x: 100, y: 100 })).toBeCloseTo(100);
    expect(signedDistance(square, { x: 30, y: 100 })).toBeCloseTo(30);
    expect(signedDistance(square, { x: 250, y: 100 })).toBeCloseTo(-50);
  });
});

describe('poleOfInaccessibility (M)', () => {
  it('is the middle of a square', () => {
    const m = poleOfInaccessibility(square);
    expect(m.x).toBeCloseTo(100, 0);
    expect(m.y).toBeCloseTo(100, 0);
  });

  it('sits where the largest circle fits in an L', () => {
    const m = poleOfInaccessibility(lShape);
    // Both arms are 100 wide, so the best circle has radius 50.
    expect(contains(lShape, m)).toBe(true);
    expect(signedDistance(lShape, m)).toBeGreaterThanOrEqual(50 - 0.5);
  });

  it('handles a degenerate polygon', () => {
    const line: Polygon = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(poleOfInaccessibility(line)).toEqual({ x: 0, y: 0 });
  });
});

describe('signedArea', () => {
  it('has the size of the area, with the sign of the winding', () => {
    expect(Math.abs(signedArea(square))).toBe(40000);
    expect(signedArea([...square].reverse())).toBe(-signedArea(square));
  });
});

describe('materialCentroid', () => {
  it('is the plain centroid without holes', () => {
    expect(materialCentroid(square, [])).toEqual(centroid(square));
  });

  it('moves away from a hole', () => {
    // A 50 × 50 hole in the top-left quarter pushes C down and right.
    const hole: Polygon = [
      { x: 25, y: 25 },
      { x: 75, y: 25 },
      { x: 75, y: 75 },
      { x: 25, y: 75 },
    ];
    const c = materialCentroid(square, [hole]);
    // (40000 × 100 − 2500 × 50) / 37500
    expect(c.x).toBeCloseTo(103.333, 3);
    expect(c.y).toBeCloseTo(103.333, 3);
  });
});

describe('selfIntersects', () => {
  it('is false for a simple polygon', () => {
    expect(selfIntersects(square)).toBe(false);
  });

  it('is true for a bow tie', () => {
    const bowTie: Polygon = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
    ];
    expect(selfIntersects(bowTie)).toBe(true);
  });
});
