import { layout } from '../config/layout.config';
import type { Size } from '../rounds/geometry';
import { IDENTITY, parseCssTransform, untransformPoint, type Affine } from './affine';
import { computeUnitRect, unitScale, type Point, type UnitRect } from './stage';

/** Game coordinates (screen-content px) cover the screen opening. */
export const contentSize: Size = { width: layout.opening.width, height: layout.opening.height };

let unitEl: HTMLElement | null = null;

/** The unit that holds frame, shadows, screen and doors, and moves as one (the drop). */
export function registerUnit(el: HTMLElement): void {
  unitEl = el;
}

/** The unit's transform as drawn right now (mid-animation included), in unit px. */
export function unitMatrix(rect: UnitRect): Affine {
  if (!unitEl) return IDENTITY;
  return parseCssTransform(getComputedStyle(unitEl).transform, unitScale(rect.height));
}

/**
 * Pure: a window point (client px) to screen-content px. `rect` is the unit's box before
 * any transform, `m` its transform (in unit px, around its center, the transform-origin).
 * Undoes the scale to reference px, then the transform, then moves to the opening's corner.
 */
export function contentFromClient(client: Point, rect: UnitRect, m: Affine): Point {
  const s = unitScale(rect.height);
  const fromCenter = {
    x: (client.x - (rect.left + rect.width / 2)) / s,
    y: (client.y - (rect.top + rect.height / 2)) / s,
  };
  const local = untransformPoint(fromCenter, m, { x: 0, y: 0 });
  const { unit, opening } = layout;
  return {
    x: local.x + unit.width / 2 - opening.left,
    y: local.y + unit.height / 2 - opening.top,
  };
}

/**
 * Converts a mouse position (clientX/clientY) to screen-content pixels. The one way in:
 * window → inverse of the unit's real transform (the drop, mid-animation included) →
 * opening-local reference px. Exact under rotation, unlike bounding rectangles.
 */
export function toContentCoords(clientX: number, clientY: number): Point {
  const rect = computeUnitRect(window.innerWidth, window.innerHeight);
  return contentFromClient({ x: clientX, y: clientY }, rect, unitMatrix(rect));
}
