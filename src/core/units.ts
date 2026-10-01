import { REM_BASE_PX } from '../config/layout.config';

/** Converts design pixels to a CSS rem string. Everything on the stage is sized this way. */
export function rem(designPx: number): string {
  return `${designPx / REM_BASE_PX}rem`;
}

export type RemProperty =
  | 'left'
  | 'top'
  | 'right'
  | 'bottom'
  | 'width'
  | 'height'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'gap'
  | 'borderWidth';

/** Sets several design-pixel style values at once, converted to rem. */
export function setRem(el: HTMLElement, values: Partial<Record<RemProperty, number>>): void {
  for (const [prop, px] of Object.entries(values) as [RemProperty, number][]) {
    el.style[prop] = rem(px);
  }
}
