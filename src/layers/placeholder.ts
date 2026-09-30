import type { Box } from '../config/layout.config';
import { rem } from '../core/units';

/** Creates a layer element with a stable class and data attribute. */
export function createLayerElement(name: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `layer layer--${name}`;
  el.dataset.layer = name;
  return el;
}

/** Positions an element on the stage using a design-pixel box. */
export function placeBox(el: HTMLElement, box: Box): void {
  el.style.left = rem(box.left);
  el.style.top = rem(box.top);
  el.style.width = rem(box.width);
  el.style.height = rem(box.height);
}

/** Small printed name inside a placeholder block. Removed when real art lands (v1.1). */
export function createPlaceholderLabel(text: string): HTMLSpanElement {
  const label = document.createElement('span');
  label.className = 'placeholder-label';
  label.textContent = text;
  return label;
}
