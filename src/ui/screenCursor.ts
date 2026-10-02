import { gameConfig, type ScreenCursorConfig } from '../config/game.config';
import { layout } from '../config/layout.config';
import { getRound } from '../config/rounds.config';
import type { EventBus } from '../core/events';
import { contentSize, toContentCoords } from '../core/input';
import type { Point } from '../core/stage';
import { liveRound } from '../rounds/clock';
import { acceptsClick } from '../rounds/timing';
import { prefersReducedMotion } from './motion';
import { svg } from './shapeSvg';

const C = layout.screenCursor;

/**
 * The orange in-screen cursor (Figma "custom cursor"): brackets on the pointer and a dot
 * that trails behind. It shows during a round while the pointer is over the screen opening;
 * the system cursor is hidden there meanwhile. While the round ignores clicks (after the
 * click, its intro and outro) only the brackets show: the dot is the "you can click" sign.
 * Visual only: clicks are scored where the pointer is (the brackets' center), never the dot.
 */

/** Live-tunable feel, from the debug panel. Starts from `gameConfig.screenCursor`. */
export const cursorTuning: ScreenCursorConfig & { maxHalf: number } = {
  ...gameConfig.screenCursor,
  maxHalf: C.maxHalf,
};

/** The last measured pointer speed (CSS px per second), for the debug panel. */
export const cursorReadout = { speed: 0 };

/** Pure: an exponential follow over `dtMs` with time constant `tauMs` (frame-rate independent). */
export function follow(current: number, target: number, dtMs: number, tauMs: number): number {
  if (tauMs <= 0) return target;
  return target + (current - target) * Math.exp(-dtMs / tauMs);
}

/** Pure: `offset` shortened, if needed, to at most `max` long. */
export function clampOffset(offset: Point, max: number): Point {
  const length = Math.hypot(offset.x, offset.y);
  if (length <= max || length === 0) return offset;
  return { x: (offset.x / length) * max, y: (offset.y / length) * max };
}

/**
 * Pure: the spread (0–1) after `dtMs`, moving toward the spread its speed asks for: slowly
 * while growing (`attackMs`), quickly while shrinking (`releaseMs`).
 */
export function spreadStep(
  spread: number,
  speed: number,
  dtMs: number,
  tuning: Pick<ScreenCursorConfig, 'attackMs' | 'releaseMs' | 'fullSpreadSpeed'>,
): number {
  const target = Math.min(Math.max(speed / tuning.fullSpreadSpeed, 0), 1);
  return follow(spread, target, dtMs, target > spread ? tuning.attackMs : tuning.releaseMs);
}

/** The eight bracket bars for a square `half` from the center, bars `bar` long ending `gap` from it. */
export function bracketBars(
  half: number,
  bar: number,
  gap: number,
  t: number,
): { x: number; y: number; width: number; height: number }[] {
  const bars = [];
  for (const side of [-1, 1]) {
    const edge = side < 0 ? -half : half - t;
    for (const end of [-1, 1]) {
      const from = end < 0 ? -gap - bar : gap;
      bars.push({ x: edge, y: from, width: t, height: bar }); // left / right
      bars.push({ x: from, y: edge, width: bar, height: t }); // top / bottom
    }
  }
  return bars;
}

/** Off the opening (or no round): `none`. Over it: `active` (clicks count) or `idle` (brackets only). */
type Zone = 'none' | 'idle' | 'active';

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

