import type { RoundConfig } from '../config/rounds.config';

/**
 * When a round accepts clicks, when it gives up, when it ends and when its shape shows.
 * Every time is in ms from `round.shape.visible`, on the round clock (see clock.ts).
 */

/** A time range [from, to) in which clicks count. */
export type InputWindow = readonly [from: number, to: number];

/** A shape that is shown only for a while, then fades away (round 12). */
export interface HideAfter {
  /** Total time the shape is visible, the fade-out included. */
  visibleMs: number;
  /** The fade-out at the end of `visibleMs`. */
  fadeMs: number;
}

/** A dot that blinks on the shape right after it is fully visible, as a distraction (round 5). */
export interface DecoyConfig {
  /** Which center it marks: C (toward the machine answer) or O. It follows the shape as it morphs. */
  target: 'computed' | 'optical';
  blinks: number;
  onMs: number;
  offMs: number;
}

/** No click after this → timeout. The time limit or the end of the last input window, whichever comes first. */
export function inputDeadlineMs(round: RoundConfig): number | null {
  const windowEnd = round.inputWindows?.length
    ? Math.max(...round.inputWindows.map(([, to]) => to))
    : null;
  const limits = [round.timeLimitMs, windowEnd].filter((ms): ms is number => ms !== null);
  return limits.length ? Math.min(...limits) : null;
}

/** Whether a click at time t counts. */
export function acceptsClick(round: RoundConfig, t: number): boolean {
  if (t < 0) return false;
  const deadline = inputDeadlineMs(round);
  if (deadline !== null && t >= deadline) return false;
  if (!round.inputWindows?.length) return true;
  return round.inputWindows.some(([from, to]) => t >= from && t < to);
}

/**
 * Rounds with `postRoundIdleMs` run a fixed length, click or not: input closes at the
 * deadline, then input is ignored for the idle time, then the round ends. Null for
 * rounds that end on the click (or the timeout).
 */
export function fixedRoundEndMs(round: RoundConfig): number | null {
  if (round.postRoundIdleMs === undefined) return null;
  return (inputDeadlineMs(round) ?? 0) + round.postRoundIdleMs;
}

/** Shape opacity at time t: 1, except for rounds whose shape hides after a while. */
export function shapeOpacityAt(round: RoundConfig, t: number): number {
  const hide = round.hideAfter;
  if (!hide) return 1;
  const fadeStart = hide.visibleMs - hide.fadeMs;
  if (t <= fadeStart) return 1;
  if (t >= hide.visibleMs || hide.fadeMs <= 0) return 0;
  return 1 - (t - fadeStart) / hide.fadeMs;
}

/** Whether the decoy dot is lit at time t. It blinks once per cycle, `blinks` times, then never again. */
export function decoyLitAt(decoy: DecoyConfig, t: number): boolean {
  const cycle = decoy.onMs + decoy.offMs;
  if (t < 0 || t >= decoy.blinks * cycle) return false;
  return t % cycle < decoy.onMs;
}
