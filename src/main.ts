import '@fontsource/turret-road/500.css';
import '@fontsource/turret-road/800.css';
import '@fontsource/kode-mono/400.css';
import '@fontsource/kode-mono/500.css';
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
import { gameConfig } from './config/game.config';
import { layout } from './config/layout.config';
import { createNoise } from './fx/noise';
import { createParallax } from './fx/parallax';
import { createScreenEntrance } from './fx/screenEntrance';
import { createSceneController } from './fx/sceneController';
import { createLayerStack } from './layers';
import { allArtImages } from './layers/art';
import { createScenes } from './scenes';
import { initCursors } from './ui/cursors';
import { initDebugOverlay } from './ui/debugOverlay';
import { createScreenCursor } from './ui/screenCursor';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing #app element');

initStage(app);
const layers = createLayerStack();
app.append(...layers.all);
// Clicks are mapped through the unit's real transform (the drop after round 9).
registerUnit(layers.assembly);

// The screen enters after the room is drawn (start of the game, and before the score).
const screen = createScreenEntrance([layers.assembly, layers.hudUnit, layers.spotlightUnit]);
screen.hide();

const params = parseUrlParams(window.location.search);
const bus = createEventBus();
const game = createGame({
  content: layers.screenContent,
  overlay: layers.hudScreenSlot,
  spotlight: layers.spotlight,
  doors: layers.doors,
  hud: layers.screenHud,
  darkness: layers.darkness,
  screen,
  bus,
  seed: params.seed,
  createScenes,
});

// Scene mode is mirrored to the app for CSS; the effects come from the scene controller.
app.dataset.sceneMode = game.context.sceneMode;
bus.on('scene.mode', ({ mode }) => (app.dataset.sceneMode = mode));
const fx = createSceneController(game.context, layers, app);

// The screen only stays away between the ending and the score: any other jump (debug,
// leaving early) brings it straight back.
bus.on('state.change', ({ to }) => {
  if (to !== 'ending' && to !== 'score') screen.show();
});

// Depth on mouse move: the room follows the pointer; the frame shadows, the doors and the
// screen HUD move against it.
const { parallax } = layout;
createParallax([
  { el: layers.background.el, max: parallax.background, space: 'px' },
  { el: layers.frameGlow, max: parallax.frameShadow, space: 'unit' },
  { el: layers.frameInnerShadow, max: parallax.frameInnerShadow, space: 'unit' },
  ...[...layers.assembly.querySelectorAll<HTMLElement>('.door')].map((el) => ({
    el,
    max: parallax.doors,
    space: 'unit' as const,
  })),
  { el: 'parallax-hud', max: parallax.hud, space: 'unit' },
]);

// The metal system cursors, TV snow over everything, and the orange cursor on the screen.
initCursors();
createNoise();
createScreenCursor(bus);

initDebugOverlay({ game, bus, fx, open: params.debug, outlineHost: layers.hudUnit });

// Every art image loads before anything shows (the v1.2 loading screen will cover this);
// then `?state=round&round=7` starts there, otherwise the normal flow from the intro.
app.dataset.loading = '';
void preloadImages(allArtImages(), bus).then(() => {
  delete app.dataset.loading;
  screen.show(gameConfig.screenEntrance.delayMs);
  game.jumpTo(params.state ?? 'intro', params.round ?? 1);
});
