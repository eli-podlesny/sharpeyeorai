import { gameConfig, type ScoringConfig } from '../config/game.config';
import type { Point } from '../core/stage';

/**
 * Per-round scoring. Pure functions; every constant comes from `gameConfig.scoring`
 * (passed in, so tests can use their own values).
 */

const clamp01 = (v: number): number => Math.min(Math.max(v, 0), 1);

export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * R: accuracy reaches 0 this far from O. By default half the shorter side of the shape's
 * on-screen bounding box; rounds can set their own radius instead.
 */
export function falloffRadius(
  box: { width: number; height: number },
  cfg: ScoringConfig = gameConfig.scoring,
): number {
  return cfg.falloffFraction * Math.min(box.width, box.height);
}

/** a = clamp(1 − dO / R, 0, 1) ^ curve. 1 on O, 0 at R or farther. */
export function accuracy(
  dO: number,
  radius: number,
  cfg: ScoringConfig = gameConfig.scoring,
): number {
  if (radius <= 0) return dO === 0 ? 1 : 0;
  return clamp01(1 - dO / radius) ** cfg.curve;
}

/** s = clamp(1 − (t − grace) / (max − grace), 0, 1). 1 up to grace, 0 from max on. */
export function speed(latencyMs: number, cfg: ScoringConfig = gameConfig.scoring): number {
  const span = cfg.maxMs - cfg.graceMs;
  if (span <= 0) return latencyMs <= cfg.graceMs ? 1 : 0;
  return clamp01(1 - (latencyMs - cfg.graceMs) / span);
}

/**
 * q = a × (1 − timeWeight + timeWeight × s). A penalty (timeout, system error — v1.0b)
 * sets q to 0.
 */
export function quality(a: number, s: number, timeWeight: number, penalty = false): number {
  if (penalty) return 0;
  return a * (1 - timeWeight + timeWeight * s);
}

/** This round's share of the maximum score (not rounded; display rounds it). */
export function roundPoints(
  q: number,
  roundCount: number,
  cfg: ScoringConfig = gameConfig.scoring,
): number {
  return (cfg.maxScore * q) / roundCount;
}

/** total = round(maxScore × Σq / roundCount). Exactly maxScore when every q is 1. */
export function totalScore(
  qualities: readonly number[],
  roundCount: number,
  cfg: ScoringConfig = gameConfig.scoring,
): number {
  const sum = qualities.reduce((acc, q) => acc + q, 0);
  return Math.round((cfg.maxScore * sum) / roundCount);
}
