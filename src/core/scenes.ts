import { createScope, type Scope } from './scope';
import type { GameState } from './state';

/** One screen of the game. Every state has exactly one scene. */
export interface Scene {
  enter(): void;
  exit(): void;
}

export type SceneMap = Readonly<Record<GameState, Scene>>;

/**
 * Builds a scene from a setup function. Everything the setup starts through its
 * scope (timers, listeners, elements) is cleaned up when the scene exits.
 */
export function defineScene(setup: (scope: Scope) => void): Scene {
  let scope: Scope | null = null;
  return {
    enter() {
      scope?.dispose();
      scope = createScope();
      setup(scope);
    },
    exit() {
      scope?.dispose();
      scope = null;
    },
  };
}

/** Swaps scenes: exits the current one, enters the next. */
export function createSceneManager(scenes: SceneMap): { show(state: GameState): void } {
  let current: Scene | null = null;
  return {
    show(state) {
      current?.exit();
      current = scenes[state];
      current.enter();
    },
  };
}
