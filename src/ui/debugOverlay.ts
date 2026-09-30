import { getScale, toStageCoords } from '../core/stage';

/** Physical key (same spot on any layout) or the typed character. */
const TOGGLE_CODE = 'Backquote';
const TOGGLE_CHAR = '`';

/**
 * Developer overlay, hidden by default. The backtick key (`) toggles it.
 * Shows the scale factor, window size and live stage coordinates of the mouse.
 */
export function initDebugOverlay(): void {
  const el = document.createElement('div');
  el.className = 'debug-overlay';
  el.hidden = true;
  el.setAttribute('aria-live', 'off');
  document.body.append(el);

  let mouse = { x: NaN, y: NaN };

  const render = (): void => {
    if (el.hidden) return;
    const stage = Number.isNaN(mouse.x) ? '—' : `${mouse.x.toFixed(1)}, ${mouse.y.toFixed(1)}`;
    el.textContent = [
      `scale   ${getScale().toFixed(4)}`,
      `window  ${window.innerWidth} × ${window.innerHeight}`,
      `stage   ${stage}`,
    ].join('\n');
  };

  window.addEventListener('keydown', (e) => {
    if (e.repeat || (e.code !== TOGGLE_CODE && e.key !== TOGGLE_CHAR)) return;
    el.hidden = !el.hidden;
    render();
  });

  window.addEventListener('mousemove', (e) => {
    mouse = toStageCoords(e.clientX, e.clientY);
    render();
  });

  window.addEventListener('resize', render);
}
