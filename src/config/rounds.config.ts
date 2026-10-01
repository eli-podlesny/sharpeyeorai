import type { RoundMotion } from '../rounds/motion';
import type { ShapeConfig } from '../rounds/shapes';
import type { RoundTimeline } from '../rounds/timeline';
import type { DecoyConfig, HideAfter, InputWindow } from '../rounds/timing';
import type { ObjectiveKey } from './copy';
import { gameConfig, type OpticalConfig } from './game.config';
import { layout } from './layout.config';

export type { ShapeConfig } from '../rounds/shapes';

export type RoundPhase = 1 | 2 | 3 | 4;

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
  /** How the shape moves or morphs from `round.shape.visible` on (src/rounds/motion.ts). It freezes on the click. */
  motion?: RoundMotion;
  /** The shape is only visible for a while (round 12). */
  hideAfter?: HideAfter;
  /** A blinking dot on C (or O) right after the shape is visible (round 5). */
  decoy?: DecoyConfig;
  /** The objective line shows during this round (round 12 hides it). */
  showObjective: boolean;
  /** Click marker and "Sample 0X, logged" tooltip after the click (round 12 shows neither). */
  clickFeedback: boolean;
  effects: string[]; // effect ids, empty for now
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
  const { screen, screenHud } = layout;
  const hudBottom = Math.max(screenHud.progress.top, screenHud.timer.top) + screenHud.lineHeight;
  const top = hudBottom + margin;
  const bottom = screenHud.objective.top - margin;
  return { left: margin, top, width: screen.width - 2 * margin, height: bottom - top };
}

/** Round 7's rectangle turns this far clockwise. */
const LARGE_RECT_ROTATION_DEG = 10;

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

/** Round 7: a rectangle turned clockwise, as big as it can be while it fills the free area. */
function largeRect(): Pick<RoundConfig, 'shape' | 'offset' | 'rotationDeg'> {
  const area = freeScreenArea();
  return {
    shape: { type: 'rect', ...rectForRotatedBox(area.width, area.height, LARGE_RECT_ROTATION_DEG) },
    rotationDeg: LARGE_RECT_ROTATION_DEG,
    offset: {
      x: area.left + area.width / 2 - layout.screen.width / 2,
      y: area.top + area.height / 2 - layout.screen.height / 2,
    },
  };
}

/** Morphing rounds: control points drift by up to 5% of the shape's size, on a cycle of about 3s. */
const MORPH: RoundMotion = { type: 'morph', amplitude: 0.05, cycleMs: 3000 };

/** Round 11's square shrinks from this size… */
const SHRINK_FROM_PX = 200;
/** …to this size, over this long; the round times out at the same moment. */
const SHRINK_TO_PX = 40;
const SHRINK_MS = 10000;

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
    motion: MORPH,
  },
  5: {
    // A soft triangle, apex up and a little right, heavier bottom left. Morphs like round 4,
    // with a decoy dot blinking twice, slowly (under 3 Hz), on C.
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
    motion: MORPH,
    decoy: { target: 'computed', blinks: 2, onMs: 400, offMs: 400 },
  },
  6: {
    // An oval swaying left and right on a figure-eight, never leaving the free area.
    shape: { type: 'ellipse', width: 240, height: 150 },
    motion: {
      type: 'wave',
      periodMs: 6000,
      ampY: 40,
      phaseDeg: 0,
      margin: layout.round.motionMargin,
    },
  },
  7: { ...largeRect(), falloffRadius: REFERENCE_FALLOFF_PX },
  8: {
    // An irregular seven-point star that jumps somewhere new every second.
    shape: {
      type: 'star',
      width: 300,
      height: 300,
      points: 7,
      innerRatio: 0.5,
      innerRadii: [0.46, 0.62, 0.38, 0.56, 0.42, 0.66, 0.5],
    },
    motion: { type: 'jump', everyMs: 1000, margin: layout.round.motionMargin },
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
  },
  10: {
    // A five-point star, stretched sideways.
    shape: { type: 'star', width: 380, height: 240, points: 5, innerRatio: 0.6 },
    rotationDeg: 14,
    offset: { x: -120, y: DEFAULT_OFFSET.y },
  },
  11: {
    // Shrinks; the falloff follows the current size, so late clicks are judged more strictly.
    shape: { type: 'rect', width: SHRINK_FROM_PX, height: SHRINK_FROM_PX },
    motion: { type: 'shrink', endScale: SHRINK_TO_PX / SHRINK_FROM_PX, durationMs: SHRINK_MS },
    timeLimitMs: SHRINK_MS,
  },
  12: {
    // Shown for 1s (fading over the last 200ms). Clicks count for 5s, then 4s of ignored
    // input, click or not. No objective line, no click marker, no tooltip: just the smile.
    shape: { type: 'smiley', diameter: 100 },
    fill: 'light',
    hideAfter: { visibleMs: 1000, fadeMs: 200 },
    inputWindows: [[0, 5000]],
    postRoundIdleMs: 4000,
    showObjective: false,
    clickFeedback: false,
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
