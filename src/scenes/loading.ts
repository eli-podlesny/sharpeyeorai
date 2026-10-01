import { copy } from '../config/copy';
import { gameConfig } from '../config/game.config';
import { layout } from '../config/layout.config';
import type { SceneContext } from '../core/game';
import { defineScene, type Scene } from '../core/scenes';
import { setRem } from '../core/units';
import { h } from '../ui/dom';
import { createPanel, createTitle } from './layout';

/** "Initializing" and a progress bar that fills over `loadingMs`, then round 1. */
export function createLoadingScene(ctx: SceneContext): Scene {
  return defineScene((scope) => {
    ctx.doors.setOpen(true, 0);

    const panel = createPanel('loading');
    const track = h('div', 'progress-track');
    setRem(track, layout.scenes.loadingBar);
    const fill = h('div', 'progress-fill');
    fill.style.transitionDuration = `${gameConfig.loadingMs}ms`;
    track.append(fill);
    panel.append(createTitle(copy.loading.title), track);
    scope.mount(ctx.content, panel);

    // Read the layout once so the browser sees the empty bar before it fills.
    void fill.offsetWidth;
    fill.classList.add('is-full');
    scope.timeout(() => ctx.machine.go('round'), gameConfig.loadingMs);
  });
}
