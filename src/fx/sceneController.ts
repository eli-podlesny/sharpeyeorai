import { gameConfig } from '../config/game.config';
import { getRound, type RoundConfig } from '../config/rounds.config';
import type { SceneContext } from '../core/game';
import { randomSeed } from '../core/rng';
import type { SceneMode } from '../core/state';
import type { LayerStack } from '../layers';
import { liveRound } from '../rounds/clock';
import { fixedRoundEndMs, inputDeadlineMs } from '../rounds/timing';
import { prefersReducedMotion } from '../ui/motion';
import { createAlert } from './alert';
import { createBreathing } from './breathing';
import { createScreenDrop } from './drop';
import { createGlitch } from './glitch';
import {
  alertForMode,
  breathingForMode,
  clamp01,
  closingAmount,
  sceneModeForRound,
} from './schedule';

/** What the debug panel can do to the effects. */
export interface SceneFx {
  /** One glitch burst now. */
  triggerGlitch(): void;
  /** Forces the alert pulse on or off; null follows the scene mode again. */
  forceAlert(active: boolean | null): void;
  readonly alertActive: boolean;
  /** Drops the screen or brings it back. */
  setDropped(down: boolean): void;
  readonly dropped: boolean;
  /** Holds round 11's closing (doors + darkening) at 0–1; null lets the round drive it. */
  scrubBlackout(amount: number | null): void;
  readonly breathingSupported: boolean;
}

/**
 * The one place that turns the game's flow into scene effects. It listens to round and
 * scene events; round files hold no effect code.
 *
 * - Scene mode (`gameConfig.fx.modeByRound`): set when a round starts, and for the next
 *   round when a round's outro ends (so "after round 3's outro" the scene is distorted).
 *   normal → nothing; distorted → subtle breathing; alert → strong breathing + alert pulse;
 *   blackout → the same, darkening. Leaving the rounds puts everything back.
 * - Round effects (`effects` in rounds.config.ts): glitches (7, 9), the screen drop (10),
 *   the closing doors and darkness (11), the dark after the smile (12).
 *
 * Rounds 11–12 follow the round clock, so a hidden tab (or the debug pause) stops them too.
 */
