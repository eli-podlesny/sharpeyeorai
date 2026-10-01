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
import { createResult, type RoundResult } from '../rounds/session';
import { h } from '../ui/dom';
import { showTooltip } from '../ui/tooltip';

const { round: L } = layout;

/** "Test 04/12" with the progress bar beside it. */
function createProgress(roundId: number): HTMLElement {
  const { progress } = L;
  const group = h('div', 'round-progress');
  setRem(group, { left: progress.left, top: progress.top, lineHeight: L.lineHeight });

  const label = h(
    'span',
    'round-progress__label',
    fill(copy.round.counter, { n: padRound(roundId) }),
  );
  const total = h(
    'span',
    'round-text-dim',
    fill(copy.round.counterTotal, { total: padRound(gameConfig.roundCount) }),
  );
  label.append(total);

  const track = h('div', 'round-progress__track');
  setRem(track, {
    left: progress.barOffsetX,
    top: progress.barOffsetY,
    width: progress.barWidth,
    height: progress.barHeight,
  });
  const bar = h('div', 'round-progress__bar');
  bar.style.width = `${(roundId / gameConfig.roundCount) * 100}%`;
  track.append(bar);

  group.append(label, track);
  return group;
}

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

/** "Sample 0X, logged" next to the click. Position and time only: no points during the game. */
function showLoggedTooltip(result: RoundResult, container: HTMLElement): void {
  showTooltip(container, result.clickContent, {
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
 * One test round: counter, progress, live timer, the shape and the objective.
 * Takes exactly one click, logs it, shows the tooltip and moves on.
 */
export function createRoundScene(ctx: SceneContext): Scene {
  return defineScene((scope) => {
    ctx.doors.setOpen(true, 0);

    const { session } = ctx;
    const roundId = session.currentRound;
    const round = getRound(roundId);
    const { C: c, M: m, O: o } = roundCenters(round, contentSize);

    const root = h('div', 'round');
    setRem(root, { fontSize: L.textSize });

    const timer = h('div', 'round-timer');
    setRem(timer, { right: L.timer.right, top: L.timer.top, lineHeight: L.lineHeight });
    const timerValue = h('span', '', fill(copy.round.timeValue, { ms: 0 }));
    timer.append(h('span', 'round-text-dim', copy.round.timeLabel), timerValue);

    const objectiveLabel = h('p', 'round-objective-label', copy.round.objectiveLabel);
    setRem(objectiveLabel, {
      top: L.objectiveLabel.top,
      fontSize: L.objectiveLabel.fontSize,
      letterSpacing: L.objectiveLabel.letterSpacing,
      lineHeight: L.lineHeight,
    });
    const objective = h('p', 'round-objective', copy.objectives[round.copyKey]);
    setRem(objective, { top: L.objectiveText.top, lineHeight: L.lineHeight });

    root.append(
      createProgress(roundId),
      timer,
      createShape(round, c),
      createMarker('computed', c),
      createMarker('pole', m),
      createMarker('optical', o),
      objectiveLabel,
      objective,
    );
    scope.mount(ctx.content, root);

    const startedAt = performance.now();
    let clicked = false;
    ctx.bus.emit('round.start', { roundId });

    scope.frame((now) => {
      if (clicked) return false;
      timerValue.textContent = fill(copy.round.timeValue, { ms: Math.round(now - startedAt) });
    });

    scope.listen(ctx.content, 'pointerdown', (e) => {
      if (clicked || e.button !== 0) return;
      clicked = true;

      // The event's own timestamp is when the press happened, not when we handled it.
      const latencyMs = Math.round(e.timeStamp - startedAt);
      const point = toContentCoords(e.clientX, e.clientY);
      const result = createResult(roundId, point, latencyMs, contentSize);
      timerValue.textContent = fill(copy.round.timeValue, { ms: latencyMs });

      ctx.bus.emit('round.click', {
        roundId,
        content: point,
        local: result.click,
        latencyMs,
      });
      session.results.push(result);
      ctx.bus.emit('round.logged', { result });
      showLoggedTooltip(result, root);

      scope.timeout(() => {
        ctx.bus.emit('round.end', { roundId });
        if (roundId < gameConfig.roundCount) {
          session.currentRound = roundId + 1;
          ctx.machine.go('round');
        } else {
          ctx.bus.emit('game.end', { results: session.results });
          ctx.machine.go('calculating');
        }
      }, gameConfig.nextRoundDelayMs);
    });
  });
}
