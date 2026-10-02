import { layout, type Box } from '../config/layout.config';
import { freeScreenArea } from '../config/rounds.config';
import { placeBox } from '../layers/layer';
import { h } from './dom';

/** Width drawn for the HUD anchors' outlines (their text width varies). */
const ANCHOR_OUTLINE_WIDTH = 220;

/**
 * Debug: outlines the screen opening, the surface, the HUD anchors and the shapes' safe
 * areas over the frame art, to check the alignment. Lives in a unit box (`host`), so it
 * scales with the frame. Hidden until `setVisible(true)`.
 */
export function createLayoutOutline(host: HTMLElement): { setVisible(visible: boolean): void } {
  const root = h('div', 'layout-outline');
  root.hidden = true;
  const { opening, surface, screenHud: L, round } = layout;

  /** A box given inside the opening (screen-content px), drawn in unit px. */
  const inOpening = (b: Box): Box => ({
    ...b,
    left: opening.left + b.left,
    top: opening.top + b.top,
  });

  const add = (box: Box, label: string, kind: string): void => {
    const el = h('div', `layout-outline__box layout-outline__box--${kind}`);
    placeBox(el, box);
    el.append(h('span', 'layout-outline__label', label));
    root.append(el);
  };

  add(surface, 'surface', 'surface');
  add(opening, 'opening', 'opening');
  const free = freeScreenArea();
  add(inOpening(free), `safe · round 7 (${round.largeShapeMargin}px)`, 'safe');
  add(
    inOpening(freeScreenArea(round.motionMargin)),
    `safe · motion (${round.motionMargin}px)`,
    'safe',
  );

  const line = L.lineHeight;
  add(
    inOpening({
      left: L.progress.left,
      top: L.progress.top,
      width: ANCHOR_OUTLINE_WIDTH,
      height: line,
    }),
    'progress',
    'anchor',
  );
  const right = (r: number): number => opening.width - r - ANCHOR_OUTLINE_WIDTH;
  add(
    inOpening({
      left: right(L.timer.right),
      top: L.timer.top,
      width: ANCHOR_OUTLINE_WIDTH,
      height: line,
    }),
    'timer',
    'anchor',
  );
  const tip = round.loggedTooltip;
  add(
    inOpening({ left: right(tip.right), top: tip.top, width: ANCHOR_OUTLINE_WIDTH, height: line }),
    'logged tooltip',
    'anchor',
  );
  add(
    inOpening({ left: 0, top: L.objective.top, width: opening.width, height: line }),
    'objective',
    'anchor',
  );

  host.append(root);
  return {
    setVisible(visible) {
      root.hidden = !visible;
    },
  };
}
