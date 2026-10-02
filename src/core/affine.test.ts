import { describe, expect, it } from 'vitest';
import { layout } from '../config/layout.config';
import {
  compose,
  IDENTITY,
  invert,
  multiply,
  parseCssTransform,
  rotate,
  scale,
  transformPoint,
  translate,
  untransformPoint,
} from './affine';
import { contentFromStage } from './input';

const { origin, drop } = layout.assembly;
/** Round 10's dropped pose, the way the CSS writes it. */
const dropped = compose(translate(drop.x, drop.y), rotate(drop.rotateDeg), scale(drop.scale));

describe('affine', () => {
  it('inverts back to the identity', () => {
    const m = invert(dropped);
    const id = multiply(dropped, m);
    expect(id.a).toBeCloseTo(1);
    expect(id.b).toBeCloseTo(0);
    expect(id.c).toBeCloseTo(0);
    expect(id.d).toBeCloseTo(1);
    expect(id.e).toBeCloseTo(0);
    expect(id.f).toBeCloseTo(0);
  });

  it('rotates clockwise for positive degrees, like CSS', () => {
    const r = compose(rotate(90));
    const p = transformPoint({ x: 10, y: 0 }, r, { x: 0, y: 0 });
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(10);
  });

  it('round-trips points through the dropped pose', () => {
    for (const p of [
      { x: 197, y: 128 },
      { x: 720, y: 466 },
      { x: 1243, y: 804 },
    ]) {
      const onScreen = transformPoint(p, dropped, origin);
      const back = untransformPoint(onScreen, dropped, origin);
      expect(back.x).toBeCloseTo(p.x, 6);
      expect(back.y).toBeCloseTo(p.y, 6);
    }
  });

  it('reads computed CSS matrices, converting the translation to design px', () => {
    expect(parseCssTransform('none', 1)).toEqual(IDENTITY);
    const m = parseCssTransform('matrix(0.5, 0.1, -0.1, 0.5, 30, -20)', 2);
    expect(m).toEqual({ a: 0.5, b: 0.1, c: -0.1, d: 0.5, e: 15, f: -10 });
    const m3 = parseCssTransform(
      'matrix3d(0.5, 0.1, 0, 0, -0.1, 0.5, 0, 0, 0, 0, 1, 0, 30, -20, 0, 1)',
      2,
    );
    expect(m3).toEqual({ a: 0.5, b: 0.1, c: -0.1, d: 0.5, e: 15, f: -10 });
  });
});

describe('clicks on the dropped screen (round 10)', () => {
  const screen = layout.screen;

  it('maps a click on the turned screen to the right screen-content point', () => {
    // A point inside the screen (content px), where it is drawn on the stage when dropped…
    const content = { x: 300, y: 200 };
    const drawnAt = transformPoint(
      { x: screen.left + content.x, y: screen.top + content.y },
      dropped,
      origin,
    );
    // …and a click there lands back on it.
    const back = contentFromStage(drawnAt, dropped);
    expect(back.x).toBeCloseTo(content.x, 6);
    expect(back.y).toBeCloseTo(content.y, 6);
  });

  it('differs from naive (untransformed) mapping by far more than a pixel', () => {
    const content = { x: 900, y: 600 };
    const drawnAt = transformPoint(
      { x: screen.left + content.x, y: screen.top + content.y },
      dropped,
      origin,
    );
    const naive = contentFromStage(drawnAt, IDENTITY);
    expect(Math.hypot(naive.x - content.x, naive.y - content.y)).toBeGreaterThan(100);
  });

  it('works through a CSS matrix read at any stage scale', () => {
    const s = 1.6;
    const css = `matrix(${dropped.a}, ${dropped.b}, ${dropped.c}, ${dropped.d}, ${dropped.e * s}, ${dropped.f * s})`;
    const m = parseCssTransform(css, s);
    const content = { x: 523, y: 338 };
    const drawnAt = transformPoint(
      { x: screen.left + content.x, y: screen.top + content.y },
      dropped,
      origin,
    );
    const back = contentFromStage(drawnAt, m);
    expect(back.x).toBeCloseTo(content.x, 6);
    expect(back.y).toBeCloseTo(content.y, 6);
  });
});
