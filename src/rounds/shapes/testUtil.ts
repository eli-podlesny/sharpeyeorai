import { createRng } from '../../core/rng';
import type { Point } from '../../core/stage';
import { bounds, type Polygon } from '../polygon';
import type { ShapeContext } from './shape';

/** Test helpers shared by the shape generator tests. */
export const ctx = (seed = 1, spacing = 3): ShapeContext => ({ rng: createRng(seed), spacing });

/** Longest gap between neighbouring points, closing edge included. */
export function maxGap(ring: Polygon): number {
  return Math.max(
    ...ring.map((p, i) => {
      const q = ring[(i + 1) % ring.length] as Point;
      return Math.hypot(q.x - p.x, q.y - p.y);
    }),
  );
}

export function size(ring: Polygon): { width: number; height: number; cx: number; cy: number } {
  const b = bounds(ring);
  return { width: b.width, height: b.height, cx: b.minX + b.width / 2, cy: b.minY + b.height / 2 };
}
