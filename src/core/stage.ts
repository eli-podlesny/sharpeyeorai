import { FRAME_ASPECT, layout } from '../config/layout.config';

/**
 * The stage is the window. Three groups size themselves against it (see layout.config.ts):
 * the viewport HUD in fixed px, the background covering it, and the unit — the frame and
 * everything in it — fitted inside with fixed margins. The unit's size is set in CSS
 * (`.unit` in layers.css) from variables written here; `computeUnitRect` is the same
 * formula in TypeScript, so input mapping and tests use exactly what CSS draws.
 */

export interface Point {
  x: number;
  y: number;
}

/** The unit's box in window CSS px, before any transform (the drop). */
export interface UnitRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * The largest frame-shaped box that fits the window with `unitMarginY` above and below and
 * at least `unitMarginX` at the sides, capped at `maxUnitHeight`, centered both ways.
 */
export function computeUnitRect(windowWidth: number, windowHeight: number): UnitRect {
  const { unitMarginX, unitMarginY, maxUnitHeight } = layout.viewport;
  const height = Math.max(
    0,
    Math.min(
      windowHeight - 2 * unitMarginY,
      (windowWidth - 2 * unitMarginX) / FRAME_ASPECT,
      maxUnitHeight,
    ),
  );
  const width = height * FRAME_ASPECT;
  return { left: (windowWidth - width) / 2, top: (windowHeight - height) / 2, width, height };
}

/** CSS px on screen per unit reference px, for a unit drawn `unitHeight` px tall. */
export function unitScale(unitHeight: number): number {
  return unitHeight / layout.unit.height;
}

/** Writes the sizing variables the CSS layout reads (`#app`, see layers.css). */
export function initStage(app: HTMLElement): void {
  const { unitMarginX, unitMarginY, maxUnitHeight, bgOverscan } = layout.viewport;
  app.style.setProperty('--frame-ar', String(FRAME_ASPECT));
  app.style.setProperty('--unit-margin-x', `${unitMarginX}px`);
  app.style.setProperty('--unit-margin-y', `${unitMarginY}px`);
  app.style.setProperty('--unit-max-height', `${maxUnitHeight}px`);
  app.style.setProperty('--bg-overscan', String(bgOverscan));
}
