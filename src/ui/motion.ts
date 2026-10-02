import { u } from '../core/units';

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Fades an element (it needs the `fade` class) to `opacity` over `ms`. Fades keep
 * their duration under prefers-reduced-motion; callers pass the shortened time.
 */
export function fadeTo(el: HTMLElement, opacity: number, ms: number, easing = 'ease'): void {
  el.style.setProperty('--fade-ms', `${ms}ms`);
  el.style.setProperty('--fade-ease', easing);
  el.style.opacity = String(opacity);
}

/**
 * Moves an element (it needs the `move` class) down by `y` design px and scales it,
 * over `ms`. `{ y: 0, scale: 1 }` is home.
 */
export function moveTo(
  el: HTMLElement,
  { y = 0, scale = 1 }: { y?: number; scale?: number },
  ms: number,
  easing = 'ease',
): void {
  el.style.setProperty('--move-ms', `${ms}ms`);
  el.style.setProperty('--move-ease', easing);
  const parts = [y !== 0 && `translateY(${u(y)})`, scale !== 1 && `scale(${scale})`];
  el.style.transform = parts.filter(Boolean).join(' ');
}

/** Makes the browser lay out `el` now, so a transition that follows starts from its current look. */
export function commitStyles(el: HTMLElement): void {
  void el.offsetWidth;
}
