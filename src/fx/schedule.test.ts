import { describe, expect, it } from 'vitest';
import { gameConfig } from '../config/game.config';
import { getRound, rounds } from '../config/rounds.config';
import {
  alertForMode,
  alertPulseAt,
  breathDurationMs,
  breathEndAfterClickMs,
  breathPhaseAt,
  breathingForMode,
  closingAmount,
  createFlashLimiter,
  createTween,
  glitchActiveAt,
  sceneModeForRound,
} from './schedule';

const { glitch } = gameConfig.fx;

describe('scene-mode timeline', () => {
  it('is normal to round 3, distorted to 7, alert to 10, blackout for 11 and 12', () => {
    expect(rounds.map((r) => sceneModeForRound(r.id))).toEqual([
      'normal',
      'normal',
      'normal',
      'distorted',
      'distorted',
      'distorted',
      'distorted',
      'alert',
      'alert',
      'alert',
      'blackout',
      'blackout',
    ]);
  });

  it('breathes subtly when distorted and strongly from alert on', () => {
    expect(breathingForMode('normal')).toBe('off');
    expect(breathingForMode('distorted')).toBe('subtle');
    expect(breathingForMode('alert')).toBe('strong');
    expect(breathingForMode('blackout')).toBe('strong');
    expect(alertForMode('distorted')).toBe(false);
    expect(alertForMode('alert')).toBe(true);
  });

  it('tags the effect rounds', () => {
    expect(getRound(7).effects).toEqual(['glitchSlow']);
    expect(getRound(8).effects).toEqual(['glitchSlow']);
    expect(getRound(9).effects).toEqual(['glitchFast', 'dropOnClick']);
    expect(getRound(10).effects).toEqual(['stayDropped', 'glitchConstant']);
    expect(getRound(11).effects).toEqual(['stayDropped', 'glitchConstant', 'closingDoors']);
    expect(getRound(12).effects).toEqual(['stayDropped', 'stayDark']);
    expect(rounds.filter((r) => r.aboveDarkness).map((r) => r.id)).toEqual([12]);
    expect(rounds.slice(0, 6).every((r) => r.effects.length === 0)).toBe(true);
  });

  it('goes fully black in round 11 and stays black in round 12', () => {
    expect(gameConfig.fx.blackout.closingDarkness).toBe(1);
  });
});

describe('glitch patterns', () => {
  it('rounds 7–8: a short glitch once every 4s, calm first', () => {
    const { slow } = glitch;
    expect(slow.onMs + slow.offMs).toBe(4000);
    expect(slow.onMs).toBeLessThanOrEqual(150);
    expect(glitchActiveAt(slow, 0)).toBe(false);
    expect(glitchActiveAt(slow, slow.offMs - 1)).toBe(false);
    expect(glitchActiveAt(slow, slow.offMs)).toBe(true);
    expect(glitchActiveAt(slow, 4000)).toBe(false);
    expect(glitchActiveAt(slow, 4000 + slow.offMs)).toBe(true);
  });

  it('round 9: a short glitch once every 2s', () => {
    const { fast } = glitch;
    expect(fast.onMs + fast.offMs).toBe(2000);
    expect(glitchActiveAt(fast, fast.offMs - 1)).toBe(false);
    expect(glitchActiveAt(fast, fast.offMs)).toBe(true);
    expect(glitchActiveAt(fast, 2000)).toBe(false);
  });

  /** Counts burst starts (calm → glitch) at 1ms resolution over `ms`. */
  const burstStarts = (pattern: typeof glitch.slow, ms: number): number[] => {
    const starts: number[] = [];
    let was = false;
    for (let t = 0; t < ms; t++) {
      const on = glitchActiveAt(pattern, t);
      if (on && !was) starts.push(t);
      was = on;
    }
    return starts;
  };

  it.each([
    ['slow', glitch.slow],
    ['fast', glitch.fast],
  ] as const)('%s pattern never exceeds 3 flashes in any second', (_, pattern) => {
    const starts = burstStarts(pattern, 20000);
    for (const s of starts) {
      expect(starts.filter((t) => t >= s && t < s + 1000).length).toBeLessThanOrEqual(
        glitch.maxFlashesPerSecond,
      );
    }
  });
});

