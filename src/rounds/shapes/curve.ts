import type { Point } from '../../core/stage';
import { bounds } from '../polygon';
import { resampleClosed, smoothClosed, type Shape, type ShapeContext } from './shape';

export interface CurveParams {
  /** Bounding box of the finished curve (with no drift). */
  width: number;
  height: number;
  /**
   * Control points the smooth outline passes through, in order around the shape, as
   * fractions of the half-size: (−1, −1) is the top-left corner of the box, (1, 1) the
   * bottom-right. The curve is stretched afterwards so its box is exactly width × height.
   */
  controls: readonly Point[];
}

/** The control points in px, before the stretch to the exact box. */
function scaledControls(p: CurveParams): Point[] {
  return p.controls.map((c) => ({ x: (c.x * p.width) / 2, y: (c.y * p.height) / 2 }));
}

/**
 * A smooth closed curve through hand-placed control points (round 4's bean, round 5's
 * triangular blob). `drift` moves each control point by that many px before the curve is
 * drawn (used by morphing rounds); the stretch to the box is measured without drift, so
 * a drifting curve really changes size a little instead of being squeezed back.
 */
export function curveShape(
  p: CurveParams,
  { spacing }: ShapeContext,
  drift?: readonly Point[],
): Shape {
  const controls = scaledControls(p);
  const box = bounds(smoothClosed(controls));
  const sx = p.width / box.width;
  const sy = p.height / box.height;
  const cx = box.minX + box.width / 2;
  const cy = box.minY + box.height / 2;
  const moved = drift
    ? controls.map((c, i) => ({ x: c.x + (drift[i]?.x ?? 0), y: c.y + (drift[i]?.y ?? 0) }))
    : controls;
  const fitted = smoothClosed(moved).map((q) => ({ x: (q.x - cx) * sx, y: (q.y - cy) * sy }));
  return { outer: resampleClosed(fitted, spacing), holes: [] };
}
