import { gameConfig } from '../config/game.config';
import type { SceneContext } from '../core/game';
import { defineScene, type Scene } from '../core/scenes';

/** The doors slide apart (plain CSS transition), then loading starts. */
export function createOpeningScene(ctx: SceneContext): Scene {
  return defineScene((scope) => {
    const durationMs = gameConfig.doorOpenMs;
    ctx.bus.emit('door.open.start', { durationMs });
    ctx.doors.setOpen(true, durationMs);

    scope.timeout(() => {
      ctx.bus.emit('door.open.end', {});
      ctx.machine.go('loading');
    }, durationMs);
  });
}
