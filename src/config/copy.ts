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
  round: {
    counter: 'Test {n}',
    counterTotal: '/{total}',
    timeLabel: 'Time: ',
    timeValue: '+{ms}ms',
    objectiveLabel: 'OBJECTIVE:',
    logged: 'Sample {n}, logged',
    loggedPosition: 'x {x}  y {y}',
    loggedTime: 't {ms}ms',
  },
  /** Objective lines, referenced by `copyKey` in rounds.config.ts. */
  objectives: {
    'objective.rect': 'Find an optical center of the rectangle',
  },
  calculating: {
    title: 'Calculating',
  },
  score: {
    title: 'Results',
    sampleNote: 'Sample data — no rounds played',
    colRound: 'Test',
    colX: 'Click x',
    colY: 'Click y',
    colLatency: 'Time (ms)',
    playAgain: 'Play again',
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
