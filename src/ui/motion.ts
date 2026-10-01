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

/** Makes the browser lay out `el` now, so a transition that follows starts from its current look. */
export function commitStyles(el: HTMLElement): void {
  void el.offsetWidth;
}
