import { opticalSettings, type RoundConfig } from '../config/rounds.config';
import { falloffRadius } from '../scoring/score';
import { placeShape, type PlacedShape, type Size } from './geometry';
import { shapeCenters, type Centers } from './opticalCenter';
import { bounds } from './polygon';

/** Everything a round is measured against: its placed shape, C/M/O and the falloff radius. */
export interface RoundTarget {
  round: RoundConfig;
  shape: PlacedShape;
  centers: Centers;
  /** Accuracy reaches 0 this far from O (px). */
  falloffRadius: number;
}

// Building a shape and finding M takes a few ms; the debug panel asks on every mouse move.
const cache = new WeakMap<RoundConfig, Map<string, RoundTarget>>();

/** The target of a round on a screen of `content` size, with its shape seed. Cached. */
export function roundTarget(round: RoundConfig, content: Size, seed: number): RoundTarget {
  const key = `${seed}|${content.width}x${content.height}`;
  let perRound = cache.get(round);
  if (!perRound) {
    perRound = new Map();
    cache.set(round, perRound);
  }
  const cached = perRound.get(key);
  if (cached) return cached;

  const shape = placeShape(round, content, seed);
  const target: RoundTarget = {
    round,
    shape,
    centers: shapeCenters(shape, opticalSettings(round)),
    falloffRadius: round.falloffRadius ?? falloffRadius(bounds(shape.outer)),
  };
  perRound.set(key, target);
  return target;
}
