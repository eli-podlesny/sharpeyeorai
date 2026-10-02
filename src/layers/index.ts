import { layout, REFERENCE_WINDOW_HEIGHT } from '../config/layout.config';
import { createBackgroundLayer, type BackgroundLayer } from './background';
import { createDarknessLayer, type DarknessControl } from './darkness';
import { createDoorsLayer } from './doors';
import { createFrameLayer } from './frame';
import { createFrameGlowLayer } from './frameGlow';
import { createHudLayer } from './hud';
import { createLayerElement, createUnitBox, placeBox } from './layer';
import { createScreenLayer, openingInSurface } from './screen';
import { createScreenHud, type ScreenHudControl } from './screenHud';
import { createVignetteLayer } from './vignette';
import type { DoorsControl } from './doors';

export interface LayerStack {
  /** Every layer, bottom to top, to append to the app. */
  all: HTMLElement[];
  background: BackgroundLayer;
  /** The screen unit: frame, shadows, screen and doors, which move as one piece (the drop). */
  assembly: HTMLElement;
  /** The screen layer (base, content, screen HUD, texture): what the glitch distorts. */
  screen: HTMLElement;
  /** Where scenes render: inside the screen opening, and above the doors in the HUD. */
  screenContent: HTMLElement;
  hudScreenSlot: HTMLElement;
  /** Over the opening, above the darkness: content that stays lit in the dark (round 12). */
  spotlight: HTMLElement;
  /** The unit box holding `spotlight`: it follows the drop. */
  spotlightUnit: HTMLElement;
  /** The HUD's unit box, above the frame (also holds the debug layout outlines). */
  hudUnit: HTMLElement;
  /** Window-sized soft ellipse that takes the alert color. */
  alertGlow: HTMLElement;
  doors: DoorsControl;
  screenHud: ScreenHudControl;
  darkness: DarknessControl;
}

/**
 * Builds the layers in stacking order, bottom to top. The screen also holds the
 * `screen-hud` (counter, progress, timer) above its content and below the doors.
 * Frame shadow, screen, doors and frame sit in the unit (`assembly`), which drops as one.
 * Above the HUD: the alert glow, the darkness, and the spotlight slot.
 */
export function createLayerStack(): LayerStack {
  const background = createBackgroundLayer();
  const screen = createScreenLayer();
  const screenHud = createScreenHud();
  placeBox(screenHud.el, openingInSurface);
  screen.addAboveContent(screenHud.el);
  const doors = createDoorsLayer([screen.content, screenHud.el]);
  const hud = createHudLayer();
  const darkness = createDarknessLayer();

  const assembly = createUnitBox('assembly');
  assembly.append(createFrameGlowLayer(), screen.el, doors.el, createFrameLayer());

  // Two blurred ellipses, one per alert color: the pulse cross-fades them, so the heavy
  // blur is drawn once and only opacity changes per frame. Blur scales with the window height.
  const alertGlow = createLayerElement('alert-glow');
  alertGlow.classList.add('layer--window');
  const blurVh = (layout.alertGlow.blur / REFERENCE_WINDOW_HEIGHT) * 100;
  for (const tone of ['low', 'high'] as const) {
    const ellipse = document.createElement('div');
    ellipse.className = `alert-glow__ellipse alert-glow__ellipse--${tone}`;
    ellipse.style.filter = `blur(${blurVh}vh)`;
    alertGlow.append(ellipse);
  }

  // A second unit box above the darkness, moved with the screen unit, so the lit shape
  // sits exactly on the (dropped) screen.
  const spotlightUnit = createUnitBox('spotlight-unit');
  const spotlight = createLayerElement('spotlight');
  placeBox(spotlight, layout.opening);
  spotlightUnit.append(spotlight);

  return {
    all: [
      background.el,
      createVignetteLayer(),
      hud.back,
      assembly,
      hud.el,
      alertGlow,
      darkness.el,
      spotlightUnit,
    ],
    background,
    assembly,
    screen: screen.el,
    screenContent: screen.content,
    hudScreenSlot: hud.screenSlot,
    spotlight,
    spotlightUnit,
    hudUnit: hud.el,
    alertGlow,
    doors: doors.control,
    screenHud: screenHud.control,
    darkness: darkness.control,
  };
}
