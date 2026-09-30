import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  MIN_WINDOW_WIDTH,
  REM_BASE_PX,
} from '../config/layout.config';

/**
 * The stage is the 1440 × 900 design area. It scales to fit the window (contain)
 * by changing the root font size: every stage size is in rem, so one number scales it all.
 */

export interface Point {
  x: number;
  y: number;
}

/** The on-screen rectangle of the stage element (as from getBoundingClientRect). */
export interface StageRect {
  left: number;
  top: number;
  width: number;
}

/** Scale that fits the design into the window, never below the minimum window width. */
export function computeScale(windowWidth: number, windowHeight: number): number {
  const fit = Math.min(windowWidth / DESIGN_WIDTH, windowHeight / DESIGN_HEIGHT);
  const minScale = MIN_WINDOW_WIDTH / DESIGN_WIDTH;
  return Math.max(fit, minScale);
}

/** Pure conversion from screen coordinates to design pixels, given where the stage is. */
export function clientToStage(clientX: number, clientY: number, rect: StageRect): Point {
  const scale = rect.width / DESIGN_WIDTH;
  return {
    x: (clientX - rect.left) / scale,
    y: (clientY - rect.top) / scale,
  };
}

let stageEl: HTMLElement | null = null;
let currentScale = 1;

/**
 * Converts a mouse position (clientX/clientY) to stage design pixels.
 * All input must go through here, so scaling — and later shake or distortion — lives in one place.
 */
export function toStageCoords(clientX: number, clientY: number): Point {
  if (!stageEl) throw new Error('Stage not initialised: call initStage() first.');
  return clientToStage(clientX, clientY, stageEl.getBoundingClientRect());
}

export function getScale(): number {
  return currentScale;
}

function applyScale(): void {
  currentScale = computeScale(window.innerWidth, window.innerHeight);
  document.documentElement.style.fontSize = `${REM_BASE_PX * currentScale}px`;
}

/** Sets up scaling for the given stage element and keeps it updated on resize. */
export function initStage(el: HTMLElement): void {
  stageEl = el;
  applyScale();
  window.addEventListener('resize', applyScale);
}
