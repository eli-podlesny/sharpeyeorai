import { manifest } from '../assets/manifest';

/**
 * Layout in three groups (see CLAUDE.md, "The stage"):
 *  - viewport HUD (logo, version): fixed CSS px, never scaled;
 *  - background: covers the window plus an overscan;
 *  - the unit: frame, shadows, screen, doors, screen content and screen HUD, one box
 *    shaped like the frame art and fitted to the window.
 *
 * Everything inside the unit is in reference px: the frame as drawn in the Figma frame,
 * 772 px tall. Code converts them with `u()` (src/core/units.ts) to container units, so
 * the whole unit scales together. Change values here only.
 */

/** The frame's height in the Figma frame: the reference size of everything in the unit. */
export const UNIT_HEIGHT = 772;
/** The frame art's aspect ratio, read from the image itself (via the generated manifest). */
export const FRAME_ASPECT = manifest.frame.width / manifest.frame.height;
export const UNIT_WIDTH = UNIT_HEIGHT * FRAME_ASPECT;

/** The Figma frame (a 1440 × 900 window): reference for window-sized effects. */
export const REFERENCE_WINDOW_HEIGHT = 900;

export interface Box {
  width: number;
  height: number;
  left: number;
  top: number;
}

/** Edges inset from a box, in percent of that box. */
export interface Insets {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * The screen opening: the see-through middle of the frame art, measured from frame.png at
 * the inner bevel, in percent of the frame image. Its corners are chamfered and the top
 * and bottom middle have notches; the frame art covers those, and the HUD anchors keep
 * clear of them. Check against the art with the debug panel's "layout" toggle.
 */
const OPENING: Insets = { left: 3.643, top: 6.651, right: 3.643, bottom: 6.651 };

/** A box inside a parent, from insets in percent. */
function insetBox(parent: { width: number; height: number }, i: Insets): Box {
  const left = (parent.width * i.left) / 100;
  const top = (parent.height * i.top) / 100;
  return {
    left,
    top,
    width: parent.width - left - (parent.width * i.right) / 100,
    height: parent.height - top - (parent.height * i.bottom) / 100,
  };
}

const UNIT = { width: UNIT_WIDTH, height: UNIT_HEIGHT };

/** The opening in unit px. Game coordinates (screen-content px) start at its top-left. */
const opening = insetBox(UNIT, OPENING);

/** Percent of the opening's width / height, in reference px. */
const pctW = (p: number): number => (opening.width * p) / 100;
const pctH = (p: number): number => (opening.height * p) / 100;

/**
 * The screen surface (base color, texture) and the doors' viewport, from Figma: a little
 * larger than the opening, its edges hidden under the frame. 1070 × 724, 24 px from the
 * frame's top.
 */
const SURFACE_WIDTH = 1070;
const SURFACE_HEIGHT = 724;
const surface: Box = {
  width: SURFACE_WIDTH,
  height: SURFACE_HEIGHT,
  left: (UNIT_WIDTH - SURFACE_WIDTH) / 2,
  top: 24,
};

/**
 * HUD anchors inside the opening, in percent of the opening. From the Figma "hud placement"
 * frame (184:2, see docs/figma/v1.1a-layers.md): the counter and the timer sit in the top
 * band on either side of the top notch, each in a box `progress.width` wide.
 */
const ANCHORS = {
  /** Round counter, with the progress bar filling the rest of its box. */
  progress: { left: 16.52, top: 1.59, width: 27.885 },
  /** Timer: mirrored, right-aligned in its box. */
  timer: { right: 16.52, top: 1.59 },
  /** "Sample 0X, logged" tooltip: its top-right corner, in the opening's top-right corner. */
  loggedTooltip: { right: 6.195, top: 8.166 },
  /**
   * Chat tooltip spot (Figma "hud placement"): its bottom-right corner, in the opening's
   * bottom-right corner. The score screen's "Copied" tooltip shows here.
   */
  chatTooltip: { right: 6.195, bottom: 8.465 },
  /** Objective line: bottom-center, its bottom this far up, clear of the bottom notch. */
  objective: { bottom: 9 },
} as const;

const HUD_TEXT_SIZE = 20;
const HUD_LINE_HEIGHT = 24;

export const layout = {
  /** Group A and C sizing, in CSS px of the window. */
  viewport: {
    /** The unit keeps this much space above and below… */
    unitMarginY: 64,
    /** …and at least this much at the sides. */
    unitMarginX: 24,
    /** Never taller than the frame art's 1× height × 2 (its 2× file), so it never upscales. */
    maxUnitHeight: manifest.frame.height,
    /** Background overscan on each side, as a fraction of the window (parallax room later). */
    bgOverscan: 0.12,
    logo: { top: 24, fontSize: 24, lineHeight: 32 },
    version: { bottom: 32, fontSize: 14, lineHeight: 16 },
  },

  unit: UNIT,

  background: {
    /** The art's size in the Figma frame: breathing amplitudes are in these px. */
    refWidth: 1976,
    refHeight: 1078,
  },

  /**
   * Figma's "vignette overlay": a radial gradient in the 1440 × 900 frame, clear until
   * `clearUntil`, fully dark at the edge. `matrix` and `radius` are its gradient transform.
   */
  vignette: {
    frame: { width: 1440, height: REFERENCE_WINDOW_HEIGHT },
    radius: 10,
    matrix: [72, 45, -72, 115.2, 720, 450],
    clearUntil: 0.32,
  },

  opening,
  surface,

  /** Doors: two images (1086 × 724 each, both centered on the surface); open = slid this far out. */
  doors: { width: 1086, height: 724, openShift: 640 },

  /** "frame as shadow" in Figma: the frame, darkened, blurred, a little lower. */
  frameShadow: { offsetY: 16, blur: 16, brightness: 0.34 },
  /** "frame inner shadow": the frame, nearly black, smaller, a little lower, very soft and faint, over the doors. */
  frameInnerShadow: { scale: 0.925, offsetY: 17.6, blur: 64, brightness: 0.14, opacity: 0.32 },
  /** Screen Color: backdrop blur under the screen base color. */
  screenSurface: { backdropBlur: 8, textureOpacity: 0.32 },

  /**
   * The screen unit (frame, shadows, screen, doors) moves as one piece: the drop after
   * round 9's click. It turns and scales around its center.
   */
  assembly: {
    /**
     * Where it ends up (unit px, degrees): it slides toward the left, turns
     * counter-clockwise and shrinks, so it no longer fits fully in view. `shake` is the
     * landing: `count` wobbles, the first this far off (px, degrees), dying away.
     */
    drop: {
      x: -300,
      /** Moves down at least this far… */
      y: 140,
      /**
       * …and on taller windows further, until its center is this close to the window
       * bottom (unit px; at 1440 × 900 that is the 140 above), so it always lands low.
       */
      centerFromBottom: 310,
      rotateDeg: -8,
      scale: 0.8,
      shake: { x: 3, y: 8, rotateDeg: 0.6, count: 5 },
    },
  },

  /** Alert mode's window-sized glow ellipse (from round 8): a soft blur, in px of a 900 px tall window. */
  alertGlow: {
    blur: 300,
  },

  /**
   * Counter, progress bar and timer: inside the screen, below the doors, visible all game.
   * Positions are inside the opening (screen-content px), from the anchors above.
   */
  screenHud: {
    textSize: HUD_TEXT_SIZE,
    lineHeight: HUD_LINE_HEIGHT,
    /** "Test 04/12" with its progress bar beside it, `gap` apart. */
    progress: {
      left: pctW(ANCHORS.progress.left),
      top: pctH(ANCHORS.progress.top),
      /** The counter and the bar together fill this width; the bar takes what is left. */
      width: pctW(ANCHORS.progress.width),
      gap: 16,
      barHeight: 4,
    },
    /** Timer, right-aligned. */
    timer: { right: pctW(ANCHORS.timer.right), top: pctH(ANCHORS.timer.top) },
    /** The objective line, centered at the bottom; it stays from the objective intro through round 12. */
    objective: { top: opening.height - pctH(ANCHORS.objective.bottom) - HUD_LINE_HEIGHT },
  },

  /** Before round 1: "Objective:" with the objective line below, centered as one group. */
  objectiveIntro: {
    titleFontSize: 64,
    titleLineHeight: 72,
    /** Space between "Objective:" and the objective line. */
    gap: 16,
    /** Both enter from this far below; "Objective:" also zooms in from `titleScale`. */
    rise: 16,
    titleScale: 0.8,
    /** "Objective:" moves down this far as it fades out. */
    titleDrop: 16,
  },

  /** Round scene, from the Figma "Round" frame. Positions are inside screen-content. */
  round: {
    textSize: 20,
    lineHeight: 24,
    /** The shape enters from `rise` px lower at `scale`, and leaves zooming back out to `scale`. */
    shapeEnter: { rise: 32, scale: 0.8 },
    shapeBorder: 4,
    /**
     * The shape outline looks drawn by hand, like the game's line art (an SVG filter on the
     * outline only, src/ui/shapeSvg.ts). `wobble`: a slow waver along the line (noise
     * frequency per content px, push in content px). `grain`: a fine noise that thins and
     * breaks the line like pencil or dry brush (alpha = contrast × noise + offset).
     */
    pencil: {
      wobble: { frequency: 0.045, scale: 3 },
      grain: { frequency: 0.85, contrast: 3.4, offset: -0.75 },
    },
    /** Dot left where the player clicked. */
    clickMarkerSize: 8,
    /** The "Sample 0X, logged" tooltip: fixed in the top-right of the opening (anchor). */
    loggedTooltip: {
      right: pctW(ANCHORS.loggedTooltip.right),
      top: pctH(ANCHORS.loggedTooltip.top),
    },
    /** Debug C (cross), O (circle) and M (square) markers. */
    markerSize: 16,
    markerStroke: 2,
    /** Round 7's large shape keeps this far from the HUD row, the objective line and the screen edges. */
    largeShapeMargin: 40,
    /** Moving shapes (rounds 6 and 8) keep this far from the HUD row, the objective line and the screen edges. */
    motionMargin: 48,
    /** Round 5's decoy dot. */
    decoySize: 2,
    /** Round 12's question mark on the triangle (font size). */
    shapeMarkSize: 44,
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
    /** `nudgeX`: moved right this far, so the number looks centered (optical balance). */
    total: { top: 185, fontSize: 80, lineHeight: 88, nudgeX: 4 },
    /** "Copied" (and "Copy this:") tooltip: at the chat tooltip spot, bottom-right. */
    copiedTooltip: {
      right: pctW(ANCHORS.chatTooltip.right),
      bottom: pctH(ANCHORS.chatTooltip.bottom),
    },
    headline: { top: 280, fontSize: 20, lineHeight: 24 },
    line: { top: 312, fontSize: 16, lineHeight: 24, maxWidth: 440 },
    /** Not in the Figma frame: placed under the two-line body. */
    speedTag: { top: 372, fontSize: 14, lineHeight: 20 },
    /** Details, Share result, Play again on one row. Share result's spot is from Figma. */
    links: { top: 572, fontSize: 16, lineHeight: 24, letterSpacing: 8, gap: 56 },
    /** Details table, shown in place of the verdict while open. */
    table: { top: 136, fontSize: 14, rowHeight: 26, cellPaddingX: 20 },
    /** Debug only: the "Sample data" note under the links, clear of the bottom notch. */
    sampleNote: { top: 604, fontSize: 12, lineHeight: 16 },
  },
} as const;
