import { layout } from '../config/layout.config';
import type { Size } from '../rounds/geometry';
import { toStageCoords, type Point } from './stage';

/** screen-content fills the screen viewport, so its size is the screen's. */
export const contentSize: Size = { width: layout.screen.width, height: layout.screen.height };

/**
 * Converts a mouse position (clientX/clientY) to screen-content pixels.
 * Goes through `toStageCoords`, so scaling (and later shake or distortion) is handled there.
 */
export function toContentCoords(clientX: number, clientY: number): Point {
  const stage = toStageCoords(clientX, clientY);
  return { x: stage.x - layout.screen.left, y: stage.y - layout.screen.top };
}
