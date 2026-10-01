import type { RoundSequenceConfig } from '../config/game.config';

/**
 * Every round follows the same rhythm:
 *
 *   1. the shape and the objective (at the bottom) fade in together
 *   2. the round timer starts once they are fully visible (clicks before are ignored)
 *   3. the click: marker + tooltip
 *   4. wait
 *   5. objective, shape and marker fade out together
 *   6. pause, then the next round starts at step 1
 *
 * Step 1 counts from the start of the round; steps 4–6 count from the click.
 */
export interface RoundSequence {
  fadeInMs: number;
  postClickWaitMs: number;
  outroFadeMs: number;
  betweenRoundsMs: number;
  fadeEasing: string;
}

/** Turns the configured timings into the round's schedule. Reduced motion: short fades. */
export function buildRoundSequence(
  config: RoundSequenceConfig,
  reducedMotion: boolean,
): RoundSequence {
  const fade = (ms: number): number =>
    reducedMotion ? Math.min(ms, config.reducedMotionFadeMs) : ms;

  return {
    fadeInMs: fade(config.fadeInMs),
    postClickWaitMs: config.postClickWaitMs,
    outroFadeMs: fade(config.outroFadeMs),
    betweenRoundsMs: config.betweenRoundsMs,
    fadeEasing: config.fadeEasing,
  };
}
