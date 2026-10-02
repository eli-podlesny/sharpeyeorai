import { gameConfig } from '../config/game.config';
import { layout } from '../config/layout.config';
import type { Point } from '../core/stage';
import { alertPulseAt, createTween } from './schedule';

/** Alert mode: the room color pulses between the two alert tokens, and a soft glow takes it too. */
export interface AlertFx {
  readonly active: boolean;
  /** Fades in or out over `fx.alert.rampMs`, or over `rampMs` when given (0 = at once). */
  setActive(active: boolean, now: number, rampMs?: number): void;
  /** Pulse period from now on; the pulse carries on from where it is, without a jump. */
  setPeriod(periodMs: number): void;
  /**
   * Focused (rounds 10–12): the alert color gathers around the screen instead of covering
   * the whole room, and the glow shrinks onto it. Eases over `fx.alert.focusMs`, or `ms`.
   */
  setFocus(focused: boolean, now: number, ms?: number): void;
  /** Call every frame. */
  update(now: number): void;
}

/**
 * Drives two numbers on the app element: `--alert-mix` (the pulse between `--alert-low`
 * and `--alert-high`, period `fx.alert.periodMs`, faster in round 11) and `--alert-ramp` (how far alert covers
 * the normal room color; it fades in and out over `fx.alert.rampMs`). The colors stay in
 * tokens; CSS mixes them. No hard flashing: the pulse is a slow sine.
 * The glow is a window-sized, heavily blurred ellipse at `fx.alert.glowOpacity`, letting
 * clicks through. Focused, both center on the screen (`screenCenter`, in window px, so they
 * follow it when it has dropped): `--alert-focus` (0–1) and `--alert-cx/-cy` let CSS turn the
 * flat room color into a radial one, and the glow moves there and shrinks
 * (`layout.alertGlow.focus`). It holds one ellipse per alert color and fades the high one in and out
 * with the pulse (the same mix as the room color), so the blur never has to be redrawn.
 */
export function createAlert(
  app: HTMLElement,
  glow: HTMLElement,
  screenCenter: () => Point,
): AlertFx {
  const cfg = gameConfig.fx.alert;
  const ramp = createTween(0);
  const focus = createTween(0);
  const { focus: reach } = layout.alertGlow;
  app.style.setProperty('--alert-focus-core', `${reach.coreVmax}vmax`);
  app.style.setProperty('--alert-focus-edge', `${reach.edgeVmax}vmax`);
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
    setFocus(focused, now, ms = cfg.focusMs) {
      focus.setTarget(focused ? 1 : 0, now, ms);
    },
    update(now) {
      if (idle) return;
      const r = ramp.value(now);
      if (!active && r === 0) {
        app.style.removeProperty('--alert-mix');
        app.style.removeProperty('--alert-ramp');
        app.style.removeProperty('--alert-focus');
        glow.style.opacity = '0';
        glow.style.transform = '';
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

      const f = focus.value(now);
      if (f > 0) {
        const c = screenCenter();
        app.style.setProperty('--alert-focus', f.toFixed(4));
        app.style.setProperty('--alert-cx', `${c.x.toFixed(1)}px`);
        app.style.setProperty('--alert-cy', `${c.y.toFixed(1)}px`);
        const dx = (c.x - window.innerWidth / 2) * f;
        const dy = (c.y - window.innerHeight / 2) * f;
        const scale = 1 + (layout.alertGlow.focus.glowScale - 1) * f;
        glow.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${scale.toFixed(4)})`;
      } else {
        app.style.removeProperty('--alert-focus');
        glow.style.transform = '';
      }
    },
  };
}
