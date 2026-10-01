import { describe, expect, it } from 'vitest';
import { gameConfig, type RoundSequenceConfig } from '../config/game.config';
import { buildRoundSequence } from './sequence';

const config: RoundSequenceConfig = {
  shapeFadeInMs: 400,
  objectiveDelayMs: 200,
  objectiveInMs: 200,
  postClickWaitMs: 400,
  outroFadeMs: 400,
  betweenRoundsMs: 400,
  reducedMotionFadeMs: 150,
  fadeEasing: 'ease',
  slideEasing: 'ease-out',
};

describe('round sequence', () => {
  it('uses the configured timings', () => {
    expect(buildRoundSequence(config, false)).toEqual({
      shapeFadeInMs: 400,
      objectiveDelayMs: 200,
      objectiveFadeInMs: 200,
      objectiveSlideMs: 200,
      postClickWaitMs: 400,
      outroFadeMs: 400,
      betweenRoundsMs: 400,
      fadeEasing: 'ease',
      slideEasing: 'ease-out',
    });
  });

  it('follows the config, so timings change without code changes', () => {
    const s = buildRoundSequence({ ...config, shapeFadeInMs: 900, betweenRoundsMs: 1000 }, false);
    expect(s.shapeFadeInMs).toBe(900);
    expect(s.betweenRoundsMs).toBe(1000);
  });

  it('with reduced motion shortens the fades and drops the slide', () => {
    const s = buildRoundSequence(config, true);
    expect(s.shapeFadeInMs).toBe(150);
    expect(s.objectiveFadeInMs).toBe(150);
    expect(s.objectiveSlideMs).toBe(0);
    expect(s.outroFadeMs).toBe(150);
    expect(s.postClickWaitMs).toBe(400);
    expect(s.betweenRoundsMs).toBe(400);
  });

  it('never lengthens a fade that is already short', () => {
    expect(buildRoundSequence({ ...config, shapeFadeInMs: 50 }, true).shapeFadeInMs).toBe(50);
  });

  it('builds from the game config', () => {
    expect(buildRoundSequence(gameConfig.roundSequence, false).shapeFadeInMs).toBeGreaterThan(0);
  });
});
