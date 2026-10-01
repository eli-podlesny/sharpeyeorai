import { gameConfig, type ScoringConfig } from '../config/game.config';
import { getRound } from '../config/rounds.config';
import type { Point } from '../core/stage';
import type { RoundResult } from '../rounds/session';
import { humanityIndex, lean } from './lean';
import { pickPersona, type Persona } from './persona';
import { accuracy, distance, quality, roundPoints, speed, totalScore } from './score';

/** One scored round. Points are screen-content pixels. P, dO, dC and latency are null for a timeout. */
export interface RoundSummary {
  id: number;
  P: Point | null;
  C: Point;
  O: Point;
  dO: number | null;
  dC: number | null;
  latencyMs: number | null;
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
  /** Mean latency over the rounds that count time (rounds 2–12), timeouts left out. */
  meanLatencyMs: number;
  humanityIndex: number | null;
  persona: Persona;
}

/** Scores one logged click against its round's config. A timeout scores 0 and has no lean. */
export function scoreRound(
  result: RoundResult,
  roundCount: number = gameConfig.roundCount,
  cfg: ScoringConfig = gameConfig.scoring,
): RoundSummary {
  const round = getRound(result.roundId);
  const { C, O } = result.centers;
  const P = result.clickContent;
  const latencyMs = result.latencyMs;
  if (P === null || latencyMs === null) {
    return {
      id: result.roundId,
      P: null,
      C,
      O,
      dO: null,
      dC: null,
      latencyMs: null,
      a: 0,
      s: 0,
      q: 0,
      points: 0,
      lean: null,
    };
  }
  const dO = distance(P, O);
  const a = accuracy(dO, result.falloffRadius, cfg);
  const s = speed(latencyMs, cfg);
  const q = quality(a, s, round.timeWeight, result.penalty);
  return {
    id: result.roundId,
    P,
    C,
    O,
    dO,
    dC: distance(P, C),
    latencyMs,
    a,
    s,
    q,
    points: roundPoints(q, roundCount, cfg),
    lean: lean(P, C, O, cfg),
  };
}

/** Mean latency of the clicked rounds that count time; all clicked rounds if none do. */
function meanLatency(results: readonly RoundResult[]): number {
  const latencies = (rs: readonly RoundResult[]): number[] =>
    rs.flatMap((r) => (r.latencyMs === null ? [] : [r.latencyMs]));
  const timed = latencies(results.filter((r) => getRound(r.roundId).timeWeight > 0));
  const pool = timed.length > 0 ? timed : latencies(results);
  if (pool.length === 0) return 0;
  return pool.reduce((acc, ms) => acc + ms, 0) / pool.length;
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
