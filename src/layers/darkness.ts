import { fadeTo } from '../ui/motion';
import { createLayerElement } from './placeholder';

/** How dark the whole window is: 0 = normal lighting, 1 = black. */
export interface DarknessControl {
  readonly level: number;
  /** Fades to `level` over `fadeMs` (0 = this frame; used for frame-by-frame ramps). */
  setLevel(level: number, fadeMs: number): void;
}

/**
 * A dark overlay over the whole window, above the scene (rounds 11–12 and the end of the
 * game). It lives on the stage so that the `spotlight` layer can sit above it; it is sized
 * in vw/vh to cover the window whatever the stage scale.
 */
export function createDarknessLayer(): { el: HTMLElement; control: DarknessControl } {
  const el = createLayerElement('darkness');
  el.classList.add('fade', 'layer--window');
  el.style.opacity = '0';
  let level = 0;
  const control: DarknessControl = {
    get level() {
      return level;
    },
    setLevel(next, fadeMs) {
      level = Math.min(Math.max(next, 0), 1);
      fadeTo(el, level, fadeMs);
    },
  };
  return { el, control };
}
