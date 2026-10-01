import { gameConfig } from '../config/game.config';
import { freeScreenArea, type RoundConfig } from '../config/rounds.config';
import { createRng, mixSeed, rangeOf } from '../core/rng';
import type { Point } from '../core/stage';
import { placeShape, type PlacedShape, type ShapeFrame, type Size } from './geometry';
import { bounds, type Bounds } from './polygon';
import { curveShape } from './shapes/curve';

/**
 * How a round's shape changes over time, from `round.shape.visible` (t = 0). Every motion
 * is a pure function of t, so the shape the player saw at any moment can be rebuilt
 * exactly for scoring. Distances are in design px.
 */
export type RoundMotion =
  /** Each control point of a `curve` shape drifts on smooth noise (rounds 4, 5). */
  | { type: 'morph'; amplitude: number; cycleMs: number }
  /** A figure-eight sway: x = A·sin(ωt), y = B·sin(2ωt + φ), A as wide as the area allows (round 6). */
  | { type: 'wave'; periodMs: number; ampY: number; phaseDeg: number; margin: number }
  /** Jumps to a new seeded position every `everyMs`, with no animation in between (round 8). */
  | { type: 'jump'; everyMs: number; margin: number }
  /** Shrinks linearly around its center to `endScale` over `durationMs`, then stays (round 11). */
  | { type: 'shrink'; endScale: number; durationMs: number };

/** Salts that keep each motion's randomness apart from the shape's own. */
const MORPH_SALT = 0x6d6f7270;
const JUMP_SALT = 0x6a756d70;

/** The two sines of the morph noise: their weights add up to 1, so drift never exceeds the amplitude. */
const NOISE_WEIGHTS = [0.6, 0.4] as const;
/** The second sine runs this much faster, so the drift never repeats exactly within a cycle. */
const NOISE_SECOND_SPEED = 1.7;

const TAU = 2 * Math.PI;

/** Where the shape at rest sits on screen. */
function restBounds(round: RoundConfig, content: Size, seed: number, spacing: number): Bounds {
  return bounds(placeShape(round, content, seed, spacing).outer);
}

/** How far the shape at rest can move each way and still stay inside the free area (with `margin`). */
function room(
  rest: Bounds,
  margin: number,
): { left: number; right: number; up: number; down: number } {
  const area = freeScreenArea(margin);
  return {
    left: rest.minX - area.left,
    right: area.left + area.width - rest.maxX,
    up: rest.minY - area.top,
    down: area.top + area.height - rest.maxY,
  };
}

/** Each control point's drift at time t: two slow sines per axis, with seeded phases. */
export function morphDrift(
  motion: Extract<RoundMotion, { type: 'morph' }>,
  size: { width: number; height: number },
  controlCount: number,
  seed: number,
  t: number,
): Point[] {
  const rng = createRng(mixSeed(seed, MORPH_SALT));
  const s = (TAU * t) / motion.cycleMs;
  const noise = (): number => {
    const a = rng() * TAU;
    const b = rng() * TAU;
    return (
      NOISE_WEIGHTS[0] * Math.sin(s + a) + NOISE_WEIGHTS[1] * Math.sin(NOISE_SECOND_SPEED * s + b)
    );
  };
  return Array.from({ length: controlCount }, () => ({
    x: motion.amplitude * size.width * noise(),
    y: motion.amplitude * size.height * noise(),
  }));
}

/** The figure-eight's horizontal and vertical reach for a round: as wide as fits, `ampY` tall (or less if it does not fit). */
export function waveAmplitude(
  round: RoundConfig,
  motion: Extract<RoundMotion, { type: 'wave' }>,
  content: Size,
  seed: number,
  spacing: number = gameConfig.shapePointSpacingPx,
): { x: number; y: number } {
  const r = room(restBounds(round, content, seed, spacing), motion.margin);
  return {
    x: Math.max(Math.min(r.left, r.right), 0),
    y: Math.max(Math.min(motion.ampY, r.up, r.down), 0),
  };
}

/** Where a jumping shape sits during its k-th stay (k = 0 is its resting place). */
function jumpOffset(rest: Bounds, margin: number, seed: number, k: number): Point {
  if (k <= 0) return { x: 0, y: 0 };
  const r = room(rest, margin);
  const rng = createRng(mixSeed(mixSeed(seed, JUMP_SALT), k));
  return {
    x: rangeOf(rng, -Math.max(r.left, 0), Math.max(r.right, 0)),
    y: rangeOf(rng, -Math.max(r.up, 0), Math.max(r.down, 0)),
  };
}

/** One moment of a round's motion, or undefined for a shape that never changes. */
export function shapeFrameAt(
  round: RoundConfig,
  content: Size,
  seed: number,
  t: number,
  spacing: number = gameConfig.shapePointSpacingPx,
): ShapeFrame | undefined {
  const motion = round.motion;
  if (!motion) return undefined;
  const time = Math.max(t, 0);
  const still = { x: 0, y: 0 };
  switch (motion.type) {
    case 'morph': {
      const { shape } = round;
      if (shape.type !== 'curve') return undefined;
      const drift = morphDrift(motion, shape, shape.controls.length, seed, time);
      const local = curveShape(shape, { rng: createRng(seed), spacing }, drift);
      return { offset: still, scale: 1, local };
    }
    case 'wave': {
      const amp = waveAmplitude(round, motion, content, seed, spacing);
      const w = (TAU * time) / motion.periodMs;
      const phase = (motion.phaseDeg * Math.PI) / 180;
      return {
        offset: { x: amp.x * Math.sin(w), y: amp.y * Math.sin(2 * w + phase) },
        scale: 1,
      };
    }
    case 'jump': {
      const rest = restBounds(round, content, seed, spacing);
      const k = Math.floor(time / motion.everyMs);
      return { offset: jumpOffset(rest, motion.margin, seed, k), scale: 1 };
    }
    case 'shrink': {
      const p = Math.min(time / motion.durationMs, 1);
      return { offset: still, scale: 1 + (motion.endScale - 1) * p };
    }
  }
}

/** The round's shape as it is shown t ms after `round.shape.visible`. */
export function shapeAt(
  round: RoundConfig,
  content: Size,
  seed: number,
  t: number,
  spacing: number = gameConfig.shapePointSpacingPx,
): PlacedShape {
  return placeShape(round, content, seed, spacing, shapeFrameAt(round, content, seed, t, spacing));
}
