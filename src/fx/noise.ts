import { gameConfig } from '../config/game.config';
import { createRng, randomSeed, type Rng } from '../core/rng';
import { prefersReducedMotion } from '../ui/motion';

/**
 * TV noise: a full-window layer of fine, flickering snow above everything (scene, HUD,
 * darkness), letting clicks through. The custom cursor and the debug panel sit above it.
 *
 * Cheap by design: `fx.noise.tileCount` small grey noise tiles are drawn once at startup
 * and kept as blob images. Then, `fx.noise.fps` times a second, the layer switches to
 * another tile at a random offset (one style change, no per-pixel work). With reduced
 * motion it shows one tile and never changes.
 */

/** Pure: one tile's grey levels (0–255), `size` × `size`, row by row. */
export function noiseLevels(size: number, rng: Rng): Uint8Array {
  const levels = new Uint8Array(size * size);
  for (let i = 0; i < levels.length; i++) levels[i] = Math.floor(rng() * 256);
  return levels;
}

function tileBlob(size: number, rng: Rng): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  const image = ctx.createImageData(size, size);
  const levels = noiseLevels(size, rng);
  for (let i = 0; i < levels.length; i++) {
    const v = levels[i] ?? 0;
    image.data[i * 4] = v;
    image.data[i * 4 + 1] = v;
    image.data[i * 4 + 2] = v;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export function createNoise(): HTMLElement {
  const cfg = gameConfig.fx.noise;
  const el = document.createElement('div');
  el.className = 'tv-noise';
  el.setAttribute('aria-hidden', 'true');
  el.style.opacity = String(cfg.opacity);
  el.style.mixBlendMode = cfg.blend;
  const tile = cfg.tileSize * cfg.grainPx;
  el.style.backgroundSize = `${tile}px ${tile}px`;
  document.body.append(el);

  const rng = createRng(randomSeed());
  const urls: string[] = [];
  let current = -1;
  let last = 0;
  const interval = 1000 / cfg.fps;

  const show = (index: number): void => {
    current = index;
    const x = Math.floor(rng() * tile);
    const y = Math.floor(rng() * tile);
    el.style.backgroundImage = `url(${urls[index]})`;
    el.style.backgroundPosition = `${x}px ${y}px`;
  };

  const frame = (now: number): void => {
    if (!prefersReducedMotion() && now - last >= interval) {
      last = now;
      // Never the same tile twice in a row, so it never looks still.
      const step = 1 + Math.floor(rng() * (urls.length - 1));
      show((current + step) % urls.length);
    }
    requestAnimationFrame(frame);
  };

  void Promise.all(Array.from({ length: cfg.tileCount }, () => tileBlob(cfg.tileSize, rng))).then(
    (blobs) => {
      for (const blob of blobs) if (blob) urls.push(URL.createObjectURL(blob));
      if (urls.length === 0) return;
      show(0);
      if (urls.length > 1) requestAnimationFrame(frame);
    },
  );
  return el;
}
