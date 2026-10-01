import type { Point } from '../../core/stage';
import {
  ellipsePoints,
  fitToBox,
  resampleClosed,
  smoothClosed,
  type Shape,
  type ShapeContext,
} from './shape';

export interface AvocadoParams {
  /** Bounding box of the outline. */
  width: number;
  height: number;
  /** Pit width as a fraction of the shape's width. */
  pitFraction: number;
  /** Pit height ÷ pit width (> 1: an upright oval, like a seed). */
  pitAspect: number;
  /** Pit tilt, clockwise in degrees, around its own center (follows the fruit's lean). */
  pitRotationDeg: number;
  /** Pit center below the box center, as a fraction of the height. */
  pitCenterY: number;
}

/**
 * The pear outline as fractions of the box (x: −0.5 = left edge, 0.5 = right edge;
 * y: −0.5 = top, 0.5 = bottom). The two sides differ, so the fruit is lopsided:
 * the top bulb leans right and the bottom bulb swells more to the left.
 */
export const AVOCADO_OUTLINE = {
  top: { x: 0.06, y: -0.5 },
  /** Right side, top to bottom. */
  right: [
    { x: 0.19, y: -0.47 },
    { x: 0.29, y: -0.39 },
    { x: 0.32, y: -0.28 },
    { x: 0.28, y: -0.16 },
    { x: 0.33, y: -0.05 },
    { x: 0.43, y: 0.07 },
    { x: 0.47, y: 0.22 },
    { x: 0.44, y: 0.36 },
    { x: 0.32, y: 0.46 },
  ],
  bottom: { x: -0.04, y: 0.5 },
  /** Left side, bottom to top. */
  left: [
    { x: -0.3, y: 0.47 },
    { x: -0.46, y: 0.37 },
    { x: -0.53, y: 0.2 },
    { x: -0.47, y: 0.04 },
    { x: -0.33, y: -0.07 },
    { x: -0.21, y: -0.18 },
    { x: -0.2, y: -0.31 },
    { x: -0.14, y: -0.42 },
    { x: -0.06, y: -0.48 },
  ],
} as const;

/** How far around the pit height to look for the lower bulb's left and right edges (px). */
const EDGE_SCAN_PX = 4;

/** Middle of the outline (between its left and right edges) at height y. */
function middleAt(outline: readonly Point[], y: number): number {
  const xs = outline.filter((p) => Math.abs(p.y - y) < EDGE_SCAN_PX).map((p) => p.x);
  return xs.length > 0 ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
}

/** An upright, lopsided avocado: pear outline with a tilted oval pit cut out of the lower bulb. */
export function avocadoShape(p: AvocadoParams, { spacing }: ShapeContext): Shape {
  const { top, right, bottom, left } = AVOCADO_OUTLINE;
  const controls = [top, ...right, bottom, ...left].map((q) => ({
    x: q.x * p.width,
    y: q.y * p.height,
  }));
  const resampled = resampleClosed(smoothClosed(controls), spacing);
  const outline = fitToBox({ outer: resampled, holes: [] }, p.width, p.height).outer;

  // The pit sits in the middle of the lower bulb, wherever the lopsided outline puts it.
  const pitY = p.pitCenterY * p.height;
  const rx = (p.pitFraction * p.width) / 2;
  const center = { x: middleAt(outline, pitY), y: pitY };
  const turn = (p.pitRotationDeg * Math.PI) / 180;
  const pit = ellipsePoints({ x: 0, y: 0 }, rx, rx * p.pitAspect, spacing).map((q) => ({
    x: center.x + q.x * Math.cos(turn) - q.y * Math.sin(turn),
    y: center.y + q.x * Math.sin(turn) + q.y * Math.cos(turn),
  }));
  return { outer: outline, holes: [pit] };
}
