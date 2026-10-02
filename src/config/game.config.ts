import type { SceneMode } from '../core/state';

/**
 * Gameplay timing and flow. Tune values here only; scenes read them.
 */

/** `"button"` waits for the Start click; `"auto"` starts by itself after `autoStartDelayMs`. */
export type StartMode = 'button' | 'auto';

export interface GameConfig {
  /**
   * Art preloading waits for each image to decode, but no longer than this: decoding never
   * finishes while the tab is in the background, and the game must not stall there.
   */
  artDecodeTimeoutMs: number;
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
  /** Before round 1: "Objective:" and the objective line (src/rounds/sequence.ts). */
  objectiveIntro: ObjectiveIntroConfig;
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
  /** Shape outlines are sampled about this many px apart (curves and straight edges). */
  shapePointSpacingPx: number;
  optical: OpticalConfig;
  scoring: ScoringConfig;
  persona: PersonaConfig;
  /** Scene effects (src/fx/): breathing, glitch, alert, screen drop, blackout. */
  fx: FxConfig;
}

/** Background breathing strength: how far the image is pushed around, and how fast. */
export interface BreathingPreset {
  /** Largest displacement, in background-image px. */
  amplitudePx: number;
  /** Speed multiplier of the slow noise (1 = base speed). */
  speed: number;
}

/** A repeating glitch: `offMs` calm first (a round never opens on a glitch), then `onMs` of glitch. */
export interface GlitchPattern {
  onMs: number;
  offMs: number;
}

export interface FxConfig {
  /**
   * Scene mode for each round (index 0 = round 1). The mode of round N+1 starts at round
   * N's outro end, so "after round 3's outro" the scene is distorted.
   */
  modeByRound: readonly SceneMode[];
  breathing: {
    subtle: BreathingPreset;
    strong: BreathingPreset;
    /** Switching presets (or on/off) eases over this time. */
    transitionMs: number;
    /** Base noise cycle: one slow swell takes about this long at speed 1. */
    cycleMs: number;
    /** The WebGL canvas never renders above this device-pixel ratio (performance). */
    maxPixelRatio: number;
  };
  glitch: {
    /** Rounds 7–8: a short burst every 4s. Rounds 10–11 glitch without pause instead. */
    slow: GlitchPattern;
    /** Round 9: a short burst every 2s. */
    fast: GlitchPattern;
    /** Safety: glitch bursts never start more often than this per second. */
    maxFlashesPerSecond: number;
    /** Horizontal slices shifted sideways per burst. */
    minSlices: number;
    maxSlices: number;
    /** Slice height range, in screen px. */
    sliceMinHeightPx: number;
    sliceMaxHeightPx: number;
    /** Largest sideways shift of a slice, in screen px. */
    maxShiftPx: number;
    /** Whole-screen jitter, in screen px. */
    jitterPx: number;
    /** Slices and jitter are re-rolled this often within a burst (no brightness change). */
    rerollMs: number;
    /** Screen opacity during a burst (the slight drop). */
    opacity: number;
    /** Opacity of the noise overlay during a burst. */
    noiseOpacity: number;
    /** One burst from the debug panel. */
    debugBurstMs: number;
    /** Reduced motion: no slices or noise, the screen only dims to this opacity… */
    reducedMotionOpacity: number;
    /** …fading over this time. */
    reducedMotionFadeMs: number;
  };
  alert: {
    /** One full pulse #111 → orange → #111. */
    periodMs: number;
    /** Alert fades in over the room color (and out again) over this time. */
    rampMs: number;
    /** The glow ellipse's opacity at full alert. Its blur radius is `layout.alertGlow.blur`. */
    glowOpacity: number;
  };
  drop: {
    /** After round 9's click: the assembly falls over this time… */
    fallMs: number;
    /** …then shakes as it lands, over this time. */
    shakeMs: number;
    /** It returns to place over this time (debug toggle; at the end it goes home in the dark, at once). */
    returnMs: number;
    /** Reduced motion: a short, plain move each way. */
    reducedMotionMs: number;
  };
  blackout: {
    /** Round 11 darkens from 0 to this level by its deadline, as the doors close (1 = black). Round 12 stays there. */
    closingDarkness: number;
    /** After an early click in round 11, doors and darkness hurry to the end over this time. */
    speedUpMs: number;
    /** After a click in round 12 (which ends the game at once), the black lasts this long before the lights return on the score. */
    afterClickMs: number;
  };
}

