import { copy } from '../config/copy';
import { gameConfig } from '../config/game.config';
import type { SceneContext } from '../core/game';
import { defineScene, type Scene } from '../core/scenes';
import { createPanel, createTitle } from './layout';

/**
 * "Calculating" for `calculatingMs`, then the score.
 * Not in the flow since v0.4 (the score follows the end-of-game darkness); kept in
 * case it comes back. It has no game state, so nothing creates it.
 */
export function createCalculatingScene(ctx: SceneContext): Scene {
  return defineScene((scope) => {
    ctx.doors.setOpen(true, 0);

    const panel = createPanel('calculating');
    panel.append(createTitle(copy.calculating.title));
    scope.mount(ctx.content, panel);

    scope.timeout(() => ctx.machine.force('score'), gameConfig.calculatingMs);
  });
}
