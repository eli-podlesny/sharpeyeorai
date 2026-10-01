import type { RoundSequenceConfig } from '../config/game.config';

/**
 * Every round follows the same rhythm:
 *
 *   1. "Test #N" and the objective fade in at the center
 *   2. hold
 *   3. "Test #N" fades out while the objective moves to the bottom
 *   4. the shape fades in
 *   5. the round timer starts once the shape is fully visible (clicks before are ignored)
 *   6. the click: marker + tooltip
 *   7. wait
 *   8. objective, shape and marker fade out together
 *   9. the next round starts at step 1
 *
 * Times ending in `At` are ms from the start of the intro (step 1). The outro times
 * count from the click.
 */
export interface RoundSequence {
  titleFadeInMs: number;
  titleFadeOutAt: number;
  titleFadeOutMs: number;
  objectiveMoveMs: number;
  /** Step 3 is done: title gone, objective at the bottom. */
  introEndAt: number;
  shapeFadeInMs: number;
  /** Step 5: the shape is fully visible and the timer starts. */
  shapeVisibleAt: number;
  postClickWaitMs: number;
  outroFadeMs: number;
  fadeEasing: string;
  moveEasing: string;
}

/** Turns the configured timings into the round's schedule. Reduced motion: instant moves, short fades. */
export function buildRoundSequence(
  config: RoundSequenceConfig,
  reducedMotion: boolean,
): RoundSequence {
  const fade = (ms: number): number =>
    reducedMotion ? Math.min(ms, config.reducedMotionFadeMs) : ms;

  const titleFadeInMs = fade(config.introFadeMs);
  const titleFadeOutMs = fade(config.titleFadeOutMs);
  const objectiveMoveMs = reducedMotion ? 0 : config.objectiveMoveMs;
  const titleFadeOutAt = titleFadeInMs + config.holdMs;
  const introEndAt = titleFadeOutAt + Math.max(titleFadeOutMs, objectiveMoveMs);
  const shapeFadeInMs = fade(config.shapeFadeInMs);

  return {
    titleFadeInMs,
    titleFadeOutAt,
    titleFadeOutMs,
    objectiveMoveMs,
    introEndAt,
    shapeFadeInMs,
    shapeVisibleAt: introEndAt + shapeFadeInMs,
    postClickWaitMs: config.postClickWaitMs,
    outroFadeMs: fade(config.outroFadeMs),
    fadeEasing: config.fadeEasing,
    moveEasing: config.moveEasing,
  };
}
