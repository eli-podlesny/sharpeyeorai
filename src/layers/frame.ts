import { layout } from '../config/layout.config';
import { u } from '../core/units';
import { createArt, unitShare } from './art';
import { createLayerElement, placeBox } from './layer';

/**
 * The metal frame, on top of the screen edges, with its inner shadow just below it
 * ("frame inner shadow" in Figma): the same art, nearly black, smaller, higher and faint,
 * so the opening's edge darkens over the doors and the screen.
 */
export function createFrameLayer(): HTMLElement {
  const el = createLayerElement('frame');
  const { unit, frameInnerShadow: shadow } = layout;
  placeBox(el, { left: 0, top: 0, width: unit.width, height: unit.height });
  const width = unitShare(unit.width, unit.width);

  const inner = createArt('frame', 'frame__inner-shadow', width);
  inner.img.style.transform = `translateY(${u(shadow.offsetY)}) scale(${shadow.scale})`;
  inner.img.style.filter = `brightness(${shadow.brightness}) blur(${u(shadow.blur)})`;
  inner.img.style.opacity = String(shadow.opacity);

  const art = createArt('frame', 'frame__art', width);

  el.append(inner.el, art.el);
  return el;
}
