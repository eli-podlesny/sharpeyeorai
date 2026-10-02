import type { ShapeFill } from '../config/rounds.config';
import { u } from '../core/units';
import { shapePath, type PlacedShape, type Size } from '../rounds/geometry';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  className = '',
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  if (className) el.setAttribute('class', className);
  return el;
}

/**
 * A placed shape as one SVG path over the whole screen-content area (viewBox in
 * screen-content px), so holes are real cutouts. Sized with u() like everything in the unit.
 */
export function createShapeSvg(
  shape: PlacedShape,
  content: Size,
  options: { fill: ShapeFill; strokeWidth: number; type: string },
): SVGSVGElement {
  const root = svg('svg', `round-shape round-shape--${options.type} round-shape--${options.fill}`);
  root.setAttribute('viewBox', `0 0 ${content.width} ${content.height}`);
  root.setAttribute('aria-hidden', 'true');
  root.style.width = u(content.width);
  root.style.height = u(content.height);
  const path = svg('path', 'round-shape__path');
  path.setAttribute('d', shapePath(shape));
  path.setAttribute('stroke-width', String(options.strokeWidth));
  root.append(path);
  return root;
}

/** Redraws a shape SVG made by `createShapeSvg` with a new outline (moving and morphing shapes). */
export function updateShapeSvg(
  root: SVGSVGElement,
  shape: Pick<PlacedShape, 'outer' | 'holes'>,
): void {
  root.querySelector('path')?.setAttribute('d', shapePath(shape));
}
