import type { RoundSequenceConfig } from '../config/game.config';

/**
 * Every round follows the same rhythm:
 *
 *   1. the shape fades in, rising and zooming in; a moment later the objective fades in and slides up
 *      into its bottom position
 *   2. the round timer starts once the shape is fully visible (clicks before are ignored)
 *   3. the click: marker + tooltip; the objective starts fading out right away
 *   4. wait
 *   5. shape and marker fade out together, the shape zooming out in place
 *   6. pause, then the next round starts at step 1
 *
 * Step 1 counts from the start of the round; steps 4–6 count from the click.
 */
export interface RoundSequence {
  shapeFadeInMs: number;
  /** The shape rises and zooms in over this time; 0 with reduced motion. */
  shapeMoveInMs: number;
  /** The shape zooms out over this time while fading out; 0 with reduced motion. */
  shapeMoveOutMs: number;
  objectiveDelayMs: number;
  objectiveFadeInMs: number;
  /** 0 with reduced motion: the objective appears in place. */
  objectiveSlideMs: number;
  objectiveFadeOutMs: number;
  postClickWaitMs: number;
  outroFadeMs: number;
  betweenRoundsMs: number;
  fadeEasing: string;
  slideEasing: string;
}

/** Turns the configured timings into the round's schedule. Reduced motion: short fades, no movement. */
export function buildRoundSequence(
  config: RoundSequenceConfig,
  reducedMotion: boolean,
): RoundSequence {
  const fade = (ms: number): number =>
    reducedMotion ? Math.min(ms, config.reducedMotionFadeMs) : ms;

  return {
    shapeFadeInMs: fade(config.shapeFadeInMs),
    shapeMoveInMs: reducedMotion ? 0 : config.shapeFadeInMs,
    shapeMoveOutMs: reducedMotion ? 0 : config.outroFadeMs,
    objectiveDelayMs: config.objectiveDelayMs,
    objectiveFadeInMs: fade(config.objectiveInMs),
    objectiveSlideMs: reducedMotion ? 0 : config.objectiveInMs,
    objectiveFadeOutMs: fade(config.objectiveOutMs),
    postClickWaitMs: config.postClickWaitMs,
    outroFadeMs: fade(config.outroFadeMs),
    betweenRoundsMs: config.betweenRoundsMs,
    fadeEasing: config.fadeEasing,
    slideEasing: config.slideEasing,
  };
}
