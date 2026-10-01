import { gameConfig } from '../config/game.config';
import type { RoundConfig } from '../config/rounds.config';
import { createRng } from '../core/rng';
import type { Point } from '../core/stage';
import type { Polygon } from './polygon';
import { buildShape, type Shape } from './shapes';

/**
 * Shape geometry. All points are in screen-content pixels (origin top-left of the
 * screen, y pointing down) unless named "local".
 */

export interface Size {
  width: number;
  height: number;
}

/** A round's shape as it sits on the screen: everything here is in screen-content px. */
export interface PlacedShape {
  outer: Polygon;
  holes: Polygon[];
  /** Where the shape's (unrotated) bounding-box center lands; rotation and scale turn around it. */
  anchor: Point;
  rotationDeg: number;
  /** M, when the shape makes it obvious (symmetric shapes). */
  pole?: Point;
}

/** Rotates a point around the origin. Positive degrees turn clockwise on screen, like CSS. */
export function rotate(p: Point, deg: number): Point {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

/** Where a round's shape is centered: the content center plus the round's offset. */
export function shapeAnchor(round: RoundConfig, content: Size): Point {
  return {
    x: content.width / 2 + round.offset.x,
    y: content.height / 2 + round.offset.y,
  };
}

/**
 * One moment of a moving or morphing shape (see motion.ts): how far it has moved from its
 * resting place, how much it has grown or shrunk, and, for morphing shapes, its outline.
 */
export interface ShapeFrame {
  offset: Point;
  scale: number;
  /** The shape in its local space at this moment; leave out to build it from the config. */
  local?: Shape;
}

/**
 * Builds a round's shape and puts it on the screen: scaled, turned by the round's
 * rotation, then moved to its anchor (plus the frame's offset). The only place shape
 * transforms are applied — rendering and scoring both use the result. `seed` feeds
 * shapes that are random (round 2's blob); `frame` is one moment of a moving shape.
 */
export function placeShape(
  round: RoundConfig,
  content: Size,
  seed: number,
  spacing: number = gameConfig.shapePointSpacingPx,
  frame?: ShapeFrame,
): PlacedShape {
  const local = frame?.local ?? buildShape(round.shape, { rng: createRng(seed), spacing });
  const rest = shapeAnchor(round, content);
  const anchor = frame ? { x: rest.x + frame.offset.x, y: rest.y + frame.offset.y } : rest;
  const scale = frame?.scale ?? 1;
  const place = (p: Point): Point => {
    const turned = rotate({ x: p.x * scale, y: p.y * scale }, round.rotationDeg);
    return { x: anchor.x + turned.x, y: anchor.y + turned.y };
  };
  return {
    outer: local.outer.map(place),
    holes: local.holes.map((hole) => hole.map(place)),
    anchor,
    rotationDeg: round.rotationDeg,
    ...(local.pole ? { pole: place(local.pole) } : {}),
  };
}

/**
 * Converts a screen-content point into shape-local coordinates: measured from `origin`,
 * along the shape's own axes (x to its right edge, y to its bottom edge).
 */
export function toShapeLocal(p: Point, origin: Point, rotationDeg: number): Point {
  return rotate({ x: p.x - origin.x, y: p.y - origin.y }, -rotationDeg);
}

/** SVG path data for a placed shape: outline and holes, for `fill-rule="evenodd"`. */
export function shapePath(shape: Pick<PlacedShape, 'outer' | 'holes'>): string {
  const ring = (poly: Polygon): string =>
    poly.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join('') + 'Z';
  return [shape.outer, ...shape.holes].map(ring).join('');
}
