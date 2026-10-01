import { ellipsePoints, type Shape, type ShapeContext } from './shape';

export interface CircleParams {
  diameter: number;
}

/** A perfect circle centered on (0, 0). */
export function circleShape({ diameter }: CircleParams, { spacing }: ShapeContext): Shape {
  const r = diameter / 2;
  return { outer: ellipsePoints({ x: 0, y: 0 }, r, r, spacing), holes: [], pole: { x: 0, y: 0 } };
}
