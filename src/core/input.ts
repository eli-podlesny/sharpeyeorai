import { layout } from '../config/layout.config';
import type { Size } from '../rounds/geometry';
import { IDENTITY, parseCssTransform, untransformPoint, type Affine } from './affine';
import { getScale, toStageCoords, type Point } from './stage';

/** screen-content fills the screen viewport, so its size is the screen's. */
export const contentSize: Size = { width: layout.screen.width, height: layout.screen.height };

let assemblyEl: HTMLElement | null = null;

/** The element that moves frame, glow, screen and doors together (round 10's drop). */
export function registerAssembly(el: HTMLElement): void {
  assemblyEl = el;
}

/** The assembly's transform as drawn right now (mid-animation included), in design px. */
export function assemblyMatrix(): Affine {
  if (!assemblyEl) return IDENTITY;
  return parseCssTransform(getComputedStyle(assemblyEl).transform, getScale());
}

/**
 * Pure: a stage point to screen-content pixels, undoing the assembly transform `m`
 * (applied around `layout.assembly.origin`).
 */
export function contentFromStage(stage: Point, m: Affine): Point {
  const local = untransformPoint(stage, m, layout.assembly.origin);
  return { x: local.x - layout.screen.left, y: local.y - layout.screen.top };
}

/**
 * Converts a mouse position (clientX/clientY) to screen-content pixels.
 * Goes through `toStageCoords` (scaling) and then undoes the assembly's real transform
 * (round 10's drop), so clicks land right even on a turned, shrunken screen.
 */
export function toContentCoords(clientX: number, clientY: number): Point {
  return contentFromStage(toStageCoords(clientX, clientY), assemblyMatrix());
}
