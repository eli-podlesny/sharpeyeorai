import { densify, type Shape, type ShapeContext } from './shape';

export interface TriangleParams {
  /** Length of each of the three equal sides. */
  side: number;
}

/** An even (equilateral) triangle, point up, centered on its bounding box. */
export function triangleShape({ side }: TriangleParams, { spacing }: ShapeContext): Shape {
  const height = (side * Math.sqrt(3)) / 2;
  const corners = [
    { x: 0, y: -height / 2 },
    { x: side / 2, y: height / 2 },
    { x: -side / 2, y: height / 2 },
  ];
  return { outer: densify(corners, spacing), holes: [] };
}
