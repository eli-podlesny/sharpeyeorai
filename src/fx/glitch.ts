import { gameConfig, type GlitchPattern } from '../config/game.config';
import { layout } from '../config/layout.config';
import { createRng, rangeOf, type Rng } from '../core/rng';
import { createFlashLimiter, glitchActiveAt, glitchCycleAt } from './schedule';

/**
 * Screen glitch: everything inside the screen (background, HUD, objective, shape) gets
 * 2–4 horizontal slices shifted sideways, a little jitter, a slight opacity drop and a
 * monochrome noise overlay. Frame, doors and the HUD outside the screen are untouched.
 *
 * Visual only: it is an SVG displacement filter on the screen layer, which moves pixels
 * but not elements, so hit-testing, click mapping and scoring are unchanged.
 * Safety: bursts go through a flash limiter (at most `maxFlashesPerSecond` starts per
 * second). Within a burst the slices are re-rolled without any brightness change.
 * Reduced motion: no slices, jitter or noise; the screen only dims gently.
 */
export interface GlitchFx {
  /** Glitch in a repeating pattern from `now` on (calm first), or stop with null. */
  setPattern(pattern: GlitchPattern | null, now: number): void;
  /** One burst on the next frame (debug panel); skipped if it would break the flash limit. */
  burst(ms: number): void;
  /** Ends any burst now and stops the pattern. */
  stop(): void;
  /** Call every frame. */
  update(now: number, reducedMotion: boolean): void;
}

const FILTER_ID = 'fx-screen-glitch';
const SVG_NS = 'http://www.w3.org/2000/svg';
/** Size of the tiled noise texture, in texture px. */
const NOISE_TILE = 128;
/** 8-bit mid-gray: "no displacement" in the displacement map. */
const NEUTRAL = 128;

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

/** A tile of random-alpha speckle, used as a mask over the noise color token (monochrome). */
function noiseTile(rng: Rng): string {
  const canvas = document.createElement('canvas');
  canvas.width = NOISE_TILE;
  canvas.height = NOISE_TILE;
  const g = canvas.getContext('2d');
  if (!g) return '';
  const img = g.createImageData(NOISE_TILE, NOISE_TILE);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
    img.data[i + 3] = Math.floor(rng() * 256);
  }
  g.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

