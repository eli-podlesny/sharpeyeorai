import { copy } from '../config/copy';
import { layout } from '../config/layout.config';
import { APP_VERSION, formatVersionLabel } from '../core/version';
import { rem } from '../core/units';
import { createLayerElement, placeBox } from './placeholder';

/**
 * Logo (top center), version label (bottom center), and anything else outside the frame.
 * `screenSlot` covers the screen box above the doors and frame: scenes put controls
 * there that must show while the doors are shut (the Start button).
 */
export function createHudLayer(): { el: HTMLElement; screenSlot: HTMLElement } {
  const el = createLayerElement('hud');
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

  el.append(logo, version, screenSlot);
  return { el, screenSlot };
}
