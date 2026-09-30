import { layout } from '../config/layout.config';
import { createLayerElement, createPlaceholderLabel, placeBox } from './placeholder';

/**
 * Left and right blast-door halves, clipped to the screen viewport.
 * Each half fills 50% of the viewport. Opening (sliding apart) arrives in a later version.
 */
export function createDoorsLayer(): HTMLElement {
  const el = createLayerElement('doors');
  placeBox(el, layout.screen);

  for (const side of ['left', 'right'] as const) {
    const door = document.createElement('div');
    door.className = `door door--${side}`;
    door.dataset.door = side;
    door.append(createPlaceholderLabel(`doors · ${side}`));
    el.append(door);
  }
  return el;
}
