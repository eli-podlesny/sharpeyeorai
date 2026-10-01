import type { Point } from '../../core/stage';
import { densify, fitToBox, type Shape, type ShapeContext } from './shape';

export interface RhombusParams {
  width: number;
  height: number;
  /**
   * Top, right, bottom and left corners as fractions of the box (−0.5…0.5). Moving them
   * off the axes gives four unequal angles. The result is stretched to width × height.
   */
  corners: readonly [Point, Point, Point, Point];
}

/** A four-cornered, lopsided diamond. */
export function rhombusShape(
  { width, height, corners }: RhombusParams,
  { spacing }: ShapeContext,
): Shape {
  const fitted = fitToBox({ outer: [...corners], holes: [] }, width, height).outer;
  return { outer: densify(fitted, spacing), holes: [] };
}
