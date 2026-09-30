import '@fontsource/turret-road/500.css';
import '@fontsource/turret-road/800.css';
import '@fontsource/kode-mono/400.css';
import '@fontsource/kode-mono/700.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layers.css';

import { initStage } from './core/stage';
import { createLayerStack } from './layers';
import { initDebugOverlay } from './ui/debugOverlay';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing #app element');

const stage = document.createElement('div');
stage.className = 'stage';

const layers = createLayerStack();
stage.append(...layers.stage);
app.append(...layers.viewport, stage);

initStage(stage);
initDebugOverlay();