export function createGlitch(screen: HTMLElement, seed: number): GlitchFx {
  const cfg = gameConfig.fx.glitch;
  const rng = createRng(seed);
  const between = (a: number, b: number): number => rangeOf(rng, a, b);

  // The filter: a gray displacement map (a base flood carrying the jitter, plus one flood per
  // slice), applied to the screen. Floods are positioned in the screen's CSS px.
  const host = svg('svg', { width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' });
  host.style.position = 'absolute';
  const filter = svg('filter', {
    id: FILTER_ID,
    filterUnits: 'userSpaceOnUse',
    primitiveUnits: 'userSpaceOnUse',
    'color-interpolation-filters': 'sRGB',
  });
  const base = svg('feFlood', { result: 'base' });
  const slices = Array.from({ length: cfg.maxSlices }, (_, i) =>
    svg('feFlood', { result: `slice${i}` }),
  );
  const merge = svg('feMerge', { result: 'map' });
  for (const name of ['base', ...slices.map((_, i) => `slice${i}`)]) {
    merge.append(svg('feMergeNode', { in: name }));
  }
  const displace = svg('feDisplacementMap', {
    in: 'SourceGraphic',
    in2: 'map',
    xChannelSelector: 'R',
    yChannelSelector: 'G',
  });
  filter.append(base, ...slices, merge, displace);
  host.append(filter);
  document.body.append(host);

  const noise = document.createElement('div');
  noise.className = 'screen__noise';
  const tile = noiseTile(rng);
  noise.style.maskImage = `url(${tile})`;
  noise.style.webkitMaskImage = `url(${tile})`;
  noise.hidden = true;
  screen.append(noise);

  /** Gray level for a displacement of `px` with the filter scale `scale`. */
  const level = (px: number, scale: number): number =>
    Math.round(Math.min(Math.max(NEUTRAL + (px / scale) * 255, 0), 255));

  /** New slices, jitter and noise offset; brightness stays the same. */
  const reroll = (): void => {
    const w = screen.offsetWidth;
    const h = screen.offsetHeight;
    const px = w / layout.screen.width; // screen px → CSS px
    const scale = 2 * (cfg.maxShiftPx + cfg.jitterPx) * px;
    filter.setAttribute('x', '0');
    filter.setAttribute('y', '0');
    filter.setAttribute('width', String(w));
    filter.setAttribute('height', String(h));
    displace.setAttribute('scale', scale.toFixed(2));
    const jx = between(-cfg.jitterPx, cfg.jitterPx) * px;
    const jy = between(-cfg.jitterPx, cfg.jitterPx) * px * 0.5;
    base.setAttribute('flood-color', `rgb(${level(jx, scale)}, ${level(jy, scale)}, 0)`);
    const count = Math.round(between(cfg.minSlices, cfg.maxSlices));
    slices.forEach((slice, i) => {
      const height = between(cfg.sliceMinHeightPx, cfg.sliceMaxHeightPx) * px;
      const shift = between(-cfg.maxShiftPx, cfg.maxShiftPx) * px;
      slice.setAttribute('x', '0');
      slice.setAttribute('y', (rng() * (h - height)).toFixed(1));
      slice.setAttribute('width', String(w));
      slice.setAttribute('height', i < count ? height.toFixed(1) : '0');
      slice.setAttribute('flood-color', `rgb(${level(jx + shift, scale)}, ${level(jy, scale)}, 0)`);
    });
    noise.style.maskPosition = `${Math.floor(rng() * NOISE_TILE)}px ${Math.floor(rng() * NOISE_TILE)}px`;
    noise.style.webkitMaskPosition = noise.style.maskPosition;
  };

  const limiter = createFlashLimiter(cfg.maxFlashesPerSecond);
  let pattern: GlitchPattern | null = null;
  let patternStart = 0;
  let lastCycle = -1;
  /** The current burst ends at this time; null when calm. */
  let burstEnd: number | null = null;
  let lastReroll = 0;
  let reduced = false;

  const begin = (now: number, ms: number, reducedMotion: boolean): void => {
    if (!limiter.tryStart(now)) return;
    burstEnd = now + ms;
    reduced = reducedMotion;
    if (reducedMotion) {
      screen.style.transition = `opacity ${cfg.reducedMotionFadeMs}ms ease`;
      screen.style.opacity = String(cfg.reducedMotionOpacity);
    } else {
      screen.style.transition = '';
      reroll();
      lastReroll = now;
      screen.style.filter = `url(#${FILTER_ID})`;
      screen.style.opacity = String(cfg.opacity);
      noise.style.opacity = String(cfg.noiseOpacity);
      noise.hidden = false;
    }
  };

  const end = (): void => {
    burstEnd = null;
    screen.style.filter = '';
    screen.style.opacity = '';
    noise.hidden = true;
    if (!reduced) screen.style.transition = '';
  };

  let pendingBurstMs = 0;

  return {
    setPattern(next, now) {
      pattern = next;
      patternStart = now;
      lastCycle = -1;
      if (!next && burstEnd !== null) end();
    },
    burst(ms) {
      pendingBurstMs = ms;
    },
    stop() {
      pattern = null;
      pendingBurstMs = 0;
      if (burstEnd !== null) end();
    },
    update(now, reducedMotion) {
      if (burstEnd !== null && now >= burstEnd) end();
      if (pendingBurstMs > 0 && burstEnd === null) {
        begin(now, pendingBurstMs, reducedMotion);
        pendingBurstMs = 0;
      }
      if (pattern && burstEnd === null) {
        const t = now - patternStart;
        const cycle = glitchCycleAt(pattern, t);
        if (cycle !== lastCycle && glitchActiveAt(pattern, t)) {
          lastCycle = cycle;
          const period = pattern.onMs + pattern.offMs;
          // The burst lasts to the end of this cycle's glitch part.
          begin(now, (cycle + 1) * period - t, reducedMotion);
        }
      }
      if (burstEnd !== null && !reduced && now - lastReroll >= cfg.rerollMs) {
        reroll();
        lastReroll = now;
      }
    },
  };
}
