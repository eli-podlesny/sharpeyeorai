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
   * Chat pools (src/ui/chatDirector.ts): one entry is picked at random, never twice from
   * the same pool until all were used. An entry that is a list is a little chat (up to 3
   * lines, 1.2s apart); the others are single lines.
   */
  chatPools: {
    /** No click 7s into a round. They stay until the mouse moves. */
    idle: [
      ['Ptss...', 'Wake Up'],
      ['Hello?', 'Anyone in there?'],
      ['Is it frozen?', 'Blink if you can hear us'],
      ['Take your time.', 'We have all day.', "We don't."],
      ['Subject idle.', 'Poking the subject...', 'Poke.'],
      ['Did they fall asleep?', 'Check the pulse.'],
      ['Earth to subject.', 'Come in, subject.'],
      ['The shape is not going to click itself.'],
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
      'Pre-aimed, were we?',
      'Our stopwatch barely started',
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
      'Logging that as "creative".',
      'The center is usually inside, fyi',
    ],
    /** Two misses in a row: replaces the plain miss line. */
    missStreak: [
      ['Again?', 'Somebody get this subject glasses.'],
      ['Two for two.', 'Outside, both times.'],
      ['Is the mouse upside down?'],
      ['We are writing this down.', 'In red.'],
      ["It's a pattern now."],
    ],
    /** A click within a few px of the optical center. */
    bullseye: [
      'Dead center. Creepy.',
      'Okay, that was clean.',
      'Pixel perfect. Huh.',
      'Who taught you that?',
      'Right on the spot.',
      "That's... exactly it.",
      'Bullseye.',
      'Hm. Lucky, or good?',
    ],
    /** A click on the computed center while the optical one is clearly elsewhere. */
    machine: [
      "That's the computed center. Interesting.",
      'Mathematically correct. Humanly odd.',
      'Spoken like a machine.',
      'Our algorithm picked the same spot.',
      'Are you running on batteries?',
      'Beep boop?',
    ],
    /** Three precise rounds in a row. */
    goodStreak: [
      ['Three in a row.', 'Okay, show-off.'],
      ['Consistent. We hate that.'],
      ['Someone check if this is a bot.'],
      ['Streak noted.', "Don't get cocky."],
      ['Is this your job or something?'],
    ],
    /** Clicking the screen before the shape is ready, or after the round is decided. */
    impatient: [
      "Patience. It's loading.",
      'Wait for it...',
      'Easy, easy. Not yet.',
      'Clicking harder will not help.',
      'One click per shape, please.',
      'The button is not a drum.',
    ],
    /** The mouse leaves the window mid-round (once a game). */
    away: [
      'Where do you think you are going?',
      'Come back. The test is not over.',
      "Leaving? We'll wait.",
      'Hey. Eyes on the screen.',
    ],
    /** The tab comes back after being hidden mid-round (once a game). */
    back: [
      'Welcome back. We paused for you.',
      "Oh, you're back. We didn't move.",
      'Took a break? Clock was frozen. You are welcome.',
    ],
    /** The very first round starts. */
    start: [
      ['Subject online.', "Let's see those eyes."],
      ['Mic check.', 'Can you see the shape?'],
      ['Test 01. Recording.'],
      ['Okay, here we go.', 'Try not to blink.'],
      ['Calibrating subject...', 'Good enough.'],
    ],
    /** After round 3. */
    easy: [
      'Seems easy, huh?',
      'Warming up nicely',
      "Too easy? It won't last.",
      'Enjoying yourself?',
    ],
    /** Story beats at a round's start (ms later: `chatDirector.beats`). */
    beats: {
      /** The room starts breathing after round 3. */
      breathing: [
        'Is the room... breathing?',
        'Did the walls just move?',
        "Don't look at the walls.",
      ],
      /** Halfway. */
      halfway: ['Halfway there.', 'Six down. Six to go.', 'Half of you is done.'],
      /** The first glitch. */
      flicker: [
        'Did the screen just flicker?',
        'That flicker is normal. Probably.',
        'Ignore the glitch.',
      ],
      /** The screen is about to fall. */
      loose: [
        'Hold still. Something is loose.',
        'Is the screen... tilting?',
        'Who checked the bolts?',
      ],
    },
    /** As the score shows, by score tier (`persona.accuracy`). */
    score: {
      sharp: [
        'Impressive. Suspicious, but impressive.',
        'Those eyes are going in the report.',
        'Results logged. We may call you back.',
      ],
      decent: [
        'Not bad. Not great. Logged.',
        'Average eyes. Above-average patience.',
        'Results logged. Thanks for your time.',
      ],
      blurry: [
        "We'll pretend that didn't happen.",
        'Results logged. Somewhere deep.',
        'Have you considered glasses?',
      ],
    },
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
   *
   * Every verdict has a few headlines and a few lines
   * (each line reads with any headline of its verdict), and each speed tier a few tags;
   * every score screen takes the next combination (`verdictPick`), so replays read
   * differently. The first of each is the original wording.
   */
  persona: {
    overrides: {
      algorithm: {
        headlines: [
          'Are you the algorithm?',
          'Machine confirmed.',
          'Perfect score detected.',
          'Hello, fellow AI.',
        ],
        lines: [
          "We checked twice. You're not supposed to exist.",
          'No human eye is this exact. Show us your hands.',
          'We are adding you to the training data.',
          'Please log off and return to the server room.',
        ],
      },
      trigger: {
        headlines: [
          'Click first, aim never.',
          'Trigger happy.',
          'Fastest miss in the west.',
          'All speed, no aim.',
        ],
        lines: [
          'Impressive reflexes. Wrong planet.',
          'You were done before the shapes were.',
          'Speed is not a center, sadly.',
          'Lightning fast. Lightning random.',
        ],
      },
      sniper: {
        headlines: [
          'The Sniper.',
          'Patient predator.',
          'One shot, one center.',
          'Slow and deadly.',
        ],
        lines: [
          "Took your sweet time. Didn't miss. Terrifying.",
          'You waited. You aimed. You nailed it.',
          'Every click was a decision. Every decision was right.',
          'The timer suffered. The score did not.',
        ],
      },
    },
    matrix: {
      sharp: {
        machine: {
          headlines: [
            'A human with a robotic vision.',
            'Precision instrument.',
            'Factory calibrated.',
            'Grid-perfect.',
            'Ruler for eyes.',
          ],
          lines: [
            'You spend too much time in front of the laptop. Go outside and touch the grass.',
            'You found the math center every time. The math is flattered.',
            'Your clicks could pass a QA test. Nobody asked them to.',
            'Somewhere a spreadsheet is proud of you.',
            'Accurate, cold, and slightly concerning.',
          ],
        },
        hybrid: {
          headlines: [
            'Calibrated.',
            'Best of both worlds.',
            'Dual core.',
            'Smooth operator.',
            'Balanced to the pixel.',
          ],
          lines: [
            'Half designer, half firmware. Both halves are annoyingly good.',
            'You see like a person and click like a script.',
            'Sharp eyes, steady logic. We have questions.',
            'The machine and the artist agree on you. Rare.',
            'Nothing escapes you. Not even the math.',
          ],
        },
        human: {
          headlines: [
            'The Eye.',
            'Born with a grid in your head.',
            'Optical royalty.',
            'Taste, measured.',
            'Gallery-grade eyes.',
          ],
          lines: [
            'No ruler. No grid. No doubt. Art directors would kill for your instincts.',
            'You found the center that feels right, not the one that computes. That is the point.',
            'Your eye corrects what geometry gets wrong.',
            'Typographers would hire you on the spot.',
            'You see balance the way others see color.',
          ],
        },
      },
      decent: {
        machine: {
          headlines: [
            'Budget android.',
            'Beta firmware.',
            'Almost an algorithm.',
            'Low-res robot.',
            'Default settings.',
          ],
          lines: [
            "You think in pixels, but the pixels don't think back. Software update recommended.",
            'You aim for the math center and land close-ish.',
            'Your inner calculator needs new batteries.',
            'Logical, mostly. Precise, sometimes.',
            'Like a robot on a Monday.',
          ],
        },
        hybrid: {
          headlines: [
            'Suspiciously average.',
            'Perfectly fine.',
            'Middle of the road.',
            'Human-ish.',
            'Statistically you.',
          ],
          lines: [
            'Not human enough to trust. Not machine enough to replace. Yet.',
            'You landed in the middle of everything. Fitting.',
            'Neither eye nor algorithm. A third thing.',
            "Our model can't decide what you are. It's sulking.",
            'Average is a center too, technically.',
          ],
        },
        human: {
          headlines: [
            'Gut feeling, mostly.',
            'Eye of the beholder.',
            'Instinct over math.',
            'Feels about right.',
            'A good eye, a shaky hand.',
          ],
          lines: [
            'Your eye knows where the center is. Your hand is still negotiating.',
            'You trust what you see. Mostly correctly.',
            'Your instincts point the right way. Your aim takes the scenic route.',
            'Human to the core, give or take a few pixels.',
            'You see balance. You click near it.',
          ],
        },
      },
      blurry: {
        machine: {
          headlines: [
            'Broken calibration.',
            'Error 404: center not found.',
            'Robot, low battery.',
            'Needs a reboot.',
            'Corrupted sensor.',
          ],
          lines: [
            'You aimed like a machine and missed like one too. Have you tried turning yourself off and on again?',
            'Methodical. Confident. Wrong.',
            'Your logic is flawless. Your results are not.',
            'We ran diagnostics. They ran away.',
            'Precisely imprecise.',
          ],
        },
        hybrid: {
          headlines: [
            'Glitch in the system.',
            'Unclassifiable.',
            'Signal lost.',
            'Static.',
            'Undefined.',
          ],
          lines: [
            "We reviewed your data. We're not sure what you are. Neither are you.",
            'Part human, part machine, all over the place.',
            'Our sensors gave up halfway through.',
            'You are a rounding error with a mouse.',
            'Somewhere between a guess and a shrug.',
          ],
        },
        human: {
          headlines: [
            'Very, very human.',
            'Abstract artist.',
            'Free spirit.',
            'Off-center, on purpose.',
            'Rules are suggestions.',
          ],
          lines: [
            "The center is a social construct, apparently. Please don't hang pictures at home.",
            'You click with your heart. Your heart has bad aim.',
            'Asymmetry is a choice. You made it twelve times.',
            'Your frames hang crooked and you love them.',
            'Wherever you clicked, that is your center now.',
          ],
        },
      },
    },
    speedTags: {
      fast: [
        'Speedy Gonzales. You clicked before the shape finished loading.',
        'Quick draw. The shapes barely had time to appear.',
        'Fast clicker. Our stopwatch is still catching up.',
        'Blink-speed decisions.',
        'You treat every test like a race.',
      ],
      steady: [
        'Steady hands. The machine respects that.',
        'Calm and measured. Very professional.',
        'Not fast, not slow. Just right.',
        'A steady pace. The facility approves.',
        'Unhurried. Unbothered.',
      ],
      slow: [
        'Slowpoke. The test is over. You can stop measuring now.',
        'Thorough. Very, very thorough.',
        'You took your time. All of it.',
        'We almost sent someone to check on you.',
        'Patience of a monk. Speed of one too.',
      ],
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
