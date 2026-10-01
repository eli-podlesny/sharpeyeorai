import type { SceneContext } from '../core/game';
import type { SceneMap } from '../core/scenes';
import { createEndingScene } from './ending';
import { createIntroScene } from './intro';
import { createLoadingScene } from './loading';
import { createObjectiveScene } from './objective';
import { createReadyScene } from './ready';
import { createRoundScene } from './round';
import { createScoreScene } from './score';

/**
 * One scene per game state. `calculating.ts` is kept but out of the flow for now.
 */
export function createScenes(ctx: SceneContext): SceneMap {
  return {
    intro: createIntroScene(ctx),
    ready: createReadyScene(ctx),
    loading: createLoadingScene(ctx),
    objective: createObjectiveScene(ctx),
    round: createRoundScene(ctx),
    ending: createEndingScene(ctx),
    score: createScoreScene(ctx),
  };
}
