import { densify, fitToBox, type Shape, type ShapeContext } from './shape';

export interface StarParams {
  /** Bounding box of the finished star; a box wider than tall stretches it sideways. */
  width: number;
  height: number;
  /** Number of tips. */
  points: number;
  /** Inner corners sit at this fraction of the tip radius (0–1; lower = spikier). */
  innerRatio: number;
}

/** A star with sharp tips, first tip pointing up, stretched to exactly width × height. */
export function starShape(p: StarParams, { spacing }: ShapeContext): Shape {
  const corners = Array.from({ length: p.points * 2 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / p.points;
    const r = i % 2 === 0 ? 1 : p.innerRatio;
    return { x: r * Math.cos(angle), y: r * Math.sin(angle) };
  });
  const fitted = fitToBox({ outer: corners, holes: [] }, p.width, p.height).outer;
  return { outer: densify(fitted, spacing), holes: [] };
}
