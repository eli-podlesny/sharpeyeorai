import type { OpticalConfig } from '../config/game.config';
import { opticalSettings, type RoundConfig } from '../config/rounds.config';
import type { Point } from '../core/stage';
import { computedCenter, shapePolygon, type Size } from './geometry';
import { bounds, centroid, contains, poleOfInaccessibility, type Polygon } from './polygon';

/** The three reference points of a shape, all in screen-content pixels. */
export interface Centers {
  /** Computed center: the area centroid. */
  C: Point;
  /** Pole of inaccessibility: the point farthest from every edge. */
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
 * Pass `pole` when M is already known (rectangles: M = C) to skip the search.
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

/** C, M and O for a round's shape as placed on the screen. */
export function roundCenters(round: RoundConfig, content: Size): Centers {
  const poly = shapePolygon(round, content);
  // Rectangles are symmetric, so the farthest-from-edges point is their middle.
  const pole = round.shape.type === 'rect' ? computedCenter(round, content) : undefined;
  return opticalCenters(poly, opticalSettings(round), pole);
}
