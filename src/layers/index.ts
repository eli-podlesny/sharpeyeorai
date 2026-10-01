import { createBackgroundLayer } from './background';
import { createDoorsLayer } from './doors';
import { createFrameLayer } from './frame';
import { createFrameGlowLayer } from './frameGlow';
import { createHudLayer } from './hud';
import { createScreenLayer } from './screen';
import { createVignetteLayer } from './vignette';
import type { DoorsControl } from './doors';

export interface LayerStack {
  /** Window-sized layers that live outside the stage (background, vignette). */
  viewport: HTMLElement[];
  /** Layers positioned in design pixels on the stage, bottom to top. */
  stage: HTMLElement[];
  /** Where scenes render: inside the screen, and above the doors in the HUD. */
  screenContent: HTMLElement;
  hudScreenSlot: HTMLElement;
  doors: DoorsControl;
}

/** Builds all seven layers in stacking order, bottom to top. */
export function createLayerStack(): LayerStack {
  const screen = createScreenLayer();
  const doors = createDoorsLayer();
  const hud = createHudLayer();
  return {
    viewport: [createBackgroundLayer(), createVignetteLayer()],
    stage: [createFrameGlowLayer(), screen.el, doors.el, createFrameLayer(), hud.el],
    screenContent: screen.content,
    hudScreenSlot: hud.screenSlot,
    doors: doors.control,
  };
}
