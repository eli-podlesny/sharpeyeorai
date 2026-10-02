import { layout, type Box } from '../config/layout.config';
import { u } from '../core/units';
import { createArt, unitShare } from './art';
import { createLayerElement, placeBox } from './layer';

/** The opening, relative to the screen surface: where screen content and the screen HUD sit. */
export const openingInSurface: Box = {
  left: layout.opening.left - layout.surface.left,
  top: layout.opening.top - layout.surface.top,
  width: layout.opening.width,
  height: layout.opening.height,
};

/**
 * The panel surface: base color over a blurred view of the room, game content, and the
 * texture in overlay on top of it all (shapes and the screen HUD included). Game content
 * renders in `screen-content`, which covers the opening (game coordinates). Put the
 * screen HUD in with `addAboveContent`, so it stays under the texture.
 */
export function createScreenLayer(): {
  el: HTMLElement;
  content: HTMLElement;
  addAboveContent(el: HTMLElement): void;
} {
  const el = createLayerElement('screen');
  const { surface, unit, screenSurface } = layout;
  placeBox(el, surface);

  const base = document.createElement('div');
  base.className = 'screen__base';
  base.style.backdropFilter = `blur(${u(screenSurface.backdropBlur)})`;

  const texture = createArt(
    'screenTexture',
    'screen__texture',
    unitShare(surface.width, unit.width),
  );
  texture.img.style.opacity = String(screenSurface.textureOpacity);

  const content = document.createElement('div');
  content.className = 'screen-content';
  placeBox(content, openingInSurface);

  el.append(base, content, texture.el);
  return {
    el,
    content,
    addAboveContent(child) {
      el.insertBefore(child, texture.el);
    },
  };
}
