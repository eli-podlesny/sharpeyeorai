import { gameConfig } from '../config/game.config';
import type { DarknessControl } from '../layers/darkness';
import type { DoorsControl } from '../layers/doors';
import type { ScreenHudControl } from '../layers/screenHud';
import { createSession, type GameSession } from '../rounds/session';
import type { EventBus } from './events';
import { randomSeed } from './rng';
import { createSceneManager, type SceneMap } from './scenes';
import { createStateMachine, type GameState, type SceneMode, type StateMachine } from './state';

/** What every scene gets to work with. */
export interface SceneContext {
  /** Inside the screen, under the doors: game content. */
  content: HTMLElement;
  /** Over the screen box, above doors and frame: controls shown while the doors are shut. */
  overlay: HTMLElement;
  /** Over the screen box, above the scene darkness: round content that stays lit (round 12). */
  spotlight: HTMLElement;
  doors: DoorsControl;
  /** Counter, progress and timer inside the screen, below the doors. */
  hud: ScreenHudControl;
  /** Whole-window darkness (rounds 11–12, end of the game). */
  darkness: DarknessControl;
  bus: EventBus;
  machine: StateMachine;
  /** The current play-through. Replaced by `newSession()`. */
  readonly session: GameSession;
  newSession(startRound?: number): void;
  /** Scene-wide look; src/fx/sceneController.ts turns it into effects. */
  readonly sceneMode: SceneMode;
  setSceneMode(mode: SceneMode): void;
}

export interface Game {
  readonly context: SceneContext;
  /** Jumps straight to a state with a fresh session (debug panel, URL params, restart). */
  jumpTo(state: GameState, round?: number): void;
}

export interface GameOptions {
  content: HTMLElement;
  overlay: HTMLElement;
  spotlight: HTMLElement;
  doors: DoorsControl;
  hud: ScreenHudControl;
  darkness: DarknessControl;
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
  let sceneMode: SceneMode = 'normal';
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
    spotlight: options.spotlight,
    doors: options.doors,
    hud: options.hud,
    darkness: options.darkness,
    bus,
    machine,
    get session() {
      return session;
    },
    newSession(startRound = 1) {
      session = createSession(options.seed ?? randomSeed(), clampRound(startRound));
    },
    get sceneMode() {
      return sceneMode;
    },
    setSceneMode(mode) {
      if (mode === sceneMode) return;
      sceneMode = mode;
      bus.emit('scene.mode', { mode });
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
