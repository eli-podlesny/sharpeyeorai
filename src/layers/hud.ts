import { layout } from '../config/layout.config';
import { APP_VERSION, formatVersionLabel } from '../core/version';
import { rem } from '../core/units';
import { createLayerElement } from './placeholder';

/** Logo (top center), version label (bottom center), and anything else outside the frame. */
export function createHudLayer(): HTMLElement {
  const el = createLayerElement('hud');
  const { hud } = layout;

  const logo = document.createElement('div');
  logo.className = 'hud__logo';
  logo.style.top = rem(hud.logoTop);
  logo.style.fontSize = rem(hud.logoFontSize);
  const logoAccent = document.createElement('span');
  logoAccent.className = 'hud__logo-accent';
  logoAccent.textContent = 'orAI';
  logo.append('SharpEye', logoAccent);

  const version = document.createElement('div');
  version.className = 'hud__version';
  version.style.bottom = rem(hud.versionBottom);
  version.style.fontSize = rem(hud.versionFontSize);
  version.textContent = formatVersionLabel(APP_VERSION);

  el.append(logo, version);
  return el;
}
