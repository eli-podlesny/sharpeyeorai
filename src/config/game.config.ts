/**
 * Gameplay timing and flow. Tune values here only; scenes read them.
 */

/** `"button"` waits for the Start click; `"auto"` starts by itself after `autoStartDelayMs`. */
export type StartMode = 'button' | 'auto';

export interface GameConfig {
  startMode: StartMode;
  autoStartDelayMs: number;
  /** How long the blast doors take to slide apart. */
  doorOpenMs: number;
  /** The "Initializing" progress bar fills over this time. */
  loadingMs: number;
  /** How long "Calculating" stays on screen before the score. */
  calculatingMs: number;
  roundCount: number;
  /** Pause after a click (while the "logged" tooltip shows) before the next round. */
  nextRoundDelayMs: number;
  /** How long the score counts up from 0 on the score screen. */
  scoreCountUpMs: number;
  optical: OpticalConfig;
  scoring: ScoringConfig;
  persona: PersonaConfig;
}

/**
 * Optical center model defaults. Every round can override them in rounds.config.ts.
 * O = C + skeletonWeight × (M − C), then shifted by −biasX × box width and −biasY × box height.
 */
export interface OpticalConfig {
  /** How far O leans from the centroid C toward the pole of inaccessibility M (0–1). */
  skeletonWeight: number;
  /** Leftward shift, as a fraction of the on-screen bounding box width. */
  biasX: number;
  /** Upward shift, as a fraction of the on-screen bounding box height. */
  biasY: number;
}

export interface ScoringConfig {
  /** Accuracy falls to 0 at this fraction of the shape's shorter side. */
  falloffFraction: number;
  /** Accuracy curve exponent: higher punishes near-misses harder. */
  curve: number;
  /** Clicks faster than this get full speed credit. */
  graceMs: number;
  /** Clicks slower than this get no speed credit. */
  maxMs: number;
  /** Rounds where O and C are closer than this are left out of the humanity lean. */
  minSeparationPx: number;
  /** The lean per round is clamped to this range (0 = machine, 1 = human). */
  leanMin: number;
  leanMax: number;
  /** Maximum total score. */
  maxScore: number;
}

/** Tier thresholds for the verdict persona. */
export interface PersonaConfig {
  /** Total ≥ sharp → sharp; ≥ decent → decent; otherwise blurry. */
  accuracy: { sharp: number; decent: number };
  /** Humanity index < machine → machine; > human → human; otherwise hybrid. */
  humanity: { machine: number; human: number };
  /** Mean latency (rounds with time weight) < fast → fast; > slow → slow; otherwise steady. */
  speed: { fast: number; slow: number };
  /** Total at or above this fires the "algorithm" override. */
  algorithmTotal: number;
}

export const gameConfig: GameConfig = {
  startMode: 'button',
  autoStartDelayMs: 1500,
  doorOpenMs: 1200,
  loadingMs: 1500,
  calculatingMs: 1500,
  roundCount: 12,
  nextRoundDelayMs: 900,
  scoreCountUpMs: 1200,
  optical: {
    skeletonWeight: 0.35,
    biasX: 0,
    biasY: 0.05,
  },
  scoring: {
    falloffFraction: 0.5,
    curve: 1.5,
    graceMs: 1500,
    maxMs: 8000,
    minSeparationPx: 4,
    leanMin: -0.5,
    leanMax: 1.5,
    maxScore: 10000,
  },
  persona: {
    accuracy: { sharp: 7500, decent: 4500 },
    humanity: { machine: 0.35, human: 0.65 },
    speed: { fast: 1500, slow: 4000 },
    algorithmTotal: 9800,
  },
};
