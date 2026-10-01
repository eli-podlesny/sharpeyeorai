import { gameConfig, type ScoringConfig } from '../config/game.config';
import { getRound } from '../config/rounds.config';
import type { Point } from '../core/stage';
import type { RoundResult } from '../rounds/session';
import { humanityIndex, lean } from './lean';
import { pickPersona, type Persona } from './persona';
import { accuracy, distance, quality, roundPoints, speed, totalScore } from './score';

/** One scored round. Points are screen-content pixels. */
export interface RoundSummary {
  id: number;
  P: Point;
  C: Point;
  O: Point;
  dO: number;
  dC: number;
  latencyMs: number;
  a: number;
  s: number;
  q: number;
  /** Unrounded; display rounds it. */
  points: number;
  /** Null when the round is left out of the humanity lean. */
  lean: number | null;
}

/** Everything the score screen (and later the leaderboard) needs. */
export interface SessionSummary {
  total: number;
  rounds: RoundSummary[];
  /** Mean latency over the rounds that count time (rounds 2–12). */
  meanLatencyMs: number;
  humanityIndex: number | null;
  persona: Persona;
}

/** Scores one logged click against its round's config. */
export function scoreRound(
  result: RoundResult,
  roundCount: number = gameConfig.roundCount,
  cfg: ScoringConfig = gameConfig.scoring,
): RoundSummary {
  const round = getRound(result.roundId);
  const { C, O } = result.centers;
  const P = result.clickContent;
  const dO = distance(P, O);
  const a = accuracy(dO, result.falloffRadius, cfg);
  const s = speed(result.latencyMs, cfg);
  const q = quality(a, s, round.timeWeight, result.penalty);
  return {
    id: result.roundId,
    P,
    C,
    O,
    dO,
    dC: distance(P, C),
    latencyMs: result.latencyMs,
    a,
    s,
    q,
    points: roundPoints(q, roundCount, cfg),
    lean: lean(P, C, O, cfg),
  };
}

/** Mean latency of the rounds that count time; all rounds if none do. */
function meanLatency(results: readonly RoundResult[]): number {
  const timed = results.filter((r) => getRound(r.roundId).timeWeight > 0);
  const pool = timed.length > 0 ? timed : results;
  if (pool.length === 0) return 0;
  return pool.reduce((acc, r) => acc + r.latencyMs, 0) / pool.length;
}

/**
 * Scores a whole game. Rounds that were never played count as 0, because the total
 * always divides by `roundCount`.
 */
export function summarize(
  results: readonly RoundResult[],
  roundCount: number = gameConfig.roundCount,
  cfg: ScoringConfig = gameConfig.scoring,
): SessionSummary {
  const rounds = results.map((r) => scoreRound(r, roundCount, cfg));
  const total = totalScore(
    rounds.map((r) => r.q),
    roundCount,
    cfg,
  );
  const meanLatencyMs = meanLatency(results);
  const index = humanityIndex(rounds.map((r) => r.lean));
  return {
    total,
    rounds,
    meanLatencyMs,
    humanityIndex: index,
    persona: pickPersona(total, index, meanLatencyMs),
  };
}
