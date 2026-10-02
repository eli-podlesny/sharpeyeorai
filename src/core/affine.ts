import type { Point } from './stage';

/**
 * A 2D CSS transform matrix, as in `matrix(a, b, c, d, e, f)`:
 *   x' = a·x + c·y + e
 *   y' = b·x + d·y + f
 * Here e and f are in unit px (CSS gives them in window px; divide by the unit scale).
 */
export interface Affine {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export const IDENTITY: Affine = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** `m` applied after `n` (as CSS reads `transform: m n`, left to right). */
export function multiply(m: Affine, n: Affine): Affine {
  return {
    a: m.a * n.a + m.c * n.b,
    b: m.b * n.a + m.d * n.b,
    c: m.a * n.c + m.c * n.d,
    d: m.b * n.c + m.d * n.d,
    e: m.a * n.e + m.c * n.f + m.e,
    f: m.b * n.e + m.d * n.f + m.f,
  };
}

export const translate = (x: number, y: number): Affine => ({ ...IDENTITY, e: x, f: y });
export const scale = (s: number): Affine => ({ ...IDENTITY, a: s, d: s });
/** Clockwise on screen for positive degrees (CSS `rotate()`). */
export function rotate(deg: number): Affine {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

/** Composes CSS-style transforms, left to right: `compose(t1, t2)` = `transform: t1 t2`. */
export function compose(...ms: Affine[]): Affine {
  return ms.reduce(multiply, IDENTITY);
}

export function apply(m: Affine, p: Point): Point {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

export function invert(m: Affine): Affine {
  const det = m.a * m.d - m.b * m.c;
  if (Math.abs(det) < 1e-12) throw new Error('Transform cannot be inverted (scale 0).');
  return {
    a: m.d / det,
    b: -m.b / det,
    c: -m.c / det,
    d: m.a / det,
    e: (m.c * m.f - m.d * m.e) / det,
    f: (m.b * m.e - m.a * m.f) / det,
  };
}

/**
 * Where a point on screen (`p`, in the parent's coordinates) is inside an element whose
 * transform `m` is applied around `origin` (its transform-origin). This undoes the
 * element's real transform, so it stays exact under rotation, unlike bounding rectangles.
 */
export function untransformPoint(p: Point, m: Affine, origin: Point): Point {
  const local = apply(invert(m), { x: p.x - origin.x, y: p.y - origin.y });
  return { x: local.x + origin.x, y: local.y + origin.y };
}

/** The forward direction of `untransformPoint`: where a local point ends up on screen. */
export function transformPoint(p: Point, m: Affine, origin: Point): Point {
  const moved = apply(m, { x: p.x - origin.x, y: p.y - origin.y });
  return { x: moved.x + origin.x, y: moved.y + origin.y };
}

/**
 * Reads a computed CSS transform (`none`, `matrix(…)` or `matrix3d(…)`) as a 2D matrix,
 * with the translation converted to unit px by dividing by `pxPerDesignPx` (window px per unit px).
 */
export function parseCssTransform(value: string, pxPerDesignPx: number): Affine {
  const match = /^matrix(3d)?\((.+)\)$/.exec(value.trim());
  if (!match?.[2]) return IDENTITY;
  const n = match[2].split(',').map(Number);
  const at = (i: number): number => n[i] ?? 0;
  // matrix3d is column-major 4×4: the 2D part is at 0, 1, 4, 5 and the translation at 12, 13.
  const [a, b, c, d, e, f] = match[1]
    ? [at(0), at(1), at(4), at(5), at(12), at(13)]
    : [at(0), at(1), at(2), at(3), at(4), at(5)];
  return { a, b, c, d, e: e / pxPerDesignPx, f: f / pxPerDesignPx };
}
