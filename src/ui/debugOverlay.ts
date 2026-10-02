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
import type { SceneFx } from '../fx/sceneController';
import { contentSize, toContentCoords } from '../core/input';
import { randomSeed } from '../core/rng';
import { getScale, toStageCoords, type Point } from '../core/stage';
import { GAME_STATES, SCENE_MODES, type GameState, type SceneMode } from '../core/state';
import { autoplayResults } from '../rounds/autoplay';
import { liveRound, roundDebug } from '../rounds/clock';
import { createResult, shapeSeed } from '../rounds/session';
import { targetAt } from '../rounds/target';
import { acceptsClick, fixedRoundEndMs, inputDeadlineMs } from '../rounds/timing';
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
/** How often the panel refreshes while a round runs (round clock, deadline). */
const LIVE_REFRESH_MS = 100;
/** The round with a random (seeded) shape. */
const REROLL_ROUND = 2;
/** The FPS readout averages over this long. */
const FPS_WINDOW_MS = 500;
/** Steps of the round 11 darkening scrubber. */
const SCRUB_STEPS = 100;

export interface DebugOverlayOptions {
  game: Game;
  bus: EventBus;
  /** Scene effects, to trigger and force from the panel. */
  fx: SceneFx;
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
 * autoplay presets that fill all rounds and go straight to the score, the scene mode,
 * motion controls: pause/resume and step one frame of the round clock, with the
 * round time, time left before the deadline and whether input is open; and effect
 * controls: force a scene mode, trigger a glitch, toggle alert and the screen drop,
 * scrub round 11's darkening. The FPS shows at the top.
 */
export function initDebugOverlay({ game, bus, fx, open }: DebugOverlayOptions): void {
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

  // Motion: pause/resume the round clock, step one frame while paused
  const motionRow = h('div', 'debug-overlay__row');
  const pause = h('button', 'debug-overlay__button', 'pause motion');
  pause.type = 'button';
  const step = h('button', 'debug-overlay__button', 'step frame');
  step.type = 'button';
  step.disabled = true;
  pause.addEventListener('click', () => {
    roundDebug.paused = !roundDebug.paused;
    pause.textContent = roundDebug.paused ? 'resume motion' : 'pause motion';
    pause.classList.toggle('is-active', roundDebug.paused);
    step.disabled = !roundDebug.paused;
  });
  step.addEventListener('click', () => {
    roundDebug.steps++;
  });
  motionRow.append(pause, step);

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

  // Scene mode (held until the next round changes it)
  const modeRow = h('div', 'debug-overlay__row');
  const modeSelect = h('select', 'debug-overlay__input debug-overlay__select');
  modeSelect.setAttribute('aria-label', 'Scene mode');
  for (const mode of SCENE_MODES) modeSelect.append(new Option(mode, mode));
  modeSelect.value = game.context.sceneMode;
  modeSelect.addEventListener('change', () => {
    game.context.setSceneMode(modeSelect.value as SceneMode);
  });
  modeRow.append('scene mode ', modeSelect);

  // Effects: glitch, alert, screen drop
  const fxRow = h('div', 'debug-overlay__row');
  const glitchButton = h('button', 'debug-overlay__button', 'glitch');
  glitchButton.type = 'button';
  glitchButton.addEventListener('click', () => fx.triggerGlitch());
  const alertButton = h('button', 'debug-overlay__button', 'alert');
  alertButton.type = 'button';
  alertButton.title =
    'Toggles the alert pulse; restart or a new round hands it back to the scene mode';
  alertButton.addEventListener('click', () => fx.forceAlert(!fx.alertActive));
  const dropButton = h('button', 'debug-overlay__button', 'drop screen');
  dropButton.type = 'button';
  dropButton.addEventListener('click', () => fx.setDropped(!fx.dropped));
  fxRow.append(glitchButton, alertButton, dropButton);

  // Round 11's darkening: hold doors and darkness anywhere from 0 to 1
  const scrubRow = h('div', 'debug-overlay__row');
  const scrubLabel = h('label', 'debug-overlay__toggle');
  const scrubOn = h('input', '');
  scrubOn.type = 'checkbox';
  scrubLabel.append(scrubOn, ' scrub r11 dark');
  const scrub = h('input', 'debug-overlay__range');
  scrub.type = 'range';
  scrub.min = '0';
  scrub.max = String(SCRUB_STEPS);
  scrub.value = '0';
  scrub.disabled = true;
  scrub.setAttribute('aria-label', 'Round 11 darkening');
  const applyScrub = (): void => {
    scrub.disabled = !scrubOn.checked;
    fx.scrubBlackout(scrubOn.checked ? Number(scrub.value) / SCRUB_STEPS : null);
  };
  scrubOn.addEventListener('change', applyScrub);
  scrub.addEventListener('input', applyScrub);
  scrubRow.append(scrubLabel, scrub);

  el.append(info, states, controls, shapes, motionRow, autoplay, modeRow, fxRow, scrubRow, events);
  document.body.append(el);

  let mouse = { x: NaN, y: NaN };
  let mouseContent: Point = { x: NaN, y: NaN };
  let state: GameState | null = null;
  let round: number | null = null;
  /** The shape of the current round is fully visible (its round clock runs). */
  let roundVisible = false;

  /** The live round's clock, in ms from `round.shape.visible`; null outside a round. */
  const roundMs = (): number | null =>
    state === 'round' && roundVisible && liveRound.current?.roundId === round
      ? liveRound.current.elapsedMs()
      : null;

  /** What a click right here, right now, would score (on the frame of the moment). */
  const liveScore = (): string => {
    if (state !== 'round' || round === null || Number.isNaN(mouseContent.x)) return '—';
    const t = roundMs();
    if (t === null) return 'waiting for the shape';
    const { session } = game.context;
    const target = targetAt(getRound(round), contentSize, shapeSeed(session, round), t);
    const r = scoreRound(createResult(target, mouseContent, Math.round(t)));
    return `dO ${r.dO?.toFixed(1)}  dC ${r.dC?.toFixed(1)}  q ${r.q.toFixed(3)}`;
  };

  /** Round time, the deadline countdown and the input window, for timed rounds. */
  const liveClock = (): string => {
    const t = roundMs();
    if (t === null || round === null) return '—';
    const r = getRound(round);
    const parts = [`${Math.round(t)}ms${roundDebug.paused ? ' (paused)' : ''}`];
    const deadline = inputDeadlineMs(r);
    if (deadline !== null) parts.push(`left ${Math.max(Math.round(deadline - t), 0)}ms`);
    if (deadline !== null || r.inputWindows) {
      parts.push(`input ${acceptsClick(r, t) ? 'open' : 'closed'}`);
    }
    const end = fixedRoundEndMs(r);
    if (end !== null) parts.push(`ends in ${Math.max(Math.round(end - t), 0)}ms`);
    return parts.join('  ');
  };
  const log: string[] = [];

  const render = (): void => {
    if (el.hidden) return;
    const stage = Number.isNaN(mouse.x) ? '—' : `${mouse.x.toFixed(1)}, ${mouse.y.toFixed(1)}`;
    const showRound = state === 'round' && round !== null;
    info.textContent = [
      `fps     ${fps === null ? '—' : fps.toFixed(0)}${fx.breathingSupported ? '' : '  (no WebGL)'}`,
      `scale   ${getScale().toFixed(4)}`,
      `window  ${window.innerWidth} × ${window.innerHeight}`,
      `stage   ${stage}`,
      `state   ${state ?? '—'}${showRound ? `  (round ${round}/${gameConfig.roundCount})` : ''}`,
      `seed    ${game.context.session.seed}`,
      `shape   ${round === null ? '—' : shapeSeed(game.context.session, round)}`,
      `clock   ${liveClock()}`,
      `live    ${liveScore()}`,
    ].join('\n');
    events.textContent = log.length ? log.join('\n') : 'no events yet';
    for (const [name, button] of stateButtons) {
      button.classList.toggle('is-active', name === state);
    }
    alertButton.classList.toggle('is-active', fx.alertActive);
    dropButton.classList.toggle('is-active', fx.dropped);
  };

  // FPS, measured only while the panel is open.
  let fps: number | null = null;
  let frames = 0;
  let since = performance.now();
  const countFrame = (now: number): void => {
    if (!el.hidden) {
      frames++;
      if (now - since >= FPS_WINDOW_MS) {
        fps = (frames * 1000) / (now - since);
        frames = 0;
        since = now;
        render();
      }
    } else {
      frames = 0;
      since = now;
    }
    requestAnimationFrame(countFrame);
  };
  requestAnimationFrame(countFrame);

  // Specific listeners run before onAny ones, so state and round are fresh when we render.
  bus.on('state.change', ({ to }) => (state = to));
  bus.on('round.intro.start', ({ roundId }) => {
    round = roundId;
    roundVisible = false;
  });
  bus.on('round.shape.visible', () => (roundVisible = true));
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
  // The round clock and deadline change without any event; refresh while a round runs.
  window.setInterval(() => {
    if (roundMs() !== null) render();
  }, LIVE_REFRESH_MS);
  render();
}
