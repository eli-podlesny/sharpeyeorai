import { copy } from '../config/copy';
import { layout } from '../config/layout.config';
import { APP_VERSION, formatVersionLabel } from '../core/version';
import { createLayerElement, createUnitBox, placeBox } from './layer';

/**
 * The HUD in two layers. `back` is the viewport HUD: the logo (top center) and version
 * label (bottom center), in fixed px, never scaled; it sits below the screen unit, so the
 * frame passes over them when the screen drops. `el` is a unit box on top: `screenSlot`
 * covers the opening above the doors and frame, where scenes put controls that must show
 * while the doors are shut (Start).
 */
export function createHudLayer(): { el: HTMLElement; back: HTMLElement; screenSlot: HTMLElement } {
  const el = createUnitBox('hud');
  const back = createLayerElement('hud-back');
  const { logo: L, version: V } = layout.viewport;

  const logo = document.createElement('div');
  logo.className = 'hud__logo';
  logo.style.top = `${L.top}px`;
  logo.style.fontSize = `${L.fontSize}px`;
  logo.style.lineHeight = `${L.lineHeight}px`;
  const logoAccent = document.createElement('span');
  logoAccent.className = 'hud__logo-accent';
  logoAccent.textContent = copy.hud.logoAccent;
  logo.append(copy.hud.logo, logoAccent);

  const version = document.createElement('div');
  version.className = 'hud__version';
  version.style.bottom = `${V.bottom}px`;
  version.style.fontSize = `${V.fontSize}px`;
  version.style.lineHeight = `${V.lineHeight}px`;
  version.textContent = formatVersionLabel(APP_VERSION);

  const screenSlot = document.createElement('div');
  screenSlot.className = 'hud__screen-slot';
  placeBox(screenSlot, layout.opening);

  back.append(logo, version);
  el.append(screenSlot);
  return { el, back, screenSlot };
}
