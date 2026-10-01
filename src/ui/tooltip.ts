import { layout } from '../config/layout.config';
import { toContentCoords } from '../core/input';
import type { Point } from '../core/stage';
import { rem, setRem } from '../core/units';
import { h } from './dom';

const { tooltip: T } = layout;

export interface TooltipContent {
  /** Bold first line, e.g. "Sample 04, logged" or "Copied". */
  title: string;
  lines?: readonly string[];
  /** Let long text wrap at `layout.tooltip.maxWidth` instead of staying on one line. */
  wrap?: boolean;
}

/**
 * The one tooltip of the game (in-round "logged" sample, score screen "Copied").
 * Placed in `container` at a point in its design pixels, offset down-right, and flipped
 * to the other side of the point if it would stick out of the container.
 */
export function showTooltip(
  container: HTMLElement,
  at: Point,
  content: TooltipContent,
): HTMLElement {
  const tip = h('div', content.wrap ? 'tooltip tooltip--wrap' : 'tooltip');
  setRem(tip, {
    left: at.x + T.offsetX,
    top: at.y + T.offsetY,
    fontSize: T.fontSize,
    lineHeight: T.lineHeight,
  });
  if (content.wrap) tip.style.maxWidth = rem(T.maxWidth);
  tip.style.padding = `${rem(T.paddingY)} ${rem(T.paddingX)}`;
  tip.setAttribute('role', 'status');
  tip.append(h('div', 'tooltip__title', content.title));
  for (const line of content.lines ?? []) tip.append(h('div', '', line));
  container.append(tip);

  const box = tip.getBoundingClientRect();
  const bounds = container.getBoundingClientRect();
  if (box.right > bounds.right) {
    tip.style.left = rem(at.x - T.offsetX);
    tip.classList.add('tooltip--flip-x');
  }
  if (box.bottom > bounds.bottom) {
    tip.style.top = rem(at.y - T.offsetY);
    tip.classList.add('tooltip--flip-y');
  }
  return tip;
}

/**
 * The point beside an element's right edge (vertically centered), in screen-content
 * pixels. Use it to anchor a tooltip next to a button.
 */
export function besideElement(el: HTMLElement): Point {
  const box = el.getBoundingClientRect();
  return toContentCoords(box.right, box.top + box.height / 2);
}
