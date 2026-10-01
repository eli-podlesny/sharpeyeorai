/**
 * Gameplay timing and flow. Tune values here only; scenes read them.
 */

/** `"button"` waits for the Start click; `"auto"` starts by itself after `autoStartDelayMs`. */
export type StartMode = 'button' | 'auto';

export interface GameConfig {
  startMode: StartMode;
  autoStartDelayMs: number;
  /** How long the blast doors take to slide apart. */
  doorOpenMs: number;
  /** The "Initializing" progress bar fills over this time. */
  loadingMs: number;
  /** How long "Calculating" stays on screen before the score. */
  calculatingMs: number;
  roundCount: number;
  /** Pause after a click (while the "logged" tooltip shows) before the next round. */
  nextRoundDelayMs: number;
}

export const gameConfig: GameConfig = {
  startMode: 'button',
  autoStartDelayMs: 1500,
  doorOpenMs: 1200,
  loadingMs: 1500,
  calculatingMs: 1500,
  roundCount: 12,
  nextRoundDelayMs: 900,
};
