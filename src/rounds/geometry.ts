import type { RoundConfig } from '../config/rounds.config';
import type { Point } from '../core/stage';
import type { Polygon } from './polygon';

/**
 * Shape geometry. All points are in screen-content pixels (origin top-left of the
 * screen, y pointing down) unless named "local".
 */

export interface Size {
  width: number;
  height: number;
}

/** Rotates a point around the origin. Positive degrees turn clockwise on screen, like CSS. */
export function rotate(p: Point, deg: number): Point {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

/**
 * C, the computed center: the centroid of the shape. For a rectangle that is its middle,
 * which sits at the content center plus the round's offset (rotation turns around it).
 */
export function computedCenter(round: RoundConfig, content: Size): Point {
  return {
    x: content.width / 2 + round.offset.x,
    y: content.height / 2 + round.offset.y,
  };
}

/** The shape's outline in screen-content pixels, with its rotation applied. */
export function shapePolygon(round: RoundConfig, content: Size): Polygon {
  const c = computedCenter(round, content);
  const { width, height, rotationDeg } = round.shape;
  const corners: Point[] = [
    { x: -width / 2, y: -height / 2 },
    { x: width / 2, y: -height / 2 },
    { x: width / 2, y: height / 2 },
    { x: -width / 2, y: height / 2 },
  ];
  return corners.map((p) => {
    const turned = rotate(p, rotationDeg);
    return { x: c.x + turned.x, y: c.y + turned.y };
  });
}

/**
 * Converts a screen-content point into shape-local coordinates: measured from C,
 * along the shape's own axes (x to its right edge, y to its bottom edge).
 */
export function toShapeLocal(p: Point, round: RoundConfig, content: Size): Point {
  const c = computedCenter(round, content);
  return rotate({ x: p.x - c.x, y: p.y - c.y }, -round.shape.rotationDeg);
}
