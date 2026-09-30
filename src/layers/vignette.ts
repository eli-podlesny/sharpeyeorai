import { createLayerElement, createPlaceholderLabel } from './placeholder';

/** Soft darkening at the window edges. Covers the whole window. */
export function createVignetteLayer(): HTMLElement {
  const el = createLayerElement('vignette');
  el.append(createPlaceholderLabel('vignette'));
  return el;
}
