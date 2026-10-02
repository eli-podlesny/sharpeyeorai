/**
 * Every visible string in the game, keyed. Scenes never hard-code text.
 * `{name}` placeholders are filled in with `fill()`.
 */
export const copy = {
  hud: {
    logo: 'SharpEye',
    logoAccent: 'orAI',
  },
  ready: {
    start: 'Start test',
    autoStart: 'Starting…',
  },
  loading: {
    title: 'Initializing',
  },
  objectiveIntro: {
    title: 'Objective:',
  },
  round: {
    counter: 'Test {n}',
    counterTotal: '/{total}',
    timeLabel: 'Time: ',
    /** `{ms}` is padded with `padDigits()`, so the idle timer reads 0000ms. */
    timeValue: '{ms}ms',
    logged: 'Sample {n}, logged',
    loggedPosition: 'x {x}  y {y}',
    loggedTime: 't {ms}ms',
  },
  /** Objective lines, referenced by `copyKey` in rounds.config.ts. */
  objectives: {
    'objective.shape': 'Find center of a shape',
  },
  calculating: {
    title: 'Calculating',
  },
  score: {
    label: 'Your score',
    /** `{total}` is padded with `padDigits()`: 0636pts. */
    total: '{total}pts',
    sampleNote: 'Sample data — no rounds played',
    details: 'Details',
    hideDetails: 'Summary',
    share: 'Share result',
    playAgain: 'Play again',
    colRound: 'Test',
    colOffset: 'Offset (px)',
    colLatency: 'Time (ms)',
    colPoints: 'Points',
    /** Details row of a round that timed out. */
    noInput: 'no input',
    noValue: '—',
    shareText: 'I scored {total}/{max} on SharpEyeOrAI — "{headline}" {url}',
    shareUrl: 'sharpeyeorai.vercel.app',
    copied: 'Copied',
    copyFailed: 'Copy this:',
  },
  /**
   * Verdict personas. `matrix` is accuracy tier × humanity tier; overrides win over the
   * matrix (checked in the order listed in persona.ts). The speed tag is a third line,
   * hidden when an override fires.
   */
  persona: {
    overrides: {
      algorithm: {
        headline: 'Are you the algorithm?',
        line: "We checked twice. You're not supposed to exist.",
      },
      trigger: {
        headline: 'Click first, aim never.',
        line: 'Impressive reflexes. Wrong planet.',
      },
      sniper: {
        headline: 'The Sniper.',
        line: "Took your sweet time. Didn't miss. Terrifying.",
      },
    },
    matrix: {
      sharp: {
        machine: {
          headline: 'A human with a robotic vision.',
          line: 'You spend too much time in front of the laptop. Go outside and touch the grass.',
        },
        hybrid: {
          headline: 'Calibrated.',
          line: 'Half designer, half firmware. Both halves are annoyingly good.',
        },
        human: {
          headline: 'The Eye.',
          line: 'No ruler. No grid. No doubt. Art directors would kill for your instincts.',
        },
      },
      decent: {
        machine: {
          headline: 'Budget android.',
          line: "You think in pixels, but the pixels don't think back. Software update recommended.",
        },
        hybrid: {
          headline: 'Suspiciously average.',
          line: 'Not human enough to trust. Not machine enough to replace. Yet.',
        },
        human: {
          headline: 'Gut feeling, mostly.',
          line: 'Your eye knows where the center is. Your hand is still negotiating.',
        },
      },
      blurry: {
        machine: {
          headline: 'Broken calibration.',
          line: 'You aimed like a machine and missed like one too. Have you tried turning yourself off and on again?',
        },
        hybrid: {
          headline: 'Glitch in the system.',
          line: "We reviewed your data. We're not sure what you are. Neither are you.",
        },
        human: {
          headline: 'Very, very human.',
          line: "The center is a social construct, apparently. Please don't hang pictures at home.",
        },
      },
    },
    speedTags: {
      fast: 'Speedy Gonzales. You clicked before the shape finished loading.',
      steady: 'Steady hands. The machine respects that.',
      slow: 'Slowpoke. The test is over. You can stop measuring now.',
    },
  },
} as const;

export type ObjectiveKey = keyof typeof copy.objectives;

/** Replaces `{name}` placeholders in a copy string. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Two-digit round number, as shown in "Test 04". */
export function padRound(n: number): string {
  return String(n).padStart(2, '0');
}

/** Minimum digits shown by the timer and the score: 0000ms, 0347ms, 0636pts, 10000pts. */
export const DISPLAY_DIGITS = 4;

/** A whole number padded to `DISPLAY_DIGITS`, as in "0347ms" or "0636pts". */
export function padDigits(n: number): string {
  return String(Math.max(Math.round(n), 0)).padStart(DISPLAY_DIGITS, '0');
}
