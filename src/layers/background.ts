import { manifest } from '../assets/manifest';
import { layout } from '../config/layout.config';
import { createArt } from './art';
import { createLayerElement } from './layer';

/**
 * The room illustration. Covers the window plus `bgOverscan` on every side (room for
 * parallax and distortion later), so it never shows an edge. It is multiplied over the
 * room color, so the tint can change without editing the image.
 */
export interface BackgroundLayer {
  el: HTMLElement;
  /** The static image. The breathing effect (src/fx/breathing.ts) draws over it in WebGL. */
  art: HTMLImageElement;
}

export function createBackgroundLayer(): BackgroundLayer {
  const el = createLayerElement('background');
  const { width, height } = manifest.background;
  const ratio = width / height;
  const cover = 1 + 2 * layout.viewport.bgOverscan;

  // Cover the layer: as wide as the layer, or as wide as its height needs, whichever is larger.
  const art = createArt('background', 'background__art', (win) =>
    Math.max(cover * win.width, cover * win.height * ratio),
  );
  art.img.style.aspectRatio = `${width} / ${height}`;
  art.img.style.width = `max(100%, ${cover * 100}vh * ${ratio})`;

  el.append(art.el);
  return { el, art: art.img };
}
