import { layout } from '../config/layout.config';
import { createLayerElement, createPlaceholderLabel, placeBox } from './placeholder';

/** The panel surface: base color + texture overlay. Game content renders in `screen-content`. */
export function createScreenLayer(): HTMLElement {
  const el = createLayerElement('screen');
  placeBox(el, layout.screen);

  const base = document.createElement('div');
  base.className = 'screen__base';

  const texture = document.createElement('div');
  texture.className = 'screen__texture';

  const content = document.createElement('div');
  content.className = 'screen-content';

  el.append(base, texture, content, createPlaceholderLabel('screen'));
  return el;
}
