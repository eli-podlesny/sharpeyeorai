import { describe, expect, it } from 'vitest';
import { gameConfig, type RoundSequenceConfig } from '../config/game.config';
import { buildRoundSequence } from './sequence';

const config: RoundSequenceConfig = {
  introFadeMs: 400,
  holdMs: 900,
  titleFadeOutMs: 300,
  objectiveMoveMs: 500,
  shapeFadeInMs: 400,
  postClickWaitMs: 400,
  outroFadeMs: 400,
  reducedMotionFadeMs: 150,
  fadeEasing: 'ease',
  moveEasing: 'ease-in-out',
};

describe('round sequence', () => {
  it('runs the steps one after another', () => {
    const s = buildRoundSequence(config, false);
    expect(s.titleFadeInMs).toBe(400);
    expect(s.titleFadeOutAt).toBe(400 + 900);
    // Step 3 ends when the slower of the title fade and the objective move is done.
    expect(s.introEndAt).toBe(1300 + 500);
    expect(s.shapeVisibleAt).toBe(1800 + 400);
    expect(s.postClickWaitMs).toBe(400);
    expect(s.outroFadeMs).toBe(400);
  });

  it('follows the config, so timings change without code changes', () => {
    const s = buildRoundSequence({ ...config, holdMs: 2000, titleFadeOutMs: 800 }, false);
    expect(s.titleFadeOutAt).toBe(2400);
    expect(s.introEndAt).toBe(3200);
    expect(s.shapeVisibleAt).toBe(3600);
  });

  it('with reduced motion makes moves instant and fades short', () => {
    const s = buildRoundSequence(config, true);
    expect(s.objectiveMoveMs).toBe(0);
    expect(s.titleFadeInMs).toBe(150);
    expect(s.titleFadeOutMs).toBe(150);
    expect(s.shapeFadeInMs).toBe(150);
    expect(s.outroFadeMs).toBe(150);
    expect(s.introEndAt).toBe(150 + 900 + 150);
    expect(s.shapeVisibleAt).toBe(1350);
  });

  it('never lengthens a fade that is already short', () => {
    const s = buildRoundSequence({ ...config, shapeFadeInMs: 50 }, true);
    expect(s.shapeFadeInMs).toBe(50);
  });

  it('builds from the game config', () => {
    const s = buildRoundSequence(gameConfig.roundSequence, false);
    expect(s.shapeVisibleAt).toBeGreaterThan(s.introEndAt);
  });
});
