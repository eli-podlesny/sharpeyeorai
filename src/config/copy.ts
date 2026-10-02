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
    /** The sample tooltip after a click (or a timeout): "Sample 04" and its status. */
    sample: 'Sample {n}',
    logged: 'LOGGED',
    noInput: 'NO INPUT',
    sampleX: 'x:',
    sampleY: 'y:',
    sampleT: 't:',
    /** Position values (2 decimals, decimal comma as in Figma) and time (`{ms}` padded). */
    samplePx: '{v}px',
    sampleMs: '+{ms}ms',
    /** Shown for x and y when no click came. */
    sampleNone: '—',
    /** Printed on round 12's triangle. */
    shapeMark: '?',
  },
  /** Chat messages (src/ui/chatMessage.ts). */
  chat: {
    /** Orange, when alert mode starts (after round 7). */
    alert: 'Alert! System Malfunction',
    /** Round 10, after the screen fell. */
    whatsGoingOn: "What's going on?!",
    brokeSomething: 'Did we break anything?',
    /** Round 11, as the doors start to close. */
    doorsClosing: 'Oh, the doors are closing fast',
    reallyClosing: "They're really closing!",
    hurryUp: 'Hurry Up!',
    /** Before round 12's triangle, lit in the dark. */
    lastChance: 'Last chance...',
  },
  /**
   * Chat pools (src/ui/chatDirector.ts): one entry is picked at random, never twice in a
   * row of the same pool until all were used. An entry of `idle` is a little chat (up to 3
   * lines, 1.2s apart); the others are single lines.
   */
  chatPools: {
    /** No click 7s into a round. */
    idle: [
      ['Ptss...', 'Wake Up'],
      ['Hello?', 'Anyone in there?'],
      ['Is it frozen?', 'Blink if you can hear us'],
      ['Take your time.', 'We have all day.', "We don't."],
      ['Subject idle.', 'Poking the subject...', 'Poke.'],
    ],
    /** A click within 1s of the shape showing. */
    fast: [
      'Whoa, easy there',
      'Speedrun?',
      'That was quick. Suspiciously quick.',
      'Did you even look?',
      'Fast hands.',
      'Blink and you miss it',
      "Someone's eager",
      'Lightning reflexes, huh?',
      'Faster than our sensors',
      'Was that a guess?',
      'Too fast to be human?',
      'Slow down, cowboy',
    ],
    /** A click outside the shape. */
    miss: [
      'Missed that haha',
      'Are you blind or what?',
      "That's not even on the shape",
      'Wrong spot, genius',
      'The shape is over there',
      'Bold choice. Wrong, but bold.',
      'Did your hand slip?',
      'Clicking the void again?',
      'Nope. Outside.',
      'We saw that.',
    ],
    /** After round 3. */
    easy: [
      'Seems easy, huh?',
      'Warming up nicely',
      "Too easy? It won't last.",
      'Enjoying yourself?',
    ],
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
    hideDetails: 'Score',
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
export type ChatKey = keyof typeof copy.chat;

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
