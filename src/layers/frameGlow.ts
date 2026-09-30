import { layout } from '../config/layout.config';
import { rem } from '../core/units';
import { createLayerElement, createPlaceholderLabel, placeBox } from './placeholder';

/** Blurred copy of the frame, sitting behind it. */
export function createFrameGlowLayer(): HTMLElement {
  const el = createLayerElement('frame-glow');
  placeBox(el, layout.frame);

  const glow = document.createElement('div');
  glow.className = 'frame-glow__blur';
  glow.style.filter = `blur(${rem(layout.frameGlow.blur)})`;

  el.append(glow, createPlaceholderLabel('frame-glow'));
  return el;
}
