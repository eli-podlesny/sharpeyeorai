import type { SceneContext } from '../core/game';
import { defineScene, type Scene } from '../core/scenes';

/** The narrated intro arrives in v1.4. For now it hands straight over to Ready. */
export function createIntroScene(ctx: SceneContext): Scene {
  return defineScene(() => {
    ctx.machine.go('ready');
  });
}
