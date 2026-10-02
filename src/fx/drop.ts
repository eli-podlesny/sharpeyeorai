import { gameConfig } from '../config/game.config';
import { layout } from '../config/layout.config';
import { computeUnitRect, unitScale } from '../core/stage';
import {
  BACKGROUND_HOME,
  backgroundBoxSize,
  backgroundPoseCss,
  droppedBackgroundPose,
  type BackgroundPose,
} from './backgroundDrop';

/**
 * The screen drop: the whole screen unit (frame, shadows, screen, doors) falls after
 * round 9's click, lands with a short shake, and stays down until the end of the game.
 * The room lurches with it (src/fx/backgroundDrop.ts), and comes back with it.
 */
export interface ScreenDropFx {
  readonly down: boolean;
  /** Drops it (shortened, without the shake, with reduced motion). Returns the time used. */
  drop(reducedMotion: boolean): number;
  /** Brings it back to place over `returnMs`. Returns the time used. */
  restore(reducedMotion: boolean): number;
  /** Back in place at once (debug jumps, end of the game in the dark). */
  reset(): void;
}

export interface Pose {
  x: number;
  y: number;
  rotateDeg: number;
  scale: number;
}

export const HOME: Pose = { x: 0, y: 0, rotateDeg: 0, scale: 1 };

/** The landing shake, in unit px and degrees (`layout.assembly.drop.shake`). */
export interface Shake {
  x: number;
  y: number;
  rotateDeg: number;
  count: number;
}

/**
 * Pure: the poses of the landing shake after reaching `end`, one per wobble, swinging to
 * alternate sides and dying away, with the last one exactly on `end` (it settles there).
 * The first wobble pushes down and further round, like the impact of a heavy panel.
 */
export function shakePoses(end: Pose, shake: Shake): Pose[] {
  const poses: Pose[] = [];
  for (let i = 0; i < shake.count; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const decay = (1 - i / shake.count) ** 2;
    poses.push({
      ...end,
      x: end.x - side * shake.x * decay,
      y: end.y + side * shake.y * decay,
      rotateDeg: end.rotateDeg + side * shake.rotateDeg * decay,
    });
  }
  poses.push(end);
  return poses;
}

/** As a CSS transform on a unit box. The move is in percent of the box (it is in unit px), so
 * it scales with the unit; it turns and scales around the box center (its transform-origin). */
function css(p: Pose): string {
  const x = (p.x / layout.unit.width) * 100;
  const y = (p.y / layout.unit.height) * 100;
  return `translate(${+x.toFixed(4)}%, ${+y.toFixed(4)}%) rotate(${p.rotateDeg}deg) scale(${p.scale})`;
}

/**
 * Pure: the dropped pose for a window `windowHeight` tall with the unit drawn `unitHeight`
 * tall. It moves down at least `drop.y`, and on tall windows far enough that its center
 * sits `drop.centerFromBottom` above the window bottom, so it falls to the bottom of view.
 */
export function droppedPose(windowHeight: number, unitHeight: number): Pose {
  const { drop } = layout.assembly;
  const halfWindow = windowHeight / 2 / unitScale(unitHeight);
  return {
    x: drop.x,
    y: Math.max(drop.y, halfWindow - drop.centerFromBottom),
    rotateDeg: drop.rotateDeg,
    scale: drop.scale,
  };
}

/** The dropped pose for the window as it is now. */
function droppedNow(): Pose {
  const unit = computeUnitRect(window.innerWidth, window.innerHeight);
  return droppedPose(window.innerHeight, unit.height);
}

/** The drop's own animations carry this id: cancelling them leaves others (the screen entrance) alone. */
const DROP_ID = 'drop';

function cancelDrop(el: HTMLElement): void {
  for (const a of el.getAnimations()) if (a.id === DROP_ID) a.cancel();
}

/** The room's dropped pose for the window as it is now (parallax room kept on every side). */
function backgroundDroppedNow(): BackgroundPose {
  const image = backgroundBoxSize(
    window.innerWidth,
    window.innerHeight,
    layout.viewport.bgOverscan,
  );
  const { background: room } = layout.parallax;
  return droppedBackgroundPose({
    width: window.innerWidth,
    height: window.innerHeight,
    imageWidth: image.width,
    imageHeight: image.height,
    pad: { x: Math.abs(room.x), y: Math.abs(room.y) },
  });
}

