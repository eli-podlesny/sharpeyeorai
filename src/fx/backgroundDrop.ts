import { layout } from '../config/layout.config';
import type { Point } from '../core/stage';

/**
 * The room's lurch when the screen drops: the background scales up, turns clockwise and
 * shifts right and up, so its bottom-left part comes into view, while still covering the
 * window. The shift is found per window size, since the cover depends on it.
 */
export interface BackgroundPose {
  /** Window CSS px. */
  x: number;
  y: number;
  rotateDeg: number;
  scale: number;
}

export const BACKGROUND_HOME: BackgroundPose = { x: 0, y: 0, rotateDeg: 0, scale: 1 };

export interface CoverInput {
  /** The window, in CSS px. */
  width: number;
  height: number;
  /** The background as drawn at rest (centered on the window), in CSS px. */
  imageWidth: number;
  imageHeight: number;
  /** Extra room needed on every side (the parallax offsets), in CSS px. */
  pad: Point;
}

/**
 * Pure: the background's drawn box at rest, centered on the window: the layer, the window
 * plus `overscan` on every side. The <img> is at least this big, and the breathing canvas
 * (which replaces it from round 4) is exactly this big, so covering with it is safe for both.
 */
export function backgroundBoxSize(
  width: number,
  height: number,
  overscan: number,
): { width: number; height: number } {
  const cover = 1 + 2 * overscan;
  return { width: cover * width, height: cover * height };
}

const rad = (deg: number): number => (deg * Math.PI) / 180;

/** Pure: a point of the image (from its center, at rest) where the pose draws it. */
function place(p: Point, pose: BackgroundPose): Point {
  const a = rad(pose.rotateDeg);
  const sx = p.x * pose.scale;
  const sy = p.y * pose.scale;
  return {
    x: pose.x + sx * Math.cos(a) - sy * Math.sin(a),
    y: pose.y + sx * Math.sin(a) + sy * Math.cos(a),
  };
}

/** Pure: whether the posed image covers the window and its pad on every side. */
export function coversWindow(pose: BackgroundPose, input: CoverInput): boolean {
  const a = rad(-pose.rotateDeg);
  const halfW = input.width / 2 + input.pad.x;
  const halfH = input.height / 2 + input.pad.y;
  const EPS = 1e-6;
  for (const [cx, cy] of [
    [-halfW, -halfH],
    [halfW, -halfH],
    [halfW, halfH],
    [-halfW, halfH],
  ] as const) {
    // The window corner, back in the image's own (unscaled, unturned) space.
    const dx = cx - pose.x;
    const dy = cy - pose.y;
    const qx = (dx * Math.cos(a) - dy * Math.sin(a)) / pose.scale;
    const qy = (dx * Math.sin(a) + dy * Math.cos(a)) / pose.scale;
    if (Math.abs(qx) > input.imageWidth / 2 + EPS || Math.abs(qy) > input.imageHeight / 2 + EPS) {
      return false;
    }
  }
  return true;
}

const SEARCH_STEPS = 30;

/**
 * Pure: the dropped pose. Scaled and turned as configured, then shifted along the line that
 * brings the background's bottom-left corner to the window's bottom-left corner, as far as the
 * image still covers the window (times `reach`, 0–1).
 */
export function droppedBackgroundPose(
  input: CoverInput,
  drop: { scale: number; rotateDeg: number; reach: number } = layout.background.drop,
): BackgroundPose {
  const turned: BackgroundPose = { x: 0, y: 0, rotateDeg: drop.rotateDeg, scale: drop.scale };
  if (!coversWindow(turned, input)) return turned;
  const corner = place({ x: -input.imageWidth / 2, y: input.imageHeight / 2 }, turned);
  const goal = { x: -input.width / 2 - input.pad.x, y: input.height / 2 + input.pad.y };
  const along = { x: goal.x - corner.x, y: goal.y - corner.y };
  const at = (k: number): BackgroundPose => ({ ...turned, x: along.x * k, y: along.y * k });
  let lo = 0;
  let hi = 1;
  if (coversWindow(at(1), input)) lo = 1;
  else {
    for (let i = 0; i < SEARCH_STEPS; i++) {
      const mid = (lo + hi) / 2;
      if (coversWindow(at(mid), input)) lo = mid;
      else hi = mid;
    }
  }
  return at(lo * Math.min(Math.max(drop.reach, 0), 1));
}

/** As a CSS transform (around the layer center, which is the window center). */
export function backgroundPoseCss(p: BackgroundPose): string {
  return `translate(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px) rotate(${p.rotateDeg}deg) scale(${p.scale})`;
}
