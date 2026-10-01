import { gameConfig } from '../config/game.config';
import type { EventBus } from '../core/events';
import type { Game } from '../core/game';
import { getScale, toStageCoords } from '../core/stage';
import { GAME_STATES, type GameState } from '../core/state';
import { h } from './dom';

/** Physical key (same spot on any layout) or the typed character. */
const TOGGLE_CODE = 'Backquote';
const TOGGLE_CHAR = '`';
const EVENT_LOG_SIZE = 10;
const EVENT_PAYLOAD_CHARS = 70;
const MARKERS_ATTR = 'data-debug-markers';

export interface DebugOverlayOptions {
  game: Game;
  bus: EventBus;
  /** Start open (`?debug=1`). */
  open: boolean;
}

function summarize(payload: unknown): string {
  const text = JSON.stringify(payload, (_, value: unknown) =>
    typeof value === 'number' && !Number.isInteger(value) ? Number(value.toFixed(1)) : value,
  );
  return text.length > EVENT_PAYLOAD_CHARS ? `${text.slice(0, EVENT_PAYLOAD_CHARS)}…` : text;
}

/**
 * Developer panel, hidden by default. The backtick key (`) toggles it.
 * Shows scale, mouse position, current state and round, the last events,
 * and controls to jump anywhere in the game.
 */
export function initDebugOverlay({ game, bus, open }: DebugOverlayOptions): void {
  const el = h('div', 'debug-overlay');
  el.hidden = !open;
  el.setAttribute('aria-label', 'Debug panel');

  const info = h('pre', 'debug-overlay__info');
  const events = h('pre', 'debug-overlay__events');

  // Jump to any state
  const states = h('div', 'debug-overlay__row');
  const stateButtons = new Map<GameState, HTMLButtonElement>();
  for (const state of GAME_STATES) {
    const button = h('button', 'debug-overlay__button', state);
    button.type = 'button';
    button.addEventListener('click', () => game.jumpTo(state));
    stateButtons.set(state, button);
    states.append(button);
  }

  // Jump to round N, restart, markers
  const controls = h('div', 'debug-overlay__row');
  const roundInput = h('input', 'debug-overlay__input');
  roundInput.type = 'number';
  roundInput.min = '1';
  roundInput.max = String(gameConfig.roundCount);
  roundInput.value = '1';
  roundInput.setAttribute('aria-label', 'Round number');
  const goRound = h('button', 'debug-overlay__button', 'go to round');
  goRound.type = 'button';
  goRound.addEventListener('click', () => game.jumpTo('round', Number(roundInput.value) || 1));
  const restart = h('button', 'debug-overlay__button', 'restart');
  restart.type = 'button';
  restart.addEventListener('click', () => game.jumpTo('ready'));

  const markersLabel = h('label', 'debug-overlay__toggle');
  const markers = h('input', '');
  markers.type = 'checkbox';
  markers.addEventListener('change', () => {
    document.documentElement.toggleAttribute(MARKERS_ATTR, markers.checked);
  });
  markersLabel.append(markers, ' C/O markers');

  controls.append(roundInput, goRound, restart, markersLabel);
  el.append(info, states, controls, events);
  document.body.append(el);

  let mouse = { x: NaN, y: NaN };
  let state: GameState | null = null;
  let round: number | null = null;
  const log: string[] = [];

  const render = (): void => {
    if (el.hidden) return;
    const stage = Number.isNaN(mouse.x) ? '—' : `${mouse.x.toFixed(1)}, ${mouse.y.toFixed(1)}`;
    const showRound = state === 'round' && round !== null;
    info.textContent = [
      `scale   ${getScale().toFixed(4)}`,
      `window  ${window.innerWidth} × ${window.innerHeight}`,
      `stage   ${stage}`,
      `state   ${state ?? '—'}${showRound ? `  (round ${round}/${gameConfig.roundCount})` : ''}`,
      `seed    ${game.context.session.seed}`,
    ].join('\n');
    events.textContent = log.length ? log.join('\n') : 'no events yet';
    for (const [name, button] of stateButtons) {
      button.classList.toggle('is-active', name === state);
    }
  };

  // Specific listeners run before onAny ones, so state and round are fresh when we render.
  bus.on('state.change', ({ to }) => (state = to));
  bus.on('round.start', ({ roundId }) => (round = roundId));
  bus.onAny((name, payload) => {
    log.unshift(`${name.padEnd(16)}${summarize(payload)}`);
    log.length = Math.min(log.length, EVENT_LOG_SIZE);
    render();
  });

  window.addEventListener('keydown', (e) => {
    if (e.repeat || (e.code !== TOGGLE_CODE && e.key !== TOGGLE_CHAR)) return;
    e.preventDefault();
    el.hidden = !el.hidden;
    render();
  });

  window.addEventListener('mousemove', (e) => {
    mouse = toStageCoords(e.clientX, e.clientY);
    render();
  });

  window.addEventListener('resize', render);
  render();
}
