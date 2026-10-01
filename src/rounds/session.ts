import { createRng, mixSeed, type Rng } from '../core/rng';
import type { Point } from '../core/stage';
import { toShapeLocal } from './geometry';
import type { Centers } from './opticalCenter';
import type { RoundTarget } from './target';

/**
 * One logged click. `click`, `C` and `O` are shape-local (relative to C, along the
 * shape's axes), so C is always (0, 0). `clickContent` is the raw screen-content point
 * and `centers` holds C, M and O in screen-content pixels, which scoring uses.
 */
export interface RoundResult {
  roundId: number;
  click: Point;
  clickContent: Point;
  latencyMs: number;
  C: Point;
  O: Point;
  centers: Centers;
  /** Accuracy reaches 0 this far from O (px). */
  falloffRadius: number;
  /** Timeout or system error (v1.0b): the round scores 0. */
  penalty: boolean;
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

/** Builds the logged result for a click at `clickContent` on a round's target. */
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
    penalty: false,
  };
}
