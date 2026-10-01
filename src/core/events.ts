import type { RoundResult } from '../rounds/session';
import type { SessionSummary } from '../scoring/summary';
import type { Point } from './stage';
import type { GameState, SceneMode } from './state';

/**
 * Every game event and its payload. Sound (v1.3) and effects attach to these later.
 * Emitting a name that is not listed here, or the wrong payload, is a type error.
 */
export interface GameEvents {
  'state.change': { from: GameState | null; to: GameState };
  'door.open.start': { durationMs: number };
  'door.open.end': Record<string, never>;
  'door.close.start': { durationMs: number };
  'door.close.end': Record<string, never>;
  /** Round sequence steps, in order (see src/rounds/sequence.ts). The intro is the fade-in of shape and objective. */
  'objective.intro.start': Record<string, never>;
  'objective.intro.end': Record<string, never>;
  'round.intro.start': { roundId: number };
  'round.intro.end': { roundId: number };
  /** The shape is fully visible: the timer starts and clicks count from here. */
  'round.shape.visible': { roundId: number };
  /** The raw click: `content` is in screen-content pixels, `local` is relative to the shape. */
  'round.click': { roundId: number; content: Point; local: Point; latencyMs: number };
  'round.logged': { result: RoundResult };
  'round.outro.start': { roundId: number };
  'round.outro.end': { roundId: number };
  'game.end': { results: readonly RoundResult[] };
  /** The end-of-game darkness fades in (`dark: true`) or out. */
  'scene.dark': { dark: boolean; durationMs: number };
  'scene.mode': { mode: SceneMode };
  'score.reveal': { summary: SessionSummary; isSample: boolean };
  /** Share result was pressed; `copied` is false when the clipboard refused. */
  'score.share': { text: string; copied: boolean };
}

export type EventName = keyof GameEvents;
export type Listener<K extends EventName> = (payload: GameEvents[K]) => void;
/** Receives every event; used by the debug panel. */
export type AnyListener = <K extends EventName>(name: K, payload: GameEvents[K]) => void;

export interface EventBus {
  emit<K extends EventName>(name: K, payload: GameEvents[K]): void;
  /** Returns a function that removes the listener. */
  on<K extends EventName>(name: K, listener: Listener<K>): () => void;
  onAny(listener: AnyListener): () => void;
}

export function createEventBus(): EventBus {
  const listeners = new Map<EventName, Set<(payload: never) => void>>();
  const anyListeners = new Set<AnyListener>();

  return {
    emit(name, payload) {
      const set = listeners.get(name);
      if (set) for (const fn of [...set]) (fn as Listener<typeof name>)(payload);
      for (const fn of [...anyListeners]) fn(name, payload);
    },
    on(name, listener) {
      let set = listeners.get(name);
      if (!set) {
        set = new Set();
        listeners.set(name, set);
      }
      const stored = listener as (payload: never) => void;
      set.add(stored);
      return () => set.delete(stored);
    },
    onAny(listener) {
      anyListeners.add(listener);
      return () => anyListeners.delete(listener);
    },
  };
}
