import { gameConfig, type GlitchPattern } from '../config/game.config';
import type { SceneMode } from '../core/state';

/**
 * Pure timing rules for the scene effects. The controller (sceneController.ts) and the
 * effect modules read the clock and call these; tests check them without a browser.
 */

/** The scene mode a round plays in (`gameConfig.fx.modeByRound`). */
export function sceneModeForRound(roundId: number): SceneMode {
  const modes = gameConfig.fx.modeByRound;
  const i = Math.min(Math.max(Math.round(roundId), 1), modes.length) - 1;
  return modes[i] ?? 'normal';
}

/** Breathing strength per scene mode: off when normal, subtle when distorted, strong after. */
export function breathingForMode(mode: SceneMode): 'off' | 'subtle' | 'strong' {
  if (mode === 'normal') return 'off';
  if (mode === 'distorted') return 'subtle';
  return 'strong';
}

/** Alert pulse and glow run in alert mode and keep running into the blackout. */
export function alertForMode(mode: SceneMode): boolean {
  return mode === 'alert' || mode === 'blackout';
}

/**
 * Whether a repeating glitch is on at time t (ms since the pattern started). Each cycle
 * starts calm (`offMs`), then glitches (`onMs`), so a round never opens on a glitch.
 */
export function glitchActiveAt(pattern: GlitchPattern, t: number): boolean {
  if (t < 0) return false;
  const period = pattern.onMs + pattern.offMs;
  return t % period >= pattern.offMs;
}

/** Which cycle of the pattern time t is in (0 for the first). */
export function glitchCycleAt(pattern: GlitchPattern, t: number): number {
  return Math.floor(Math.max(t, 0) / (pattern.onMs + pattern.offMs));
}

/**
 * Photosensitivity guard: a glitch burst (one dip in brightness and back) may only start
 * if the last one started at least 1000 / maxPerSecond ms ago.
 */
export interface FlashLimiter {
  /** True (and counted) if a burst may start at `now`. */
  tryStart(now: number): boolean;
}

export function createFlashLimiter(maxPerSecond: number): FlashLimiter {
  const minGapMs = 1000 / maxPerSecond;
  let last = -Infinity;
  return {
    tryStart(now) {
      if (now - last < minGapMs) return false;
      last = now;
      return true;
    },
  };
}

/** After an early click in round 11: closing hurries to the end from where it was. */
export interface SpeedUp {
  /** How far the doors were closed at the click (0–1). */
  fromAmount: number;
  /** ms since the click (real time). */
  elapsedMs: number;
  durationMs: number;
}

/**
 * Round 11: how far the doors are closed (0 open – 1 shut) at round time t. Closing runs
 * linearly over the time limit, so it is complete exactly at the deadline. After an early
 * click it runs from where it was to fully closed over `speedUp.durationMs`.
 */
export function closingAmount(t: number, limitMs: number, speedUp: SpeedUp | null): number {
  if (speedUp) {
    const k = speedUp.durationMs > 0 ? speedUp.elapsedMs / speedUp.durationMs : 1;
    return clamp01(speedUp.fromAmount + (1 - speedUp.fromAmount) * clamp01(k));
  }
  return limitMs > 0 ? clamp01(t / limitMs) : 1;
}

export type BreathPhase = 'waiting' | 'rising' | 'holding' | 'falling' | 'done';

/**
 * Round 12's last breath at `t` ms from its start (negative = not yet): the lights rise,
 * hold and fall back to black (`fx.lastBreath`).
 */
export function breathPhaseAt(
  t: number,
  cfg: { riseMs: number; holdMs: number; fallMs: number } = gameConfig.fx.lastBreath,
): BreathPhase {
  if (t < 0) return 'waiting';
  if (t < cfg.riseMs) return 'rising';
  if (t < cfg.riseMs + cfg.holdMs) return 'holding';
  if (t < cfg.riseMs + cfg.holdMs + cfg.fallMs) return 'falling';
  return 'done';
}

/** How long the last breath lasts, rise to fall. */
export function breathDurationMs(cfg = gameConfig.fx.lastBreath): number {
  return cfg.riseMs + cfg.holdMs + cfg.fallMs;
}

/** When the last breath is over, in ms from a round 12 click (it starts `delayAfterClickMs` after it). */
export function breathEndAfterClickMs(cfg = gameConfig.fx.lastBreath): number {
  return cfg.delayAfterClickMs + breathDurationMs(cfg);
}

/** Brightness pulse of the alert, 0 (#111) → 1 (orange) → 0, smooth, starting dark. */
export function alertPulseAt(t: number, periodMs: number): number {
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / periodMs);
}

/**
 * A value that eases to a new target over a fixed time (smoothstep), starting from
 * wherever it is, even mid-way through a previous change.
 */
export interface Tween {
  value(now: number): number;
  readonly target: number;
  setTarget(target: number, now: number, durationMs: number): void;
}

export function createTween(initial: number): Tween {
  let from = initial;
  let to = initial;
  let start = 0;
  let duration = 0;
  const value = (now: number): number => {
    if (duration <= 0) return to;
    const k = clamp01((now - start) / duration);
    return from + (to - from) * k * k * (3 - 2 * k);
  };
  return {
    value,
    get target() {
      return to;
    },
    setTarget(target, now, durationMs) {
      if (target === to) return;
      from = value(now);
      to = target;
      start = now;
      duration = durationMs;
    },
  };
}

export function clamp01(v: number): number {
  return Math.min(Math.max(v, 0), 1);
}
