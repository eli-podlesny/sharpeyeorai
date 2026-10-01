import { gameConfig, type ScoringConfig } from '../config/game.config';
import type { Point } from '../core/stage';
import { distance } from './score';

/**
 * Humanity lean for one click: where P falls along the line from C (0, machine-like)
 * to O (1, human-like). Drives the verdict only, never the points.
 * Returns null when C and O are too close together for the lean to mean anything.
 */
export function lean(
  P: Point,
  C: Point,
  O: Point,
  cfg: ScoringConfig = gameConfig.scoring,
): number | null {
  const sep = distance(O, C);
  if (sep < cfg.minSeparationPx) return null;
  const t = ((P.x - C.x) * (O.x - C.x) + (P.y - C.y) * (O.y - C.y)) / (sep * sep);
  return Math.min(Math.max(t, cfg.leanMin), cfg.leanMax);
}

/** Mean lean over the rounds that have one; null if none do. */
export function humanityIndex(leans: readonly (number | null)[]): number | null {
  const valid = leans.filter((t): t is number => t !== null);
  if (valid.length === 0) return null;
  return valid.reduce((acc, t) => acc + t, 0) / valid.length;
}
