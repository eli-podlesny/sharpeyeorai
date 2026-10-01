import { gameConfig } from '../config/game.config';
import { opticalSettings, type RoundConfig } from '../config/rounds.config';
import { falloffRadius } from '../scoring/score';
import type { PlacedShape, Size } from './geometry';
import { isMoving, shapeAt } from './motion';
import { shapeCenters, type Centers } from './opticalCenter';
import { bounds } from './polygon';

/** Everything a round is measured against: its placed shape, C/M/O and the falloff radius. */
export interface RoundTarget {
  round: RoundConfig;
  shape: PlacedShape;
  centers: Centers;
  /** Accuracy reaches 0 this far from O (px). */
  falloffRadius: number;
  /** The moment of the round this target shows, in ms from `round.shape.visible` (0 for still shapes). */
  atMs: number;
}

// Building a shape and finding M takes a few ms; the debug panel asks on every mouse move.
const cache = new WeakMap<RoundConfig, Map<string, RoundTarget>>();

function buildTarget(round: RoundConfig, content: Size, seed: number, atMs: number): RoundTarget {
  const shape = shapeAt(round, content, seed, atMs, gameConfig.shapePointSpacingPx);
  return {
    round,
    shape,
    centers: shapeCenters(shape, opticalSettings(round)),
    // The default radius follows the shape as shown, so a shrinking shape is judged more strictly.
    falloffRadius: round.falloffRadius ?? falloffRadius(bounds(shape.outer)),
    atMs,
  };
}

/**
 * The target of a round on a screen of `content` size, with its shape seed, as it stands
 * when it first becomes visible (t = 0). Cached.
 */
export function roundTarget(round: RoundConfig, content: Size, seed: number): RoundTarget {
  const key = `${seed}|${content.width}x${content.height}`;
  let perRound = cache.get(round);
  if (!perRound) {
    perRound = new Map();
    cache.set(round, perRound);
  }
  const cached = perRound.get(key);
  if (cached) return cached;
  const target = buildTarget(round, content, seed, 0);
  perRound.set(key, target);
  return target;
}

/**
 * The target exactly as displayed t ms after `round.shape.visible`: for moving and
 * morphing shapes, C, M, O and the falloff come from that frame. Still shapes reuse the
 * cached target.
 */
export function targetAt(round: RoundConfig, content: Size, seed: number, t: number): RoundTarget {
  if (!isMoving(round)) return roundTarget(round, content, seed);
  return buildTarget(round, content, seed, t);
}
