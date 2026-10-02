import { gameConfig } from '../config/game.config';
import { prefersReducedMotion } from '../ui/motion';

/**
 * The screen's entrance: the unit (frame, shadows, screen, doors) and the boxes that line
 * up with it (HUD slot, spotlight) rise from below and fade in, after the room is drawn.
 * At the start of the game, and at the end: hidden in the dark, it comes back once the
 * lights are on, before the doors open on the score (`gameConfig.screenEntrance`).
 *
 * It moves with the CSS `translate` property, so the drop (`transform`) is untouched.
 */
export interface ScreenEntrance {
  readonly hidden: boolean;
  /** Out of sight at once: below its place, transparent. */
  hide(): void;
  /** Enters after `delayMs`. Returns when it is in place, in ms from now (0 if it already was). */
  show(delayMs?: number): number;
}

export function createScreenEntrance(targets: HTMLElement[]): ScreenEntrance {
  const cfg = gameConfig.screenEntrance;
  let hidden = false;
  const below = `0 ${cfg.risePercent}%`;

  return {
    get hidden() {
      return hidden;
    },
    hide() {
      hidden = true;
      for (const el of targets) {
        for (const a of el.getAnimations()) if (a.id === 'entrance') a.cancel();
        el.style.opacity = '0';
        el.style.translate = below;
      }
    },
    show(delayMs = 0) {
      if (!hidden) return 0;
      hidden = false;
      const reduced = prefersReducedMotion();
      for (const el of targets) {
        el.style.opacity = '';
        el.style.translate = '';
        const from: Keyframe = reduced ? { opacity: 0 } : { opacity: 0, translate: below };
        const to: Keyframe = reduced ? { opacity: 1 } : { opacity: 1, translate: '0 0' };
        const animation = el.animate([from, to], {
          duration: cfg.durationMs,
          delay: delayMs,
          easing: cfg.easing,
          fill: 'backwards',
        });
        animation.id = 'entrance';
      }
      return delayMs + cfg.durationMs;
    },
  };
}
