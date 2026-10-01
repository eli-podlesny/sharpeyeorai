import { ellipsePoints, type Shape, type ShapeContext } from './shape';

export interface EllipseParams {
  width: number;
  height: number;
}

/** An oval centered on (0, 0), width × height. */
export function ellipseShape({ width, height }: EllipseParams, { spacing }: ShapeContext): Shape {
  return {
    outer: ellipsePoints({ x: 0, y: 0 }, width / 2, height / 2, spacing),
    holes: [],
    pole: { x: 0, y: 0 },
  };
}
