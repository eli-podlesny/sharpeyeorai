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
  /** Pit diameter as a fraction of the width. */
  pitFraction: number;
  /** Pit center below the box center, as a fraction of the height. */
  pitCenterY: number;
}

/**
 * The right half of the pear outline, top to bottom, as fractions of the box
 * (x: 0 = axis, 0.5 = widest; y: −0.5 = top, 0.5 = bottom). The left half mirrors it.
 * A smaller top bulb, a smooth waist, a larger bottom bulb.
 */
export const AVOCADO_OUTLINE: readonly Point[] = [
  { x: 0.13, y: -0.48 },
  { x: 0.23, y: -0.42 },
  { x: 0.28, y: -0.31 },
  { x: 0.25, y: -0.18 },
  { x: 0.31, y: -0.07 },
  { x: 0.43, y: 0.05 },
  { x: 0.5, y: 0.2 },
  { x: 0.48, y: 0.34 },
  { x: 0.38, y: 0.45 },
  { x: 0.2, y: 0.5 },
];

/** An upright avocado: pear outline with a round pit cut out of the lower bulb. */
export function avocadoShape(p: AvocadoParams, { spacing }: ShapeContext): Shape {
  const right = AVOCADO_OUTLINE.map((q) => ({ x: q.x * p.width, y: q.y * p.height }));
  const left = [...right].reverse().map((q) => ({ x: -q.x, y: q.y }));
  const controls = [{ x: 0, y: -0.5 * p.height }, ...right, { x: 0, y: 0.5 * p.height }, ...left];
  const resampled = resampleClosed(smoothClosed(controls), spacing);
  const outline = fitToBox({ outer: resampled, holes: [] }, p.width, p.height);
  const pitRadius = (p.pitFraction * p.width) / 2;
  const pit = ellipsePoints({ x: 0, y: p.pitCenterY * p.height }, pitRadius, pitRadius, spacing);
  return { outer: outline.outer, holes: [pit] };
}
