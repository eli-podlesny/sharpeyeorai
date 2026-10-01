/**
 * The game's states and which state may follow which.
 * `intro` exists but is skipped for now (it is built in v1.4).
 */
export const GAME_STATES = [
  'intro',
  'ready',
  'opening',
  'loading',
  'round',
  'calculating',
  'score',
] as const;

export type GameState = (typeof GAME_STATES)[number];

/** Allowed transitions. `round → round` moves to the next round. */
export const TRANSITIONS: Readonly<Record<GameState, readonly GameState[]>> = {
  intro: ['ready'],
  ready: ['opening'],
  opening: ['loading'],
  loading: ['round'],
  round: ['round', 'calculating'],
  calculating: ['score'],
  score: ['ready'],
};

export function canTransition(from: GameState, to: GameState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isGameState(value: string): value is GameState {
  return (GAME_STATES as readonly string[]).includes(value);
}

export interface StateMachine {
  readonly current: GameState | null;
  /** Moves to `to` if the transition is allowed. */
  go(to: GameState): void;
  /** Moves to `to` regardless of the transition table (debug jumps, restart, URL start). */
  force(to: GameState): void;
}

export interface StateMachineOptions {
  /** Called after every state change. */
  onChange: (from: GameState | null, to: GameState) => void;
  /** true: an illegal transition throws (dev). false: it is ignored (production). */
  strict: boolean;
}

export function createStateMachine({ onChange, strict }: StateMachineOptions): StateMachine {
  let current: GameState | null = null;
  // A change requested while another is still being announced waits its turn,
  // so every listener sees the changes in the order they happened.
  const queue: GameState[] = [];
  let changing = false;

  const apply = (to: GameState): void => {
    queue.push(to);
    if (changing) return;
    changing = true;
    try {
      for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
        const from = current;
        current = next;
        onChange(from, next);
      }
    } finally {
      changing = false;
      queue.length = 0;
    }
  };

  return {
    get current() {
      return current;
    },
    go(to) {
      // A pending change counts as the state we move from.
      const from = queue.at(-1) ?? current;
      if (from === null || !canTransition(from, to)) {
        if (strict) throw new Error(`Illegal state transition: ${from} → ${to}`);
        return;
      }
      apply(to);
    },
    force(to) {
      apply(to);
    },
  };
}
