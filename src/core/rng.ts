/**
 * Small seeded random number generator (mulberry32).
 * The same seed always gives the same sequence, so a round set can be replayed with `?seed=`.
 */

export type Rng = () => number;

const MAX_SEED = 0xffffffff;

/** Returns a function that yields numbers in [0, 1). */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh random seed, for when the URL does not give one. */
export function randomSeed(): number {
  return Math.floor(Math.random() * MAX_SEED);
}

/** Random number in [min, max). */
export function rangeOf(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}
