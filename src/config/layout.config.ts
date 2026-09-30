/**
 * Layout values in design pixels (the 1440 × 900 Figma frame).
 * Values are placeholders from Figma and will be tuned — change them here only.
 * Code converts them to rem through `rem()` in src/core/units.ts.
 */

export const DESIGN_WIDTH = 1440;
export const DESIGN_HEIGHT = 900;

/** 1rem equals this many design pixels. At 100% scale, 1rem = 16px on screen. */
export const REM_BASE_PX = 16;

/** The stage stops shrinking once the window is narrower than this (screen px). */
export const MIN_WINDOW_WIDTH = 1024;

export interface Box {
  width: number;
  height: number;
  left: number;
  top: number;
}

/** Left position that centers a box of the given width on the stage. */
const centerX = (width: number): number => (DESIGN_WIDTH - width) / 2;

const FRAME_WIDTH = 1165;
const FRAME_HEIGHT = 841;
const SCREEN_WIDTH = 1032;
const SCREEN_HEIGHT = 682;

export const layout = {
  background: {
    /** Natural size of the background art, used for its aspect ratio. */
    artWidth: 1976,
    artHeight: 1078,
    /** Minimum size relative to the window, so it always bleeds past every edge. */
    minWidthVw: 110,
    minHeightVh: 110,
  },

  frame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    left: centerX(FRAME_WIDTH),
    top: 44,
    /** How far the frame reaches over the screen edges. */
    screenOverlap: 8,
  },

  frameGlow: {
    /** Blur radius of the glow copy behind the frame. */
    blur: 24,
  },

  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    left: centerX(SCREEN_WIDTH),
    top: 106,
  },

  hud: {
    logoTop: 6,
    logoFontSize: 28,
    versionBottom: 4,
    versionFontSize: 12,
  },
} as const;
