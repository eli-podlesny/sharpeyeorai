import { createBackgroundLayer } from './background';
import { createDarknessLayer, type DarknessControl } from './darkness';
import { createDoorsLayer } from './doors';
import { createFrameLayer } from './frame';
import { createFrameGlowLayer } from './frameGlow';
import { createHudLayer } from './hud';
import { createScreenLayer } from './screen';
import { createScreenHud, type ScreenHudControl } from './screenHud';
import { createVignetteLayer } from './vignette';
import type { DoorsControl } from './doors';

export interface LayerStack {
  /** Window-sized layers that live outside the stage (background, vignette). */
  viewport: HTMLElement[];
  /** Layers positioned in design pixels on the stage, bottom to top. */
  stage: HTMLElement[];
  /** Window-sized layers above the stage (the end-of-game darkness). */
  overViewport: HTMLElement[];
  /** Where scenes render: inside the screen, and above the doors in the HUD. */
  screenContent: HTMLElement;
  hudScreenSlot: HTMLElement;
  doors: DoorsControl;
  screenHud: ScreenHudControl;
  darkness: DarknessControl;
}

/**
 * Builds all seven layers in stacking order, bottom to top. The screen also holds the
 * `screen-hud` (counter, progress, timer) above its content and below the doors.
 */
export function createLayerStack(): LayerStack {
  const screen = createScreenLayer();
  const screenHud = createScreenHud();
  screen.el.append(screenHud.el);
  const doors = createDoorsLayer();
  const hud = createHudLayer();
  const darkness = createDarknessLayer();
  return {
    viewport: [createBackgroundLayer(), createVignetteLayer()],
    stage: [createFrameGlowLayer(), screen.el, doors.el, createFrameLayer(), hud.el],
    overViewport: [darkness.el],
    screenContent: screen.content,
    hudScreenSlot: hud.screenSlot,
    doors: doors.control,
    screenHud: screenHud.control,
    darkness: darkness.control,
  };
}
