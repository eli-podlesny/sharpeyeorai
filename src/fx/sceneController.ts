import { gameConfig } from '../config/game.config';
import { getRound, type RoundConfig } from '../config/rounds.config';
import type { SceneContext } from '../core/game';
import { randomSeed } from '../core/rng';
import type { SceneMode } from '../core/state';
import type { LayerStack } from '../layers';
import { liveRound } from '../rounds/clock';
import { inputDeadlineMs } from '../rounds/timing';
import { prefersReducedMotion } from '../ui/motion';
import { createAlert } from './alert';
import { createBreathing } from './breathing';
import { createScreenDrop } from './drop';
import { createGlitch } from './glitch';
import {
  alertForMode,
  breathPhaseAt,
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
 * - Round effects (`effects` in rounds.config.ts): glitch every 4s (7–8), every 2s (9),
 *   without pause from round 9's click through 11; the screen drop right after round 9's click, kept down through
 *   round 12; the closing doors and blackout (11); the black scene around the lit triangle
 *   on the dropped screen, with a last breath of light (12). The screen goes home at the end, in the dark.
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
  // Round 12's lit shape (in the spotlight layer) drops with the screen, so it sits on it.
  const drop = createScreenDrop(layers.assembly, [layers.spotlightUnit]);

  let round: RoundConfig | null = null;
  let forcedAlert: boolean | null = null;
  let scrub: number | null = null;
  /** Whether the doors were shut when scrubbing began, to put them back after. */
  let doorsShutBeforeScrub = false;
  /** Round 11: an early click starts the speed-up (real time, from this amount). */
  let speedUp: { at: number; fromAmount: number } | null = null;
  let closing = 0;
  /** Round 12's last breath: when it starts (null = none), whether it ran, and lit now. */
  let breathStart: number | null = null;
  let breathed = false;
  let breathLit = false;

  const has = (effect: RoundConfig['effects'][number]): boolean =>
    round?.effects.includes(effect) ?? false;

  /** Which glitch a round has, if any. */
  const glitchKind = (effects: RoundConfig['effects']): string | undefined =>
    effects.find((e) => e.startsWith('glitch'));

  const applyAlert = (now: number, rampMs?: number): void => {
    const active = forcedAlert ?? alertForMode(ctx.sceneMode);
    if (active === alert.active) return;
    alert.setActive(active, now, rampMs);
    bus.emit('alert.show', { active });
  };

  /** Drops the screen or brings it back; returns how long the move takes (0 if no change). */
  const setDrop = (down: boolean): number => {
    if (down === drop.down) return 0;
    const ms = down ? drop.drop(prefersReducedMotion()) : drop.restore(prefersReducedMotion());
    bus.emit('screen.drop', { down, durationMs: ms });
    return ms;
  };

  const applyMode = (mode: SceneMode): void => {
    const now = performance.now();
    // Back to normal happens in the dark (the end of the game) or outside the rounds: at
    // once, so the lights return on a calm stage. Every other change eases in.
    const ms = mode === 'normal' ? 0 : undefined;
    breathing.setLevel(breathingForMode(mode), now, ms);
    // Round 11 (blackout): the alarm pulses faster. Reduced motion keeps it slow.
    const intense = mode === 'blackout' && !prefersReducedMotion();
    alert.setPeriod(intense ? fx.alert.intensePeriodMs : fx.alert.periodMs);
    applyAlert(now, ms);
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
    closing = 0;
    breathStart = null;
    breathLit = false;
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
    breathStart = null;
    breathed = false;
    breathLit = false;
    ctx.setSceneMode(sceneModeForRound(roundId));

    // Rounds 10–12 keep the screen down (a debug jump drops it at once). Any other round
    // starts with it home; in the game it only goes home at the end, in the dark.
    let downAt = now;
    if (has('stayDropped')) downAt += setDrop(true);
    else if (drop.down) drop.reset();

    if (has('glitchSlow')) glitch.setPattern(fx.glitch.slow, now);
    else if (has('glitchFast')) glitch.setPattern(fx.glitch.fast, now);
    // Glitches from the moment the screen is down; one from the round before (round 9's
    // click) keeps going.
    else if (has('glitchConstant')) glitch.setConstant(downAt);
    else glitch.stop();

    if (has('closingDoors')) {
      closing = 0;
      darkness.setLevel(0, 0);
    } else if (has('stayDark')) {
      // The doors snapped open in the dark (the round scene opens them); it stays black.
      darkness.setLevel(fx.blackout.closingDarkness, 0);
    } else if (darkness.level > 0 && scrub === null) {
      darkness.setLevel(0, 0);
    }
  });

  bus.on('round.click', () => {
    // Round 9: the screen falls right after the click (the round is already scored), and
    // glitches without pause from that moment, as if the click broke it.
    if (has('dropOnClick')) {
      setDrop(true);
      glitch.setConstant(performance.now());
    }
    if (has('closingDoors') && closing < 1) {
      speedUp = { at: performance.now(), fromAmount: closing };
    }
    // Round 12: the last breath, a moment after the click.
    if (has('stayDark')) startBreath(performance.now() + fx.lastBreath.delayAfterClickMs);
  });

  bus.on('round.outro.start', ({ roundId }) => {
    const next = roundId < gameConfig.roundCount ? getRound(roundId + 1).effects : [];
    // The glitch keeps its rhythm into a next round with the same kind (7 → 8, 10 → 11),
    // and round 9's constant glitch (from its click) runs on into round 10.
    const kind = glitch.constant ? 'glitchConstant' : glitchKind(round?.effects ?? []);
    if (kind !== glitchKind(next)) glitch.stop();
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

  /**
   * Round 12's last breath: a little light (`lastBreath.brightness`) comes back for a moment
   * over the broken scene, then black again. Once per round: after a click, or when the time for clicks is over.
   */
  function startBreath(at: number): void {
    if (breathed) return;
    breathed = true;
    breathStart = at;
  }

  const tickBreath = (now: number): void => {
    if (breathStart === null) return;
    const phase = breathPhaseAt(now - breathStart);
    const lit = phase === 'rising' || phase === 'holding';
    if (lit && !breathLit) {
      // The doors are shut for it, at once, in the dark.
      if (!doors.isClosed) doors.setOpen(false, 0);
      darkness.setLevel(
        fx.blackout.closingDarkness * (1 - fx.lastBreath.brightness),
        fx.lastBreath.riseMs,
      );
      bus.emit('scene.dark', { dark: false, durationMs: fx.lastBreath.riseMs });
    } else if (!lit && breathLit) {
      darkness.setLevel(fx.blackout.closingDarkness, fx.lastBreath.fallMs);
      bus.emit('scene.dark', { dark: true, durationMs: fx.lastBreath.fallMs });
    }
    breathLit = lit;
    if (phase === 'done') breathStart = null;
  };

  /** Round 12: black scene, lit triangle; the last breath when the time for clicks is over. */
  const tickStayDark = (now: number): void => {
    const live = liveRound.current;
    if (!round || live?.roundId !== round.id) return;
    const t = live.elapsedMs();
    const idleStart = inputDeadlineMs(round);
    // No click came: the last breath, as the time for clicks runs out.
    if (idleStart !== null && t >= idleStart) startBreath(now);
  };

  const tick = (now: number): void => {
    const reduced = prefersReducedMotion();
    breathing.update(now, reduced);
    alert.update(now);
    glitch.update(now, reduced);
    if (scrub !== null) holdClosing(scrub);
    else if (has('closingDoors')) tickClosing(now);
    else if (has('stayDark')) tickStayDark(now);
    tickBreath(now);
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
        darkness.setLevel(has('stayDark') ? fx.blackout.closingDarkness : 0, 0);
        doors.setOpen(!doorsShutBeforeScrub, 0);
      }
    },
    get breathingSupported() {
      return breathing.supported;
    },
  };
}