export function createScreenCursor(bus: EventBus): void {
  const root = document.documentElement;
  const el = document.createElement('div');
  el.className = 'screen-cursor';
  el.setAttribute('aria-hidden', 'true');
  el.hidden = true;

  const box = (C.maxHalf + C.thickness) * 2;
  const brackets = svg('svg', 'screen-cursor__brackets');
  brackets.setAttribute('viewBox', `${-box / 2} ${-box / 2} ${box} ${box}`);
  brackets.setAttribute('width', String(box));
  brackets.setAttribute('height', String(box));
  const rects = Array.from({ length: 8 }, () => svg('rect'));
  brackets.append(...rects);

  const dotBox = (C.dot.maxR + C.dot.stroke) * 2;
  const dot = svg('svg', 'screen-cursor__dot');
  dot.setAttribute('viewBox', `${-dotBox / 2} ${-dotBox / 2} ${dotBox} ${dotBox}`);
  dot.setAttribute('width', String(dotBox));
  dot.setAttribute('height', String(dotBox));
  const ring = svg('circle');
  ring.setAttribute('stroke-width', String(C.dot.stroke));
  dot.append(ring);
  el.append(dot, brackets);
  document.body.append(el);

  let pointer: Point | null = null;
  let dotAt: Point = { x: 0, y: 0 };
  let moved = 0;
  let speed = 0;
  let spread = 0;
  let pressedUntil = 0;
  let last: number | null = null;
  let zone: Zone = 'none';
  /** The round whose shape is visible and not yet decided (null otherwise). */
  let openRound: number | null = null;

  const setZone = (next: Zone): void => {
    if (next === zone) return;
    const was = zone;
    zone = next;
    if (next === 'none') delete root.dataset.screenCursor;
    else root.dataset.screenCursor = 'custom';
    el.hidden = next === 'none';
    dot.style.visibility = next === 'active' ? '' : 'hidden';
    // Fresh each time it appears: no trail from where it was last seen.
    if (pointer && was === 'none') spread = 0;
    if (pointer && next === 'active') dotAt = { ...pointer };
  };

  /** Over the opening, does the round take clicks right now? */
  const zoneFor = (p: Point | null, now: number): Zone => {
    if (!p) return 'none';
    const c = toContentCoords(p.x, p.y);
    const inside = c.x >= 0 && c.y >= 0 && c.x <= contentSize.width && c.y <= contentSize.height;
    if (!inside || liveRound.current === null) return 'none';
    if (now < pressedUntil) return 'active';
    const live = liveRound.current;
    const taking =
      openRound === live.roundId && acceptsClick(getRound(live.roundId), live.elapsedMs());
    return taking ? 'active' : 'idle';
  };

  const draw = (pressed: boolean): void => {
    if (!pointer) return;
    const half = pressed ? C.pressedHalf : lerp(C.half, cursorTuning.maxHalf, spread);
    const bar = pressed ? C.bar : lerp(C.bar, C.maxBar, spread);
    const gap = pressed ? C.pressedGap : C.gap;
    bracketBars(half, bar, gap, C.thickness).forEach((b, i) => {
      const r = rects[i];
      if (!r) return;
      r.setAttribute('x', b.x.toFixed(2));
      r.setAttribute('y', b.y.toFixed(2));
      r.setAttribute('width', b.width.toFixed(2));
      r.setAttribute('height', b.height.toFixed(2));
    });
    ring.setAttribute(
      'r',
      (pressed ? C.dot.pressedR : lerp(C.dot.r, C.dot.maxR, spread)).toFixed(2),
    );
    brackets.style.transform = `translate(${pointer.x - box / 2}px, ${pointer.y - box / 2}px)`;
    dot.style.transform = `translate(${dotAt.x - dotBox / 2}px, ${dotAt.y - dotBox / 2}px)`;
  };

  const frame = (now: number): void => {
    const dt = last === null ? 0 : Math.min(now - last, 100);
    last = now;
    const reduced = prefersReducedMotion();
    if (dt > 0) {
      speed = follow(speed, moved / (dt / 1000), dt, cursorTuning.speedSmoothingMs);
      moved = 0;
    }
    cursorReadout.speed = speed;
    setZone(zoneFor(pointer, now));
    if (zone !== 'none' && pointer) {
      if (reduced) {
        dotAt = { ...pointer };
        spread = 0;
      } else {
        dotAt = {
          x: follow(dotAt.x, pointer.x, dt, cursorTuning.dotLagMs),
          y: follow(dotAt.y, pointer.y, dt, cursorTuning.dotLagMs),
        };
        const off = clampOffset({ x: dotAt.x - pointer.x, y: dotAt.y - pointer.y }, C.maxDotOffset);
        dotAt = { x: pointer.x + off.x, y: pointer.y + off.y };
        spread = spreadStep(spread, speed, dt, cursorTuning);
      }
      draw(now < pressedUntil);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  window.addEventListener('pointermove', (e) => {
    if (pointer) moved += Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y);
    pointer = { x: e.clientX, y: e.clientY };
  });
  document.documentElement.addEventListener('pointerleave', () => {
    pointer = null;
    setZone('none');
  });
  // Pressed: a quick snap in. Captured first, before the round decides on the click.
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (zone === 'active' && e.button === 0) {
        pressedUntil = performance.now() + cursorTuning.pressedMs;
      }
    },
    { capture: true },
  );

  bus.on('round.shape.visible', ({ roundId }) => (openRound = roundId));
  bus.on('round.click', () => (openRound = null));
  bus.on('round.timeout', () => (openRound = null));
  bus.on('round.intro.start', () => (openRound = null));
  bus.on('state.change', () => (openRound = null));
}
