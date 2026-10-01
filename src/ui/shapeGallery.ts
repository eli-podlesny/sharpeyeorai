import { layout } from '../config/layout.config';
import { freeScreenArea, rounds } from '../config/rounds.config';
import type { Point } from '../core/stage';
import { contentSize } from '../core/input';
import { bounds } from '../rounds/polygon';
import { shapeSeed, type GameSession } from '../rounds/session';
import { roundTarget } from '../rounds/target';
import { h } from './dom';
import { createShapeSvg, svg } from './shapeSvg';

/** Marker size in screen-content px (the thumbnails are scaled down from the full screen). */
const MARKER_PX = 18;
const MARKER_STROKE_PX = 3;
const ESCAPE = 'Escape';

const pad2 = (n: number): string => String(n).padStart(2, '0');

function marker(kind: 'computed' | 'optical' | 'pole', at: Point): SVGElement {
  const r = MARKER_PX / 2;
  const g = svg('g', `gallery-marker gallery-marker--${kind}`);
  g.setAttribute('stroke-width', String(MARKER_STROKE_PX));
  // A dark halo underneath keeps the marker readable on light and dark fills.
  const halo = (shape: SVGElement): SVGElement => {
    const under = shape.cloneNode() as SVGElement;
    under.setAttribute('class', 'gallery-marker__halo');
    under.setAttribute('stroke-width', String(MARKER_STROKE_PX * 2));
    return under;
  };
  if (kind === 'computed') {
    const path = svg('path');
    path.setAttribute('d', `M${at.x - r} ${at.y}H${at.x + r}M${at.x} ${at.y - r}V${at.y + r}`);
    g.append(halo(path), path);
  } else if (kind === 'optical') {
    const circle = svg('circle');
    circle.setAttribute('cx', String(at.x));
    circle.setAttribute('cy', String(at.y));
    circle.setAttribute('r', String(r));
    g.append(halo(circle), circle);
  } else {
    const rect = svg('rect');
    rect.setAttribute('x', String(at.x - r));
    rect.setAttribute('y', String(at.y - r));
    rect.setAttribute('width', String(MARKER_PX));
    rect.setAttribute('height', String(MARKER_PX));
    g.append(halo(rect), rect);
  }
  return g;
}

function rectEl(
  className: string,
  box: { left: number; top: number; width: number; height: number },
): SVGRectElement {
  const el = svg('rect', className);
  el.setAttribute('x', String(box.left));
  el.setAttribute('y', String(box.top));
  el.setAttribute('width', String(box.width));
  el.setAttribute('height', String(box.height));
  return el;
}

/**
 * Debug view: all 12 rounds side by side, each as a thumbnail of the whole screen with
 * its shape where the game puts it, plus C (cross), O (circle) and M (square). The dashed
 * box is the free area round 7 fills. Uses the current session's shape seeds.
 */
export function openShapeGallery(session: GameSession): void {
  const el = h('div', 'shape-gallery');
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Shape gallery');

  const header = h('div', 'shape-gallery__header');
  const legend = h(
    'span',
    '',
    `seed ${session.seed} — cross C (material centroid) · circle O (optical) · square M (pole) · dashed: free area`,
  );
  const close = h('button', 'debug-overlay__button', 'close');
  close.type = 'button';
  header.append(legend, close);

  const grid = h('div', 'shape-gallery__grid');
  for (const round of rounds) {
    const target = roundTarget(round, contentSize, shapeSeed(session, round.id));
    const box = bounds(target.shape.outer);
    const cell = h('figure', 'shape-gallery__cell');
    const art = createShapeSvg(target.shape, contentSize, {
      fill: round.fill,
      strokeWidth: layout.round.shapeBorder,
      type: round.shape.type,
    });
    art.classList.add('shape-gallery__art');
    art.style.width = '';
    art.style.height = '';
    art.prepend(
      rectEl('shape-gallery__screen', { left: 0, top: 0, ...contentSize }),
      rectEl('shape-gallery__free', freeScreenArea()),
    );
    const { C, M, O } = target.centers;
    art.append(marker('computed', C), marker('pole', M), marker('optical', O));

    const caption = h(
      'figcaption',
      '',
      `${pad2(round.id)} ${round.shape.type} · ${Math.round(box.width)}×${Math.round(box.height)}` +
        ` · R ${Math.round(target.falloffRadius)} · |O−C| ${Math.hypot(O.x - C.x, O.y - C.y).toFixed(1)}`,
    );
    cell.append(art, caption);
    grid.append(cell);
  }

  el.append(header, grid);
  document.body.append(el);
  close.focus();

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === ESCAPE) remove();
  };
  const remove = (): void => {
    el.remove();
    window.removeEventListener('keydown', onKey);
  };
  close.addEventListener('click', remove);
  window.addEventListener('keydown', onKey);
}
