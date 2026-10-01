import { copy, fill, padRound } from '../config/copy';
import { gameConfig } from '../config/game.config';
import { layout } from '../config/layout.config';
import { getRound, type RoundConfig } from '../config/rounds.config';
import type { SceneContext } from '../core/game';
import { contentSize, toContentCoords } from '../core/input';
import { defineScene, type Scene } from '../core/scenes';
import type { Point } from '../core/stage';
import { rem, setRem } from '../core/units';
import { roundCenters } from '../rounds/opticalCenter';
import { buildRoundSequence } from '../rounds/sequence';
import { createResult, type RoundResult } from '../rounds/session';
import type { RoundStage, RoundTimelineContext } from '../rounds/timeline';
import { h } from '../ui/dom';
import { commitStyles, fadeTo, moveTo, prefersReducedMotion } from '../ui/motion';
import { showTooltipAtCorner } from '../ui/tooltip';

const { round: L } = layout;

/** The placeholder shape, centered on C and turned around it. */
function createShape(round: RoundConfig, c: Point): HTMLElement {
  const { width, height, rotationDeg } = round.shape;
  const shape = h('div', `round-shape round-shape--${round.shape.type}`);
  setRem(shape, {
    left: c.x - width / 2,
    top: c.y - height / 2,
    width,
    height,
    borderWidth: L.shapeBorder,
  });
  shape.style.transform = `rotate(${rotationDeg}deg)`;
  return shape;
}

/** Debug markers: a cross at C, a circle at O, a square at M. Hidden unless the debug toggle is on. */
function createMarker(kind: 'computed' | 'optical' | 'pole', at: Point): HTMLElement {
  const marker = h('div', `debug-marker debug-marker--${kind}`);
  setRem(marker, { left: at.x, top: at.y, width: L.markerSize, height: L.markerSize });
  marker.style.setProperty('--marker-stroke', rem(L.markerStroke));
  return marker;
}

/** The dot left where the player clicked. */
function createClickMarker(at: Point): HTMLElement {
  const marker = h('div', 'round-click-marker');
  setRem(marker, {
    left: at.x,
    top: at.y,
    width: L.clickMarkerSize,
    height: L.clickMarkerSize,
  });
  return marker;
}

/** "Sample 0X, logged", pinned to the top-right corner. Position and time only: no points during the game. */
function showLoggedTooltip(result: RoundResult, container: HTMLElement): void {
  showTooltipAtCorner(container, L.loggedTooltip, {
    title: fill(copy.round.logged, { n: padRound(result.roundId) }),
    lines: [
      fill(copy.round.loggedPosition, {
        x: result.click.x.toFixed(1),
        y: result.click.y.toFixed(1),
      }),
      fill(copy.round.loggedTime, { ms: result.latencyMs }),
    ],
  });
}

/**
 * One test round, following the shared sequence (src/rounds/sequence.ts):
 * shape fades in (objective slides up a moment later) → one click → fade out → pause → next round.
 * The timer and the latency count from the moment the shape is fully visible; clicks
 * before that are ignored. Counter, progress and timer live in the screen HUD.
 */
