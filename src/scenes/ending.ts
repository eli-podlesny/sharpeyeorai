import { gameConfig } from '../config/game.config';
import type { SceneContext } from '../core/game';
import { defineScene, type Scene } from '../core/scenes';

/**
 * After the last round: the doors close, the scene goes dark for `endDarknessMs`,
 * the darkness lifts, and the score scene opens the doors onto the result.
 */
export function createEndingScene(ctx: SceneContext): Scene {
  return defineScene((scope) => {
    const { bus, darkness } = ctx;
    const closeMs = gameConfig.doorCloseMs;
    const fadeMs = gameConfig.endDarknessFadeMs;

    // Leaving early (debug jump) must not keep the window dark.
    scope.onDispose(() => darkness.setDark(false, 0));

    bus.emit('door.close.start', { durationMs: closeMs });
    ctx.doors.setOpen(false, closeMs);

    scope.timeout(() => {
      bus.emit('door.close.end', {});
      bus.emit('scene.dark', { dark: true, durationMs: fadeMs });
      darkness.setDark(true, fadeMs);
    }, closeMs);

    const lightAt = closeMs + fadeMs + gameConfig.endDarknessMs;
    scope.timeout(() => {
      bus.emit('scene.dark', { dark: false, durationMs: fadeMs });
      darkness.setDark(false, fadeMs);
    }, lightAt);

    scope.timeout(() => ctx.machine.go('score'), lightAt + fadeMs);
  });
}
