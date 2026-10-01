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
  /** How long the blast doors take to slide shut (end of the game). */
  doorCloseMs: number;
  /** "Initializing" starts behind the shut doors; the doors start opening this much later. */
  loadingStartBeforeDoorsMs: number;
  /** Total time of the "Initializing" progress bar, counted from when it starts. */
  loadingMs: number;
  /** "Initializing" fades out over this time before round 1's intro. */
  loadingFadeOutMs: number;
  /** How long "Calculating" stays on screen. Unused while Calculating is out of the flow. */
  calculatingMs: number;
  roundCount: number;
  /** Timings of every round's intro → play → outro (src/rounds/sequence.ts). */
  roundSequence: RoundSequenceConfig;
  /** After the last round: how long the scene stays fully dark between doors closing and opening. */
  endDarknessMs: number;
  /** The darkness fades in and out over this time. */
  endDarknessFadeMs: number;
  /** How long the score counts up from 0 on the score screen. */
  scoreCountUpMs: number;
  /** How long the "Copied" tooltip stays after Share result. */
  copiedTooltipMs: number;
  optical: OpticalConfig;
  scoring: ScoringConfig;
  persona: PersonaConfig;
}

/** Round choreography timings, in ms. See src/rounds/sequence.ts for the order. */
export interface RoundSequenceConfig {
  /** 1. Shape and objective fade in together. The round timer starts when they are fully visible. */
  fadeInMs: number;
  /** 4. Pause after the click (marker and tooltip showing). */
  postClickWaitMs: number;
  /** 5. Objective, shape and marker fade out together. */
  outroFadeMs: number;
  /** 6. Empty screen between one round's fade-out and the next round's fade-in. */
  betweenRoundsMs: number;
  /** With prefers-reduced-motion, fades are at most this long. */
  reducedMotionFadeMs: number;
  /** CSS easing of the fades. */
  fadeEasing: string;
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
  doorCloseMs: 1200,
  loadingStartBeforeDoorsMs: 300,
  loadingMs: 2500,
  loadingFadeOutMs: 200,
  calculatingMs: 1500,
  roundCount: 12,
  roundSequence: {
    fadeInMs: 400,
    postClickWaitMs: 400,
    outroFadeMs: 400,
    betweenRoundsMs: 400,
    reducedMotionFadeMs: 150,
    fadeEasing: 'ease',
  },
  endDarknessMs: 3000,
  endDarknessFadeMs: 300,
  scoreCountUpMs: 1200,
  copiedTooltipMs: 2000,
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
