import { describe, expect, it } from 'vitest';
import { layout } from '../config/layout.config';
import { apply, compose, IDENTITY, parseCssTransform, rotate, scale, translate } from './affine';
import type { Affine } from './affine';
import { contentFromClient } from './input';
import { computeUnitRect, unitScale, type Point, type UnitRect } from './stage';

const { unit, opening, assembly } = layout;
const { drop } = assembly;
/** The dropped pose (after round 9's click), as the CSS writes it, in unit px. */
const dropped = compose(translate(drop.x, drop.y), rotate(drop.rotateDeg), scale(drop.scale));

/** The brief's check sizes. */
const WINDOWS = [
  [1280, 720],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
  [1280, 1000],
] as const;

/** Where a screen-content point is drawn in the window: the forward direction of the mapping. */
function drawnAt(content: Point, rect: UnitRect, m: Affine): Point {
  const fromCenter = {
    x: opening.left + content.x - unit.width / 2,
    y: opening.top + content.y - unit.height / 2,
  };
  const moved = apply(m, fromCenter);
  const s = unitScale(rect.height);
  return {
    x: rect.left + rect.width / 2 + moved.x * s,
    y: rect.top + rect.height / 2 + moved.y * s,
  };
}

const POINTS: Point[] = [
  { x: 0, y: 0 },
  { x: 300, y: 200 },
  { x: opening.width / 2, y: opening.height / 2 },
  { x: opening.width, y: opening.height },
];

describe('contentFromClient', () => {
  it('maps the opening corners to content (0, 0) and its size, at every window size', () => {
    for (const [w, h] of WINDOWS) {
      const rect = computeUnitRect(w, h);
      const s = unitScale(rect.height);
      const topLeft = { x: rect.left + opening.left * s, y: rect.top + opening.top * s };
      const a = contentFromClient(topLeft, rect, IDENTITY);
      expect(a.x).toBeCloseTo(0, 6);
      expect(a.y).toBeCloseTo(0, 6);
      const bottomRight = {
        x: topLeft.x + opening.width * s,
        y: topLeft.y + opening.height * s,
      };
      const b = contentFromClient(bottomRight, rect, IDENTITY);
      expect(b.x).toBeCloseTo(opening.width, 6);
      expect(b.y).toBeCloseTo(opening.height, 6);
    }
  });

  it('gives the same content point for the same spot on the art at every window size', () => {
    for (const p of POINTS) {
      for (const [w, h] of WINDOWS) {
        const rect = computeUnitRect(w, h);
        const back = contentFromClient(drawnAt(p, rect, IDENTITY), rect, IDENTITY);
        expect(back.x).toBeCloseTo(p.x, 6);
        expect(back.y).toBeCloseTo(p.y, 6);
      }
    }
  });

  it('maps clicks on the dropped screen back to the right content point at every window size', () => {
    for (const p of POINTS) {
      for (const [w, h] of WINDOWS) {
        const rect = computeUnitRect(w, h);
        const back = contentFromClient(drawnAt(p, rect, dropped), rect, dropped);
        expect(back.x).toBeCloseTo(p.x, 6);
        expect(back.y).toBeCloseTo(p.y, 6);
      }
    }
  });

  it('differs from naive (untransformed) mapping by far more than a pixel when dropped', () => {
    const rect = computeUnitRect(1440, 900);
    const p = { x: 900, y: 600 };
    const naive = contentFromClient(drawnAt(p, rect, dropped), rect, IDENTITY);
    expect(Math.hypot(naive.x - p.x, naive.y - p.y)).toBeGreaterThan(100);
  });

  it('works through the computed CSS matrix, whose move is in window px', () => {
    for (const [w, h] of WINDOWS) {
      const rect = computeUnitRect(w, h);
      const s = unitScale(rect.height);
      const d = dropped;
      const css = `matrix(${d.a}, ${d.b}, ${d.c}, ${d.d}, ${d.e * s}, ${d.f * s})`;
      const m = parseCssTransform(css, s);
      const p = { x: 523, y: 338 };
      const back = contentFromClient(drawnAt(p, rect, dropped), rect, m);
      expect(back.x).toBeCloseTo(p.x, 6);
      expect(back.y).toBeCloseTo(p.y, 6);
    }
  });
});
