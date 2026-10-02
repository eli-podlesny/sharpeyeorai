import { layout } from '../config/layout.config';
import { rem } from '../core/units';
import { createBackgroundLayer, type BackgroundLayer } from './background';
import { createDarknessLayer, type DarknessControl } from './darkness';
import { createDoorsLayer } from './doors';
import { createFrameLayer } from './frame';
import { createFrameGlowLayer } from './frameGlow';
import { createHudLayer } from './hud';
import { createLayerElement, placeBox } from './placeholder';
import { createScreenLayer } from './screen';
import { createScreenHud, type ScreenHudControl } from './screenHud';
import { createVignetteLayer } from './vignette';
import type { DoorsControl } from './doors';

export interface LayerStack {
  /** Window-sized layers that live outside the stage (background, vignette). */
  viewport: HTMLElement[];
  /** Layers positioned in design pixels on the stage, bottom to top. */
  stage: HTMLElement[];
  background: BackgroundLayer;
  /** Frame, glow, screen and doors, which move as one piece (round 10's drop). */
  assembly: HTMLElement;
  /** The screen layer (base, texture, content, screen HUD): what the glitch distorts. */
  screen: HTMLElement;
  /** Where scenes render: inside the screen, and above the doors in the HUD. */
  screenContent: HTMLElement;
  hudScreenSlot: HTMLElement;
  /** Over the screen box, above the darkness: content that stays lit in the dark (round 12). */
  spotlight: HTMLElement;
  /** Window-sized soft ellipse that takes the alert color. */
  alertGlow: HTMLElement;
  doors: DoorsControl;
  screenHud: ScreenHudControl;
  darkness: DarknessControl;
}

/**
 * Builds the layers in stacking order, bottom to top. The screen also holds the
 * `screen-hud` (counter, progress, timer) above its content and below the doors.
 * Frame-glow, screen, doors and frame sit in the `assembly`, which turns and scales
 * as one. Above the HUD: the alert glow, the darkness, and the spotlight slot.
 */
export function createLayerStack(): LayerStack {
  const background = createBackgroundLayer();
  const screen = createScreenLayer();
  const screenHud = createScreenHud();
  screen.el.append(screenHud.el);
  const doors = createDoorsLayer();
  const hud = createHudLayer();
  const darkness = createDarknessLayer();

  const assembly = createLayerElement('assembly');
  const { origin } = layout.assembly;
  assembly.style.transformOrigin = `${rem(origin.x)} ${rem(origin.y)}`;
  assembly.append(createFrameGlowLayer(), screen.el, doors.el, createFrameLayer());

  // Two blurred ellipses, one per alert color: the pulse cross-fades them, so the heavy
  // blur is drawn once and only opacity changes per frame.
  const alertGlow = createLayerElement('alert-glow');
  alertGlow.classList.add('layer--window');
  for (const tone of ['low', 'high'] as const) {
    const ellipse = document.createElement('div');
    ellipse.className = `alert-glow__ellipse alert-glow__ellipse--${tone}`;
    ellipse.style.filter = `blur(${rem(layout.alertGlow.blur)})`;
    alertGlow.append(ellipse);
  }

  // Turns around the same stage point as the assembly, so it can follow the screen drop.
  const spotlight = createLayerElement('spotlight');
  placeBox(spotlight, layout.screen);
  spotlight.style.transformOrigin = `${rem(origin.x - layout.screen.left)} ${rem(origin.y - layout.screen.top)}`;

  return {
    viewport: [background.el, createVignetteLayer()],
    stage: [assembly, hud.el, alertGlow, darkness.el, spotlight],
    background,
    assembly,
    screen: screen.el,
    screenContent: screen.content,
    hudScreenSlot: hud.screenSlot,
    spotlight,
    alertGlow,
    doors: doors.control,
    screenHud: screenHud.control,
    darkness: darkness.control,
  };
}
