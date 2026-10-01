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

  /**
   * Counter, progress bar and timer: inside the screen, below the doors, visible all game.
   * Positions are inside the screen viewport.
   */
  screenHud: {
    textSize: 20,
    lineHeight: 24,
    /** "Test 04/12" with its progress bar beside it, `gap` apart. */
    progress: { left: 180, top: 24, gap: 16, barWidth: 160, barHeight: 4 },
    /** Timer, right-aligned. */
    timer: { right: 180, top: 24 },
  },

  /** Round scene, from the Figma "Round" frame. Positions are inside screen-content. */
  round: {
    textSize: 20,
    lineHeight: 24,
    /** "Test #N" at the start of each round; centered, with the objective `gap` below. */
    title: { fontSize: 64, lineHeight: 72, gap: 16 },
    /** Where the objective ends up after the intro. */
    objectiveText: { top: 596 },
    shapeBorder: 2,
    /** Dot left where the player clicked. */
    clickMarkerSize: 8,
    /** The "Sample 0X, logged" tooltip: fixed in the top-right corner of the screen. */
    loggedTooltip: { right: 24, top: 24 },
    /** Debug C (cross) and O (circle) markers. */
    markerSize: 16,
    markerStroke: 2,
  },

  /** The shared tooltip (in-round "logged" sample, "Copied"), placed this far from its point. */
  tooltip: {
    offsetX: 16,
    offsetY: 16,
    fontSize: 12,
    lineHeight: 16,
    paddingX: 8,
    paddingY: 6,
    /** Width limit for tooltips with wrapping text. */
    maxWidth: 280,
  },

  /** Ready, loading, calculating and score scenes (placeholder layouts). */
  scenes: {
    titleSize: 32,
    textSize: 16,
    gap: 24,
    button: { fontSize: 20, paddingX: 40, paddingY: 14, border: 2 },
    loadingBar: { width: 320, height: 4 },
  },

  /** Score scene, from the Figma "Score" frame. Tops are inside screen-content. */
  score: {
    label: { top: 80, fontSize: 16, lineHeight: 24, letterSpacing: 8 },
    total: { top: 185, fontSize: 80, lineHeight: 88 },
    headline: { top: 280, fontSize: 20, lineHeight: 24 },
    line: { top: 312, fontSize: 16, lineHeight: 24, maxWidth: 440 },
    /** Not in the Figma frame: placed under the two-line body. */
    speedTag: { top: 372, fontSize: 14, lineHeight: 20 },
    /** Details, Share result, Play again on one row. Share result's spot is from Figma. */
    links: { top: 572, fontSize: 16, lineHeight: 24, letterSpacing: 8, gap: 56 },
    /** Details table, shown in place of the verdict while open. */
    table: { top: 136, fontSize: 14, rowHeight: 26, cellPaddingX: 20 },
  },
} as const;
