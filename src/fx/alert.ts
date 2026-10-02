import { gameConfig } from '../config/game.config';
import { alertPulseAt, createTween } from './schedule';

/** Alert mode: the room color pulses between the two alert tokens, and a soft glow takes it too. */
export interface AlertFx {
  readonly active: boolean;
  /** Fades in or out over `fx.alert.rampMs`, or over `rampMs` when given (0 = at once). */
  setActive(active: boolean, now: number, rampMs?: number): void;
  /** Pulse period from now on; the pulse carries on from where it is, without a jump. */
  setPeriod(periodMs: number): void;
  /** Call every frame. */
  update(now: number): void;
}

/**
 * Drives two numbers on the app element: `--alert-mix` (the pulse between `--alert-low`
 * and `--alert-high`, period `fx.alert.periodMs`, faster in round 11) and `--alert-ramp` (how far alert covers
 * the normal room color; it fades in and out over `fx.alert.rampMs`). The colors stay in
 * tokens; CSS mixes them. No hard flashing: the pulse is a slow sine.
 * The glow is a window-sized, heavily blurred ellipse at `fx.alert.glowOpacity`, letting
 * clicks through. It holds one ellipse per alert color and fades the high one in and out
 * with the pulse (the same mix as the room color), so the blur never has to be redrawn.
 */
export function createAlert(app: HTMLElement, glow: HTMLElement): AlertFx {
  const cfg = gameConfig.fx.alert;
  const ramp = createTween(0);
  let active = false;
  /** Pulse position in periods (0 = dark); it advances at the current period. */
  let phase = 0;
  let lastNow: number | null = null;
  let periodMs = cfg.periodMs;
  let idle = true;
  const high = glow.querySelector<HTMLElement>('.alert-glow__ellipse--high');

  return {
    get active() {
      return active;
    },
    setActive(next, now, rampMs = cfg.rampMs) {
      if (next === active) return;
      active = next;
      if (next && ramp.value(now) === 0) {
        phase = 0;
        lastNow = now;
      }
      ramp.setTarget(next ? 1 : 0, now, rampMs);
      idle = false;
    },
    setPeriod(ms) {
      periodMs = ms;
    },
    update(now) {
      if (idle) return;
      const r = ramp.value(now);
      if (!active && r === 0) {
        app.style.removeProperty('--alert-mix');
        app.style.removeProperty('--alert-ramp');
        glow.style.opacity = '0';
        if (high) high.style.opacity = '0';
        idle = true;
        lastNow = null;
        return;
      }
      phase += (now - (lastNow ?? now)) / periodMs;
      lastNow = now;
      const pulse = alertPulseAt(phase, 1);
      app.style.setProperty('--alert-mix', (pulse * 100).toFixed(2));
      app.style.setProperty('--alert-ramp', (r * 100).toFixed(2));
      glow.style.opacity = (r * cfg.glowOpacity).toFixed(4);
      if (high) high.style.opacity = pulse.toFixed(4);
    },
  };
}
