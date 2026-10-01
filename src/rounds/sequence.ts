import type { ObjectiveIntroConfig, RoundSequenceConfig } from '../config/game.config';

/**
 * Before round 1, the objective is introduced once:
 *
 *   1. "Objective:" (large) fades in at the center, rising and zooming in
 *   2. a moment later the objective line fades in below it, rising
 *   3. hold
 *   4. "Objective:" fades out moving down, while the objective line moves down to its
 *      bottom place, where it stays until the end of round 12
 *
 * Times ending in `At` are ms from the start of the intro.
 */
export interface ObjectiveIntro {
  titleInMs: number;
  /** 0 with reduced motion: no rise or zoom. */
  titleMoveInMs: number;
  textDelayMs: number;
  textInMs: number;
  /** 0 with reduced motion: no rise. */
  textMoveInMs: number;
  /** Step 4 starts: everything has been fully shown for the hold time. */
  outAt: number;
  outFadeMs: number;
  /** 0 with reduced motion: the objective jumps to its place. */
  outMoveMs: number;
  /** Step 4 is done: round 1 can start. */
  endAt: number;
  inEasing: string;
  outEasing: string;
}

export function buildObjectiveIntro(
  config: ObjectiveIntroConfig,
  reducedMotionFadeMs: number,
  reducedMotion: boolean,
): ObjectiveIntro {
  const fade = (ms: number): number => (reducedMotion ? Math.min(ms, reducedMotionFadeMs) : ms);
  const move = (ms: number): number => (reducedMotion ? 0 : ms);

  const titleInMs = fade(config.titleInMs);
  const textInMs = fade(config.textInMs);
  const shownAt = Math.max(titleInMs, config.textDelayMs + textInMs);
  const outAt = shownAt + config.holdMs;
  const outFadeMs = fade(config.outMs);
  const outMoveMs = move(config.outMs);

  return {
    titleInMs,
    titleMoveInMs: move(config.titleInMs),
    textDelayMs: config.textDelayMs,
    textInMs,
    textMoveInMs: move(config.textInMs),
    outAt,
    outFadeMs,
    outMoveMs,
    endAt: outAt + Math.max(outFadeMs, outMoveMs),
    inEasing: config.inEasing,
    outEasing: config.outEasing,
  };
}

/**
 * Every round follows the same rhythm (the objective line stays put at the bottom):
 *
 *   1. the shape fades in, rising and zooming in
 *   2. the round timer starts once the shape is fully visible (clicks before are ignored)
 *   3. the click: marker + tooltip (the tooltip disappears after `loggedTooltipMs`)
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
  loggedTooltipMs: number;
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
    loggedTooltipMs: config.loggedTooltipMs,
    postClickWaitMs: config.postClickWaitMs,
    outroFadeMs: fade(config.outroFadeMs),
    betweenRoundsMs: config.betweenRoundsMs,
    fadeEasing: config.fadeEasing,
    slideEasing: config.slideEasing,
  };
}
