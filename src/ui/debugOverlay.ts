import {
  autoplayPresets,
  spreadPreset,
  type AutoplayPreset,
  type AutoplayPresetId,
} from '../config/autoplay.config';
import { gameConfig } from '../config/game.config';
import { getRound } from '../config/rounds.config';
import type { EventBus } from '../core/events';
import type { Game } from '../core/game';
import { contentSize, toContentCoords } from '../core/input';
import { randomSeed } from '../core/rng';
import { getScale, toStageCoords, type Point } from '../core/stage';
import { GAME_STATES, SCENE_MODES, type GameState, type SceneMode } from '../core/state';
import { autoplayResults } from '../rounds/autoplay';
import { createResult, shapeSeed } from '../rounds/session';
import { roundTarget } from '../rounds/target';
import { scoreRound } from '../scoring/summary';
import { h } from './dom';
import { openShapeGallery } from './shapeGallery';

/** Physical key (same spot on any layout) or the typed character. */
const TOGGLE_CODE = 'Backquote';
const TOGGLE_CHAR = '`';
const EVENT_LOG_SIZE = 10;
const EVENT_PAYLOAD_CHARS = 70;
const MARKERS_ATTR = 'data-debug-markers';
const CUSTOM_PRESET = 'custom';
const DEFAULT_SPREAD_PX = 20;
/** The round with a random (seeded) shape. */
const REROLL_ROUND = 2;

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
 * Shows scale, mouse position, current state and round, live dO / dC / q under the
 * cursor during a round, the last events, controls to jump anywhere in the game,
 * autoplay presets that fill all rounds and go straight to the score, and the scene mode.
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
  markersLabel.append(markers, ' C/O/M markers');

  controls.append(roundInput, goRound, restart, markersLabel);

  // Shapes: reroll the random blob, and see every shape at once
  const shapes = h('div', 'debug-overlay__row');
  const reroll = h('button', 'debug-overlay__button', 'reroll round 2');
  reroll.type = 'button';
  reroll.addEventListener('click', () => {
    const { context } = game;
    context.newSession(REROLL_ROUND);
    context.session.shapeSeeds.set(REROLL_ROUND, randomSeed());
    context.machine.force('round');
  });
  const gallery = h('button', 'debug-overlay__button', 'shape gallery');
  gallery.type = 'button';
  gallery.addEventListener('click', () => openShapeGallery(game.context.session));
  shapes.append(reroll, gallery);

  // Autoplay: fake all rounds with a preset, then show the score
  const autoplay = h('div', 'debug-overlay__row');
  const presetSelect = h('select', 'debug-overlay__input debug-overlay__select');
  presetSelect.setAttribute('aria-label', 'Autoplay preset');
  for (const [id, preset] of Object.entries(autoplayPresets)) {
    presetSelect.append(new Option(preset.label, id));
  }
  presetSelect.append(new Option('custom spread around O', CUSTOM_PRESET));
  const spreadInput = h('input', 'debug-overlay__input');
  spreadInput.type = 'number';
  spreadInput.min = '0';
  spreadInput.value = String(DEFAULT_SPREAD_PX);
  spreadInput.setAttribute('aria-label', 'Custom spread in pixels');
  const play = h('button', 'debug-overlay__button', 'autoplay');
  play.type = 'button';
  play.addEventListener('click', () => {
    const id = presetSelect.value;
    const preset: AutoplayPreset =
      id === CUSTOM_PRESET
        ? spreadPreset(Math.max(Number(spreadInput.value) || 0, 0))
        : autoplayPresets[id as AutoplayPresetId];
    const { context } = game;
    context.newSession();
    const results = autoplayResults(preset, context.session, contentSize);
    context.session.results.push(...results);
    bus.emit('game.end', { results });
    context.machine.force('score');
  });
  autoplay.append(presetSelect, spreadInput, play);

  // Scene mode (placeholder: no visual effect yet)
  const modeRow = h('div', 'debug-overlay__row');
  const modeSelect = h('select', 'debug-overlay__input debug-overlay__select');
  modeSelect.setAttribute('aria-label', 'Scene mode');
  for (const mode of SCENE_MODES) modeSelect.append(new Option(mode, mode));
  modeSelect.value = game.context.sceneMode;
  modeSelect.addEventListener('change', () => {
    game.context.setSceneMode(modeSelect.value as SceneMode);
  });
  modeRow.append('scene mode ', modeSelect);

  el.append(info, states, controls, shapes, autoplay, modeRow, events);
  document.body.append(el);

  let mouse = { x: NaN, y: NaN };
  let mouseContent: Point = { x: NaN, y: NaN };
  let state: GameState | null = null;
  let round: number | null = null;
  /** When the current round's shape became fully visible; NaN during the intro. */
  let roundStartedAt = NaN;

  /** What a click right here, right now, would score. */
  const liveScore = (): string => {
    if (state !== 'round' || round === null || Number.isNaN(mouseContent.x)) return '—';
    if (Number.isNaN(roundStartedAt)) return 'waiting for the shape';
    const latency = Math.round(performance.now() - roundStartedAt);
    const { session } = game.context;
    const target = roundTarget(getRound(round), contentSize, shapeSeed(session, round));
    const r = scoreRound(createResult(target, mouseContent, latency));
    return `dO ${r.dO.toFixed(1)}  dC ${r.dC.toFixed(1)}  q ${r.q.toFixed(3)}`;
  };
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
      `shape   ${round === null ? '—' : shapeSeed(game.context.session, round)}`,
      `live    ${liveScore()}`,
    ].join('\n');
    events.textContent = log.length ? log.join('\n') : 'no events yet';
    for (const [name, button] of stateButtons) {
      button.classList.toggle('is-active', name === state);
    }
  };

  // Specific listeners run before onAny ones, so state and round are fresh when we render.
  bus.on('state.change', ({ to }) => (state = to));
  bus.on('round.intro.start', ({ roundId }) => {
    round = roundId;
    roundStartedAt = NaN;
  });
  bus.on('round.shape.visible', () => (roundStartedAt = performance.now()));
  bus.on('scene.mode', ({ mode }) => (modeSelect.value = mode));
  bus.onAny((name, payload) => {
    log.unshift(`${name.padEnd(20)}${summarize(payload)}`);
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
    mouseContent = toContentCoords(e.clientX, e.clientY);
    render();
  });

  window.addEventListener('resize', render);
  render();
}
