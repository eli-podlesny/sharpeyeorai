import type { RoundMotion } from '../rounds/motion';
import type { ShapeConfig } from '../rounds/shapes';
import type { RoundTimeline } from '../rounds/timeline';
import type { DecoyConfig, HideAfter, InputWindow } from '../rounds/timing';
import type { ChatKey, ObjectiveKey } from './copy';
import { gameConfig, type OpticalConfig } from './game.config';
import { layout } from './layout.config';

export type { ShapeConfig } from '../rounds/shapes';

export type RoundPhase = 1 | 2 | 3 | 4;

/**
 * Effects a round switches on (timings in `gameConfig.fx`):
 * - `glitchSlow` / `glitchFast`: a short screen glitch every 4s (rounds 7–8) / every 2s (round 9).
 * - `glitchConstant`: the screen glitches without pause (rounds 10–11).
 * - `dropOnClick`: the screen assembly drops, with a shake as it lands, right after the
 *   click (round 9).
 * - `stayDropped`: the screen stays dropped (rounds 10–12). It goes home at the end of the
 *   game, in the dark (or at once when a debug jump lands on a round without either tag).
 * - `closingDoors`: doors close and the scene goes black over the time limit (round 11).
 * - `stayDark`: the scene stays black; only the round's own content shows; the doors close
 *   over the idle time (round 12).
 */
export type RoundEffect =
  | 'glitchSlow'
  | 'glitchFast'
  | 'glitchConstant'
  | 'dropOnClick'
  | 'stayDropped'
  | 'closingDoors'
  | 'stayDark';

/** Shape fill color: the default graphite, or the light logo color (round 12). Colors are tokens. */
export type ShapeFill = 'default' | 'light';

export type RoundConfig = {
  id: number; // 1–12
  phase: RoundPhase;
  shape: ShapeConfig;
  /** Where the shape's bounding-box center sits, from the screen-content center, design px. */
  offset: { x: number; y: number };
  /** Clockwise, in degrees, around the shape's bounding-box center. */
  rotationDeg: number;
  fill: ShapeFill;
  /** Per-round overrides of `gameConfig.optical`; leave out to use the global default. */
  optical?: Partial<OpticalConfig>;
  /** Accuracy reaches 0 this far from O (px). Leave out for half the on-screen box's shorter side. */
  falloffRadius?: number;
  timeWeight: number; // 0–1
  /** No click this long after `round.shape.visible` → timeout (scores 0, the game continues). */
  timeLimitMs: number | null;
  /** Clicks count only inside these ranges (ms from `round.shape.visible`). Leave out to accept any time. */
  inputWindows?: readonly InputWindow[];
  /** Set → the round runs a fixed length: after the last input window, input is ignored this long, then the round ends. */
  postRoundIdleMs?: number;
  /** How the shape moves or morphs from `round.shape.visible` on (src/rounds/motion.ts), combined in order. It freezes on the click. */
  motions?: readonly RoundMotion[];
  /** The shape is only visible for a while (round 12). */
  hideAfter?: HideAfter;
  /** A fixed-length round that still ends right after a click (round 12: no wait for the idle time). */
  clickEndsRound?: boolean;
  /** A blinking dot on C (or O) right after the shape is visible (round 5). */
  decoy?: DecoyConfig;
  /** The objective line shows during this round (round 12 hides it). */
  showObjective: boolean;
  /** Click marker and "Sample 0X, logged" tooltip after the click (round 12 shows neither). */
  clickFeedback: boolean;
  /** Scene effects tied to this round (src/fx/sceneController.ts); the scene mode comes from `gameConfig.fx.modeByRound`. */
  effects: readonly RoundEffect[];
  /**
   * A chat message when the round starts (rounds 10 and 12), at the chat spot. In a round
   * above the darkness it shows lit, with the round's content.
   */
  startMessage?: { copyKey: ChatKey; variant: 'light' | 'orange'; durationMs: number };
  /** The shape starts fading in this long after the round starts (round 12: time to read its message). */
  shapeDelayMs?: number;
  /** A dark question mark on the shape, at its centroid C, in the logo font (round 12). */
  shapeMark?: boolean;
  /** The round renders above the scene darkness, fully lit (round 12's triangle). */
  aboveDarkness: boolean;
  copyKey: ObjectiveKey;
  /** Hooks into the round sequence (moving shapes, glitches…). Empty for now. */
  timeline?: RoundTimeline;
};

