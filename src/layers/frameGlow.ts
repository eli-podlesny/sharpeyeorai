import { layout } from '../config/layout.config';
import { u } from '../core/units';
import { createArt, unitShare } from './art';
import { createLayerElement, placeBox } from './layer';

/** The frame's shadow behind it ("frame as shadow" in Figma): the frame art, darkened and blurred. */
export function createFrameGlowLayer(): HTMLElement {
  const el = createLayerElement('frame-glow');
  const { unit, frameShadow } = layout;
  placeBox(el, { left: 0, top: frameShadow.offsetY, width: unit.width, height: unit.height });

  const art = createArt('frame', 'frame-glow__art', unitShare(unit.width, unit.width));
  art.img.style.filter = `brightness(${frameShadow.brightness}) blur(${u(frameShadow.blur)})`;

  el.append(art.el);
  return el;
}
