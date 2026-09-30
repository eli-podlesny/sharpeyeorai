import { createBackgroundLayer } from './background';
import { createDoorsLayer } from './doors';
import { createFrameLayer } from './frame';
import { createFrameGlowLayer } from './frameGlow';
import { createHudLayer } from './hud';
import { createScreenLayer } from './screen';
import { createVignetteLayer } from './vignette';

export interface LayerStack {
  /** Window-sized layers that live outside the stage (background, vignette). */
  viewport: HTMLElement[];
  /** Layers positioned in design pixels on the stage, bottom to top. */
  stage: HTMLElement[];
}

/** Builds all seven layers in stacking order, bottom to top. */
export function createLayerStack(): LayerStack {
  return {
    viewport: [createBackgroundLayer(), createVignetteLayer()],
    stage: [
      createFrameGlowLayer(),
      createScreenLayer(),
      createDoorsLayer(),
      createFrameLayer(),
      createHudLayer(),
    ],
  };
}
