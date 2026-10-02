import { gameConfig } from '../config/game.config';
import type { EventBus } from './events';

/** Decodes the image, so it shows on the first frame it is drawn; gives up after the cap. */
function decodeCapped(img: HTMLImageElement): Promise<void> {
  if (img.naturalWidth === 0) return Promise.resolve();
  return Promise.race([
    img.decode().catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, gameConfig.artDecodeTimeoutMs)),
  ]);
}

/**
 * Waits until every art image has loaded and decoded, reporting progress through
 * `assets.progress` and finishing with `assets.ready` (the v1.2 loading screen listens).
 * A broken image counts as done, so a missing file never blocks the game. Decoding is
 * capped at `artDecodeTimeoutMs`: in a background tab it never finishes on its own.
 */
export async function preloadImages(images: HTMLImageElement[], bus: EventBus): Promise<void> {
  const total = images.length;
  let loaded = 0;
  bus.emit('assets.progress', { loaded, total });

  const settle = (img: HTMLImageElement): Promise<void> =>
    new Promise<void>((resolve) => {
      if (img.complete) resolve();
      else {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      }
    })
      .then(() => decodeCapped(img))
      .then(() => {
        loaded += 1;
        bus.emit('assets.progress', { loaded, total });
      });

  await Promise.all(images.map(settle));
  bus.emit('assets.ready', { total });
}
