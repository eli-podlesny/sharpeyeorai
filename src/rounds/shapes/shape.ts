import type { Rng } from '../../core/rng';
import type { Point } from '../../core/stage';
import { bounds, type Polygon } from '../polygon';

/**
 * A shape in its own local space, in design px: its bounding box is centered on (0, 0),
 * y points down. `outer` is the outline; `holes` are cut out of it (rendered with the
 * even-odd rule). All rings are closed: the last point connects back to the first.
 */
export interface Shape {
  outer: Polygon;
  holes: Polygon[];
  /** The pole of inaccessibility (M), when the shape makes it obvious (symmetric shapes). */
  pole?: Point;
}

/** What every generator gets besides its own params. */
export interface ShapeContext {
  /** Seeded randomness; generators that don't need it ignore it. */
  rng: Rng;
  /** Wanted distance between neighbouring points on curves and edges, in px. */
  spacing: number;
}

const lerp = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

const dist = (a: Point, b: Point): number => Math.hypot(b.x - a.x, b.y - a.y);

/** A polygon with straight edges, split so points are at most `spacing` apart. Corners are kept. */
export function densify(corners: readonly Point[], spacing: number): Point[] {
  const out: Point[] = [];
  corners.forEach((a, i) => {
    const b = corners[(i + 1) % corners.length] as Point;
    const steps = Math.max(1, Math.ceil(dist(a, b) / spacing));
    for (let s = 0; s < steps; s++) out.push(lerp(a, b, s / steps));
  });
  return out;
}

/**
 * Points along an ellipse arc around `center`, from angle `from` to `to` (radians;
 * positive turns clockwise on screen). Both ends are included.
 */
export function arcPoints(
  center: Point,
  rx: number,
  ry: number,
  from: number,
  to: number,
  spacing: number,
): Point[] {
  // Measured on the larger radius, so points are never farther apart than `spacing`.
  const length = Math.abs(to - from) * Math.max(rx, ry);
  const steps = Math.max(2, Math.ceil(length / spacing));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / steps;
    return { x: center.x + rx * Math.cos(a), y: center.y + ry * Math.sin(a) };
  });
}

/** A full ellipse as a closed ring. */
export function ellipsePoints(center: Point, rx: number, ry: number, spacing: number): Point[] {
  return arcPoints(center, rx, ry, 0, 2 * Math.PI, spacing).slice(0, -1);
}

/** Catmull-Rom curve samples per control-point segment, before resampling. */
const SPLINE_STEPS = 48;
/** Centripetal parameterization: no cusps or loops inside a segment. */
const SPLINE_ALPHA = 0.5;

/** A closed, smooth curve through every control point (centripetal Catmull-Rom), finely sampled. */
export function smoothClosed(controls: readonly Point[]): Point[] {
  const n = controls.length;
  const at = (i: number): Point => controls[((i % n) + n) % n] as Point;
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const t0 = 0;
    const t1 = t0 + dist(p0, p1) ** SPLINE_ALPHA;
    const t2 = t1 + dist(p1, p2) ** SPLINE_ALPHA;
    const t3 = t2 + dist(p2, p3) ** SPLINE_ALPHA;
    for (let s = 0; s < SPLINE_STEPS; s++) {
      const t = t1 + ((t2 - t1) * s) / SPLINE_STEPS;
      const a1 = lerp(p0, p1, (t - t0) / (t1 - t0));
      const a2 = lerp(p1, p2, (t - t1) / (t2 - t1));
      const a3 = lerp(p2, p3, (t - t2) / (t3 - t2));
      const b1 = lerp(a1, a2, (t - t0) / (t2 - t0));
      const b2 = lerp(a2, a3, (t - t1) / (t3 - t1));
      out.push(lerp(b1, b2, (t - t1) / (t2 - t1)));
    }
  }
  return out;
}

/** Evenly spaced points (about `spacing` apart) along a closed curve given as a fine ring. */
export function resampleClosed(points: readonly Point[], spacing: number): Point[] {
  const ring = [...points, points[0] as Point];
  const lengths = [0];
  for (let i = 1; i < ring.length; i++) {
    lengths.push((lengths[i - 1] as number) + dist(ring[i - 1] as Point, ring[i] as Point));
  }
  const total = lengths.at(-1) ?? 0;
  const count = Math.max(3, Math.round(total / spacing));
  const out: Point[] = [];
  let seg = 1;
  for (let k = 0; k < count; k++) {
    const target = (total * k) / count;
    while ((lengths[seg] as number) < target) seg++;
    const start = lengths[seg - 1] as number;
    const span = (lengths[seg] as number) - start;
    out.push(
      lerp(ring[seg - 1] as Point, ring[seg] as Point, span > 0 ? (target - start) / span : 0),
    );
  }
  return out;
}

/**
 * Moves and stretches a shape so its outline's bounding box is exactly width × height,
 * centered on (0, 0). Holes and the pole move with it.
 */
export function fitToBox(shape: Shape, width: number, height: number): Shape {
  const box = bounds(shape.outer);
  const sx = width / box.width;
  const sy = height / box.height;
  const cx = box.minX + box.width / 2;
  const cy = box.minY + box.height / 2;
  const map = (p: Point): Point => ({ x: (p.x - cx) * sx, y: (p.y - cy) * sy });
  return {
    outer: shape.outer.map(map),
    holes: shape.holes.map((hole) => hole.map(map)),
    ...(shape.pole ? { pole: map(shape.pole) } : {}),
  };
}
