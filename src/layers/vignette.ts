import { layout } from '../config/layout.config';
import { createLayerElement } from './layer';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Soft darkening toward the window edges: Figma's radial gradient ("vignette overlay"),
 * drawn in its 1440 × 900 frame and stretched to the window like Figma stretches it.
 * Color and opacity come from the `--vignette-color` token.
 */
export function createVignetteLayer(): HTMLElement {
  const el = createLayerElement('vignette');
  const v = layout.vignette;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${v.frame.width} ${v.frame.height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');

  const gradient = document.createElementNS(SVG_NS, 'radialGradient');
  gradient.id = 'vignette-gradient';
  gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
  gradient.setAttribute('cx', '0');
  gradient.setAttribute('cy', '0');
  gradient.setAttribute('r', String(v.radius));
  gradient.setAttribute('gradientTransform', `matrix(${v.matrix.join(' ')})`);
  for (const [offset, opacity] of [
    [v.clearUntil, 0],
    [1, 1],
  ] as const) {
    const stop = document.createElementNS(SVG_NS, 'stop');
    stop.setAttribute('offset', String(offset));
    stop.style.stopColor = 'var(--vignette-color)';
    stop.style.stopOpacity = String(opacity);
    gradient.append(stop);
  }

  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('width', '100%');
  rect.setAttribute('height', '100%');
  rect.setAttribute('fill', 'url(#vignette-gradient)');

  const defs = document.createElementNS(SVG_NS, 'defs');
  defs.append(gradient);
  svg.append(defs, rect);
  el.append(svg);
  return el;
}
