import { gameConfig } from '../config/game.config';
import { layout } from '../config/layout.config';
import { rem } from '../core/units';

/** Round 10: the whole screen assembly (frame, glow, screen, doors) drops and comes back. */
export interface ScreenDropFx {
  readonly down: boolean;
  /** Drops it, over `durationMs` (shortened with reduced motion). Returns the time used. */
  drop(reducedMotion: boolean): number;
  /** Brings it back to place over `returnMs`. Returns the time used. */
  restore(reducedMotion: boolean): number;
  /** Back in place at once (debug jumps, end of the game in the dark). */
  reset(): void;
}

interface Pose {
  x: number;
  y: number;
  rotateDeg: number;
  scale: number;
}

const HOME: Pose = { x: 0, y: 0, rotateDeg: 0, scale: 1 };

function css(p: Pose): string {
  return `translate(${rem(p.x)}, ${rem(p.y)}) rotate(${p.rotateDeg}deg) scale(${p.scale})`;
}

/**
 * Moves the assembly with the Web Animations API. The end pose is also written to the
 * element's style, so it stays put after the animation; clicks are mapped through the
 * transform as drawn (`assemblyMatrix()` in src/core/input.ts), mid-animation included.
 */
export function createScreenDrop(assembly: HTMLElement): ScreenDropFx {
  const cfg = gameConfig.fx.drop;
  const { drop: pose } = layout.assembly;
  const dropped: Pose = {
    x: pose.x,
    y: pose.y,
    rotateDeg: pose.rotateDeg,
    scale: pose.scale,
  };
  // Swings a little past the end pose, then rebounds and settles.
  const overshoot: Pose = {
    ...dropped,
    y: dropped.y + pose.overshoot.y,
    rotateDeg: dropped.rotateDeg + pose.overshoot.rotateDeg,
  };
  const rebound: Pose = {
    ...dropped,
    y: dropped.y - pose.overshoot.y * 0.3,
    rotateDeg: dropped.rotateDeg - pose.overshoot.rotateDeg * 0.3,
  };
  let down = false;

  /** Starts from what is drawn right now, so a change mid-way does not jump. */
  const moveTo = (end: Pose, frames: (from: string) => Keyframe[], ms: number): void => {
    const from = getComputedStyle(assembly).transform;
    for (const a of assembly.getAnimations()) a.cancel();
    assembly.style.transform = end === HOME ? '' : css(end);
    if (ms > 0) assembly.animate(frames(from === 'none' ? css(HOME) : from), { duration: ms });
  };

  return {
    get down() {
      return down;
    },
    drop(reducedMotion) {
      down = true;
      if (reducedMotion) {
        const ms = cfg.reducedMotionMs;
        moveTo(
          dropped,
          (from) => [{ transform: from, easing: 'ease-in-out' }, { transform: css(dropped) }],
          ms,
        );
        return ms;
      }
      const ms = cfg.durationMs;
      // A heavy mechanical fall: slow to start, falling fast, overshooting, then settling.
      moveTo(
        dropped,
        (from) => [
          { transform: from, offset: 0, easing: 'cubic-bezier(0.55, 0, 0.9, 0.45)' },
          { transform: css(overshoot), offset: 0.6, easing: 'cubic-bezier(0.2, 0.6, 0.35, 1)' },
          { transform: css(rebound), offset: 0.82, easing: 'ease-in-out' },
          { transform: css(dropped), offset: 1 },
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
      for (const a of assembly.getAnimations()) a.cancel();
      assembly.style.transform = '';
    },
  };
}
