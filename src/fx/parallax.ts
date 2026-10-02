import { gameConfig } from '../config/game.config';
import { u } from '../core/units';
import type { Point } from '../core/stage';
import { prefersReducedMotion } from '../ui/motion';

/**
 * Parallax: depth on mouse move. The background follows the pointer; the frame shadows
 * move against it (offsets in `layout.parallax`, at the window edges). Each layer gets the
 * CSS `translate` property, which is applied on top of its `transform` (the drop, the inner
 * shadow's own placement), so nothing is overridden.
 */
export interface ParallaxTarget {
  el: HTMLElement;
  /** Offset with the pointer at the right / bottom edge (+1); the left / top get the opposite. */
  max: { readonly x: number; readonly y: number };
  /** `px`: window CSS px (the background); `unit`: unit px, scaling with the frame. */
  space: 'px' | 'unit';
}

/** ln(100): after `settleMs` the eased value is 99% of the way there. */
const SETTLE_LOG = Math.log(100);

/**
 * Pure: how far (0–1) an exponential follow moves toward its target in `dtMs`, for a follow
 * that settles (99%) in `settleMs`. Frame-rate independent: two half steps make one step.
 */
export function followFactor(dtMs: number, settleMs: number): number {
  if (settleMs <= 0) return 1;
  return 1 - Math.exp((-dtMs * SETTLE_LOG) / settleMs);
}

/** Pure: a window position to −1…1 on each axis, 0 at the window center. */
export function pointerToNormalized(client: Point, width: number, height: number): Point {
  const clamp = (v: number): number => Math.min(Math.max(v, -1), 1);
  return {
    x: width > 0 ? clamp((client.x / width) * 2 - 1) : 0,
    y: height > 0 ? clamp((client.y / height) * 2 - 1) : 0,
  };
}

/** Below this (in −1…1) the layers count as settled and the loop stops writing. */
const REST = 1e-4;

export function createParallax(targets: ParallaxTarget[]): void {
  const cfg = gameConfig.fx.parallax;
  let target: Point = { x: 0, y: 0 };
  let current: Point = { x: 0, y: 0 };
  /** The pointer left the window: drift home, slowly. */
  let away = true;
  let last: number | null = null;
  let running = false;

  const write = (p: Point): void => {
    for (const t of targets) {
      const x = p.x * t.max.x;
      const y = p.y * t.max.y;
      t.el.style.translate =
        t.space === 'px' ? `${x.toFixed(2)}px ${y.toFixed(2)}px` : `${u(x)} ${u(y)}`;
    }
  };

  const frame = (now: number): void => {
    const dt = last === null ? 0 : now - last;
    last = now;
    const reduced = prefersReducedMotion();
    const goal = reduced ? { x: 0, y: 0 } : target;
    const k = reduced ? 1 : followFactor(dt, away ? cfg.leaveSettleMs : cfg.settleMs);
    current = {
      x: current.x + (goal.x - current.x) * k,
      y: current.y + (goal.y - current.y) * k,
    };
    const settled = Math.abs(goal.x - current.x) < REST && Math.abs(goal.y - current.y) < REST;
    if (settled) current = goal;
    write(current);
    if (settled) {
      running = false;
      last = null;
      return;
    }
    requestAnimationFrame(frame);
  };

  const wake = (): void => {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  };

  window.addEventListener('pointermove', (e) => {
    away = false;
    target = pointerToNormalized(
      { x: e.clientX, y: e.clientY },
      window.innerWidth,
      window.innerHeight,
    );
    wake();
  });
  // Leaving the window (no element to go to): the layers drift back to the center.
  document.documentElement.addEventListener('pointerleave', () => {
    away = true;
    target = { x: 0, y: 0 };
    wake();
  });
  window.addEventListener('blur', () => {
    away = true;
    target = { x: 0, y: 0 };
    wake();
  });
}