export function createRoundScene(ctx: SceneContext): Scene {
  return defineScene((scope) => {
    ctx.doors.setOpen(true, 0);

    const { session, hud, bus } = ctx;
    const roundId = session.currentRound;
    const round = getRound(roundId);
    const { C: c, M: m, O: o } = roundCenters(round, contentSize);
    const seq = buildRoundSequence(gameConfig.roundSequence, prefersReducedMotion());

    const root = h('div', 'round');
    setRem(root, { fontSize: L.textSize, lineHeight: L.lineHeight });

    // The objective starts a little below its line: the wrapper slides up, the text fades.
    const objective = h('div', 'round-objective move');
    setRem(objective, { top: L.objectiveText.top });
    const objectiveText = h('p', 'round-objective__text fade', copy.objectives[round.copyKey]);
    objectiveText.style.opacity = '0';
    objective.append(objectiveText);
    moveTo(objective, { y: L.objectiveSlide }, 0);

    // Shape, debug markers and (later) the click marker fade, rise and zoom together:
    // the outer layer fades, the inner one moves and scales around the shape's center.
    const play = h('div', 'round-play fade');
    play.style.opacity = '0';
    const playMotion = h('div', 'round-play move');
    playMotion.style.transformOrigin = `${rem(c.x)} ${rem(c.y)}`;
    moveTo(playMotion, { y: L.shapeEnter.rise, scale: L.shapeEnter.scale }, 0);
    play.append(playMotion);
    const shape = createShape(round, c);
    playMotion.append(
      shape,
      createMarker('computed', c),
      createMarker('pole', m),
      createMarker('optical', o),
    );

    root.append(play, objective);
    scope.mount(ctx.content, root);
    commitStyles(root);

    hud.setVisible(true, 0);
    hud.setRound(roundId);
    hud.setTime(null);

    const timeline = round.timeline;
    const tl: RoundTimelineContext = { roundId, root, shape, bus };
    const startedAt = performance.now();
    let stage: RoundStage = 'intro';
    let shapeVisibleAt: number | null = null;
    let clicked = false;
    let finished = false;

    // 1. The shape fades in, rising and zooming in; the objective follows a moment later, sliding up.
    bus.emit('round.intro.start', { roundId });
    timeline?.onIntroStart?.(tl);
    fadeTo(play, 1, seq.shapeFadeInMs, seq.fadeEasing);
    moveTo(playMotion, {}, seq.shapeMoveInMs, seq.slideEasing);
    scope.timeout(() => {
      fadeTo(objectiveText, 1, seq.objectiveFadeInMs, seq.fadeEasing);
      moveTo(objective, {}, seq.objectiveSlideMs, seq.slideEasing);
    }, seq.objectiveDelayMs);

    // 2. The shape is fully visible: the timer starts and clicks count.
    scope.timeout(() => {
      shapeVisibleAt = performance.now();
      stage = 'play';
      bus.emit('round.intro.end', { roundId });
      bus.emit('round.shape.visible', { roundId });
      timeline?.onShapeVisible?.(tl);
    }, seq.shapeFadeInMs);

    scope.frame((now) => {
      if (shapeVisibleAt !== null && !clicked) hud.setTime(now - shapeVisibleAt);
      timeline?.onFrame?.(tl, { elapsedMs: now - startedAt, stage });
      return !finished;
    });

    // 3. The click: marker + tooltip. The timer freezes at the click time.
    scope.listen(ctx.content, 'pointerdown', (e) => {
      if (shapeVisibleAt === null || clicked || e.button !== 0) return;
      clicked = true;

      // The event's own timestamp is when the press happened, not when we handled it.
      const latencyMs = Math.max(Math.round(e.timeStamp - shapeVisibleAt), 0);
      const point = toContentCoords(e.clientX, e.clientY);
      const result = createResult(roundId, point, latencyMs, contentSize);
      hud.setTime(latencyMs);
      playMotion.append(createClickMarker(point));
      fadeTo(objectiveText, 0, seq.objectiveFadeOutMs, seq.fadeEasing);

      bus.emit('round.click', { roundId, content: point, local: result.click, latencyMs });
      session.results.push(result);
      bus.emit('round.logged', { result });
      showLoggedTooltip(result, root);
      timeline?.onClick?.(tl, { content: point, latencyMs });

      // 4. Wait; 5. shape and marker fade out, the shape zooming out in place
      // (the tooltip stays).
      scope.timeout(() => {
        stage = 'outro';
        bus.emit('round.outro.start', { roundId });
        fadeTo(play, 0, seq.outroFadeMs, seq.fadeEasing);
        moveTo(playMotion, { scale: L.shapeEnter.scale }, seq.shapeMoveOutMs, seq.fadeEasing);

        scope.timeout(() => {
          finished = true;
          bus.emit('round.outro.end', { roundId });
          timeline?.onOutroEnd?.(tl);
        }, seq.outroFadeMs);

        // 6. Pause, then the next round or the end of the game.
        scope.timeout(() => {
          if (roundId < gameConfig.roundCount) {
            session.currentRound = roundId + 1;
            ctx.machine.go('round');
          } else {
            bus.emit('game.end', { results: session.results });
            ctx.machine.go('ending');
          }
        }, seq.outroFadeMs + seq.betweenRoundsMs);
      }, seq.postClickWaitMs);
    });
  });
}
