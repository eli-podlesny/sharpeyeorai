import { densify, fitToBox, type Shape, type ShapeContext } from './shape';

export interface StarParams {
  /** Bounding box of the finished star; a box wider than tall stretches it sideways. */
  width: number;
  height: number;
  /** Number of tips. */
  points: number;
  /** Inner corners sit at this fraction of the tip radius (0–1; lower = spikier). */
  innerRatio: number;
  /** Per inner corner (clockwise from the one after the top tip), overriding `innerRatio`. */
  innerRadii?: readonly number[];
}

/**
 * A star with sharp tips, first tip pointing up, stretched to exactly width × height.
 * Inner corners can each sit at their own depth (`innerRadii`) for an irregular star.
 */
export function starShape(p: StarParams, { spacing }: ShapeContext): Shape {
  const corners = Array.from({ length: p.points * 2 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / p.points;
    const r = i % 2 === 0 ? 1 : (p.innerRadii?.[(i - 1) / 2] ?? p.innerRatio);
    return { x: r * Math.cos(angle), y: r * Math.sin(angle) };
  });
  const fitted = fitToBox({ outer: corners, holes: [] }, p.width, p.height).outer;
  return { outer: densify(fitted, spacing), holes: [] };
}
