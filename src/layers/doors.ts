import { layout } from '../config/layout.config';
import { createLayerElement, createPlaceholderLabel, placeBox } from './placeholder';

/** Opens and closes the blast doors. */
export interface DoorsControl {
  /** Fully shut (or on their way to shut, or partly closed by `setClosedAmount`). */
  readonly isClosed: boolean;
  /** Slides the doors open or shut over `durationMs` (0 = instantly). */
  setOpen(open: boolean, durationMs: number): void;
  /**
   * Holds the doors partly closed: 0 = open, 1 = shut. For effects that close them
   * frame by frame (round 11's deadline). `setOpen` hands control back to the slide.
   */
  setClosedAmount(amount: number): void;
}

/**
 * Left and right blast-door halves, clipped to the screen viewport.
 * Each half fills 50% of the viewport and slides out sideways to open.
 * Clicks always pass through to the screen (round 11 still counts clicks behind them).
 */
export function createDoorsLayer(): { el: HTMLElement; control: DoorsControl } {
  const el = createLayerElement('doors');
  placeBox(el, layout.screen);

  const halves: Record<'left' | 'right', HTMLElement> = { left: el, right: el };
  for (const side of ['left', 'right'] as const) {
    const door = document.createElement('div');
    door.className = `door door--${side}`;
    door.dataset.door = side;
    door.append(createPlaceholderLabel(`doors · ${side}`));
    el.append(door);
    halves[side] = door;
  }

  let closed = true;

  const clearHeld = (): void => {
    halves.left.style.transform = '';
    halves.right.style.transform = '';
    el.classList.remove('is-held');
  };

  const control: DoorsControl = {
    get isClosed() {
      return closed;
    },
    setOpen(open, durationMs) {
      clearHeld();
      closed = !open;
      // Settle any change made in the same frame, so this one animates from it.
      void el.offsetWidth;
      el.style.setProperty('--door-duration', `${durationMs}ms`);
      el.classList.toggle('is-open', open);
    },
    setClosedAmount(amount) {
      const a = Math.min(Math.max(amount, 0), 1);
      closed = a > 0;
      el.classList.add('is-held');
      el.classList.remove('is-open');
      const off = (1 - a) * 100;
      halves.left.style.transform = `translateX(${-off}%)`;
      halves.right.style.transform = `translateX(${off}%)`;
    },
  };
  return { el, control };
}
