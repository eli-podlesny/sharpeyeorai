import { gameConfig } from '../config/game.config';
import { freeScreenArea, type RoundConfig } from '../config/rounds.config';
import { createRng, mixSeed, rangeOf } from '../core/rng';
import type { Point } from '../core/stage';
import { placeShape, STILL_FRAME, type PlacedShape, type ShapeFrame, type Size } from './geometry';
import { bounds, type Bounds } from './polygon';
import type { Shape } from './shapes';
import { circleClusterShape } from './shapes/circleCluster';
import { curveShape } from './shapes/curve';

/**
 * How a round's shape changes over time, from `round.shape.visible` (t = 0). A round can
 * combine several motions (round 5 morphs and bobs). Every motion is a pure function of
 * t, so the shape the player saw at any moment can be rebuilt exactly for scoring.
 * Distances are in design px, angles in degrees.
 */
export type RoundMotion =
  /**
   * The outline drifts on smooth noise, up to `amplitude` of its size: a `curve`'s control
   * points (rounds 4, 5), or a `circleCluster`'s circles (round 9).
   */
  | { type: 'morph'; amplitude: number; cycleMs: number }
  /** A figure-eight sway: x = A·sin(ωt), y = B·sin(2ωt + φ), A as wide as the area allows (round 6). */
  | { type: 'wave'; periodMs: number; ampY: number; phaseDeg: number; margin: number }
  /** A gentle up-and-down: y = ampY·sin(ωt) (round 5). */
  | { type: 'bob'; periodMs: number; ampY: number }
  /** Jumps to a new seeded position every `everyMs`, with no animation in between (round 8). */
  | { type: 'jump'; everyMs: number; margin: number }
  /** Leans back and forth: skew = maxDeg·sin(ωt) (round 7). */
  | { type: 'skew'; periodMs: number; maxDeg: number }
  /** Turns clockwise, one full turn every `periodMs` (round 10). */
  | { type: 'spin'; periodMs: number }
  /** Shrinks linearly around its center to `endScale` over `durationMs`, then stays (round 11). */
  | { type: 'shrink'; endScale: number; durationMs: number };

type Motion<K extends RoundMotion['type']> = Extract<RoundMotion, { type: K }>;

/** Salts that keep each motion's randomness apart from the shape's own. */
const MORPH_SALT = 0x6d6f7270;
const JUMP_SALT = 0x6a756d70;

/** The two sines of the morph noise: their weights add up to 1, so drift never exceeds the amplitude. */
const NOISE_WEIGHTS = [0.6, 0.4] as const;
/** The second sine runs this much faster, so the drift never repeats exactly within a cycle. */
const NOISE_SECOND_SPEED = 1.7;

const TAU = 2 * Math.PI;

/** True for rounds whose shape changes after it becomes visible. */
export function isMoving(round: RoundConfig): boolean {
  return (round.motions?.length ?? 0) > 0;
}

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

/**
 * Smooth noise at time t, between −1 and 1: each call gives the next independent value
 * (two slow sines with seeded phases). The same seed gives the same values in the same order.
 */
function noiseAt(motion: Motion<'morph'>, seed: number, t: number): () => number {
  const rng = createRng(mixSeed(seed, MORPH_SALT));
  const s = (TAU * t) / motion.cycleMs;
  return () => {
    const a = rng() * TAU;
    const b = rng() * TAU;
    return (
      NOISE_WEIGHTS[0] * Math.sin(s + a) + NOISE_WEIGHTS[1] * Math.sin(NOISE_SECOND_SPEED * s + b)
    );
  };
}

/** Each control point's drift at time t, up to `amplitude` of the width and height. */
export function morphDrift(
  motion: Motion<'morph'>,
  size: { width: number; height: number },
  controlCount: number,
  seed: number,
  t: number,
): Point[] {
  const noise = noiseAt(motion, seed, t);
  return Array.from({ length: controlCount }, () => ({
    x: motion.amplitude * size.width * noise(),
    y: motion.amplitude * size.height * noise(),
  }));
}

/** The morphed outline at time t, or undefined for shapes that cannot morph. */
function morphedShape(
  round: RoundConfig,
  motion: Motion<'morph'>,
  seed: number,
  t: number,
  spacing: number,
): Shape | undefined {
  const { shape } = round;
  const ctx = { rng: createRng(seed), spacing };
  if (shape.type === 'curve') {
    return curveShape(shape, ctx, morphDrift(motion, shape, shape.controls.length, seed, t));
  }
  if (shape.type === 'circleCluster') {
    // Each circle drifts and swells by up to `amplitude` of its own radius.
    const noise = noiseAt(motion, seed, t);
    const circles = shape.circles.map((c) => ({
      x: c.x + motion.amplitude * c.r * noise(),
      y: c.y + motion.amplitude * c.r * noise(),
      r: c.r * (1 + motion.amplitude * noise()),
    }));
    return circleClusterShape({ circles }, ctx);
  }
  return undefined;
}

/** The figure-eight's horizontal and vertical reach for a round: as wide as fits, `ampY` tall (or less if it does not fit). */
export function waveAmplitude(
  round: RoundConfig,
  motion: Motion<'wave'>,
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

/** One motion's contribution to the frame at time t (≥ 0). */
function applyMotion(
  frame: ShapeFrame,
  motion: RoundMotion,
  round: RoundConfig,
  content: Size,
  seed: number,
  t: number,
  spacing: number,
): ShapeFrame {
  const moved = (dx: number, dy: number): ShapeFrame => ({
    ...frame,
    offset: { x: frame.offset.x + dx, y: frame.offset.y + dy },
  });
  switch (motion.type) {
    case 'morph': {
      const local = morphedShape(round, motion, seed, t, spacing);
      return local ? { ...frame, local } : frame;
    }
    case 'wave': {
      const amp = waveAmplitude(round, motion, content, seed, spacing);
      const w = (TAU * t) / motion.periodMs;
      const phase = (motion.phaseDeg * Math.PI) / 180;
      return moved(amp.x * Math.sin(w), amp.y * Math.sin(2 * w + phase));
    }
    case 'bob':
      return moved(0, motion.ampY * Math.sin((TAU * t) / motion.periodMs));
    case 'jump': {
      const rest = restBounds(round, content, seed, spacing);
      const at = jumpOffset(rest, motion.margin, seed, Math.floor(t / motion.everyMs));
      return moved(at.x, at.y);
    }
    case 'skew':
      return {
        ...frame,
        skewDeg: frame.skewDeg + motion.maxDeg * Math.sin((TAU * t) / motion.periodMs),
      };
    case 'spin':
      return { ...frame, rotationDeg: frame.rotationDeg + (360 * t) / motion.periodMs };
    case 'shrink': {
      const p = Math.min(t / motion.durationMs, 1);
      return { ...frame, scale: frame.scale * (1 + (motion.endScale - 1) * p) };
    }
  }
}

/** One moment of a round's motions, or undefined for a shape that never changes. */
export function shapeFrameAt(
  round: RoundConfig,
  content: Size,
  seed: number,
  t: number,
  spacing: number = gameConfig.shapePointSpacingPx,
): ShapeFrame | undefined {
  if (!isMoving(round)) return undefined;
  const time = Math.max(t, 0);
  return (round.motions ?? []).reduce(
    (frame, motion) => applyMotion(frame, motion, round, content, seed, time, spacing),
    STILL_FRAME,
  );
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
