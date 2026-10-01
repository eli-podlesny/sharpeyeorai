import type { Point } from '../../core/stage';
import { bounds } from '../polygon';
import { resampleClosed, type Shape, type ShapeContext } from './shape';

export interface ClusterCircle {
  /** Center, in px, in any frame (the finished shape is re-centered on its bounding box). */
  x: number;
  y: number;
  r: number;
}

export interface CircleClusterParams {
  /** Overlapping circles merged into one outline. All of them must share some common area. */
  circles: readonly ClusterCircle[];
}

/** Rays cast around the shared point; the outline is then resampled to `spacing`. */
const RAY_COUNT = 4096;
/** Grid steps per side when searching for a point inside every circle. */
const SEARCH_STEPS = 64;

/** How far inside every circle a point is (negative when it is outside one of them). */
const depth = (p: Point, circles: readonly ClusterCircle[]): number =>
  Math.min(...circles.map((c) => c.r - Math.hypot(p.x - c.x, p.y - c.y)));

/** The point deepest inside all circles at once (on a grid over their bounding box). */
function sharedPoint(circles: readonly ClusterCircle[]): Point {
  const box = bounds(
    circles.flatMap((c) => [
      { x: c.x - c.r, y: c.y - c.r },
      { x: c.x + c.r, y: c.y + c.r },
    ]),
  );
  let best = { x: box.minX, y: box.minY };
  let bestDepth = -Infinity;
  for (let i = 0; i <= SEARCH_STEPS; i++) {
    for (let j = 0; j <= SEARCH_STEPS; j++) {
      const p = {
        x: box.minX + (box.width * i) / SEARCH_STEPS,
        y: box.minY + (box.height * j) / SEARCH_STEPS,
      };
      const d = depth(p, circles);
      if (d > bestDepth) {
        best = p;
        bestDepth = d;
      }
    }
  }
  if (bestDepth <= 0) throw new Error('circleCluster: the circles must all overlap in one spot');
  return best;
}

/** Distance from `from` (inside the circle) along direction (dx, dy) to the circle's edge. */
function exitDistance(from: Point, dx: number, dy: number, c: ClusterCircle): number {
  const ox = from.x - c.x;
  const oy = from.y - c.y;
  const b = ox * dx + oy * dy;
  return -b + Math.sqrt(b * b - (ox * ox + oy * oy - c.r * c.r));
}

/**
 * Several overlapping circles merged into one outline (their union). Because every circle
 * contains one shared point, each ray from that point leaves the union exactly once: at
 * the farthest circle edge it crosses. Sharp notches stay where the circles meet.
 */
export function circleClusterShape(p: CircleClusterParams, { spacing }: ShapeContext): Shape {
  const from = sharedPoint(p.circles);
  const ring = Array.from({ length: RAY_COUNT }, (_, i) => {
    const angle = (2 * Math.PI * i) / RAY_COUNT;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const r = Math.max(...p.circles.map((c) => exitDistance(from, dx, dy, c)));
    return { x: from.x + r * dx, y: from.y + r * dy };
  });
  const outer = resampleClosed(ring, spacing);
  const box = bounds(outer);
  const cx = box.minX + box.width / 2;
  const cy = box.minY + box.height / 2;
  return { outer: outer.map((q) => ({ x: q.x - cx, y: q.y - cy })), holes: [] };
}