describe('flash limiter', () => {
  it('allows at most 3 burst starts per second, however often asked', () => {
    const limiter = createFlashLimiter(3);
    const starts: number[] = [];
    for (let t = 0; t < 5000; t += 16) if (limiter.tryStart(t)) starts.push(t);
    starts.slice(1).forEach((t, i) => {
      expect(t - (starts[i] ?? -Infinity)).toBeGreaterThanOrEqual(1000 / 3);
    });
    for (const s of starts) {
      expect(starts.filter((t) => t >= s && t < s + 1000).length).toBeLessThanOrEqual(3);
    }
  });
});

describe('round 11 closing', () => {
  const limit = getRound(11).timeLimitMs ?? 0;

  it('closes linearly and is fully shut exactly at the 8s deadline', () => {
    expect(limit).toBe(8000);
    expect(closingAmount(0, limit, null)).toBe(0);
    expect(closingAmount(4000, limit, null)).toBe(0.5);
    expect(closingAmount(7999, limit, null)).toBeLessThan(1);
    expect(closingAmount(8000, limit, null)).toBe(1);
    expect(closingAmount(10000, limit, null)).toBe(1);
  });

  it('speeds up to finish after an early click, from where it was', () => {
    const speedUp = { fromAmount: 0.3, elapsedMs: 0, durationMs: 800 };
    expect(closingAmount(3000, limit, speedUp)).toBeCloseTo(0.3);
    expect(closingAmount(3000, limit, { ...speedUp, elapsedMs: 400 })).toBeCloseTo(0.65);
    expect(closingAmount(3000, limit, { ...speedUp, elapsedMs: 800 })).toBe(1);
    expect(closingAmount(3000, limit, { ...speedUp, elapsedMs: 5000 })).toBe(1);
  });
});

describe('alert pulse', () => {
  it('starts dark, peaks halfway, is dark again after one period', () => {
    const p = gameConfig.fx.alert.periodMs;
    expect(alertPulseAt(0, p)).toBeCloseTo(0);
    expect(alertPulseAt(p / 2, p)).toBeCloseTo(1);
    expect(alertPulseAt(p, p)).toBeCloseTo(0);
  });
});

describe('tween', () => {
  it('eases to the target over the duration', () => {
    const tw = createTween(0);
    tw.setTarget(10, 1000, 2000);
    expect(tw.value(1000)).toBe(0);
    expect(tw.value(2000)).toBeCloseTo(5);
    expect(tw.value(3000)).toBe(10);
  });

  it('turns around smoothly from mid-way', () => {
    const tw = createTween(0);
    tw.setTarget(10, 0, 2000);
    const mid = tw.value(1000);
    tw.setTarget(4, 1000, 2000);
    expect(tw.value(1000)).toBeCloseTo(mid);
    expect(tw.value(3000)).toBe(4);
  });
});

describe('round 12: the last breath', () => {
  const b = gameConfig.fx.lastBreath;

  it('rises, holds and falls back to black, once', () => {
    expect(breathPhaseAt(-1)).toBe('waiting');
    expect(breathPhaseAt(0)).toBe('rising');
    expect(breathPhaseAt(b.riseMs)).toBe('holding');
    expect(breathPhaseAt(b.riseMs + b.holdMs)).toBe('falling');
    expect(breathPhaseAt(b.riseMs + b.holdMs + b.fallMs)).toBe('done');
  });

  it('ends delayAfterClickMs + its own length after a click', () => {
    expect(breathEndAfterClickMs()).toBe(b.delayAfterClickMs + breathDurationMs());
  });

  it('ends round 12 when no click came: its idle time is the breath', () => {
    expect(getRound(12).postRoundIdleMs).toBe(breathDurationMs());
  });
});
