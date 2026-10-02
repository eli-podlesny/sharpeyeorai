import { layout } from '../config/layout.config';
import { createLayerElement } from './placeholder';

const PLACEHOLDER_SRC = '/placeholders/background.svg';

/**
 * The room illustration. Centered on the window (not the stage) and at least
 * 110vw × 110vh, so it always bleeds past the edges. It is multiplied over the
 * room color token, so the tint can change without editing the image.
 */
export interface BackgroundLayer {
  el: HTMLElement;
  /** The static image. The breathing effect (src/fx/breathing.ts) draws over it in WebGL. */
  art: HTMLImageElement;
}

export function createBackgroundLayer(): BackgroundLayer {
  const el = createLayerElement('background');
  const { artWidth, artHeight, minWidthVw, minHeightVh } = layout.background;

  const img = document.createElement('img');
  img.className = 'background__art';
  img.src = PLACEHOLDER_SRC;
  img.alt = '';
  img.draggable = false;
  img.style.aspectRatio = `${artWidth} / ${artHeight}`;
  // Cover: as wide as the window needs, or as wide as the height needs, whichever is larger.
  img.style.width = `max(${minWidthVw}vw, ${minHeightVh}vh * ${artWidth / artHeight})`;

  el.append(img);
  return { el, art: img };
}
