import type { SceneContext } from '../core/game';
import type { SceneMap } from '../core/scenes';
import { createCalculatingScene } from './calculating';
import { createIntroScene } from './intro';
import { createLoadingScene } from './loading';
import { createOpeningScene } from './opening';
import { createReadyScene } from './ready';
import { createRoundScene } from './round';
import { createScoreScene } from './score';

/** One scene per game state. */
export function createScenes(ctx: SceneContext): SceneMap {
  return {
    intro: createIntroScene(ctx),
    ready: createReadyScene(ctx),
    opening: createOpeningScene(ctx),
    loading: createLoadingScene(ctx),
    round: createRoundScene(ctx),
    calculating: createCalculatingScene(ctx),
    score: createScoreScene(ctx),
  };
}
