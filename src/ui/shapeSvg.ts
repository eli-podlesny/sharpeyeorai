import { layout } from '../config/layout.config';
import type { ShapeFill } from '../config/rounds.config';
import { u } from '../core/units';
import type { Point } from '../core/stage';
import { shapePath, type PlacedShape, type Size } from '../rounds/geometry';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PENCIL_FILTER_ID = 'shape-pencil';

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  className = '',
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  if (className) el.setAttribute('class', className);
  return el;
}

function attrs<E extends Element>(el: E, values: Record<string, string | number>): E {
  for (const [k, v] of Object.entries(values)) el.setAttribute(k, String(v));
  return el;
}

/**
 * The hand-drawn outline filter, added to the page once: the line wavers a little
 * (low-frequency noise pushes it around), then a fine grain cuts into its alpha so it
 * reads as pencil or dry brush. Numbers in content px (`layout.round.pencil`), so it
 * scales with the shape. Visual only: hit-testing and scoring use the geometry.
 */
function ensurePencilFilter(): void {
  if (document.getElementById(PENCIL_FILTER_ID)) return;
  const { wobble, grain } = layout.round.pencil;
  const host = attrs(svg('svg'), { width: 0, height: 0, 'aria-hidden': 'true' });
  host.style.position = 'absolute';
  const filter = attrs(svg('filter'), {
    id: PENCIL_FILTER_ID,
    x: '-5%',
    y: '-5%',
    width: '110%',
    height: '110%',
    'color-interpolation-filters': 'sRGB',
  });
  filter.append(
    attrs(svg('feTurbulence'), {
      type: 'fractalNoise',
      baseFrequency: wobble.frequency,
      numOctaves: 2,
      seed: 3,
      result: 'wobble',
    }),
    attrs(svg('feDisplacementMap'), {
      in: 'SourceGraphic',
      in2: 'wobble',
      scale: wobble.scale,
      xChannelSelector: 'R',
      yChannelSelector: 'G',
      result: 'line',
    }),
    attrs(svg('feTurbulence'), {
      type: 'fractalNoise',
      baseFrequency: grain.frequency,
      numOctaves: 2,
      seed: 11,
      result: 'noise',
    }),
    // Noise (red channel) → alpha only: where it is low, the line breaks up.
    attrs(svg('feColorMatrix'), {
      in: 'noise',
      type: 'matrix',
      values: `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${grain.contrast} 0 0 0 ${grain.offset}`,
      result: 'grain',
    }),
    attrs(svg('feComposite'), { in: 'line', in2: 'grain', operator: 'in' }),
  );
  host.append(filter);
  document.body.append(host);
}

/**
 * A placed shape over the whole screen-content area (viewBox in screen-content px), as two
 * paths: the fill (holes are real cutouts) and the hand-drawn outline over it. Sized with
 * u() like everything in the unit.
 */
export function createShapeSvg(
  shape: PlacedShape,
  content: Size,
  options: { fill: ShapeFill; strokeWidth: number; type: string },
): SVGSVGElement {
  ensurePencilFilter();
  const root = svg('svg', `round-shape round-shape--${options.type} round-shape--${options.fill}`);
  root.setAttribute('viewBox', `0 0 ${content.width} ${content.height}`);
  root.setAttribute('aria-hidden', 'true');
  root.style.width = u(content.width);
  root.style.height = u(content.height);
  const d = shapePath(shape);
  const fill = attrs(svg('path', 'round-shape__path'), { d });
  const outline = attrs(svg('path', 'round-shape__outline'), {
    d,
    'stroke-width': options.strokeWidth,
    filter: `url(#${PENCIL_FILTER_ID})`,
  });
  root.append(fill, outline);
  return root;
}

/** Redraws a shape SVG made by `createShapeSvg` with a new outline (moving and morphing shapes). */
export function updateShapeSvg(
  root: SVGSVGElement,
  shape: Pick<PlacedShape, 'outer' | 'holes'>,
): void {
  const d = shapePath(shape);
  for (const path of root.querySelectorAll('path')) path.setAttribute('d', d);
}

/** Prints `text` centered on `at` (screen-content px) over a shape SVG (round 12's "?"). */
export function addShapeMark(root: SVGSVGElement, at: Point, text: string, fontSize: number): void {
  const mark = svg('text', 'round-shape__mark');
  mark.setAttribute('x', String(at.x));
  mark.setAttribute('y', String(at.y));
  mark.setAttribute('font-size', String(fontSize));
  mark.textContent = text;
  root.append(mark);
}
