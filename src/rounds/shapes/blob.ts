import { rangeOf } from '../../core/rng';
import type { Point } from '../../core/stage';
import { selfIntersects } from '../polygon';
import { fitToBox, resampleClosed, smoothClosed, type Shape, type ShapeContext } from './shape';

export interface BlobParams {
  /** Bounding box of the finished blob. */
  width: number;
  height: number;
  /** How many control points around the ellipse (inclusive range). */
  minPoints: number;
  maxPoints: number;
  /** Each control point sits at this fraction of the ellipse radius, picked at random (≤ 1). */
  minRadius: number;
  /** How far each point may slide around the ellipse, as a fraction of the even spacing (< 0.5). */
  angleJitter: number;
}

/** Tries with new random points before falling back to a safe, plain shape. */
const MAX_ATTEMPTS = 20;

function controlPoints(p: BlobParams, ctx: ShapeContext, minRadius: number): Point[] {
  const count = Math.floor(rangeOf(ctx.rng, p.minPoints, p.maxPoints + 1));
  const step = (2 * Math.PI) / count;
  return Array.from({ length: count }, (_, i) => {
    const angle = i * step + rangeOf(ctx.rng, -p.angleJitter, p.angleJitter) * step;
    const r = rangeOf(ctx.rng, minRadius, 1);
    return { x: (r * p.width * Math.cos(angle)) / 2, y: (r * p.height * Math.sin(angle)) / 2 };
  });
}

function build(p: BlobParams, ctx: ShapeContext, minRadius: number): Shape {
  const smooth = smoothClosed(controlPoints(p, ctx, minRadius));
  const fitted = fitToBox({ outer: smooth, holes: [] }, p.width, p.height);
  return { outer: resampleClosed(fitted.outer, ctx.spacing), holes: [] };
}

/**
 * A random blob: control points around an ellipse at varied radii, joined by a smooth
 * closed curve, then stretched to exactly width × height. May be concave; never crosses
 * itself (a crossing draw is thrown away and drawn again). Same rng seed → same blob.
 */
export function blobShape(p: BlobParams, ctx: ShapeContext): Shape {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const shape = build(p, ctx, p.minRadius);
    if (!selfIntersects(shape.outer)) return shape;
  }
  // Practically unreachable: radii all close to the ellipse can't cross.
  return build(p, ctx, 1);
}
