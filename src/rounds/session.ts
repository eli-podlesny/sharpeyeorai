import { getRound, rounds } from '../config/rounds.config';
import { createRng, rangeOf, type Rng } from '../core/rng';
import type { Point } from '../core/stage';
import { toShapeLocal, type Size } from './geometry';
import { roundCenters, type Centers } from './opticalCenter';

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
}

export function createSession(seed: number, startRound = 1): GameSession {
  return { seed, rng: createRng(seed), currentRound: startRound, results: [] };
}

/** Builds the logged result for a click at `clickContent` in a round. */
export function createResult(
  roundId: number,
  clickContent: Point,
  latencyMs: number,
  content: Size,
): RoundResult {
  const round = getRound(roundId);
  const centers = roundCenters(round, content);
  return {
    roundId,
    click: toShapeLocal(clickContent, round, content),
    clickContent,
    latencyMs,
    C: { x: 0, y: 0 },
    O: toShapeLocal(centers.O, round, content),
    centers,
    penalty: false,
  };
}

const SAMPLE_SPREAD_PX = 40;
const SAMPLE_LATENCY_MS = { min: 600, max: 4000 };

/**
 * Fake results for reviewing the score screen without playing (debug jumps).
 * Clicks scatter around O; the session's seed makes them repeatable.
 */
export function createSampleResults(rng: Rng, content: Size): RoundResult[] {
  return rounds.map((round) => {
    const o = roundCenters(round, content).O;
    const click = {
      x: o.x + rangeOf(rng, -SAMPLE_SPREAD_PX, SAMPLE_SPREAD_PX),
      y: o.y + rangeOf(rng, -SAMPLE_SPREAD_PX, SAMPLE_SPREAD_PX),
    };
    const latency = Math.round(rangeOf(rng, SAMPLE_LATENCY_MS.min, SAMPLE_LATENCY_MS.max));
    return createResult(round.id, click, latency, content);
  });
}