const DEFAULT_TIME_WEIGHT = 0.2;

/** Shape placement from the Figma "Round" frame: 8px above the screen center. */
const DEFAULT_OFFSET = { x: 0, y: -8 };

/** The default shape, for any round that does not set its own. */
const DEFAULT_SHAPE: ShapeConfig = { type: 'rect', width: 200, height: 200 };

/** The falloff radius of the old 200 × 200 square, kept for the rounds whose shape is much bigger. */
const REFERENCE_FALLOFF_PX = 100;

/** Rounds 1–3 phase 1, 4–7 phase 2, 8–11 phase 3, 12 phase 4. */
export function phaseForRound(id: number): RoundPhase {
  if (id <= 3) return 1;
  if (id <= 7) return 2;
  if (id <= 11) return 3;
  return 4;
}

/**
 * The free part of the screen (screen-content px): inside the screen edges, below the
 * HUD row and above the objective line, keeping `margin` from each.
 */
export function freeScreenArea(margin: number = layout.round.largeShapeMargin): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const { opening, screenHud } = layout;
  const hudBottom = Math.max(screenHud.progress.top, screenHud.timer.top) + screenHud.lineHeight;
  const top = hudBottom + margin;
  const bottom = screenHud.objective.top - margin;
  return { left: margin, top, width: opening.width - 2 * margin, height: bottom - top };
}

/** Round 7's rectangle turns this far clockwise. */
const LARGE_RECT_ROTATION_DEG = 10;
/** Round 7's rectangle leans back and forth by up to this much, slowly. */
const LARGE_RECT_SKEW: Extract<RoundMotion, { type: 'skew' }> = {
  type: 'skew',
  periodMs: 8000,
  maxDeg: 6,
};

/**
 * The biggest rectangle that, turned by `deg`, has exactly `width` × `height` as its
 * on-screen bounding box. Solves w·cos + h·sin = width and w·sin + h·cos = height.
 */
export function rectForRotatedBox(
  width: number,
  height: number,
  deg: number,
): { width: number; height: number } {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const det = cos * cos - sin * sin;
  return {
    width: (width * cos - height * sin) / det,
    height: (height * cos - width * sin) / det,
  };
}

/**
 * The on-screen box of a width × height rectangle, skewed by `skewDeg` (along its own
 * axes), then turned by `deg`.
 */
