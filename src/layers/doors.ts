import { layout } from '../config/layout.config';
import { createLayerElement, createPlaceholderLabel, placeBox } from './placeholder';

/** Opens and closes the blast doors. */
export interface DoorsControl {
  /** Slides the doors open or shut over `durationMs` (0 = instantly). */
  setOpen(open: boolean, durationMs: number): void;
}

/**
 * Left and right blast-door halves, clipped to the screen viewport.
 * Each half fills 50% of the viewport and slides out sideways to open.
 */
export function createDoorsLayer(): { el: HTMLElement; control: DoorsControl } {
  const el = createLayerElement('doors');
  placeBox(el, layout.screen);

  for (const side of ['left', 'right'] as const) {
    const door = document.createElement('div');
    door.className = `door door--${side}`;
    door.dataset.door = side;
    door.append(createPlaceholderLabel(`doors · ${side}`));
    el.append(door);
  }

  const control: DoorsControl = {
    setOpen(open, durationMs) {
      el.style.setProperty('--door-duration', `${durationMs}ms`);
      el.classList.toggle('is-open', open);
    },
  };
  return { el, control };
}
