import { copy } from '../config/copy';
import { gameConfig } from '../config/game.config';
import type { SceneContext } from '../core/game';
import { defineScene, type Scene } from '../core/scenes';
import { h } from '../ui/dom';
import { createButton, createPanel } from './layout';

/**
 * Closed doors and a Start button (shown above the doors). With `startMode: "auto"`
 * the game continues by itself after `autoStartDelayMs`.
 */
export function createReadyScene(ctx: SceneContext): Scene {
  return defineScene((scope) => {
    ctx.doors.setOpen(false, 0);
    ctx.newSession();

    const panel = createPanel('ready');
    scope.mount(ctx.overlay, panel);

    if (gameConfig.startMode === 'auto') {
      panel.append(h('p', 'scene-text', copy.ready.autoStart));
      scope.timeout(() => ctx.machine.go('opening'), gameConfig.autoStartDelayMs);
      return;
    }

    const start = createButton(copy.ready.start);
    scope.listen(start, 'click', () => ctx.machine.go('opening'));
    panel.append(start);
  });
}
