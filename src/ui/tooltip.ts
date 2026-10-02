import { layout } from '../config/layout.config';
import type { Point } from '../core/stage';
import { setU, u } from '../core/units';
import { h } from './dom';

const { tooltip: T } = layout;

export interface TooltipContent {
  /** Bold first line, e.g. "Sample 04, logged" or "Copied". */
  title: string;
  lines?: readonly string[];
  /** Let long text wrap at `layout.tooltip.maxWidth` instead of staying on one line. */
  wrap?: boolean;
  /** Open up-right of the point instead of down-right (e.g. above a row of buttons). */
  above?: boolean;
}

function createTooltip(content: TooltipContent): HTMLElement {
  const tip = h('div', content.wrap ? 'tooltip tooltip--wrap' : 'tooltip');
  setU(tip, { fontSize: T.fontSize, lineHeight: T.lineHeight });
  if (content.wrap) tip.style.maxWidth = u(T.maxWidth);
  tip.style.padding = `${u(T.paddingY)} ${u(T.paddingX)}`;
  tip.setAttribute('role', 'status');
  tip.append(h('div', 'tooltip__title', content.title));
  for (const line of content.lines ?? []) tip.append(h('div', '', line));
  return tip;
}

/**
 * The one tooltip of the game (in-round "logged" sample, score screen "Copied").
 * Placed in `container` at a point in its design pixels, offset down-right (or up-right
 * with `above`), and flipped to the other side of the point if it would stick out of
 * the container.
 */
export function showTooltip(
  container: HTMLElement,
  at: Point,
  content: TooltipContent,
): HTMLElement {
  const tip = createTooltip(content);
  setU(tip, { left: at.x + T.offsetX, top: at.y + T.offsetY });
  container.append(tip);

  const flipY = (): void => {
    tip.style.top = u(at.y - T.offsetY);
    tip.classList.add('tooltip--flip-y');
  };
  if (content.above) flipY();

  const box = tip.getBoundingClientRect();
  const bounds = container.getBoundingClientRect();
  if (box.right > bounds.right) {
    tip.style.left = u(at.x - T.offsetX);
    tip.classList.add('tooltip--flip-x');
  }
  if (!content.above && box.bottom > bounds.bottom) flipY();
  return tip;
}

/**
 * The same tooltip pinned to a fixed spot: `right` and `top` (or `bottom`) design px from
 * the container's edges.
 */
export function showTooltipAtCorner(
  container: HTMLElement,
  corner: { right: number; top: number } | { right: number; bottom: number },
  content: TooltipContent,
): HTMLElement {
  const tip = createTooltip(content);
  setU(tip, corner);
  container.append(tip);
  return tip;
}
