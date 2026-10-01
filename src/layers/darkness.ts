import { fadeTo } from '../ui/motion';
import { createLayerElement } from './placeholder';

/** Fades the whole window to dark and back (end of the game). */
export interface DarknessControl {
  setDark(dark: boolean, fadeMs: number): void;
}

/**
 * A plain dark overlay over the whole window, above every other layer. A simple
 * placeholder for the end-of-game blackout; real effects come later.
 */
export function createDarknessLayer(): { el: HTMLElement; control: DarknessControl } {
  const el = createLayerElement('darkness');
  el.classList.add('fade');
  el.style.opacity = '0';
  const control: DarknessControl = {
    setDark(dark, fadeMs) {
      fadeTo(el, dark ? 1 : 0, fadeMs);
    },
  };
  return { el, control };
}
