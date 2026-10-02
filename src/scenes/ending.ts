import { gameConfig } from '../config/game.config';
import type { SceneContext } from '../core/game';
import { defineScene, type Scene } from '../core/scenes';
import { breathEndAfterClickMs } from '../fx/schedule';

/**
 * After the last round: the doors close and the scene goes fully black, then every effect
 * switches off and the screen returns to its place (scene mode `normal`), out of sight.
 * Then the lights come back and the score scene opens the doors onto the result.
 *
 * Round 12 leaves the scene black already. With no click there, the black lasts
 * `endDarknessMs`. A click ends round 12 at once, and then the black lasts
 * `fx.blackout.afterClickMs` counted from the click (the round's fade-out and pause included).
 * Doors that are still open in the black are shut at once, unseen.
 */
export function createEndingScene(ctx: SceneContext): Scene {
  return defineScene((scope) => {
    const { bus, darkness, doors } = ctx;
    const { roundSequence: seq } = gameConfig;
    const alreadyDark = darkness.level >= 1;
    const clicked = ctx.session.results.at(-1)?.click != null;
    const closeMs = doors.isClosed || alreadyDark ? 0 : gameConfig.doorCloseMs;
    const fadeMs = gameConfig.endDarknessFadeMs;
    const darkAt = closeMs + (alreadyDark ? 0 : fadeMs);
    const holdMs =
      alreadyDark && clicked
        ? Math.max(gameConfig.fx.blackout.afterClickMs - seq.outroFadeMs - seq.betweenRoundsMs, 0)
        : gameConfig.endDarknessMs;

    // Leaving early (debug jump) must not keep the window dark.
    scope.onDispose(() => darkness.setLevel(0, 0));

    if (!doors.isClosed) {
      bus.emit('door.close.start', { durationMs: closeMs });
      doors.setOpen(false, closeMs);
      scope.timeout(() => bus.emit('door.close.end', {}), closeMs);
    }

    if (!alreadyDark) {
      scope.timeout(() => {
        bus.emit('scene.dark', { dark: true, durationMs: fadeMs });
        darkness.setLevel(1, fadeMs);
      }, closeMs);
    }

    // Fully black: effects off, screen back in place, out of sight. After a round 12 click
    // the last breath (fx.lastBreath) is still to come: the broken scene stays until it is over.
    const breathLeft =
      alreadyDark && clicked
        ? Math.max(breathEndAfterClickMs() - seq.outroFadeMs - seq.betweenRoundsMs, 0)
        : 0;
    scope.timeout(() => ctx.setSceneMode('normal'), darkAt + breathLeft);

    const lightAt = darkAt + holdMs;
    scope.timeout(() => {
      bus.emit('scene.dark', { dark: false, durationMs: fadeMs });
      darkness.setLevel(0, fadeMs);
    }, lightAt);

    scope.timeout(() => ctx.machine.go('score'), lightAt + fadeMs);
  });
}