export function createSceneController(
  ctx: SceneContext,
  layers: LayerStack,
  app: HTMLElement,
): SceneFx {
  const { bus, doors, darkness } = ctx;
  const fx = gameConfig.fx;
  const breathing = createBreathing(layers.background);
  const alert = createAlert(app, layers.alertGlow);
  const glitch = createGlitch(layers.screen, randomSeed());
  const drop = createScreenDrop(layers.assembly);

  let round: RoundConfig | null = null;
  let forcedAlert: boolean | null = null;
  let scrub: number | null = null;
  /** Whether the doors were shut when scrubbing began, to put them back after. */
  let doorsShutBeforeScrub = false;
  /** Round 11: an early click starts the speed-up (real time, from this amount). */
  let speedUp: { at: number; fromAmount: number } | null = null;
  let closing = 0;
  /** Round 12: full darkness reached after the smile. */
  let fullDark = false;

  const has = (effect: RoundConfig['effects'][number]): boolean =>
    round?.effects.includes(effect) ?? false;

  const applyAlert = (now: number): void => {
    const active = forcedAlert ?? alertForMode(ctx.sceneMode);
    if (active === alert.active) return;
    alert.setActive(active, now);
    bus.emit('alert.show', { active });
  };

  const setDrop = (down: boolean): void => {
    if (down === drop.down) return;
    const ms = down ? drop.drop(prefersReducedMotion()) : drop.restore(prefersReducedMotion());
    bus.emit('screen.drop', { down, durationMs: ms });
  };

  const applyMode = (mode: SceneMode): void => {
    const now = performance.now();
    breathing.setLevel(breathingForMode(mode), now);
    applyAlert(now);
    if (mode === 'normal') {
      // Back to a calm scene (round 1, or the end of the game while it is dark).
      glitch.stop();
      drop.reset();
    }
  };

  /** Doors and darkness for the closing amount (round 11, or the debug scrub). */
  const holdClosing = (amount: number): void => {
    if (amount === closing && doors.isClosed === amount > 0) return;
    closing = amount;
    doors.setClosedAmount(amount);
    darkness.setLevel(amount * fx.blackout.closingDarkness, 0);
  };

  /** Everything off, at once: outside the rounds (ready, loading, objective, score). */
  const resetAll = (): void => {
    round = null;
    speedUp = null;
    fullDark = false;
    closing = 0;
    glitch.stop();
    drop.reset();
    if (darkness.level > 0) darkness.setLevel(0, 0);
    ctx.setSceneMode('normal');
    applyMode('normal');
  };

  bus.on('scene.mode', ({ mode }) => applyMode(mode));

  bus.on('state.change', ({ to }) => {
    // The ending scene runs its own darkness and switches the mode to normal itself.
    if (to !== 'round' && to !== 'ending') resetAll();
  });

  bus.on('round.intro.start', ({ roundId }) => {
    const now = performance.now();
    round = getRound(roundId);
    speedUp = null;
    fullDark = false;
    ctx.setSceneMode(sceneModeForRound(roundId));

    if (has('glitchShort')) glitch.setPattern(fx.glitch.short, now);
    else if (has('glitchLong')) glitch.setPattern(fx.glitch.long, now);
    else glitch.stop();

    if (has('screenDrop')) setDrop(true);
    else if (drop.down) drop.reset();

    if (has('closingDoors')) {
      closing = 0;
      darkness.setLevel(0, 0);
    } else if (has('darkAfterShape')) {
      // The doors snapped open in the dark (the round scene opens them); the scene stays dim.
      darkness.setLevel(fx.blackout.closingDarkness, 0);
    } else if (darkness.level > 0 && scrub === null) {
      darkness.setLevel(0, 0);
    }
  });

  bus.on('round.click', () => {
    if (has('closingDoors') && closing < 1) {
      speedUp = { at: performance.now(), fromAmount: closing };
    }
  });

  bus.on('round.outro.start', () => {
    glitch.stop();
    if (has('screenDrop')) setDrop(false);
  });

  bus.on('round.outro.end', ({ roundId }) => {
    if (roundId < gameConfig.roundCount) ctx.setSceneMode(sceneModeForRound(roundId + 1));
  });

  /** Round 11: doors close and the scene darkens over the time limit. */
  const tickClosing = (now: number): void => {
    const live = liveRound.current;
    if (!round || live?.roundId !== round.id) return;
    const amount = speedUp
      ? closingAmount(0, 1, {
          fromAmount: speedUp.fromAmount,
          elapsedMs: now - speedUp.at,
          durationMs: fx.blackout.speedUpMs,
        })
      : closingAmount(live.elapsedMs(), round.timeLimitMs ?? 0, null);
    holdClosing(amount);
  };

  /** Round 12: lit smile in the dim scene, then full dark, then the doors close over the idle time. */
  const tickDarkAfterShape = (): void => {
    const live = liveRound.current;
    if (!round || live?.roundId !== round.id) return;
    const t = live.elapsedMs();
    if (!fullDark && round.hideAfter && t >= round.hideAfter.visibleMs) {
      fullDark = true;
      darkness.setLevel(1, fx.blackout.fullDarkFadeMs);
    }
    const idleStart = inputDeadlineMs(round);
    const end = fixedRoundEndMs(round);
    if (idleStart !== null && end !== null && t >= idleStart) {
      doors.setClosedAmount(clamp01((t - idleStart) / (end - idleStart)));
    }
  };

  const tick = (now: number): void => {
    const reduced = prefersReducedMotion();
    breathing.update(now, reduced);
    alert.update(now);
    glitch.update(now, reduced);
    if (scrub !== null) holdClosing(scrub);
    else if (has('closingDoors')) tickClosing(now);
    else if (has('darkAfterShape')) tickDarkAfterShape();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  return {
    triggerGlitch() {
      glitch.burst(fx.glitch.debugBurstMs);
    },
    forceAlert(active) {
      forcedAlert = active;
      applyAlert(performance.now());
    },
    get alertActive() {
      return alert.active;
    },
    setDropped(down) {
      setDrop(down);
    },
    get dropped() {
      return drop.down;
    },
    scrubBlackout(amount) {
      if (scrub === null && amount !== null) doorsShutBeforeScrub = doors.isClosed;
      const wasScrubbing = scrub !== null;
      scrub = amount === null ? null : clamp01(amount);
      if (wasScrubbing && scrub === null && !has('closingDoors')) {
        // Let go outside round 11: lights and doors back as they were.
        closing = 0;
        darkness.setLevel(has('darkAfterShape') ? fx.blackout.closingDarkness : 0, 0);
        doors.setOpen(!doorsShutBeforeScrub, 0);
      }
    },
    get breathingSupported() {
      return breathing.supported;
    },
  };
}
