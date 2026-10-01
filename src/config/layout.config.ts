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

const FRAME_WIDTH = 1158;
const FRAME_HEIGHT = 772;
const SCREEN_WIDTH = 1046;
const SCREEN_HEIGHT = 676;

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
    top: 80,
    /** How far the frame reaches over the screen edges. */
    screenOverlap: 8,
  },

  frameGlow: {
    /** Blur radius of the glow copy behind the frame. */
    blur: 32,
  },

  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    left: centerX(SCREEN_WIDTH),
    top: 128,
  },

  hud: {
    logoTop: 24,
    logoFontSize: 24,
    versionBottom: 16,
    versionFontSize: 14,
  },

  /** Round scene, from the Figma "Round" frame. Positions are inside screen-content. */
  round: {
    textSize: 20,
    lineHeight: 24,
    /** "Test 04/12" and its progress bar, as one group. */
    progress: { left: 180, top: 24, barOffsetX: 115, barOffsetY: 14, barWidth: 160, barHeight: 4 },
    /** Live timer, right-aligned. */
    timer: { right: 180, top: 24 },
    objectiveLabel: { top: 568, fontSize: 16, letterSpacing: 8 },
    objectiveText: { top: 596 },
    shapeBorder: 2,
    /** "Sample 0X, logged" tooltip, placed this far from the click. */
    tooltip: { offsetX: 16, offsetY: 16, fontSize: 12, lineHeight: 16, paddingX: 8, paddingY: 6 },
    /** Debug C (cross) and O (circle) markers. */
    markerSize: 16,
    markerStroke: 2,
  },

  /** Ready, loading, calculating and score scenes (placeholder layouts). */
  scenes: {
    titleSize: 32,
    textSize: 16,
    gap: 24,
    button: { fontSize: 20, paddingX: 40, paddingY: 14, border: 2 },
    loadingBar: { width: 320, height: 4 },
    table: { fontSize: 14, rowHeight: 26, cellPaddingX: 16 },
  },
} as const;
