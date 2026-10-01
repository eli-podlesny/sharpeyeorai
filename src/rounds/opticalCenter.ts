import type { OpticalConfig } from '../config/game.config';
import type { Point } from '../core/stage';
import type { PlacedShape } from './geometry';
import {
  bounds,
  centroid,
  contains,
  materialCentroid,
  poleOfInaccessibility,
  type Polygon,
} from './polygon';

/** The three reference points of a shape, all in screen-content pixels. */
export interface Centers {
  /** Computed center: the area centroid of the material (holes cut out). */
  C: Point;
  /** Pole of inaccessibility of the outline: the point farthest from every outer edge. */
  M: Point;
  /** Optical center: where a person sees the middle. Scoring measures from here. */
  O: Point;
}

/**
 * The optical center model, for any polygon in screen space:
 *
 *   Base = C + skeletonWeight × (M − C)
 *   O    = Base − (biasX × box width, biasY × box height)     box = on-screen bounding box
 *   if O falls outside the shape, O = M
 *
 * The shift uses the screen's axes, so "up" stays up for the player when the shape turns.
 * Pass `pole` when M is already known (rectangles, circles: M = C) to skip the search.
 */
export function opticalCenters(poly: Polygon, settings: OpticalConfig, pole?: Point): Centers {
  const C = centroid(poly);
  const M = pole ?? poleOfInaccessibility(poly);
  const box = bounds(poly);
  const w = settings.skeletonWeight;
  const O = {
    x: C.x + w * (M.x - C.x) - settings.biasX * box.width,
    y: C.y + w * (M.y - C.y) - settings.biasY * box.height,
  };
  return { C, M, O: contains(poly, O) ? O : M };
}

/**
 * C, M and O for a placed shape. O (and M) come from the outline alone, as if the holes
 * were filled, so O may sit inside a hole. C is the centroid of the actual material.
 */
export function shapeCenters(shape: PlacedShape, settings: OpticalConfig): Centers {
  const { M, O } = opticalCenters(shape.outer, settings, shape.pole);
  return { C: materialCentroid(shape.outer, shape.holes), M, O };
}
