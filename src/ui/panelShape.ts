import { layout } from '../config/layout.config';
import { computeUnitRect, unitScale } from '../core/stage';
import type { Size } from '../rounds/geometry';
import { ensurePencilFilter, PENCIL_FILTER_ID, svg } from './shapeSvg';

/**
 * Pure: the outline of a hand-drawn panel `size` px big (unit px), corners cut `cut` px
 * at the top-left and bottom-right (Figma "tooltip logged" and "tooltip chat").
 */
export function panelPath({ width: w, height: h }: Size, cut: number): string {
  const c = Math.min(cut, w / 2, h / 2);
  return `M${c} 0H${w}V${h - c}L${w - c} ${h}H0V${c}Z`;
}

/**
 * The panel art behind a sample tooltip or chat message: the fill, and over it the
 * `layout.panel.border` px outline drawn with the shapes' pencil filter (src/ui/shapeSvg.ts),
 * so it looks drawn by hand like the shapes. `dividerY`: a hand-drawn line across at that
 * height. In unit px (viewBox), filling its parent box; pointer-events none.
 */
export function createPanelSvg(size: Size, options: { dividerY?: number } = {}): SVGSVGElement {
  ensurePencilFilter();
  const { cut, border } = layout.panel;
  const root = svg('svg', 'panel-shape');
  root.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);
  root.setAttribute('preserveAspectRatio', 'none');
  root.setAttribute('aria-hidden', 'true');
  const outline = panelPath(size, cut);
  const fill = svg('path', 'panel-shape__fill');
  fill.setAttribute('d', outline);
  // The divider is a subpath of the outline: one filtered path, so the filter region is
  // the whole panel (a lone horizontal line has no height, and its filter would draw nothing).
  const line = svg('path', 'panel-shape__line');
  const divider = options.dividerY === undefined ? '' : `M0 ${options.dividerY}H${size.width}`;
  line.setAttribute('d', outline + divider);
  line.setAttribute('stroke-width', String(border));
  line.setAttribute('filter', `url(#${PENCIL_FILTER_ID})`);
  root.append(fill, line);
  return root;
}

/**
 * Draws the panel behind `el`, a box that hugs its content (a chat message): measures it
 * once it is in the page, in unit px (its size scales with the unit, so it never needs
 * measuring again), and puts the panel art in it as its first child.
 */
export function fitPanel(el: HTMLElement): void {
  const scale = unitScale(computeUnitRect(window.innerWidth, window.innerHeight).height);
  const size = { width: el.offsetWidth / scale, height: el.offsetHeight / scale };
  el.querySelector(':scope > .panel-shape')?.remove();
  el.prepend(createPanelSvg(size));
}
