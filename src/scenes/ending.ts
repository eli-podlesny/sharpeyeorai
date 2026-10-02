import { gameConfig } from '../config/game.config';
import type { SceneContext } from '../core/game';
import { defineScene, type Scene } from '../core/scenes';

/**
 * After the last round: the doors close (round 12 usually shut them already), the scene
 * goes fully black for `endDarknessMs`, and while it is black every effect switches off
 * and the screen returns to its place (scene mode `normal`). Then the lights come back
 * and the score scene opens the doors onto the result.
 */
export function createEndingScene(ctx: SceneContext): Scene {
  return defineScene((scope) => {
    const { bus, darkness } = ctx;
    const closeMs = ctx.doors.isClosed ? 0 : gameConfig.doorCloseMs;
    const fadeMs = gameConfig.endDarknessFadeMs;

    // Leaving early (debug jump) must not keep the window dark.
    scope.onDispose(() => darkness.setLevel(0, 0));

    if (closeMs > 0) {
      bus.emit('door.close.start', { durationMs: closeMs });
      ctx.doors.setOpen(false, closeMs);
    }

    scope.timeout(() => {
      if (closeMs > 0) bus.emit('door.close.end', {});
      bus.emit('scene.dark', { dark: true, durationMs: fadeMs });
      darkness.setLevel(1, fadeMs);
    }, closeMs);

    // Fully black: effects off, screen back in place, out of sight.
    scope.timeout(() => ctx.setSceneMode('normal'), closeMs + fadeMs);

    const lightAt = closeMs + fadeMs + gameConfig.endDarknessMs;
    scope.timeout(() => {
      bus.emit('scene.dark', { dark: false, durationMs: fadeMs });
      darkness.setLevel(0, fadeMs);
    }, lightAt);

    scope.timeout(() => ctx.machine.go('score'), lightAt + fadeMs);
  });
}
