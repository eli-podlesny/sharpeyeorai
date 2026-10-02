import { copy } from '../config/copy';
import { gameConfig } from '../config/game.config';
import { layout } from '../config/layout.config';
import { getRound, opticalSettings } from '../config/rounds.config';
import type { SceneContext } from '../core/game';
import { contentSize, toContentCoords } from '../core/input';
import { defineScene, type Scene } from '../core/scenes';
import type { Point } from '../core/stage';
import { setU, u } from '../core/units';
import {
  createRoundClock,
  DEBUG_STEP_MS,
  liveRound,
  roundDebug,
  type LiveRound,
} from '../rounds/clock';
import type { PlacedShape } from '../rounds/geometry';
import { isMoving, shapeAt } from '../rounds/motion';
import { shapeCenters, type Centers } from '../rounds/opticalCenter';
import { materialCentroid } from '../rounds/polygon';
import { buildRoundSequence } from '../rounds/sequence';
import { createResult, createTimeoutResult, shapeSeed, type RoundResult } from '../rounds/session';
import { roundTarget, targetAt } from '../rounds/target';
import type { RoundStage, RoundTimelineContext } from '../rounds/timeline';
import {
  acceptsClick,
  decoyLitAt,
  fixedRoundEndMs,
  inputDeadlineMs,
  shapeOpacityAt,
} from '../rounds/timing';
import { h } from '../ui/dom';
import { addShapeMark, createShapeSvg, updateShapeSvg } from '../ui/shapeSvg';
import { commitStyles, fadeTo, moveTo, prefersReducedMotion } from '../ui/motion';
import { createChatStack, showChatMessage } from '../ui/chatMessage';
import { showSampleTooltip, type SampleData } from '../ui/sampleTooltip';

const { round: L } = layout;

type MarkerKind = 'computed' | 'optical' | 'pole';

/** Debug markers: a cross at C, a circle at O, a square at M. Hidden unless the debug toggle is on. */
function createMarker(kind: MarkerKind, at: Point): HTMLElement {
  const marker = h('div', `debug-marker debug-marker--${kind}`);
  setU(marker, { left: at.x, top: at.y, width: L.markerSize, height: L.markerSize });
  marker.style.setProperty('--marker-stroke', u(L.markerStroke));
  return marker;
}

/** The dot left where the player clicked. */
function createClickMarker(at: Point): HTMLElement {
  const marker = h('div', 'round-click-marker');
  setU(marker, {
    left: at.x,
    top: at.y,
    width: L.clickMarkerSize,
    height: L.clickMarkerSize,
  });
  return marker;
}

/**
 * "Sample 0X  LOGGED" (or NO INPUT after a timeout), pinned to the top-right corner.
 * Position and time only: no points during the game. It goes in `play`, the layer that
 * fades out with the shape, so it stays exactly as long as the shape.
 */
function showSample(play: HTMLElement, data: SampleData): void {
  showSampleTooltip(play, L.loggedTooltip, data, prefersReducedMotion());
}

const markersOn = (): boolean => document.documentElement.hasAttribute('data-debug-markers');

/**
 * One test round, following the shared sequence (src/rounds/sequence.ts):
 * shape fades in → one click → fade out → pause → next round. The objective line stays
 * put in the screen HUD (shown by the objective intro before round 1).
 *
 * From the moment the shape is fully visible, everything runs on the round clock
 * (src/rounds/clock.ts), which pauses while the tab is hidden: the timer, latency, motion
 * (src/rounds/motion.ts) and deadlines (src/rounds/timing.ts). On the click, motion
 * freezes and the round is scored against the frame on screen. A round whose deadline
 * passes with no click logs a timeout and moves on. Rounds with `postRoundIdleMs`
 * (round 12) run their fixed length, click or not.
 */
