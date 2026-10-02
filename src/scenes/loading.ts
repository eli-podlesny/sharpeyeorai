import { copy } from '../config/copy';
import { gameConfig } from '../config/game.config';
import type { SceneContext } from '../core/game';
import { defineScene, type Scene } from '../core/scenes';
import { fadeTo } from '../ui/motion';
import { createFillingBar, createPanel, createTitle } from './layout';

/**
 * "Initializing" starts behind the shut doors, the doors open onto it after
 * `loadingStartBeforeDoorsMs`, and round 1 follows once both the bar and the doors
 * are done.
 */
export function createLoadingScene(ctx: SceneContext): Scene {
  return defineScene((scope) => {
    ctx.doors.setOpen(false, 0);
    ctx.hud.reset();

    const panel = createPanel('loading');
    panel.classList.add('fade');
    const bar = createFillingBar(gameConfig.loadingMs);
    panel.append(createTitle(copy.loading.title), bar.el);
    scope.mount(ctx.content, panel);
    bar.start();

    let loaded = false;
    let doorsOpen = false;
    const next = (): void => {
      if (!loaded || !doorsOpen) return;
      fadeTo(panel, 0, gameConfig.loadingFadeOutMs);
      scope.timeout(() => ctx.machine.go('objective'), gameConfig.loadingFadeOutMs);
    };

    scope.timeout(() => {
      const durationMs = gameConfig.doorOpenMs;
      ctx.bus.emit('door.open.start', { durationMs });
      ctx.doors.setOpen(true, durationMs);
      scope.timeout(() => {
        ctx.bus.emit('door.open.end', {});
        doorsOpen = true;
        next();
      }, durationMs);
    }, gameConfig.loadingStartBeforeDoorsMs);

    scope.timeout(() => {
      loaded = true;
      next();
    }, gameConfig.loadingMs);
  });
}
