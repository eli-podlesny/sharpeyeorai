import { copy, fill, padDigits, padRound } from '../config/copy';
import { gameConfig } from '../config/game.config';
import { layout } from '../config/layout.config';
import { setRem } from '../core/units';
import { fadeTo } from '../ui/motion';
import { h } from '../ui/dom';

/** Counter, progress bar and timer that stay on the screen for the whole game. */
export interface ScreenHudControl {
  /** Shows "Test 04/12" and the matching progress. 0 = not started (00/12, empty bar). */
  setRound(roundId: number): void;
  /** Shows the round time; `null` is the idle placeholder (0000ms, dimmed like the label). */
  setTime(ms: number | null): void;
  /** Back to 00/12, idle 0000ms, visible. */
  reset(): void;
  setVisible(visible: boolean, fadeMs: number): void;
}

/**
 * `screen-hud`: lives inside the screen layer above the game content and below the
 * doors, so the opening doors reveal it. Scenes drive it through `ScreenHudControl`.
 */
export function createScreenHud(): { el: HTMLElement; control: ScreenHudControl } {
  const L = layout.screenHud;
  const el = h('div', 'screen-hud fade');
  el.dataset.layer = 'screen-hud';
  setRem(el, { fontSize: L.textSize, lineHeight: L.lineHeight });

  // "Test 04/12" + progress bar
  const progress = h('div', 'screen-hud__progress');
  setRem(progress, { left: L.progress.left, top: L.progress.top, gap: L.progress.gap });
  const label = h('span', 'screen-hud__label');
  const count = h('span', '');
  const total = h(
    'span',
    'screen-hud__dim',
    fill(copy.round.counterTotal, { total: padRound(gameConfig.roundCount) }),
  );
  label.append(count, total);
  const track = h('div', 'screen-hud__track');
  setRem(track, { width: L.progress.barWidth, height: L.progress.barHeight });
  const bar = h('div', 'screen-hud__bar');
  track.append(bar);
  progress.append(label, track);

  // Timer
  const timer = h('div', 'screen-hud__timer');
  setRem(timer, { right: L.timer.right, top: L.timer.top });
  const timerValue = h('span', '');
  timer.append(h('span', 'screen-hud__dim', copy.round.timeLabel), timerValue);

  el.append(progress, timer);

  const control: ScreenHudControl = {
    setRound(roundId) {
      count.textContent = fill(copy.round.counter, { n: padRound(roundId) });
      bar.style.width = `${(roundId / gameConfig.roundCount) * 100}%`;
    },
    setTime(ms) {
      timerValue.textContent = fill(copy.round.timeValue, { ms: padDigits(ms ?? 0) });
      timerValue.classList.toggle('screen-hud__dim', ms === null);
    },
    reset() {
      control.setRound(0);
      control.setTime(null);
      control.setVisible(true, 0);
    },
    setVisible(visible, fadeMs) {
      fadeTo(el, visible ? 1 : 0, fadeMs);
    },
  };
  control.reset();
  return { el, control };
}