/**
 * The objective intro before round 1, in ms. Distances and sizes are in
 * `layout.objectiveIntro`. With reduced motion, moves are instant and fades short.
 */
export interface ObjectiveIntroConfig {
  /** "Objective:" fades in, rising and zooming in, over this time. */
  titleInMs: number;
  /** The objective line starts this much later… */
  textDelayMs: number;
  /** …and fades in, rising, over this time. */
  textInMs: number;
  /** Both stay put this long once fully shown. */
  holdMs: number;
  /** Then "Objective:" fades out moving down while the objective line moves to its bottom place. */
  outMs: number;
  /** CSS easing of the entrance and of the exit. */
  inEasing: string;
  outEasing: string;
}

/** Round choreography timings, in ms. See src/rounds/sequence.ts for the order. */
export interface RoundSequenceConfig {
  /** 1. The shape fades in. The round timer starts when it is fully visible. */
  shapeFadeInMs: number;
  /** 3. The "Sample 0X, logged" tooltip disappears (instantly) this long after the click. */
  loggedTooltipMs: number;
  /** One full pulse of the shape fill (low → high → low) while the timer runs. Colors are tokens. */
  shapePulseMs: number;
  /** 4. The shape stays this long after the click (marker showing). */
  postClickWaitMs: number;
  /** 5. Shape and marker fade out over this time. */
  outroFadeMs: number;
  /** 6. Empty screen between one round's fade-out and the next round's fade-in. */
  betweenRoundsMs: number;
  /** With prefers-reduced-motion, fades are at most this long and moves are instant (also for the objective intro). */
  reducedMotionFadeMs: number;
  /** CSS easing of the fades and of the shape's rise. */
  fadeEasing: string;
  slideEasing: string;
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
  /** Accuracy falls to 0 at this fraction of the shorter side of the shape's on-screen bounding box (rounds can override the radius). */
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
  artDecodeTimeoutMs: 1500,
  startMode: 'button',
  autoStartDelayMs: 1500,
  doorOpenMs: 2000,
  doorCloseMs: 2000,
  loadingStartBeforeDoorsMs: 300,
  loadingMs: 2500,
  loadingFadeOutMs: 200,
  calculatingMs: 1500,
  roundCount: 12,
  objectiveIntro: {
    titleInMs: 400,
    textDelayMs: 200,
    textInMs: 200,
    holdMs: 1200,
    outMs: 400,
    inEasing: 'ease-out',
    outEasing: 'ease-in-out',
  },
  roundSequence: {
    shapeFadeInMs: 400,
    loggedTooltipMs: 500,
    shapePulseMs: 1000,
    postClickWaitMs: 1600,
    outroFadeMs: 400,
    betweenRoundsMs: 400,
    reducedMotionFadeMs: 150,
    fadeEasing: 'ease',
    slideEasing: 'ease-out',
  },
  endDarknessMs: 1000,
  endDarknessFadeMs: 300,
  scoreCountUpMs: 2500,
  copiedTooltipMs: 2000,
  shapePointSpacingPx: 3,
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
  fx: {
    modeByRound: [
      'normal', // 1
      'normal', // 2
      'normal', // 3
      'distorted', // 4
      'distorted', // 5
      'distorted', // 6
      'distorted', // 7
      'alert', // 8
      'alert', // 9
      'alert', // 10
      'blackout', // 11
      'blackout', // 12
    ],
    breathing: {
      subtle: { amplitudePx: 4, speed: 1 },
      strong: { amplitudePx: 10, speed: 2 },
      transitionMs: 2000,
      cycleMs: 9000,
      maxPixelRatio: 1.5,
    },
    glitch: {
      slow: { onMs: 120, offMs: 3880 },
      fast: { onMs: 120, offMs: 1880 },
      maxFlashesPerSecond: 3,
      minSlices: 2,
      maxSlices: 4,
      sliceMinHeightPx: 6,
      sliceMaxHeightPx: 40,
      maxShiftPx: 12,
      jitterPx: 1.5,
      rerollMs: 90,
      opacity: 0.95,
      noiseOpacity: 0.08,
      debugBurstMs: 400,
      reducedMotionOpacity: 0.8,
      reducedMotionFadeMs: 150,
    },
    alert: {
      periodMs: 2400,
      rampMs: 2000,
      glowOpacity: 0.16,
    },
    drop: {
      fallMs: 420,
      shakeMs: 380,
      returnMs: 800,
      reducedMotionMs: 300,
    },
    blackout: {
      closingDarkness: 1,
      speedUpMs: 800,
      afterClickMs: 3000,
    },
  },
};