export function skewedRotatedBox(
  width: number,
  height: number,
  deg: number,
  skewDeg: number,
): { width: number; height: number } {
  const rad = (deg * Math.PI) / 180;
  const shear = Math.tan((skewDeg * Math.PI) / 180);
  const corners = [-1, 1].flatMap((sx) =>
    [-1, 1].map((sy) => {
      const y = (sy * height) / 2;
      const x = (sx * width) / 2 - shear * y;
      return { x: x * Math.cos(rad) - y * Math.sin(rad), y: x * Math.sin(rad) + y * Math.cos(rad) };
    }),
  );
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

/**
 * Round 7: a rectangle turned clockwise and leaning back and forth, as big as it can be
 * while its box at the strongest lean (either way) still fits the free area.
 */
function largeRect(): Pick<RoundConfig, 'shape' | 'offset' | 'rotationDeg' | 'motions'> {
  const area = freeScreenArea();
  const base = rectForRotatedBox(area.width, area.height, LARGE_RECT_ROTATION_DEG);
  const fit = Math.min(
    ...[-1, 1].map((sign) => {
      const box = skewedRotatedBox(
        base.width,
        base.height,
        LARGE_RECT_ROTATION_DEG,
        sign * LARGE_RECT_SKEW.maxDeg,
      );
      return Math.min(area.width / box.width, area.height / box.height);
    }),
  );
  return {
    shape: { type: 'rect', width: base.width * fit, height: base.height * fit },
    rotationDeg: LARGE_RECT_ROTATION_DEG,
    motions: [LARGE_RECT_SKEW],
    offset: {
      x: area.left + area.width / 2 - layout.opening.width / 2,
      y: area.top + area.height / 2 - layout.opening.height / 2,
    },
  };
}

/** Morphing rounds: the outline drifts by up to 3% of the shape's size, on a slow cycle of about 5s. */
const MORPH: RoundMotion = { type: 'morph', amplitude: 0.03, cycleMs: 5000 };

/** Round 12's last breaths, first rise to last fall (`fx.lastBreath`; breathDurationMs in schedule.ts). */
function lastBreathsMs(): number {
  const { riseMs, holdMs, fallMs, count, gapMs } = gameConfig.fx.lastBreath;
  return count * (riseMs + holdMs + fallMs) + (count - 1) * gapMs;
}

/** Round 11's square shrinks from this size… */
const SHRINK_FROM_PX = 200;
/** …to this size, over this long; the round times out at the same moment. */
const SHRINK_TO_PX = 40;
const SHRINK_MS = 8000;

/** What makes each round different. Rounds not listed keep the default square. */
const ROUND_SHAPES: Record<number, Partial<RoundConfig>> = {
  1: { shape: { type: 'rect', width: 360, height: 360 }, falloffRadius: REFERENCE_FALLOFF_PX },
  2: {
    // Seeded per game: same seed, same blob (see shapeSeed in src/rounds/session.ts).
    shape: {
      type: 'blob',
      width: 300,
      height: 440,
      minPoints: 8,
      maxPoints: 10,
      minRadius: 0.6,
      angleJitter: 0.25,
    },
    // In the left part of the screen.
    offset: { x: -240, y: DEFAULT_OFFSET.y },
  },
  3: {
    shape: {
      type: 'avocado',
      width: 280,
      height: 380,
      pitFraction: 0.35,
      pitAspect: 1.3,
      pitRotationDeg: 20,
      pitOffsetX: -0.08,
      pitCenterY: 0.2,
    },
    // Half its width to the right.
    offset: { x: 140, y: DEFAULT_OFFSET.y },
  },
  4: {
    // A bean: rounded ends, a dent in the middle of the top edge. Gently morphs.
    shape: {
      type: 'curve',
      width: 360,
      height: 220,
      controls: [
        { x: -0.95, y: -0.15 },
        { x: -0.72, y: -0.78 },
        { x: -0.28, y: -0.9 },
        { x: 0.04, y: -0.55 },
        { x: 0.36, y: -0.88 },
        { x: 0.8, y: -0.7 },
        { x: 1, y: -0.05 },
        { x: 0.76, y: 0.66 },
        { x: 0.2, y: 0.92 },
        { x: -0.45, y: 0.86 },
        { x: -0.9, y: 0.48 },
      ],
    },
    motions: [MORPH],
    // A bit left and down.
    offset: { x: -100, y: 40 },
  },
  5: {
    // A soft triangle, apex up and a little right, heavier bottom left. Morphs like round 4
    // while slowly bobbing up and down, with a decoy dot blinking twice, slowly (under 3 Hz), on C.
    shape: {
      type: 'curve',
      width: 320,
      height: 280,
      controls: [
        { x: 0.12, y: -1 },
        { x: 0.42, y: -0.42 },
        { x: 0.95, y: 0.55 },
        { x: 0.62, y: 0.95 },
        { x: -0.15, y: 0.85 },
        { x: -0.85, y: 0.92 },
        { x: -0.98, y: 0.5 },
        { x: -0.42, y: -0.38 },
      ],
    },
    motions: [MORPH, { type: 'bob', periodMs: 4000, ampY: 12 }],
    decoy: { target: 'computed', blinks: 2, onMs: 400, offMs: 400 },
  },
  6: {
    // An oval swaying left and right on a figure-eight, never leaving the free area.
    shape: { type: 'ellipse', width: 240, height: 150 },
    motions: [
      { type: 'wave', periodMs: 9000, ampY: 40, phaseDeg: 0, margin: layout.round.motionMargin },
    ],
  },
  // A short screen glitch every 4s.
  7: { ...largeRect(), falloffRadius: REFERENCE_FALLOFF_PX, effects: ['glitchSlow'] },
  8: {
    // An irregular seven-point star that jumps somewhere new every 1.2s.
    shape: {
      type: 'star',
      width: 300,
      height: 300,
      points: 7,
      innerRatio: 0.5,
      innerRadii: [0.46, 0.62, 0.38, 0.56, 0.42, 0.66, 0.5],
    },
    motions: [{ type: 'jump', everyMs: 1200, margin: layout.round.motionMargin }],
    effects: ['glitchSlow'],
  },
  9: {
    // A big circle with a medium and a small one bulging out of its upper right, merged into
    // one lopsided outline. All three must overlap in one spot (see circleCluster.ts).
    shape: {
      type: 'circleCluster',
      circles: [
        { x: 0, y: 0, r: 150 },
        { x: 175, y: -55, r: 85 },
        { x: 118, y: -118, r: 50 },
      ],
    },
    // Each circle drifts and swells a little, so the merged outline slowly morphs.
    motions: [MORPH],
    // A short screen glitch every 2s. Right after the click, the screen drops.
    effects: ['glitchFast', 'dropOnClick'],
  },
  10: {
    // A five-point star, stretched sideways.
    shape: { type: 'star', width: 380, height: 240, points: 5, innerRatio: 0.6 },
    rotationDeg: 14,
    offset: { x: -120, y: DEFAULT_OFFSET.y },
    // One full turn, clockwise, every 20s.
    motions: [{ type: 'spin', periodMs: 20000 }],
    // The screen is still dropped and glitches without pause.
    effects: ['stayDropped', 'glitchConstant'],
    startMessage: { copyKey: 'hurryUp', variant: 'orange', durationMs: 2500 },
  },
  11: {
    // Shrinks; the falloff follows the current size, so late clicks are judged more strictly.
    shape: { type: 'rect', width: SHRINK_FROM_PX, height: SHRINK_FROM_PX },
    motions: [{ type: 'shrink', endScale: SHRINK_TO_PX / SHRINK_FROM_PX, durationMs: SHRINK_MS }],
    timeLimitMs: SHRINK_MS,
    // Still dropped and glitching; the doors close and the scene goes black over the same 8s.
    effects: ['stayDropped', 'glitchConstant', 'closingDoors'],
  },
  12: {
    // An even triangle, shown for 1s (fading over the last 200ms). Clicks count for 4s; a
    // click ends the round at once. The last breath (`fx.lastBreath`, a little light over the
    // broken scene, doors shut) comes 1s after the click, or when the 4s for clicks are over;
    // with no click the round ends with it (its idle time is the breath). Then 4s of black
    // and the lights return on the score (src/scenes/ending.ts).
    // No objective line, no click marker, no tooltip: just the triangle, in the top-right area
    // of the screen (below the timer, inside the free area).
    shape: { type: 'triangle', side: 120 },
    offset: { x: 300, y: -180 },
    fill: 'light',
    hideAfter: { visibleMs: 1000, fadeMs: 200 },
    inputWindows: [[0, 4000]],
    postRoundIdleMs: lastBreathsMs(),
    clickEndsRound: true,
    showObjective: false,
    clickFeedback: false,
    // The scene stays black; only the triangle shows, lit, on the dropped screen. The doors
    // close over the idle time.
    aboveDarkness: true,
    shapeMark: true,
    effects: ['stayDropped', 'stayDark'],
    // "Last chance..." first, lit in the black; the triangle comes once it has been read.
    startMessage: { copyKey: 'lastChance', variant: 'light', durationMs: 2000 },
    shapeDelayMs: 2000,
  },
};

const ROUND_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Round 1 ignores time. */
export const rounds: readonly RoundConfig[] = ROUND_IDS.map((id) => ({
  id,
  phase: phaseForRound(id),
  shape: { ...DEFAULT_SHAPE },
  offset: { ...DEFAULT_OFFSET },
  rotationDeg: 0,
  fill: 'default',
  timeWeight: id === 1 ? 0 : DEFAULT_TIME_WEIGHT,
  timeLimitMs: null,
  showObjective: true,
  clickFeedback: true,
  effects: [],
  aboveDarkness: false,
  copyKey: 'objective.shape',
  ...ROUND_SHAPES[id],
}));

/** The optical settings a round actually uses: global defaults plus its own overrides. */
export function opticalSettings(round: RoundConfig): OpticalConfig {
  return { ...gameConfig.optical, ...round.optical };
}

/** Looks up a round by its 1-based id. */
export function getRound(id: number): RoundConfig {
  const round = rounds.find((r) => r.id === id);
  if (!round) throw new Error(`No round with id ${id}`);
  return round;
}
