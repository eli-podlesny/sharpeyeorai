import { layout } from '../config/layout.config';
import { u } from '../core/units';
import { createArt, unitShare } from './art';
import { createLayerElement, placeBox } from './layer';

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
 * Left and right blast doors, clipped to the screen surface (the frame covers its edges).
 * Both images span the whole surface and meet at the seam; to open, each slides
 * `doors.openShift` out to its side, far enough that none of it is left in view.
 * Clicks always pass through to the screen (round 11 still counts clicks behind them).
 */
export function createDoorsLayer(): { el: HTMLElement; control: DoorsControl } {
  const el = createLayerElement('doors');
  const { surface, unit, doors } = layout;
  placeBox(el, surface);
  el.style.setProperty('--door-shift', u(doors.openShift));

  const halves = {} as Record<'left' | 'right', HTMLElement>;
  for (const side of ['left', 'right'] as const) {
    const art = createArt(
      side === 'left' ? 'doorLeft' : 'doorRight',
      `door door--${side}`,
      unitShare(doors.width, unit.width),
    );
    art.img.dataset.door = side;
    placeBox(art.img, {
      left: (surface.width - doors.width) / 2,
      top: (surface.height - doors.height) / 2,
      width: doors.width,
      height: doors.height,
    });
    el.append(art.el);
    halves[side] = art.img;
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
      const off = (1 - a) * doors.openShift;
      halves.left.style.transform = `translateX(${u(-off)})`;
      halves.right.style.transform = `translateX(${u(off)})`;
    },
  };
  return { el, control };
}
