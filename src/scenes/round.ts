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
import { commitStyles, fadeTo, moveY, prefersReducedMotion } from '../ui/motion';
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
 * intro ("Test #N" + objective) → shape fades in → one click → outro → next round.
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

    // "Test #N" with the objective right below it, centered on the screen as one group.
    const titleTop = (contentSize.height - (L.title.lineHeight + L.title.gap + L.lineHeight)) / 2;
    const objectiveIntroTop = titleTop + L.title.lineHeight + L.title.gap;

    const title = h('h2', 'round-title fade', fill(copy.round.title, { n: padRound(roundId) }));
    setRem(title, { top: titleTop, fontSize: L.title.fontSize, lineHeight: L.title.lineHeight });
    title.style.opacity = '0';

    // The objective sits at its bottom position, shifted up to the center for the intro.
    // The wrapper moves; the text inside fades.
    const objective = h('div', 'round-objective move');
    setRem(objective, { top: L.objectiveText.top });
    const objectiveText = h('p', 'round-objective__text fade', copy.objectives[round.copyKey]);
    objectiveText.style.opacity = '0';
    objective.append(objectiveText);
    moveY(objective, objectiveIntroTop - L.objectiveText.top, 0);

    // Shape, debug markers and (later) the click marker fade in and out together.
    const play = h('div', 'round-play fade');
    play.style.opacity = '0';
    const shape = createShape(round, c);
    play.append(
      shape,
      createMarker('computed', c),
      createMarker('pole', m),
      createMarker('optical', o),
    );

    root.append(play, title, objective);
    scope.mount(ctx.content, root);
    commitStyles(root);

    hud.setVisible(true, 0);
    hud.setRound(roundId);
    hud.setTime(0);

    const timeline = round.timeline;
    const tl: RoundTimelineContext = { roundId, root, shape, bus };
    const introStartedAt = performance.now();
    let stage: RoundStage = 'intro';
    let shapeVisibleAt: number | null = null;
    let clicked = false;
    let finished = false;

    // 1. Title and objective fade in at the center; 2. hold.
    bus.emit('round.intro.start', { roundId });
    timeline?.onIntroStart?.(tl);
    fadeTo(title, 1, seq.titleFadeInMs, seq.fadeEasing);
    fadeTo(objectiveText, 1, seq.titleFadeInMs, seq.fadeEasing);

    // 3. Title fades out while the objective moves down.
    scope.timeout(() => {
      fadeTo(title, 0, seq.titleFadeOutMs, seq.fadeEasing);
      moveY(objective, 0, seq.objectiveMoveMs, seq.moveEasing);
    }, seq.titleFadeOutAt);

    // 4. The shape fades in.
    scope.timeout(() => {
      bus.emit('round.intro.end', { roundId });
      fadeTo(play, 1, seq.shapeFadeInMs, seq.fadeEasing);
    }, seq.introEndAt);

    // 5. Fully visible: the timer starts and clicks count.
    scope.timeout(() => {
      shapeVisibleAt = performance.now();
      stage = 'play';
      bus.emit('round.shape.visible', { roundId });
      timeline?.onShapeVisible?.(tl);
    }, seq.shapeVisibleAt);

    scope.frame((now) => {
      if (shapeVisibleAt !== null && !clicked) hud.setTime(now - shapeVisibleAt);
      timeline?.onFrame?.(tl, { elapsedMs: now - introStartedAt, stage });
      return !finished;
    });

    // 6. The click: marker + tooltip. The timer freezes at the click time.
    scope.listen(ctx.content, 'pointerdown', (e) => {
      if (shapeVisibleAt === null || clicked || e.button !== 0) return;
      clicked = true;

      // The event's own timestamp is when the press happened, not when we handled it.
      const latencyMs = Math.max(Math.round(e.timeStamp - shapeVisibleAt), 0);
      const point = toContentCoords(e.clientX, e.clientY);
      const result = createResult(roundId, point, latencyMs, contentSize);
      hud.setTime(latencyMs);
      play.append(createClickMarker(point));

      bus.emit('round.click', { roundId, content: point, local: result.click, latencyMs });
      session.results.push(result);
      bus.emit('round.logged', { result });
      showLoggedTooltip(result, root);
      timeline?.onClick?.(tl, { content: point, latencyMs });

      // 7. Wait; 8. objective, shape and marker fade out (the tooltip stays).
      scope.timeout(() => {
        stage = 'outro';
        bus.emit('round.outro.start', { roundId });
        fadeTo(play, 0, seq.outroFadeMs, seq.fadeEasing);
        fadeTo(objectiveText, 0, seq.outroFadeMs, seq.fadeEasing);

        // 9. Next round, or the end of the game.
        scope.timeout(() => {
          finished = true;
          bus.emit('round.outro.end', { roundId });
          timeline?.onOutroEnd?.(tl);
          if (roundId < gameConfig.roundCount) {
            session.currentRound = roundId + 1;
            ctx.machine.go('round');
          } else {
            bus.emit('game.end', { results: session.results });
            ctx.machine.go('ending');
          }
        }, seq.outroFadeMs);
      }, seq.postClickWaitMs);
    });
  });
}
