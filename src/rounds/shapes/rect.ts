import { densify, type Shape, type ShapeContext } from './shape';

export interface RectParams {
  width: number;
  height: number;
}

/** A rectangle centered on (0, 0), with sharp corners and points along its edges. */
export function rectShape({ width, height }: RectParams, { spacing }: ShapeContext): Shape {
  const w = width / 2;
  const h = height / 2;
  const corners = [
    { x: -w, y: -h },
    { x: w, y: -h },
    { x: w, y: h },
    { x: -w, y: h },
  ];
  return { outer: densify(corners, spacing), holes: [], pole: { x: 0, y: 0 } };
}
