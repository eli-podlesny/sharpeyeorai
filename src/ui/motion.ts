import { rem } from '../core/units';

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

/** Moves an element (it needs the `move` class) vertically by `designPx` over `ms`. */
export function moveY(el: HTMLElement, designPx: number, ms: number, easing = 'ease'): void {
  el.style.setProperty('--move-ms', `${ms}ms`);
  el.style.setProperty('--move-ease', easing);
  el.style.transform = designPx === 0 ? '' : `translateY(${rem(designPx)})`;
}

/** Makes the browser lay out `el` now, so a transition that follows starts from its current look. */
export function commitStyles(el: HTMLElement): void {
  void el.offsetWidth;
}
