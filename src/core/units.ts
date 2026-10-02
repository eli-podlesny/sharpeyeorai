import { UNIT_HEIGHT } from '../config/layout.config';

/**
 * Converts unit reference px (the frame at its Figma size, 772 px tall) to container
 * units of the unit (`cqh`), so it scales with the frame. Everything inside a `.unit`
 * box is sized this way. Only valid on elements inside a `.unit`: on the unit itself, or
 * outside one, `cqh` would fall back to the window.
 */
export function u(refPx: number): string {
  return `${+((refPx * 100) / UNIT_HEIGHT).toFixed(4)}cqh`;
}

export type UnitProperty =
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

/** Sets several reference-px style values at once, converted with `u()`. */
export function setU(el: HTMLElement, values: Partial<Record<UnitProperty, number>>): void {
  for (const [prop, px] of Object.entries(values) as [UnitProperty, number][]) {
    el.style[prop] = u(px);
  }
}