export function createRoundScene(ctx: SceneContext): Scene {
  return defineScene((scope) => {
    ctx.doors.setOpen(true, 0);

    const { session, hud, bus } = ctx;
    const roundId = session.currentRound;
    const round = getRound(roundId);
    const seed = shapeSeed(session, roundId);
    const restTarget = roundTarget(round, contentSize, seed);
    const { anchor } = restTarget.shape;
    const seq = buildRoundSequence(gameConfig.roundSequence, prefersReducedMotion());
    const deadline = inputDeadlineMs(round);
    const fixedEnd = fixedRoundEndMs(round);
    const moving = isMoving(round);

    const root = h('div', 'round');
    setU(root, { fontSize: L.textSize, lineHeight: L.lineHeight });

    // Shape, debug markers and (later) the click marker fade, rise and zoom together:
    // the outer layer fades, the inner one moves and scales around the shape's center.
    const play = h('div', 'round-play fade');
    play.style.opacity = '0';
    const playMotion = h('div', 'round-play move');
    playMotion.style.transformOrigin = `${u(anchor.x)} ${u(anchor.y)}`;
    moveTo(playMotion, { y: L.shapeEnter.rise, scale: L.shapeEnter.scale }, 0);
    play.append(playMotion);
    const shape = createShapeSvg(restTarget.shape, contentSize, {
      fill: round.fill,
      strokeWidth: L.shapeBorder,
      type: round.shape.type,
    });
    if (round.shapeMark) {
      addShapeMark(shape, restTarget.centers.C, copy.round.shapeMark, L.shapeMarkSize);
    }
    const markers: Record<MarkerKind, HTMLElement> = {
      computed: createMarker('computed', restTarget.centers.C),
      pole: createMarker('pole', restTarget.centers.M),
      optical: createMarker('optical', restTarget.centers.O),
    };
    playMotion.append(shape, markers.computed, markers.pole, markers.optical);

    const decoy = round.decoy ? h('div', 'round-decoy') : null;
    if (decoy) {
      setU(decoy, { width: L.decoySize, height: L.decoySize });
      decoy.hidden = true;
      playMotion.append(decoy);
    }

    root.append(play);
    // Round 12 renders above the scene darkness; clicks still go to screen-content below.
    scope.mount(round.aboveDarkness ? ctx.spotlight : ctx.content, root);
    commitStyles(root);

    hud.setVisible(true, 0);
    hud.setRound(roundId);
    hud.setTime(null);
    // The objective line is already in place after the objective intro; this also
    // covers starting at a round directly (debug jump). Round 12 has none.
    hud.setObjective(copy.objectives[round.copyKey]);
    hud.moveObjective(0, 0);
    hud.fadeObjective(round.showObjective ? 1 : 0, 0);

    // The round clock pauses while the tab is hidden and when the debug panel says so.
    const clock = createRoundClock();
    const syncHidden = (): void => clock.setPaused('hidden', document.hidden, performance.now());
    syncHidden();
    document.addEventListener('visibilitychange', syncHidden);
    const live: LiveRound = { roundId, elapsedMs: () => clock.elapsed(performance.now()) };
    liveRound.current = live;
    scope.onDispose(() => {
      document.removeEventListener('visibilitychange', syncHidden);
      if (liveRound.current === live) liveRound.current = null;
    });

    const timeline = round.timeline;
    const tl: RoundTimelineContext = { roundId, root, shape, bus };
    const startedAt = performance.now();
    let stage: RoundStage = 'intro';
    /** The frame on screen: its round time and its shape. Frozen once the round is decided. */
    let shownMs = 0;
    let shown: PlacedShape = restTarget.shape;
    let markersAtMs = 0;
    /** A click or a timeout decided the round. */
    let decided = false;
    let outroStarted = false;
    let finished = false;

    const placeMarkers = (centers: Centers): void => {
      setU(markers.computed, { left: centers.C.x, top: centers.C.y });
      setU(markers.pole, { left: centers.M.x, top: centers.M.y });
      setU(markers.optical, { left: centers.O.x, top: centers.O.y });
    };

    // 5. Shape and marker fade out, the shape zooming out in place. After the last round,
    // or before a round without one, the objective line fades out too.
    // 6. Pause, then the next round or the end of the game.
    const startOutro = (): void => {
      if (outroStarted) return;
      outroStarted = true;
      stage = 'outro';
      bus.emit('round.outro.start', { roundId });
      playMotion.style.transformOrigin = `${u(shown.anchor.x)} ${u(shown.anchor.y)}`;
      fadeTo(play, 0, seq.outroFadeMs, seq.fadeEasing);
      moveTo(playMotion, { scale: L.shapeEnter.scale }, seq.shapeMoveOutMs, seq.fadeEasing);
      const isLast = roundId === gameConfig.roundCount;
      if (round.showObjective && (isLast || !getRound(roundId + 1).showObjective)) {
        hud.fadeObjective(0, seq.outroFadeMs, seq.fadeEasing);
      }

      scope.timeout(() => {
        finished = true;
        bus.emit('round.outro.end', { roundId });
        timeline?.onOutroEnd?.(tl);
      }, seq.outroFadeMs);

      scope.timeout(() => {
        if (!isLast) {
          session.currentRound = roundId + 1;
          ctx.machine.go('round');
        } else {
          bus.emit('game.end', { results: session.results });
          ctx.machine.go('ending');
        }
      }, seq.outroFadeMs + seq.betweenRoundsMs);
    };

    /**
     * The round is decided: motion freezes, the pulse stops, and the round heads for its outro.
     * Fixed-length rounds wait for their end on the clock instead (see the frame loop), unless
     * `endNow` (a click in a round with `clickEndsRound`).
     */
    const decide = (result: RoundResult, outroAfterMs: number, endNow = false): void => {
      decided = true;
      shape.classList.add('is-pulse-stopped');
      if (decoy) decoy.hidden = true;
      session.results.push(result);
      bus.emit('round.logged', { result });
      if (fixedEnd === null) scope.timeout(startOutro, outroAfterMs);
      else if (endNow) startOutro();
    };

    // 0. A round may open with a chat message (10: "Hurry Up!"; 12: "Last chance...", lit
    // in the dark with the round's content, the triangle waiting `shapeDelayMs` for it).
    bus.emit('round.intro.start', { roundId });
    timeline?.onIntroStart?.(tl);
    if (round.startMessage) {
      let anchor: HTMLElement | undefined;
      if (round.aboveDarkness) {
        anchor = createChatStack();
        root.append(anchor);
      }
      showChatMessage({
        variant: round.startMessage.variant,
        title: copy.chat[round.startMessage.copyKey],
        durationMs: round.startMessage.durationMs,
        anchor,
      });
    }
    const shapeStartMs = round.shapeDelayMs ?? 0;

    // 1. The shape fades in, rising and zooming in.
    scope.timeout(() => {
      fadeTo(play, 1, seq.shapeFadeInMs, seq.fadeEasing);
      moveTo(playMotion, {}, seq.shapeMoveInMs, seq.slideEasing);
    }, shapeStartMs);

    // 2. The shape is fully visible: the round clock starts, the fill pulses, clicks count
    // and moving shapes start moving.
    scope.timeout(() => {
      clock.start(performance.now());
      shape.style.setProperty('--pulse-ms', `${seq.shapePulseMs}ms`);
      shape.classList.add('is-pulsing');
      stage = 'play';
      bus.emit('round.intro.end', { roundId });
      bus.emit('round.shape.visible', { roundId });
      timeline?.onShapeVisible?.(tl);
    }, shapeStartMs + seq.shapeFadeInMs);

    scope.frame((now) => {
      clock.setPaused('debug', roundDebug.paused, now);
      if (roundDebug.steps > 0) {
        if (clock.paused) clock.advance(roundDebug.steps * DEBUG_STEP_MS);
        roundDebug.steps = 0;
      }
      const t = clock.elapsed(now);

      if (!decided) {
        if (clock.started) hud.setTime(t);
        if (moving && t !== shownMs) {
          shownMs = t;
          shown = shapeAt(round, contentSize, seed, t);
          updateShapeSvg(shape, shown);
        }
      }
      if (moving && markersOn() && markersAtMs !== shownMs) {
        markersAtMs = shownMs;
        placeMarkers(shapeCenters(shown, opticalSettings(round)));
      }
      if (round.hideAfter) shape.style.opacity = String(shapeOpacityAt(round, t));

      // The decoy blinks on the shape's C (or O) as it is right now.
      if (decoy && round.decoy) {
        const lit = clock.started && !decided && decoyLitAt(round.decoy, t);
        if (lit) {
          const at =
            round.decoy.target === 'computed'
              ? materialCentroid(shown.outer, shown.holes)
              : shapeCenters(shown, opticalSettings(round)).O;
          setU(decoy, { left: at.x, top: at.y });
        }
        decoy.hidden = !lit;
      }

      // No click by the deadline: a timeout. The timer stops at the deadline.
      if (clock.started && !decided && deadline !== null && t >= deadline) {
        hud.setTime(deadline);
        bus.emit('round.timeout', { roundId });
        if (round.clickFeedback) {
          showSample(play, { kind: 'noInput', roundId, deadlineMs: deadline });
        }
        decide(createTimeoutResult(targetAt(round, contentSize, seed, shownMs)), 0);
      }
      if (clock.started && fixedEnd !== null && t >= fixedEnd) startOutro();

      timeline?.onFrame?.(tl, { elapsedMs: now - startedAt, roundMs: t, stage });
      return !finished;
    });

    // 3. The click: marker + tooltip (unless the round hides them). Motion and timer freeze.
    scope.listen(ctx.content, 'pointerdown', (e) => {
      if (!clock.started || decided || e.button !== 0) return;
      // The event's own timestamp is when the press happened, not when we handled it.
      const clickMs = clock.elapsed(e.timeStamp);
      if (!acceptsClick(round, clickMs)) return;

      const latencyMs = Math.max(Math.round(clickMs), 0);
      const point = toContentCoords(e.clientX, e.clientY);
      // Scored against the frame on screen at the click.
      const target = targetAt(round, contentSize, seed, shownMs);
      const result = createResult(target, point, latencyMs);
      const local = result.click ?? point;
      hud.setTime(latencyMs);
      bus.emit('round.click', { roundId, content: point, local, latencyMs });
      if (round.clickFeedback) {
        playMotion.append(createClickMarker(point));
        showSample(play, { kind: 'logged', roundId, at: local, latencyMs });
      }
      timeline?.onClick?.(tl, { content: point, latencyMs });
      // 4. Wait, then the outro (round 12: the outro at once).
      decide(result, seq.postClickWaitMs, round.clickEndsRound === true);
    });
  });
}
