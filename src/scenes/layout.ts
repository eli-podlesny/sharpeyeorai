import { layout } from '../config/layout.config';
import { rem, setRem } from '../core/units';
import { h } from '../ui/dom';

/** A centered column for the simple placeholder scenes (ready, loading, calculating, score). */
export function createPanel(modifier: string): HTMLDivElement {
  const panel = h('div', `scene-panel scene-panel--${modifier}`);
  setRem(panel, { gap: layout.scenes.gap, fontSize: layout.scenes.textSize });
  return panel;
}

export function createTitle(text: string): HTMLHeadingElement {
  const title = h('h2', 'scene-title', text);
  setRem(title, { fontSize: layout.scenes.titleSize });
  return title;
}

export function createButton(label: string): HTMLButtonElement {
  const { button } = layout.scenes;
  const el = h('button', 'scene-button', label);
  el.type = 'button';
  setRem(el, { fontSize: button.fontSize, borderWidth: button.border });
  el.style.padding = `${rem(button.paddingY)} ${rem(button.paddingX)}`;
  return el;
}
