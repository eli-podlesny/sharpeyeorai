import type { Box } from '../config/layout.config';
import { u } from '../core/units';

/** Creates a layer element with a stable class and data attribute. */
export function createLayerElement(name: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `layer layer--${name}`;
  el.dataset.layer = name;
  return el;
}

/**
 * A frame-shaped box fitted to the window (`.unit` in layers.css): the screen unit itself,
 * and the boxes above the darkness and the HUD that must line up with it exactly.
 * It is a size container, so everything inside can be sized with `u()`.
 */
export function createUnitBox(name: string): HTMLDivElement {
  const el = createLayerElement(name);
  el.classList.add('unit');
  return el;
}

/** Positions an element inside a unit, from a box in unit reference px. */
export function placeBox(el: HTMLElement, box: Box): void {
  el.style.left = u(box.left);
  el.style.top = u(box.top);
  el.style.width = u(box.width);
  el.style.height = u(box.height);
}
