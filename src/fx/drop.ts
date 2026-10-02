import { gameConfig } from '../config/game.config';
import { layout } from '../config/layout.config';
import { computeUnitRect, unitScale } from '../core/stage';

/**
 * The screen drop: the whole screen unit (frame, shadows, screen, doors) falls after
 * round 9's click, lands with a short shake, and stays down until the end of the game.
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

/**
 * Moves the unit with the Web Animations API, and every other target (the spotlight unit
 * that holds round 12's lit shape) exactly in step: the same boxes, around the same center.
 * The end pose is also written to the style, so it stays put after the animation; clicks
 * are mapped through the transform as drawn (`unitMatrix()` in src/core/input.ts),
 * mid-animation included.
 */
export function createScreenDrop(assembly: HTMLElement, followers: HTMLElement[]): ScreenDropFx {
  const cfg = gameConfig.fx.drop;
  const { drop: pose } = layout.assembly;
  const targets = [assembly, ...followers];
  let down = false;

  // While down, a resized window gets the pose for its new height.
  window.addEventListener('resize', () => {
    if (!down) return;
    const end = css(droppedNow());
    for (const el of targets) el.style.transform = end;
  });

  /** Starts from what is drawn right now, so a change mid-way does not jump. */
  const moveTo = (end: Pose, frames: (from: string) => Keyframe[], ms: number): void => {
    const drawn = getComputedStyle(assembly).transform;
    const from = drawn === 'none' ? css(HOME) : drawn;
    for (const el of targets) {
      for (const a of el.getAnimations()) a.cancel();
      el.style.transform = end === HOME ? '' : css(end);
      if (ms > 0) el.animate(frames(from), { duration: ms });
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
        for (const a of el.getAnimations()) a.cancel();
        el.style.transform = '';
      }
    },
  };
}
