import { gameConfig } from '../config/game.config';
import type { DoorsControl } from '../layers/doors';
import { createSession, type GameSession } from '../rounds/session';
import type { EventBus } from './events';
import { randomSeed } from './rng';
import { createSceneManager, type SceneMap } from './scenes';
import { createStateMachine, type GameState, type StateMachine } from './state';

/** What every scene gets to work with. */
export interface SceneContext {
  /** Inside the screen, under the doors: game content. */
  content: HTMLElement;
  /** Over the screen box, above doors and frame: controls shown while the doors are shut. */
  overlay: HTMLElement;
  doors: DoorsControl;
  bus: EventBus;
  machine: StateMachine;
  /** The current play-through. Replaced by `newSession()`. */
  readonly session: GameSession;
  newSession(startRound?: number): void;
}

export interface Game {
  readonly context: SceneContext;
  /** Jumps straight to a state with a fresh session (debug panel, URL params, restart). */
  jumpTo(state: GameState, round?: number): void;
}

export interface GameOptions {
  content: HTMLElement;
  overlay: HTMLElement;
  doors: DoorsControl;
  bus: EventBus;
  /** Fixed seed from `?seed=`; null picks a new random seed for every session. */
  seed: number | null;
  createScenes(context: SceneContext): SceneMap;
}

function clampRound(round: number): number {
  return Math.min(Math.max(Math.round(round), 1), gameConfig.roundCount);
}

export function createGame(options: GameOptions): Game {
  const { bus } = options;
  let session = createSession(options.seed ?? randomSeed());
  // Assigned right below; scenes only read it once the machine starts.
  let showScene: (state: GameState) => void = () => {};

  const machine = createStateMachine({
    strict: import.meta.env.DEV,
    onChange(from, to) {
      bus.emit('state.change', { from, to });
      showScene(to);
    },
  });

  const context: SceneContext = {
    content: options.content,
    overlay: options.overlay,
    doors: options.doors,
    bus,
    machine,
    get session() {
      return session;
    },
    newSession(startRound = 1) {
      session = createSession(options.seed ?? randomSeed(), clampRound(startRound));
    },
  };

  showScene = createSceneManager(options.createScenes(context)).show;

  return {
    context,
    jumpTo(state, round = 1) {
      context.newSession(round);
      machine.force(state);
    },
  };
}
