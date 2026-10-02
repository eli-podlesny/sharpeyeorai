import { copy } from '../config/copy';
import { layout } from '../config/layout.config';
import { APP_VERSION, formatVersionLabel } from '../core/version';
import { rem } from '../core/units';
import { createLayerElement, placeBox } from './placeholder';

/**
 * The HUD in two layers. `back` holds the logo (top center) and the version label (bottom
 * center); it sits below the screen assembly, so the frame passes over them when the
 * screen drops. `el` is on top: `screenSlot` covers the screen box above the doors and
 * frame, where scenes put controls that must show while the doors are shut (Start).
 */
export function createHudLayer(): { el: HTMLElement; back: HTMLElement; screenSlot: HTMLElement } {
  const el = createLayerElement('hud');
  const back = createLayerElement('hud-back');
  const { hud } = layout;

  const logo = document.createElement('div');
  logo.className = 'hud__logo';
  logo.style.top = rem(hud.logoTop);
  logo.style.fontSize = rem(hud.logoFontSize);
  const logoAccent = document.createElement('span');
  logoAccent.className = 'hud__logo-accent';
  logoAccent.textContent = copy.hud.logoAccent;
  logo.append(copy.hud.logo, logoAccent);

  const version = document.createElement('div');
  version.className = 'hud__version';
  version.style.bottom = rem(hud.versionBottom);
  version.style.fontSize = rem(hud.versionFontSize);
  version.textContent = formatVersionLabel(APP_VERSION);

  const screenSlot = document.createElement('div');
  screenSlot.className = 'hud__screen-slot';
  placeBox(screenSlot, layout.screen);

  back.append(logo, version);
  el.append(screenSlot);
  return { el, back, screenSlot };
}
