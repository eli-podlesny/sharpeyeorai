/**
 * Debug autoplay presets: fake click patterns for checking the score screen and every
 * persona without playing. Each click is placed relative to the round's C and O:
 *
 *   P = C + lean × (O − C)  +  side × (perpendicular to C→O)  +  random jitter
 *
 * so `lean` 0 clicks C (machine-like), 1 clicks O (human-like), and `sidePx` moves
 * the click off target without changing the lean. Values are tuned for the
 * 200 × 200 square (C and O 10px apart) and will need retuning when shapes change.
 */

export interface AutoplayPreset {
  label: string;
  lean: number;
  sidePx: number;
  /** Each click moves by up to this much in x and y, at random. */
  jitterPx: number;
  latencyMs: { min: number; max: number };
}

const STEADY = { min: 2000, max: 3000 };
const FAST = { min: 400, max: 1200 };
const SLOW = { min: 5000, max: 6000 };
const JITTER = 1;

/** Side offsets that land in each accuracy tier. */
const SIDE = { sharp: 0, decent: 25, blurry: 60 };
/** Leans that land in each humanity tier. */
const LEAN = { machine: 0, hybrid: 0.5, human: 1 };

const matrix = (accuracy: keyof typeof SIDE, humanity: keyof typeof LEAN): AutoplayPreset => ({
  label: `${accuracy} × ${humanity}`,
  lean: LEAN[humanity],
  sidePx: SIDE[accuracy],
  jitterPx: JITTER,
  latencyMs: STEADY,
});

export const autoplayPresets = {
  'sharp.machine': matrix('sharp', 'machine'),
  'sharp.hybrid': matrix('sharp', 'hybrid'),
  'sharp.human': matrix('sharp', 'human'),
  'decent.machine': matrix('decent', 'machine'),
  'decent.hybrid': matrix('decent', 'hybrid'),
  'decent.human': matrix('decent', 'human'),
  'blurry.machine': matrix('blurry', 'machine'),
  'blurry.hybrid': matrix('blurry', 'hybrid'),
  'blurry.human': matrix('blurry', 'human'),
  algorithm: {
    label: 'override: algorithm',
    lean: LEAN.human,
    sidePx: 0,
    jitterPx: 0,
    latencyMs: FAST,
  },
  trigger: {
    label: 'override: fast + blurry',
    lean: LEAN.hybrid,
    sidePx: SIDE.blurry,
    jitterPx: JITTER,
    latencyMs: FAST,
  },
  sniper: {
    label: 'override: slow + sharp',
    lean: LEAN.human,
    sidePx: 0,
    jitterPx: JITTER,
    latencyMs: SLOW,
  },
} satisfies Record<string, AutoplayPreset>;

export type AutoplayPresetId = keyof typeof autoplayPresets;

/** Clicks scattered around O by up to `spreadPx`, at a steady pace (the custom option). */
export function spreadPreset(spreadPx: number): AutoplayPreset {
  return {
    label: `spread ±${spreadPx}px around O`,
    lean: LEAN.human,
    sidePx: 0,
    jitterPx: spreadPx,
    latencyMs: STEADY,
  };
}

/** Spread used for the score screen's sample data when it is opened without playing. */
export const SAMPLE_SPREAD_PX = 40;
