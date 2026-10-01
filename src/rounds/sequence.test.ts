import { describe, expect, it } from 'vitest';
import {
  gameConfig,
  type ObjectiveIntroConfig,
  type RoundSequenceConfig,
} from '../config/game.config';
import { buildObjectiveIntro, buildRoundSequence } from './sequence';

const config: RoundSequenceConfig = {
  shapeFadeInMs: 400,
  loggedTooltipMs: 500,
  shapePulseMs: 1000,
  postClickWaitMs: 800,
  outroFadeMs: 400,
  betweenRoundsMs: 400,
  reducedMotionFadeMs: 150,
  fadeEasing: 'ease',
  slideEasing: 'ease-out',
};

const intro: ObjectiveIntroConfig = {
  titleInMs: 400,
  textDelayMs: 200,
  textInMs: 200,
  holdMs: 1200,
  outMs: 400,
  inEasing: 'ease-out',
  outEasing: 'ease-in-out',
};

describe('objective intro', () => {
  it('holds once everything is shown, then moves out', () => {
    const s = buildObjectiveIntro(intro, 150, false);
    expect(s.titleInMs).toBe(400);
    expect(s.titleMoveInMs).toBe(400);
    expect(s.textDelayMs).toBe(200);
    expect(s.textInMs).toBe(200);
    // Title done at 400, text done at 200 + 200: both shown at 400, then a 1200 hold.
    expect(s.outAt).toBe(1600);
    expect(s.endAt).toBe(2000);
  });

  it('waits for the text when it finishes after the title', () => {
    const s = buildObjectiveIntro({ ...intro, textDelayMs: 500 }, 150, false);
    expect(s.outAt).toBe(500 + 200 + 1200);
  });

  it('with reduced motion drops all movement and shortens fades', () => {
    const s = buildObjectiveIntro(intro, 150, true);
    expect(s.titleMoveInMs).toBe(0);
    expect(s.textMoveInMs).toBe(0);
    expect(s.outMoveMs).toBe(0);
    expect(s.titleInMs).toBe(150);
    expect(s.outFadeMs).toBe(150);
    expect(s.endAt).toBe(s.outAt + 150);
  });
});

describe('round sequence', () => {
  it('uses the configured timings', () => {
    expect(buildRoundSequence(config, false)).toEqual({
      shapeFadeInMs: 400,
      shapeMoveInMs: 400,
      shapeMoveOutMs: 400,
      loggedTooltipMs: 500,
      shapePulseMs: 1000,
      postClickWaitMs: 800,
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

  it('with reduced motion shortens the fades and drops all movement', () => {
    const s = buildRoundSequence(config, true);
    expect(s.shapeFadeInMs).toBe(150);
    expect(s.shapeMoveInMs).toBe(0);
    expect(s.shapeMoveOutMs).toBe(0);
    expect(s.outroFadeMs).toBe(150);
    expect(s.postClickWaitMs).toBe(800);
    expect(s.betweenRoundsMs).toBe(400);
  });

  it('never lengthens a fade that is already short', () => {
    expect(buildRoundSequence({ ...config, shapeFadeInMs: 50 }, true).shapeFadeInMs).toBe(50);
  });

  it('builds from the game config', () => {
    expect(buildRoundSequence(gameConfig.roundSequence, false).shapeFadeInMs).toBeGreaterThan(0);
    const s = buildObjectiveIntro(
      gameConfig.objectiveIntro,
      gameConfig.roundSequence.reducedMotionFadeMs,
      false,
    );
    expect(s.endAt).toBeGreaterThan(s.outAt);
  });
});
