import { layout } from '../config/layout.config';
import { rem } from '../core/units';
import { createLayerElement, createPlaceholderLabel, placeBox } from './placeholder';

/**
 * The metal frame, on top of the screen edges. The placeholder is a border whose
 * thickness is worked out from the frame and screen boxes, so the middle stays open.
 */
export function createFrameLayer(): HTMLElement {
  const el = createLayerElement('frame');
  const { frame, screen } = layout;
  placeBox(el, frame);

  const overlap = frame.screenOverlap;
  const top = screen.top - frame.top + overlap;
  const left = screen.left - frame.left + overlap;
  const right = frame.left + frame.width - (screen.left + screen.width) + overlap;
  const bottom = frame.top + frame.height - (screen.top + screen.height) + overlap;
  const ring = document.createElement('div');
  ring.className = 'frame__ring';
  ring.style.borderWidth = [top, right, bottom, left].map(rem).join(' ');

  el.append(ring, createPlaceholderLabel('frame'));
  return el;
}
