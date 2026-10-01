/**
 * The round clock: ms since `round.shape.visible`, not counting time while it is paused
 * (the tab is hidden, or the debug panel paused motion). Motion, the HUD timer, latency
 * and deadlines all read it, so a hidden tab never costs the player time.
 * Pure: the caller passes in `now` (performance.now() or an event's timeStamp).
 */
export type PauseReason = 'hidden' | 'debug';

/** One debug "step frame": a 60 fps frame. */
export const DEBUG_STEP_MS = 1000 / 60;

export interface RoundClock {
  readonly started: boolean;
  readonly paused: boolean;
  /** Starts counting from 0 at `now`. */
  start(now: number): void;
  /** Elapsed round time at `now` (0 before the start). */
  elapsed(now: number): number;
  setPaused(reason: PauseReason, paused: boolean, now: number): void;
  /** Moves the clock forward by hand (debug: step one frame while paused). */
  advance(ms: number): void;
}

export function createRoundClock(): RoundClock {
  let started = false;
  /** Time counted up to `runningSince`. */
  let banked = 0;
  /** When the clock last started running; null while paused. */
  let runningSince: number | null = null;
  const reasons = new Set<PauseReason>();

  return {
    get started() {
      return started;
    },
    get paused() {
      return reasons.size > 0;
    },
    start(now) {
      started = true;
      banked = 0;
      runningSince = reasons.size > 0 ? null : now;
    },
    elapsed(now) {
      if (!started) return 0;
      return banked + (runningSince === null ? 0 : Math.max(now - runningSince, 0));
    },
    setPaused(reason, paused, now) {
      const wasPaused = reasons.size > 0;
      if (paused) reasons.add(reason);
      else reasons.delete(reason);
      const isPaused = reasons.size > 0;
      if (!started || wasPaused === isPaused) return;
      if (isPaused && runningSince !== null) {
        banked += Math.max(now - runningSince, 0);
        runningSince = null;
      } else if (!isPaused) {
        runningSince = now;
      }
    },
    advance(ms) {
      banked += ms;
    },
  };
}

/**
 * Shared between the round scene and the debug panel: the panel pauses or steps motion,
 * and reads the live round's clock.
 */
export const roundDebug: {
  /** Motion paused from the debug panel. */
  paused: boolean;
  /** Frames to step forward while paused; the round scene uses them up. */
  steps: number;
  /** The round being played, if any. */
  live: { roundId: number; elapsedMs: () => number } | null;
} = { paused: false, steps: 0, live: null };
