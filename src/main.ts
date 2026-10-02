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
import { registerUnit } from './core/input';
import { parseUrlParams } from './core/params';
import { preloadImages } from './core/preload';
import { initStage } from './core/stage';
import { createSceneController } from './fx/sceneController';
import { createLayerStack } from './layers';
import { allArtImages } from './layers/art';
import { createScenes } from './scenes';
import { initDebugOverlay } from './ui/debugOverlay';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing #app element');

initStage(app);
const layers = createLayerStack();
app.append(...layers.all);
// Clicks are mapped through the unit's real transform (the drop after round 9).
registerUnit(layers.assembly);

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

// Scene mode is mirrored to the app for CSS; the effects come from the scene controller.
app.dataset.sceneMode = game.context.sceneMode;
bus.on('scene.mode', ({ mode }) => (app.dataset.sceneMode = mode));
const fx = createSceneController(game.context, layers, app);

initDebugOverlay({ game, bus, fx, open: params.debug, outlineHost: layers.hudUnit });

// Every art image loads before anything shows (the v1.2 loading screen will cover this);
// then `?state=round&round=7` starts there, otherwise the normal flow from the intro.
app.dataset.loading = '';
void preloadImages(allArtImages(), bus).then(() => {
  delete app.dataset.loading;
  game.jumpTo(params.state ?? 'intro', params.round ?? 1);
});
