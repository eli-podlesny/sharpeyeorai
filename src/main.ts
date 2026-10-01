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
import { parseUrlParams } from './core/params';
import { initStage } from './core/stage';
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

const params = parseUrlParams(window.location.search);
const bus = createEventBus();
const game = createGame({
  content: layers.screenContent,
  overlay: layers.hudScreenSlot,
  doors: layers.doors,
  bus,
  seed: params.seed,
  createScenes,
});

initDebugOverlay({ game, bus, open: params.debug });

// `?state=round&round=7` starts there; otherwise the normal flow from the intro.
game.jumpTo(params.state ?? 'intro', params.round ?? 1);
