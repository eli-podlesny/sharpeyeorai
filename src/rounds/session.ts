import { createRng, mixSeed, type Rng } from '../core/rng';
import type { Point } from '../core/stage';
import { toShapeLocal, type PlacedShape } from './geometry';
import type { Centers } from './opticalCenter';
import type { RoundTarget } from './target';

/**
 * One logged round. `click`, `C` and `O` are shape-local (relative to C, along the
 * shape's axes), so C is always (0, 0). `clickContent` is the raw screen-content point
 * and `centers` holds C, M and O in screen-content pixels, which scoring uses.
 * Everything is measured on `shape`: the shape exactly as it was displayed at the click.
 * A timeout has no click (`click`, `clickContent` and `latencyMs` are null).
 */
export interface RoundResult {
  roundId: number;
  click: Point | null;
  clickContent: Point | null;
  latencyMs: number | null;
  C: Point;
  O: Point;
  centers: Centers;
  /** Accuracy reaches 0 this far from O (px). */
  falloffRadius: number;
  /** The shape as displayed when the round was decided (the click, or the timeout). */
  shape: Pick<PlacedShape, 'outer' | 'holes'>;
  /** When that frame was shown, in ms from `round.shape.visible`. */
  frameMs: number;
  /** Timeout or system error: the round scores 0. */
  penalty: boolean;
}

/** True when the round got no click (it timed out). */
export function isTimeout(result: RoundResult): boolean {
  return result.clickContent === null;
}

/** Everything recorded during one play-through. Scoring (v1.0) reads from here. */
export interface GameSession {
  seed: number;
  rng: Rng;
  /** 1-based id of the round being played (or about to be). */
  currentRound: number;
  results: RoundResult[];
  /** Shape seeds set by hand (debug reroll); other rounds derive theirs from `seed`. */
  shapeSeeds: Map<number, number>;
}

export function createSession(seed: number, startRound = 1): GameSession {
  return {
    seed,
    rng: createRng(seed),
    currentRound: startRound,
    results: [],
    shapeSeeds: new Map(),
  };
}

/** The seed for a round's shape: the same game seed always gives the same shapes. */
export function shapeSeed(
  session: Pick<GameSession, 'seed' | 'shapeSeeds'>,
  roundId: number,
): number {
  return session.shapeSeeds.get(roundId) ?? mixSeed(session.seed, roundId);
}

/**
 * Builds the logged result for a click at `clickContent` on a round's target. The target
 * must be the frame that was displayed at the click (`targetAt`), so moving shapes are
 * scored against what the player saw.
 */
export function createResult(
  target: RoundTarget,
  clickContent: Point,
  latencyMs: number,
): RoundResult {
  const { centers, shape } = target;
  const local = (p: Point): Point => toShapeLocal(p, centers.C, shape.rotationDeg);
  return {
    roundId: target.round.id,
    click: local(clickContent),
    clickContent,
    latencyMs,
    C: { x: 0, y: 0 },
    O: local(centers.O),
    centers,
    falloffRadius: target.falloffRadius,
    shape: { outer: shape.outer, holes: shape.holes },
    frameMs: target.atMs,
    penalty: false,
  };
}

/** The logged result of a round that timed out: no click, 0 points, left out of lean and mean latency. */
export function createTimeoutResult(target: RoundTarget): RoundResult {
  const { centers, shape } = target;
  return {
    roundId: target.round.id,
    click: null,
    clickContent: null,
    latencyMs: null,
    C: { x: 0, y: 0 },
    O: toShapeLocal(centers.O, centers.C, shape.rotationDeg),
    centers,
    falloffRadius: target.falloffRadius,
    shape: { outer: shape.outer, holes: shape.holes },
    frameMs: target.atMs,
    penalty: true,
  };
}
