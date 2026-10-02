import { copy } from '../config/copy';
import { gameConfig } from '../config/game.config';
import { layout } from '../config/layout.config';
import { getRound } from '../config/rounds.config';
import type { SceneContext } from '../core/game';
import { contentSize } from '../core/input';
import { defineScene, type Scene } from '../core/scenes';
import { setU } from '../core/units';
import { buildObjectiveIntro } from '../rounds/sequence';
import { h } from '../ui/dom';
import { commitStyles, fadeTo, moveTo, prefersReducedMotion } from '../ui/motion';

const { objectiveIntro: L } = layout;

/**
 * Before round 1: "Objective:" (large) and the objective line appear at the center,
 * hold, then "Objective:" fades out moving down while the objective line moves to its
 * bottom place in the screen HUD, where it stays through round 12.
 */
export function createObjectiveScene(ctx: SceneContext): Scene {
  return defineScene((scope) => {
    ctx.doors.setOpen(true, 0);
    const { hud, bus } = ctx;
    const seq = buildObjectiveIntro(
      gameConfig.objectiveIntro,
      gameConfig.roundSequence.reducedMotionFadeMs,
      prefersReducedMotion(),
    );

    // "Objective:" and the objective line, centered on the screen as one group.
    const groupHeight = L.titleLineHeight + L.gap + layout.screenHud.lineHeight;
    const titleTop = (contentSize.height - groupHeight) / 2;
    const textCenterOffset = titleTop + L.titleLineHeight + L.gap - layout.screenHud.objective.top;

    // The wrapper rises and zooms; the title inside fades.
    const titleMotion = h('div', 'objective-intro move');
    setU(titleMotion, { top: titleTop, height: L.titleLineHeight });
    const title = h('h2', 'objective-intro__title fade', copy.objectiveIntro.title);
    setU(title, { fontSize: L.titleFontSize, lineHeight: L.titleLineHeight });
    title.style.opacity = '0';
    titleMotion.append(title);
    moveTo(titleMotion, { y: L.rise, scale: L.titleScale }, 0);
    scope.mount(ctx.content, titleMotion);

    hud.setVisible(true, 0);
    hud.setRound(0);
    hud.setTime(null);
    hud.setObjective(copy.objectives[getRound(1).copyKey]);
    hud.fadeObjective(0, 0);
    hud.moveObjective(textCenterOffset + L.rise, 0);
    commitStyles(titleMotion);

    // 1. "Objective:" fades in, rising and zooming in.
    bus.emit('objective.intro.start', {});
    fadeTo(title, 1, seq.titleInMs, seq.inEasing);
    moveTo(titleMotion, {}, seq.titleMoveInMs, seq.inEasing);

    // 2. The objective line follows, rising to just below it.
    scope.timeout(() => {
      hud.fadeObjective(1, seq.textInMs, seq.inEasing);
      hud.moveObjective(textCenterOffset, seq.textMoveInMs, seq.inEasing);
    }, seq.textDelayMs);

    // 3. Hold; 4. "Objective:" fades out moving down, the objective line moves to its place.
    scope.timeout(() => {
      fadeTo(title, 0, seq.outFadeMs, seq.outEasing);
      moveTo(titleMotion, { y: L.titleDrop }, seq.outMoveMs, seq.outEasing);
      hud.moveObjective(0, seq.outMoveMs, seq.outEasing);
    }, seq.outAt);

    scope.timeout(() => {
      bus.emit('objective.intro.end', {});
      ctx.machine.go('round');
    }, seq.endAt);
  });
}
