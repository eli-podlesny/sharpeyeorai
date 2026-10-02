import '@fontsource/turret-road/500.css';
import '@fontsource/turret-road/800.css';
import '@fontsource/kode-mono/400.css';
import '@fontsource/kode-mono/700.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layers.css';
import './styles/scenes.css';

import { createEventBus } from './core/events';
import { createGame } from './core/game';
import { registerAssembly } from './core/input';
import { parseUrlParams } from './core/params';
import { initStage } from './core/stage';
import { createSceneController } from './fx/sceneController';
import { createLayerStack } from './layers';
import { createScenes } from './scenes';
import { initDebugOverlay } from './ui/debugOverlay';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing #app element');

const stage = document.createElement('div');
stage.className = 'stage';

const layers = createLayerStack();
stage.append(...layers.stage);
app.append(...layers.viewport, stage);

initStage(stage);
// Clicks are mapped through the assembly's real transform (round 10's drop).
registerAssembly(layers.assembly);

const params = parseUrlParams(window.location.search);
const bus = createEventBus();
const game = createGame({
  content: layers.screenContent,
  overlay: layers.hudScreenSlot,
  spotlight: layers.spotlight,
  doors: layers.doors,
  hud: layers.screenHud,
  darkness: layers.darkness,
  bus,
  seed: params.seed,
  createScenes,
});

// Scene mode is mirrored to the stage for CSS; the effects come from the scene controller.
stage.dataset.sceneMode = game.context.sceneMode;
bus.on('scene.mode', ({ mode }) => (stage.dataset.sceneMode = mode));
const fx = createSceneController(game.context, layers, app);

initDebugOverlay({ game, bus, fx, open: params.debug });

// `?state=round&round=7` starts there; otherwise the normal flow from the intro.
game.jumpTo(params.state ?? 'intro', params.round ?? 1);
