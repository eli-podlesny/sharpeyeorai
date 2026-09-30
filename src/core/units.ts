import { REM_BASE_PX } from '../config/layout.config';

/** Converts design pixels to a CSS rem string. Everything on the stage is sized this way. */
export function rem(designPx: number): string {
  return `${designPx / REM_BASE_PX}rem`;
}