/**
 * Moves the unit with the Web Animations API, and every other target (the spotlight unit
 * that holds round 12's lit shape) exactly in step: the same boxes, around the same center.
 * The end pose is also written to the style, so it stays put after the animation; clicks
 * are mapped through the transform as drawn (`unitMatrix()` in src/core/input.ts),
 * mid-animation included.
 */
export function createScreenDrop(
  assembly: HTMLElement,
  followers: HTMLElement[],
  background: HTMLElement,
): ScreenDropFx {
  const cfg = gameConfig.fx.drop;
  const { drop: pose } = layout.assembly;
  const targets = [assembly, ...followers];
  let down = false;

  // While down, a resized window gets the pose for its new size.
  window.addEventListener('resize', () => {
    if (!down) return;
    const end = css(droppedNow());
    for (const el of targets) el.style.transform = end;
    background.style.transform = backgroundPoseCss(backgroundDroppedNow());
  });

  /**
   * The room lurches with the screen: one smooth move over `backgroundMs`, from what is
   * drawn now. Its parallax (the `translate` property) stays on top, untouched.
   */
  const moveBackground = (end: BackgroundPose, ms: number, easing: string): void => {
    const drawn = getComputedStyle(background).transform;
    const from = drawn === 'none' ? backgroundPoseCss(BACKGROUND_HOME) : drawn;
    cancelDrop(background);
    background.style.transform = end === BACKGROUND_HOME ? '' : backgroundPoseCss(end);
    if (ms > 0) {
      background.animate([{ transform: from }, { transform: backgroundPoseCss(end) }], {
        duration: ms,
        easing,
        id: DROP_ID,
      });
    }
  };

  /** Starts from what is drawn right now, so a change mid-way does not jump. */
  const moveTo = (end: Pose, frames: (from: string) => Keyframe[], ms: number): void => {
    const drawn = getComputedStyle(assembly).transform;
    const from = drawn === 'none' ? css(HOME) : drawn;
    for (const el of targets) {
      cancelDrop(el);
      el.style.transform = end === HOME ? '' : css(end);
      if (ms > 0) el.animate(frames(from), { duration: ms, id: DROP_ID });
    }
  };

  return {
    get down() {
      return down;
    },
    drop(reducedMotion) {
      down = true;
      const dropped = droppedNow();
      if (reducedMotion) {
        const ms = cfg.reducedMotionMs;
        moveBackground(backgroundDroppedNow(), ms, 'ease-in-out');
        moveTo(
          dropped,
          (from) => [{ transform: from, easing: 'ease-in-out' }, { transform: css(dropped) }],
          ms,
        );
        return ms;
      }
      // A heavy fall, like gravity: it gives way slowly, speeds up and hits at full speed
      // (ease-in cubic). The hit pushes it on a little and it springs back (fast ease-out),
      // then smaller wobbles settle it.
      const ms = cfg.fallMs + cfg.shakeMs;
      const landAt = cfg.fallMs / ms;
      const wobbles = shakePoses(dropped, pose.shake);
      const IMPACT = 'cubic-bezier(0.2, 0.9, 0.35, 1)';
      moveBackground(backgroundDroppedNow(), cfg.backgroundMs, cfg.backgroundEasing);
      moveTo(
        dropped,
        (from) => [
          { transform: from, offset: 0, easing: 'cubic-bezier(0.55, 0.05, 0.7, 0.2)' },
          { transform: css(dropped), offset: landAt, easing: IMPACT },
          ...wobbles.map((p, i) => ({
            transform: css(p),
            offset: landAt + ((1 - landAt) * (i + 1)) / wobbles.length,
            easing: i === 0 ? IMPACT : 'ease-in-out',
          })),
        ],
        ms,
      );
      return ms;
    },
    restore(reducedMotion) {
      down = false;
      const ms = reducedMotion ? cfg.reducedMotionMs : cfg.returnMs;
      moveBackground(BACKGROUND_HOME, ms, 'ease-in-out');
      moveTo(
        HOME,
        (from) => [{ transform: from, easing: 'ease-in-out' }, { transform: css(HOME) }],
        ms,
      );
      return ms;
    },
    reset() {
      down = false;
      for (const el of targets) {
        cancelDrop(el);
        el.style.transform = '';
      }
      moveBackground(BACKGROUND_HOME, 0, 'linear');
    },
  };
}
