import type { Point } from '../core/stage';

/**
 * Plain polygon math for the optical center model. A polygon is one closed ring of
 * vertices (the last one connects back to the first), in either winding order.
 */
export type Polygon = readonly Point[];

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/** Every edge as a pair of vertices, including the closing edge from last back to first. */
function edges(poly: Polygon): Array<[Point, Point]> {
  const last = poly.at(-1);
  if (!last) return [];
  let prev = last;
  return poly.map((p) => {
    const edge: [Point, Point] = [prev, p];
    prev = p;
    return edge;
  });
}

/** Axis-aligned bounding box. */
export function bounds(poly: Polygon): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of poly) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Area centroid (center of mass of the filled shape, not the average of its vertices). */
export function centroid(poly: Polygon): Point {
  let area = 0;
  let x = 0;
  let y = 0;
  for (const [a, b] of edges(poly)) {
    const cross = a.x * b.y - b.x * a.y;
    area += cross;
    x += (a.x + b.x) * cross;
    y += (a.y + b.y) * cross;
  }
  if (area === 0) return poly[0] ?? { x: 0, y: 0 };
  return { x: x / (3 * area), y: y / (3 * area) };
}

/** True when the point is inside the polygon (even-odd rule). */
export function contains(poly: Polygon, p: Point): boolean {
  let inside = false;
  for (const [a, b] of edges(poly)) {
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
  const k = Math.min(Math.max(t, 0), 1);
  return Math.hypot(p.x - (a.x + k * dx), p.y - (a.y + k * dy));
}

/** Distance to the nearest edge: positive inside the polygon, negative outside. */
export function signedDistance(poly: Polygon, p: Point): number {
  let min = Infinity;
  for (const [a, b] of edges(poly)) min = Math.min(min, distanceToSegment(p, a, b));
  return contains(poly, p) ? min : -min;
}

interface Cell {
  x: number;
  y: number;
  /** Half the cell size. */
  half: number;
  /** Signed distance from the cell center to the polygon. */
  d: number;
  /** Best distance any point in this cell could reach. */
  max: number;
}

function makeCell(poly: Polygon, x: number, y: number, half: number): Cell {
  const d = signedDistance(poly, { x, y });
  return { x, y, half, d, max: d + half * Math.SQRT2 };
}

/** Search stops refining once a cell can't beat the best answer by more than this (px). */
const POLE_PRECISION_PX = 0.5;

/**
 * M, the pole of inaccessibility: the point inside the polygon farthest from every edge
 * (the center of the largest circle that fits inside). Uses the Mapbox "polylabel"
 * approach: cover the shape with square cells, then keep splitting the cells that
 * could still hold a better point, most promising first.
 */
export function poleOfInaccessibility(poly: Polygon, precision = POLE_PRECISION_PX): Point {
  const box = bounds(poly);
  const cellSize = Math.min(box.width, box.height);
  if (cellSize === 0) return { x: box.minX, y: box.minY };

  const half = cellSize / 2;
  const queue: Cell[] = [];
  for (let x = box.minX; x < box.maxX; x += cellSize) {
    for (let y = box.minY; y < box.maxY; y += cellSize) {
      queue.push(makeCell(poly, x + half, y + half, half));
    }
  }

  // Start from the better of the centroid and the box center.
  const c = centroid(poly);
  let best = makeCell(poly, c.x, c.y, 0);
  const middle = makeCell(poly, box.minX + box.width / 2, box.minY + box.height / 2, 0);
  if (middle.d > best.d) best = middle;

  while (queue.length > 0) {
    // Most promising cell first. Shapes are small, so a sort is fast enough.
    queue.sort((a, b) => b.max - a.max);
    const cell = queue.shift() as Cell;
    if (cell.d > best.d) best = cell;
    if (cell.max - best.d <= precision) continue;

    const h = cell.half / 2;
    queue.push(
      makeCell(poly, cell.x - h, cell.y - h, h),
      makeCell(poly, cell.x + h, cell.y - h, h),
      makeCell(poly, cell.x - h, cell.y + h, h),
      makeCell(poly, cell.x + h, cell.y + h, h),
    );
  }
  return { x: best.x, y: best.y };
}

/** Signed area (positive or negative depending on winding order). */
export function signedArea(poly: Polygon): number {
  let sum = 0;
  for (const [a, b] of edges(poly)) sum += a.x * b.y - b.x * a.y;
  return sum / 2;
}

/**
 * Area centroid of the material: the outer ring minus its holes (holes are assumed to
 * sit inside the outer ring and not overlap each other).
 */
export function materialCentroid(outer: Polygon, holes: readonly Polygon[]): Point {
  const parts = [
    { area: Math.abs(signedArea(outer)), c: centroid(outer) },
    ...holes.map((hole) => ({ area: -Math.abs(signedArea(hole)), c: centroid(hole) })),
  ];
  const total = parts.reduce((acc, p) => acc + p.area, 0);
  if (total <= 0) return centroid(outer);
  return {
    x: parts.reduce((acc, p) => acc + p.area * p.c.x, 0) / total,
    y: parts.reduce((acc, p) => acc + p.area * p.c.y, 0) / total,
  };
}

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/** True when segments ab and cd cross or touch. */
function segmentsMeet(a: Point, b: Point, c: Point, d: Point): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return d1 > 0 !== d2 > 0 && d3 > 0 !== d4 > 0 && d1 !== 0 && d3 !== 0;
}

/** True when any two non-neighbouring edges of the ring cross each other. */
export function selfIntersects(poly: Polygon): boolean {
  const list = edges(poly);
  const n = list.length;
  for (let i = 0; i < n; i++) {
    const [a, b] = list[i] as [Point, Point];
    // Neighbouring edges share a vertex; skip them (and the wrap-around pair).
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const [c, d] = list[j] as [Point, Point];
      if (segmentsMeet(a, b, c, d)) return true;
    }
  }
  return false;
}
