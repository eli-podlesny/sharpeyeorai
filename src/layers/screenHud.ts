import { copy, fill, padDigits, padRound } from '../config/copy';
import { gameConfig } from '../config/game.config';
import { layout } from '../config/layout.config';
import { setRem } from '../core/units';
import { fadeTo, moveTo } from '../ui/motion';
import { h } from '../ui/dom';

/** Counter, progress bar and timer that stay on the screen for the whole game. */
export interface ScreenHudControl {
  /** Shows "Test 04/12" and the matching progress. 0 = not started (00/12, empty bar). */
  setRound(roundId: number): void;
  /** Shows the round time; `null` is the idle placeholder (0000ms, dimmed like the label). */
  setTime(ms: number | null): void;
  /** Back to 00/12, idle 0000ms, no objective, visible. */
  reset(): void;
  setVisible(visible: boolean, fadeMs: number): void;
  /** The objective line (e.g. "Find an optical center of the rectangle"). */
  setObjective(text: string): void;
  /** Moves the objective line `y` design px below its bottom place (0 = in place). */
  moveObjective(y: number, ms: number, easing?: string): void;
  fadeObjective(opacity: number, ms: number, easing?: string): void;
}

/**
 * `screen-hud`: lives inside the screen layer above the game content and below the
 * doors, so the opening doors reveal it. Holds the counter, progress bar, timer and the
 * objective line, which stays put from the objective intro through round 12. Scenes
 * drive it through `ScreenHudControl`.
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

  // Objective line: the wrapper moves, the text fades.
  const objective = h('div', 'screen-hud__objective move');
  setRem(objective, { top: L.objective.top });
  const objectiveText = h('p', 'screen-hud__objective-text fade');
  objective.append(objectiveText);

  el.append(progress, timer, objective);

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
      control.fadeObjective(0, 0);
      control.moveObjective(0, 0);
    },
    setVisible(visible, fadeMs) {
      fadeTo(el, visible ? 1 : 0, fadeMs);
    },
    setObjective(text) {
      objectiveText.textContent = text;
    },
    moveObjective(y, ms, easing) {
      moveTo(objective, { y }, ms, easing);
    },
    fadeObjective(opacity, ms, easing) {
      fadeTo(objectiveText, opacity, ms, easing);
    },
  };
  control.reset();
  return { el, control };
}
