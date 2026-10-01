import type { RoundTimeline } from '../rounds/timeline';
import type { ObjectiveKey } from './copy';
import { gameConfig, type OpticalConfig } from './game.config';

export type RectShape = {
  type: 'rect';
  width: number;
  height: number;
  /** Clockwise, in degrees, around the shape's center. */
  rotationDeg: number;
};

/** Only rectangles for now; more shape types join this union later. */
export type ShapeConfig = RectShape;

export type RoundPhase = 1 | 2 | 3 | 4;

export type RoundConfig = {
  id: number; // 1–12
  phase: RoundPhase;
  shape: ShapeConfig;
  offset: { x: number; y: number }; // from screen-content center, design px
  /** Per-round overrides of `gameConfig.optical`; leave out to use the global default. */
  optical?: Partial<OpticalConfig>;
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

const DEFAULT_SHAPE: RectShape = { type: 'rect', width: 200, height: 200, rotationDeg: 0 };

/** Rounds 1–3 phase 1, 4–7 phase 2, 8–11 phase 3, 12 phase 4. */
export function phaseForRound(id: number): RoundPhase {
  if (id <= 3) return 1;
  if (id <= 7) return 2;
  if (id <= 11) return 3;
  return 4;
}

const ROUND_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** All rounds are identical for now except `id`; round 1 ignores time. */
export const rounds: readonly RoundConfig[] = ROUND_IDS.map((id) => ({
  id,
  phase: phaseForRound(id),
  shape: { ...DEFAULT_SHAPE },
  offset: { ...DEFAULT_OFFSET },
  timeWeight: id === 1 ? 0 : DEFAULT_TIME_WEIGHT,
  timeLimitMs: null,
  effects: [],
  copyKey: 'objective.rect',
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
