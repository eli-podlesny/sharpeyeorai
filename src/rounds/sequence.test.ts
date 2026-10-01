import { describe, expect, it } from 'vitest';
import { gameConfig, type RoundSequenceConfig } from '../config/game.config';
import { buildRoundSequence } from './sequence';

const config: RoundSequenceConfig = {
  fadeInMs: 400,
  postClickWaitMs: 400,
  outroFadeMs: 400,
  betweenRoundsMs: 400,
  reducedMotionFadeMs: 150,
  fadeEasing: 'ease',
};

describe('round sequence', () => {
  it('uses the configured timings', () => {
    expect(buildRoundSequence(config, false)).toEqual({
      fadeInMs: 400,
      postClickWaitMs: 400,
      outroFadeMs: 400,
      betweenRoundsMs: 400,
      fadeEasing: 'ease',
    });
  });

  it('follows the config, so timings change without code changes', () => {
    const s = buildRoundSequence({ ...config, fadeInMs: 900, betweenRoundsMs: 1000 }, false);
    expect(s.fadeInMs).toBe(900);
    expect(s.betweenRoundsMs).toBe(1000);
  });

  it('with reduced motion shortens the fades only', () => {
    const s = buildRoundSequence(config, true);
    expect(s.fadeInMs).toBe(150);
    expect(s.outroFadeMs).toBe(150);
    expect(s.postClickWaitMs).toBe(400);
    expect(s.betweenRoundsMs).toBe(400);
  });

  it('never lengthens a fade that is already short', () => {
    expect(buildRoundSequence({ ...config, fadeInMs: 50 }, true).fadeInMs).toBe(50);
  });

  it('builds from the game config', () => {
    expect(buildRoundSequence(gameConfig.roundSequence, false).fadeInMs).toBeGreaterThan(0);
  });
});
