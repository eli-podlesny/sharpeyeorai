import { fadeTo } from '../ui/motion';
import { createLayerElement } from './layer';

/** How dark the whole window is: 0 = normal lighting, 1 = black. */
export interface DarknessControl {
  readonly level: number;
  /** Fades to `level` over `fadeMs` (0 = this frame; used for frame-by-frame ramps). */
  setLevel(level: number, fadeMs: number): void;
}

/**
 * A dark overlay over the whole window, above the scene (rounds 11–12 and the end of the
 * game). It is a window layer below the spotlight unit, so round 12's lit shape can sit above
 * it.
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
