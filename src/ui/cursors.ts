import { cursorFiles, type CursorKey } from '../assets/manifest';
import { layout } from '../config/layout.config';

/** The browser's own cursor for each metal one, when the images are refused. */
const NATIVE: Record<CursorKey, string> = {
  default: 'default',
  pointer: 'pointer',
  pointerDown: 'pointer',
  notAllowed: 'not-allowed',
};

/** CSS variable names, read by the cursor rules in base.css. */
const VAR: Record<CursorKey, string> = {
  default: '--cursor-default',
  pointer: '--cursor-pointer',
  pointerDown: '--cursor-pointer-down',
  notAllowed: '--cursor-not-allowed',
};

/**
 * Pure: the `cursor` values to try for one metal cursor, best first: `image-set` (1× and 2×),
 * the prefixed `-webkit-image-set` (Safari), then the 1× image alone. Each ends with the
 * native cursor, so a browser that fails to load the image still shows something.
 */
export function cursorCandidates(key: CursorKey): string[] {
  const { x1, x2 } = cursorFiles[key];
  const { x, y } = layout.systemCursor[key];
  const native = NATIVE[key];
  const set = `url("${x1}") 1x, url("${x2}") 2x`;
  return [
    `image-set(${set}) ${x} ${y}, ${native}`,
    `-webkit-image-set(${set}) ${x} ${y}, ${native}`,
    `url("${x1}") ${x} ${y}, ${native}`,
  ];
}

/**
 * The metal pixel cursors (`assets-src/ui/cursors/`, copied by `npm run assets`): writes
 * one CSS variable per cursor on the root, with the first form this browser accepts, or
 * its native cursor. base.css uses them: default everywhere, pointer on buttons and
 * links, pointer-down while pressed, not-allowed on disabled controls. Over the screen
 * during a round the orange in-screen cursor takes over (src/ui/screenCursor.ts).
 */
export function initCursors(): void {
  const root = document.documentElement;
  for (const key of Object.keys(cursorFiles) as CursorKey[]) {
    const value = cursorCandidates(key).find((v) => CSS.supports('cursor', v)) ?? NATIVE[key];
    root.style.setProperty(VAR[key], value);
  }
}
