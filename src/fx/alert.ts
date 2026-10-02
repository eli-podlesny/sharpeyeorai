import { gameConfig } from '../config/game.config';
import { alertPulseAt, createTween } from './schedule';

/** Alert mode: the room color pulses between the two alert tokens, and a soft glow takes it too. */
export interface AlertFx {
  readonly active: boolean;
  setActive(active: boolean, now: number): void;
  /** Call every frame. */
  update(now: number): void;
}

/**
 * Drives two numbers on the app element: `--alert-mix` (the pulse between `--alert-low`
 * and `--alert-high`, period `fx.alert.periodMs`) and `--alert-ramp` (how far alert covers
 * the normal room color; it fades in and out over `fx.alert.rampMs`). The colors stay in
 * tokens; CSS mixes them. No hard flashing: the pulse is a slow sine.
 * The glow is a window-sized ellipse at `fx.alert.glowOpacity`, letting clicks through.
 */
export function createAlert(app: HTMLElement, glow: HTMLElement): AlertFx {
  const cfg = gameConfig.fx.alert;
  const ramp = createTween(0);
  let active = false;
  let pulseStart = 0;
  let idle = true;

  return {
    get active() {
      return active;
    },
    setActive(next, now) {
      if (next === active) return;
      active = next;
      if (next && ramp.value(now) === 0) pulseStart = now;
      ramp.setTarget(next ? 1 : 0, now, cfg.rampMs);
      idle = false;
    },
    update(now) {
      if (idle) return;
      const r = ramp.value(now);
      if (!active && r === 0) {
        app.style.removeProperty('--alert-mix');
        app.style.removeProperty('--alert-ramp');
        glow.style.opacity = '0';
        idle = true;
        return;
      }
      const pulse = alertPulseAt(now - pulseStart, cfg.periodMs);
      app.style.setProperty('--alert-mix', (pulse * 100).toFixed(2));
      app.style.setProperty('--alert-ramp', (r * 100).toFixed(2));
      glow.style.opacity = (r * cfg.glowOpacity).toFixed(4);
    },
  };
}
