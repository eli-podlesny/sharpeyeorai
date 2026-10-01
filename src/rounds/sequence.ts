import type { RoundSequenceConfig } from '../config/game.config';

/**
 * Every round follows the same rhythm:
 *
 *   1. the shape fades in; a moment later the objective fades in and slides up
 *      into its bottom position
 *   2. the round timer starts once the shape is fully visible (clicks before are ignored)
 *   3. the click: marker + tooltip
 *   4. wait
 *   5. objective, shape and marker fade out together
 *   6. pause, then the next round starts at step 1
 *
 * Step 1 counts from the start of the round; steps 4–6 count from the click.
 */
export interface RoundSequence {
  shapeFadeInMs: number;
  objectiveDelayMs: number;
  objectiveFadeInMs: number;
  /** 0 with reduced motion: the objective appears in place. */
  objectiveSlideMs: number;
  postClickWaitMs: number;
  outroFadeMs: number;
  betweenRoundsMs: number;
  fadeEasing: string;
  slideEasing: string;
}

/** Turns the configured timings into the round's schedule. Reduced motion: short fades, no slide. */
export function buildRoundSequence(
  config: RoundSequenceConfig,
  reducedMotion: boolean,
): RoundSequence {
  const fade = (ms: number): number =>
    reducedMotion ? Math.min(ms, config.reducedMotionFadeMs) : ms;

  return {
    shapeFadeInMs: fade(config.shapeFadeInMs),
    objectiveDelayMs: config.objectiveDelayMs,
    objectiveFadeInMs: fade(config.objectiveInMs),
    objectiveSlideMs: reducedMotion ? 0 : config.objectiveInMs,
    postClickWaitMs: config.postClickWaitMs,
    outroFadeMs: fade(config.outroFadeMs),
    betweenRoundsMs: config.betweenRoundsMs,
    fadeEasing: config.fadeEasing,
    slideEasing: config.slideEasing,
  };
}
