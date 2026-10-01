import type { ShapeConfig } from '../rounds/shapes';
import type { RoundTimeline } from '../rounds/timeline';
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
  timeLimitMs: number | null;
  effects: string[]; // effect ids, empty for now
  copyKey: ObjectiveKey;
  /** Hooks into the round sequence (moving shapes, glitches…). Empty for now. */
  timeline?: RoundTimeline;
};

const DEFAULT_TIME_WEIGHT = 0.2;

/** Shape placement from the Figma "Round" frame: 8px above the screen center. */
const DEFAULT_OFFSET = { x: 0, y: -8 };

/** Rounds that keep the placeholder until their brief (v0.6). */
const PLACEHOLDER_SHAPE: ShapeConfig = { type: 'rect', width: 200, height: 200 };

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
 * HUD row and above the objective line, keeping `largeShapeMargin` from each.
 */
export function freeScreenArea(): { left: number; top: number; width: number; height: number } {
  const { screen, screenHud, round } = layout;
  const margin = round.largeShapeMargin;
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

/** What makes each round different. Rounds not listed keep the placeholder square. */
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
  7: { ...largeRect(), falloffRadius: REFERENCE_FALLOFF_PX },
  9: {
    // Three overlapping circles of different sizes, merged into one lopsided outline.
    shape: {
      type: 'circleCluster',
      circles: [
        { x: -34, y: 51, r: 128 },
        { x: 77, y: -38, r: 90 },
        { x: -26, y: -102, r: 76 },
      ],
    },
  },
  10: {
    // A five-point star, stretched sideways.
    shape: { type: 'star', width: 380, height: 240, points: 5, innerRatio: 0.45 },
    rotationDeg: 14,
    offset: { x: -120, y: DEFAULT_OFFSET.y },
  },
  12: { shape: { type: 'smiley', diameter: 100 }, fill: 'light' },
};

const ROUND_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Round 1 ignores time. */
export const rounds: readonly RoundConfig[] = ROUND_IDS.map((id) => ({
  id,
  phase: phaseForRound(id),
  shape: { ...PLACEHOLDER_SHAPE },
  offset: { ...DEFAULT_OFFSET },
  rotationDeg: 0,
  fill: 'default',
  timeWeight: id === 1 ? 0 : DEFAULT_TIME_WEIGHT,
  timeLimitMs: null,
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
